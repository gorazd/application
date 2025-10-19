/*
 Navigation Pipeline Overview (Phases 0-9 Implemented)
 ----------------------------------------------------
 1. Intercept internal link clicks (opt-out via data-no-spa planned) and use single-page navigation.
 2. On navigation start: mark performance (nav-start), abort any prior in-flight fetch, set AbortController.
 3. Fetch HTML concurrently with exit animation (CSS class-based). In-memory Map cache supplies instant HTML if present.
 4. If View Transitions API available & not already active: wrap DOM swap; else custom class-based transition.
 5. After DOM swap: re-run navigation highlighting, smooth scrolling, and defer non-critical animations via requestIdleCallback.
 6. Animations module imported once; subsequent navigations call reinit only (avoids duplicate plugin registration).
 7. Concurrency guard: redundant rapid clicks to same path ignored while in-flight; earlier fetch aborted.
 8. Performance diagnostics: use window.__navMetrics() for quick stats or window.__navSummary() for detailed table.
 9. Cache prefetch: pointerenter/focus prefetches uncached internal routes (80ms debounce).

 Future Enhancements / TODOs:
 - Add optional cache size limit or TTL.
 - data-no-spa attribute handling for forced full reload.
 - Automated Lighthouse CI integration.

 Rollback Instructions:
 - To revert optimizations: checkout previous git tag (e.g., `git checkout pre-nav-optimization`) or remove SPA init call & all instrumentation blocks.
*/
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ScrollToPlugin } from "gsap/ScrollToPlugin";
import { SplitText } from "gsap/SplitText";
import { DrawSVGPlugin } from "gsap/DrawSVGPlugin";

// Navigation performance instrumentation (Phase 0)
// ------------------------------------------------
// Adds nav-start/nav-end performance marks and a measure 'navigation'.
// Collects Long Task counts between marks using PerformanceObserver.
// Provides window.__navMetrics log helper for baseline capture.
(function setupNavigationPerfInstrumentation(){
  if (typeof window === 'undefined' || typeof performance === 'undefined') return;
  if (window.__navPerfSetup) return; // idempotent
  window.__navPerfSetup = true;

  const longTasks = [];
  let observing = false;
  let observer;

  function startLongTaskObserver(){
    if (observing || !('PerformanceObserver' in window)) return;
    try {
      observer = new PerformanceObserver((list) => {
        list.getEntries().forEach(entry => {
          if (entry.duration > 50) {
            longTasks.push(entry);
          }
        });
      });
      observer.observe({ entryTypes: ['longtask'] });
      observing = true;
    } catch (e) {}
  }

  function stopLongTaskObserver(){
    try { if (observer) observer.disconnect(); } catch(e) {}
    observing = false;
  }

  function markNavStart(){
    try { performance.mark('nav-start'); } catch(e) {}
    longTasks.length = 0;
    startLongTaskObserver();
  }

  function markNavEnd(){
    try { performance.mark('nav-end'); } catch(e) {}
    stopLongTaskObserver();
    try { performance.measure('navigation', 'nav-start', 'nav-end'); } catch(e) {}
  }

  // Expose minimal API for navigation module
  const records = [];
  window.__navPerf = { markNavStart, markNavEnd, longTasks, records };

  // Helper to log metrics (call manually after several navigations)
  window.__navMetrics = function(){
    const measures = performance.getEntriesByName('navigation');
    const durations = measures.map(m => m.duration).filter(Boolean).sort((a,b)=>a-b);
    if (!durations.length) {
      console.info('[nav-metrics] No navigation measures yet.');
      return;
    }
    const median = durations[Math.floor(durations.length/2)];
    const p95 = durations[Math.floor(durations.length*0.95) - 1] || durations[durations.length-1];
    console.info('[nav-metrics] count=%d median=%.1fms p95=%.1fms last=%.1fms longTasksLastNav=%d', durations.length, median, p95, durations[durations.length-1], window.__navPerf.longTasks.length);
  };

  // Phase 9: richer summary tool
  window.__navSummary = function() {
    const measures = performance.getEntriesByName('navigation');
    if (!measures.length) {
      console.info('[nav-summary] No navigation measures.');
      return;
    }
    const durations = measures.map(m => m.duration).sort((a,b)=>a-b);
    const median = durations[Math.floor(durations.length/2)];
    const p95 = durations[Math.max(0, Math.ceil(durations.length*0.95)-1)];
    const mean = durations.reduce((a,b)=>a+b,0)/durations.length;
    const fastest = durations[0];
    const slowest = durations[durations.length-1];
    // Approx cache hits: entries whose duration < 130ms (heuristic) & after Phase 2
    const cacheHits = durations.filter(d => d < 130).length;
    const cacheHitRatio = (cacheHits / durations.length * 100).toFixed(1);
    console.groupCollapsed('[nav-summary] Navigation Performance Summary');
    console.table([{count: durations.length, median: median.toFixed(1), p95: p95.toFixed(1), mean: mean.toFixed(1), fastest: fastest.toFixed(1), slowest: slowest.toFixed(1), cacheHitRatio: cacheHitRatio + '%'}]);
    console.groupEnd();
  };

  // Export structured JSON suitable for pasting into plan.md Results
  window.__navExport = function() {
    const data = window.__navPerf.records;
    if (!data.length) {
      console.info('[nav-export] No records captured yet.');
      return [];
    }
    const summary = data.map(r => ({ path: r.path, duration: r.duration.toFixed(1), cached: r.cached, longTasks: r.longTasks }));
    console.table(summary);
    return summary;
  };
  // Allow updating budgets externally
  window.__setNavBudgets = function(partial){
    if (!window.__navBudgets) {
      window.__navBudgets = { warnMedian: 350, warnP95: 900, warnLongTasks: 3 };
    }
    Object.assign(window.__navBudgets, partial || {});
    console.info('[nav-budget] updated', window.__navBudgets);
  };
})();
// ------------------------------------------------

if (typeof window !== 'undefined') {
  if (!window.gsap) {
    window.gsap = gsap;
  } else if (window.gsap !== gsap) {
    window.gsap = gsap;
  }
}

gsap.registerPlugin(ScrollTrigger, ScrollToPlugin, SplitText, DrawSVGPlugin);

let lastKnownPathname = window.location.pathname;

function updateActiveNav() {
  const navLinks = document.querySelectorAll('header nav a');
  navLinks.forEach(link => {
    const linkHref = link.getAttribute('href');

    // Normalize paths to ensure consistent comparison
    const currentPath = window.location.pathname.endsWith('/') ? window.location.pathname : window.location.pathname + '/';
    const normalizedLinkHref = linkHref.endsWith('/') ? linkHref : linkHref + '/';

    // Check if the current pathname matches the link or starts with the link followed by a '/'
    const isActive = (currentPath === normalizedLinkHref || currentPath.startsWith(normalizedLinkHref)) && !(linkHref === '/' && currentPath !== '/');

    if (isActive) {
      link.classList.add('active');
    } else {
      link.classList.remove('active');
    }
  });
}

function initThemeAndPrint() {
  const themeToggle = document.getElementById('theme-toggle');
  const sunIcon = themeToggle?.querySelector('.feather-sun');
  const moonIcon = themeToggle?.querySelector('.feather-moon');
  const printButton = document.getElementById('print-button');

  function setTheme(theme) {
    if (!sunIcon || !moonIcon) return;
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
      sunIcon.style.display = 'block';
      moonIcon.style.display = 'none';
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      sunIcon.style.display = 'none';
      moonIcon.style.display = 'block';
      localStorage.setItem('theme', 'light');
    }
  }

  if (themeToggle) {
    themeToggle.onclick = () => {
      const currentTheme = localStorage.getItem('theme') || 'light';
      setTheme(currentTheme === 'light' ? 'dark' : 'light');
    };
  }

  if (printButton) {
    printButton.onclick = () => {
      window.print();
    };
  }

  const savedTheme = localStorage.getItem('theme');
  const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  if (savedTheme) {
    setTheme(savedTheme);
  } else if (prefersDark) {
    setTheme('dark');
  } else {
    setTheme('light');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  console.log("DOM fully loaded and parsed");
  initThemeAndPrint();
  updateActiveNav();
  initSmoothScrolling();
  // Initialize SPA link interception (re-added)
  initSinglePageNavigation();
  import("./animations.js").then(mod => {
    mod.initAnimationsOnce && mod.initAnimationsOnce();
    mod.reinitAnimations && mod.reinitAnimations();
  });

  const body = document.querySelector('body');
  const header = document.querySelector('header');
  const hamburger = document.getElementById('hamburger');
  const navList = document.getElementById('main-nav-list');
  let lastScrollY = window.scrollY;
  let menuOpen = false;
  let lastDirection = 'up';

  function isMobile() {
    return window.matchMedia('(max-width: 768px)').matches;
  }

  function showNav() {
    if (body) body.classList.remove('hide-nav');
  }
  function hideNav() {
    if (body) body.classList.add('hide-nav');
  }

  function openMenu() {
    if (body) body.classList.add('extend-nav');
    if (navList) navList.classList.add('visible');
    if (hamburger) {
      hamburger.setAttribute('aria-expanded', 'true');
      hamburger.classList.add('open');
    }
    menuOpen = true;
  }

  function closeMenu() {
    if (body) body.classList.remove('extend-nav');
    if (navList) navList.classList.remove('visible');
    if (hamburger) {
      hamburger.setAttribute('aria-expanded', 'false');
      hamburger.classList.remove('open');
    }
    menuOpen = false;
  }

  function toggleMenu() {
    if (!isMobile()) return;
    if (menuOpen) {
      closeMenu();
    } else {
      openMenu();
    }
  }

  if (hamburger && navList) {
    hamburger.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleMenu();
    });

    navList.addEventListener('click', (e) => {
      if (e.target.tagName === 'A' && isMobile()) {
        closeMenu();
      }
    });

    document.addEventListener('click', (e) => {
      if (menuOpen && isMobile() && !navList.contains(e.target) && e.target !== hamburger) {
        closeMenu();
      }
    });
  }

  function handleScroll() {
    if (!header) return;
    if (!isMobile()) {
      return;
    }
    const currentY = window.scrollY;
    if (currentY <= 10) {
      showNav();
      closeMenu();
      lastDirection = 'up';
    } else if (currentY > lastScrollY) {
      hideNav();
      lastDirection = 'down';
    } else if (currentY < lastScrollY) {
      lastDirection = 'up';
    }
    lastScrollY = currentY;
  }

  window.addEventListener('scroll', handleScroll, { passive: true });
  window.addEventListener('resize', () => {
    if (!isMobile()) {
      closeMenu();
      showNav();
    }
  });

  showNav();
  closeMenu();
});

// Detect Safari
function isSafari() {
  return /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
}

// Phase 8 helpers to reduce duplicate logic
function getMain() {
  return document.querySelector('main');
}
function isInternalLink(href) {
  if (!href || href.startsWith('#') || href.startsWith('http') || href.startsWith('mailto:') || href.startsWith('tel:')) return false;
  try {
    const url = new URL(href, location.href);
    return url.origin === location.origin;
  } catch (e) {
    return false;
  }
}

// Record a navigation result (Phase 9 extension)
function captureNavRecord(path, cached) {
  try {
    if (!window.__navPerf) return;
    const measures = performance.getEntriesByName('navigation');
    const last = measures[measures.length - 1];
    if (!last) return;
    const rec = {
      path,
      duration: last.duration,
      cached,
      longTasks: window.__navPerf.longTasks.length,
      ts: Date.now()
    };
    window.__navPerf.records.push(rec);
    // Performance budget checks (enhancement)
    if (!window.__navBudgets) {
      window.__navBudgets = {
        warnMedian: 350, // ms
        warnP95: 900,    // ms
        warnLongTasks: 3 // count per nav
      };
    }
    try {
      const b = window.__navBudgets;
      if (rec.longTasks > b.warnLongTasks) {
        console.warn('[nav-budget] long tasks exceeded (%d > %d) on %s', rec.longTasks, b.warnLongTasks, path);
      }
      // Recompute aggregate stats cheaply for median/p95 warning
      const durations = window.__navPerf.records.map(r=>r.duration).slice().sort((a,b)=>a-b);
      const median = durations[Math.floor(durations.length/2)];
      const p95 = durations[Math.max(0, Math.ceil(durations.length*0.95)-1)];
      if (median > b.warnMedian) {
        console.warn(`[nav-budget] median nav > ${b.warnMedian}ms (${median.toFixed(1)}ms)`);
      }
      if (p95 > b.warnP95) {
        console.warn(`[nav-budget] p95 nav > ${b.warnP95}ms (${p95.toFixed(1)}ms)`);
      }
    } catch(e) {}
  } catch (e) {}
}

// Cross-browser navigation handling
function initSinglePageNavigation() {
  // Handle clicks on internal links
  document.addEventListener('click', (event) => {
    const link = event.target.closest('a');
    if (!link) return;
  if (link.hasAttribute('data-no-spa')) return; // opt-out
    const href = link.getAttribute('href');
    if (!isInternalLink(href)) return;
    const url = new URL(href, location.href);
    if (url.pathname === location.pathname) {
      event.preventDefault();
      return;
    }
    if (window.__currentNav && window.__currentNav.inFlight && window.__currentNav.pathname === url.pathname) {
      event.preventDefault();
      return;
    }
    event.preventDefault();
    navigateToPage(url.pathname);
  });
  
  // Handle browser back/forward buttons
  window.addEventListener('popstate', (event) => {
    navigateToPage(location.pathname, false);
  });
}

// Simple in-memory navigation cache (Phase 2 + Enhancement: TTL & LRU)
// KEY: pathname -> { html, ts, last }
const __pageCache = new Map();
// Configurable budgets (can be tweaked at runtime if needed)
const NAV_CACHE_MAX_ENTRIES = 20; // modest cap to avoid unbounded growth
const NAV_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes TTL

function cacheSet(pathname, html){
  const now = performance.now();
  __pageCache.set(pathname, { html, ts: now, last: now });
  // LRU eviction if over capacity
  if (__pageCache.size > NAV_CACHE_MAX_ENTRIES) {
    // Find oldest (smallest last)
    let oldestKey = null;
    let oldestLast = Infinity;
    for (const [k, v] of __pageCache.entries()) {
      if (v.last < oldestLast) { oldestLast = v.last; oldestKey = k; }
    }
    if (oldestKey) __pageCache.delete(oldestKey);
  }
}
function cacheGet(pathname){
  const entry = __pageCache.get(pathname);
  if (!entry) return null;
  const now = performance.now();
  if (now - entry.ts > NAV_CACHE_TTL_MS) {
    // Expired
    __pageCache.delete(pathname);
    return null;
  }
  entry.last = now; // touch for LRU
  return entry.html;
}

function setupPrefetch(){
  if (window.__prefetchSetup) return; window.__prefetchSetup = true;
  const debounceMap = new WeakMap();
  function schedule(link){
  if (link.hasAttribute('data-no-spa')) return; // opt-out of SPA prefetch
    const href = link.getAttribute('href');
    if (!href || href.startsWith('#') || href.startsWith('http') || href.startsWith('mailto:') || href.startsWith('tel:')) return;
    const url = new URL(href, location.href);
    if (url.origin !== location.origin) return;
    if (url.pathname === location.pathname) return;
    if (cacheGet(url.pathname)) return; // already cached
    if (debounceMap.get(link)) return;
    const handle = setTimeout(async () => {
      debounceMap.delete(link);
      try {
        const res = await fetch(url.pathname, { method: 'GET' });
        if (!res.ok) return;
        const text = await res.text();
        cacheSet(url.pathname, text);
        // Optionally could parse now, but defer parsing until needed to save main thread
      } catch(e) {}
    }, 80); // small debounce window
    debounceMap.set(link, handle);
  }
  document.addEventListener('pointerenter', (e) => {
    const link = e.target.closest && e.target.closest('a');
    if (link) schedule(link);
  }, { capture: true });
  document.addEventListener('focus', (e) => {
    const link = e.target.closest && e.target.closest('a');
    if (link) schedule(link);
  }, true);
}

setupPrefetch();

function startPageExit() {
  const main = document.querySelector('main');
  if (!main) return Promise.resolve();
  main.classList.remove('page-enter');
  main.classList.add('page-exit');

  return new Promise(resolve => {
    let settled = false;
    const settle = () => {
      if (settled) return;
      settled = true;
      resolve();
    };
    const timeout = setTimeout(settle, 200);
    const onTransitionEnd = (event) => {
      if (event.target !== main) return;
      main.removeEventListener('transitionend', onTransitionEnd);
      clearTimeout(timeout);
      settle();
    };
    main.addEventListener('transitionend', onTransitionEnd, { once: true });
  });
}

async function navigateToPage(pathname, pushState = true) {
  // Phase 6: concurrency guard and cancellation
  if (!window.__currentNav) {
    window.__currentNav = { controller: null, inFlight: false, pathname: null };
  }
  // Abort previous navigation if any
  if (window.__currentNav.controller) {
    try { window.__currentNav.controller.abort(); } catch(e) {}
  }
  const controller = new AbortController();
  window.__currentNav.controller = controller;
  window.__currentNav.inFlight = true;
  window.__currentNav.pathname = pathname;

  if (window.__navPerf) window.__navPerf.markNavStart();
  try {
    const cachedHTML = cacheGet(pathname);
    const wasCached = !!cachedHTML;
    const htmlPromise = cachedHTML ? Promise.resolve(cachedHTML) : fetch(pathname, { signal: controller.signal }).then(r => r.text()).then(html => {
      cacheSet(pathname, html);
      return html;
    });

    const navDetail = { from: lastKnownPathname, to: pathname };

    if (pushState) {
      history.pushState(null, '', pathname);
    }

    const parser = new DOMParser();
    if (typeof window.__vtInProgress === 'undefined') window.__vtInProgress = false;
    const canUseVT = typeof document.startViewTransition === 'function' && !window.__vtInProgress;
    const exitPromise = canUseVT ? Promise.resolve() : startPageExit();

    const html = await htmlPromise;
    const doc = parser.parseFromString(html, 'text/html');
    document.title = doc.title;

    // View Transitions API enhancement (Phase 5)
    if (canUseVT) {
      window.__vtInProgress = true;
      document.body.classList.add('view-transition-active');
      try {
        const vt = document.startViewTransition(() => {
          window.dispatchEvent(new CustomEvent('spa:page-leave', { detail: navDetail }));
          updatePageContent(doc);
          window.dispatchEvent(new CustomEvent('spa:page-enter', { detail: navDetail }));
          lastKnownPathname = navDetail.to;
        });
        vt.finished.finally(() => {
          window.__vtInProgress = false;
          document.body.classList.remove('view-transition-active');
          if (window.__navPerf) window.__navPerf.markNavEnd();
          lastKnownPathname = pathname;
          captureNavRecord(pathname, wasCached);
        });
      } catch (e) {
        window.__vtInProgress = false;
        document.body.classList.remove('view-transition-active');
        await customPageTransition(doc, startPageExit(), navDetail);
        if (window.__navPerf) window.__navPerf.markNavEnd();
        captureNavRecord(pathname, wasCached);
      }
    } else {
      await customPageTransition(doc, exitPromise, navDetail);
      if (window.__navPerf) window.__navPerf.markNavEnd();
      captureNavRecord(pathname, wasCached);
    }
  } catch (error) {
    if (window.__navPerf) window.__navPerf.markNavEnd();
    if (error && error.name === 'AbortError') {
      // Aborted due to a newer navigation
    } else {
      console.error('Navigation failed:', error);
      window.location.href = pathname;
    }
  } finally {
    if (window.__currentNav) window.__currentNav.inFlight = false;
  }
}

// Revised customPageTransition for Phase 1
async function customPageTransition(doc, exitPromise, navDetail) {
  if (exitPromise) {
    try {
      await exitPromise;
    } catch (e) {}
  }

  if (navDetail) {
    window.dispatchEvent(new CustomEvent('spa:page-leave', { detail: navDetail }));
  }

  const main = document.querySelector('main');
  if (!main) {
    updatePageContent(doc);
    if (navDetail) {
      window.dispatchEvent(new CustomEvent('spa:page-enter', { detail: navDetail }));
    }
    if (navDetail?.to) {
      lastKnownPathname = navDetail.to;
    }
    return;
  }

  updatePageContent(doc);

  if (navDetail) {
    window.dispatchEvent(new CustomEvent('spa:page-enter', { detail: navDetail }));
  }

  if (navDetail?.to) {
    lastKnownPathname = navDetail.to;
  }

  requestAnimationFrame(() => {
    main.classList.remove('page-exit');
    main.classList.add('page-enter');
    setTimeout(() => main.classList.remove('page-enter'), 300);
  });
}

function updatePageContent(doc) {
  const docBody = doc.body;
  if (docBody) {
    const preserve = [];
    if (document.body.classList.contains('view-transition-active')) {
      preserve.push('view-transition-active');
    }
    document.body.className = docBody.className || '';
    preserve.forEach(cls => document.body.classList.add(cls));
  }
  const mainEl = getMain();
  const docMain = doc.querySelector('main');
  if (mainEl && docMain) mainEl.innerHTML = docMain.innerHTML;
  document.documentElement.scrollTop = 0;
  updateActiveNav();
  const runPostSwap = () => {
    initSmoothScrolling();
    import("./animations.js").then(mod => {
      mod.reinitAnimations ? mod.reinitAnimations() : (mod.animations && mod.animations());
    });
  };
  if ('requestIdleCallback' in window) {
    requestIdleCallback(runPostSwap, { timeout: 120 });
  } else {
    setTimeout(runPostSwap, 0);
  }
}

function initSmoothScrolling() {
  console.log("Initializing smooth scrolling...");
  const anchorLinks = document.querySelectorAll('a[href^="#"]');

  function safeScrollTo(targetY, duration = 1) {
    try {
      const plugins = gsap && gsap._plugins;
      const hasScrollTo = !!(plugins && plugins.scrollTo && typeof plugins.scrollTo.get === 'function');
      if (hasScrollTo) {
        gsap.to(window, {
          duration,
          scrollTo: { y: targetY },
          ease: 'power2.inOut'
        });
        return;
      }
    } catch (e) {}

    try {
      const startY = window.scrollY || document.documentElement.scrollTop || 0;
      const obj = { y: startY };
      gsap.to(obj, {
        duration,
        y: targetY,
        ease: 'power4.inOut',
        onUpdate: () => window.scrollTo(0, Math.round(obj.y))
      });
      return;
    } catch (err) {
      try {
        window.scrollTo({ top: targetY, behavior: 'smooth' });
      } catch (e) {
        window.scrollTo(0, targetY);
      }
    }
  }

  anchorLinks.forEach(link => {
    link.addEventListener('click', function(e) {
      e.preventDefault();
      const targetId = this.getAttribute('href');

      if (!targetId || targetId === '#') {
        safeScrollTo(0, 1);
        return;
      }

      let targetElement = null;
      try {
        targetElement = document.querySelector(targetId);
      } catch (err) {}
      if (!targetElement) {
        const name = targetId.replace(/^#/, '');
        targetElement = document.getElementById(name);
        if (!targetElement) {
          try {
            targetElement = document.querySelector('[name="' + name.replace(/"/g, '\\"') + '"]');
          } catch (err) {
            const els = document.getElementsByName(name);
            targetElement = els && els.length ? els[0] : null;
          }
          if (!targetElement) {
            const els2 = document.getElementsByName(name);
            targetElement = els2 && els2.length ? els2[0] : null;
          }
        }
      }

      if (targetElement) {
        const offsetY = (function() {
          try {
            if (window.matchMedia && window.matchMedia('(max-width: 768px)').matches) {
              const headerEl = document.querySelector('header');
              return headerEl ? headerEl.offsetHeight : 0;
            }
          } catch (e) {}
          return 10;
        })();
        const rect = targetElement.getBoundingClientRect();
        const targetY = Math.max(0, rect.top + window.pageYOffset - offsetY);

        safeScrollTo(targetY, 1);
      } else {
        safeScrollTo(0, 1);
      }
    });
  });
}
