(function(){
  var mount=document.getElementById('jjHeader');
  if(!mount) return;
  var active=mount.getAttribute('data-active')||'';
  var solid=(mount.getAttribute('data-variant')||'solid')!=='overlay';
  function cur(n){return active===n?' current':'';}

  var FB='<svg viewBox="0 0 24 24" fill="currentColor"><path d="M14 9h3V5h-3c-2.2 0-4 1.8-4 4v2H7v4h3v7h4v-7h3l1-4h-4V9c0-.6.4-1 1-1z"/></svg>';
  var IG='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"/></svg>';
  var PH='<svg class="tb-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z"/></svg>';
  var PIN='<svg class="tb-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 21s-7-5.5-7-11a7 7 0 0 1 14 0c0 5.5-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/></svg>';

  var html=
  '<a class="skip" href="#main">Skip to content</a>'
  +'<div class="topbar"><div class="wrap">'
  +'<div class="t-left"><a class="tb-promo" href="tel:+15097382985">'+PH+'Call us: 509-738-2985</a></div>'
  +'<div class="t-center"><span class="addr">'+PIN+'685 Elm Tree Dr, Colville, WA</span></div>'
  +'<div class="t-right"><span class="hrs">Mon–Fri · 8 to 5</span>'
  +'<a class="soc" href="https://www.facebook.com/JJRIGGSEQUIPMENT" target="_blank" rel="noopener" aria-label="JJ Riggs on Facebook">'+FB+'</a>'
  +'<a class="soc" href="https://www.instagram.com/jjriggsequipment/" target="_blank" rel="noopener" aria-label="JJ Riggs on Instagram">'+IG+'</a>'
  +'</div></div></div>'
  +'<header class="site-head'+(solid?' is-solid':'')+'" id="siteHead"><div class="wrap">'
  +'<div class="brand-lock">'
  +'<a class="brand-logo" href="index.html" aria-label="JJ Riggs Equipment — home"><img src="https://jjriggsequipment.com/wp-content/uploads/2024/09/snow-JJ-Riggs-Equipment-white-outline-logo.png" alt="JJ Riggs Equipment" /></a>'
  +'<span class="brand-tag">Bad Boy + TYM Dealer<b>Colville, Washington</b></span>'
  +'</div>'
  +'<nav class="primary-nav" aria-label="Primary"><ul>'
  +'<li class="has-menu"><button class="nav-top'+cur('equipment')+'" type="button" aria-expanded="false" aria-haspopup="true" aria-controls="equip-menu">Equipment <span class="caret" aria-hidden="true">▾</span></button>'
  +'<div class="submenu" id="equip-menu"><div class="mm-wrap">'
  +'<div class="mm-intro"><span class="mm-eyebrow">Shop Equipment</span><p class="mm-introtxt">Bad Boy &amp; TYM — sold, set up, and serviced right here in Colville.</p></div>'
  +'<a class="mm-card" href="tractors.html"><span class="mm-ico"><img class="mm-ico-base" src="img/tractors-icon-white.png" alt="" aria-hidden="true" loading="lazy"><img class="mm-ico-hot" src="img/tractors-icon-red.png" alt="" aria-hidden="true" loading="lazy"></span><span class="mm-title">Tractors</span><span class="mm-desc">Sub-compact to utility · 21–127 HP</span></a>'
  +'<a class="mm-card" href="mowers.html"><span class="mm-ico"><img class="mm-ico-base" src="img/mowers-icon-white.png" alt="" aria-hidden="true" loading="lazy"><img class="mm-ico-hot" src="img/mowers-icon-red.png" alt="" aria-hidden="true" loading="lazy"></span><span class="mm-title">Mowers</span><span class="mm-desc">Zero-turns, stand-ons &amp; walk-behinds</span></a>'
  +'<a class="mm-card" href="implements.html"><span class="mm-ico"><img class="mm-ico-base" src="img/attachements-icon-white.png" alt="" aria-hidden="true" loading="lazy"><img class="mm-ico-hot" src="img/attachements-icon-red.png" alt="" aria-hidden="true" loading="lazy"></span><span class="mm-title">Implements</span><span class="mm-desc">IronCraft &amp; Braber attachments</span></a>'
  +'</div></div></li>'
  +'<li class="has-menu"><button class="nav-top" type="button" aria-expanded="false" aria-haspopup="true" aria-controls="sheds-menu">Sheds <span class="caret" aria-hidden="true">▾</span></button>'
  +'<div class="submenu" id="sheds-menu"><a class="mm-feature" href="https://colvillesheds.com/" target="_blank" rel="noopener"><div class="mm-feature-ico"><span class="mm-ico"><img class="mm-ico-base" src="img/old-hickory-sheds-icon-white.png" alt="" aria-hidden="true" loading="lazy"><img class="mm-ico-hot" src="img/old-hickory-sheds-icon-red.png" alt="" aria-hidden="true" loading="lazy"></span></div><div class="mm-feature-body"><span class="mm-title">Old Hickory Sheds</span><span class="mm-desc">Authorized dealer — storage barns, cabins &amp; garages, built to last.</span><span class="mm-link">Visit shed site →</span></div></a></div></li>'
  +'<li><a class="nav-top'+cur('service')+'" href="services.html">Service</a></li>'
  +'<li><a class="nav-top'+cur('financing')+'" href="financing.html">Financing</a></li>'
  +'</ul></nav>'
  +'<div class="head-actions"><a class="btn btn-red" href="schedule-visit.html" data-intent="schedule">Get a Quote</a>'
  +'<button class="burger" id="burger" aria-label="Open menu" aria-controls="mobileMenu" aria-expanded="false"><span></span><span></span><span></span></button></div>'
  +'</div>'
  +'<nav class="mobile-menu" id="mobileMenu" aria-label="Mobile"><ul>'
  +'<li><a href="tractors.html">Tractors</a></li>'
  +'<li><a href="mowers.html">Mowers</a></li>'
  +'<li><a href="implements.html">Implements</a></li>'
  +'<li><a href="https://colvillesheds.com/" target="_blank" rel="noopener">Sheds</a></li>'
  +'<li><a href="services.html">Service &amp; Repair</a></li>'
  +'<li><a href="financing.html">Financing</a></li>'
  +'<li><a href="schedule-visit.html" data-intent="schedule">Get a Quote</a></li>'
  +'<li><a href="tel:+15097382985">Call 509-738-2985</a></li>'
  +'</ul></nav></header>';

  mount.outerHTML=html;

  var head=document.getElementById('siteHead');
  var onScroll=function(){var y=window.pageYOffset||document.documentElement.scrollTop;if(y>70){head.classList.add('scrolled');}else if(y<24){head.classList.remove('scrolled');}};
  onScroll();window.addEventListener('scroll',onScroll,{passive:true});

  var burger=document.getElementById('burger'),menu=document.getElementById('mobileMenu');
  burger.addEventListener('click',function(){var o=menu.classList.toggle('open');burger.setAttribute('aria-expanded',o);burger.setAttribute('aria-label',o?'Close menu':'Open menu');});
  menu.querySelectorAll('a').forEach(function(a){a.addEventListener('click',function(){menu.classList.remove('open');burger.setAttribute('aria-expanded',false);});});

  function closeAll(){
    document.querySelectorAll('.has-menu .submenu.open').forEach(function(s){s.classList.remove('open');});
    document.querySelectorAll('.has-menu .nav-top[aria-expanded="true"]').forEach(function(t){t.setAttribute('aria-expanded','false');});
    head.classList.remove('nav-open');
  }
  var megaCloseTimer=null;
  function cancelMegaClose(){if(megaCloseTimer){clearTimeout(megaCloseTimer);megaCloseTimer=null;}}
  document.querySelectorAll('.has-menu').forEach(function(hm){
    var top=hm.querySelector('.nav-top'),sub=hm.querySelector('.submenu');
    function openThis(){
      cancelMegaClose();
      document.querySelectorAll('.has-menu .submenu.open').forEach(function(s){if(s!==sub){s.classList.remove('open');}});
      document.querySelectorAll('.has-menu .nav-top[aria-expanded="true"]').forEach(function(t){if(t!==top){t.setAttribute('aria-expanded','false');}});
      head.classList.add('nav-open');
      if(sub){sub.classList.add('open');}
      if(top){top.setAttribute('aria-expanded','true');}
      placeMega();
    }
    hm.addEventListener('mouseenter',openThis);
    hm.addEventListener('mouseleave',function(){
      cancelMegaClose();
      megaCloseTimer=setTimeout(function(){
        if(sub){sub.classList.remove('open');}
        if(top){top.setAttribute('aria-expanded','false');}
        if(!document.querySelector('.has-menu .submenu.open')){head.classList.remove('nav-open');}
      },160);
    });
    if(top&&sub){top.addEventListener('click',function(e){e.preventDefault();cancelMegaClose();var open=sub.classList.contains('open');closeAll();if(!open){sub.classList.add('open');top.setAttribute('aria-expanded','true');head.classList.add('nav-open');placeMega();}});}
  });
  document.addEventListener('click',function(e){if(!e.target.closest('.has-menu')){closeAll();}});
  document.addEventListener('keydown',function(e){if(e.key==='Escape'){closeAll();}});

  var equipMega=document.getElementById('equip-menu');
  function placeMega(){if(equipMega&&head){equipMega.style.top=Math.max(0,head.getBoundingClientRect().bottom-2)+'px';}}
  placeMega();
  window.addEventListener('load',placeMega);
  window.addEventListener('scroll',placeMega,{passive:true});
  window.addEventListener('resize',placeMega);
})();
