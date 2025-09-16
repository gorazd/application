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
  rotationMax: 5,       // deg max tilt
  rotationEase: 0.25,
  fadeDuration: 0.25,
  swingAmplitude: 12.5,   // deg small idle swing
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
  gsap.from('h1', { duration: .6, y: 15, autoAlpha: 0, ease: "power1.inOut", delay: 0.1 });
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
    const src = imgEl.getAttribute('src');
    const alt = imgEl.getAttribute('alt') || '';
    __worksPreviewImg.src = src;
    __worksPreviewImg.alt = alt;
    targetX = e.clientX + WORKS_PREVIEW_CONFIG.xOffset;
    targetY = e.clientY + WORKS_PREVIEW_CONFIG.yOffset;
    lastX = e.clientX;
    velocityX = 0;
    gsap.killTweensOf(__worksPreviewEl);
    gsap.to(__worksPreviewEl, { autoAlpha: 1, duration: WORKS_PREVIEW_CONFIG.fadeDuration, ease: 'power2.out' });
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
    velocityX = gsap.utils.clamp(-50, 50, dx * 10); // scaled velocity
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
    const tilt = (velocityX / 50) * WORKS_PREVIEW_CONFIG.rotationMax; // map velocity to tilt
    gsap.set(__worksPreviewEl, { x: nextX, y: nextY, rotate: tilt });

    velocityX *= (1 - WORKS_PREVIEW_CONFIG.rotationEase); // decay velocity for tilt smoothing
    rafId = requestAnimationFrame(loop);
  }

  document.addEventListener('mousemove', onMove, { passive: true });

  // Attach to existing & future links (simple approach: query each reinit)
  function bindLinks(){
    const links = document.querySelectorAll('.works-grid > .works-link');
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
