/**
 * SYNORA Real-Time Auction & Concurrency Stress Lab
 * High-Throughput Transactional Engine — Browser Simulation
 *
 * All concurrency logic is preserved from v1.
 * DOM wiring updated for the v2 redesigned interface.
 */

(function () {
  'use strict';

  // ── STATE ─────────────────────────────────────────────────────────────────
  const state = {
    strategy: 'atomic',        // 'naive' | 'pessimistic' | 'optimistic' | 'atomic'
    currentPrice: 10000,
    minIncrement: 250,
    highestBidder: 'Genesis Treasury',
    highestSeq: 0,
    version: 0,
    timeLeftSec: 84.8,
    isTimerRunning: true,

    // Telemetry counters
    totalIngested: 0,
    validAccepted: 0,
    staleRejected: 0,
    invalidViolations: 0,
    recentLatencies: [],
    recentLockWaits: [],

    // TPS tracking
    tpsCounter: 0,
    currentTps: 0,
    lastTpsCalcTime: performance.now(),

    // Chart history
    chartHistory: [],

    // Concurrency primitives
    pessimisticLockBusy: false,
    pessimisticLockQueue: [],
    atomicQueue: [],
    isAtomicProcessing: false,

    // Stress state
    continuousRunning: false,
    continuousIntervalId: null,
    burstVolume: 2500,           // tracks preset selection

    // Audit log (circular buffer, newest first)
    auditLog: [],

    // Audit filter/search state
    auditFilter: 'all',
    auditSearch: '',
  };

  // ── DOM REFERENCES ────────────────────────────────────────────────────────
  const el = {
    // Auction panel
    highestBid:       document.getElementById('highestBidDisplay'),
    highestBidder:    document.getElementById('highestBidderDisplay'),
    highestSeq:       document.getElementById('highestSeqDisplay'),
    priceBox:         document.getElementById('priceBox'),
    auctionTimer:     document.getElementById('auctionTimer'),
    minBidPrompt:     document.getElementById('minBidPrompt'),
    minIncrementPrompt: document.getElementById('minIncrementPrompt'),
    manualBidAmount:  document.getElementById('manualBidAmount'),
    btnPlaceBid:      document.getElementById('btnPlaceBid'),
    snipeAlert:       document.getElementById('snipeAlert'),

    // Strategy
    strategyCards:      document.querySelectorAll('.strategy-card'),
    strategyExplanation: document.getElementById('strategyExplanation'),
    systemStatusBadge:  document.getElementById('systemStatusBadge'),
    sysStatusText:      document.querySelector('#systemStatusBadge .sys-status-text'),

    // Stress
    stressVolumeSelect:   document.getElementById('stressVolumeSelect'), // hidden for JS compat
    stressVuSelect:       document.getElementById('stressVuSelect'),
    btnFireBurst:         document.getElementById('btnFireBurst'),
    btnToggleContinuous:  document.getElementById('btnToggleContinuous'),
    btnResetSimulation:   document.getElementById('btnResetSimulation'),
    stressStatusText:     document.getElementById('stressStatusText'),
    burstProgress:        document.getElementById('burstProgress'),
    burstProgressBar:     document.getElementById('burstProgressBar'),
    presetBtns:           document.querySelectorAll('.preset-btn'),

    // KPIs
    metricTotal:          document.getElementById('metricTotal'),
    metricTps:            document.getElementById('metricTps'),
    metricAccepted:       document.getElementById('metricAccepted'),
    metricRejected:       document.getElementById('metricRejected'),
    metricViolations:     document.getElementById('metricViolations'),
    violationRateText:    document.getElementById('violationRateText'),
    violationCard:        document.getElementById('violationCard'),
    metricMeanLatency:    document.getElementById('metricMeanLatency'),
    metricP95Latency:     document.getElementById('metricP95Latency'),
    metricLockTime:       document.getElementById('metricLockTime'),

    // Checklist
    chkSerialization:     document.getElementById('chkSerialization'),
    chkIconSerialization: document.getElementById('chkIconSerialization'),
    chkLatency:           document.getElementById('chkLatency'),
    chkIconLatency:       document.getElementById('chkIconLatency'),
    chkDegradation:       document.getElementById('chkDegradation'),
    chkIconDegradation:   document.getElementById('chkIconDegradation'),
    checklistScore:       document.getElementById('checklistScore'),
    checklistBanner:      document.getElementById('mentorChecklistCard'),

    // Audit ledger
    auditTableBody:  document.getElementById('auditTableBody'),
    auditFilter:     document.getElementById('auditFilter'),
    auditSearch:     document.getElementById('auditSearch'),

    // Chart
    telemetryChart: document.getElementById('telemetryChart'),
  };

  const ctx = el.telemetryChart.getContext('2d');

  // ── STRATEGY METADATA ─────────────────────────────────────────────────────
  const STRATEGY_LABELS = {
    naive:       'ENGINE: NAIVE (UNPROTECTED)',
    pessimistic: 'ENGINE: PESSIMISTIC ROW LOCK',
    optimistic:  'ENGINE: OPTIMISTIC CAS',
    atomic:      'ENGINE: ATOMIC SEQUENCER',
  };

  const STRATEGY_EXPLANATIONS = {
    naive: `
      <strong style="color:var(--rose)">⚠ Naive — Unsynchronized Read-Modify-Write</strong><br>
      Simulates direct DB reads with no isolation. Concurrent bids read the same stale price,
      then each overwrites the row. A lower bid can win, producing <strong>ghost bids and data corruption</strong>.
      You will see red VIOLATION entries in the ledger when running a burst.
    `,
    pessimistic: `
      <strong style="color:var(--amber)">🔒 Pessimistic Locking — SELECT … FOR UPDATE</strong><br>
      Every bid acquires an exclusive row lock before validating. Prevents violations,
      but requests must queue single-file. Under 1,000+ concurrent bids,
      <strong>lock-wait time dominates</strong> — watch P95 latency climb significantly.
    `,
    optimistic: `
      <strong style="color:var(--blue)">🔄 Optimistic CAS — Version check + retry</strong><br>
      Non-blocking: reads current version, validates, then swaps atomically.
      If another writer committed first, the transaction aborts. Safe at moderate load,
      but high contention on a single auction row causes a <strong>retry storm</strong>
      — most bids become CAS conflicts and are rejected.
    `,
    atomic: `
      <strong style="color:var(--emerald)">⚡ Atomic Sequencer — Redis Lua / LMAX Pattern</strong><br>
      A dedicated single-writer processes bids sequentially from a lock-free queue.
      Validation is in-memory; DB persistence happens asynchronously (outbox pattern).
      Result: <strong>zero lock contention, sub-millisecond validation, and guaranteed 0 violations</strong>
      regardless of concurrent load.
    `,
  };

  // ── AUDIO ─────────────────────────────────────────────────────────────────
  let audioCtx = null;
  function getAudioCtx() {
    if (!audioCtx && (window.AudioContext || window.webkitAudioContext)) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    return audioCtx;
  }

  function playTickSound(isAccepted, isViolation) {
    const ac = getAudioCtx();
    if (!ac) return;
    try {
      if (ac.state === 'suspended') ac.resume();
      const osc  = ac.createOscillator();
      const gain = ac.createGain();
      osc.connect(gain); gain.connect(ac.destination);
      const now = ac.currentTime;
      if (isViolation) {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(220, now);
        osc.frequency.exponentialRampToValueAtTime(110, now + 0.12);
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
        osc.start(now); osc.stop(now + 0.12);
      } else if (isAccepted) {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(660, now);
        osc.frequency.exponentialRampToValueAtTime(880, now + 0.08);
        gain.gain.setValueAtTime(0.07, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
        osc.start(now); osc.stop(now + 0.08);
      }
    } catch (_) { /* silently fail before user gesture */ }
  }

  // ── CONCURRENCY STRATEGIES ────────────────────────────────────────────────

  /** 1. NAIVE — Race condition showcase */
  async function processNaive(bid) {
    const t0 = performance.now();
    state.totalIngested++; state.tpsCounter++;

    const readPrice = state.currentPrice;
    const readSeq   = state.highestSeq;
    const ioDelay   = 2 + Math.random() * 6;
    await new Promise(r => setTimeout(r, ioDelay));

    const latency = performance.now() - t0;
    recordLatency(latency, 0);

    if (bid.amount >= readPrice + state.minIncrement) {
      const isViolation = bid.amount < state.currentPrice;
      if (isViolation) {
        state.invalidViolations++;
        state.currentPrice  = bid.amount;
        state.highestBidder = bid.bidder;
        state.highestSeq++;
        addAuditEntry({ seq: state.highestSeq, bidder: bid.bidder, offered: bid.amount,
          auctionHigh: state.currentPrice, latency, status: 'VIOLATION',
          reason: `Race: overwrote $${readPrice.toLocaleString()} with $${bid.amount.toLocaleString()}` });
        triggerPriceBoxFlash(false, true);
        playTickSound(false, true);
      } else {
        state.validAccepted++;
        state.currentPrice  = bid.amount;
        state.highestBidder = bid.bidder;
        state.highestSeq++;
        addAuditEntry({ seq: state.highestSeq, bidder: bid.bidder, offered: bid.amount,
          auctionHigh: state.currentPrice, latency, status: 'ACCEPTED', reason: 'Valid increment' });
        handleAntiSniping();
        triggerPriceBoxFlash(true, false);
        playTickSound(true, false);
      }
    } else {
      state.staleRejected++;
      addAuditEntry({ seq: readSeq, bidder: bid.bidder, offered: bid.amount,
        auctionHigh: state.currentPrice, latency, status: 'REJECTED',
        reason: `$${bid.amount.toLocaleString()} < min $${(readPrice + state.minIncrement).toLocaleString()}` });
    }
    updateUI();
  }

  /** 2. PESSIMISTIC — Mutex / row lock simulation */
  async function processPessimistic(bid) {
    const t0 = performance.now();
    state.totalIngested++; state.tpsCounter++;

    let lockWait = 0;
    const lockStart = performance.now();
    if (state.pessimisticLockBusy) {
      await new Promise(resolve => state.pessimisticLockQueue.push(resolve));
    }
    state.pessimisticLockBusy = true;
    lockWait = performance.now() - lockStart;

    try {
      await new Promise(r => setTimeout(r, 1.2 + Math.random() * 1.5));
      const latency = performance.now() - t0;
      recordLatency(latency, lockWait);

      if (bid.amount >= state.currentPrice + state.minIncrement) {
        state.validAccepted++;
        state.currentPrice  = bid.amount;
        state.highestBidder = bid.bidder;
        state.highestSeq++;
        addAuditEntry({ seq: state.highestSeq, bidder: bid.bidder, offered: bid.amount,
          auctionHigh: state.currentPrice, latency, status: 'ACCEPTED',
          reason: `Locked & serialized (wait ${lockWait.toFixed(1)}ms)` });
        handleAntiSniping();
        triggerPriceBoxFlash(true, false);
        playTickSound(true, false);
      } else {
        state.staleRejected++;
        addAuditEntry({ seq: state.highestSeq, bidder: bid.bidder, offered: bid.amount,
          auctionHigh: state.currentPrice, latency, status: 'REJECTED',
          reason: `Stale under lock (wait ${lockWait.toFixed(1)}ms)` });
      }
    } finally {
      state.pessimisticLockBusy = false;
      if (state.pessimisticLockQueue.length > 0) state.pessimisticLockQueue.shift()();
    }
    updateUI();
  }

  /** 3. OPTIMISTIC — Version CAS */
  async function processOptimistic(bid) {
    const t0 = performance.now();
    state.totalIngested++; state.tpsCounter++;

    const readVersion = state.version;
    const readPrice   = state.currentPrice;
    await new Promise(r => setTimeout(r, 0.5 + Math.random() * 1.5));

    const latency = performance.now() - t0;
    recordLatency(latency, 0);

    if (state.version !== readVersion) {
      state.staleRejected++;
      addAuditEntry({ seq: state.highestSeq, bidder: bid.bidder, offered: bid.amount,
        auctionHigh: state.currentPrice, latency, status: 'REJECTED',
        reason: `CAS conflict: expected v${readVersion}, got v${state.version}` });
    } else if (bid.amount >= readPrice + state.minIncrement) {
      state.version++;
      state.validAccepted++;
      state.currentPrice  = bid.amount;
      state.highestBidder = bid.bidder;
      state.highestSeq++;
      addAuditEntry({ seq: state.highestSeq, bidder: bid.bidder, offered: bid.amount,
        auctionHigh: state.currentPrice, latency, status: 'ACCEPTED',
        reason: `CAS ok (v${readVersion}→v${state.version})` });
      handleAntiSniping();
      triggerPriceBoxFlash(true, false);
      playTickSound(true, false);
    } else {
      state.staleRejected++;
      addAuditEntry({ seq: state.highestSeq, bidder: bid.bidder, offered: bid.amount,
        auctionHigh: state.currentPrice, latency, status: 'REJECTED',
        reason: `$${bid.amount.toLocaleString()} < min $${(readPrice + state.minIncrement).toLocaleString()}` });
    }
    updateUI();
  }

  /** 4. ATOMIC — Single-writer event loop */
  function processAtomic(bid) {
    state.totalIngested++; state.tpsCounter++;
    state.atomicQueue.push({ bid, enqueueTime: performance.now() });
    if (!state.isAtomicProcessing) drainAtomicQueue();
  }

  function drainAtomicQueue() {
    state.isAtomicProcessing = true;
    const batchSize = Math.min(state.atomicQueue.length, 100);
    const now = performance.now();

    for (let i = 0; i < batchSize; i++) {
      const { bid, enqueueTime } = state.atomicQueue.shift();
      const latency = now - enqueueTime + 0.15;
      recordLatency(latency, 0);

      if (bid.amount >= state.currentPrice + state.minIncrement) {
        state.validAccepted++;
        state.currentPrice  = bid.amount;
        state.highestBidder = bid.bidder;
        state.highestSeq++;
        addAuditEntry({ seq: state.highestSeq, bidder: bid.bidder, offered: bid.amount,
          auctionHigh: state.currentPrice, latency, status: 'ACCEPTED',
          reason: 'Sequenced in-memory (0 locks)' });
        handleAntiSniping();
        triggerPriceBoxFlash(true, false);
        playTickSound(true, false);
      } else {
        state.staleRejected++;
        addAuditEntry({ seq: state.highestSeq, bidder: bid.bidder, offered: bid.amount,
          auctionHigh: state.currentPrice, latency, status: 'REJECTED',
          reason: `$${bid.amount.toLocaleString()} < min $${(state.currentPrice + state.minIncrement).toLocaleString()}` });
      }
    }

    updateUI();
    if (state.atomicQueue.length > 0) requestAnimationFrame(drainAtomicQueue);
    else state.isAtomicProcessing = false;
  }

  // ── DISPATCHER ────────────────────────────────────────────────────────────
  function dispatchBid(bid) {
    switch (state.strategy) {
      case 'naive':        return processNaive(bid);
      case 'pessimistic':  return processPessimistic(bid);
      case 'optimistic':   return processOptimistic(bid);
      default:             return processAtomic(bid);
    }
  }

  // ── ANTI-SNIPING ──────────────────────────────────────────────────────────
  function handleAntiSniping() {
    if (state.timeLeftSec <= 15) {
      state.timeLeftSec += 20;
      showSnipeAlert();
    }
  }

  function showSnipeAlert() {
    if (!el.snipeAlert) return;
    el.snipeAlert.hidden = false;
    clearTimeout(el.snipeAlert._hideTimer);
    el.snipeAlert._hideTimer = setTimeout(() => { el.snipeAlert.hidden = true; }, 3500);
  }

  // ── TELEMETRY UTILS ───────────────────────────────────────────────────────
  function recordLatency(ms, lockMs) {
    state.recentLatencies.push(ms);
    if (state.recentLatencies.length > 300) state.recentLatencies.shift();
    state.recentLockWaits.push(lockMs);
    if (state.recentLockWaits.length > 300) state.recentLockWaits.shift();
  }

  function percentile(arr, p) {
    if (!arr.length) return 0;
    const s = [...arr].sort((a, b) => a - b);
    return s[Math.max(0, Math.ceil((p / 100) * s.length) - 1)];
  }

  function mean(arr) {
    if (!arr.length) return 0;
    return arr.reduce((a, b) => a + b, 0) / arr.length;
  }

  // ── PRICE BOX FLASH ───────────────────────────────────────────────────────
  function triggerPriceBoxFlash(success, conflict) {
    el.priceBox.classList.remove('flash-success', 'flash-conflict');
    void el.priceBox.offsetWidth;
    if (conflict) el.priceBox.classList.add('flash-conflict');
    else if (success) el.priceBox.classList.add('flash-success');
  }

  // ── AUDIT LOG ─────────────────────────────────────────────────────────────
  function addAuditEntry(entry) {
    entry.timestamp = performance.now();
    state.auditLog.unshift(entry);
    if (state.auditLog.length > 120) state.auditLog.pop();
    renderAuditTable();
  }

  function renderAuditTable() {
    const filter = state.auditFilter;
    const search = state.auditSearch.toLowerCase().trim();

    const visible = state.auditLog.filter(item => {
      if (filter !== 'all' && item.status !== filter) return false;
      if (search && !item.bidder.toLowerCase().includes(search)) return false;
      return true;
    }).slice(0, 40);

    if (!visible.length) {
      el.auditTableBody.innerHTML = `<tr class="audit-empty-row"><td colspan="7">No matching transactions.</td></tr>`;
      return;
    }

    const now = new Date();
    const baseMs = performance.now();

    el.auditTableBody.innerHTML = visible.map(item => {
      let tagClass, tagText;
      if (item.status === 'VIOLATION')    { tagClass = 'tag-violation'; tagText = 'VIOLATION'; }
      else if (item.status === 'REJECTED'){ tagClass = 'tag-rejected';  tagText = 'REJECTED'; }
      else                                { tagClass = 'tag-accepted';  tagText = 'ACCEPTED'; }

      // Compute an approximate wall-clock timestamp
      const offsetMs = baseMs - item.timestamp;
      const ts = new Date(now - offsetMs);
      const hh = String(ts.getHours()).padStart(2, '0');
      const mm = String(ts.getMinutes()).padStart(2, '0');
      const ss = String(ts.getSeconds()).padStart(2, '0');
      const ms = String(ts.getMilliseconds()).padStart(3, '0');
      const timeStr = `${hh}:${mm}:${ss}.${ms}`;

      const latColor = item.latency > 30 ? 'var(--amber)' : 'var(--emerald)';
      const rowClass = item.status === 'VIOLATION' ? ' row-violation' : '';

      return `
        <tr class="${rowClass}">
          <td class="mono">#${item.seq}</td>
          <td class="mono" style="color:var(--text-lo)">${timeStr}</td>
          <td style="color:var(--cyan);font-weight:500;max-width:160px;overflow:hidden;text-overflow:ellipsis">${item.bidder}</td>
          <td class="mono" style="font-weight:700">$${item.offered.toLocaleString()}</td>
          <td class="mono" style="color:var(--text-mid)">$${item.auctionHigh.toLocaleString()}</td>
          <td class="mono" style="color:${latColor}">${item.latency.toFixed(1)}ms</td>
          <td>
            <span class="audit-tag ${tagClass}">${tagText}</span>
            <span class="audit-reason">${item.reason}</span>
          </td>
        </tr>`;
    }).join('');
  }

  // ── MAIN UI UPDATE ────────────────────────────────────────────────────────
  function updateUI() {
    // Auction panel
    el.highestBid.textContent     = `$${state.currentPrice.toLocaleString()}`;
    el.highestBidder.textContent  = state.highestBidder;
    el.highestSeq.textContent     = `Seq #${state.highestSeq}`;

    const nextMin = state.currentPrice + state.minIncrement;
    el.minBidPrompt.textContent       = `$${nextMin.toLocaleString()}`;
    el.minIncrementPrompt.textContent = `$${state.minIncrement.toLocaleString()}`;
    if (parseFloat(el.manualBidAmount.value) < nextMin) el.manualBidAmount.value = nextMin;

    // KPIs
    el.metricTotal.textContent    = state.totalIngested.toLocaleString();
    el.metricAccepted.textContent = state.validAccepted.toLocaleString();
    el.metricRejected.textContent = state.staleRejected.toLocaleString();
    el.metricViolations.textContent = state.invalidViolations.toLocaleString();

    const rate = state.totalIngested > 0
      ? ((state.invalidViolations / state.totalIngested) * 100).toFixed(3)
      : '0.000';
    el.violationRateText.textContent = `Rate: ${rate}%`;

    if (state.invalidViolations > 0) {
      el.violationCard.style.borderColor = 'rgba(244,63,94,0.4)';
    } else {
      el.violationCard.style.borderColor = '';
    }

    // Latency
    if (state.recentLatencies.length) {
      el.metricMeanLatency.textContent = `${mean(state.recentLatencies).toFixed(1)} ms`;
      el.metricP95Latency.textContent  = `${percentile(state.recentLatencies, 95).toFixed(1)} ms`;
    }
    if (state.recentLockWaits.length) {
      el.metricLockTime.textContent = `${mean(state.recentLockWaits).toFixed(1)} ms`;
    }

    evaluateMentorChecklist();
  }

  // ── MENTOR CHECKLIST ──────────────────────────────────────────────────────
  function evaluateMentorChecklist() {
    let passed = 0;

    function setCheck(iconEl, itemEl, ok) {
      if (ok) {
        passed++;
        iconEl.className = 'chk-icon pass';
        iconEl.textContent = '✓';
        iconEl.setAttribute('aria-label', 'Passed');
      } else {
        iconEl.className = 'chk-icon fail';
        iconEl.textContent = '✕';
        iconEl.setAttribute('aria-label', 'Failed');
      }
    }

    setCheck(el.chkIconSerialization, el.chkSerialization, state.invalidViolations === 0);
    setCheck(el.chkIconLatency, el.chkLatency,
      state.recentLatencies.length === 0 || percentile(state.recentLatencies, 95) < 50);
    setCheck(el.chkIconDegradation, el.chkDegradation, state.strategy !== 'naive');

    el.checklistScore.textContent = `${passed} / 3 MET`;

    if (el.checklistBanner) {
      el.checklistBanner.style.borderLeftColor = passed === 3 ? 'var(--emerald)' : 'var(--amber)';
      el.checklistBanner.style.borderColor = passed === 3
        ? 'rgba(16,185,129,0.28)' : 'rgba(245,158,11,0.3)';
    }
  }

  // ── STRESS TEST GENERATOR ─────────────────────────────────────────────────
  const BOT_NAMES = [
    'AlgoTrader-α', 'QuantFund-9', 'HFT_Tokyo', 'ArbitrageX',
    'LiquidityEng', 'OmegaCapital', 'ApexBidder', 'CitadelNode',
    'JaneStreetBot', 'JumpTradingV2', 'TowerResearch', 'OptiverProxy',
    'SuspenseBot', 'MarketMaker-7', 'FlashBid-AI', 'NexusBidder',
  ];

  async function runSpikeBurst(totalBids, vus) {
    el.btnFireBurst.disabled = true;
    el.btnFireBurst.textContent = 'Running…';

    setStressStatus('running', `BURST: ${totalBids.toLocaleString()} BIDS / ${vus} VUs`);
    showProgressBar(true);

    const bidsPerVU = Math.ceil(totalBids / vus);
    let completed = 0;
    const tasks = [];

    for (let v = 0; v < vus; v++) {
      const botName = `${BOT_NAMES[v % BOT_NAMES.length]}#${v + 1}`;
      tasks.push((async () => {
        for (let i = 0; i < bidsPerVU; i++) {
          const roll = Math.random();
          let amount;
          if (roll < 0.45)      amount = state.currentPrice + state.minIncrement * (1 + Math.floor(Math.random() * 3));
          else if (roll < 0.80) amount = state.currentPrice + state.minIncrement;
          else                  amount = state.currentPrice - state.minIncrement;
          dispatchBid({ bidder: botName, amount: Math.round(amount) });
          completed++;
          if (i % 10 === 0) {
            el.burstProgressBar.style.width = `${Math.min(100, (completed / totalBids) * 100).toFixed(1)}%`;
            await new Promise(r => setTimeout(r, Math.random() * 2));
          }
        }
      })());
    }

    await Promise.all(tasks);

    el.burstProgressBar.style.width = '100%';
    setTimeout(() => { showProgressBar(false); el.burstProgressBar.style.width = '0%'; }, 600);

    el.btnFireBurst.disabled = false;
    el.btnFireBurst.innerHTML = `
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
      Fire Burst`;

    setStressStatus('done', `COMPLETE — ${totalBids.toLocaleString()} BIDS PROCESSED`);
    setTimeout(() => {
      if (!state.continuousRunning) setStressStatus('idle', '● IDLE');
    }, 4000);
  }

  function toggleContinuousStress() {
    state.continuousRunning = !state.continuousRunning;
    if (state.continuousRunning) {
      el.btnToggleContinuous.textContent = '⏹ Stop';
      el.btnToggleContinuous.classList.replace('btn-secondary', 'btn-danger');
      setStressStatus('running', 'CONTINUOUS: ~1,500 REQ/S');
      state.continuousIntervalId = setInterval(() => {
        for (let i = 0; i < 60; i++) {
          const bot = BOT_NAMES[Math.floor(Math.random() * BOT_NAMES.length)];
          const delta = Math.random() > 0.4 ? state.minIncrement : (Math.random() > 0.5 ? -state.minIncrement : 0);
          dispatchBid({ bidder: bot, amount: Math.round(state.currentPrice + delta) });
        }
      }, 40);
    } else {
      clearInterval(state.continuousIntervalId);
      el.btnToggleContinuous.innerHTML = `
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polygon points="5 3 19 12 5 21 5 3"/></svg>
        Continuous`;
      el.btnToggleContinuous.classList.replace('btn-danger', 'btn-secondary');
      setStressStatus('idle', '● IDLE');
    }
  }

  function setStressStatus(state_, text) {
    el.stressStatusText.textContent = text;
    el.stressStatusText.className   = 'stress-status-pill';
    if (state_ === 'running') el.stressStatusText.classList.add('running');
    if (state_ === 'done')    el.stressStatusText.classList.add('done');
  }

  function showProgressBar(show) {
    el.burstProgress.hidden = !show;
  }

  function resetSimulation() {
    if (state.continuousRunning) toggleContinuousStress();

    // Reset state
    Object.assign(state, {
      currentPrice: 10000, highestBidder: 'Genesis Treasury',
      highestSeq: 0, version: 0, timeLeftSec: 84.8,
      totalIngested: 0, validAccepted: 0, staleRejected: 0, invalidViolations: 0,
      recentLatencies: [], recentLockWaits: [], auditLog: [],
      chartHistory: [], pessimisticLockQueue: [], atomicQueue: [],
    });

    el.manualBidAmount.value = 10250;
    el.snipeAlert.hidden = true;
    el.auditTableBody.innerHTML = `<tr class="audit-empty-row"><td colspan="7">No transactions yet — fire a burst or place a manual bid.</td></tr>`;
    el.metricTps.textContent = '0';
    el.metricMeanLatency.textContent = '0.0 ms';
    el.metricP95Latency.textContent  = '0.0 ms';
    el.metricLockTime.textContent    = '0.0 ms';

    // Re-fill chart buffer
    for (let i = 0; i < 60; i++) state.chartHistory.push({ tps: 0, latency: 0 });

    setStressStatus('idle', '● IDLE');
    updateUI();
  }

  // ── LIVE CHART ────────────────────────────────────────────────────────────
  function initChart() {
    for (let i = 0; i < 60; i++) state.chartHistory.push({ tps: 0, latency: 0 });

    (function renderLoop() {
      const now = performance.now();
      const elapsed = (now - state.lastTpsCalcTime) / 1000;
      if (elapsed >= 0.4) {
        state.currentTps = Math.round(state.tpsCounter / elapsed);
        state.tpsCounter = 0;
        state.lastTpsCalcTime = now;
        el.metricTps.textContent = state.currentTps.toLocaleString();

        state.chartHistory.push({
          tps: state.currentTps,
          latency: mean(state.recentLatencies),
        });
        if (state.chartHistory.length > 60) state.chartHistory.shift();
      }
      drawCanvas();
      requestAnimationFrame(renderLoop);
    })();
  }

  function drawCanvas() {
    const canvas = el.telemetryChart;
    const W = canvas.width  = canvas.parentElement.clientWidth;
    const H = canvas.height = canvas.parentElement.clientHeight;
    ctx.clearRect(0, 0, W, H);

    const data = state.chartHistory;
    if (data.length < 2) return;

    const maxTps = Math.max(1000, ...data.map(d => d.tps));
    const maxLat = Math.max(50,   ...data.map(d => d.latency));
    const stepX  = W / (data.length - 1);
    const padT = 28, padB = 8;

    // Grid lines
    ctx.strokeStyle = 'rgba(0,0,0,0.06)';
    ctx.lineWidth = 1;
    for (let y = padT; y < H - padB; y += (H - padT - padB) / 4) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    }

    // ── TPS fill + line ──────────────
    const tpsPoints = data.map((d, i) => ({
      x: i * stepX,
      y: H - padB - (d.tps / maxTps) * (H - padT - padB),
    }));

    ctx.beginPath();
    tpsPoints.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y));
    const gradTps = ctx.createLinearGradient(0, padT, 0, H);
    gradTps.addColorStop(0, 'rgba(44,78,138,0.18)');
    gradTps.addColorStop(1, 'rgba(44,78,138,0)');
    ctx.lineTo(W, H); ctx.lineTo(0, H);
    ctx.fillStyle = gradTps; ctx.fill();

    ctx.beginPath();
    tpsPoints.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y));
    ctx.strokeStyle = '#2c4e8a'; ctx.lineWidth = 1.6;
    ctx.lineJoin = 'round'; ctx.stroke();

    // ── Latency line ─────────────────
    ctx.beginPath();
    data.forEach((d, i) => {
      const x = i * stepX;
      const y = H - padB - (d.latency / maxLat) * (H - padT - padB);
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.strokeStyle = '#b05c0a'; ctx.lineWidth = 1.4;
    ctx.lineJoin = 'round'; ctx.stroke();

    // ── Legend text ───────────────────
    ctx.font = '600 10px JetBrains Mono, Courier New, monospace';
    ctx.fillStyle = '#2c4e8a';
    ctx.fillText(`TPS: ${state.currentTps.toLocaleString()}  peak: ${maxTps.toLocaleString()}`, 10, 14);

    const curLat = data[data.length - 1].latency;
    ctx.fillStyle = '#b05c0a';
    ctx.fillText(`LATENCY: ${curLat.toFixed(1)} ms  max: ${maxLat.toFixed(1)} ms`, 10, 26);
  }

  // ── AUCTION TIMER ─────────────────────────────────────────────────────────
  function startAuctionCountdown() {
    setInterval(() => {
      if (!state.isTimerRunning || state.timeLeftSec <= 0) return;
      state.timeLeftSec = Math.max(0, state.timeLeftSec - 0.1);
      const mins = Math.floor(state.timeLeftSec / 60);
      const secs = (state.timeLeftSec % 60).toFixed(1).padStart(4, '0');
      // Update only the text node inside the timer badge (keep the SVG icon)
      const timerSpan = el.auctionTimer.querySelector('span');
      if (timerSpan) timerSpan.textContent = `${String(mins).padStart(2, '0')}:${secs}`;

      const urgent = state.timeLeftSec <= 15;
      el.auctionTimer.classList.toggle('urgent', urgent);
    }, 100);
  }

  // ── EVENT LISTENERS ───────────────────────────────────────────────────────
  function setupEventListeners() {

    // Strategy cards (click + keyboard)
    el.strategyCards.forEach(card => {
      function activate() {
        el.strategyCards.forEach(c => {
          c.classList.remove('active');
          c.setAttribute('aria-checked', 'false');
        });
        card.classList.add('active');
        card.setAttribute('aria-checked', 'true');
        state.strategy = card.dataset.strategy;
        el.strategyExplanation.innerHTML = STRATEGY_EXPLANATIONS[state.strategy];
        if (el.sysStatusText) el.sysStatusText.textContent = STRATEGY_LABELS[state.strategy];

        // Update header status badge colour for warning on naive
        if (el.systemStatusBadge) {
          el.systemStatusBadge.classList.toggle('warning', state.strategy === 'naive');
        }
        updateUI();
      }
      card.addEventListener('click', activate);
      card.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); activate(); } });
    });

    // Bid submit
    el.btnPlaceBid.addEventListener('click', () => {
      const amount = parseFloat(el.manualBidAmount.value);
      if (!isNaN(amount) && amount > 0) dispatchBid({ bidder: 'You (Human Trader)', amount: Math.round(amount) });
    });
    el.manualBidAmount.addEventListener('keydown', e => {
      if (e.key === 'Enter') el.btnPlaceBid.click();
    });

    // Quick bid buttons
    document.querySelectorAll('.btn-quick').forEach(btn => {
      btn.addEventListener('click', () => {
        const inc  = parseFloat(btn.dataset.inc);
        const next = state.currentPrice + inc;
        el.manualBidAmount.value = next;
        dispatchBid({ bidder: 'You (Quick Action)', amount: next });
      });
    });

    // Burst preset buttons
    el.presetBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        el.presetBtns.forEach(b => b.classList.remove('preset-btn-active'));
        btn.classList.add('preset-btn-active');
        const vol = parseInt(btn.dataset.vol, 10);
        state.burstVolume = vol;
        el.stressVolumeSelect.value = String(vol); // keep hidden select in sync
      });
    });

    // Fire burst
    el.btnFireBurst.addEventListener('click', () => {
      const vol = state.burstVolume || parseInt(el.stressVolumeSelect.value, 10);
      const vus = parseInt(el.stressVuSelect.value, 10);
      runSpikeBurst(vol, vus);
    });

    // Continuous load toggle
    el.btnToggleContinuous.addEventListener('click', toggleContinuousStress);

    // Reset
    el.btnResetSimulation.addEventListener('click', resetSimulation);

    // Audit filter
    el.auditFilter.addEventListener('change', () => {
      state.auditFilter = el.auditFilter.value;
      renderAuditTable();
    });

    // Audit search
    el.auditSearch.addEventListener('input', () => {
      state.auditSearch = el.auditSearch.value;
      renderAuditTable();
    });
  }

  // ── INIT ──────────────────────────────────────────────────────────────────
  function init() {
    setupEventListeners();

    // Set initial strategy explanation
    el.strategyExplanation.innerHTML = STRATEGY_EXPLANATIONS[state.strategy];

    // Init chart buffer
    initChart();

    // Start timer
    startAuctionCountdown();

    // Seed initial UI
    updateUI();

    // Initial audit table empty state
    el.auditTableBody.innerHTML = `<tr class="audit-empty-row"><td colspan="7">No transactions yet — fire a burst or place a manual bid.</td></tr>`;
  }

  init();
})();
