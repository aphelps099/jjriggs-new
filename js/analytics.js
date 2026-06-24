/* JJ Riggs — GA4 funnel events
   Loaded on every page. Fires standard + custom events so Andrew can
   build a real funnel in GA4 (Reports → Engagement → Events / Funnels).

   Events fired automatically:
     - page_view               (default GA4)
     - call_click              (any tel: link clicked)
     - directions_click        (Google Maps link clicked)
     - schedule_book_click     (any link/button to /schedule-visit/ from another page)
     - schedule_view           (page_view when /schedule-visit/ loads)
     - service_quote_click     (any link/button to /service/#quote)
     - book_widget_open        (when the Google Appointment iframe becomes visible)
     - form_submit             (manual form fallback on schedule page)

   Each event includes a `source_page` parameter so Andrew can see WHERE
   conversions started in the GA4 path-exploration report.

   To enable, paste your GA4 Measurement ID in the placeholder below.
*/
(function(){
  'use strict';

  // ====== GA4 SETUP ======
  // Replace G-XXXXXXXXXX with the real Measurement ID from GA4 admin.
  var GA_ID = 'G-XXXXXXXXXX';

  if (GA_ID && GA_ID.indexOf('XXXX') === -1) {
    var s = document.createElement('script');
    s.async = true;
    s.src = 'https://www.googletagmanager.com/gtag/js?id=' + GA_ID;
    document.head.appendChild(s);
    window.dataLayer = window.dataLayer || [];
    window.gtag = function(){ window.dataLayer.push(arguments); };
    gtag('js', new Date());
    gtag('config', GA_ID, { send_page_view: true });
  } else {
    // Stub so the event helpers below work even before GA is wired up.
    window.gtag = window.gtag || function(){
      if (window.console && console.debug) {
        console.debug('[ga4-stub]', Array.from(arguments));
      }
    };
  }

  // ====== Helper ======
  function track(eventName, params){
    var payload = Object.assign({
      source_page: location.pathname,
      source_url:  location.href
    }, params || {});
    window.gtag('event', eventName, payload);
  }
  window.jjTrack = track; // expose so inline handlers can call it

  // ====== Auto-binders ======
  function onReady(fn){
    if (document.readyState !== 'loading') fn();
    else document.addEventListener('DOMContentLoaded', fn);
  }

  onReady(function(){
    // schedule_view: when the schedule page itself loads
    if (location.pathname.indexOf('/schedule-visit') !== -1 ||
        /schedule-visit\.html$/.test(location.pathname)) {
      track('schedule_view');
    }

    // Bind clicks for tel:, maps, and intent-bearing links/buttons
    document.addEventListener('click', function(e){
      var el = e.target.closest('a, button');
      if (!el) return;

      var href  = (el.getAttribute('href') || '').toLowerCase();
      var label = (el.dataset.label || el.textContent || '').trim().slice(0, 60);
      var intent = el.dataset.intent || '';

      if (href.indexOf('tel:') === 0) {
        track('call_click', { phone: href.replace('tel:', ''), label: label });
        return;
      }
      if (href.indexOf('google.com/maps') !== -1 || href.indexOf('maps.app.goo.gl') !== -1) {
        track('directions_click', { label: label });
        return;
      }
      if (intent === 'schedule' ||
          href.indexOf('/schedule-visit') !== -1 ||
          /schedule-visit\.html/.test(href)) {
        track('schedule_book_click', { label: label });
        return;
      }
      if (intent === 'service_quote' || href.indexOf('#quote') !== -1) {
        track('service_quote_click', { label: label });
        return;
      }
      if (intent) {
        // Generic catch-all for any other tagged conversion intent
        track('intent_click', { intent: intent, label: label });
      }
    });

    // Watch the booking iframe — fire when it scrolls into view
    var iframe = document.getElementById('book-widget');
    if (iframe && 'IntersectionObserver' in window) {
      var seen = false;
      var io = new IntersectionObserver(function(entries){
        entries.forEach(function(en){
          if (en.isIntersecting && !seen) {
            seen = true;
            track('book_widget_open');
            io.disconnect();
          }
        });
      }, { threshold: 0.4 });
      io.observe(iframe);
    }
  });
})();
