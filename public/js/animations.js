import { SplitText } from "gsap/SplitText";
import { DrawSVGPlugin } from "gsap/DrawSVGPlugin";
import { ScrollTrigger } from "gsap/ScrollTrigger";

// Idempotent plugin registration
if (!gsap.core.globals().DrawSVGPlugin) {
  try { gsap.registerPlugin(DrawSVGPlugin, ScrollTrigger); } catch(e) {}
}

let __animationsInitialized = false;

export function initAnimationsOnce() {
  if (__animationsInitialized) return;
  __animationsInitialized = true;
  // Any one-time setup could go here (e.g., global timelines)
}

export function reinitAnimations() {
  // Run per-navigation animations
  schedulePerPageAnimations();
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
