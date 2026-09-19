/**
 * SYNORA — Security & Trust Simulation Layer
 * Demonstrates layered security architecture for a production auction platform.
 * All behaviour is front-end simulation; clearly labelled as Demo.
 */

(function () {
  'use strict';

  /* ──────────────────────────────────────────────
     SECURITY STATE
  ────────────────────────────────────────────── */
  const SEC = {
    // Auth
    currentRole: 'bidder',   // 'bidder' | 'viewer' | 'admin'
    users: {
      bidder: { name: 'Alex Chen',   id: 'usr_7f3a9c', role: 'Bidder',   avatar: 'AC' },
      viewer: { name: 'Jordan Kim',  id: 'usr_2b8e1d', role: 'Viewer',   avatar: 'JK' },
      admin:  { name: 'Sam Rivera',  id: 'usr_5d4c0f', role: 'Admin',    avatar: 'SR' },
    },

    // Rate limiting
    RL_LIMIT: 60,           // per minute
    RL_WINDOW: 60000,       // 1 minute in ms
    rlCount: 0,
    rlWindowStart: Date.now(),
    rlBlocked: 0,

    // Idempotency
    seenRequestIds: new Map(),  // reqId → result
    lastReqId: null,
    duplicatesPrevented: 0,

    // Security counters (live monitor)
    blockedRequests: 0,
    invalidBidsRejected: 0,
    rateLimitEvents: 0,
    seqGaps: 0,
    lastSeq: 0,

    // WebSocket sim
    wsState: 'connected',  // 'connected' | 'reconnecting' | 'blocked'

    // Suspicious activity tracking
    recentBidTs: [],
    suspiciousFlag: false,
  };

  /* ──────────────────────────────────────────────
     ID GENERATION
  ────────────────────────────────────────────── */
  function genReqId() {
    return 'req_' + Math.random().toString(36).slice(2, 10).toUpperCase();
  }

  /* ──────────────────────────────────────────────
     RATE LIMITER
  ────────────────────────────────────────────── */
  function checkRateLimit() {
    const now = Date.now();
    if (now - SEC.rlWindowStart >= SEC.RL_WINDOW) {
      SEC.rlCount = 0;
      SEC.rlWindowStart = now;
      SEC.suspiciousFlag = false;
    }
    SEC.rlCount++;
    updateRateLimitUI();

    if (SEC.rlCount > SEC.RL_LIMIT) {
      SEC.rlBlocked++;
      SEC.rateLimitEvents++;
      SEC.blockedRequests++;
      updateSecurityMonitor();
      return false; // blocked
    }

    // Suspicious activity: >30 bids in 3 seconds
    SEC.recentBidTs = SEC.recentBidTs.filter(t => now - t < 3000);
    SEC.recentBidTs.push(now);
    if (SEC.recentBidTs.length > 30 && !SEC.suspiciousFlag) {
      SEC.suspiciousFlag = true;
      showSecAlert('Suspicious activity detected — abnormal bid burst rate.', 'warn');
    }
    return true; // allowed
  }

  /* ──────────────────────────────────────────────
     IDEMPOTENCY CHECK
  ────────────────────────────────────────────── */
  function checkIdempotency(reqId, amount) {
    if (SEC.seenRequestIds.has(reqId)) {
      SEC.duplicatesPrevented++;
      updateSecurityMonitor();
      addSecAuditEntry({
        reqId,
        event: 'Duplicate request blocked',
        outcome: 'BLOCKED',
        detail: `Idempotency key collision — original result returned`,
        amount,
      });
      showSecAlert('Duplicate request detected — original result returned.', 'warn');
      return { isDuplicate: true, cached: SEC.seenRequestIds.get(reqId) };
    }
    return { isDuplicate: false };
  }

  function cacheRequestResult(reqId, result) {
    SEC.seenRequestIds.set(reqId, result);
    // Expire after 5 min (simple cleanup)
    setTimeout(() => SEC.seenRequestIds.delete(reqId), 300000);
  }

  /* ──────────────────────────────────────────────
     AUTH CHECKS
  ────────────────────────────────────────────── */
  function canPlaceBid() {
    return SEC.currentRole === 'bidder' || SEC.currentRole === 'admin';
  }

  /* ──────────────────────────────────────────────
     VALIDATION
  ────────────────────────────────────────────── */
  function validateBidAmount(amount, currentHigh, minIncrement) {
    if (!Number.isFinite(amount) || amount <= 0) {
      return { valid: false, reason: 'Invalid amount: must be a positive number' };
    }
    if (amount < currentHigh + minIncrement) {
      return { valid: false, reason: `Below minimum bid of $${(currentHigh + minIncrement).toLocaleString()}` };
    }
    return { valid: true };
  }

  /* ──────────────────────────────────────────────
     SECURITY AUDIT ENTRIES
  ────────────────────────────────────────────── */
  function addSecAuditEntry(entry) {
    const body = document.getElementById('secAuditBody');
    if (!body) return;

    let cls = 'sec-row-ok';
    if (entry.outcome === 'BLOCKED' || entry.outcome === 'DENIED')   cls = 'sec-row-red';
    if (entry.outcome === 'WARNED' || entry.outcome === 'RATE_LIM') cls = 'sec-row-amber';

    const tagMap = {
      ACCEPTED: '<span class="sec-tag sec-tag-green">ACCEPTED</span>',
      REJECTED: '<span class="sec-tag sec-tag-amber">REJECTED</span>',
      BLOCKED:  '<span class="sec-tag sec-tag-red">BLOCKED</span>',
      DENIED:   '<span class="sec-tag sec-tag-red">DENIED</span>',
      RATE_LIM: '<span class="sec-tag sec-tag-red">RATE LIMIT</span>',
      WARNED:   '<span class="sec-tag sec-tag-amber">WARNING</span>',
    };
    const tag = tagMap[entry.outcome] || `<span class="sec-tag">${entry.outcome}</span>`;

    const now = new Date();
    const ts = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}:${String(now.getSeconds()).padStart(2,'0')}.${String(now.getMilliseconds()).padStart(3,'0')}`;
    const reqDisplay = entry.reqId ? `<span class="mono text-lo" style="font-size:0.65rem">${entry.reqId}</span>` : '—';

    const row = document.createElement('tr');
    row.className = cls;
    row.innerHTML = `
      <td class="mono" style="font-size:0.68rem;color:var(--text-lo)">${ts}</td>
      <td>${reqDisplay}</td>
      <td style="max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${entry.event}</td>
      <td>${entry.amount !== undefined ? `<span class="mono">$${Number(entry.amount).toLocaleString()}</span>` : '—'}</td>
      <td>${tag}</td>
      <td style="font-size:0.7rem;color:var(--text-lo);max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${entry.detail || ''}</td>
    `;

    // Remove empty state row
    const emptyRow = body.querySelector('.sec-empty-row');
    if (emptyRow) emptyRow.remove();

    body.insertBefore(row, body.firstChild);

    // Keep max 50 rows
    while (body.children.length > 50) body.removeChild(body.lastChild);
  }

  /* ──────────────────────────────────────────────
     SECURITY ALERTS (toast-like)
  ────────────────────────────────────────────── */
  function showSecAlert(msg, type = 'warn') {
    const el = document.getElementById('secAlertToast');
    if (!el) return;
    el.textContent = msg;
    el.className = `sec-alert-toast sec-alert-${type}`;
    el.hidden = false;
    clearTimeout(el._timer);
    el._timer = setTimeout(() => { el.hidden = true; }, 4500);
  }

  /* ──────────────────────────────────────────────
     UI UPDATES
  ────────────────────────────────────────────── */
  function updateRateLimitUI() {
    const remaining = Math.max(0, SEC.RL_LIMIT - SEC.rlCount);
    const pct = (SEC.rlCount / SEC.RL_LIMIT) * 100;

    const barEl     = document.getElementById('rlBar');
    const remEl     = document.getElementById('rlRemaining');
    const countEl   = document.getElementById('rlCount');
    const statusEl  = document.getElementById('rlStatus');

    if (remEl)   remEl.textContent   = remaining;
    if (countEl) countEl.textContent = SEC.rlCount;

    if (barEl) {
      barEl.style.width = Math.min(100, pct) + '%';
      barEl.className = 'rl-bar-fill';
      if (pct >= 100)     barEl.classList.add('rl-bar-red');
      else if (pct >= 70) barEl.classList.add('rl-bar-amber');
      else                barEl.classList.add('rl-bar-green');
    }

    if (statusEl) {
      if (pct >= 100) {
        statusEl.textContent = 'LIMIT REACHED';
        statusEl.className = 'rl-status rl-status-red';
      } else if (pct >= 70) {
        statusEl.textContent = 'APPROACHING LIMIT';
        statusEl.className = 'rl-status rl-status-amber';
      } else {
        statusEl.textContent = 'NORMAL';
        statusEl.className = 'rl-status rl-status-green';
      }
    }

    if (SEC.suspiciousFlag) {
      const suspEl = document.getElementById('suspiciousStatus');
      if (suspEl) {
        suspEl.textContent = '⚠ Suspicious activity detected';
        suspEl.style.color = 'var(--rose)';
      }
    }
  }

  function updateSecurityMonitor() {
    const ids = {
      secBlocked:    'secBlocked',
      secDuplicates: 'secDuplicates',
      secInvalid:    'secInvalid',
      secRateLimit:  'secRateLimit',
      secSeqGaps:    'secSeqGaps',
    };
    const vals = {
      secBlocked:    SEC.blockedRequests,
      secDuplicates: SEC.duplicatesPrevented,
      secInvalid:    SEC.invalidBidsRejected,
      secRateLimit:  SEC.rateLimitEvents,
      secSeqGaps:    SEC.seqGaps,
    };
    Object.entries(ids).forEach(([, id]) => {
      const el = document.getElementById(id);
      if (el) el.textContent = (vals[id] || 0).toLocaleString();
    });
  }

  function updateAuthUI() {
    const user = SEC.users[SEC.currentRole];
    const avatarEl = document.getElementById('authAvatar');
    const nameEl   = document.getElementById('authName');
    const idEl     = document.getElementById('authUserId');
    const roleEl   = document.getElementById('authRoleBadge');
    const bidCtrl  = document.getElementById('bidSectionWrapper');

    if (avatarEl) avatarEl.textContent = user.avatar;
    if (nameEl)   nameEl.textContent   = user.name;
    if (idEl)     idEl.textContent     = user.id;
    if (roleEl) {
      roleEl.textContent = user.role;
      roleEl.className   = `auth-role-badge auth-role-${SEC.currentRole}`;
    }

    // Bid controls: disable for non-bidders
    const allowed = canPlaceBid();
    if (bidCtrl) {
      bidCtrl.classList.toggle('bid-section-locked', !allowed);
    }

    const bidBtn   = document.getElementById('btnPlaceBid');
    const quickBtns = document.querySelectorAll('.btn-quick');
    if (bidBtn) {
      bidBtn.disabled = !allowed;
      bidBtn.title    = allowed ? '' : 'Only Bidder role can place bids';
    }
    quickBtns.forEach(b => { b.disabled = !allowed; });

    const lockMsg = document.getElementById('bidLockMessage');
    if (lockMsg) lockMsg.hidden = allowed;

    // Update role selector visual
    document.querySelectorAll('.role-option').forEach(opt => {
      opt.classList.toggle('role-option-active', opt.dataset.role === SEC.currentRole);
    });
  }

  function updateWsStatus(state) {
    SEC.wsState = state;
    const el = document.getElementById('wsStatusText');
    const dot = document.getElementById('wsDot');
    if (!el || !dot) return;

    const configs = {
      connected:    { text: 'WSS Connected · Authenticated · Subscription Authorized', cls: 'ws-connected' },
      reconnecting: { text: 'WSS Reconnecting… (simulated disconnect)', cls: 'ws-reconnecting' },
      blocked:      { text: 'WSS Blocked — Subscription Denied (unauthorized topic)', cls: 'ws-blocked' },
    };
    const cfg = configs[state] || configs.connected;
    el.textContent = cfg.text;
    el.className   = `ws-status-text ${cfg.cls}`;
    dot.className  = `ws-dot ${cfg.cls}`;
  }

  /* ──────────────────────────────────────────────
     HOOK INTO MAIN app.js dispatchBid
     We monkey-patch by wrapping the global-scope
     version set up in app.js using a custom event
     system, keeping zero coupling.
  ────────────────────────────────────────────── */

  // We intercept bid submissions via a shared global hook.
  // app.js calls window.__securityHook(bid) before dispatching.
  window.__securityHook = function (bid) {
    const reqId = genReqId();
    SEC.lastReqId = reqId;

    // 1. Auth check
    if (!canPlaceBid()) {
      SEC.blockedRequests++;
      updateSecurityMonitor();
      addSecAuditEntry({
        reqId,
        event: 'Unauthorized action blocked',
        outcome: 'DENIED',
        detail: `Role "${SEC.users[SEC.currentRole].role}" cannot place bids`,
        amount: bid.amount,
      });
      showSecAlert('Unauthorized action blocked — your role cannot place bids.', 'error');
      return { allowed: false, reason: 'unauthorized' };
    }

    // 2. Rate limit
    if (!checkRateLimit()) {
      addSecAuditEntry({
        reqId,
        event: 'Rate limit blocked',
        outcome: 'RATE_LIM',
        detail: `Exceeded ${SEC.RL_LIMIT} bids/min — account-level cap`,
        amount: bid.amount,
      });
      showSecAlert(`Rate limit triggered: ${SEC.RL_LIMIT} bids/min exceeded. Retry shortly.`, 'error');
      return { allowed: false, reason: 'rate_limited', reqId };
    }

    // 3. Server-side validation simulation
    const validation = validateBidAmount(bid.amount, window.__auctionState ? window.__auctionState.currentPrice : 0, 250);
    if (!validation.valid) {
      SEC.invalidBidsRejected++;
      SEC.blockedRequests++;
      updateSecurityMonitor();
      addSecAuditEntry({
        reqId,
        event: 'Bid rejected: ' + validation.reason,
        outcome: 'REJECTED',
        detail: 'Server-side validation failed (not trusted from browser)',
        amount: bid.amount,
      });
      showSecAlert(`Validation failed: ${validation.reason}`, 'error');
      return { allowed: false, reason: 'validation', reqId };
    }

    // 4. Idempotency (for retries)
    const idem = checkIdempotency(reqId, bid.amount);
    if (idem.isDuplicate) {
      return { allowed: false, reason: 'duplicate', reqId };
    }

    // Cache request ID (result logged by main engine)
    cacheRequestResult(reqId, { amount: bid.amount, ts: Date.now() });
    bid.__reqId = reqId;

    // 5. Emit accepted security audit entry (after main engine logs acceptance)
    setTimeout(() => {
      addSecAuditEntry({
        reqId,
        event: 'Bid forwarded to sequencer',
        outcome: 'ACCEPTED',
        detail: 'Auth ✓ · Rate ✓ · Validation ✓ · Idempotency ✓',
        amount: bid.amount,
      });
    }, 10);

    return { allowed: true, reqId };
  };

  // Track sequence gap detection from main engine
  window.__secCheckSeq = function (seq) {
    if (SEC.lastSeq !== 0 && seq !== SEC.lastSeq + 1) {
      SEC.seqGaps++;
      updateSecurityMonitor();
    }
    SEC.lastSeq = seq;
  };

  /* ──────────────────────────────────────────────
     EVENT LISTENERS
  ────────────────────────────────────────────── */
  document.addEventListener('DOMContentLoaded', () => {

    // Role switcher
    document.querySelectorAll('.role-option').forEach(btn => {
      btn.addEventListener('click', () => {
        SEC.currentRole = btn.dataset.role;
        updateAuthUI();

        if (!canPlaceBid()) {
          addSecAuditEntry({
            event: 'Role switched — bid access revoked',
            outcome: 'WARNED',
            detail: `Now operating as ${SEC.users[SEC.currentRole].role} — bid placement disabled`,
          });
        }
      });
      btn.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); btn.click(); }
      });
    });

    // WS state simulation buttons
    document.querySelectorAll('[data-ws-state]').forEach(btn => {
      btn.addEventListener('click', () => {
        updateWsStatus(btn.dataset.wsState);
        document.querySelectorAll('[data-ws-state]').forEach(b => b.classList.remove('ws-btn-active'));
        btn.classList.add('ws-btn-active');
      });
    });

    // Retry last request button
    const retryBtn = document.getElementById('btnRetryRequest');
    if (retryBtn) {
      retryBtn.addEventListener('click', () => {
        if (!SEC.lastReqId) {
          showSecAlert('No previous request to retry.', 'warn');
          return;
        }
        const cached = SEC.seenRequestIds.get(SEC.lastReqId);
        if (cached) {
          SEC.duplicatesPrevented++;
          updateSecurityMonitor();
          addSecAuditEntry({
            reqId: SEC.lastReqId,
            event: 'Duplicate request blocked',
            outcome: 'BLOCKED',
            detail: `Idempotency key reused — original result returned (amount: $${cached.amount.toLocaleString()})`,
            amount: cached.amount,
          });
          showSecAlert('Duplicate request detected — original result returned (idempotency key matched).', 'warn');
        } else {
          showSecAlert('Request ID not found in cache (expired). New request would be issued.', 'warn');
        }
      });
    }

    // RL reset (demo)
    const rlResetBtn = document.getElementById('btnRlReset');
    if (rlResetBtn) {
      rlResetBtn.addEventListener('click', () => {
        SEC.rlCount       = 0;
        SEC.rlWindowStart = Date.now();
        SEC.suspiciousFlag = false;
        SEC.recentBidTs   = [];
        const suspEl = document.getElementById('suspiciousStatus');
        if (suspEl) { suspEl.textContent = 'Normal'; suspEl.style.color = ''; }
        updateRateLimitUI();
        showSecAlert('Rate limit window reset (demo).', 'ok');
      });
    }

    // Initial UI state
    updateAuthUI();
    updateWsStatus('connected');
    updateRateLimitUI();
    updateSecurityMonitor();
  });

  /* ──────────────────────────────────────────────
     LIVE RL WINDOW COUNTDOWN
  ────────────────────────────────────────────── */
  setInterval(() => {
    const elapsed = Date.now() - SEC.rlWindowStart;
    const remaining = Math.max(0, Math.ceil((SEC.RL_WINDOW - elapsed) / 1000));
    const el = document.getElementById('rlWindowTimer');
    if (el) el.textContent = remaining + 's';

    // Auto-reset window
    if (elapsed >= SEC.RL_WINDOW) {
      SEC.rlCount       = 0;
      SEC.rlWindowStart = Date.now();
      SEC.suspiciousFlag = false;
      SEC.recentBidTs   = [];
      const suspEl = document.getElementById('suspiciousStatus');
      if (suspEl) { suspEl.textContent = 'Normal'; suspEl.style.color = ''; }
      updateRateLimitUI();
    }
  }, 1000);

})();
