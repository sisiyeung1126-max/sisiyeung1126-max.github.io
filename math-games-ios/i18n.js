/**
 * i18n.js — SSOT for written UI script: tc | sc | en
 * Load before unit-common / page applyLang helpers.
 * Uses var for old-WKWebView compatibility.
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
      return normalizeLang(localStorage.getItem('lang'));
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
    if (lang === 'sc') return (sc != null && sc !== '') ? sc : zh;
    return zh;
  }

  function i18nNeedsHtml(str) {
    if (!str) return false;
    return /&lt;|&gt;|&amp;|<\/?[a-z]/i.test(str);
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
      if (zhHtml != null || enHtml != null) {
        var html = lang === 'en' ? (enHtml || zhHtml)
          : lang === 'sc' ? (scHtml || zhHtml) : zhHtml;
        if (html != null) n.innerHTML = html;
        continue;
      }
      var zh = n.getAttribute('data-zh');
      var sc = n.getAttribute('data-sc');
      var en = n.getAttribute('data-en');
      if (lang === 'en' && (en == null || en === '') && zh == null) continue;
      var text = lang === 'en' ? (en || zh)
        : lang === 'sc' ? (sc || zh) : zh;
      if (text == null) continue;
      if (i18nNeedsHtml(text)) n.innerHTML = text;
      else if (n.innerHTML && /<(?:strong|b|em)\b/i.test(n.innerHTML) &&
          !i18nNeedsHtml(text) && String(text).indexOf('<') < 0) {
        continue;
      } else {
        n.textContent = text;
      }
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

  function cycleLang() {
    var order = ['tc', 'sc', 'en'];
    var cur = getLang();
    var idx = order.indexOf(cur);
    return setLang(order[(idx < 0 ? 0 : idx + 1) % order.length]);
  }

  /** Button shows the NEXT script in the cycle tc → sc → en → tc. */
  function langBtnLabel(lang) {
    lang = normalizeLang(lang || getLang());
    if (lang === 'tc') return '简';
    if (lang === 'sc') return 'EN';
    return '繁';
  }

  function langBtnAria(lang) {
    lang = normalizeLang(lang || getLang());
    if (lang === 'tc') return t('切換至簡體中文', '切换至简体中文', 'Switch to Simplified Chinese');
    if (lang === 'sc') return t('切換至英文', '切换至英文', 'Switch to English');
    return t('切換至繁體中文', '切换至繁体中文', 'Switch to Traditional Chinese');
  }

  global.HKCi18n = {
    normalizeLang: normalizeLang,
    getLang: getLang,
    setLang: setLang,
    isSC: isSC,
    isEN: isEN,
    t: t,
    applyI18n: applyI18n,
    cycleLang: cycleLang,
    langBtnLabel: langBtnLabel,
    langBtnAria: langBtnAria,
    setDocumentLang: setDocumentLang
  };

  try {
    setDocumentLang(getLang());
  } catch (eBoot) {}
})(typeof window !== 'undefined' ? window : this);
