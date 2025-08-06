import { gsap } from "/node_modules/gsap/index.js";
import { Draggable } from "/node_modules/gsap/Draggable.js";
import { Flip } from "/node_modules/gsap/Flip.js";
import { ScrollTrigger } from "/node_modules/gsap/ScrollTrigger.js";
import { ScrollToPlugin } from "/node_modules/gsap/ScrollToPlugin.js";

gsap.registerPlugin(Draggable, Flip, ScrollTrigger, ScrollToPlugin);

export function exampleAnimation() {
  // Check if elements with class 'animate-me' exist before animating
  const targets = document.querySelectorAll(".animate-me");
  if (targets.length === 0) {
    console.warn("GSAP target .animate-me not found.");
    return;
  }
  gsap.from(targets, { duration: 1, y: 100 });
}
