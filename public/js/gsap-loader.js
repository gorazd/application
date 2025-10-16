let loaderPromise = null;
let cachedModules = null;

export function loadGsap() {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("GSAP can only be loaded in a browser environment."));
  }

  if (cachedModules) {
    return Promise.resolve(cachedModules);
  }

  if (!loaderPromise) {
    loaderPromise = Promise.all([
      import("gsap"),
      import("gsap/ScrollTrigger"),
      import("gsap/ScrollToPlugin"),
      import("gsap/SplitText"),
      import("gsap/DrawSVGPlugin"),
    ])
      .then(([core, scrollTriggerMod, scrollToMod, splitTextMod, drawSvgMod]) => {
        const coreResolved = core && (core.gsap || core.default) ? (core.gsap || core.default) : core;
        const gsap = coreResolved && coreResolved.gsap ? coreResolved.gsap : coreResolved;

        const scrollTriggerResolved = scrollTriggerMod && (scrollTriggerMod.ScrollTrigger || scrollTriggerMod.default)
          ? scrollTriggerMod.ScrollTrigger || scrollTriggerMod.default
          : scrollTriggerMod;
        const ScrollTrigger = scrollTriggerResolved && scrollTriggerResolved.ScrollTrigger
          ? scrollTriggerResolved.ScrollTrigger
          : scrollTriggerResolved;

        const scrollToResolved = scrollToMod && (scrollToMod.ScrollToPlugin || scrollToMod.default)
          ? scrollToMod.ScrollToPlugin || scrollToMod.default
          : scrollToMod;
        const ScrollToPlugin = scrollToResolved && scrollToResolved.ScrollToPlugin
          ? scrollToResolved.ScrollToPlugin
          : scrollToResolved;

        const splitTextResolved = splitTextMod && (splitTextMod.SplitText || splitTextMod.default)
          ? splitTextMod.SplitText || splitTextMod.default
          : splitTextMod;
        const SplitText = splitTextResolved && splitTextResolved.SplitText
          ? splitTextResolved.SplitText
          : splitTextResolved;

        const drawSvgResolved = drawSvgMod && (drawSvgMod.DrawSVGPlugin || drawSvgMod.default)
          ? drawSvgMod.DrawSVGPlugin || drawSvgMod.default
          : drawSvgMod;
        const DrawSVGPlugin = drawSvgResolved && drawSvgResolved.DrawSVGPlugin
          ? drawSvgResolved.DrawSVGPlugin
          : drawSvgResolved;

        if (gsap && ScrollTrigger && ScrollToPlugin && SplitText && DrawSVGPlugin) {
          try {
            gsap.registerPlugin(ScrollTrigger, ScrollToPlugin, SplitText, DrawSVGPlugin);
          } catch (error) {
            console.warn("GSAP plugin registration failed", error);
          }
        }

        if (typeof window !== "undefined" && gsap && !window.gsap) {
          window.gsap = gsap;
        }

        cachedModules = { gsap, ScrollTrigger, ScrollToPlugin, SplitText, DrawSVGPlugin };
        return cachedModules;
      })
      .catch((error) => {
        loaderPromise = null;
        throw error;
      });
  }

  return loaderPromise;
}

export function getGsapCached() {
  return cachedModules;
}
