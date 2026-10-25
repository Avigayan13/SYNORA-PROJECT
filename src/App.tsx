import React, { useState, useEffect, useRef } from 'react';
import { ArrowRight, ArrowDown, ChevronUp, Info, X, Flame, ShieldCheck, Zap, Gavel } from 'lucide-react';
import { useVideoScrub } from '@/useVideoScrub';
// @ts-ignore
import AuctionPlatform from '@/AuctionPlatform';

const VIDEO_URL =
  'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260821_114821_a8ca298f-be2c-4613-a4dd-51b69e16bbde.mp4';

const DARK = '#1D3045';

const NAV_LINKS = [
  { label: 'SYNORA PRIME', tab: 'landing' },
  { label: 'LIVE AUCTIONS', tab: 'auction' },
  { label: 'CONCURRENCY LAB', tab: 'concurrency' },
  { label: 'RELIEF EXCHANGE', tab: 'relief' },
  { label: 'SECURITY & AUDIT', tab: 'security' },
];

// Helper Stagger component for smooth element entrance
interface StaggerProps {
  visible: boolean;
  delayMs: number;
  className?: string;
  children: React.ReactNode;
  style?: React.CSSProperties;
}

const Stagger: React.FC<StaggerProps> = ({
  visible,
  delayMs,
  className = '',
  children,
  style = {},
}) => {
  return (
    <div
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0px)' : 'translateY(24px)',
        transition: `opacity 0.8s cubic-bezier(0.16, 1, 0.3, 1) ${delayMs}ms, transform 0.8s cubic-bezier(0.16, 1, 0.3, 1) ${delayMs}ms`,
        ...style,
      }}
    >
      {children}
    </div>
  );
};

export default function App() {
  const { containerRef, videoRef, canvasRef, scrollProgress, canvasLive } =
    useVideoScrub(VIDEO_URL);

  const [menuOpen, setMenuOpen] = useState(false);
  const [navEntered, setNavEntered] = useState(false);
  const [activeAuctionTab, setActiveAuctionTab] = useState<string>('landing');

  const auctionPlatformRef = useRef<HTMLDivElement>(null);

  // Trigger nav entrance animation 200ms after mount
  useEffect(() => {
    const timer = setTimeout(() => {
      setNavEntered(true);
    }, 200);
    return () => clearTimeout(timer);
  }, []);

  // Lock body overflow when mobile menu is open
  useEffect(() => {
    if (menuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [menuOpen]);

  const p = scrollProgress;

  // Nav color flip: DARK when p <= 0.55, white when p > 0.55
  const isLightNav = p > 0.55;
  const navColor = isLightNav ? '#FFFFFF' : DARK;

  // Sequential Section Opacities
  // Section 1: p < 0.20 -> 1, else max(0, 1 - (p - 0.20)/0.08)
  const s1Opacity = p < 0.2 ? 1 : Math.max(0, 1 - (p - 0.2) / 0.08);

  // Section 2: p < 0.32 -> 0, p < 0.40 -> (p - 0.32)/0.08, p < 0.55 -> 1, else max(0, 1 - (p - 0.55)/0.08)
  let s2Opacity = 0;
  if (p < 0.32) {
    s2Opacity = 0;
  } else if (p < 0.4) {
    s2Opacity = (p - 0.32) / 0.08;
  } else if (p < 0.55) {
    s2Opacity = 1;
  } else {
    s2Opacity = Math.max(0, 1 - (p - 0.55) / 0.08);
  }

  // Section 3: p < 0.67 -> 0, p < 0.75 -> (p - 0.67)/0.08, else 1
  let s3Opacity = 0;
  if (p < 0.67) {
    s3Opacity = 0;
  } else if (p < 0.75) {
    s3Opacity = (p - 0.67) / 0.08;
  } else {
    s3Opacity = 1;
  }

  const s1Visible = s1Opacity > 0.3;
  const s2Visible = s2Opacity > 0.3;
  const s3Visible = s3Opacity > 0.3;

  const navigateToAuction = (tab: string = 'landing') => {
    setActiveAuctionTab(tab);
    setTimeout(() => {
      auctionPlatformRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 50);
  };

  const scrollToScrollFraction = (fraction: number) => {
    if (containerRef.current) {
      const maxScroll = containerRef.current.offsetHeight - window.innerHeight;
      window.scrollTo({
        top: maxScroll * fraction,
        behavior: 'smooth',
      });
    }
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="w-full bg-black min-h-screen text-white selection:bg-white selection:text-black">
      {/* 500vh Cinematic Scroll-Tied Track */}
      <div ref={containerRef} className="relative h-[500vh] bg-black">
        {/* Sticky Full Viewport Scene */}
        <div className="sticky top-0 w-full h-screen overflow-hidden select-none">
          {/* 1) Video Full Cover Background */}
          <video
            ref={videoRef}
            src={VIDEO_URL}
            muted
            playsInline
            preload="auto"
            className="absolute inset-0 w-full h-full object-cover"
          />

          {/* 2) Canvas 1920x1080 (Scrubbing Frame Bank) */}
          <canvas
            ref={canvasRef}
            width={1920}
            height={1080}
            className={`absolute inset-0 w-full h-full object-cover pointer-events-none transition-opacity duration-300 ${
              canvasLive ? 'opacity-100' : 'opacity-0'
            }`}
          />

          {/* 3) Full Screen Overlay (Navbar + 3 Sequential Sections) */}
          <div className="absolute inset-0 pointer-events-none">
            {/* NAVBAR */}
            <nav
              className="absolute top-0 left-0 right-0 z-50 pointer-events-auto px-6 sm:px-8 md:px-12 pt-8 sm:pt-12 pb-6 flex items-center justify-between transition-colors duration-500"
              style={{ color: navColor }}
            >
              {/* Desktop lg+ Navigation Cluster */}
              <div className="hidden lg:flex items-center gap-8 xl:gap-10">
                {NAV_LINKS.map((linkItem, idx) => {
                  const isActive = idx === 0;
                  return (
                    <button
                      key={linkItem.label}
                      onClick={() => {
                        if (idx === 0) {
                          scrollToTop();
                        } else {
                          navigateToAuction(linkItem.tab);
                        }
                      }}
                      className="relative text-xs tracking-[0.15em] uppercase font-semibold hover:opacity-70 transition-opacity cursor-pointer focus:outline-none"
                      style={{
                        opacity: navEntered ? 1 : 0,
                        transform: navEntered ? 'translateY(0)' : 'translateY(-12px)',
                        transition: `opacity 0.6s cubic-bezier(0.16, 1, 0.3, 1) ${
                          idx * 80 + 100
                        }ms, transform 0.6s cubic-bezier(0.16, 1, 0.3, 1) ${
                          idx * 80 + 100
                        }ms`,
                      }}
                    >
                      {linkItem.label}
                      {isActive && (
                        <span
                          className="absolute left-0 -bottom-3 w-full h-[2px] transition-colors duration-500"
                          style={{ backgroundColor: navColor }}
                        />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Mobile <lg Hamburger Button */}
              <button
                onClick={() => setMenuOpen(true)}
                className="lg:hidden flex flex-col justify-center focus:outline-none p-1 cursor-pointer"
                aria-label="Open Menu"
                style={{
                  opacity: navEntered ? 1 : 0,
                  transform: navEntered ? 'translateY(0)' : 'translateY(-12px)',
                  transition:
                    'opacity 0.6s cubic-bezier(0.16, 1, 0.3, 1) 100ms, transform 0.6s cubic-bezier(0.16, 1, 0.3, 1) 100ms',
                }}
              >
                <span
                  className="block h-[2px] w-6 transition-colors duration-500 mb-[5px]"
                  style={{ backgroundColor: navColor }}
                />
                <span
                  className="block h-[2px] w-6 transition-colors duration-500 mb-[5px]"
                  style={{ backgroundColor: navColor }}
                />
                <span
                  className="block h-[2px] w-4 transition-colors duration-500"
                  style={{ backgroundColor: navColor }}
                />
              </button>

              {/* Right Cluster (Hidden below sm) */}
              <div
                className="hidden sm:flex items-center gap-5"
                style={{
                  opacity: navEntered ? 1 : 0,
                  transform: navEntered ? 'translateY(0)' : 'translateY(-12px)',
                  transition:
                    'opacity 0.6s cubic-bezier(0.16, 1, 0.3, 1) 500ms, transform 0.6s cubic-bezier(0.16, 1, 0.3, 1) 500ms',
                }}
              >
                {/* Live Ticker Indicator */}
                <div
                  onClick={() => navigateToAuction('auction')}
                  className="flex items-center gap-2 px-3 py-1 rounded-full border border-current text-xs tracking-wider uppercase font-semibold hover:opacity-80 transition-opacity cursor-pointer"
                >
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping inline-block" />
                  <span>LIVE LOT #SYN-9024</span>
                </div>



                {/* Direct Enter Floor CTA */}
                <button
                  onClick={() => navigateToAuction('landing')}
                  className="text-xs tracking-[0.15em] uppercase font-bold px-4 py-2 rounded-full bg-white text-black hover:bg-white/90 transition-all cursor-pointer focus:outline-none shadow-md"
                >
                  ENTER FLOOR ⚡
                </button>
              </div>
            </nav>

            {/* SECTION 1 (Hero: The Apex of High-Frequency Digital Auctions) */}
            <div
              className="absolute inset-0 px-6 sm:px-8 md:px-20 lg:px-32 flex flex-col justify-center"
              style={{
                opacity: s1Opacity,
                transition: 'opacity 0.1s ease-out',
                pointerEvents: s1Visible ? 'auto' : 'none',
              }}
            >
              <div className="max-w-4xl">
                <Stagger visible={s1Visible} delayMs={0}>
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold tracking-widest uppercase mb-4"
                       style={{ backgroundColor: `${DARK}18`, color: DARK }}>
                    <Gavel size={13} style={{ color: DARK }} />
                    <span>EST. 2026 • HIGH-FREQUENCY AUCTION HOUSE &amp; DIGITAL RESERVE</span>
                  </div>
                  <h1
                    className="font-light uppercase leading-[1.15]"
                    style={{
                      fontSize: 'clamp(2.2rem, 5.2vw, 5.2rem)',
                      color: DARK,
                    }}
                  >
                    The Apex of Real-Time Digital Auctions
                  </h1>
                </Stagger>

                <Stagger visible={s1Visible} delayMs={150}>
                  <p
                    className="mt-6 text-sm sm:text-base tracking-[0.25em] uppercase font-medium"
                    style={{ color: `${DARK}E6` }} // 90% alpha
                  >
                    Sub-Millisecond Order Book &bull; Zero Bid Conflicts &bull; Cryptographic Settlement
                  </p>
                </Stagger>

                <Stagger visible={s1Visible} delayMs={250}>
                  <div className="mt-8 flex flex-wrap items-center gap-4">
                    <button
                      onClick={() => navigateToAuction('auction')}
                      className="px-6 py-3 rounded-full font-bold uppercase text-xs tracking-widest text-white shadow-xl hover:opacity-90 transition-opacity cursor-pointer"
                      style={{ backgroundColor: DARK }}
                    >
                      Place Real-Time Bid ⚡
                    </button>
                    <button
                      onClick={() => navigateToAuction('concurrency')}
                      className="px-6 py-3 rounded-full font-bold uppercase text-xs tracking-widest border hover:bg-black/5 transition-colors cursor-pointer"
                      style={{ borderColor: `${DARK}66`, color: DARK }}
                    >
                      Benchmark Engine 📊
                    </button>
                  </div>
                </Stagger>
              </div>

              {/* Bottom-right 48px circle button */}
              <div className="absolute bottom-12 right-6 sm:right-8 md:right-12">
                <Stagger visible={s1Visible} delayMs={300}>
                  <button
                    onClick={() => scrollToScrollFraction(0.45)}
                    className="w-12 h-12 rounded-full border flex items-center justify-center hover:opacity-70 transition-opacity cursor-pointer focus:outline-none"
                    style={{ borderColor: `${DARK}80` }} // 50% alpha
                    aria-label="Scroll to Concurrency Vision"
                  >
                    <ArrowRight size={18} style={{ color: DARK }} />
                  </button>
                </Stagger>
              </div>
            </div>

            {/* SECTION 2 (Center: High-Throughput Precision & Concurrency Benchmarks) */}
            <div
              className="absolute inset-0 px-6 sm:px-8 flex items-center justify-center"
              style={{
                opacity: s2Opacity,
                transition: 'opacity 0.1s ease-out',
                pointerEvents: s2Visible ? 'auto' : 'none',
              }}
            >
              <div className="max-w-[950px] mx-auto text-center">
                <Stagger visible={s2Visible} delayMs={0}>
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold tracking-widest uppercase mb-4"
                       style={{ backgroundColor: `${DARK}18`, color: DARK }}>
                    <Zap size={13} style={{ color: DARK }} />
                    <span>BENCHMARKED AT 2,500+ CONCURRENT BIDS / SECOND</span>
                  </div>
                  <h2
                    className="font-extralight tracking-wide leading-[1.3] uppercase"
                    style={{
                      fontSize: 'clamp(1.5rem, 4.2vw, 4.2rem)',
                      color: DARK,
                    }}
                  >
                    We build institutional bidding trust with vision{' '}
                    <span style={{ color: `${DARK}CC` }}>and sub-millisecond precision</span>{' '}
                    <span style={{ color: `${DARK}80` }}>across every global lot</span>
                  </h2>
                </Stagger>

                <Stagger visible={s2Visible} delayMs={150}>
                  <div className="mt-8 flex flex-wrap justify-center items-center gap-3">
                    <span className="px-3.5 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider border"
                          style={{ borderColor: `${DARK}4D`, color: DARK, backgroundColor: `${DARK}0D` }}>
                      ⚡ Redis Atomic Lua Sequencer
                    </span>
                    <span className="px-3.5 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider border"
                          style={{ borderColor: `${DARK}4D`, color: DARK, backgroundColor: `${DARK}0D` }}>
                      🔒 SELECT ... FOR UPDATE Mutex
                    </span>
                    <span className="px-3.5 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider border"
                          style={{ borderColor: `${DARK}4D`, color: DARK, backgroundColor: `${DARK}0D` }}>
                      🔄 Optimistic CAS Versioning
                    </span>
                  </div>
                </Stagger>
              </div>

              {/* Right column controls at bottom-16 */}
              <div className="absolute bottom-16 right-6 sm:right-8 md:right-12 flex flex-col items-center">
                {/* 48px circle, border DARK 40%, ArrowDown 18 */}
                <Stagger visible={s2Visible} delayMs={200}>
                  <button
                    onClick={() => scrollToScrollFraction(0.85)}
                    className="w-12 h-12 rounded-full border flex items-center justify-center hover:opacity-70 transition-opacity cursor-pointer focus:outline-none"
                    style={{ borderColor: `${DARK}66` }} // 40% alpha
                    aria-label="Scroll to Private Reserve"
                  >
                    <ArrowDown size={18} style={{ color: DARK }} />
                  </button>
                </Stagger>

                {/* Three dots: 8px solid DARK, 6px DARK 40%, 6px DARK 40%, gap-2 */}
                <Stagger visible={s2Visible} delayMs={350} className="mt-4">
                  <div className="flex flex-col items-center gap-2">
                    <div
                      className="w-2 h-2 rounded-full cursor-pointer"
                      onClick={() => scrollToScrollFraction(0.1)}
                      style={{ backgroundColor: DARK }}
                    />
                    <div
                      className="w-1.5 h-1.5 rounded-full cursor-pointer"
                      onClick={() => scrollToScrollFraction(0.45)}
                      style={{ backgroundColor: `${DARK}66` }}
                    />
                    <div
                      className="w-1.5 h-1.5 rounded-full cursor-pointer"
                      onClick={() => scrollToScrollFraction(0.85)}
                      style={{ backgroundColor: `${DARK}66` }}
                    />
                  </div>
                </Stagger>

                {/* 40px circle, border DARK 30%, ChevronUp 16, color DARK 80% */}
                <Stagger visible={s2Visible} delayMs={500} className="mt-4">
                  <button
                    onClick={() => scrollToScrollFraction(0.0)}
                    className="w-10 h-10 rounded-full border flex items-center justify-center hover:opacity-70 transition-opacity cursor-pointer focus:outline-none"
                    style={{ borderColor: `${DARK}4D` }} // 30% alpha
                    aria-label="Scroll Up"
                  >
                    <ChevronUp size={16} style={{ color: `${DARK}CC` }} />
                  </button>
                </Stagger>
              </div>
            </div>

            {/* SECTION 3 (Right aligned, white type — Private Reserve & Final Gavel) */}
            <div
              className="absolute inset-0 px-6 sm:px-8 md:px-20 lg:px-32 flex items-center justify-end"
              style={{
                opacity: s3Opacity,
                transition: 'opacity 0.1s ease-out',
                pointerEvents: s3Visible ? 'auto' : 'none',
              }}
            >
              <div className="max-w-2xl text-left">
                <Stagger visible={s3Visible} delayMs={0}>
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold tracking-widest uppercase mb-4 bg-white/10 text-white/90 border border-white/20">
                    <Flame size={13} className="text-amber-400" />
                    <span>SYNORA PRIVATE RESERVE &bull; LOT #SYN-9024</span>
                  </div>
                  <h2
                    className="font-light text-white leading-[1.2] uppercase tracking-wide mb-6"
                    style={{ fontSize: 'clamp(2rem, 4.2vw, 4.2rem)' }}
                  >
                    High Stakes Ambition,<br />
                    Authoritative Final Gavel.
                  </h2>
                  <p className="text-white/70 text-sm sm:text-base leading-relaxed mb-8">
                    Step into the live multi-participant auction floor. Real-time WebSocket ticks, automated sniper mitigation, and immutable Supabase PostgreSQL ledger audit trails.
                  </p>
                </Stagger>

                <Stagger visible={s3Visible} delayMs={300}>
                  <div className="flex flex-wrap items-center gap-4">
                    <button
                      onClick={() => navigateToAuction('landing')}
                      className="px-8 py-4 rounded-full bg-white text-black font-extrabold text-xs tracking-[0.25em] uppercase hover:bg-white/90 hover:scale-105 duration-300 transition-all cursor-pointer focus:outline-none shadow-2xl flex items-center gap-3"
                    >
                      <span>ENTER LIVE AUCTION FLOOR</span>
                      <ArrowRight size={16} />
                    </button>
                    <button
                      onClick={() => navigateToAuction('relief')}
                      className="px-6 py-4 rounded-full border border-white/40 text-white font-bold text-xs tracking-widest uppercase hover:bg-white/10 transition-colors cursor-pointer"
                    >
                      Relief Exchange 📦
                    </button>
                  </div>
                </Stagger>
              </div>
            </div>
          </div>
        </div>

        {/* MOBILE MENU OVERLAY */}
        <div
          className={`fixed inset-0 z-[100] transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] ${
            menuOpen
              ? 'opacity-100 visible pointer-events-auto'
              : 'opacity-0 invisible pointer-events-none'
          }`}
          style={{ backgroundColor: DARK }}
        >
          <div
            className={`w-full h-full flex flex-col justify-between transition-transform duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] ${
              menuOpen ? 'translate-y-0' : '-translate-y-8'
            }`}
          >
            {/* Close button at top-right */}
            <div className="flex justify-between items-center px-6 sm:px-8 pt-8 sm:pt-12">
              <span className="text-white font-bold tracking-widest text-sm uppercase">
                THE BIIIID &bull; SYNORA
              </span>
              <button
                onClick={() => setMenuOpen(false)}
                className="w-10 h-10 rounded-full border border-white/30 flex items-center justify-center hover:border-white transition-colors cursor-pointer focus:outline-none"
                aria-label="Close Menu"
              >
                <X size={18} className="text-white" />
              </button>
            </div>

            {/* Centered navigation links */}
            <div className="flex flex-col items-start justify-center px-8 sm:px-12 my-auto">
              {NAV_LINKS.map((linkItem, idx) => {
                const isActive = idx === 0;
                return (
                  <button
                    key={linkItem.label}
                    onClick={() => {
                      setMenuOpen(false);
                      if (idx === 0) {
                        scrollToTop();
                      } else {
                        navigateToAuction(linkItem.tab);
                      }
                    }}
                    className={`text-left py-3 text-2xl sm:text-3xl font-light tracking-wide uppercase transition-all duration-300 cursor-pointer focus:outline-none ${
                      isActive ? 'text-white' : 'text-white/60 hover:text-white'
                    }`}
                    style={{
                      opacity: menuOpen ? 1 : 0,
                      transform: menuOpen ? 'translateY(0)' : 'translateY(20px)',
                      transition: `opacity 0.5s ease ${idx * 60}ms, transform 0.5s ease ${
                        idx * 60
                      }ms, color 0.2s ease`,
                    }}
                  >
                    {linkItem.label}
                  </button>
                );
              })}
            </div>

            {/* Footer */}
            <div className="flex items-center gap-8 px-8 sm:px-12 pb-10 text-xs tracking-[0.2em] uppercase text-white/60">

              <button
                onClick={() => {
                  setMenuOpen(false);
                  navigateToAuction('auction');
                }}
                className="hover:text-white transition-colors cursor-pointer uppercase"
              >
                ENTER AUCTION
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── LIVE HIGH-CONCURRENCY AUCTION SYSTEM PLATFORM ── */}
      <div
        ref={auctionPlatformRef}
        className="relative z-10 w-full bg-black min-h-screen border-t border-white/10"
      >
        <AuctionPlatform
          initialTab={activeAuctionTab}
        />
      </div>
    </div>
  );
}
