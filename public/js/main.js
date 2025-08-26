
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
          // Re-run animations after content update
          import("./animations.js").then(({ exampleAnimation }) => {
            exampleAnimation();
          });
        }
      },
    });
  });
}
