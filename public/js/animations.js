import { gsap } from "gsap";
import { Draggable } from "gsap/Draggable";
import { Flip } from "gsap/Flip";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ScrollToPlugin } from "gsap/ScrollToPlugin";

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
