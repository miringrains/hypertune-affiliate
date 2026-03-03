/**
 * Hypertune Affiliate Tracking Snippet
 * Add this script to hypertune.gg to enable affiliate tracking.
 *
 * Usage: <script src="https://hypertune-affiliate.vercel.app/tracking-snippet.js" data-api="https://hypertune-affiliate.vercel.app"></script>
 */
(function () {
  var script = document.currentScript;
  var apiBase = script && script.getAttribute("data-api") || "https://hypertune-affiliate.vercel.app";

  var params = new URLSearchParams(window.location.search);
  var amId = params.get("am_id");

  if (amId) {
    var img = new Image();
    img.src =
      apiBase +
      "/api/track/click?am_id=" +
      encodeURIComponent(amId) +
      "&ref=" +
      encodeURIComponent(document.referrer || "") +
      "&page=" +
      encodeURIComponent(window.location.pathname) +
      "&redirect=none";

    // Also store in cookie client-side as fallback
    document.cookie =
      "ht_aff=" +
      encodeURIComponent(amId) +
      ";max-age=" +
      90 * 24 * 60 * 60 +
      ";path=/;SameSite=Lax";
  }

  // Expose helper for signup forms
  window.HypertuneAffiliate = {
    getAffiliateId: function () {
      var match = document.cookie.match(/(?:^|;\s*)ht_aff=([^;]*)/);
      return match ? decodeURIComponent(match[1]) : null;
    },
  };
})();
