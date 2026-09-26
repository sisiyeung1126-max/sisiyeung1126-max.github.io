/**
 * app-store.js — Sobo Math App Store listing SSOT.
 *
 * Live listing (iTunes lookup bundleId=com.kwokwaiyeung.mathgames):
 *   6785965928  Sobo Math
 * Never use 6761062579 (小學中文大冒險 / ChineseGames).
 *
 * Kids Category: do not nag the child. Callers must parent-gate before
 * opening the write-review URL (this helper can request ParentGate).
 */
var MathGamesAppStore = (function () {
  'use strict';

  var LISTING_ID = '6785965928';
  var LEGACY_CHINESE_GAMES_ID = '6761062579';

  function isValidListingId(id) {
    return /^\d{6,}$/.test(String(id || '')) && String(id) !== LEGACY_CHINESE_GAMES_ID;
  }

  function getListingId() {
    var id = '';
    try {
      if (window.__mathGamesAppId) id = String(window.__mathGamesAppId);
    } catch (e0) {}
    if (!isValidListingId(id)) id = LISTING_ID;
    return isValidListingId(id) ? String(id) : '';
  }

  function getListingUrl() {
    var id = getListingId();
    if (!id) return null;
    return 'https://apps.apple.com/hk/app/id' + id;
  }

  function getWriteReviewUrl() {
    var id = getListingId();
    if (!id) return null;
    return 'https://apps.apple.com/app/id' + id + '?action=write-review';
  }

  function launchUrl(url, parentVerified) {
    if (!url) return null;
    var passed = !!parentVerified;
    try {
      if (typeof openExternalURL === 'function') {
        openExternalURL(url, passed);
        return url;
      }
    } catch (e0) {}
    var payload = { url: url };
    if (passed) payload.parentGatePassed = true;
    try {
      var ios = window.webkit && window.webkit.messageHandlers;
      if (ios && ios.openURL) {
        ios.openURL.postMessage(payload);
        return url;
      }
    } catch (e1) {}
    try {
      if (window.AndroidApp && AndroidApp.openURL) {
        AndroidApp.openURL(url, passed);
        return url;
      }
    } catch (e2) {}
    try {
      window.open(url, '_blank', 'noopener');
    } catch (e3) {
      try { window.location.href = url; } catch (e4) {}
    }
    return url;
  }

  function openWriteReview(opts) {
    opts = opts || {};
    var url = getWriteReviewUrl();
    if (!url) return null;
    try {
      if (window.EventTracker) {
        EventTracker.log('app_store_review_open', { source: opts.source || 'unknown' });
      }
    } catch (eLog) {}
    function go() {
      launchUrl(url, true);
    }
    if (opts.parentVerified) {
      go();
      return url;
    }
    if (window.ParentGate && typeof ParentGate.request === 'function') {
      ParentGate.request({ reason: 'app_store_review', onSuccess: go });
      return url;
    }
    return launchUrl(url, false);
  }

  try {
    if (!window.__mathGamesAppId || !isValidListingId(window.__mathGamesAppId)) {
      window.__mathGamesAppId = LISTING_ID;
    }
  } catch (eSeed) {}

  return {
    LISTING_ID: LISTING_ID,
    getListingId: getListingId,
    getListingUrl: getListingUrl,
    getWriteReviewUrl: getWriteReviewUrl,
    openWriteReview: openWriteReview
  };
})();
