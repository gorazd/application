// three-loader.js
// Progressive, lazy loading logic for three-init.
// Features:
// 1. IntersectionObserver defers loading until #three-root is near viewport.
// 2. Idle prefetch (requestIdleCallback / setTimeout fallback) if user lingers.
// 3. Single-flight guard to avoid duplicate loads.
// 4. Optional manual trigger via window.loadThreeScene().

let loadStarted = false;
let loadCompleted = false;
let pendingPromise = null;
let cachedModule = null; // keep reference to call init again on revisit

function dynamicImport() {
  if (loadCompleted) {
    try { cachedModule && cachedModule.initThreeScene && cachedModule.initThreeScene(); } catch(e) {}
    return Promise.resolve();
  }
  if (pendingPromise) return pendingPromise;
  loadStarted = true;
  pendingPromise = import('./three-init.js')
    .then(mod => {
      cachedModule = mod;
      if (mod.initThreeScene) mod.initThreeScene();
      loadCompleted = true;
    })
    .catch(err => {
      console.error('[three-loader] Failed to load three-init:', err);
    });
  return pendingPromise;
}

export function setupThreeLoader(options = {}) {
  const root = document.getElementById('three-root');
  if (!root) return; // Page doesn't need Three.
  // If already loaded previously, just (re)init immediately
  if (loadCompleted) {
    try { cachedModule && cachedModule.initThreeScene && cachedModule.initThreeScene(); } catch(e) {}
    return;
  }
  if (loadStarted) return;

  const margin = options.rootMargin || '300px';
  const prefetchDelay = options.prefetchDelay || 2500; // ms

  // IntersectionObserver strategy
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          observer.disconnect();
          dynamicImport();
          break;
        }
      }
    }, { root: null, rootMargin: margin, threshold: 0.01 });
    observer.observe(root);
  } else {
    // Fallback: load after a short delay if no IO support.
    setTimeout(dynamicImport, 1200);
  }

  // Idle prefetch (if user hasn't scrolled to it yet)
  function scheduleIdlePrefetch() {
    if (loadStarted || loadCompleted) return;
    if ('requestIdleCallback' in window) {
      requestIdleCallback(() => {
        if (!loadStarted) dynamicImport();
      }, { timeout: prefetchDelay });
    } else {
      setTimeout(() => { if (!loadStarted) dynamicImport(); }, prefetchDelay);
    }
  }
  scheduleIdlePrefetch();

  // Manual hook (e.g., user clicks a reveal button earlier)
  window.loadThreeScene = () => dynamicImport();
}

// Optional quick prefetch hint injection for the chunk (best effort heuristic)
export function injectPrefetchHint() {
  if (document.querySelector('link[data-three-prefetch]')) return;
  const link = document.createElement('link');
  link.rel = 'prefetch';
  // We don't know the hashed chunk name at author time; rely on runtime discovery if already loaded.
  // If already loaded, attempt to scan module graph (not trivial). Keep placeholder for future enhancement.
  link.href = '#';
  link.as = 'script';
  link.crossOrigin = 'anonymous';
  link.dataset.threePrefetch = '1';
  document.head.appendChild(link);
}
