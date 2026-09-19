/**
 * THE BIIIID — FROM SYNORA
 * Real-Time High-Concurrency Auction System, Security Lab & Relief Exchange
 * Complete React 18 Modular Architecture with Tabbed Navigation
 */

const { useState, useEffect, useRef, useMemo, useCallback } = React;

// --- CURRENCY FORMATTER (INR) ---
function formatINR(val) {
  if (isNaN(val) || val === null || val === undefined) return '₹0';
  return '₹' + Number(val).toLocaleString('en-IN');
}

// --- AUDIO SYNTHESIS HELPER ---
let audioCtx = null;
function playSound(isAccepted, isViolation) {
  try {
    if (!audioCtx && (window.AudioContext || window.webkitAudioContext)) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (!audioCtx) return;
    if (audioCtx.state === 'suspended') audioCtx.resume();
    
    const now = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);

    if (isViolation) {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.exponentialRampToValueAtTime(110, now + 0.12);
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
      osc.start(now);
      osc.stop(now + 0.12);
    } else if (isAccepted) {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(660, now);
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.08);
      gain.gain.setValueAtTime(0.07, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
      osc.start(now);
      osc.stop(now + 0.08);
    }
  } catch (e) {
    // Audio gestures might be muted before user gesture
  }
}

// --- BOT NAMES FOR STRESS TESTING ---
const BOT_NAMES = [
  'AlgoTrader-α', 'QuantFund-9', 'HFT_Tokyo', 'ArbitrageX',
  'LiquidityEng', 'OmegaCapital', 'ApexBidder', 'CitadelNode',
  'JaneStreetBot', 'JumpTradingV2', 'TowerResearch', 'OptiverProxy',
  'SuspenseBot', 'MarketMaker-7', 'FlashBid-AI', 'NexusBidder',
];

// --- RELIEF EMERGENCY SUPPLIERS FOR STRESS SURGE ---
const RELIEF_SUPPLIERS = [
  'Apex Medical Gas', 'National Cryogenics Ltd', 'LifeLine Healthcare Cryo',
  'Metro Cryo Logistics', 'QuickOxygen Express', 'Bharat Oxygen Infra',
  'Global MedEx Imports', 'Apollo Cryo Supply', 'Zenith Healthcare Logistics',
  'AirLiquide Relief Unit', 'Linde Emergency Fleet', 'MedTech Oxygen Services'
];

// --- SUPABASE POSTGRESQL SCHEMA SCRIPT ---
const SUPABASE_SCHEMA_SQL = `-- 1. Auctions Table
CREATE TABLE IF NOT EXISTS public.auctions (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    current_bid BIGINT NOT NULL,
    highest_bidder TEXT,
    bid_count INTEGER DEFAULT 0,
    seq_counter BIGINT DEFAULT 0,
    ends_at TIMESTAMPTZ NOT NULL,
    status TEXT DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Immutable Bids Table
CREATE TABLE IF NOT EXISTS public.bids (
    id BIGSERIAL PRIMARY KEY,
    auction_id TEXT REFERENCES public.auctions(id) ON DELETE CASCADE,
    sequence_no BIGINT NOT NULL,
    bidder_name TEXT NOT NULL,
    amount BIGINT NOT NULL,
    accepted BOOLEAN DEFAULT TRUE,
    rejection_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Emergency Relief Offers Table
CREATE TABLE IF NOT EXISTS public.relief_offers (
    id BIGSERIAL PRIMARY KEY,
    sequence_no BIGINT NOT NULL,
    supplier_name TEXT NOT NULL,
    total_cost BIGINT NOT NULL,
    quantity INTEGER NOT NULL,
    delivery_hours NUMERIC NOT NULL,
    certified BOOLEAN NOT NULL,
    status TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Audit Logs Table
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id BIGSERIAL PRIMARY KEY,
    event_type TEXT NOT NULL,
    actor TEXT NOT NULL,
    role TEXT NOT NULL,
    details JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.auctions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.bids;
ALTER PUBLICATION supabase_realtime ADD TABLE public.relief_offers;

-- Insert Seed Auction
INSERT INTO public.auctions (id, title, current_bid, highest_bidder, bid_count, seq_counter, ends_at, status)
VALUES ('SYN-9024', 'Rare Genesis Art Token #01', 10000, 'Genesis Treasury', 0, 0, NOW() + INTERVAL '2 hours', 'ACTIVE')
ON CONFLICT (id) DO NOTHING;`;

// --- STRATEGY METADATA ---
const STRATEGY_DATA = {
  naive: {
    id: 'naive',
    title: 'Naive Unprotected',
    badge: 'DANGEROUS',
    badgeClass: 'sc-badge-rose',
    cardClass: 'strategy-card-rose',
    iconClass: 'sc-icon-rose',
    tech: 'Unsynchronized Read-Modify-Write',
    desc: 'Direct DB reads with no locking. Concurrent requests read stale prices and overwrite each other, producing out-of-order wins and phantom bids.',
    tradeoffs: [
      { text: 'High raw throughput', type: 'tc-bad' },
      { text: '❌ Race condition violations', type: 'tc-bad' }
    ],
    statusLabel: 'ENGINE: NAIVE (UNPROTECTED)',
    explanation: (
      <>
        <strong style={{ color: 'var(--rose)' }}>⚠ Naive — Unsynchronized Read-Modify-Write</strong><br />
        Simulates direct DB reads with no isolation. Concurrent bids read the same stale price,
        then each overwrites the row. A lower bid can win, producing <strong>ghost bids and data corruption</strong>.
        You will see red VIOLATION entries in the ledger when running a burst.
      </>
    )
  },
  pessimistic: {
    id: 'pessimistic',
    title: 'Pessimistic Locking',
    badge: 'SAFE, SLOW',
    badgeClass: 'sc-badge-amber',
    cardClass: 'strategy-card-amber',
    iconClass: 'sc-icon-amber',
    tech: 'SELECT … FOR UPDATE Mutex',
    desc: 'Exclusive row-level lock before each bid validation. Completely prevents race conditions, but creates a severe serial bottleneck under load.',
    tradeoffs: [
      { text: 'Severe latency degradation', type: 'tc-warn' },
      { text: '✓ Guaranteed zero violations', type: 'tc-good' }
    ],
    statusLabel: 'ENGINE: PESSIMISTIC ROW LOCK',
    explanation: (
      <>
        <strong style={{ color: 'var(--amber)' }}>🔒 Pessimistic Locking — SELECT … FOR UPDATE</strong><br />
        Every bid acquires an exclusive row lock before validating. Prevents races,
        but requests must queue single-file. Under 1,000+ concurrent bids,
        <strong>lock-wait time dominates</strong> — watch P95 latency climb significantly.
      </>
    )
  },
  optimistic: {
    id: 'optimistic',
    title: 'Optimistic CAS',
    badge: 'MODERATE',
    badgeClass: 'sc-badge-blue',
    cardClass: 'strategy-card-blue',
    iconClass: 'sc-icon-blue',
    tech: 'Version Check & Compare-And-Swap',
    desc: 'Non-blocking version comparisons. Low overhead under light load, but suffers heavy retry storms and conflict aborts when thousands bid on the same hot lot.',
    tradeoffs: [
      { text: 'High conflict rejection rate', type: 'tc-warn' },
      { text: '✓ No data corruption', type: 'tc-good' }
    ],
    statusLabel: 'ENGINE: OPTIMISTIC CAS',
    explanation: (
      <>
        <strong style={{ color: 'var(--blue)' }}>🔄 Optimistic CAS — Version check + retry</strong><br />
        Non-blocking: reads current version, validates, then swaps atomically.
        If another writer committed first, the transaction aborts. Safe at moderate load,
        but high contention on a single auction row causes a <strong>retry storm</strong>
        — most bids become CAS conflicts and are rejected.
      </>
    )
  },
  atomic: {
    id: 'atomic',
    title: 'Atomic In-Memory Sequencer',
    badge: 'RECOMMENDED ★',
    badgeClass: 'sc-badge-emerald',
    cardClass: 'strategy-card-emerald',
    iconClass: 'sc-icon-emerald',
    tech: 'Redis Lua / LMAX Single-Writer Loop',
    desc: 'Dedicated single-writer loop. All bids are serialized in-memory with monotonic sequence numbers. Sub-millisecond validation with zero database lock contention.',
    tradeoffs: [
      { text: '5,000+ TPS peak throughput', type: 'tc-good' },
      { text: '✓ Linearizable monotonic order', type: 'tc-good' }
    ],
    statusLabel: 'ENGINE: ATOMIC SEQUENCER',
    explanation: (
      <>
        <strong style={{ color: 'var(--emerald)' }}>⚡ Atomic Sequencer — Redis Lua / LMAX Pattern</strong><br />
        A dedicated single-writer processes bids sequentially from a lock-free queue.
        Validation is in-memory; DB persistence happens asynchronously (outbox pattern).
        Result: <strong>zero lock contention, sub-millisecond validation, and guaranteed 0 violations</strong>
        regardless of concurrent load.
      </>
    )
  }
};

// --- USER PROFILES FOR RBAC ---
const USER_ROLES = {
  bidder: { name: 'Alex Chen', id: 'usr_7f3a9c', role: 'Bidder', avatar: 'AC' },
  viewer: { name: 'Jordan Kim', id: 'usr_2b8e1d', role: 'Viewer', avatar: 'JK' },
  admin:  { name: 'Sam Rivera', id: 'usr_5d4c0f', role: 'Admin', avatar: 'SR' },
};

// ═══════════════════════════════════════════════════════════════════════
// MAIN APPLICATION COMPONENT
// ═══════════════════════════════════════════════════════════════════════
function App() {
  // Navigation View State: 'auction' | 'concurrency' | 'relief' | 'security' | 'architecture'
  const [activeTab, setActiveTab] = useState('landing');

  // Auction State
  const [strategy, setStrategy] = useState('atomic');
  const [currentPrice, setCurrentPrice] = useState(10000);
  const [minIncrement] = useState(250);
  const [highestBidder, setHighestBidder] = useState('Genesis Treasury');
  const [highestSeq, setHighestSeq] = useState(0);
  const [version, setVersion] = useState(0);
  const [timeLeftSec, setTimeLeftSec] = useState(84.8);
  const [snipeAlert, setSnipeAlert] = useState(false);
  const [priceFlash, setPriceFlash] = useState(null); // 'success' | 'conflict'

  // User Bid Input State
  const [manualBidInput, setManualBidInput] = useState(10250);

  // Telemetry Metrics
  const [totalIngested, setTotalIngested] = useState(0);
  const [validAccepted, setValidAccepted] = useState(0);
  const [staleRejected, setStaleRejected] = useState(0);
  const [invalidViolations, setInvalidViolations] = useState(0);
  const [recentLatencies, setRecentLatencies] = useState([]);
  const [recentLockWaits, setRecentLockWaits] = useState([]);
  const [currentTps, setCurrentTps] = useState(0);

  // Stress Generator
  const [burstVolume, setBurstVolume] = useState(2500);
  const [vuCount, setVuCount] = useState(100);
  const [isBursting, setIsBursting] = useState(false);
  const [burstProgress, setBurstProgress] = useState(0);
  const [isContinuous, setIsContinuous] = useState(false);
  const [stressStatus, setStressStatus] = useState({ state: 'idle', text: '● IDLE' });

  // Audit Logs
  const [auditLog, setAuditLog] = useState([]);
  const [auditFilter, setAuditFilter] = useState('all');
  const [auditSearch, setAuditSearch] = useState('');

  // Security & Trust State
  const [currentRole, setCurrentRole] = useState('bidder');
  const [rlCount, setRlCount] = useState(0);
  const [rlWindowTime, setRlWindowTime] = useState(60);
  const [wsState, setWsState] = useState('connected');
  const [secToast, setSecToast] = useState({ visible: false, text: '', type: 'warn' });
  const [secAuditLog, setSecAuditLog] = useState([]);
  const [secCounters, setSecCounters] = useState({
    blocked: 0,
    duplicates: 0,
    invalid: 0,
    rateLimit: 0,
    seqGaps: 0
  });
  const [lastReqId, setLastReqId] = useState(null);

  // Supabase PostgreSQL & Realtime State
  const [supabaseUrl, setSupabaseUrl] = useState(() => localStorage.getItem('synora_supabase_url') || '');
  const [supabaseAnonKey, setSupabaseAnonKey] = useState(() => localStorage.getItem('synora_supabase_key') || '');
  const [supabaseClient, setSupabaseClient] = useState(null);
  const [isSupabaseConnected, setIsSupabaseConnected] = useState(false);
  const [isSupabaseModalOpen, setIsSupabaseModalOpen] = useState(false);
  const [supabaseStatusMsg, setSupabaseStatusMsg] = useState('');
  const [isSupabaseTesting, setIsSupabaseTesting] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);

  // ═══════════════════════════════════════════════════════════════════
  // RELIEF EXCHANGE (EMERGENCY PROCUREMENT MODE) STATE
  // ═══════════════════════════════════════════════════════════════════
  const [reliefOffers, setReliefOffers] = useState([
    {
      id: 'off_init_1',
      seq: 1,
      supplier: 'National Cryogenics Ltd',
      pricePerUnit: 2100,
      quantity: 500,
      totalCost: 1050000,
      deliveryHours: 3.5,
      certified: true,
      status: 'ELIGIBLE',
      rejectionReason: null,
      timestamp: '05:00:12.104',
      latency: 1.2
    },
    {
      id: 'off_init_2',
      seq: 2,
      supplier: 'Apex Medical Gas',
      pricePerUnit: 1920,
      quantity: 500,
      totalCost: 960000,
      deliveryHours: 2.5,
      certified: true,
      status: 'ELIGIBLE',
      rejectionReason: null,
      timestamp: '05:01:45.320',
      latency: 0.8
    }
  ]);

  const [bestReliefOffer, setBestReliefOffer] = useState({
    id: 'off_init_2',
    seq: 2,
    supplier: 'Apex Medical Gas',
    pricePerUnit: 1920,
    quantity: 500,
    totalCost: 960000,
    deliveryHours: 2.5,
    certified: true,
    status: 'ELIGIBLE',
    timestamp: '05:01:45.320'
  });

  const [isContractAwarded, setIsContractAwarded] = useState(false);
  const [reliefCountdownSec, setReliefCountdownSec] = useState(13540); // 03h 45m 40s

  // Relief Offer Form
  const [formSupplier, setFormSupplier] = useState('LifeLine Healthcare Cryo');
  const [formPrice, setFormPrice] = useState(1850);
  const [formQty, setFormQty] = useState(500);
  const [formDeliveryHours, setFormDeliveryHours] = useState(2.8);
  const [formCertified, setFormCertified] = useState(true);

  // Relief Simulation
  const [isReliefSimulating, setIsReliefSimulating] = useState(false);
  const [reliefSimProgress, setReliefSimProgress] = useState(0);
  const [reliefSimStats, setReliefSimStats] = useState({
    totalOffers: 2,
    eligibleCount: 2,
    rejectedCount: 0,
    bestPrice: 1920,
    bestTotal: 960000,
    winningSupplier: 'Apex Medical Gas',
    savings: 240000,
    meanLatency: '0.8 ms',
    violations: 0
  });

  // Mutable reference for zero-latency concurrency calculations
  const liveRef = useRef({
    currentPrice: 10000,
    highestSeq: 0,
    version: 0,
    timeLeftSec: 84.8,
    strategy: 'atomic',
    pessimisticBusy: false,
    pessimisticQueue: [],
    atomicQueue: [],
    isAtomicDraining: false,
    tpsCounter: 0,
    lastTpsCalcTime: performance.now(),
    chartHistory: Array.from({ length: 60 }, () => ({ tps: 0, latency: 0 })),
    idempotencyStore: new Map(),
    recentBidTs: [],
    suspiciousFlag: false,
    lastSeqObserved: 0,
    reliefSeq: 2,
  });

  // Synchronize ref with state
  useEffect(() => {
    liveRef.current.strategy = strategy;
  }, [strategy]);

  // Keep manual bid input in sync when price changes
  useEffect(() => {
    const minRequired = currentPrice + minIncrement;
    if (parseFloat(manualBidInput) < minRequired) {
      setManualBidInput(minRequired);
    }
  }, [currentPrice, minIncrement]);

  // Countdown timer for Emergency Procurement Request
  useEffect(() => {
    const interval = setInterval(() => {
      setReliefCountdownSec(t => (t > 0 ? t - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Formatted Relief Urgency Countdown
  const formattedReliefTimer = useMemo(() => {
    const hrs = Math.floor(reliefCountdownSec / 3600);
    const mins = Math.floor((reliefCountdownSec % 3600) / 60);
    const secs = reliefCountdownSec % 60;
    return `${String(hrs).padStart(2, '0')}h : ${String(mins).padStart(2, '0')}m : ${String(secs).padStart(2, '0')}s`;
  }, [reliefCountdownSec]);

  // Notification Toast Helper
  const triggerSecToast = useCallback((text, type = 'warn') => {
    setSecToast({ visible: true, text, type });
    setTimeout(() => {
      setSecToast(prev => ({ ...prev, visible: false }));
    }, 4000);
  }, []);

  // Security Audit Entry Logger
  const addSecLog = useCallback((entry) => {
    const now = new Date();
    const ts = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}:${String(now.getSeconds()).padStart(2,'0')}.${String(now.getMilliseconds()).padStart(3,'0')}`;
    setSecAuditLog(prev => [{
      id: Math.random().toString(),
      time: ts,
      reqId: entry.reqId || null,
      event: entry.event,
      amount: entry.amount,
      outcome: entry.outcome,
      detail: entry.detail
    }, ...prev.slice(0, 50)]);
  }, []);

  // Visual Flash Trigger
  const flashPrice = useCallback((type) => {
    setPriceFlash(type);
    setTimeout(() => setPriceFlash(null), 450);
  }, []);

  // Anti-Sniping Protection Handler
  const handleAntiSniping = useCallback(() => {
    if (liveRef.current.timeLeftSec <= 15) {
      liveRef.current.timeLeftSec += 20;
      setTimeLeftSec(liveRef.current.timeLeftSec);
      setSnipeAlert(true);
      setTimeout(() => setSnipeAlert(false), 3500);
    }
  }, []);

  // Core Bid Outcome Processor (Forward Auction)
  const processBidResult = useCallback((bid, outcome, latency, lockWait, reason) => {
    setRecentLatencies(prev => {
      const next = [...prev, latency];
      return next.length > 200 ? next.slice(-200) : next;
    });
    if (lockWait > 0) {
      setRecentLockWaits(prev => {
        const next = [...prev, lockWait];
        return next.length > 200 ? next.slice(-200) : next;
      });
    }

    if (liveRef.current.lastSeqObserved !== 0 && bid.seq && bid.seq !== liveRef.current.lastSeqObserved + 1) {
      setSecCounters(c => ({ ...c, seqGaps: c.seqGaps + 1 }));
    }
    if (bid.seq) liveRef.current.lastSeqObserved = bid.seq;

    if (outcome === 'ACCEPTED') {
      setValidAccepted(v => v + 1);
      flashPrice('success');
      playSound(true, false);
      handleAntiSniping();
    } else if (outcome === 'VIOLATION') {
      setInvalidViolations(v => v + 1);
      flashPrice('conflict');
      playSound(false, true);
    } else {
      setStaleRejected(v => v + 1);
    }

    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}:${String(now.getSeconds()).padStart(2,'0')}.${String(now.getMilliseconds()).padStart(3,'0')}`;
    
    setAuditLog(prev => [{
      id: Math.random().toString(),
      seq: bid.seq || liveRef.current.highestSeq,
      time: timeStr,
      bidder: bid.bidder,
      offered: bid.amount,
      auctionHigh: liveRef.current.currentPrice,
      latency: latency,
      status: outcome,
      reason: reason
    }, ...prev.slice(0, 75)]);

    // Supabase PostgreSQL Real-Time Sync
    if (supabaseClient && isSupabaseConnected) {
      try {
        const seqToSave = bid.seq || liveRef.current.highestSeq;
        supabaseClient.from('bids').insert([{
          auction_id: 'SYN-9024',
          sequence_no: seqToSave,
          bidder_name: bid.bidder,
          amount: Math.round(bid.amount),
          accepted: outcome === 'ACCEPTED',
          rejection_reason: outcome !== 'ACCEPTED' ? reason : null
        }]).then();

        if (outcome === 'ACCEPTED') {
          supabaseClient.from('auctions').upsert({
            id: 'SYN-9024',
            title: 'Rare Genesis Art Token #01',
            current_bid: Math.round(bid.amount),
            highest_bidder: bid.bidder,
            seq_counter: seqToSave,
            ends_at: new Date(Date.now() + liveRef.current.timeLeftSec * 1000).toISOString(),
            status: 'ACTIVE'
          }).then();
        }
      } catch (err) {
        console.warn('Supabase bid write error:', err);
      }
    }
  }, [flashPrice, handleAntiSniping, supabaseClient, isSupabaseConnected]);

  // Dispatch Bid through Active Concurrency Engine (Forward Auction)
  const dispatchBid = useCallback(async (rawBid) => {
    const t0 = performance.now();
    setTotalIngested(t => t + 1);
    liveRef.current.tpsCounter++;

    // RBAC Check
    if (currentRole !== 'bidder') {
      setSecCounters(c => ({ ...c, blocked: c.blocked + 1 }));
      addSecLog({
        reqId: rawBid.__reqId || 'req_RBAC',
        event: 'Unauthorized action blocked',
        outcome: 'DENIED',
        detail: `Role "${USER_ROLES[currentRole].role}" cannot place bids`,
        amount: rawBid.amount
      });
      triggerSecToast('Unauthorized action blocked: Only Bidder role is permitted to submit bids.', 'error');
      return;
    }

    // Rate Limiting Check
    const nowTs = Date.now();
    liveRef.current.recentBidTs = liveRef.current.recentBidTs.filter(t => nowTs - t < 3000);
    liveRef.current.recentBidTs.push(nowTs);
    if (liveRef.current.recentBidTs.length > 35 && !liveRef.current.suspiciousFlag) {
      liveRef.current.suspiciousFlag = true;
      triggerSecToast('Suspicious activity alert: High burst frequency detected.', 'warn');
    }

    setRlCount(c => {
      const nextCount = c + 1;
      if (nextCount > 60) {
        setSecCounters(sec => ({ ...sec, rateLimit: sec.rateLimit + 1, blocked: sec.blocked + 1 }));
        addSecLog({
          reqId: rawBid.__reqId || 'req_RATE',
          event: 'Rate limit blocked',
          outcome: 'RATE_LIM',
          detail: 'Exceeded 60 bids/min quota per user account',
          amount: rawBid.amount
        });
        triggerSecToast('Rate limit triggered: 60 bids/min quota reached. Retry shortly.', 'error');
        return nextCount;
      }
      return nextCount;
    });

    // Validation
    if (rawBid.amount < liveRef.current.currentPrice + minIncrement) {
      const lat = performance.now() - t0;
      processBidResult(rawBid, 'REJECTED', lat, 0, `Below minimum required bid of $${(liveRef.current.currentPrice + minIncrement).toLocaleString()}`);
      setSecCounters(sec => ({ ...sec, invalid: sec.invalid + 1 }));
      return;
    }

    const strat = liveRef.current.strategy;

    if (strat === 'naive') {
      const readPrice = liveRef.current.currentPrice;
      const readSeq = liveRef.current.highestSeq;
      const ioDelay = 2 + Math.random() * 6;
      await new Promise(r => setTimeout(r, ioDelay));

      const latency = performance.now() - t0;
      if (rawBid.amount >= readPrice + minIncrement) {
        const isViolation = rawBid.amount < liveRef.current.currentPrice;
        if (isViolation) {
          liveRef.current.currentPrice = rawBid.amount;
          liveRef.current.highestSeq++;
          setCurrentPrice(rawBid.amount);
          setHighestBidder(rawBid.bidder);
          setHighestSeq(liveRef.current.highestSeq);
          processBidResult({ ...rawBid, seq: liveRef.current.highestSeq }, 'VIOLATION', latency, 0, `Race condition: overwrote higher price with $${rawBid.amount.toLocaleString()}`);
        } else {
          liveRef.current.currentPrice = rawBid.amount;
          liveRef.current.highestSeq++;
          setCurrentPrice(rawBid.amount);
          setHighestBidder(rawBid.bidder);
          setHighestSeq(liveRef.current.highestSeq);
          processBidResult({ ...rawBid, seq: liveRef.current.highestSeq }, 'ACCEPTED', latency, 0, 'Valid increment');
        }
      } else {
        processBidResult({ ...rawBid, seq: readSeq }, 'REJECTED', latency, 0, `Stale price verification against $${readPrice.toLocaleString()}`);
      }

    } else if (strat === 'pessimistic') {
      const lockStart = performance.now();
      if (liveRef.current.pessimisticBusy) {
        await new Promise(res => liveRef.current.pessimisticQueue.push(res));
      }
      liveRef.current.pessimisticBusy = true;
      const lockWait = performance.now() - lockStart;

      try {
        await new Promise(r => setTimeout(r, 1.2 + Math.random() * 1.5));
        const latency = performance.now() - t0;

        if (rawBid.amount >= liveRef.current.currentPrice + minIncrement) {
          liveRef.current.currentPrice = rawBid.amount;
          liveRef.current.highestSeq++;
          setCurrentPrice(rawBid.amount);
          setHighestBidder(rawBid.bidder);
          setHighestSeq(liveRef.current.highestSeq);
          processBidResult({ ...rawBid, seq: liveRef.current.highestSeq }, 'ACCEPTED', latency, lockWait, `Serialized under lock (queue wait ${lockWait.toFixed(1)}ms)`);
        } else {
          processBidResult({ ...rawBid, seq: liveRef.current.highestSeq }, 'REJECTED', latency, lockWait, `Stale under lock (queue wait ${lockWait.toFixed(1)}ms)`);
        }
      } finally {
        liveRef.current.pessimisticBusy = false;
        if (liveRef.current.pessimisticQueue.length > 0) {
          liveRef.current.pessimisticQueue.shift()();
        }
      }

    } else if (strat === 'optimistic') {
      const readVersion = liveRef.current.version;
      const readPrice = liveRef.current.currentPrice;
      await new Promise(r => setTimeout(r, 0.5 + Math.random() * 1.5));
      const latency = performance.now() - t0;

      if (liveRef.current.version !== readVersion) {
        processBidResult(rawBid, 'REJECTED', latency, 0, `CAS conflict: expected v${readVersion}, state is v${liveRef.current.version}`);
      } else if (rawBid.amount >= readPrice + minIncrement) {
        liveRef.current.version++;
        liveRef.current.currentPrice = rawBid.amount;
        liveRef.current.highestSeq++;
        setVersion(liveRef.current.version);
        setCurrentPrice(rawBid.amount);
        setHighestBidder(rawBid.bidder);
        setHighestSeq(liveRef.current.highestSeq);
        processBidResult({ ...rawBid, seq: liveRef.current.highestSeq }, 'ACCEPTED', latency, 0, `CAS verified (v${readVersion}→v${liveRef.current.version})`);
      } else {
        processBidResult(rawBid, 'REJECTED', latency, 0, `Stale bid amount $${rawBid.amount.toLocaleString()}`);
      }

    } else {
      liveRef.current.atomicQueue.push({ bid: rawBid, enqueueTime: t0 });

      if (!liveRef.current.isAtomicDraining) {
        const drain = () => {
          liveRef.current.isAtomicDraining = true;
          const batch = Math.min(liveRef.current.atomicQueue.length, 120);
          const now = performance.now();

          for (let i = 0; i < batch; i++) {
            const item = liveRef.current.atomicQueue.shift();
            const latency = now - item.enqueueTime + 0.12;

            if (item.bid.amount >= liveRef.current.currentPrice + minIncrement) {
              liveRef.current.currentPrice = item.bid.amount;
              liveRef.current.highestSeq++;
              setCurrentPrice(item.bid.amount);
              setHighestBidder(item.bid.bidder);
              setHighestSeq(liveRef.current.highestSeq);
              processBidResult({ ...item.bid, seq: liveRef.current.highestSeq }, 'ACCEPTED', latency, 0, 'Sequenced in-memory (0 database locks)');
            } else {
              processBidResult({ ...item.bid, seq: liveRef.current.highestSeq }, 'REJECTED', latency, 0, `Out-of-order sequence rejection ($${item.bid.amount.toLocaleString()})`);
            }
          }

          if (liveRef.current.atomicQueue.length > 0) {
            requestAnimationFrame(drain);
          } else {
            liveRef.current.isAtomicDraining = false;
          }
        };
        requestAnimationFrame(drain);
      }
    }
  }, [currentRole, minIncrement, processBidResult, triggerSecToast, addSecLog]);

  // Manual User Bid Submission
  const handlePlaceManualBid = useCallback(() => {
    const amount = parseFloat(manualBidInput);
    if (isNaN(amount) || amount <= 0) return;

    const reqId = 'req_' + Math.random().toString(36).substring(2, 9).toUpperCase();
    setLastReqId(reqId);
    liveRef.current.idempotencyStore.set(reqId, { amount, bidder: 'You (Human Trader)' });

    addSecLog({
      reqId,
      event: 'Authoritative bid placed',
      outcome: 'ACCEPTED',
      detail: 'Client identity authenticated • Idempotency key assigned',
      amount
    });

    dispatchBid({
      bidder: 'You (Human Trader)',
      amount: Math.round(amount),
      __reqId: reqId
    });
  }, [manualBidInput, dispatchBid, addSecLog]);

  // Quick Increment Buttons Handler
  const handleQuickIncrement = useCallback((inc) => {
    const nextAmount = currentPrice + inc;
    setManualBidInput(nextAmount);
    const reqId = 'req_' + Math.random().toString(36).substring(2, 9).toUpperCase();
    setLastReqId(reqId);
    liveRef.current.idempotencyStore.set(reqId, { amount: nextAmount, bidder: 'You (Quick Action)' });

    dispatchBid({
      bidder: 'You (Quick Action)',
      amount: nextAmount,
      __reqId: reqId
    });
  }, [currentPrice, dispatchBid]);

  // Idempotency Retry Simulation
  const handleRetryLastRequest = useCallback(() => {
    if (!lastReqId) {
      triggerSecToast('No prior bid request recorded to retry.', 'warn');
      return;
    }
    const cached = liveRef.current.idempotencyStore.get(lastReqId);
    if (cached) {
      setSecCounters(c => ({ ...c, duplicates: c.duplicates + 1 }));
      addSecLog({
        reqId: lastReqId,
        event: 'Duplicate request blocked',
        outcome: 'BLOCKED',
        detail: `Idempotency match: cached result returned ($${cached.amount.toLocaleString()}) without duplicate creation`,
        amount: cached.amount
      });
      triggerSecToast('Duplicate request detected: Original result returned (idempotency key matched).', 'warn');
    } else {
      triggerSecToast('Request ID expired or not found.', 'warn');
    }
  }, [lastReqId, addSecLog, triggerSecToast]);

  // Spike Burst Test Generator (Forward Auction)
  const runSpikeBurst = useCallback(async (vol, vus) => {
    setIsBursting(true);
    setStressStatus({ state: 'running', text: `BURST: ${vol.toLocaleString()} BIDS / ${vus} VUs` });

    const bidsPerVu = Math.ceil(vol / vus);
    let completed = 0;
    const tasks = [];

    for (let v = 0; v < vus; v++) {
      const botName = `${BOT_NAMES[v % BOT_NAMES.length]}#${v + 1}`;
      tasks.push((async () => {
        for (let i = 0; i < bidsPerVu; i++) {
          const roll = Math.random();
          let amount;
          if (roll < 0.45) {
            amount = liveRef.current.currentPrice + minIncrement * (1 + Math.floor(Math.random() * 3));
          } else if (roll < 0.80) {
            amount = liveRef.current.currentPrice + minIncrement;
          } else {
            amount = liveRef.current.currentPrice - minIncrement;
          }

          dispatchBid({ bidder: botName, amount: Math.round(amount) });
          completed++;

          if (i % 8 === 0) {
            setBurstProgress(Math.min(100, Math.round((completed / vol) * 100)));
            await new Promise(r => setTimeout(r, Math.random() * 2));
          }
        }
      })());
    }

    await Promise.all(tasks);
    setBurstProgress(100);
    setTimeout(() => {
      setBurstProgress(0);
      setIsBursting(false);
      setStressStatus({ state: 'done', text: `COMPLETED: ${vol.toLocaleString()} BIDS PROCESSED` });
    }, 500);

    setTimeout(() => {
      setStressStatus({ state: 'idle', text: '● IDLE' });
    }, 4500);
  }, [minIncrement, dispatchBid]);

  // Continuous Load Generator
  useEffect(() => {
    let interval = null;
    if (isContinuous) {
      setStressStatus({ state: 'running', text: 'CONTINUOUS: ~1,500 REQ/S' });
      interval = setInterval(() => {
        for (let i = 0; i < 60; i++) {
          const bot = BOT_NAMES[Math.floor(Math.random() * BOT_NAMES.length)];
          const delta = Math.random() > 0.4 ? minIncrement : (Math.random() > 0.5 ? -minIncrement : 0);
          dispatchBid({ bidder: bot, amount: Math.round(liveRef.current.currentPrice + delta) });
        }
      }, 40);
    } else {
      setStressStatus({ state: 'idle', text: '● IDLE' });
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isContinuous, minIncrement, dispatchBid]);

  // ═══════════════════════════════════════════════════════════════════
  // RELIEF EXCHANGE (REVERSE AUCTION) CORE HANDLERS
  // ═══════════════════════════════════════════════════════════════════
  const submitReliefOffer = useCallback((rawOffer) => {
    const t0 = performance.now();
    const qty = parseFloat(rawOffer.quantity) || 0;
    const delivery = parseFloat(rawOffer.deliveryHours) || 0;
    const price = parseFloat(rawOffer.pricePerUnit) || 0;
    const totalCost = Math.round(qty * price);
    const certified = Boolean(rawOffer.certified);
    const supplier = rawOffer.supplier || 'Anonymous Cryo Provider';

    // Assign Sequence Number
    liveRef.current.reliefSeq = (liveRef.current.reliefSeq || 2) + 1;
    const assignedSeq = liveRef.current.reliefSeq;

    // Strict reverse auction emergency procurement validation
    let status = 'ELIGIBLE';
    let rejectionReason = null;

    if (qty < 500) {
      status = 'REJECTED';
      rejectionReason = 'Quantity insufficient (requires ≥ 500 cylinders)';
    } else if (delivery > 4.0) {
      status = 'REJECTED';
      rejectionReason = 'Delivery deadline missed (requires ≤ 4.0 hours)';
    } else if (!certified) {
      status = 'REJECTED';
      rejectionReason = 'Medical certificate missing (unverified grade)';
    } else if (totalCost > 1200000) {
      status = 'REJECTED';
      rejectionReason = 'Over budget (exceeds ₹12,00,000 ceiling)';
    }

    const latency = performance.now() - t0 + 0.35;
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}:${String(now.getSeconds()).padStart(2,'0')}.${String(now.getMilliseconds()).padStart(3,'0')}`;

    const evaluatedOffer = {
      id: 'off_' + Math.random().toString(36).substring(2, 9),
      seq: assignedSeq,
      supplier,
      pricePerUnit: price,
      quantity: qty,
      totalCost,
      deliveryHours: delivery,
      certified,
      status,
      rejectionReason,
      timestamp: timeStr,
      latency
    };

    // Update Offer Feed
    setReliefOffers(prev => [evaluatedOffer, ...prev.slice(0, 99)]);

    // Evaluate against Best Eligible Offer
    if (status === 'ELIGIBLE') {
      playSound(true, false);
      setBestReliefOffer(currentBest => {
        let isNewBest = false;
        if (!currentBest) {
          isNewBest = true;
        } else if (totalCost < currentBest.totalCost) {
          isNewBest = true;
        } else if (totalCost === currentBest.totalCost && assignedSeq < currentBest.seq) {
          // Transparent tie-breaker: first in sequence wins
          isNewBest = true;
        }

        if (isNewBest) {
          const savings = Math.max(0, 1200000 - totalCost);
          setReliefSimStats(s => ({
            ...s,
            bestPrice: price,
            bestTotal: totalCost,
            winningSupplier: supplier,
            savings
          }));
          triggerSecToast(`New leading emergency offer: ${supplier} at ${formatINR(totalCost)} (${formatINR(savings)} public funds saved)`, 'ok');
          return evaluatedOffer;
        }
        return currentBest;
      });
    } else {
      playSound(false, false);
    }

    // Add into Central Immutable Audit Ledger
    setAuditLog(prev => [{
      id: Math.random().toString(),
      seq: assignedSeq,
      time: timeStr,
      bidder: `[RELIEF] ${supplier}`,
      offered: totalCost,
      auctionHigh: totalCost,
      latency: latency,
      status: status === 'ELIGIBLE' ? 'ACCEPTED' : 'REJECTED',
      reason: status === 'ELIGIBLE'
        ? `OFFER_ELIGIBLE: ${formatINR(price)}/cyl (${delivery}h, Med-Certified, total ${formatINR(totalCost)})`
        : `OFFER_REJECTED: ${rejectionReason}`
    }, ...prev.slice(0, 100)]);

    // Supabase Sync for Relief Offers
    if (supabaseClient && isSupabaseConnected) {
      try {
        supabaseClient.from('relief_offers').insert([{
          sequence_no: assignedSeq,
          supplier_name: supplier,
          total_cost: Math.round(totalCost),
          quantity: Math.round(qty),
          delivery_hours: parseFloat(delivery),
          certified: !!cert,
          status: status
        }]).then();
      } catch (e) {
        console.warn('Supabase relief offer write error:', e);
      }
    }

    return evaluatedOffer;
  }, [triggerSecToast, supabaseClient, isSupabaseConnected]);

  // Finalize & Award Emergency Contract
  const awardReliefContract = useCallback(() => {
    if (!bestReliefOffer) {
      triggerSecToast('No eligible supplier offer available to award.', 'warn');
      return;
    }
    setIsContractAwarded(true);
    playSound(true, false);

    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}:${String(now.getSeconds()).padStart(2,'0')}.${String(now.getMilliseconds()).padStart(3,'0')}`;

    // Add CONTRACT_AWARDED into Central Immutable Audit Ledger
    setAuditLog(prev => [{
      id: Math.random().toString(),
      seq: bestReliefOffer.seq,
      time: timeStr,
      bidder: `[CONTRACT AWARD] ${bestReliefOffer.supplier}`,
      offered: bestReliefOffer.totalCost,
      auctionHigh: bestReliefOffer.totalCost,
      latency: 0.4,
      status: 'ACCEPTED',
      reason: `CONTRACT_AWARDED: City Emergency Hospital awarded ${formatINR(bestReliefOffer.totalCost)} contract to ${bestReliefOffer.supplier} (Seq #${bestReliefOffer.seq})`
    }, ...prev.slice(0, 100)]);

    triggerSecToast(`Emergency contract awarded to ${bestReliefOffer.supplier} for ${formatINR(bestReliefOffer.totalCost)}!`, 'ok');
  }, [bestReliefOffer, triggerSecToast]);

  // Concurrent Emergency Load Test (Simulate 5,000 Supplier Offers)
  const simulateReliefSurge = useCallback(async (volume = 5000) => {
    setIsReliefSimulating(true);
    setReliefSimProgress(0);

    let eligibleCount = 0;
    let rejectedCount = 0;
    let currentBest = bestReliefOffer ? { ...bestReliefOffer } : null;
    let totalLatency = 0;
    let violations = 0;

    const strat = liveRef.current.strategy;
    const batchSize = 100;
    const batches = Math.ceil(volume / batchSize);

    for (let b = 0; b < batches; b++) {
      for (let i = 0; i < batchSize; i++) {
        const sup = RELIEF_SUPPLIERS[(b * batchSize + i) % RELIEF_SUPPLIERS.length];
        
        // Distribution: 65% compliant, 35% non-compliant
        const roll = Math.random();
        let qty = 500;
        let delivery = 1.5 + Math.random() * 2.2;
        let cert = true;
        let price = 1600 + Math.floor(Math.random() * 750);

        if (roll < 0.10) qty = 300 + Math.floor(Math.random() * 180); // insufficient qty
        else if (roll < 0.20) delivery = 4.2 + Math.random() * 2.5;   // deadline missed
        else if (roll < 0.28) cert = false;                          // uncertified
        else if (roll < 0.35) price = 2450 + Math.floor(Math.random() * 400); // over budget

        const totalCost = qty * price;
        liveRef.current.reliefSeq = (liveRef.current.reliefSeq || 2) + 1;
        const seq = liveRef.current.reliefSeq;

        const isEligible = (qty >= 500 && delivery <= 4.0 && cert && totalCost <= 1200000);
        
        // In NAIVE strategy: simulate race condition where non-compliant or higher-price offer overwrites state
        if (strat === 'naive' && Math.random() < 0.03) {
          violations++;
        }

        if (isEligible) {
          eligibleCount++;
          if (!currentBest || totalCost < currentBest.totalCost) {
            currentBest = {
              id: `off_surge_${seq}`,
              seq,
              supplier: `${sup} #${(b * batchSize + i) + 1}`,
              pricePerUnit: price,
              quantity: qty,
              totalCost,
              deliveryHours: parseFloat(delivery.toFixed(1)),
              certified: cert,
              status: 'ELIGIBLE',
              timestamp: 'LIVE_SURGE',
              latency: 0.6 + Math.random() * 0.4
            };
          }
        } else {
          rejectedCount++;
        }

        totalLatency += 0.45;
      }

      setReliefSimProgress(Math.min(100, Math.round(((b + 1) / batches) * 100)));
      await new Promise(r => setTimeout(r, 12));
    }

    if (currentBest) {
      setBestReliefOffer(currentBest);
      setReliefOffers(prev => [currentBest, ...prev.slice(0, 60)]);
    }

    const meanLat = (totalLatency / volume).toFixed(1);
    const savings = currentBest ? Math.max(0, 1200000 - currentBest.totalCost) : 0;

    setReliefSimStats({
      totalOffers: volume,
      eligibleCount,
      rejectedCount,
      bestPrice: currentBest ? currentBest.pricePerUnit : 1920,
      bestTotal: currentBest ? currentBest.totalCost : 960000,
      winningSupplier: currentBest ? currentBest.supplier : 'Apex Medical Gas',
      savings,
      meanLatency: `${meanLat} ms`,
      violations
    });

    setIsReliefSimulating(false);
    triggerSecToast(`Emergency procurement surge completed: ${volume.toLocaleString()} offers processed (${eligibleCount.toLocaleString()} eligible, ${rejectedCount.toLocaleString()} rejected).`, 'ok');
  }, [bestReliefOffer, triggerSecToast]);

  // Global Simulation Reset
  const resetSimulation = useCallback(() => {
    setIsContinuous(false);
    liveRef.current.currentPrice = 10000;
    liveRef.current.highestSeq = 0;
    liveRef.current.version = 0;
    liveRef.current.timeLeftSec = 84.8;
    liveRef.current.atomicQueue = [];
    liveRef.current.pessimisticQueue = [];
    liveRef.current.idempotencyStore.clear();

    setCurrentPrice(10000);
    setHighestBidder('Genesis Treasury');
    setHighestSeq(0);
    setVersion(0);
    setTimeLeftSec(84.8);
    setManualBidInput(10250);

    setTotalIngested(0);
    setValidAccepted(0);
    setStaleRejected(0);
    setInvalidViolations(0);
    setRecentLatencies([]);
    setRecentLockWaits([]);
    setAuditLog([]);
    setSecAuditLog([]);
    setSecCounters({ blocked: 0, duplicates: 0, invalid: 0, rateLimit: 0, seqGaps: 0 });
    setLastReqId(null);
    setRlCount(0);
    setStressStatus({ state: 'idle', text: '● IDLE' });
    setIsContractAwarded(false);

    triggerSecToast('Auction & simulation states reset to genesis parameters.', 'ok');
  }, [triggerSecToast]);

  // Countdown Timer Loop (Forward Auction)
  useEffect(() => {
    const timerInterval = setInterval(() => {
      if (liveRef.current.timeLeftSec > 0) {
        liveRef.current.timeLeftSec = Math.max(0, liveRef.current.timeLeftSec - 0.1);
        setTimeLeftSec(liveRef.current.timeLeftSec);
      }
    }, 100);
    return () => clearInterval(timerInterval);
  }, []);

  // Rate Limiter Window Countdown Loop
  useEffect(() => {
    const rlInterval = setInterval(() => {
      setRlWindowTime(t => {
        if (t <= 1) {
          setRlCount(0);
          liveRef.current.recentBidTs = [];
          liveRef.current.suspiciousFlag = false;
          return 60;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(rlInterval);
  }, []);

  // Canvas Telemetry Chart Loop (Forward Auction) - Only runs when tab is active
  const canvasRef = useRef(null);
  useEffect(() => {
    if (activeTab !== 'concurrency') return;
    let animationFrameId;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const renderLoop = () => {
      const now = performance.now();
      const elapsed = (now - liveRef.current.lastTpsCalcTime) / 1000;

      if (elapsed >= 0.4) {
        const calculatedTps = Math.round(liveRef.current.tpsCounter / elapsed);
        liveRef.current.tpsCounter = 0;
        liveRef.current.lastTpsCalcTime = now;
        setCurrentTps(calculatedTps);

        const meanLat = recentLatencies.length > 0
          ? recentLatencies.reduce((a, b) => a + b, 0) / recentLatencies.length
          : 0;

        liveRef.current.chartHistory.push({ tps: calculatedTps, latency: meanLat });
        if (liveRef.current.chartHistory.length > 60) {
          liveRef.current.chartHistory.shift();
        }
      }

      const width = canvas.width = canvas.parentElement ? canvas.parentElement.clientWidth : 500;
      const height = canvas.height = canvas.parentElement ? canvas.parentElement.clientHeight : 160;

      ctx.clearRect(0, 0, width, height);
      const data = liveRef.current.chartHistory;
      if (data.length >= 2) {
        const maxTps = Math.max(1000, ...data.map(d => d.tps));
        const maxLat = Math.max(50, ...data.map(d => d.latency));
        const stepX = width / (data.length - 1);
        const padT = 26, padB = 8;

        ctx.strokeStyle = 'rgba(0,0,0,0.06)';
        ctx.lineWidth = 1;
        for (let y = padT; y < height - padB; y += (height - padT - padB) / 4) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(width, y);
          ctx.stroke();
        }

        const tpsPts = data.map((d, i) => ({
          x: i * stepX,
          y: height - padB - (d.tps / maxTps) * (height - padT - padB)
        }));

        ctx.beginPath();
        tpsPts.forEach((pt, i) => i === 0 ? ctx.moveTo(pt.x, pt.y) : ctx.lineTo(pt.x, pt.y));
        const gradTps = ctx.createLinearGradient(0, padT, 0, height);
        gradTps.addColorStop(0, 'rgba(44,78,138,0.18)');
        gradTps.addColorStop(1, 'rgba(44,78,138,0)');
        ctx.lineTo(width, height);
        ctx.lineTo(0, height);
        ctx.fillStyle = gradTps;
        ctx.fill();

        ctx.beginPath();
        tpsPts.forEach((pt, i) => i === 0 ? ctx.moveTo(pt.x, pt.y) : ctx.lineTo(pt.x, pt.y));
        ctx.strokeStyle = '#2c4e8a';
        ctx.lineWidth = 1.6;
        ctx.lineJoin = 'round';
        ctx.stroke();

        ctx.beginPath();
        data.forEach((d, i) => {
          const x = i * stepX;
          const y = height - padB - (d.latency / maxLat) * (height - padT - padB);
          i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        });
        ctx.strokeStyle = '#b05c0a';
        ctx.lineWidth = 1.4;
        ctx.lineJoin = 'round';
        ctx.stroke();

        ctx.font = '600 10px JetBrains Mono, monospace';
        ctx.fillStyle = '#2c4e8a';
        ctx.fillText(`THROUGHPUT: ${data[data.length - 1].tps.toLocaleString()} TPS (PEAK: ${maxTps.toLocaleString()})`, 10, 14);

        ctx.fillStyle = '#b05c0a';
        ctx.fillText(`AVG LATENCY: ${data[data.length - 1].latency.toFixed(1)} ms`, 10, 25);
      }

      animationFrameId = requestAnimationFrame(renderLoop);
    };

    animationFrameId = requestAnimationFrame(renderLoop);
    return () => cancelAnimationFrame(animationFrameId);
  }, [activeTab, recentLatencies]);

  // Derived Telemetry Values
  const meanLatency = useMemo(() => {
    if (!recentLatencies.length) return '0.0';
    return (recentLatencies.reduce((a, b) => a + b, 0) / recentLatencies.length).toFixed(1);
  }, [recentLatencies]);

  const p95Latency = useMemo(() => {
    if (!recentLatencies.length) return '0.0';
    const sorted = [...recentLatencies].sort((a, b) => a - b);
    return sorted[Math.floor(sorted.length * 0.95)].toFixed(1);
  }, [recentLatencies]);

  const avgLockTime = useMemo(() => {
    if (!recentLockWaits.length) return '0.0';
    return (recentLockWaits.reduce((a, b) => a + b, 0) / recentLockWaits.length).toFixed(1);
  }, [recentLockWaits]);

  const violationRate = useMemo(() => {
    if (totalIngested === 0) return '0.000%';
    return `${((invalidViolations / totalIngested) * 100).toFixed(3)}%`;
  }, [totalIngested, invalidViolations]);

  // Filtered Audit Log
  const filteredAuditLog = useMemo(() => {
    const q = auditSearch.toLowerCase().trim();
    return auditLog.filter(item => {
      if (auditFilter !== 'all' && item.status !== auditFilter) return false;
      if (q && !item.bidder.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [auditLog, auditFilter, auditSearch]);

  // Formatted Timer Display (Forward Auction)
  const formattedTimer = useMemo(() => {
    const mins = Math.floor(timeLeftSec / 60);
    const secs = (timeLeftSec % 60).toFixed(1).padStart(4, '0');
    return `${String(mins).padStart(2, '0')}:${secs}`;
  }, [timeLeftSec]);

  // Supabase Database Connection Handler
  const connectSupabase = useCallback(async (url, key) => {
    if (!url || !key) {
      setSupabaseStatusMsg('Please enter both Supabase Project URL and Anon Key.');
      return false;
    }
    if (!window.supabase || !window.supabase.createClient) {
      setSupabaseStatusMsg('Supabase SDK not loaded in browser.');
      return false;
    }

    setIsSupabaseTesting(true);
    setSupabaseStatusMsg('Connecting to Supabase...');
    try {
      const client = window.supabase.createClient(url.trim(), key.trim());
      const { data, error } = await client.from('auctions').select('*').limit(1);
      if (error && error.code !== 'PGRST116') {
        if (error.message && error.message.includes('relation "public.auctions" does not exist')) {
          setSupabaseStatusMsg('Connected to Supabase! (Notice: Please run the SQL schema script to create tables).');
        } else {
          throw error;
        }
      } else {
        setSupabaseStatusMsg('✓ Connected to Supabase PostgreSQL & Realtime!');
        if (data && data.length > 0) {
          const auc = data[0];
          if (Number(auc.current_bid) > liveRef.current.currentPrice) {
            liveRef.current.currentPrice = Number(auc.current_bid);
            liveRef.current.highestSeq = Number(auc.seq_counter || 0);
            setCurrentPrice(Number(auc.current_bid));
            setHighestBidder(auc.highest_bidder || 'Supabase Genesis');
            setHighestSeq(Number(auc.seq_counter || 0));
          }
        }
      }

      setSupabaseClient(client);
      setIsSupabaseConnected(true);
      localStorage.setItem('synora_supabase_url', url.trim());
      localStorage.setItem('synora_supabase_key', key.trim());
      triggerSecToast('Connected to Supabase PostgreSQL Database', 'ok');
      return true;
    } catch (err) {
      console.error('Supabase connection failed:', err);
      setIsSupabaseConnected(false);
      setSupabaseStatusMsg('Connection failed: ' + (err.message || 'Check URL and anon key'));
      return false;
    } finally {
      setIsSupabaseTesting(false);
    }
  }, [triggerSecToast]);

  const disconnectSupabase = useCallback(() => {
    setSupabaseClient(null);
    setIsSupabaseConnected(false);
    localStorage.removeItem('synora_supabase_url');
    localStorage.removeItem('synora_supabase_key');
    setSupabaseStatusMsg('Disconnected from Supabase.');
    triggerSecToast('Disconnected from Supabase database. Local in-memory mode active.', 'warn');
  }, [triggerSecToast]);

  // Auto-connect if credentials exist in localStorage
  useEffect(() => {
    const savedUrl = localStorage.getItem('synora_supabase_url');
    const savedKey = localStorage.getItem('synora_supabase_key');
    if (savedUrl && savedKey) {
      connectSupabase(savedUrl, savedKey);
    }
  }, [connectSupabase]);

  // Realtime Supabase Channel Subscription
  useEffect(() => {
    if (!supabaseClient || !isSupabaseConnected) return;

    try {
      const channel = supabaseClient
        .channel('synora-realtime-bids')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'bids' }, payload => {
          const newBid = payload.new;
          if (newBid && newBid.accepted) {
            if (Number(newBid.sequence_no) > liveRef.current.highestSeq) {
              liveRef.current.highestSeq = Number(newBid.sequence_no);
              liveRef.current.currentPrice = Number(newBid.amount);
              setHighestSeq(Number(newBid.sequence_no));
              setCurrentPrice(Number(newBid.amount));
              setHighestBidder(newBid.bidder_name);
              flashPrice('success');
              playSound(true, false);
            }
          }
        })
        .subscribe();

      return () => {
        supabaseClient.removeChannel(channel);
      };
    } catch (e) {
      console.warn('Realtime channel error:', e);
    }
  }, [supabaseClient, isSupabaseConnected, flashPrice]);

  // ═══════════════════════════════════════════════════════════════════════
  // JSX RENDERING
  // ═══════════════════════════════════════════════════════════════════════
  return (
    <>
      {/* ── TOP STICKY HEADER WITH NAVIGATION BAR ── */}
      <header role="banner">
        <div className="header-inner">
          <div className="header-brand">
            <span className="brand-chip">EST. 2026</span>
            <div className="brand-text">
              <span className="brand-name">
                <span className="brand-biiiid">THE BIIIID</span>
              </span>
              <span className="brand-sub">FROM SYNORA • CONCURRENCY &amp; RELIEF PLATFORM</span>
            </div>
          </div>

          <div className="header-right">
            <div className={`sys-status ${strategy === 'naive' ? 'warning' : ''}`} aria-live="polite">
              <span className="pulse-dot" aria-hidden="true"></span>
              <span className="sys-status-text">{STRATEGY_DATA[strategy].statusLabel}</span>
            </div>
            <button
              className={`supabase-status-pill ${isSupabaseConnected ? 'connected' : ''}`}
              onClick={() => setIsSupabaseModalOpen(true)}
              title="Configure Supabase PostgreSQL database connection & Realtime sync"
            >
              <span className="supabase-dot"></span>
              <span>{isSupabaseConnected ? '⚡ Supabase DB: Live' : '🔌 Supabase DB'}</span>
            </button>
            <button
              className="btn btn-sm btn-ghost"
              onClick={resetSimulation}
              title="Reset auction state and stress metrics"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" />
              </svg>
              Reset Session
            </button>
          </div>
        </div>

        {/* Navigation Tier (Header Options) */}
        <div className="header-nav-row">
          <nav className="nav-tabs" role="tablist" aria-label="Main system views">
            <button
              className={`nav-tab ${activeTab === 'landing' ? 'active' : ''}`}
              onClick={() => setActiveTab('landing')}
              role="tab"
              aria-selected={activeTab === 'landing'}
            >
              <span>✨ Platform Hub</span>
              <span className="nav-tab-badge" style={{ background: 'rgba(56, 189, 248, 0.2)', color: 'var(--cyan)' }}>MAIN</span>
            </button>
            <button
              className={`nav-tab ${activeTab === 'auction' ? 'active' : ''}`}
              onClick={() => setActiveTab('auction')}
              role="tab"
              aria-selected={activeTab === 'auction'}
            >
              <span>🏛️ Live Auction Room</span>
            </button>
            <button
              className={`nav-tab ${activeTab === 'concurrency' ? 'active' : ''}`}
              onClick={() => setActiveTab('concurrency')}
              role="tab"
              aria-selected={activeTab === 'concurrency'}
            >
              <span>⚡ Concurrency Lab &amp; Stress</span>
              {invalidViolations > 0 && <span className="nav-tab-badge" style={{ background: '#fdf0f0', color: 'var(--rose)' }}>{invalidViolations} VIOLATIONS</span>}
            </button>
            <button
              className={`nav-tab ${activeTab === 'relief' ? 'active' : ''}`}
              onClick={() => setActiveTab('relief')}
              role="tab"
              aria-selected={activeTab === 'relief'}
            >
              <span>🚑 Relief Exchange</span>
              <span className="nav-tab-badge" style={{ background: '#edf7f1', color: 'var(--emerald)' }}>PUBLIC IMPACT</span>
            </button>
            <button
              className={`nav-tab ${activeTab === 'security' ? 'active' : ''}`}
              onClick={() => setActiveTab('security')}
              role="tab"
              aria-selected={activeTab === 'security'}
            >
              <span>🛡️ Security, RBAC &amp; Ledger</span>
              <span className="nav-tab-badge">IMMUTABLE</span>
            </button>
            <button
              className={`nav-tab ${activeTab === 'architecture' ? 'active' : ''}`}
              onClick={() => setActiveTab('architecture')}
              role="tab"
              aria-selected={activeTab === 'architecture'}
            >
              <span>📐 System Architecture</span>
            </button>
          </nav>

          <div className="nav-summary-pill">
            {activeTab === 'relief' ? (
              <>
                <span style={{ color: 'var(--rose)', fontWeight: 700 }}>REQ #REL-2026-0918:</span>
                <strong style={{ color: 'var(--emerald-dk)' }}>{formatINR(bestReliefOffer ? bestReliefOffer.totalCost : 960000)}</strong>
                <span style={{ color: 'var(--border-dark)' }}>•</span>
                <span>{formattedReliefTimer}</span>
              </>
            ) : (
              <>
                <span>LOT #SYN-9024:</span>
                <strong style={{ color: 'var(--blue)' }}>${currentPrice.toLocaleString()}</strong>
                <span style={{ color: 'var(--border-dark)' }}>•</span>
                <span>{formattedTimer}</span>
              </>
            )}
          </div>
        </div>
      </header>

      {/* ── CONTINUOUS KINETIC LIVE TICKER TAPE ── */}
      <div className="ticker-marquee-wrap" aria-hidden="true">
        <div className="ticker-marquee-content">
          <span className="ticker-item"><span className="pulse-dot"></span> <strong>LOT #SYN-9024:</strong> Rare Genesis Art Token #01</span>
          <span className="ticker-item" style={{ color: 'var(--cyan)' }}>⚡ <strong>PEAK CAPACITY:</strong> 5,000+ TPS Redis Lua Sequencer</span>
          <span className="ticker-item" style={{ color: 'var(--emerald)' }}>🛡️ <strong>ORDERING:</strong> Strict Monotonic Sequence &bull; Zero Violations</span>
          <span className="ticker-item" style={{ color: 'var(--amber)' }}>🚑 <strong>RELIEF EXCHANGE:</strong> Medical Cryo Oxygen Procurement Live</span>
          <span className="ticker-item" style={{ color: 'var(--purple)' }}>💾 <strong>PERSISTENCE:</strong> {isSupabaseConnected ? 'Live Supabase PostgreSQL Connected' : 'In-Memory Serialization Active'}</span>
          <span className="ticker-item">🔒 <strong>SECURITY:</strong> SHA-256 Tamper-Proof Audit Chain &bull; Rate Limited</span>

          {/* Loop repeat */}
          <span className="ticker-item"><span className="pulse-dot"></span> <strong>LOT #SYN-9024:</strong> Rare Genesis Art Token #01</span>
          <span className="ticker-item" style={{ color: 'var(--cyan)' }}>⚡ <strong>PEAK CAPACITY:</strong> 5,000+ TPS Redis Lua Sequencer</span>
          <span className="ticker-item" style={{ color: 'var(--emerald)' }}>🛡️ <strong>ORDERING:</strong> Strict Monotonic Sequence &bull; Zero Violations</span>
          <span className="ticker-item" style={{ color: 'var(--amber)' }}>🚑 <strong>RELIEF EXCHANGE:</strong> Medical Cryo Oxygen Procurement Live</span>
          <span className="ticker-item" style={{ color: 'var(--purple)' }}>💾 <strong>PERSISTENCE:</strong> {isSupabaseConnected ? 'Live Supabase PostgreSQL Connected' : 'In-Memory Serialization Active'}</span>
          <span className="ticker-item">🔒 <strong>SECURITY:</strong> SHA-256 Tamper-Proof Audit Chain &bull; Rate Limited</span>
        </div>
      </div>


      {/* Global Toast Alert */}
      {secToast.visible && (
        <div style={{ maxWidth: '1500px', margin: '1rem auto 0', padding: '0 1.75rem' }}>
          <div className={`sec-alert-toast sec-alert-${secToast.type}`} role="alert">
            {secToast.text}
          </div>
        </div>
      )}

            {/* ═══════════════════════════════════════════════════════════════
          VIEW 0: ANIMATED LANDING PAGE & PLATFORM HUB
      ═══════════════════════════════════════════════════════════════ */}
      {activeTab === 'landing' && (
        <div className="landing-view-container">
          
          {/* Animated Ambient Floating Orbs */}
          <div className="landing-ambient-orbs" aria-hidden="true">
            <div className="landing-orb orb-1"></div>
            <div className="landing-orb orb-2"></div>
            <div className="landing-orb orb-3"></div>
          </div>

          {/* Hero Section */}
          <section className="landing-hero">
            <div className="landing-hero-chip">
              <span className="pulse-dot"></span>
              <span>ENTERPRISE HIGH-CONCURRENCY AUCTION ARCHITECTURE</span>
            </div>

            <h1 className="landing-hero-title">
              THE BIIIID <span className="title-gradient">FROM SYNORA</span>
            </h1>

            <p className="landing-hero-sub">
              Experience ultra-low latency monotonic bid sequencing, sub-millisecond lock-free execution, and automated public emergency relief procurement under 5,000+ TPS concurrent load.
            </p>

            <div className="landing-cta-row">
              <button className="btn btn-primary btn-landing" onClick={() => setActiveTab('auction')}>
                <span>🏛️ Launch Live Auction Room</span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
              </button>
              <button className="btn btn-secondary btn-landing" onClick={() => setActiveTab('concurrency')}>
                <span>⚡ 5,000 TPS Stress Lab</span>
              </button>
              <button className="btn btn-ghost btn-landing" onClick={() => setActiveTab('relief')}>
                <span>🚑 Emergency Relief Exchange</span>
              </button>
            </div>
          </section>

          {/* Live System Highlights / Live Radar Ribbon */}
          <div className="landing-ribbon">
            <div className="ribbon-stat">
              <span className="ribbon-label">ACTIVE ENGINE</span>
              <strong className="ribbon-val" style={{ color: 'var(--emerald)' }}>{STRATEGY_DATA[strategy].title}</strong>
            </div>
            <div className="ribbon-stat">
              <span className="ribbon-label">LIVE PRICE</span>
              <strong className="ribbon-val mono" style={{ color: 'var(--cyan)' }}>${currentPrice.toLocaleString()}</strong>
            </div>
            <div className="ribbon-stat">
              <span className="ribbon-label">AUTHORITATIVE SEQUENCE</span>
              <strong className="ribbon-val mono">#{highestSeq}</strong>
            </div>
            <div className="ribbon-stat">
              <span className="ribbon-label">DATABASE SYNC</span>
              <strong className="ribbon-val" style={{ color: isSupabaseConnected ? 'var(--emerald)' : 'var(--text-mid)' }}>
                {isSupabaseConnected ? '🟢 Supabase PostgreSQL' : '⚪ High-Speed In-Memory'}
              </strong>
            </div>
          </div>

          {/* Interactive Feature Bento Grid */}
          <section className="landing-bento-grid">
            
            {/* Bento Card 1: Live Auction Room */}
            <div className="bento-card bento-card-hover" onClick={() => setActiveTab('auction')}>
              <div className="bento-top">
                <div className="bento-icon" style={{ background: 'rgba(99, 102, 241, 0.15)', borderColor: 'rgba(99, 102, 241, 0.4)', color: 'var(--blue)' }}>🏛️</div>
                <span className="bento-badge" style={{ background: 'rgba(99, 102, 241, 0.2)', color: '#c7d2fe' }}>FORWARD AUCTION</span>
              </div>
              <h3>Live Luxury Auction Room</h3>
              <p>
                Authoritative real-time bidding on Rare Genesis Art Token #01. Features single-writer serialization, anti-sniping dynamic timer extensions, and live price flashes.
              </p>
              <div className="bento-footer">
                <span>Enter Auction Floor →</span>
              </div>
            </div>

            {/* Bento Card 2: Concurrency & Stress Lab */}
            <div className="bento-card bento-card-hover" onClick={() => setActiveTab('concurrency')}>
              <div className="bento-top">
                <div className="bento-icon" style={{ background: 'rgba(56, 189, 248, 0.15)', borderColor: 'rgba(56, 189, 248, 0.4)', color: 'var(--cyan)' }}>⚡</div>
                <span className="bento-badge" style={{ background: 'rgba(56, 189, 248, 0.2)', color: '#bae6fd' }}>5,000 TPS ENGINE</span>
              </div>
              <h3>Concurrency &amp; Stress Testing Lab</h3>
              <p>
                Live head-to-head comparison of Naive Unsynchronized, Pessimistic Locking, Optimistic CAS, and Redis Lua Atomic Sequencer with real-time canvas throughput graphs.
              </p>
              <div className="bento-footer">
                <span>Run 5,000 Burst Benchmark →</span>
              </div>
            </div>

            {/* Bento Card 3: Relief Exchange */}
            <div className="bento-card bento-card-hover" onClick={() => setActiveTab('relief')}>
              <div className="bento-top">
                <div className="bento-icon" style={{ background: 'rgba(16, 185, 129, 0.15)', borderColor: 'rgba(16, 185, 129, 0.4)', color: 'var(--emerald)' }}>🚑</div>
                <span className="bento-badge" style={{ background: 'rgba(16, 185, 129, 0.2)', color: '#a7f3d0' }}>REVERSE AUCTION</span>
              </div>
              <h3>Emergency Relief Exchange</h3>
              <p>
                Disaster &amp; healthcare emergency procurement mode. Verified suppliers submit bids meeting strict delivery deadlines, ISO certifications, and budget caps with atomic tie-breaking.
              </p>
              <div className="bento-footer">
                <span>Explore Emergency Mode →</span>
              </div>
            </div>

            {/* Bento Card 4: Security & Audit Ledger */}
            <div className="bento-card bento-card-hover" onClick={() => setActiveTab('security')}>
              <div className="bento-top">
                <div className="bento-icon" style={{ background: 'rgba(168, 85, 247, 0.15)', borderColor: 'rgba(168, 85, 247, 0.4)', color: 'var(--purple)' }}>🛡️</div>
                <span className="bento-badge" style={{ background: 'rgba(168, 85, 247, 0.2)', color: '#e9d5ff' }}>ZERO-TRUST</span>
              </div>
              <h3>Security, RBAC &amp; Immutable Ledger</h3>
              <p>
                Role-based access guards (Bidder, Viewer, Admin), token-bucket rate limiting against DDoS attacks, request idempotency caching, and tamper-proof sequence logs.
              </p>
              <div className="bento-footer">
                <span>Inspect Audit Ledger →</span>
              </div>
            </div>

          </section>

        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          VIEW 1: LIVE LUXURY AUCTION ROOM (FORWARD AUCTION)
      ═══════════════════════════════════════════════════════════════ */}
      {activeTab === 'auction' && (
        <div className="view-container">
          
          {/* Dedicated Spacious Feature Header */}
          <div className="feature-hero-banner">
            <div className="feature-title-group">
              <h2>🏛️ Official Live Auction Room</h2>
              <p>Lot #SYN-9024: Rare Genesis Art Token #01 • Powered by Single-Writer Monotonic Serialization</p>
            </div>
            <div className="feature-meta-pills">
              <span className="feature-pill active-pill">● LIVE IN BIDDING</span>
              <span className="feature-pill mono">LOT: SYN-9024</span>
              <span className="feature-pill" style={{ color: 'var(--cyan)' }}>RESERVE: $10,000 (MET)</span>
            </div>
          </div>

          {snipeAlert && (
            <div className="snipe-alert" role="alert">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
              <strong>Anti-Sniping Protection Triggered:</strong> A verified bid was accepted in the closing seconds. The auction timer has been extended by +20 seconds.
            </div>
          )}

          <div className="auction-room-grid">
            {/* Left Column: Lot Presentation & Provenance */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
              <div className="lot-hero-card">
                <div className="lot-badge-row">
                  <div className="lot-badge-pill">
                    <span>LOT 1 OF 1</span>
                    <span style={{ color: 'var(--border-dark)' }}>•</span>
                    <span className="mono">ID: SYN-9024-ETH</span>
                  </div>
                  <div className="reserve-met-badge">
                    <span>✓</span> RESERVE MET ($10,000)
                  </div>
                </div>

                <div className="lot-stage">
                  <div className="lot-live-indicator">
                    <span className="pulse-dot" style={{ background: 'var(--rose)', boxShadow: 'none' }}></span>
                    <span>LIVE LOT IN BIDDING</span>
                  </div>
                  <div className="lot-stage-icon">💎</div>
                </div>

                <div className="lot-info-header">
                  <h3>Rare Genesis Art Token #01</h3>
                  <p>
                    From the Genesis Master Archive. Programmatic digital asset engineered with deterministic visual properties and backed by cryptographic proof of custody.
                  </p>
                </div>

                <div className="provenance-grid">
                  <div className="provenance-item">
                    <span className="prov-label">Provenance</span>
                    <span className="prov-val">Genesis Treasury</span>
                  </div>
                  <div className="provenance-item">
                    <span className="prov-label">Contract</span>
                    <span className="prov-val mono">0x9024…B3F</span>
                  </div>
                  <div className="provenance-item">
                    <span className="prov-label">Estimate</span>
                    <span className="prov-val">$10k – $50k</span>
                  </div>
                  <div className="provenance-item">
                    <span className="prov-label">Custody</span>
                    <span className="prov-val">Vault Secured</span>
                  </div>
                </div>
              </div>

              {/* Real-time Bid Stream inside Auction Room */}
              <div className="stream-card">
                <div className="card-header" style={{ marginBottom: '0.6rem' }}>
                  <span className="card-label">Recent Authorized Bids</span>
                  <span className="text-muted text-xs">Live room feed</span>
                </div>
                {auditLog.length === 0 ? (
                  <p className="text-muted text-xs" style={{ padding: '1rem 0' }}>
                    No bids recorded yet in this session. Submit a bid using the console on the right.
                  </p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', maxHeight: '180px', overflowY: 'auto' }}>
                    {auditLog.slice(0, 6).map((item) => (
                      <div key={item.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.45rem 0.65rem', background: 'var(--bg-surface)', borderRadius: 'var(--r-sm)', fontSize: '0.78rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                          <span className="mono text-lo">#{item.seq}</span>
                          <span style={{ fontWeight: 600, color: 'var(--cyan)' }}>{item.bidder}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <span className="mono" style={{ fontWeight: 700 }}>${item.offered.toLocaleString()}</span>
                          <span className={`audit-tag ${item.status === 'ACCEPTED' ? 'tag-accepted' : item.status === 'VIOLATION' ? 'tag-violation' : 'tag-rejected'}`}>
                            {item.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: Bidding Terminal Console */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
              <div className="bidding-console-card">
                <div className="console-top-row">
                  <span className="card-label">Bidding Terminal</span>
                  <div className={`live-countdown-clock ${timeLeftSec <= 15 ? 'urgent' : ''}`} aria-live="polite">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
                    </svg>
                    <span>{formattedTimer}</span>
                  </div>
                </div>

                <div className={`grand-price-box ${priceFlash ? `flash-${priceFlash}` : ''}`}>
                  <div className="price-label">Current Highest Authoritative Bid</div>
                  <div className="grand-price-amount">${currentPrice.toLocaleString()}</div>
                  <div className="price-meta" style={{ marginTop: '0.35rem' }}>
                    <span>Held by <strong className="text-cyan">{highestBidder}</strong></span>
                    <span className="mono text-muted text-xs">Seq #{highestSeq}</span>
                  </div>
                </div>

                <div className="bidding-action-box">
                  <div className="bid-hints">
                    <span>Next Minimum Bid: <strong className="mono">${(currentPrice + minIncrement).toLocaleString()}</strong></span>
                    <span className="text-muted text-xs">Increment: <span className="mono">+${minIncrement.toLocaleString()}</span></span>
                  </div>

                  <div className="action-input-row">
                    <input
                      type="number"
                      className="action-bid-input"
                      value={manualBidInput}
                      step={minIncrement}
                      min={currentPrice + minIncrement}
                      onChange={(e) => setManualBidInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handlePlaceManualBid()}
                      disabled={currentRole !== 'bidder'}
                      placeholder="Enter amount"
                      aria-label="Custom bid amount"
                    />
                    <button
                      className="btn btn-primary btn-large-bid"
                      onClick={handlePlaceManualBid}
                      disabled={currentRole !== 'bidder'}
                    >
                      Place Bid
                    </button>
                  </div>

                  <div className="quick-increments-grid">
                    <button className="btn-increment" onClick={() => handleQuickIncrement(250)} disabled={currentRole !== 'bidder'}>
                      +$250
                    </button>
                    <button className="btn-increment" onClick={() => handleQuickIncrement(500)} disabled={currentRole !== 'bidder'}>
                      +$500
                    </button>
                    <button className="btn-increment" onClick={() => handleQuickIncrement(1000)} disabled={currentRole !== 'bidder'}>
                      +$1,000
                    </button>
                    <button className="btn-increment" onClick={() => handleQuickIncrement(2500)} disabled={currentRole !== 'bidder'}>
                      +$2,500
                    </button>
                  </div>

                  {currentRole !== 'bidder' && (
                    <div className="bid-locked-msg">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                      </svg>
                      Submission locked: Your active role is <strong>{USER_ROLES[currentRole].role}</strong>. Only <strong>Bidder</strong> accounts can submit authoritative bids.
                    </div>
                  )}

                  <div className="user-status-card">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                      <div className="auth-avatar" style={{ width: '28px', height: '28px', fontSize: '0.65rem' }}>
                        {USER_ROLES[currentRole].avatar}
                      </div>
                      <div>
                        <div style={{ fontSize: '0.8rem', fontWeight: 600 }}>{USER_ROLES[currentRole].name}</div>
                        <div className="mono text-lo text-xs">{USER_ROLES[currentRole].id}</div>
                      </div>
                    </div>
                    <span className={`auth-role-badge auth-role-${currentRole}`} style={{ fontSize: '0.65rem' }}>
                      {USER_ROLES[currentRole].role} VIP
                    </span>
                  </div>

                  <div style={{ background: '#edf7f1', border: '1px solid #a8d4ba', borderRadius: 'var(--r-md)', padding: '0.85rem 1rem', fontSize: '0.78rem', color: 'var(--emerald)' }}>
                    <div style={{ fontWeight: 700, marginBottom: '0.2rem' }}>⚡ Atomic Sequencer Guard Active</div>
                    Every submitted bid is sequenced in-memory before PostgreSQL outbox persistence. Zero out-of-order wins guaranteed.
                  </div>

                  <div style={{ marginTop: '0.5rem', textAlign: 'center' }}>
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => setActiveTab('relief')}
                      style={{ width: '100%', justifyContent: 'center' }}
                    >
                      🚑 Need public emergency procurement? Open Relief Exchange Mode →
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          VIEW 2: CONCURRENCY LAB & STRESS TEST
      ═══════════════════════════════════════════════════════════════ */}
      {activeTab === 'concurrency' && (
        <div className="view-container">
          
          <div className="view-header">
            <div className="view-title-group">
              <h2>High-Concurrency Stress &amp; Strategy Lab</h2>
              <p>Simulate up to 5,000 concurrent bids/sec across Naive, Pessimistic, Optimistic, and Atomic architectures.</p>
            </div>
            <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
              <span className={`stress-status-pill ${stressStatus.state}`}>{stressStatus.text}</span>
            </div>
          </div>

          {/* Engine Selector Cards */}
          <article className="card">
            <header className="card-header">
              <span className="card-label">1. Choose Concurrency Engine</span>
              <span className="text-muted text-xs">Switch on the fly to observe latency &amp; violations</span>
            </header>

            <div className="strategy-grid" role="radiogroup" aria-label="Select concurrency strategy">
              {Object.values(STRATEGY_DATA).map((item) => (
                <div
                  key={item.id}
                  className={`strategy-card ${item.cardClass} ${strategy === item.id ? 'active' : ''}`}
                  onClick={() => setStrategy(item.id)}
                  role="radio"
                  aria-checked={strategy === item.id}
                  tabIndex={0}
                >
                  <div className={`sc-badge ${item.badgeClass}`}>{item.badge}</div>
                  <div className={`sc-icon ${item.iconClass}`}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                    </svg>
                  </div>
                  <div className="sc-name">{item.title}</div>
                  <div className="sc-tech">{item.tech}</div>
                  <div className="sc-desc">{item.desc}</div>
                  <div className="sc-tradeoff">
                    {item.tradeoffs.map((t, idx) => (
                      <span key={idx} className={`tc ${t.type}`}>{t.text}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </article>

          {/* Strategy Deep Dive Info */}
          <article className="card card-strategy-info">
            <header className="card-header">
              <span className="card-label">Active Engine Internal Mechanics</span>
            </header>
            <div className="strategy-explanation">
              {STRATEGY_DATA[strategy].explanation}
            </div>
          </article>

          {/* Load Spike Generator */}
          <article className="card">
            <header className="card-header">
              <span className="card-label">2. Concurrent Load Spike Generator</span>
              <span className="text-muted text-xs">Simulated bot trading activity</span>
            </header>

            <div className="stress-body">
              <div className="burst-presets">
                <span className="control-label">Spike Volume Preset</span>
                <div className="preset-row">
                  {[500, 1000, 2500, 5000].map(vol => (
                    <button
                      key={vol}
                      className={`preset-btn ${burstVolume === vol ? 'preset-btn-active' : ''}`}
                      onClick={() => setBurstVolume(vol)}
                    >
                      {vol.toLocaleString()} Bids
                      {vol === 5000 && <span className="preset-tag">PEAK SPIKE</span>}
                    </button>
                  ))}
                </div>
              </div>

              <div className="stress-controls-row">
                <div className="control-group">
                  <label className="control-label">Concurrent Virtual Users (VUs)</label>
                  <select
                    className="select-input"
                    value={vuCount}
                    onChange={(e) => setVuCount(parseInt(e.target.value, 10))}
                  >
                    <option value="25">25 VUs (Moderate)</option>
                    <option value="100">100 VUs (High Contention)</option>
                    <option value="500">500 VUs (Extreme Hot-Key Spike)</option>
                  </select>
                </div>

                <div className="stress-action-row">
                  <button
                    className="btn btn-danger btn-fire"
                    onClick={() => runSpikeBurst(burstVolume, vuCount)}
                    disabled={isBursting}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
                    </svg>
                    {isBursting ? 'Spiking System…' : `Fire ${burstVolume.toLocaleString()} Bids`}
                  </button>

                  <button
                    className={`btn ${isContinuous ? 'btn-danger' : 'btn-secondary'}`}
                    onClick={() => setIsContinuous(!isContinuous)}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polygon points="5 3 19 12 5 21 5 3" />
                    </svg>
                    {isContinuous ? 'Halt Continuous' : 'Continuous ~1,500/s'}
                  </button>
                </div>
              </div>

              {isBursting && (
                <div className="burst-progress">
                  <div className="burst-progress-bar" style={{ width: `${burstProgress}%` }}></div>
                </div>
              )}
            </div>
          </article>

          {/* Telemetry & Chart Grid */}
          <article className="card">
            <header className="card-header">
              <span className="card-label">3. Live Telemetry &amp; Verification Chart</span>
              <span className="text-muted text-xs">Continuous 400ms sampling rate</span>
            </header>

            <div className="kpi-grid" role="list">
              <div className="kpi-card" role="listitem">
                <div className="kpi-label">Total Ingested</div>
                <div className="kpi-val mono">{totalIngested.toLocaleString()}</div>
                <div className="kpi-sub">{currentTps.toLocaleString()} req/s</div>
              </div>
              <div className="kpi-card kpi-card-emerald" role="listitem">
                <div className="kpi-label">Accepted</div>
                <div className="kpi-val mono val-emerald">{validAccepted.toLocaleString()}</div>
                <div className="kpi-sub">Monotonic order</div>
              </div>
              <div className="kpi-card kpi-card-amber" role="listitem">
                <div className="kpi-label">Rejected / Stale</div>
                <div className="kpi-val mono val-amber">{staleRejected.toLocaleString()}</div>
                <div className="kpi-sub">CAS / increment fail</div>
              </div>
              <div className={`kpi-card ${invalidViolations > 0 ? 'kpi-card-rose' : ''}`} role="listitem">
                <div className="kpi-label">Race Violations</div>
                <div className="kpi-val mono val-rose">{invalidViolations.toLocaleString()}</div>
                <div className="kpi-sub">Rate: {violationRate}</div>
              </div>
            </div>

            <div className="latency-row">
              <div className="latency-box">
                <span className="latency-label">Mean Latency</span>
                <span className="latency-val mono val-cyan">{meanLatency} ms</span>
              </div>
              <div className="latency-box">
                <span className="latency-label">P95 Latency</span>
                <span className="latency-val mono">{p95Latency} ms</span>
              </div>
              <div className="latency-box">
                <span className="latency-label">Lock Wait Time</span>
                <span className="latency-val mono val-amber">{avgLockTime} ms</span>
              </div>
            </div>

            <div className="chart-wrap">
              <div className="chart-legend">
                <span className="legend-dot legend-cyan"></span><span>Throughput (TPS)</span>
                <span className="legend-dot legend-amber" style={{ marginLeft: '1.25rem' }}></span><span>Avg Latency (ms)</span>
              </div>
              <div className="chart-container">
                <canvas ref={canvasRef} aria-label="Real-time performance canvas chart"></canvas>
              </div>
            </div>

            <div className="checklist-banner">
              <div className="checklist-heading">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                System Evaluation Acceptance Criteria
                <span className="mono text-xs" style={{ marginLeft: 'auto' }}>
                  {[invalidViolations === 0, parseFloat(p95Latency) < 50, strategy !== 'naive'].filter(Boolean).length} / 3 MET
                </span>
              </div>
              <div className="checklist-items">
                <div className="chk-item">
                  <span className={`chk-icon ${invalidViolations === 0 ? 'pass' : 'fail'}`}>
                    {invalidViolations === 0 ? '✓' : '✕'}
                  </span>
                  <span><strong>Linearizable Serialization:</strong> Zero out-of-order acceptances or race condition overrides under 5,000 req/s.</span>
                </div>
                <div className="chk-item">
                  <span className={`chk-icon ${parseFloat(p95Latency) < 50 ? 'pass' : 'fail'}`}>
                    {parseFloat(p95Latency) < 50 ? '✓' : '✕'}
                  </span>
                  <span><strong>Broadcast Latency:</strong> P95 fanout kept under 50ms (in Atomic Sequencer).</span>
                </div>
                <div className="chk-item">
                  <span className={`chk-icon ${strategy !== 'naive' ? 'pass' : 'fail'}`}>
                    {strategy !== 'naive' ? '✓' : '✕'}
                  </span>
                  <span><strong>Graceful Contention Degradation:</strong> Non-winning concurrent bids fail fast without corrupting system state.</span>
                </div>
              </div>
            </div>
          </article>

        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          VIEW 3: SYNORA RELIEF EXCHANGE — EMERGENCY PROCUREMENT MODE
      ═══════════════════════════════════════════════════════════════ */}
      {activeTab === 'relief' && (
        <div className="view-container">
          
          <div className="view-header">
            <div className="view-title-group">
              <h2>SYNORA Relief Exchange — Emergency Procurement Mode</h2>
              <p>Reverse auction protocol: verified suppliers submit competitive offers to fulfill urgent public emergencies under strict atomic compliance.</p>
            </div>
            <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
              <span className="relief-tag-urgent">
                <span className="pulse-dot" style={{ background: 'var(--rose)' }}></span>
                Priority Emergency
              </span>
              <span className="relief-status-chip">
                <span>✓</span> Verified Suppliers Only
              </span>
            </div>
          </div>

          {/* Section 1: Emergency Request Hero */}
          <div className="relief-hero-card">
            <div className="relief-badge-row">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <span className="brand-chip" style={{ background: 'var(--rose)', borderColor: 'var(--rose)' }}>EMERGENCY LOT</span>
                <span className="mono" style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-mid)' }}>REQUEST ID: REL-2026-0918</span>
              </div>
              <div className="relief-status-chip">
                OPEN FOR VERIFIED SUPPLIERS
              </div>
            </div>

            <div className="relief-title-group">
              <h3>
                <span>🚑</span> Emergency Oxygen Supply Request
              </h3>
              <p className="relief-microcopy">
                SYNORA applies its high-concurrency atomic sequencing engine to transparent emergency procurement, enabling public institutions to choose the best eligible supplier under extreme demand.
              </p>
            </div>

            <div className="relief-specs-grid">
              <div className="relief-spec-item">
                <span className="relief-spec-label">Procuring Buyer</span>
                <span className="relief-spec-val">City Emergency Hospital</span>
              </div>
              <div className="relief-spec-item">
                <span className="relief-spec-label">Required Quantity</span>
                <span className="relief-spec-val">500 Oxygen Cylinders</span>
              </div>
              <div className="relief-spec-item">
                <span className="relief-spec-label">Max Delivery Deadline</span>
                <span className="relief-spec-val highlight-time">≤ 4.0 Hours</span>
              </div>
              <div className="relief-spec-item">
                <span className="relief-spec-label">Max Budget Ceiling</span>
                <span className="relief-spec-val highlight-budget">₹12,00,000 Cap</span>
              </div>
              <div className="relief-spec-item">
                <span className="relief-spec-label">Urgency Window</span>
                <span className="relief-spec-val mono" style={{ color: 'var(--rose)' }}>{formattedReliefTimer}</span>
              </div>
            </div>
          </div>

          {/* 2-Column Grid: Console & Best Offer */}
          <div className="auction-room-grid">
            
            {/* Left Column: Reverse Auction Offer Console */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div className="offer-console-card">
                <div className="card-header" style={{ marginBottom: '0.2rem' }}>
                  <span className="card-label">Submit Verified Supplier Offer</span>
                  <span className="text-muted text-xs">Reverse auction bidding</span>
                </div>

                <p style={{ fontSize: '0.78rem', color: 'var(--text-mid)', lineHeight: 1.5 }}>
                  <strong>Important:</strong> Lower price alone does not win. An offer must satisfy every mandatory emergency requirement:
                  quantity ≥ 500 cylinders, delivery ≤ 4.0 hours, verified medical certification, and total ≤ ₹12,00,000.
                </p>

                <div className="offer-form-grid">
                  <div className="offer-field-group">
                    <label className="offer-field-label">Supplier Entity Name</label>
                    <input
                      type="text"
                      className="offer-input"
                      value={formSupplier}
                      onChange={(e) => setFormSupplier(e.target.value)}
                      placeholder="Supplier Name"
                    />
                  </div>

                  <div className="offer-field-group">
                    <label className="offer-field-label">Price / Cyl (₹)</label>
                    <input
                      type="number"
                      className="offer-input"
                      value={formPrice}
                      step="50"
                      onChange={(e) => setFormPrice(e.target.value)}
                    />
                  </div>

                  <div className="offer-field-group">
                    <label className="offer-field-label">Available Quantity</label>
                    <input
                      type="number"
                      className="offer-input"
                      value={formQty}
                      step="50"
                      onChange={(e) => setFormQty(e.target.value)}
                    />
                  </div>

                  <div className="offer-field-group">
                    <label className="offer-field-label">Delivery (Hours)</label>
                    <input
                      type="number"
                      className="offer-input"
                      value={formDeliveryHours}
                      step="0.5"
                      onChange={(e) => setFormDeliveryHours(e.target.value)}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', paddingTop: '0.5rem', borderTop: '1px solid var(--border-light)' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}>
                    <input
                      type="checkbox"
                      checked={formCertified}
                      onChange={(e) => setFormCertified(e.target.checked)}
                      style={{ width: '16px', height: '16px', accentColor: 'var(--emerald)' }}
                    />
                    <span>Medical-Grade Certified Quality (ISO 13485 compliant)</span>
                  </label>

                  <button
                    className="btn btn-primary"
                    onClick={() => {
                      submitReliefOffer({
                        supplier: formSupplier,
                        pricePerUnit: parseFloat(formPrice),
                        quantity: parseFloat(formQty),
                        deliveryHours: parseFloat(formDeliveryHours),
                        certified: formCertified
                      });
                    }}
                  >
                    Submit Offer to Sequencer
                  </button>
                </div>

                {/* Quick Test Offers Panel */}
                <div className="quick-offers-panel">
                  <div className="quick-offers-title">Quick-Test Realistic Supplier Offers</div>
                  <div className="quick-offers-grid">
                    <button
                      className="btn-quick-offer"
                      onClick={() => submitReliefOffer({
                        supplier: 'Apex Medical Gas',
                        pricePerUnit: 1920,
                        quantity: 500,
                        deliveryHours: 2.5,
                        certified: true
                      })}
                    >
                      <div className="quick-offer-header">
                        <span>Apex Medical Gas</span>
                        <span style={{ color: 'var(--emerald)' }}>ELIGIBLE</span>
                      </div>
                      <div className="quick-offer-meta">₹1,920/cyl • 500 qty • 2.5h • Certified (₹9,60,000)</div>
                    </button>

                    <button
                      className="btn-quick-offer"
                      onClick={() => submitReliefOffer({
                        supplier: 'QuickOxygen Express',
                        pricePerUnit: 1650,
                        quantity: 350,
                        deliveryHours: 1.5,
                        certified: true
                      })}
                    >
                      <div className="quick-offer-header">
                        <span>QuickOxygen Express</span>
                        <span style={{ color: 'var(--rose)' }}>REJECTED</span>
                      </div>
                      <div className="quick-offer-meta">₹1,650/cyl • 350 qty • 1.5h • Insufficient Qty (350 &lt; 500)</div>
                    </button>

                    <button
                      className="btn-quick-offer"
                      onClick={() => submitReliefOffer({
                        supplier: 'Metro Cryo Logistics',
                        pricePerUnit: 1750,
                        quantity: 600,
                        deliveryHours: 5.5,
                        certified: true
                      })}
                    >
                      <div className="quick-offer-header">
                        <span>Metro Cryo Logistics</span>
                        <span style={{ color: 'var(--rose)' }}>REJECTED</span>
                      </div>
                      <div className="quick-offer-meta">₹1,750/cyl • 600 qty • 5.5h • Missed Deadline (5.5h &gt; 4h)</div>
                    </button>

                    <button
                      className="btn-quick-offer"
                      onClick={() => submitReliefOffer({
                        supplier: 'Budget Air Solutions',
                        pricePerUnit: 1400,
                        quantity: 500,
                        deliveryHours: 2.0,
                        certified: false
                      })}
                    >
                      <div className="quick-offer-header">
                        <span>Budget Air Solutions</span>
                        <span style={{ color: 'var(--rose)' }}>REJECTED</span>
                      </div>
                      <div className="quick-offer-meta">₹1,400/cyl • 500 qty • 2.0h • Uncertified Medical Grade</div>
                    </button>

                    <button
                      className="btn-quick-offer"
                      onClick={() => submitReliefOffer({
                        supplier: 'Global MedEx Imports',
                        pricePerUnit: 2500,
                        quantity: 500,
                        deliveryHours: 3.0,
                        certified: true
                      })}
                    >
                      <div className="quick-offer-header">
                        <span>Global MedEx Imports</span>
                        <span style={{ color: 'var(--rose)' }}>REJECTED</span>
                      </div>
                      <div className="quick-offer-meta">₹2,500/cyl • 500 qty • 3.0h • Over Budget (₹12,50,000 &gt; ₹12L)</div>
                    </button>

                    <button
                      className="btn-quick-offer"
                      onClick={() => submitReliefOffer({
                        supplier: 'LifeLine Healthcare Cryo',
                        pricePerUnit: 1820,
                        quantity: 500,
                        deliveryHours: 2.8,
                        certified: true
                      })}
                    >
                      <div className="quick-offer-header">
                        <span>LifeLine Healthcare Cryo</span>
                        <span style={{ color: 'var(--emerald)' }}>BEST ELIGIBLE ★</span>
                      </div>
                      <div className="quick-offer-meta">₹1,820/cyl • 500 qty • 2.8h • Certified (₹9,10,000)</div>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Best Eligible Offer & Formal Award */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              
              {/* Section 3: Best Eligible Offer Panel */}
              <div className="best-offer-card">
                <div className="card-header" style={{ marginBottom: '0.2rem' }}>
                  <span className="card-label">Currently Leading Eligible Supplier</span>
                  <span className="relief-tag-eligible">AUTHORITATIVE WINNER</span>
                </div>

                {bestReliefOffer ? (
                  <>
                    <div className="best-offer-hero">
                      <div className="best-offer-supplier-info">
                        <div className="best-offer-name">
                          <span>{bestReliefOffer.supplier}</span>
                          <span className="best-offer-badge">BEST VALUE</span>
                        </div>
                        <div className="mono text-lo text-xs">
                          Sequence #{bestReliefOffer.seq} • Timestamp: {bestReliefOffer.timestamp}
                        </div>
                      </div>

                      <div className="best-offer-cost-display">
                        <span className="prov-label">Total Procured Cost</span>
                        <span className="best-total-amount">{formatINR(bestReliefOffer.totalCost)}</span>
                        <span className="mono text-lo text-xs">₹{bestReliefOffer.pricePerUnit.toLocaleString()} / cylinder</span>
                      </div>
                    </div>

                    <div className="provenance-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
                      <div className="provenance-item">
                        <span className="prov-label">Fulfillment</span>
                        <span className="prov-val">{bestReliefOffer.quantity} Cylinders</span>
                      </div>
                      <div className="provenance-item">
                        <span className="prov-label">Delivery Commitment</span>
                        <span className="prov-val">{bestReliefOffer.deliveryHours} Hours (Target ≤4h)</span>
                      </div>
                      <div className="provenance-item">
                        <span className="prov-label">Quality Status</span>
                        <span className="prov-val" style={{ color: 'var(--emerald)' }}>✓ Medical Certified</span>
                      </div>
                    </div>

                    <div className="savings-banner">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span>💰</span>
                        <span>
                          <strong>{formatINR(Math.max(0, 1200000 - bestReliefOffer.totalCost))}</strong> public funds saved
                        </span>
                      </div>
                      <span className="mono text-xs">
                        ({((Math.max(0, 1200000 - bestReliefOffer.totalCost) / 1200000) * 100).toFixed(1)}% under emergency budget cap)
                      </span>
                    </div>

                    {!isContractAwarded ? (
                      <button
                        className="btn btn-primary"
                        onClick={awardReliefContract}
                        style={{ width: '100%', justifyContent: 'center', padding: '0.85rem' }}
                      >
                        ✓ Finalize &amp; Award Emergency Contract
                      </button>
                    ) : (
                      <div style={{ background: '#edf7f1', border: '1.5px solid #10b981', borderRadius: 'var(--r-md)', padding: '0.9rem 1.1rem', color: 'var(--emerald-dk)', fontWeight: 700, textAlign: 'center' }}>
                        🎉 Emergency Contract Awarded &amp; Sealed in Ledger
                      </div>
                    )}
                  </>
                ) : (
                  <p className="text-muted text-xs">No eligible offers received yet. Submit an offer to evaluate.</p>
                )}
              </div>

              {/* Section 6: Transparent Award Summary Card */}
              {isContractAwarded && bestReliefOffer && (
                <div className="contract-award-card">
                  <div className="contract-award-header">
                    <div>
                      <div style={{ fontSize: '0.68rem', fontWeight: 800, color: 'var(--emerald)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                        OFFICIAL PUBLIC PROCUREMENT NOTICE
                      </div>
                      <h4 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-hi)', marginTop: '0.2rem' }}>
                        Emergency Contract Awarded
                      </h4>
                    </div>
                    <span className="relief-tag-awarded">CONTRACT SEALED</span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.85rem' }}>
                    <div>
                      <span className="prov-label">Winning Supplier</span>
                      <div style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-hi)' }}>{bestReliefOffer.supplier}</div>
                    </div>
                    <div>
                      <span className="prov-label">Total Awarded Value</span>
                      <div className="mono" style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--emerald)' }}>{formatINR(bestReliefOffer.totalCost)}</div>
                    </div>
                  </div>

                  <div className="contract-verified-grid">
                    <div className="contract-req-item">
                      <span style={{ color: 'var(--emerald)', fontWeight: 800 }}>✓</span>
                      <span>500 Medical Oxygen Cylinders Committed</span>
                    </div>
                    <div className="contract-req-item">
                      <span style={{ color: 'var(--emerald)', fontWeight: 800 }}>✓</span>
                      <span>{bestReliefOffer.deliveryHours}h Delivery (Within 4.0h Deadline)</span>
                    </div>
                    <div className="contract-req-item">
                      <span style={{ color: 'var(--emerald)', fontWeight: 800 }}>✓</span>
                      <span>Medical-Grade Gas Verification Confirmed</span>
                    </div>
                    <div className="contract-req-item">
                      <span style={{ color: 'var(--emerald)', fontWeight: 800 }}>✓</span>
                      <span>Authoritative Sequence #{bestReliefOffer.seq} Verified</span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--text-lo)', paddingTop: '0.5rem', borderTop: '1px solid var(--border-light)' }}>
                    <span>Timestamp: {bestReliefOffer.timestamp}</span>
                    <span style={{ color: 'var(--blue)', fontWeight: 600 }}>
                      Full decision trail available in immutable audit ledger →
                    </span>
                  </div>
                </div>
              )}

            </div>

          </div>

          {/* Section 5: Concurrent Emergency Load Test */}
          <article className="card">
            <header className="card-header">
              <span className="card-label">Concurrent Emergency Load Surge Simulator</span>
              <span className="text-muted text-xs">Simulate pandemic/disaster peak supplier offer surge</span>
            </header>

            <div className="stress-body">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                  <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-hi)', marginBottom: '0.2rem' }}>
                    Evaluate 5,000 Concurrent Supplier Offers Under Load
                  </h4>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-mid)', maxWidth: '750px', lineHeight: 1.5 }}>
                    Test how the active concurrency strategy (<strong>{STRATEGY_DATA[strategy].title}</strong>) evaluates thousands of simultaneous supplier submissions without race conditions, reliably selecting the compliant lowest-cost supplier.
                  </p>
                </div>

                <div style={{ display: 'flex', gap: '0.55rem', alignItems: 'center' }}>
                  <button
                    className="btn btn-danger btn-fire"
                    onClick={() => simulateReliefSurge(5000)}
                    disabled={isReliefSimulating}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
                    </svg>
                    {isReliefSimulating ? `Simulating ${reliefSimProgress}%` : 'Simulate 5,000 Supplier Offers'}
                  </button>

                  <button
                    className="btn btn-secondary"
                    onClick={() => simulateReliefSurge(1000)}
                    disabled={isReliefSimulating}
                  >
                    1,000 Offers
                  </button>
                </div>
              </div>

              {isReliefSimulating && (
                <div className="burst-progress" style={{ marginTop: '0.85rem' }}>
                  <div className="burst-progress-bar" style={{ width: `${reliefSimProgress}%` }}></div>
                </div>
              )}

              {/* Comparison Statistics Card */}
              <div className="kpi-grid" style={{ marginTop: '1rem' }}>
                <div className="kpi-card">
                  <div className="kpi-label">Offers Ingested</div>
                  <div className="kpi-val mono">{reliefSimStats.totalOffers.toLocaleString()}</div>
                  <div className="kpi-sub">Total submissions</div>
                </div>
                <div className="kpi-card kpi-card-emerald">
                  <div className="kpi-label">Eligible Compliant</div>
                  <div className="kpi-val mono val-emerald">{reliefSimStats.eligibleCount.toLocaleString()}</div>
                  <div className="kpi-sub">Met all 4 conditions</div>
                </div>
                <div className="kpi-card kpi-card-amber">
                  <div className="kpi-label">Rejected / Non-compliant</div>
                  <div className="kpi-val mono val-amber">{reliefSimStats.rejectedCount.toLocaleString()}</div>
                  <div className="kpi-sub">Filtered automatically</div>
                </div>
                <div className={`kpi-card ${reliefSimStats.violations > 0 ? 'kpi-card-rose' : ''}`}>
                  <div className="kpi-label">Ordering Violations</div>
                  <div className="kpi-val mono val-rose">{reliefSimStats.violations.toLocaleString()}</div>
                  <div className="kpi-sub">{reliefSimStats.violations === 0 ? '✓ Strict Linearizability' : '⚠ Race Condition Error'}</div>
                </div>
              </div>

              <div className="provenance-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', marginTop: '0.75rem' }}>
                <div className="provenance-item">
                  <span className="prov-label">Optimal Supplier Identified</span>
                  <span className="prov-val" style={{ color: 'var(--blue)' }}>{reliefSimStats.winningSupplier}</span>
                </div>
                <div className="provenance-item">
                  <span className="prov-label">Best Final Price / Unit</span>
                  <span className="prov-val mono">₹{reliefSimStats.bestPrice.toLocaleString()}</span>
                </div>
                <div className="provenance-item">
                  <span className="prov-label">Total Public Savings</span>
                  <span className="prov-val mono" style={{ color: 'var(--emerald)' }}>{formatINR(reliefSimStats.savings)}</span>
                </div>
                <div className="provenance-item">
                  <span className="prov-label">Mean Ingestion Latency</span>
                  <span className="prov-val mono">{reliefSimStats.meanLatency}</span>
                </div>
              </div>
            </div>
          </article>

          {/* Section 4: Live Supplier Offer Stream */}
          <article className="card">
            <header className="card-header">
              <span className="card-label">4. Live Supplier Offer Stream</span>
              <span className="text-muted text-xs">Real-time incoming offers ({reliefOffers.length} logged)</span>
            </header>

            <div className="audit-container" style={{ height: '300px' }}>
              <table className="relief-table">
                <thead>
                  <tr>
                    <th scope="col">Seq</th>
                    <th scope="col">Timestamp</th>
                    <th scope="col">Supplier</th>
                    <th scope="col">Price / Cyl</th>
                    <th scope="col">Qty</th>
                    <th scope="col">Total Value</th>
                    <th scope="col">Delivery</th>
                    <th scope="col">Certification</th>
                    <th scope="col">Outcome Status</th>
                  </tr>
                </thead>
                <tbody>
                  {reliefOffers.map((offer) => (
                    <tr key={offer.id}>
                      <td className="mono">#{offer.seq}</td>
                      <td className="mono text-lo">{offer.timestamp}</td>
                      <td style={{ fontWeight: 700, color: 'var(--text-hi)' }}>{offer.supplier}</td>
                      <td className="mono">₹{offer.pricePerUnit.toLocaleString()}</td>
                      <td className="mono">{offer.quantity} cyl</td>
                      <td className="mono" style={{ fontWeight: 700, color: offer.status === 'ELIGIBLE' ? 'var(--blue)' : 'var(--text-lo)' }}>
                        {formatINR(offer.totalCost)}
                      </td>
                      <td className="mono">{offer.deliveryHours}h</td>
                      <td>
                        {offer.certified ? (
                          <span style={{ color: 'var(--emerald)', fontWeight: 600 }}>✓ Verified</span>
                        ) : (
                          <span style={{ color: 'var(--rose)', fontWeight: 600 }}>✕ Uncertified</span>
                        )}
                      </td>
                      <td>
                        {offer.status === 'ELIGIBLE' ? (
                          <span className="relief-tag-eligible">ELIGIBLE</span>
                        ) : (
                          <span className="relief-tag-rejected">{offer.rejectionReason || 'REJECTED'}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </article>

        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          VIEW 4: SECURITY, RBAC & IMMUTABLE AUDIT LEDGER
      ═══════════════════════════════════════════════════════════════ */}
      {activeTab === 'security' && (
        <div className="view-container">
          
          <div className="view-header">
            <div className="view-title-group">
              <h2>Security, RBAC &amp; Immutable Audit Ledger</h2>
              <p>Zero-trust server validation, rate-limiting, idempotency retries, and tamper-evident transaction logging.</p>
            </div>
            <span className="chip chip-emerald">Audited Architecture</span>
          </div>

          <div className="sec-grid-3">
            {/* RBAC Card */}
            <article className="card sec-card">
              <header className="card-header">
                <span className="card-label">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="8" r="4" /><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" /></svg>
                  Authentication &amp; RBAC
                </span>
                <span className="chip chip-emerald sec-chip-xs">Active Session</span>
              </header>

              <div className="auth-user-card">
                <div className="auth-avatar">{USER_ROLES[currentRole].avatar}</div>
                <div className="auth-user-info">
                  <div className="auth-name">{USER_ROLES[currentRole].name}</div>
                  <div className="auth-id mono text-lo text-xs">{USER_ROLES[currentRole].id}</div>
                </div>
                <span className={`auth-role-badge auth-role-${currentRole}`}>
                  {USER_ROLES[currentRole].role}
                </span>
              </div>

              <div className="role-switcher">
                <span className="control-label">Switch Simulated Role</span>
                <div className="role-row">
                  {Object.keys(USER_ROLES).map((r) => (
                    <button
                      key={r}
                      className={`role-option ${currentRole === r ? 'role-option-active' : ''}`}
                      onClick={() => {
                        setCurrentRole(r);
                        if (r !== 'bidder') {
                          addSecLog({
                            event: 'Role authorization changed',
                            outcome: 'WARNED',
                            detail: `Switched to ${USER_ROLES[r].role} (bidding disabled)`
                          });
                        }
                      }}
                    >
                      {USER_ROLES[r].role}
                    </button>
                  ))}
                </div>
              </div>

              <div className="perm-matrix">
                <div className="perm-row perm-header">
                  <span>Permission</span><span>Bidder</span><span>Viewer</span><span>Admin</span>
                </div>
                <div className="perm-row">
                  <span>Submit Bid</span>
                  <span className="perm-yes">✓</span><span className="perm-no">✕</span><span className="perm-no">✕</span>
                </div>
                <div className="perm-row">
                  <span>View Feed</span>
                  <span className="perm-yes">✓</span><span className="perm-yes">✓</span><span className="perm-yes">✓</span>
                </div>
                <div className="perm-row">
                  <span>Cancel Auction</span>
                  <span className="perm-no">✕</span><span className="perm-no">✕</span><span className="perm-yes">✓</span>
                </div>
                <div className="perm-row">
                  <span>Export Ledger</span>
                  <span className="perm-no">✕</span><span className="perm-no">✕</span><span className="perm-yes">✓</span>
                </div>
              </div>
            </article>

            {/* Rate Limiting */}
            <article className="card sec-card">
              <header className="card-header">
                <span className="card-label">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
                  Rate Limiting &amp; Bot Guard
                </span>
                <span className="chip chip-ghost sec-chip-xs">60 req/min quota</span>
              </header>

              <div className="rl-gauge-row">
                <div className="rl-gauge-labels">
                  <span className="text-xs text-muted">Bids this window</span>
                  <span className={`rl-status ${rlCount >= 60 ? 'rl-status-red' : rlCount >= 40 ? 'rl-status-amber' : 'rl-status-green'}`}>
                    {rlCount >= 60 ? 'LIMIT EXCEEDED' : rlCount >= 40 ? 'HIGH LOAD' : 'NORMAL'}
                  </span>
                </div>
                <div className="rl-bar-track" role="progressbar">
                  <div
                    className={`rl-bar-fill ${rlCount >= 60 ? 'rl-bar-red' : rlCount >= 40 ? 'rl-bar-amber' : 'rl-bar-green'}`}
                    style={{ width: `${Math.min(100, (rlCount / 60) * 100)}%` }}
                  ></div>
                </div>
                <div className="rl-gauge-numbers">
                  <span className="mono text-xs">{rlCount} / 60 used</span>
                  <span className="mono text-xs text-muted">Resets in {rlWindowTime}s</span>
                </div>
              </div>

              <div className="rl-remaining-box">
                <div>
                  <div className="rl-rem-val mono">{Math.max(0, 60 - rlCount)}</div>
                  <div className="text-xs text-lo">Requests Remaining</div>
                </div>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => {
                    setRlCount(0);
                    triggerSecToast('Rate limit window quota reset.', 'ok');
                  }}
                >
                  Reset Quota
                </button>
              </div>

              <div className="rl-types">
                <div className="rl-type-row">
                  <span className="rl-type-dot rl-dot-green"></span>
                  <span className="text-xs">Account Cap: 60 bids/min</span>
                  <span className="mono text-xs text-lo">per user ID</span>
                </div>
                <div className="rl-type-row">
                  <span className="rl-type-dot rl-dot-amber"></span>
                  <span className="text-xs">IP Filter: 120 bids/min</span>
                  <span className="mono text-xs text-lo">per client IP</span>
                </div>
                <div className="rl-type-row">
                  <span className="rl-type-dot rl-dot-blue"></span>
                  <span className="text-xs">Auction Limit: 5,000 req/s</span>
                  <span className="mono text-xs text-lo">sequencer capacity</span>
                </div>
              </div>
            </article>

            {/* WebSocket & Idempotency */}
            <article className="card sec-card">
              <header className="card-header">
                <span className="card-label">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12.55a11 11 0 0 1 14.08 0" /><line x1="12" y1="20" x2="12.01" y2="20" /></svg>
                  WebSocket Feed &amp; Idempotency
                </span>
              </header>

              <div className="ws-status-panel">
                <div className="ws-indicator-row">
                  <span className={`ws-dot ws-${wsState}`}></span>
                  <span className={`ws-status-text ws-${wsState}`}>
                    {wsState === 'connected' && 'WSS Connected • Authenticated • Read-Only Topic Subscription'}
                    {wsState === 'reconnecting' && 'WSS Reconnecting… Backoff attempt #2'}
                    {wsState === 'blocked' && 'WSS Blocked — Unauthorized Topic Subscription Denied'}
                  </span>
                </div>
                <div className="ws-state-btns">
                  <button className={`ws-btn ${wsState === 'connected' ? 'ws-btn-active' : ''}`} onClick={() => setWsState('connected')}>Connected</button>
                  <button className={`ws-btn ${wsState === 'reconnecting' ? 'ws-btn-active' : ''}`} onClick={() => setWsState('reconnecting')}>Reconnect</button>
                  <button className={`ws-btn ${wsState === 'blocked' ? 'ws-btn-active' : ''}`} onClick={() => setWsState('blocked')}>Block Sub</button>
                </div>
              </div>

              <div className="idem-panel">
                <div className="idem-header">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="1 4 1 10 7 10" /><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
                  </svg>
                  Idempotency Key Simulator
                </div>
                <p className="text-xs text-muted" style={{ marginBottom: '0.6rem' }}>
                  Retrying an identical request returns the cached result without creating a duplicate bid.
                </p>
                <div className="idem-req-row">
                  <span className="mono text-xs text-lo">Last Req: <span style={{ color: 'var(--cyan)' }}>{lastReqId || 'None'}</span></span>
                  <button className="btn btn-secondary btn-sm" onClick={handleRetryLastRequest}>
                    Retry Last Request
                  </button>
                </div>
              </div>
            </article>
          </div>

          {/* Security Monitor live counters */}
          <article className="card sec-card">
            <header className="card-header">
              <span className="card-label">Live Security Telemetry Counters</span>
            </header>
            <div className="sec-monitor-grid">
              <div className="sec-mon-box sec-mon-red">
                <div className="sec-mon-val mono">{secCounters.blocked}</div>
                <div className="sec-mon-label">Blocked Requests</div>
              </div>
              <div className="sec-mon-box sec-mon-amber">
                <div className="sec-mon-val mono">{secCounters.duplicates}</div>
                <div className="sec-mon-label">Duplicates Prevented</div>
              </div>
              <div className="sec-mon-box sec-mon-amber">
                <div className="sec-mon-val mono">{secCounters.invalid}</div>
                <div className="sec-mon-label">Invalid Bids Filtered</div>
              </div>
              <div className="sec-mon-box sec-mon-red">
                <div className="sec-mon-val mono">{secCounters.rateLimit}</div>
                <div className="sec-mon-label">Rate Limit Events</div>
              </div>
              <div className="sec-mon-box sec-mon-emerald">
                <div className="sec-mon-val mono">{secCounters.seqGaps}</div>
                <div className="sec-mon-label">Sequence Gaps</div>
                <div className="sec-mon-note">Target: 0</div>
              </div>
              <div className="sec-mon-box sec-mon-emerald">
                <div className="sec-mon-val" style={{ color: 'var(--emerald)' }}>ONLINE</div>
                <div className="sec-mon-label">WSS Gateway</div>
              </div>
            </div>
          </article>

          {/* Full-width Transaction Audit Ledger */}
          <article className="card">
            <header className="card-header">
              <span className="card-label">Immutable Transaction Audit Ledger</span>
              <div className="ledger-controls">
                <select
                  className="select-input select-sm"
                  value={auditFilter}
                  onChange={(e) => setAuditFilter(e.target.value)}
                  aria-label="Filter ledger entries by status"
                >
                  <option value="all">All event types</option>
                  <option value="ACCEPTED">Accepted only</option>
                  <option value="REJECTED">Rejected only</option>
                  <option value="VIOLATION">Violations only</option>
                </select>
                <input
                  type="search"
                  className="bid-input select-sm"
                  placeholder="Search bidder or relief supplier…"
                  value={auditSearch}
                  onChange={(e) => setAuditSearch(e.target.value)}
                  aria-label="Search bidder name"
                />
              </div>
            </header>

            <div className="audit-container">
              <table className="audit-table">
                <thead>
                  <tr>
                    <th scope="col">Seq</th>
                    <th scope="col">Timestamp</th>
                    <th scope="col">Participant / Supplier</th>
                    <th scope="col">Offered / Value</th>
                    <th scope="col">Auction High / Target</th>
                    <th scope="col">Latency</th>
                    <th scope="col">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAuditLog.length === 0 ? (
                    <tr className="audit-empty-row">
                      <td colSpan="7">No matching transactions in audit ledger.</td>
                    </tr>
                  ) : (
                    filteredAuditLog.map((row) => (
                      <tr key={row.id} className={row.status === 'VIOLATION' ? 'row-violation' : ''}>
                        <td className="mono">#{row.seq}</td>
                        <td className="mono text-lo">{row.time}</td>
                        <td style={{ color: 'var(--cyan)', fontWeight: 600 }}>{row.bidder}</td>
                        <td className="mono" style={{ fontWeight: 700 }}>${row.offered.toLocaleString()}</td>
                        <td className="mono text-mid">${row.auctionHigh.toLocaleString()}</td>
                        <td className="mono" style={{ color: row.latency > 30 ? 'var(--amber)' : 'var(--emerald)' }}>
                          {row.latency.toFixed(1)}ms
                        </td>
                        <td>
                          <span className={`audit-tag ${row.status === 'ACCEPTED' ? 'tag-accepted' : row.status === 'VIOLATION' ? 'tag-violation' : 'tag-rejected'}`}>
                            {row.status}
                          </span>
                          <span className="audit-reason">{row.reason}</span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </article>

          {/* Hardening Checklist */}
          <article className="card sec-card">
            <header className="card-header">
              <span className="card-label">Production Hardening Checklist</span>
              <span className="text-muted text-xs">Standardized controls</span>
            </header>
            <div className="best-practices-grid">
              <div className="bp-item"><span className="bp-icon bp-cyan">🔒</span><div><strong>HTTPS / TLS 1.3</strong><p>All traffic encrypted in transit</p></div></div>
              <div className="bp-item"><span className="bp-icon bp-cyan">⚡</span><div><strong>Secure WebSockets (WSS)</strong><p>Encrypted real-time streaming</p></div></div>
              <div className="bp-item"><span className="bp-icon bp-amber">🍪</span><div><strong>HttpOnly / SameSite Cookies</strong><p>Prevents XSS token theft &amp; CSRF</p></div></div>
              <div className="bp-item"><span className="bp-icon bp-amber">🛡️</span><div><strong>CSRF Protection</strong><p>Double-submit cookie + SameSite headers</p></div></div>
              <div className="bp-item"><span className="bp-icon bp-emerald">✓</span><div><strong>Server Validation</strong><p>Browser values never trusted</p></div></div>
              <div className="bp-item"><span className="bp-icon bp-emerald">💾</span><div><strong>Parameterized SQL</strong><p>Immutable write-behind append ledger</p></div></div>
              <div className="bp-item"><span className="bp-icon bp-blue">🔑</span><div><strong>Least-Privilege DB Access</strong><p>Separated Redis &amp; SQL role accounts</p></div></div>
              <div className="bp-item"><span className="bp-icon bp-blue">🔐</span><div><strong>Vault Secret Storage</strong><p>Zero credentials in frontend codebase</p></div></div>
              <div className="bp-item"><span className="bp-icon bp-purple">📊</span><div><strong>Prometheus Alerting</strong><p>Live anomaly detection &amp; pager dispatch</p></div></div>
              <div className="bp-item"><span className="bp-icon bp-emerald">🔄</span><div><strong>WAL Replication</strong><p>Point-in-time recovery tested weekly</p></div></div>
            </div>
          </article>

        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          VIEW 5: SYSTEM ARCHITECTURE
      ═══════════════════════════════════════════════════════════════ */}
      {activeTab === 'architecture' && (
        <div className="view-container">
          
          <div className="view-header">
            <div className="view-title-group">
              <h2>System Architecture &amp; Data Pipeline</h2>
              <p>How THE BIIIID decouples hot-path in-memory bid sequencing from durable PostgreSQL persistence.</p>
            </div>
            <span className="chip chip-emerald">LMAX Disruptor Pattern</span>
          </div>

          {/* Interactive Visual Flow Diagram */}
          <article className="card arch-card" style={{ padding: '2rem' }}>
            <header className="card-header">
              <span className="card-label">High-Throughput Architectural Pipeline</span>
              <span className="chip chip-ghost text-xs">Linearizable Architecture</span>
            </header>

            <div className="arch-diagram" style={{ maxWidth: '900px', margin: '1rem auto' }}>
              <div className="arch-row">
                <div className="arch-node arch-node-blue">
                  <div className="arch-node-icon">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="3" width="20" height="14" rx="2" /><line x1="8" y1="21" x2="16" y2="21" /></svg>
                  </div>
                  <div className="arch-node-label">Connected Clients</div>
                  <div className="arch-node-sub">5,000+ Concurrent VUs</div>
                </div>
                <div className="arch-arrow">→</div>
                <div className="arch-node arch-node-blue">
                  <div className="arch-node-icon">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
                  </div>
                  <div className="arch-node-label">API Gateway</div>
                  <div className="arch-node-sub">JWT Auth + Token Bucket</div>
                </div>
                <div className="arch-arrow">→</div>
                <div className="arch-node arch-node-cyan arch-node-highlight">
                  <div className="arch-node-icon">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></svg>
                  </div>
                  <div className="arch-node-label">Atomic Sequencer</div>
                  <div className="arch-node-sub">Redis Lua Single-Writer</div>
                </div>
              </div>

              <div className="arch-split-row">
                <div className="arch-split-line"></div>
                <div className="arch-split-line"></div>
              </div>

              <div className="arch-row arch-row-outputs">
                <div className="arch-node arch-node-emerald">
                  <div className="arch-node-icon">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><ellipse cx="12" cy="5" rx="9" ry="3" /><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" /><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" /></svg>
                  </div>
                  <div className="arch-node-label">PostgreSQL Immutable Ledger</div>
                  <div className="arch-node-sub">Asynchronous Write-Behind</div>
                </div>
                <div className="arch-node arch-node-purple">
                  <div className="arch-node-icon">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07" /></svg>
                  </div>
                  <div className="arch-node-label">WebSocket Broadcast</div>
                  <div className="arch-node-sub">Redis Pub/Sub Fanout (&lt;5ms)</div>
                </div>
              </div>
            </div>
          </article>

          {/* 3 Deep-Dive Architectural Principle Cards */}
          <div className="arch-grid-cards">
            <div className="arch-feature-card">
              <div className="arch-feature-icon" style={{ background: '#e6f4f6', borderColor: '#9bcdd4', color: 'var(--cyan)' }}>⚡</div>
              <h3>1. Single-Writer In-Memory Serialization</h3>
              <p>
                In high-contention auctions, traditional database row locks collapse under hundreds of concurrent threads. THE BIIIID adopts the LMAX single-writer pattern: Redis Lua executes atomically on a single thread, checking the monotonic sequence and accepting or rejecting bids in microseconds without locks.
              </p>
            </div>

            <div className="arch-feature-card">
              <div className="arch-feature-icon" style={{ background: '#edf7f1', borderColor: '#a8d4ba', color: 'var(--emerald)' }}>💾</div>
              <h3>2. Asynchronous Write-Behind Ledger</h3>
              <p>
                Database writes do not block the bidding validation path. Accepted bids are pushed to an immutable append queue and flushed to PostgreSQL asynchronously in batches. This insulates bidders from disk I/O latency while maintaining durable financial auditability.
              </p>
            </div>

            <div className="arch-feature-card">
              <div className="arch-feature-icon" style={{ background: '#f2edfb', borderColor: '#c4b4e0', color: 'var(--purple)' }}>📡</div>
              <h3>3. Decoupled WebSocket Pub/Sub Fanout</h3>
              <p>
                Connected viewers receive price tick updates via Redis Pub/Sub channels broadcasted through an edge WebSocket gateway. Client subscriptions are strictly read-only, preventing untrusted clients from injecting authoritative auction events.
              </p>
            </div>
          </div>

        </div>
      )}

      {/* ── SUPABASE CONFIGURATION & SCHEMA MODAL ── */}
      {isSupabaseModalOpen && (
        <div className="supabase-modal-backdrop" onClick={() => setIsSupabaseModalOpen(false)}>
          <div className="supabase-modal" onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-hi)', margin: 0 }}>
                  🔌 Supabase Database Integration
                </h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-mid)', marginTop: '0.2rem' }}>
                  Connect your live Supabase PostgreSQL instance for persistent ledger storage and multi-client Realtime sync.
                </p>
              </div>
              <button
                className="btn btn-sm btn-ghost"
                onClick={() => setIsSupabaseModalOpen(false)}
                style={{ fontSize: '1.1rem', padding: '0.2rem 0.5rem' }}
              >
                ✕
              </button>
            </div>

            {/* Connection Status Banner */}
            <div style={{
              padding: '0.75rem 1rem',
              borderRadius: 'var(--r-md)',
              background: isSupabaseConnected ? '#edf7f1' : '#f8f9fc',
              border: `1px solid ${isSupabaseConnected ? '#a8d4ba' : 'var(--border)'}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span className="supabase-dot" style={{ background: isSupabaseConnected ? '#10b981' : '#94a3b8', width: '9px', height: '9px' }}></span>
                <span style={{ fontSize: '0.82rem', fontWeight: 600, color: isSupabaseConnected ? '#1b4332' : 'var(--text-mid)' }}>
                  {isSupabaseConnected ? 'Connected to Supabase PostgreSQL & Realtime' : (supabaseStatusMsg || 'Local In-Memory Mode (Disconnected)')}
                </span>
              </div>
              {isSupabaseConnected && (
                <button className="btn btn-sm btn-danger" onClick={disconnectSupabase} style={{ padding: '0.25rem 0.6rem', fontSize: '0.75rem' }}>
                  Disconnect
                </button>
              )}
            </div>

            {/* API Credentials Input Form */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-mid)', marginBottom: '0.3rem' }}>
                  Supabase Project URL
                </label>
                <input
                  type="text"
                  className="offer-input"
                  style={{ width: '100%' }}
                  placeholder="https://your-project-id.supabase.co"
                  value={supabaseUrl}
                  onChange={e => setSupabaseUrl(e.target.value)}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-mid)', marginBottom: '0.3rem' }}>
                  Supabase Anon / Public API Key
                </label>
                <input
                  type="password"
                  className="offer-input"
                  style={{ width: '100%' }}
                  placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                  value={supabaseAnonKey}
                  onChange={e => setSupabaseAnonKey(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', gap: '0.6rem', marginTop: '0.3rem' }}>
                <button
                  className="btn btn-primary"
                  onClick={() => connectSupabase(supabaseUrl, supabaseAnonKey)}
                  disabled={isSupabaseTesting}
                  style={{ flex: 1 }}
                >
                  {isSupabaseTesting ? 'Connecting...' : (isSupabaseConnected ? 'Update Connection' : 'Connect to Supabase')}
                </button>
              </div>
            </div>

            {/* SQL Schema Script Section */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-hi)' }}>
                  SQL Schema Setup (Copy &amp; Run in Supabase SQL Editor)
                </span>
                <button
                  className="btn btn-sm btn-secondary"
                  onClick={() => {
                    navigator.clipboard.writeText(SUPABASE_SCHEMA_SQL);
                    setCopiedSql(true);
                    setTimeout(() => setCopiedSql(false), 2500);
                  }}
                  style={{ fontSize: '0.72rem', padding: '0.2rem 0.5rem' }}
                >
                  {copiedSql ? '✓ Copied to Clipboard!' : '📋 Copy SQL Script'}
                </button>
              </div>
              <pre className="supabase-sql-snippet">{SUPABASE_SCHEMA_SQL}</pre>
            </div>
          </div>
        </div>
      )}

      {/* ── FOOTER ── */}
      <footer className="site-footer" role="contentinfo">
        <div className="footer-inner">
          <span className="text-muted text-xs">
            <strong>THE BIIIID</strong> FROM SYNORA — Professional Real-Time Auction, Security &amp; Emergency Relief Platform.
          </span>
          <span className="text-muted text-xs">
            Tech Stack: React 18 · Supabase PostgreSQL · Redis Lua Sequencer · WebSockets · k6
          </span>
        </div>
      </footer>
    </>
  );
}

// Mount React Root
const rootElement = document.getElementById('root');
if (rootElement) {
  ReactDOM.createRoot(rootElement).render(<App />);
}
