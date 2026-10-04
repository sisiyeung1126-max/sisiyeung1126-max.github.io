/**
 * i18n.js — SSOT for written UI script: tc | sc | en
 * Load before unit-common / page applyLang helpers.
 * Uses var for old-WKWebView compatibility.
 *
 * Voice rule: selecting written English MUST also switch TTS to en-GB
 * and keep it English while the UI is English. 繁↔简 do not rewrite tts_lang.
 */
(function (global) {
  'use strict';

  var VALID = { tc: 1, sc: 1, en: 1 };

  function normalizeLang(raw) {
    var v = String(raw == null ? '' : raw).toLowerCase();
    if (v === 'zh' || v === 'zh-hant' || v === 'zh-tw' || v === 'zh-hk') return 'tc';
    if (v === 'zh-hans' || v === 'zh-cn' || v === 'cn') return 'sc';
    if (v === 'en' || v === 'en-gb' || v === 'en-hk' || v === 'en-us') return 'en';
    if (VALID[v]) return v;
    return 'tc';
  }

  function getLang() {
    try {
      var raw = localStorage.getItem('lang');
      var canon = normalizeLang(raw);
      // Rewrite legacy values (en-HK, zh-Hant) so every `=== 'en'` fallback agrees.
      // Do not invent 'tc' when the key is still empty — native restore may fill it.
      if (raw != null && raw !== '' && raw !== canon) {
        try { localStorage.setItem('lang', canon); } catch (eSet) {}
        try { if (global.HKC && HKC.persistFlag) HKC.persistFlag('lang', canon); } catch (eP) {}
      }
      return canon;
    } catch (e) {
      return 'tc';
    }
  }

  function setDocumentLang(next) {
    try {
      document.documentElement.lang =
        next === 'sc' ? 'zh-Hans' : (next === 'en' ? 'en' : 'zh-Hant');
    } catch (e2) {}
  }

  function setLang(next) {
    next = normalizeLang(next);
    try {
      localStorage.setItem('lang', next);
      if (global.HKC && HKC.persistFlag) HKC.persistFlag('lang', next);
    } catch (e) {}
    setDocumentLang(next);
    if (next === 'en') ensureEnglishVoice();
    try { syncLangChips(); } catch (eChips) {}
    try {
      document.dispatchEvent(new CustomEvent('langChanged', { detail: { lang: next } }));
    } catch (e3) {}
    return next;
  }

  function isSC() {
    return getLang() === 'sc';
  }

  function isEN() {
    return getLang() === 'en';
  }

  /** t(zh, sc[, en]) — Traditional Chinese is the ultimate fallback. */
  function t(zh, sc, en) {
    var lang = getLang();
    if (lang === 'en') return (en != null && en !== '') ? en : zh;
    if (lang === 'sc') {
      var chosen = (sc != null && sc !== '') ? sc : zh;
      try {
        if (global.L10nTcSc && L10nTcSc.toSc) return L10nTcSc.toSc(chosen);
      } catch (eSc) {}
      return chosen;
    }
    return zh;
  }

  function i18nNeedsHtml(str) {
    if (!str) return false;
    return /&lt;|&gt;|&amp;|<\/?[a-z]/i.test(str);
  }

  /** Decode escaped <strong> only — never a general entity unescape. */
  function unescapeI18nHtml(html) {
    if (html == null || html === '') return html;
    return String(html).replace(/&lt;(\/?strong)&gt;/gi, '<$1>');
  }

  function applyI18n(root) {
    root = root || document;
    var lang = getLang();
    var nodes = root.querySelectorAll('[data-zh], [data-en], [data-zh-html], [data-en-html]');
    for (var i = 0; i < nodes.length; i++) {
      var n = nodes[i];
      var zhHtml = n.getAttribute('data-zh-html');
      var scHtml = n.getAttribute('data-sc-html');
      var enHtml = n.getAttribute('data-en-html');
      // Lang chip + paywall × must keep their JS-owned glyph; data-zh
      // labels belong on aria only (stacked「關閉訂閱方案」broke the close hit target).
      if (n.id === 'langBtn' || n.id === 'langBtnMobile' || n.id === 'ttsBtn' || n.id === 'pwCloseBtn') continue;
      if (n.id === 'appLoader' || n.id === 'appStatus') continue;
      if (n.classList && (n.classList.contains('lang-btn') || n.classList.contains('tts-btn') || n.classList.contains('pw-v2-close') || n.classList.contains('launch-sub') || n.classList.contains('launch-title'))) continue;
      if (zhHtml != null || enHtml != null) {
        var html = lang === 'en' ? (enHtml || zhHtml)
          : lang === 'sc' ? (scHtml || zhHtml) : zhHtml;
        if (html != null) n.innerHTML = unescapeI18nHtml(html);
        continue;
      }
      var zh = n.getAttribute('data-zh');
      var sc = n.getAttribute('data-sc');
      var en = n.getAttribute('data-en');
      if (lang === 'en' && (en == null || en === '') && zh == null) continue;
      var text = lang === 'en' ? (en || zh)
        : lang === 'sc' ? (sc || zh) : zh;
      if (text == null) continue;
      var suffix = n.getAttribute('data-i18n-suffix');
      if (suffix) text = String(text) + suffix;
      // Always apply data-en/zh/sc. Plain English on a node that still has
      // leftover <strong> Chinese (U1–U12 concept pages) must replace, not skip.
      if (i18nNeedsHtml(text)) n.innerHTML = unescapeI18nHtml(text);
      else n.textContent = text;
    }

    var phNodes = root.querySelectorAll('[data-ph-zh], [data-ph-en]');
    for (var p = 0; p < phNodes.length; p++) {
      var inp = phNodes[p];
      var phZh = inp.getAttribute('data-ph-zh');
      var phSc = inp.getAttribute('data-ph-sc');
      var phEn = inp.getAttribute('data-ph-en');
      var ph = lang === 'en' ? (phEn || phZh)
        : lang === 'sc' ? (phSc || phZh) : phZh;
      if (ph != null) inp.placeholder = ph;
    }

    var ariaNodes = root.querySelectorAll('[data-zh-aria], [data-en-aria]');
    for (var a = 0; a < ariaNodes.length; a++) {
      var el = ariaNodes[a];
      var ariaZh = el.getAttribute('data-zh-aria');
      var ariaSc = el.getAttribute('data-sc-aria');
      var ariaEn = el.getAttribute('data-en-aria');
      var aria = lang === 'en' ? (ariaEn || ariaZh)
        : lang === 'sc' ? (ariaSc || ariaZh) : ariaZh;
      if (aria != null) el.setAttribute('aria-label', aria);
    }
  }

  /** Bind once per host so CPO toys can re-paint chrome on live written-lang switch. */
  function bindWrittenLang(host, fn) {
    if (typeof fn !== 'function') return;
    var flagEl = (host && host.nodeType === 1) ? host : (typeof document !== 'undefined' ? document.documentElement : null);
    if (!flagEl || flagEl._hkcWrittenLangBound) return;
    flagEl._hkcWrittenLangBound = true;
    try { document.addEventListener('writtenLangRelocalize', fn); } catch (eBind) {}
  }

  function defaultTtsForWritten(lang) {
    lang = normalizeLang(lang);
    if (lang === 'en') return 'en-GB';
    if (lang === 'sc') {
      try {
        return (global.localStorage && localStorage.getItem('hkc_region') === 'TW')
          ? 'zh-TW' : 'zh-CN';
      } catch (eTts) { return 'zh-CN'; }
    }
    return 'zh-HK';
  }

  function persistTtsLang(tts) {
    try { localStorage.setItem('tts_lang', tts); } catch (e1) {}
    try {
      if (global.HKC && HKC.persistFlag) HKC.persistFlag('tts_lang', tts);
    } catch (e2) {}
    global._currentTtsLang = tts;
    try {
      var ios = global.webkit && global.webkit.messageHandlers;
      if (ios && ios.setTtsLanguage) ios.setTtsLanguage.postMessage({ language: tts });
    } catch (e3) {}
    try {
      if (global.AndroidApp && global.AndroidApp.setTtsLanguage) global.AndroidApp.setTtsLanguage(tts);
    } catch (e4) {}
    try {
      if (global.AndroidApp && global.AndroidApp.saveString) global.AndroidApp.saveString('tts_lang', tts);
    } catch (e5) {}
  }

  function isMandarinTts(lang) {
    return lang === 'zh-CN' || lang === 'zh-TW';
  }

  function isEnglishTts(lang) {
    return /^en([-_]|$)/i.test(String(lang || ''));
  }

  function preferredMandarinTts() {
    try {
      return (global.localStorage && localStorage.getItem('hkc_region') === 'TW')
        ? 'zh-TW' : 'zh-CN';
    } catch (eTts) { return 'zh-CN'; }
  }

  /** Written English always speaks English. Heal leftover 粤/普 without native spam. */
  function ensureEnglishVoice() {
    var stored = null;
    try { stored = localStorage.getItem('tts_lang'); } catch (eGet) {}
    if (stored === 'en-GB') {
      global._currentTtsLang = 'en-GB';
      return 'en-GB';
    }
    persistTtsLang('en-GB');
    return 'en-GB';
  }

  function getTtsLang() {
    if (getLang() === 'en') return ensureEnglishVoice();
    try {
      var stored = localStorage.getItem('tts_lang');
      if (stored) return stored;
    } catch (eGet) {}
    if (global._currentTtsLang) return global._currentTtsLang;
    return defaultTtsForWritten(getLang());
  }

  /** Resolve Settings「普通話」to zh-TW or zh-CN per onboarding region. */
  function normalizeTtsChoice(lang) {
    if (lang === 'zh-CN') return preferredMandarinTts();
    return lang;
  }

  function setTtsLang(lang) {
    if (getLang() === 'en') return ensureEnglishVoice();
    lang = normalizeTtsChoice(lang);
    persistTtsLang(lang);
    return lang;
  }

  function ttsCycleOrder() {
    var mandarin = preferredMandarinTts();
    var order = ['zh-HK', mandarin, 'en-GB'];
    var seen = {};
    var out = [];
    for (var i = 0; i < order.length; i++) {
      if (!seen[order[i]]) {
        seen[order[i]] = 1;
        out.push(order[i]);
      }
    }
    return out;
  }

  function cycleTtsLang() {
    if (getLang() === 'en') return ensureEnglishVoice();
    var order = ttsCycleOrder();
    var cur = getTtsLang();
    var idx = order.indexOf(cur);
    if (idx < 0) {
      if (isMandarinTts(cur)) idx = order.indexOf(preferredMandarinTts());
      else if (isEnglishTts(cur)) idx = order.indexOf('en-GB');
      else idx = 0;
    }
    return setTtsLang(order[(idx + 1) % order.length]);
  }

  function cycleLang() {
    var order = ['tc', 'sc', 'en'];
    var cur = getLang();
    var idx = order.indexOf(cur);
    return setLang(order[(idx < 0 ? 0 : idx + 1) % order.length]);
  }

  /** Voice chip: current → next (same metaphor as the written chip). */
  function ttsBtnLabel(tts) {
    if (getLang() === 'en') return 'EN';
    tts = tts || getTtsLang();
    if (tts === 'zh-HK') return '粤→普';
    if (isMandarinTts(tts)) return '普→EN';
    return 'EN→粤';
  }

  function ttsBtnAria(tts) {
    if (getLang() === 'en') {
      return t('英文畫面使用英文語音', '英文画面使用英文语音', 'English on screen uses English voice');
    }
    tts = tts || getTtsLang();
    if (tts === 'zh-HK') {
      return t('現在是廣東話語音。點一下切換至普通話', '现在是广东话语音。点一下切换至普通话', 'Now Cantonese voice. Tap for Mandarin');
    }
    if (isMandarinTts(tts)) {
      return t('現在是普通話語音。點一下切換至英文', '现在是普通话语音。点一下切换至英文', 'Now Mandarin voice. Tap for English');
    }
    return t('現在是英文語音。點一下切換至廣東話', '现在是英文语音。点一下切换至广东话', 'Now English voice. Tap for Cantonese');
  }

  /** Chip shows current → next so kids know where they are and what tap does. */
  function langBtnLabel(lang) {
    lang = normalizeLang(lang || getLang());
    if (lang === 'tc') return '繁→简';
    if (lang === 'sc') return '简→EN';
    return 'EN→繁';
  }

  function langBtnAria(lang) {
    lang = normalizeLang(lang || getLang());
    if (lang === 'tc') {
      return t('現在是繁體中文。點一下切換至簡體中文', '现在是繁体中文。点一下切换至简体中文', 'Now Traditional Chinese. Tap for Simplified Chinese');
    }
    if (lang === 'sc') {
      return t('現在是簡體中文。點一下切換至英文', '现在是简体中文。点一下切换至英文', 'Now Simplified Chinese. Tap for English');
    }
    return t('現在是英文。點一下切換至繁體中文', '现在是英文。点一下切换至繁体中文', 'Now English. Tap for Traditional Chinese');
  }

  function syncLangChips(root) {
    root = root || document;
    if (!root || !root.querySelectorAll) return;
    var written = langBtnLabel();
    var writtenAria = langBtnAria();
    var voice = ttsBtnLabel();
    var voiceAria = ttsBtnAria();
    var langBtns = root.querySelectorAll('#langBtn, #langBtnMobile');
    var i;
    for (i = 0; i < langBtns.length; i++) {
      langBtns[i].textContent = written;
      langBtns[i].setAttribute('aria-label', writtenAria);
    }
    var ttsBtns = root.querySelectorAll('#ttsBtn');
    var voiceLocked = getLang() === 'en';
    for (i = 0; i < ttsBtns.length; i++) {
      ttsBtns[i].textContent = voice;
      ttsBtns[i].setAttribute('aria-label', voiceAria);
      ttsBtns[i].setAttribute('aria-disabled', voiceLocked ? 'true' : 'false');
    }
    try { document.documentElement.classList.add('lang-ready'); } catch (eReady) {}
  }

  global.HKCi18n = {
    normalizeLang: normalizeLang,
    getLang: getLang,
    setLang: setLang,
    isSC: isSC,
    isEN: isEN,
    t: t,
    applyI18n: applyI18n,
    unescapeI18nHtml: unescapeI18nHtml,
    bindWrittenLang: bindWrittenLang,
    cycleLang: cycleLang,
    langBtnLabel: langBtnLabel,
    langBtnAria: langBtnAria,
    syncLangChips: syncLangChips,
    setDocumentLang: setDocumentLang,
    defaultTtsForWritten: defaultTtsForWritten,
    persistTtsLang: persistTtsLang,
    ensureEnglishVoice: ensureEnglishVoice,
    getTtsLang: getTtsLang,
    setTtsLang: setTtsLang,
    cycleTtsLang: cycleTtsLang,
    ttsBtnLabel: ttsBtnLabel,
    ttsBtnAria: ttsBtnAria,
    isMandarinTts: isMandarinTts,
    isEnglishTts: isEnglishTts,
    preferredMandarinTts: preferredMandarinTts
  };

  try {
    setDocumentLang(getLang());
    if (getLang() === 'en') ensureEnglishVoice();
  } catch (eBoot) {}
  try {
    if (typeof document !== 'undefined') {
      document.addEventListener('hkc:storage-restored', function () {
        try {
          if (getLang() === 'en') ensureEnglishVoice();
        } catch (eHeal) {}
        try { syncLangChips(); } catch (eChips) {}
      });
    }
  } catch (eRestore) {}
  try {
    if (typeof document !== 'undefined') {
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () { syncLangChips(); });
      } else {
        syncLangChips();
      }
    }
  } catch (eSync) {}
})(typeof window !== 'undefined' ? window : this);
