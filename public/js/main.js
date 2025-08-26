
import { gsap } from "gsap";
import { Draggable } from "gsap/Draggable";
import { Flip } from "gsap/Flip";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ScrollToPlugin } from "gsap/ScrollToPlugin";

// Ensure the global `window.gsap` references the same gsap instance we
// imported. If other code or a different bundle set a different gsap on
// `window`, plugin registration can attach to the wrong instance which
// results in runtime getter/type errors.
if (typeof window !== 'undefined') {
  if (!window.gsap) {
    window.gsap = gsap;
  } else if (window.gsap !== gsap) {
    // If there's already a different gsap instance on window, prefer the
    // imported module and overwrite it so plugins register on the active
    // instance used by this module.
    // eslint-disable-next-line no-console
    console.warn('Overwriting window.gsap with imported gsap to avoid multiple instances.');
    window.gsap = gsap;
  }
}

// Register plugins on the (now unified) gsap instance.
gsap.registerPlugin(Draggable, Flip, ScrollTrigger, ScrollToPlugin);

// Runtime debug: expose some gsap/plugin diagnostics in the console so we can
// detect duplicate instances or missing plugin hooks when reproducing the
// TypeError in the browser.
try {
  const runtimeInfo = {
    importedGsap: gsap,
    windowGsap: typeof window !== 'undefined' ? window.gsap : undefined,
    sameInstance: typeof window !== 'undefined' ? window.gsap === gsap : undefined,
    // show plugin keys and a small sample of plugin objects for debugging
    registeredPluginKeys: Object.keys((gsap && gsap._plugins) || {}).slice(0, 50),
    registeredPluginSample: Object.entries((gsap && gsap._plugins) || {}).slice(0, 5).map(([k, v]) => ({ k, hasGet: !!(v && v.get) }))
  };
  // eslint-disable-next-line no-console
  console.info('GSAP runtime info:', runtimeInfo);
} catch (err) {
  // eslint-disable-next-line no-console
  console.warn('Error while reading GSAP runtime info', err);
}

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

  // Set initial theme 
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
  initThemeAndPrint();
  updateActiveNav();
  initSmoothScrolling();
  // Dynamically import animations.js as a module to avoid import syntax error
  import("./animations.js").then(({ exampleAnimation }) => {
    exampleAnimation();
  });

  // === Enhanced Mobile Hamburger & Sliding Nav ===
  const body = document.querySelector('body');
  const header = document.querySelector('header');
  const hamburger = document.getElementById('hamburger');
  const navList = document.getElementById('main-nav-list');
  const hamburgerIcon = hamburger?.querySelector('.hamburger-icon');
  const closeIcon = hamburger?.querySelector('.close-icon');
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
    // if (hamburgerIcon) hamburgerIcon.style.display = 'none';
    // if (closeIcon) closeIcon.style.display = 'inline';
    menuOpen = true;
  }

  function closeMenu() {
    if (body) body.classList.remove('extend-nav');
    if (navList) navList.classList.remove('visible');
    if (hamburger) {
      hamburger.setAttribute('aria-expanded', 'false');
      hamburger.classList.remove('open');
    }
    // if (hamburgerIcon) hamburgerIcon.style.display = 'inline';
    // if (closeIcon) closeIcon.style.display = 'none';
    menuOpen = false;
  }

  function toggleMenu() {
    if (!isMobile()) return;
    if (menuOpen) {
      closeMenu();
    } else {
      openMenu();
      // showNav(); // Always show nav when menu is open
    }
  }

  if (hamburger && navList) {
    hamburger.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleMenu();
    });

    // Close menu when clicking a nav link (mobile)
    navList.addEventListener('click', (e) => {
      if (e.target.tagName === 'A' && isMobile()) {
        closeMenu();
      }
    });

    // Close menu when clicking outside
    document.addEventListener('click', (e) => {
      if (menuOpen && isMobile() && !navList.contains(e.target) && e.target !== hamburger) {
        closeMenu();
      }
    });
  }

  // Slide nav up/down on scroll (mobile only)
  function handleScroll() {
    if (!header) return;
    if (!isMobile()) {
      // showNav();
      // closeMenu();
      return;
    }
    const currentY = window.scrollY;
    if (menuOpen) {
      // If menu is open, close it and show nav
      // closeMenu();
      // showNav();
    }
    if (currentY <= 10) {
      // At top, show nav
      showNav();
      closeMenu();
      lastDirection = 'up';
    } else if (currentY > lastScrollY) {
      // Scrolling down, hide nav
      hideNav();
      lastDirection = 'down';
    } else if (currentY < lastScrollY) {
      // Scrolling up, show nav
      // showNav();
      lastDirection = 'up';
    }
    lastScrollY = currentY;
  }

  window.addEventListener('scroll', handleScroll, { passive: true });
  window.addEventListener('resize', () => {
    // Close menu and reset header on resize
    if (!isMobile()) {
      closeMenu();
      showNav();
    }
  });

  // Initial state
  showNav();
  closeMenu();
});

if (window.navigation) {
  window.navigation.addEventListener("navigate", (event) => {
    const toUrl = new URL(event.destination.url, location.href);
    if (location.origin !== toUrl.origin) return;
    // If only the hash/fragment changes on the same page, don't intercept —
    // let the browser perform native in-page navigation (no view transition).
    if (toUrl.pathname === location.pathname && toUrl.hash && toUrl.hash !== location.hash) {
      return;
    }
    event.intercept({
      async handler() {
        const response = await fetch(toUrl.pathname);
        const data = await response.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(data, 'text/html');

        document.title = doc.title;

        if (typeof document.startViewTransition === 'function') {
          document.startViewTransition(() => {
            document.querySelector('main').innerHTML = doc.querySelector('main').innerHTML;
            document.documentElement.scrollTop = 0;
            updateActiveNav();
            initSmoothScrolling();
            // Re-run animations after content update
            import("./animations.js").then(({ exampleAnimation }) => {
              exampleAnimation();
            });
          });
        } else {
          // Fallback for browsers without View Transitions API
          document.querySelector('main').innerHTML = doc.querySelector('main').innerHTML;
          document.documentElement.scrollTop = 0;
          updateActiveNav();
          initSmoothScrolling();
          // Re-run animations after content update
          import("./animations.js").then(({ exampleAnimation }) => {
            exampleAnimation();
          });
        }
      },
    });
  });
}

function initSmoothScrolling() {
  const anchorLinks = document.querySelectorAll('a[href^="#"]');

  // Safe scroll helper: prefer ScrollToPlugin if it's healthy, otherwise
  // animate window scrolling via a numeric tween and onUpdate, or fall
  // back to native smooth scrolling.
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
    } catch (e) {
      // continue to fallback
    }

    // Fallback: animate a numeric proxy and update window scroll manually
    try {
      const startY = window.scrollY || document.documentElement.scrollTop || 0;
      const obj = { y: startY };
      gsap.to(obj, {
        duration,
        y: targetY,
        ease: 'elastic.out',
        onUpdate: () => window.scrollTo(0, Math.round(obj.y))
      });
      return;
    } catch (err) {
      // Final fallback: native smooth scroll
      try {
        window.scrollTo({ top: targetY, behavior: 'smooth' });
      } catch (e) {
        // last-resort immediate jump
        window.scrollTo(0, targetY);
      }
    }
  }

  anchorLinks.forEach(link => {
    link.addEventListener('click', function(e) {
      console.log('Anchor link clicked:', this.getAttribute('href'));
      e.preventDefault();
      const targetId = this.getAttribute('href');

      // If href is exactly '#' or empty, scroll to top
      if (!targetId || targetId === '#') {
        safeScrollTo(0, 1);
        return;
      }

      // Try querySelector first (works for standard id selectors),
      // fall back to getElementById in case the selector contains
      // characters that make querySelector unhappy.
      let targetElement = null;
      try {
        targetElement = document.querySelector(targetId);
      } catch (err) {
        // ignore invalid selector
      }
      if (!targetElement) {
        const name = targetId.replace(/^#/, '');
        // Try id first
        targetElement = document.getElementById(name);
        if (!targetElement) {
          // Then try a named anchor ([name="..."]) — useful for <a name="..."> anchors
          try {
            targetElement = document.querySelector('[name="' + name.replace(/"/g, '\\"') + '"]');
          } catch (err) {
            // querySelector failed (rare), fall back to getElementsByName
            const els = document.getElementsByName(name);
            targetElement = els && els.length ? els[0] : null;
          }
          // As a last resort also check getElementsByName if querySelector returned null
          if (!targetElement) {
            const els2 = document.getElementsByName(name);
            targetElement = els2 && els2.length ? els2[0] : null;
          }
        }
      }

      if (targetElement) {
        // Calculate numeric scroll target to avoid issues when passing
        // element references to ScrollToPlugin in some environments.
        // If the screen is <=768px use the header height as offset so
        // content isn't hidden under a fixed header; otherwise use 10px.
        const offsetY = (function() {
          try {
            if (window.matchMedia && window.matchMedia('(max-width: 768px)').matches) {
              const headerEl = document.querySelector('header');
              return headerEl ? headerEl.offsetHeight : 0;
            }
          } catch (e) {
            // ignore and fall back to default
          }
          return 10;
        })();
        const rect = targetElement.getBoundingClientRect();
        const targetY = Math.max(0, rect.top + window.pageYOffset - offsetY);

        // Debug info
        // eslint-disable-next-line no-console
        console.info('Smooth scroll target resolved:', { targetElement, name, rectTop: rect.top, pageYOffset: window.pageYOffset, targetY });

        safeScrollTo(targetY, 1);
      } else {
        // Debug - target not found
        // eslint-disable-next-line no-console
        console.warn('Smooth scroll: target not found for', targetId, '(falling back to top)');
        safeScrollTo(0, 1);
      }
    });
  });
}
