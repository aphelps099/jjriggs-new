/* JJ Riggs — Meta (Facebook/Instagram) paid-ads tracking + campaign attribution
   Companion to js/analytics.js (GA4). Spec: FACEBOOK-GEOFENCING-PLAYBOOK.md §8.

   What this file does on every public page:
     1. Captures campaign attribution (utm_* + fbclid) from the landing URL
        into sessionStorage — first touch wins for the visit. Exposed as
        window.jjAttribution() so contact.html can attach it to leads.
        This runs even before the pixel ID is configured.
     2. Loads the Meta base pixel and fires PageView.
     3. Fires ViewContent on equipment detail pages (product.html, mower.html,
        or any page opened with a ?model= query).
     4. Fires Contact when any tel: link is clicked (GA4 call_click stays in
        analytics.js — both run).
     5. Exposes window.jjMetaLead(type) — contact.html calls it ONLY after
        /api/lead returns success. Never fire Lead for a form that merely
        opened; Meta optimizes toward whatever this event marks.

   To enable, paste the dataset/pixel ID from Meta Events Manager below.
   Until then the pixel is a safe stub: events log to console.debug and
   nothing is sent anywhere.
*/
(function(){
  'use strict';

  // ====== META SETUP ======
  // Replace with the real dataset/pixel ID (digits only, e.g. '1234567890123').
  var PIXEL_ID = 'PASTE_PIXEL_ID_HERE';

  // ====== 1. Campaign attribution capture ======
  var PARAMS = ['utm_source','utm_medium','utm_campaign','utm_term','utm_content','fbclid'];
  try {
    var qs = new URLSearchParams(location.search);
    var hasAny = PARAMS.some(function(k){ return !!qs.get(k); });
    // First touch wins: a visitor who lands from an ad then browses around
    // keeps the ad attribution for the whole visit.
    if (hasAny && !sessionStorage.getItem('jj_attr')) {
      var attr = { landing_page: location.pathname };
      PARAMS.forEach(function(k){
        var v = qs.get(k);
        if (v) attr[k] = String(v).slice(0, 200);
      });
      sessionStorage.setItem('jj_attr', JSON.stringify(attr));
    }
  } catch (e) { /* sessionStorage unavailable (private mode etc.) — skip */ }

  window.jjAttribution = function(){
    try { return JSON.parse(sessionStorage.getItem('jj_attr') || 'null'); }
    catch (e) { return null; }
  };

  // ====== 2. Pixel loader ======
  var enabled = PIXEL_ID && PIXEL_ID.indexOf('PASTE') === -1;
  if (enabled) {
    /* Standard Meta pixel bootstrap */
    !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){
      n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};
      if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];
      t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];
      s.parentNode.insertBefore(t,s)}(window,document,'script',
      'https://connect.facebook.net/en_US/fbevents.js');
    window.fbq('init', PIXEL_ID);
  } else {
    // Stub so every call below works (and is visible) before setup.
    window.fbq = window.fbq || function(){
      if (window.console && console.debug) {
        console.debug('[meta-stub]', Array.prototype.slice.call(arguments));
      }
    };
  }
  window.fbq('track', 'PageView');

  // ====== 3. ViewContent on equipment detail pages ======
  function onReady(fn){
    if (document.readyState !== 'loading') fn();
    else document.addEventListener('DOMContentLoaded', fn);
  }
  onReady(function(){
    var isDetail = /(product|mower)\.html$/.test(location.pathname) ||
                   new URLSearchParams(location.search).get('model');
    if (isDetail) {
      // Title is set by the page's own data render; strip the site suffix.
      window.fbq('track', 'ViewContent', {
        content_name: (document.title || '').split('—')[0].trim().slice(0, 100)
      });
    }
  });

  // ====== 4. Contact on call clicks ======
  onReady(function(){
    document.addEventListener('click', function(e){
      var el = e.target.closest && e.target.closest('a');
      if (el && (el.getAttribute('href') || '').toLowerCase().indexOf('tel:') === 0) {
        window.fbq('track', 'Contact');
      }
    });
  });

  // ====== 5. Lead — called by contact.html after /api/lead success ======
  window.jjMetaLead = function(type){
    window.fbq('track', 'Lead', { content_category: type || 'lead' });
  };
})();
