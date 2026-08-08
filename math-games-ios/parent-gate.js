/**
 * parent-gate.js — short adult verification before parent-only and purchase UI.
 * A successful challenge is remembered in this web session long enough to cover
 * open-paywall → StoreKit purchase (Wave Energy-P0: 12 min, was 2 min).
 */
var ParentGate = (function(){
  'use strict';

  var KEY = 'hkc_parent_gate_until';
  var ATTEMPTS_KEY = 'hkc_parent_gate_attempts';
  var LOCK_KEY = 'hkc_parent_gate_locked_until';
  /** Wave Energy-P0: cover paywall browse + purchase without a second gate. */
  var TTL_MS = 12 * 60 * 1000;
  var MAX_ATTEMPTS = 3;
  var LOCK_MS = 30 * 1000;
  var HOLD_MS = 2000;
  var inerted = [];
  var returnFocus = null;

  function isSC(){
    try {
      if (window.HKCi18n && HKCi18n.isSC) return HKCi18n.isSC();
      return localStorage.getItem('lang') === 'sc';
    } catch(e){ return false; }
  }

  function isEN(){
    try {
      if (window.HKCi18n && HKCi18n.isEN) return HKCi18n.isEN();
      return localStorage.getItem('lang') === 'en';
    } catch(e){ return false; }
  }

  function t(zh, sc, en){
    if (window.HKCi18n && HKCi18n.t) return HKCi18n.t(zh, sc, en);
    if (isEN()) return (en != null && en !== '') ? en : zh;
    if (isSC()) return (sc != null && sc !== '') ? sc : zh;
    return zh;
  }

  function isUnlocked(){
    try { return Number(sessionStorage.getItem(KEY) || 0) > Date.now(); } catch(e){ return false; }
  }

  function unlock(){
    try {
      sessionStorage.setItem(KEY, String(Date.now() + TTL_MS));
      sessionStorage.removeItem(ATTEMPTS_KEY);
      sessionStorage.removeItem(LOCK_KEY);
    } catch(e){}
  }

  function removeGate(){
    var old = document.getElementById('parentGateOverlay');
    if (old && old.parentNode) old.parentNode.removeChild(old);
    for (var i = 0; i < inerted.length; i++) {
      if (!inerted[i].hadInert) inerted[i].el.removeAttribute('inert');
    }
    inerted = [];
    if (returnFocus && returnFocus.focus) {
      try { returnFocus.focus(); } catch(e){}
    }
    returnFocus = null;
  }

  function request(options){
    options = options || {};
    if (isUnlocked()) {
      if (options.onSuccess) options.onSuccess();
      return;
    }
    var isIOSApp = !!(window.__deviceInfo && window.__deviceInfo.platform === 'iOS');
    if (isIOSApp && !options._nativeAttempted &&
        window.AndroidApp && typeof window.AndroidApp.requestParentAuth === 'function') {
      options._nativeAttempted = true;
      var settled = false;
      // Kids-category production rule: iOS device-owner auth must fail closed.
      // The web challenge below is for browser preview only, never an iOS fallback.
      var fallbackTimer = setTimeout(function(){
        if (settled) return;
        settled = true;
        try { if (window.EventTracker) EventTracker.log('parent_gate_result', { method:'native', ok:0, reason:'timeout' }); } catch(eLog){}
        if (options.onCancel) options.onCancel();
      }, 15000);
      window.AndroidApp.requestParentAuth(function(verified){
        if (settled) return;
        settled = true;
        clearTimeout(fallbackTimer);
        if (verified) {
          try { if (window.EventTracker) EventTracker.log('parent_gate_result', { method:'native', ok:1 }); } catch(eLog){}
          unlock();
          if (options.onSuccess) options.onSuccess();
          return;
        }
        try { if (window.EventTracker) EventTracker.log('parent_gate_result', { method:'native', ok:0, reason:'denied' }); } catch(eLog2){}
        if (options.onCancel) options.onCancel();
      });
      return;
    }
    if (isIOSApp) {
      // Native bridge unavailable or already attempted: do not downgrade to a
      // child-solvable arithmetic prompt in production.
      try { if (window.EventTracker) EventTracker.log('parent_gate_result', { method:'native', ok:0, reason:'unavailable' }); } catch(eUnavailable){}
      if (options.onCancel) options.onCancel();
      return;
    }
    removeGate();
    // Browser-preview fallback only. Use a multi-step adult check plus hold;
    // production iOS always uses device-owner authentication above.
    var factorA = 17 + Math.floor(Math.random() * 13);
    var factorB = 14 + Math.floor(Math.random() * 12);
    var offset = 37 + Math.floor(Math.random() * 53);
    var answer = factorA * factorB + offset;
    var attempts = 0;
    var lockedUntil = 0;
    try {
      attempts = Number(sessionStorage.getItem(ATTEMPTS_KEY) || 0);
      lockedUntil = Number(sessionStorage.getItem(LOCK_KEY) || 0);
    } catch(e){}
    if (lockedUntil && lockedUntil <= Date.now()) {
      attempts = 0;
      lockedUntil = 0;
      try {
        sessionStorage.removeItem(ATTEMPTS_KEY);
        sessionStorage.removeItem(LOCK_KEY);
      } catch(e){}
    }
    returnFocus = document.activeElement;
    var overlay = document.createElement('div');
    overlay.id = 'parentGateOverlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-labelledby', 'parentGateTitle');
    overlay.style.cssText = 'position:fixed;inset:0;z-index:20000;background:rgba(13,33,55,.88);display:flex;align-items:center;justify-content:center;padding:20px;';
    overlay.innerHTML =
      '<div style="width:min(380px,94vw);background:#fff;border-radius:22px;padding:24px 20px;text-align:center;box-shadow:0 18px 50px rgba(0,0,0,.35)">' +
        '<div style="font-size:2rem">👨‍👩‍👧</div>' +
        '<h2 id="parentGateTitle" style="margin:8px 0;color:#143a57;font-size:1.2rem">' +
          t('請家長完成驗證', '请家长完成验证', 'Parent verification') + '</h2>' +
        '<p style="color:#5a6282;line-height:1.5;margin:0 0 14px">' +
          t('此區域包含家長資料、外部操作或購買選項。瀏覽器預覽請由成年人完成驗證。',
            '此区域包含家长资料、外部操作或购买选项。浏览器预览请由成年人完成验证。',
            'This area includes parent information, external actions, or purchase options. An adult should complete this browser-preview check.') + '</p>' +
        '<label for="parentGateAnswer" style="display:block;font-weight:900;color:#143a57;margin-bottom:8px">' +
          factorA + ' × ' + factorB + ' + ' + offset + ' = ?</label>' +
        '<input id="parentGateAnswer" type="number" inputmode="numeric" autocomplete="off" ' +
          'style="width:100%;min-height:52px;border:2px solid #bfe0f5;border-radius:14px;text-align:center;font-size:1.4rem;font-weight:900">' +
        '<p id="parentGateError" role="alert" aria-live="polite" style="min-height:22px;color:#b71c1c;margin:8px 0 0"></p>' +
        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:10px">' +
          '<button type="button" id="parentGateCancel" style="min-height:48px;border:1px solid #d8eaf6;border-radius:14px;background:#fff;font-weight:800">' +
            t('取消', '取消', 'Cancel') + '</button>' +
          '<button type="button" id="parentGateConfirm" style="min-height:48px;border:0;border-radius:14px;background:#2f7fbf;color:#fff;font-weight:900">' +
            t('按住 2 秒確認', '按住 2 秒确认', 'Hold 2 seconds to confirm') + '</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(overlay);
    var bodyChildren = document.body.children || [];
    for (var ci = 0; ci < bodyChildren.length; ci++) {
      var child = bodyChildren[ci];
      if (child === overlay) continue;
      inerted.push({ el: child, hadInert: child.hasAttribute && child.hasAttribute('inert') });
      if (child.setAttribute) child.setAttribute('inert', '');
    }
    var input = document.getElementById('parentGateAnswer');
    var error = document.getElementById('parentGateError');
    var confirmBtn = document.getElementById('parentGateConfirm');
    function confirm(){
      if (Date.now() < lockedUntil) return;
      if (Number(input.value) !== answer) {
        try { if (window.EventTracker) EventTracker.log('parent_gate_attempt', { method:'web', ok:0 }); } catch(eLog){}
        attempts++;
        try { sessionStorage.setItem(ATTEMPTS_KEY, String(attempts)); } catch(e){}
        if (attempts >= MAX_ATTEMPTS) {
          lockedUntil = Date.now() + LOCK_MS;
          try { sessionStorage.setItem(LOCK_KEY, String(lockedUntil)); } catch(e){}
          error.textContent = t('嘗試次數過多，請稍後再試。', '尝试次数过多，请稍后再试。', 'Too many attempts. Please try again later.');
          input.disabled = true;
          confirmBtn.disabled = true;
          return;
        }
        error.textContent = t('答案不正確，請成年人再試一次。', '答案不正确，请成年人再试一次。', 'Incorrect answer. Please ask an adult to try again.');
        input.select();
        return;
      }
      unlock();
      try { if (window.EventTracker) EventTracker.log('parent_gate_result', { method:'web', ok:1 }); } catch(eLog){}
      removeGate();
      if (options.onSuccess) options.onSuccess();
    }
    document.getElementById('parentGateCancel').onclick = function(){
      removeGate();
      if (options.onCancel) options.onCancel();
    };
    var holdTimer = null;
    function beginHold(e){
      if (e && e.preventDefault) e.preventDefault();
      if (confirmBtn.disabled || Date.now() < lockedUntil || holdTimer) return;
      confirmBtn.textContent = t('繼續按住…', '继续按住…', 'Keep holding…');
      holdTimer = setTimeout(function(){ holdTimer = null; confirm(); }, HOLD_MS);
    }
    function cancelHold(){
      if (holdTimer) clearTimeout(holdTimer);
      holdTimer = null;
      if (!confirmBtn.disabled) confirmBtn.textContent = t('按住 2 秒確認', '按住 2 秒确认', 'Hold 2 seconds to confirm');
    }
    confirmBtn.onclick = function(e){ if (e) e.preventDefault(); };
    confirmBtn.onpointerdown = beginHold;
    confirmBtn.onpointerup = cancelHold;
    confirmBtn.onpointerleave = cancelHold;
    confirmBtn.onkeydown = function(e){
      if (e.key === 'Enter' || e.key === ' ') beginHold(e);
    };
    confirmBtn.onkeyup = function(e){
      if (e.key === 'Enter' || e.key === ' ') cancelHold();
    };
    overlay.onkeydown = function(e){
      if (e.key === 'Escape') {
        e.preventDefault();
        document.getElementById('parentGateCancel').click();
        return;
      }
      if (e.key !== 'Tab') return;
      var focusable = overlay.querySelectorAll('input:not([disabled]),button:not([disabled])');
      if (!focusable.length) return;
      var first = focusable[0], last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    if (lockedUntil > Date.now()) {
      error.textContent = t('驗證暫時鎖定，請稍後再試。', '验证暂时锁定，请稍后再试。', 'Verification locked briefly. Please try again later.');
      input.disabled = true;
      confirmBtn.disabled = true;
    }
    setTimeout(function(){
      if (!input.disabled) input.focus();
      else document.getElementById('parentGateCancel').focus();
    }, 0);
  }

  return { request: request, isUnlocked: isUnlocked, lock: function(){ try { sessionStorage.removeItem(KEY); } catch(e){} } };
})();
