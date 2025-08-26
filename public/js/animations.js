export function animations() {
  // Check if elements with class 'animate-me' exist before animating
  const targets = document.querySelectorAll(".animate-me");
  if (targets.length === 0) {
    console.warn("GSAP target .animate-me not found.");
    return;
  }
  gsap.from(targets, { duration: .6, y: 100, ease: "power1.out", stagger: .4 });
  console.log("GSAP animation executed.");
}
