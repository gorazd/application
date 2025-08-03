
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
});

if (window.navigation) {
  window.navigation.addEventListener("navigate", (event) => {
    const toUrl = new URL(event.destination.url);
    if (location.origin !== toUrl.origin) return;
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
          });
        } else {
          // Fallback for browsers without View Transitions API
          document.querySelector('main').innerHTML = doc.querySelector('main').innerHTML;
          document.documentElement.scrollTop = 0;
          updateActiveNav();
        }
      },
    });
  });
}
