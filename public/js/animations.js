import { SplitText } from "gsap/SplitText";

export function animations() {
  // Check if elements with class 'animate-me' exist before animating
  const targets = document.querySelectorAll(".animate-me");
  if (targets.length === 0) {
    console.warn("GSAP target .animate-me not found.");
  } else {
    gsap.from(targets, { duration: .6, y: 100, ease: "power1.out", stagger: .4 });
    console.log("GSAP animation executed.");
  }
  
  // Add typewriter effect to introduction text using SplitText
  const introElement = document.querySelector('.title');
  if (introElement) {
    // Split the text into characters
    const splitText = new SplitText(introElement, { type: "chars" });
    
    // Initially hide all characters
    gsap.set(splitText.chars, { opacity: 0 });
    
    // Animate characters one by one with typewriter effect
    gsap.to(splitText.chars, {
      opacity: 1,
      duration: 0.4,
      stagger: 0.04,
      ease: "bounce.out",
      delay: 0.25
    });
    
    console.log("Typewriter effect applied.");
  } else {
    console.warn("Typewriter effect NOT applied.");
  }
}
