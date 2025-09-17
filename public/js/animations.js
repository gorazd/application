import { SplitText } from "gsap/SplitText";
import { DrawSVGPlugin } from "gsap/DrawSVGPlugin";
import { ScrollTrigger } from "gsap/ScrollTrigger";

// Idempotent plugin registration
if (!gsap.core.globals().DrawSVGPlugin) {
  try { gsap.registerPlugin(DrawSVGPlugin, ScrollTrigger); } catch(e) {}
}

let __animationsInitialized = false;
let __worksPreviewSetup = false;
let __worksPreviewEl = null;
let __worksPreviewImg = null;
let __worksListenersAttached = false;
let __worksPreviewPicture = null;
let __worksPreviewSourceAvif = null;
// AVIF preload/cache state
let __worksImageCache = new Map(); // key -> { status, url, srcset, sizes, imgEl }
let __preloadQueue = []; // [{ key, srcset, sizes }]
let __preloading = false;
let __avifSupported = null;

// Configurable motion parameters
const WORKS_PREVIEW_CONFIG = {
  followEase: 0.12,      // lower = snappier following
  rotationMax: 2,       // deg max tilt
  rotationEase: 0.25,
  fadeDuration: 0.25,
  swingAmplitude: 2.5,   // deg small idle swing
  swingDuration: 2.4,    // seconds for full sway cycle
  yOffset: -40,          // vertical offset from cursor
  xOffset: 40            // baseline horizontal offset
};

export function initAnimationsOnce() {
  if (__animationsInitialized) return;
  __animationsInitialized = true;
  // Any one-time setup could go here (e.g., global timelines)
}

export function reinitAnimations() {
  // Run per-navigation animations
  schedulePerPageAnimations();
  // Rebind works links if already initialized
  try { rebindWorksLinks(); } catch(e) {}
}

export function animations() { // backward compat (deprecated)
  initAnimationsOnce();
  reinitAnimations();
}

function schedulePerPageAnimations(){
  const runner = () => runPerPageAnimations();
  if ('requestIdleCallback' in window) {
    requestIdleCallback(runner, { timeout: 500 });
  } else {
    setTimeout(runner, 50); // fallback quick defer
  }
}

function runPerPageAnimations(){
  const targets = document.querySelectorAll(".animate-me");
  if (targets.length === 0) {
    // Quietly ignore on pages without targets
  } else {
    gsap.from(targets, { duration: .6, y: 100, ease: "power1.out", stagger: .4 });
  }
  gsap.set('h1', { opacity: 1 });
  gsap.from('h1', { duration: .6, y: 10, autoAlpha: 0, filter: 'blur(12px)', ease: "power1.out", delay: 0.1 });
  const introElement = document.querySelector('.title');
  if (introElement) {
    gsap.set(introElement, { opacity: 1 });
    const splitText = new SplitText(introElement, { type: "chars" });
    gsap.set(splitText.chars, { opacity: 0 });
    gsap.to(splitText.chars, {
      opacity: 1,
      duration: 0.4,
      stagger: 0.04,
      ease: "bounce.out",
      delay: 0.25
    });
  }

  if (document.querySelector('#signature')) {
    animateSignature();
  }

  setupWorksHoverPreview();
  // Kick off preloading of AVIF previews lazily
  scheduleWorksAvifPreload();
}

function animateSignature() {
  const signatureSVG = document.querySelector('#signature');
  if (!signatureSVG) return;
  const paths = signatureSVG.querySelectorAll('path');
  if (!paths.length) return;
  gsap.set(paths, { drawSVG: "0%" });
  const signatureTimeline = gsap.timeline({
    scrollTrigger: {
      trigger: signatureSVG,
      start: "top 90%",
      end: "50% 80%",
      toggleActions: "play none none reverse",
      scrub: 2
    }
  });
  paths.forEach(path => {
    signatureTimeline.to(path, {
      drawSVG: "100%",
      duration: 1,
      ease: "none"
    });
  });
}

function setupWorksHoverPreview(){
  if (__worksPreviewSetup) return; // one-time DOM creation
  __worksPreviewSetup = true;
  // Create floating preview container
  const el = document.createElement('div');
  el.className = 'works-hover-preview';
  el.setAttribute('aria-hidden', 'true');
  // Use <picture> so the browser can choose AVIF or fallback without us forcing JPEG
  const picture = document.createElement('picture');
  const sourceAvif = document.createElement('source');
  sourceAvif.type = 'image/avif';
  const img = document.createElement('img');
  // Keep attributes simple; we will set srcset/sizes dynamically on hover
  img.decoding = 'async';
  img.loading = 'eager';
  picture.appendChild(sourceAvif);
  picture.appendChild(img);
  el.appendChild(picture);
  document.body.appendChild(el);
  __worksPreviewEl = el;
  __worksPreviewImg = img;
  __worksPreviewPicture = picture;
  __worksPreviewSourceAvif = sourceAvif;

  // Pre-allocate GSAP state
  gsap.set(el, { autoAlpha: 0, rotate: 0, xPercent: -50, yPercent: -50 });

  attachWorksPreviewListeners();
}

// ---- AVIF preload & cache utilities ----
function isAvifSupported(){
  if (__avifSupported !== null) return __avifSupported;
  try {
    __avifSupported = typeof CSS !== 'undefined' && CSS.supports && CSS.supports('image-type(avif)');
  } catch(e) {
    __avifSupported = false;
  }
  return __avifSupported;
}

function computeLinkKey(link){
  if (link.id) return link.id;
  if (link.dataset && (link.dataset.workId || link.dataset.id)) return link.dataset.workId || link.dataset.id;
  const img = link.querySelector('img.works-image');
  const avif = link.querySelector('source[type="image/avif"]');
  // Use first URL in avif srcset or fallback to img src
  const avifSet = avif && avif.getAttribute('srcset');
  if (avifSet) {
    const first = avifSet.split(',')[0].trim();
    const url = first.split(' ')[0];
    return url || (img && (img.currentSrc || img.src)) || link.href || Math.random().toString(36).slice(2);
  }
  return (img && (img.currentSrc || img.src)) || link.href || Math.random().toString(36).slice(2);
}

function enqueueAvifForLink(link){
  if (!isAvifSupported()) return; // no-op if unsupported
  const picture = link.querySelector('picture');
  if (!picture) return;
  const avif = picture.querySelector('source[type="image/avif"]');
  const img = picture.querySelector('img.works-image');
  if (!avif || !img) return;
  const key = computeLinkKey(link);
  link.__previewKey = key;
  if (__worksImageCache.has(key)) return;
  const srcset = avif.getAttribute('srcset');
  if (!srcset) return;
  const sizes = avif.getAttribute('sizes') || img.getAttribute('sizes') || '100vw';
  __worksImageCache.set(key, { status: 'queued', url: null, srcset, sizes, imgEl: null });
  __preloadQueue.push({ key, srcset, sizes });
}

function scheduleWorksAvifPreload(){
  const run = () => {
    try {
      const links = document.querySelectorAll('.works-grid  .works-link');
      links.forEach(enqueueAvifForLink);
      processPreloadQueue();
    } catch(e) {}
  };
  if ('requestIdleCallback' in window) {
    requestIdleCallback(run, { timeout: 1500 });
  } else {
    setTimeout(run, 300);
  }
}

function processPreloadQueue(){
  if (__preloading) return;
  __preloading = true;
  const next = () => {
    if (!__preloadQueue.length) { __preloading = false; return; }
    const { key, srcset, sizes } = __preloadQueue.shift();
    const cache = __worksImageCache.get(key);
    if (!cache) { next(); return; }
    cache.status = 'loading';
    const preImg = new Image();
    try { preImg.decoding = 'async'; } catch(_) {}
    try { preImg.loading = 'eager'; } catch(_) {}
    preImg.sizes = sizes;
    preImg.srcset = srcset;
  // Intentionally avoid setting a fallback src to prevent double fetches
    preImg.onload = () => {
      cache.status = 'loaded';
      cache.imgEl = preImg;
      cache.url = preImg.currentSrc || null;
      if ('requestIdleCallback' in window) {
        requestIdleCallback(next, { timeout: 100 });
      } else {
        setTimeout(next, 0);
      }
    };
    preImg.onerror = () => {
      cache.status = 'error';
      if ('requestIdleCallback' in window) {
        requestIdleCallback(next, { timeout: 100 });
      } else {
        setTimeout(next, 0);
      }
    };
  };
  next();
}

function attachWorksPreviewListeners(){
  if (__worksListenersAttached) return;
  __worksListenersAttached = true;

  let currentLink = null;
  let lastX = 0;
  let rafId = null;
  let targetX = 0;
  let targetY = 0;
  let velocityX = 0;
  let idleTween = null;
  // Relative horizontal position of cursor within current link (0..1)
  let relX = 0.5;
  // Smoothed velocity for rotation (low-pass filtered)
  let smoothVel = 0;
  // Track which key is currently shown to avoid resetting sources on repeated hover
  let currentPreviewKeyShown = null;

  function killIdle(){
    if (idleTween) { idleTween.kill(); idleTween = null; }
  }

  function startIdleSwing(){
    killIdle();
    idleTween = gsap.to(__worksPreviewEl, {
      rotate: `+=${WORKS_PREVIEW_CONFIG.swingAmplitude}`,
      duration: WORKS_PREVIEW_CONFIG.swingDuration / 2,
      ease: 'sine.inOut',
      yoyo: true,
      repeat: -1
    });
  }

  function onEnter(e){
    const link = e.currentTarget;
    currentLink = link;
    killIdle();
    const imgEl = link.querySelector('.works-image');
    if (!imgEl) return;

    // Try AVIF cache first
    let key = link.__previewKey || computeLinkKey(link);
    link.__previewKey = key;
    // Skip resetting sources if it's the same item already shown
    if (currentPreviewKeyShown === key) {
      // still update positions/anim but don't touch src/srcset
    } else {
    const cache = __worksImageCache.get(key);
    const avifSource = link.querySelector('source[type="image/avif"]');
    // Always reflect the hovered link's fallback JPEG/WebP srcset on the <img> element
    __worksPreviewImg.srcset = imgEl.getAttribute('srcset') || '';
    __worksPreviewImg.sizes = imgEl.getAttribute('sizes') || '100vw';
    // If we have a cached AVIF (loaded), populate the <source> with it
    if (cache && cache.status === 'loaded' && cache.srcset) {
      __worksPreviewSourceAvif.srcset = cache.srcset;
      __worksPreviewSourceAvif.sizes = cache.sizes || '100vw';
      // Do not set img.src explicitly; picture will prefer AVIF and not fetch JPEG
    } else if (avifSource) {
      // Mirror the link's AVIF srcset/sizes onto the preview's <source>
      __worksPreviewSourceAvif.srcset = avifSource.getAttribute('srcset') || '';
      __worksPreviewSourceAvif.sizes = avifSource.getAttribute('sizes') || imgEl.getAttribute('sizes') || '100vw';
      // Enqueue for preload so subsequent hovers will hit cache
      enqueueAvifForLink(link);
      processPreloadQueue();
    } else {
      // No AVIF source present; ensure preview source is cleared
      __worksPreviewSourceAvif.srcset = '';
      __worksPreviewSourceAvif.sizes = '';
    }
    currentPreviewKeyShown = key;
    }

    const alt = imgEl.getAttribute('alt') || '';
    __worksPreviewImg.alt = alt;
    targetX = e.clientX + WORKS_PREVIEW_CONFIG.xOffset;
    targetY = e.clientY + WORKS_PREVIEW_CONFIG.yOffset;
    lastX = e.clientX;
    velocityX = 0;
    gsap.killTweensOf(__worksPreviewEl);
    gsap.to(__worksPreviewEl, { autoAlpha: 1, duration: WORKS_PREVIEW_CONFIG.fadeDuration, ease: 'power2.out' });
    // Initialize relX based on entry point
    try {
      const rect = currentLink.getBoundingClientRect();
      relX = gsap.utils.clamp(0,1,(e.clientX - rect.left)/rect.width);
    } catch(_) { relX = 0.5; }
    loop();
  }

  function onLeave(){
    currentLink = null;
    killIdle();
    gsap.to(__worksPreviewEl, { autoAlpha: 0, duration: WORKS_PREVIEW_CONFIG.fadeDuration, ease: 'power2.out', onComplete: killIdle });
  }

  function onMove(e){
    if (!currentLink) return;
    targetX = e.clientX + WORKS_PREVIEW_CONFIG.xOffset;
    targetY = e.clientY + WORKS_PREVIEW_CONFIG.yOffset;
    const dx = e.clientX - lastX;
    lastX = e.clientX;
  // Raw instantaneous velocity
  velocityX = gsap.utils.clamp(-50, 50, dx * 60); // reduce gain to lessen jitter
    // Update relX for dynamic anchoring
    try {
      const rect = currentLink.getBoundingClientRect();
      relX = gsap.utils.clamp(0,1,(e.clientX - rect.left)/rect.width);
    } catch(_) {}
  }

  function loop(){
    if (!currentLink) {
      startIdleSwing();
      return;
    }
    const rect = currentLink.getBoundingClientRect();
    // Only keep alive if still hovering (for delegated cases)
    // Follow smoothing
    const current = gsap.getProperty(__worksPreviewEl, 'x');
    const currentYPos = gsap.getProperty(__worksPreviewEl, 'y');
    const nextX = current + (targetX - current) * WORKS_PREVIEW_CONFIG.followEase;
    const nextY = currentYPos + (targetY - currentYPos) * WORKS_PREVIEW_CONFIG.followEase;
  // Exponential smoothing to avoid jagged rotation
  smoothVel += (velocityX - smoothVel) * 0.1; // smoothing factor (0.1-0.25 reasonable)
  const tilt = (smoothVel / 10) * WORKS_PREVIEW_CONFIG.rotationMax; // map smoothed velocity to tilt
  // Dynamic xPercent: 0 (anchor left) at relX=0, -50 (center) at .5, -100 (anchor right) at 1
  const dynamicXPercent = -relX * 100;
  gsap.set(__worksPreviewEl, { x: nextX, y: nextY, rotate: tilt, xPercent: dynamicXPercent });

  velocityX *= (1 - WORKS_PREVIEW_CONFIG.rotationEase); // decay raw velocity
    rafId = requestAnimationFrame(loop);
  }

  document.addEventListener('mousemove', onMove, { passive: true });

  // Attach to existing & future links (simple approach: query each reinit)
  function bindLinks(){
    const links = document.querySelectorAll('.works-grid  .works-link');
    links.forEach(link => {
      if (link.__previewBound) return;
      link.__previewBound = true;
      link.addEventListener('mouseenter', onEnter);
      link.addEventListener('mouseleave', onLeave);
      link.addEventListener('focus', onEnter);
      link.addEventListener('blur', onLeave);
    // Prepare cache key immediately and enqueue preload
    try { enqueueAvifForLink(link); } catch(_) {}
    });
  }
  bindLinks();

  // Re-bind after each SPA navigation reinit (exposed hook via observer pattern)
  document.addEventListener('works-links-rebind', () => { bindLinks(); processPreloadQueue(); });
}

// Public hook for SPA updates to request rebinding (called externally if needed)
export function rebindWorksLinks(){
  const evt = new CustomEvent('works-links-rebind');
  document.dispatchEvent(evt);
}
