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
  const img = document.createElement('img');
  el.appendChild(img);
  document.body.appendChild(el);
  __worksPreviewEl = el;
  __worksPreviewImg = img;

  // Pre-allocate GSAP state
  gsap.set(el, { autoAlpha: 0, rotate: 0, xPercent: -50, yPercent: -50 });

  attachWorksPreviewListeners();
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

    // Prefer the actually chosen responsive candidate
    const chosen = imgEl.currentSrc || imgEl.src || imgEl.getAttribute('src');

    __worksPreviewImg.src = chosen;
    // Also propagate srcset/sizes so future resizes or DPR differences can upgrade quality
    if (imgEl.srcset) {
      __worksPreviewImg.srcset = imgEl.srcset;
    }
    if (imgEl.sizes) {
      __worksPreviewImg.sizes = imgEl.sizes;
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
    });
  }
  bindLinks();

  // Re-bind after each SPA navigation reinit (exposed hook via observer pattern)
  document.addEventListener('works-links-rebind', bindLinks);
}

// Public hook for SPA updates to request rebinding (called externally if needed)
export function rebindWorksLinks(){
  const evt = new CustomEvent('works-links-rebind');
  document.dispatchEvent(evt);
}
