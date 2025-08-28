import { SplitText } from "gsap/SplitText";
import { DrawSVGPlugin } from "gsap/DrawSVGPlugin";
import { ScrollTrigger } from "gsap/ScrollTrigger";

// Register the plugins
gsap.registerPlugin(DrawSVGPlugin, ScrollTrigger);

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
    // Make the element visible (it's hidden in CSS initially)
    gsap.set(introElement, { opacity: 1 });
    
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
  
  // Add signature drawing animation with ScrollTrigger
  animateSignature();
}

function animateSignature() {
  const signatureSVG = document.querySelector('#signature');
  
  if (signatureSVG) {
    // Get all path elements in the SVG
    const paths = signatureSVG.querySelectorAll('path');
    
    if (paths.length > 0) {
      console.log(`Found ${paths.length} path elements in signature SVG.`);
      
      // Initially set all paths to be "undrawn"
      gsap.set(paths, { drawSVG: "0%" });
      
      // Create a timeline for sequential path drawing
      const signatureTimeline = gsap.timeline({
        scrollTrigger: {
          trigger: signatureSVG,
          start: "top 90%",
          end: "50% 80%",
          toggleActions: "play none none reverse",
          // Optional: uncomment the line below to see the trigger points during development
          // markers: true,
          scrub: 3
        }
      });
      
      // Add each path to the timeline sequentially (one after another)
      paths.forEach((path, index) => {
        signatureTimeline.to(path, {
          drawSVG: "100%",
          duration: 1,
          ease: "power4.out",
          stagger: 0.5
        });  // First path starts immediately, others start after previous completes
      });
      
      console.log("Sequential signature animation initialized with ScrollTrigger.");
    } else {
      console.warn("No path elements found in signature SVG.");
    }
  } else {
    console.warn("Signature SVG with ID 'signature' not found.");
  }
}
