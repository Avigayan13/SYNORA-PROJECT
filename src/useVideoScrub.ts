import { useEffect, useRef, useState, useCallback } from 'react';
import * as MP4Box from 'mp4box';

const LERP_TAU = 8;
const SNAP = 0.002;
const LRU_MAX = 24;
const LEAD = 24;
const WATCHDOG = 60000;

export interface VideoScrubResult {
  containerRef: React.RefObject<HTMLDivElement>;
  videoRef: React.RefObject<HTMLVideoElement>;
  canvasRef: React.RefObject<HTMLCanvasElement>;
  scrollProgress: number;
  canvasLive: boolean;
  isReady: boolean;
}

interface FrameEntry {
  ts: number; // in microseconds
  blob: Blob;
}

function findNearestIndex(bank: FrameEntry[], targetTsMicros: number): number {
  if (bank.length === 0) return -1;
  let low = 0;
  let high = bank.length - 1;
  while (low <= high) {
    const mid = (low + high) >> 1;
    if (bank[mid].ts < targetTsMicros) {
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }
  if (low >= bank.length) return bank.length - 1;
  if (low <= 0) return 0;
  return Math.abs(bank[low].ts - targetTsMicros) < Math.abs(bank[low - 1].ts - targetTsMicros)
    ? low
    : low - 1;
}

export function useVideoScrub(videoSrc: string): VideoScrubResult {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [scrollProgress, setScrollProgress] = useState(0);
  const [canvasLive, setCanvasLive] = useState(false);
  const [isReady, setIsReady] = useState(false);

  // Mutable refs for high-frequency rAF
  const bankRef = useRef<FrameEntry[]>([]);
  const lruRef = useRef<Map<number, ImageBitmap>>(new Map());
  const pendingLRURef = useRef<Set<number>>(new Set());
  const lruKeysOrderRef = useRef<number[]>([]);

  const currentTimeRef = useRef(0);
  const targetTimeRef = useRef(0);
  const durationRef = useRef(0);
  const readyRef = useRef(false);
  const revertedRef = useRef(false);
  const canvasLiveRef = useRef(false);
  const lastTimeRef = useRef(performance.now());
  const watchdogTimerRef = useRef<number | null>(null);

  // Helper to put bitmap in LRU
  const cacheBitmap = useCallback((index: number, bitmap: ImageBitmap) => {
    const lru = lruRef.current;
    const order = lruKeysOrderRef.current;

    if (lru.has(index)) {
      // Move to end of order
      const pos = order.indexOf(index);
      if (pos > -1) order.splice(pos, 1);
      order.push(index);
      return;
    }

    // Evict oldest if needed
    while (lru.size >= LRU_MAX && order.length > 0) {
      const oldestKey = order.shift();
      if (oldestKey !== undefined) {
        const oldBmp = lru.get(oldestKey);
        if (oldBmp) {
          oldBmp.close();
        }
        lru.delete(oldestKey);
      }
    }

    lru.set(index, bitmap);
    order.push(index);
  }, []);

  // Warm neighboring frames around target index
  const warmLRU = useCallback((targetIndex: number) => {
    const bank = bankRef.current;
    if (bank.length === 0) return;

    for (let offset = -1; offset <= 2; offset++) {
      const idx = targetIndex + offset;
      if (idx >= 0 && idx < bank.length) {
        if (!lruRef.current.has(idx) && !pendingLRURef.current.has(idx)) {
          pendingLRURef.current.add(idx);
          createImageBitmap(bank[idx].blob)
            .then((bmp) => {
              pendingLRURef.current.delete(idx);
              cacheBitmap(idx, bmp);
            })
            .catch(() => {
              pendingLRURef.current.delete(idx);
            });
        }
      }
    }
  }, [cacheBitmap]);

  // Compute scroll progress p = clamp(0, 1, window.scrollY / (container.offsetHeight - window.innerHeight))
  const getProgress = useCallback(() => {
    const container = containerRef.current;
    if (!container) return 0;
    const maxScroll = container.offsetHeight - window.innerHeight;
    if (maxScroll <= 0) return 0;
    const p = window.scrollY / maxScroll;
    return Math.max(0, Math.min(1, p));
  }, []);

  // Frame bank builder using MP4Box and WebCodecs VideoDecoder
  useEffect(() => {
    let active = true;
    let decoder: VideoDecoder | null = null;
    let mp4boxFile: any = null;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const hasWebCodecs = typeof window !== 'undefined' && 'VideoDecoder' in window;

    // Watchdog: after 60s, if not ready, revert to video seeking fallback
    watchdogTimerRef.current = window.setTimeout(() => {
      if (!readyRef.current && !revertedRef.current) {
        console.warn('Frame bank decoding watchdog expired; falling back to video currentTime scrubbing.');
        revertedRef.current = true;
      }
    }, WATCHDOG);

    const initFrameBank = async (preferSoftware = false) => {
      if (prefersReducedMotion || !hasWebCodecs) {
        revertedRef.current = true;
        return;
      }

      try {
        const response = await fetch(videoSrc);
        if (!response.ok) {
          throw new Error(`Failed to fetch video: ${response.statusText}`);
        }
        const buffer = await response.arrayBuffer();
        if (!active) return;

        mp4boxFile = MP4Box.createFile();

        let videoTrackInfo: any = null;
        const pendingFrames: VideoFrame[] = [];
        let decodingFinished = false;
        let samplesExtracted = 0;
        let inFlightBlobs = 0;

        // Offscreen canvas for frame to blob conversion
        const offscreen = typeof OffscreenCanvas !== 'undefined'
          ? new OffscreenCanvas(1920, 1080)
          : null;
        const offscreenCtx = offscreen?.getContext('2d');

        const processFrames = async () => {
          while (pendingFrames.length > 0 && active) {
            // Throttle decoding if too many blobs are in-flight
            if (inFlightBlobs >= LEAD) {
              await new Promise((r) => setTimeout(r, 10));
              continue;
            }

            const frame = pendingFrames.shift()!;
            const ts = frame.timestamp; // microseconds
            inFlightBlobs++;

            if (offscreen && offscreenCtx) {
              if (offscreen.width !== frame.displayWidth || offscreen.height !== frame.displayHeight) {
                offscreen.width = frame.displayWidth;
                offscreen.height = frame.displayHeight;
              }
              offscreenCtx.drawImage(frame, 0, 0);
              frame.close();

              try {
                const blob = await offscreen.convertToBlob({ type: 'image/webp', quality: 0.82 });
                if (active) {
                  bankRef.current.push({ ts, blob });
                }
              } catch (e) {
                // Ignore conversion errors
              } finally {
                inFlightBlobs--;
              }
            } else {
              // Fallback if OffscreenCanvas not available
              const c = document.createElement('canvas');
              c.width = frame.displayWidth;
              c.height = frame.displayHeight;
              const ctx = c.getContext('2d');
              ctx?.drawImage(frame, 0, 0);
              frame.close();

              c.toBlob((blob) => {
                if (blob && active) {
                  bankRef.current.push({ ts, blob });
                }
                inFlightBlobs--;
              }, 'image/webp', 0.82);
            }
          }

          if (decodingFinished && pendingFrames.length === 0 && inFlightBlobs === 0 && active) {
            // Sort bank by timestamp
            bankRef.current.sort((a, b) => a.ts - b.ts);
            if (bankRef.current.length > 0) {
              readyRef.current = true;
              setIsReady(true);
            } else {
              revertedRef.current = true;
            }
          }
        };

        const onFrameDecoded = (frame: VideoFrame) => {
          pendingFrames.push(frame);
          processFrames();
        };

        const onDecodeError = (err: any) => {
          console.warn('VideoDecoder error:', err);
          if (!preferSoftware && active) {
            // Retry once with prefer-software
            if (decoder) {
              try { decoder.close(); } catch (_) {}
            }
            initFrameBank(true);
          } else {
            revertedRef.current = true;
          }
        };

        decoder = new VideoDecoder({
          output: onFrameDecoded,
          error: onDecodeError,
        });

        mp4boxFile.onReady = (info: any) => {
          if (!active) return;
          const track = info.videoTracks[0];
          if (!track) {
            revertedRef.current = true;
            return;
          }
          videoTrackInfo = track;
          if (track.duration && track.timescale) {
            durationRef.current = track.duration / track.timescale;
          }

          // Build decoder configuration
          let description: Uint8Array | undefined = undefined;
          try {
            const trackBox = mp4boxFile.getTrackById(track.id);
            if (trackBox?.mdia?.minf?.stbl?.stsd?.entries) {
              const entry = trackBox.mdia.minf.stbl.stsd.entries[0];
              const box = entry?.avcC || entry?.hvcC || entry?.vpcC || entry?.av1C;
              if (box) {
                const stream = new (MP4Box as any).DataStream(undefined, 0, (MP4Box as any).DataStream.BIG_ENDIAN);
                box.write(stream);
                description = new Uint8Array(stream.buffer, 8);
              }
            }
          } catch (e) {
            console.warn('Failed to extract avcC description:', e);
          }

          const config: VideoDecoderConfig = {
            codec: track.codec,
            codedWidth: track.video.width,
            codedHeight: track.video.height,
            description,
            hardwareAcceleration: preferSoftware ? 'prefer-software' : 'no-preference',
          };

          try {
            decoder?.configure(config);
            mp4boxFile.setExtractionOptions(track.id, null, { nbSamples: 1000 });
            mp4boxFile.start();
          } catch (e) {
            console.warn('Decoder config failed:', e);
            onDecodeError(e);
          }
        };

        mp4boxFile.onSamples = (_id: number, _user: any, samples: any[]) => {
          if (!active || !decoder) return;
          samplesExtracted += samples.length;

          for (const sample of samples) {
            const chunk = new EncodedVideoChunk({
              type: sample.is_sync ? 'key' : 'delta',
              timestamp: (1e6 * sample.cts) / sample.timescale,
              duration: (1e6 * sample.duration) / sample.timescale,
              data: sample.data,
            });
            decoder.decode(chunk);
          }

          if (videoTrackInfo && samplesExtracted >= videoTrackInfo.nb_samples) {
            decoder.flush().then(() => {
              decodingFinished = true;
              processFrames();
            });
          }
        };

        mp4boxFile.onError = (e: any) => {
          console.warn('MP4Box error:', e);
          revertedRef.current = true;
        };

        // Feed buffer to mp4box
        const fileBuffer = buffer as any;
        fileBuffer.fileStart = 0;
        mp4boxFile.appendBuffer(fileBuffer);
        mp4boxFile.flush();
      } catch (err) {
        console.warn('Frame bank initialization fallback:', err);
        revertedRef.current = true;
      }
    };

    // Initialize after window load or right away
    if (document.readyState === 'complete') {
      initFrameBank();
    } else {
      const handleLoad = () => initFrameBank();
      window.addEventListener('load', handleLoad, { once: true });
    }

    return () => {
      active = false;
      if (watchdogTimerRef.current) {
        clearTimeout(watchdogTimerRef.current);
      }
      if (decoder) {
        try { decoder.close(); } catch (_) {}
      }
      lruRef.current.forEach((bmp) => bmp.close());
      lruRef.current.clear();
    };
  }, [videoSrc]);

  // Handle video element duration / metadata
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onLoadedMetadata = () => {
      if (video.duration && !isNaN(video.duration) && video.duration > 0) {
        durationRef.current = video.duration;
      }
    };

    video.addEventListener('loadedmetadata', onLoadedMetadata);
    if (video.readyState >= 1 && video.duration > 0) {
      durationRef.current = video.duration;
    }

    return () => {
      video.removeEventListener('loadedmetadata', onLoadedMetadata);
    };
  }, []);

  // Main rAF Animation & Scrubbing Loop
  useEffect(() => {
    let animId: number;
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const tick = (now: number) => {
      const deltaSeconds = Math.max(0, (now - lastTimeRef.current) / 1000);
      lastTimeRef.current = now;
      const dt = Math.min(0.1, deltaSeconds);

      const p = getProgress();
      setScrollProgress(p);

      const dur = durationRef.current;
      const video = videoRef.current;
      const canvas = canvasRef.current;

      if (dur > 0) {
        const target = p * dur;
        targetTimeRef.current = target;

        if (prefersReducedMotion) {
          currentTimeRef.current = target;
        } else {
          currentTimeRef.current += (target - currentTimeRef.current) * (1 - Math.exp(-dt * LERP_TAU));
          if (Math.abs(target - currentTimeRef.current) < SNAP) {
            currentTimeRef.current = target;
          }
        }

        const current = currentTimeRef.current;

        if (readyRef.current && bankRef.current.length > 0 && canvas) {
          const targetTsMicros = current * 1e6;
          const nearestIdx = findNearestIndex(bankRef.current, targetTsMicros);

          if (nearestIdx >= 0) {
            warmLRU(nearestIdx);

            const cachedBitmap = lruRef.current.get(nearestIdx);
            if (cachedBitmap) {
              const ctx = canvas.getContext('2d');
              if (ctx) {
                ctx.drawImage(cachedBitmap, 0, 0, canvas.width, canvas.height);
                if (!canvasLiveRef.current) {
                  canvasLiveRef.current = true;
                  setCanvasLive(true);
                }
              }
            }
          }
        } else if (video) {
          // Fallback: video currentTime scrubbing
          if (!video.seeking && Math.abs(video.currentTime - current) > 0.01) {
            video.currentTime = current;
          }
        }
      }

      animId = requestAnimationFrame(tick);
    };

    lastTimeRef.current = performance.now();
    animId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [getProgress, warmLRU]);

  // Handle resize and orientationchange
  useEffect(() => {
    const handleResize = () => {
      const p = getProgress();
      setScrollProgress(p);
    };

    window.addEventListener('resize', handleResize, { passive: true });
    window.addEventListener('orientationchange', handleResize, { passive: true });

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, [getProgress]);

  return {
    containerRef,
    videoRef,
    canvasRef,
    scrollProgress,
    canvasLive,
    isReady,
  };
}
