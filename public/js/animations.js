import { gsap } from "gsap";
import { Draggable } from "gsap/Draggable";
import { Flip } from "gsap/Flip";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ScrollToPlugin } from "gsap/ScrollToPlugin";

// Plugins are registered from the main entry (`main.js`) to avoid double
// registration when modules are loaded separately or when the bundle and
// module imports coexist during development.

export function exampleAnimation() {
  // Check if elements with class 'animate-me' exist before animating
  const targets = document.querySelectorAll(".animate-me");
  if (targets.length === 0) {
    console.warn("GSAP target .animate-me not found.");
    return;
  }
  gsap.from(targets, { duration: .6, y: 100, ease: "power1.out", stagger: .4 });
  console.log("GSAP animation executed.");
}
