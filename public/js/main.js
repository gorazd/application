
console.log("Less goo");
import { gsap } from "gsap";
import { Draggable } from "gsap/Draggable";
import { Flip } from "gsap/Flip";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ScrollToPlugin } from "gsap/ScrollToPlugin";
import { SplitText } from "gsap/SplitText";

if (typeof window !== 'undefined') {
  if (!window.gsap) {
    window.gsap = gsap;
  } else if (window.gsap !== gsap) {
    window.gsap = gsap;
  }
}

gsap.registerPlugin(Draggable, Flip, ScrollTrigger, ScrollToPlugin, SplitText);

function updateActiveNav() {
  const navLinks = document.querySelectorAll('header nav a');
  navLinks.forEach(link => {
    if (link.getAttribute('href') === window.location.pathname) {
      link.classList.add('active');
    } else {
      link.classList.remove('active');
    }
  });
}

function initThemeAndPrint() {
  const themeToggle = document.getElementById('theme-toggle');
  const sunIcon = themeToggle?.querySelector('.feather-sun');
  const moonIcon = themeToggle?.querySelector('.feather-moon');
  const printButton = document.getElementById('print-button');

  function setTheme(theme) {
    if (!sunIcon || !moonIcon) return;
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
      sunIcon.style.display = 'block';
      moonIcon.style.display = 'none';
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      sunIcon.style.display = 'none';
      moonIcon.style.display = 'block';
      localStorage.setItem('theme', 'light');
    }
  }

  if (themeToggle) {
    themeToggle.onclick = () => {
      const currentTheme = localStorage.getItem('theme') || 'light';
      setTheme(currentTheme === 'light' ? 'dark' : 'light');
    };
  }

  if (printButton) {
    printButton.onclick = () => {
      window.print();
    };
  }

  const savedTheme = localStorage.getItem('theme');
  const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  if (savedTheme) {
    setTheme(savedTheme);
  } else if (prefersDark) {
    setTheme('dark');
  } else {
    setTheme('light');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  console.log("DOM fully loaded and parsed");
  initThemeAndPrint();
  updateActiveNav();
  initSmoothScrolling();
  import("./animations.js").then(({ animations }) => {
    animations();
  });

  const body = document.querySelector('body');
  const header = document.querySelector('header');
  const hamburger = document.getElementById('hamburger');
  const navList = document.getElementById('main-nav-list');
  let lastScrollY = window.scrollY;
  let menuOpen = false;
  let lastDirection = 'up';

  function isMobile() {
    return window.matchMedia('(max-width: 768px)').matches;
  }

  function showNav() {
    if (body) body.classList.remove('hide-nav');
  }
  function hideNav() {
    if (body) body.classList.add('hide-nav');
  }

  function openMenu() {
    if (body) body.classList.add('extend-nav');
    if (navList) navList.classList.add('visible');
    if (hamburger) {
      hamburger.setAttribute('aria-expanded', 'true');
      hamburger.classList.add('open');
    }
    menuOpen = true;
  }

  function closeMenu() {
    if (body) body.classList.remove('extend-nav');
    if (navList) navList.classList.remove('visible');
    if (hamburger) {
      hamburger.setAttribute('aria-expanded', 'false');
      hamburger.classList.remove('open');
    }
    menuOpen = false;
  }

  function toggleMenu() {
    if (!isMobile()) return;
    if (menuOpen) {
      closeMenu();
    } else {
      openMenu();
    }
  }

  if (hamburger && navList) {
    hamburger.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleMenu();
    });

    navList.addEventListener('click', (e) => {
      if (e.target.tagName === 'A' && isMobile()) {
        closeMenu();
      }
    });

    document.addEventListener('click', (e) => {
      if (menuOpen && isMobile() && !navList.contains(e.target) && e.target !== hamburger) {
        closeMenu();
      }
    });
  }

  function handleScroll() {
    if (!header) return;
    if (!isMobile()) {
      return;
    }
    const currentY = window.scrollY;
    if (currentY <= 10) {
      showNav();
      closeMenu();
      lastDirection = 'up';
    } else if (currentY > lastScrollY) {
      hideNav();
      lastDirection = 'down';
    } else if (currentY < lastScrollY) {
      lastDirection = 'up';
    }
    lastScrollY = currentY;
  }

  window.addEventListener('scroll', handleScroll, { passive: true });
  window.addEventListener('resize', () => {
    if (!isMobile()) {
      closeMenu();
      showNav();
    }
  });

  showNav();
  closeMenu();
});

// Detect Safari
function isSafari() {
  return /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
}

// Cross-browser navigation handling
function initSinglePageNavigation() {
  // Handle clicks on internal links
  document.addEventListener('click', (event) => {
    const link = event.target.closest('a');
    if (!link) return;
    
    const href = link.getAttribute('href');
    if (!href || href.startsWith('#') || href.startsWith('http') || href.startsWith('mailto:') || href.startsWith('tel:')) {
      return; // Skip hash links, external links, email, phone
    }
    
    const url = new URL(href, location.href);
    if (url.origin !== location.origin) return; // Skip external links
    
    event.preventDefault();
    navigateToPage(url.pathname);
  });
  
  // Handle browser back/forward buttons
  window.addEventListener('popstate', (event) => {
    navigateToPage(location.pathname, false);
  });
}

async function navigateToPage(pathname, pushState = true) {
  try {
    const response = await fetch(pathname);
    const data = await response.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(data, 'text/html');

    document.title = doc.title;
    
    if (pushState) {
      history.pushState(null, '', pathname);
    }

    // Use View Transitions API if available, otherwise fallback to custom animation
    if (typeof document.startViewTransition === 'function') {
      document.startViewTransition(() => {
        updatePageContent(doc);
      });
    } else {
      // Custom transition for Safari and other browsers
      await customPageTransition(doc);
    }
  } catch (error) {
    console.error('Navigation failed:', error);
    // Fall back to regular navigation
    window.location.href = pathname;
  }
}

function updatePageContent(doc) {
  document.querySelector('main').innerHTML = doc.querySelector('main').innerHTML;
  document.documentElement.scrollTop = 0;
  updateActiveNav();
  initSmoothScrolling();
  import("./animations.js").then(({ animations }) => {
    animations();
  });
}

async function customPageTransition(doc) {
  const main = document.querySelector('main');
  
  // Fade out current content
  main.style.opacity = '0';
  main.style.transform = 'translateY(-80px)';
  main.style.transition = 'opacity 180ms cubic-bezier(0.4, 0, 1, 1), transform 180ms cubic-bezier(0.4, 0, 1, 1)';
  
  // Wait for fade out
  await new Promise(resolve => setTimeout(resolve, 180));
  
  // Update content
  updatePageContent(doc);
  
  // Fade in new content
  main.style.opacity = '0';
  main.style.transform = 'translateY(10px)';
  
  // Trigger reflow
  main.offsetHeight;
  
  main.style.transition = 'opacity 320ms cubic-bezier(0, 0, 0.6, 1) 90ms, transform 320ms cubic-bezier(0, 0, 0.6, 1) 90ms';
  main.style.opacity = '1';
  main.style.transform = 'translateY(0)';
  
  // Clean up styles after animation
  setTimeout(() => {
    main.style.transition = '';
    main.style.transform = '';
    main.style.opacity = '';
  }, 500);
}

// Initialize navigation handling
initSinglePageNavigation();

function initSmoothScrolling() {
  console.log("Initializing smooth scrolling...");
  const anchorLinks = document.querySelectorAll('a[href^="#"]');

  function safeScrollTo(targetY, duration = 1) {
    try {
      const plugins = gsap && gsap._plugins;
      const hasScrollTo = !!(plugins && plugins.scrollTo && typeof plugins.scrollTo.get === 'function');
      if (hasScrollTo) {
        gsap.to(window, {
          duration,
          scrollTo: { y: targetY },
          ease: 'power2.inOut'
        });
        return;
      }
    } catch (e) {}

    try {
      const startY = window.scrollY || document.documentElement.scrollTop || 0;
      const obj = { y: startY };
      gsap.to(obj, {
        duration,
        y: targetY,
        ease: 'power4.inOut',
        onUpdate: () => window.scrollTo(0, Math.round(obj.y))
      });
      return;
    } catch (err) {
      try {
        window.scrollTo({ top: targetY, behavior: 'smooth' });
      } catch (e) {
        window.scrollTo(0, targetY);
      }
    }
  }

  anchorLinks.forEach(link => {
    link.addEventListener('click', function(e) {
      e.preventDefault();
      const targetId = this.getAttribute('href');

      if (!targetId || targetId === '#') {
        safeScrollTo(0, 1);
        return;
      }

      let targetElement = null;
      try {
        targetElement = document.querySelector(targetId);
      } catch (err) {}
      if (!targetElement) {
        const name = targetId.replace(/^#/, '');
        targetElement = document.getElementById(name);
        if (!targetElement) {
          try {
            targetElement = document.querySelector('[name="' + name.replace(/"/g, '\\"') + '"]');
          } catch (err) {
            const els = document.getElementsByName(name);
            targetElement = els && els.length ? els[0] : null;
          }
          if (!targetElement) {
            const els2 = document.getElementsByName(name);
            targetElement = els2 && els2.length ? els2[0] : null;
          }
        }
      }

      if (targetElement) {
        const offsetY = (function() {
          try {
            if (window.matchMedia && window.matchMedia('(max-width: 768px)').matches) {
              const headerEl = document.querySelector('header');
              return headerEl ? headerEl.offsetHeight : 0;
            }
          } catch (e) {}
          return 10;
        })();
        const rect = targetElement.getBoundingClientRect();
        const targetY = Math.max(0, rect.top + window.pageYOffset - offsetY);

        safeScrollTo(targetY, 1);
      } else {
        safeScrollTo(0, 1);
      }
    });
  });
}
