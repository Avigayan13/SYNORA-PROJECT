declare module 'mp4box' {
  export interface MP4MediaTrack {
    id: number;
    created: Date;
    modified: Date;
    volume: number;
    track_width: number;
    track_height: number;
    timescale: number;
    duration: number;
    bitrate: number;
    codec: string;
    language: string;
    nb_samples: number;
  }

  export interface MP4VideoData {
    width: number;
    height: number;
  }

  export interface MP4VideoTrack extends MP4MediaTrack {
    video: MP4VideoData;
  }

  export interface MP4AudioTrack extends MP4MediaTrack {
    audio: {
      sample_rate: number;
      channel_count: number;
      sample_size: number;
    };
  }

  export type MP4Track = MP4VideoTrack | MP4AudioTrack;

  export interface MP4Info {
    duration: number;
    timescale: number;
    isFragmented: boolean;
    isProgressive: boolean;
    hasMoov: boolean;
    tracks: MP4Track[];
    videoTracks: MP4VideoTrack[];
    audioTracks: MP4AudioTrack[];
  }

  export interface MP4Sample {
    alreadyRead: number;
    chunk_index: number;
    chunk_run_index: number;
    cts: number;
    dts: number;
    duration: number;
    is_sync: boolean;
    is_leading: number;
    depends_on: number;
    is_depended_on: number;
    has_redundancy: number;
    degradation_priority: number;
    offset: number;
    size: number;
    timescale: number;
    data: Uint8Array;
    description: any;
  }

  export interface MP4ArrayBuffer extends ArrayBuffer {
    fileStart: number;
  }

  export interface MP4BoxFile {
    onReady?: (info: MP4Info) => void;
    onError?: (e: string) => void;
    onSamples?: (id: number, user: any, samples: MP4Sample[]) => void;
    appendBuffer(data: MP4ArrayBuffer): number;
    start(): void;
    stop(): void;
    flush(): void;
    setExtractionOptions(id: number, user?: any, options?: { nbSamples?: number; rapAlignment?: boolean }): void;
    getTrackById(id: number): any;
  }

  export function createFile(): MP4BoxFile;
}
