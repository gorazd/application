# Job Application Website

A personal job application website built with Eleventy, featuring modern front-end technologies and smooth animations. This project showcases professional experience, portfolio work, and serves as a demonstration of technical capabilities.

## Overview

This is a custom-built job application website that includes:
- **Portfolio showcase** with selected works
- **Professional CV** with detailed experience
- **Cover letter** tailored for specific positions
- **Responsive design** optimized for all devices
- **Smooth animations** powered by GSAP
- **Modern build pipeline** with esbuild and Eleventy

## Technologies Used

- **[Eleventy](https://www.11ty.dev/)** - Static site generator
- **[esbuild](https://esbuild.github.io/)** - Fast JavaScript bundler
- **[GSAP](https://greensock.com/gsap/)** - Animation library
- **HTML5, CSS3, JavaScript ES6+**
- **Nunjucks** templating
- **Markdown** for content

## Features

- 🎨 Custom design built from scratch
- 📱 Fully responsive layout
- ⚡ Fast loading with optimized assets
- 🌙 Dark/light theme toggle
- 🎯 Smooth scrolling navigation
- 📄 Print-friendly CV layout
- 🔧 Modern development workflow

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm

### Installation

1. Clone the repository:
```bash
git clone https://github.com/gorazd/application.git
cd application
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm start
```

The site will be available at `http://localhost:8080`

### Build for Production

```bash
npm run build
```

## Project Structure

```
├── content/           # Markdown content files
├── _includes/         # Eleventy templates and layouts
├── _data/            # Site data and configuration
├── public/           # Static assets (CSS, JS, images)
├── _site/            # Generated site output
├── build-js.js       # Custom esbuild configuration
└── .eleventy.js      # Eleventy configuration
```

## Available Scripts

- `npm start` - Development server with live reload
- `npm run build` - Production build
- `npm run build:js` - Build JavaScript only
- `npm run build:js:prod` - Build JavaScript for production

## Deployment

The site is configured for deployment on Netlify and includes:
- Automatic builds on push
- 404 page handling
- Environment-specific builds

## Navigation Performance Optimization

Implemented a multi-phase SPA-like navigation system focused on reducing perceived and actual navigation latency:

- Performance marks (nav-start/nav-end) with Long Task observation.
- Overlapped fetch + exit transition; removed fixed artificial delays.
- In-memory HTML cache + pointerenter/focus prefetch (80ms debounce).
- Idempotent animations: single import + reinit only, heavy animation work deferred with `requestIdleCallback` fallback.
- Progressive enhancement using View Transitions API with custom CSS fallback transitions.
- Concurrency guard via `AbortController` preventing overlapping fetches and ignoring redundant same-path clicks.
- Class-based page-enter/page-exit transitions to avoid inline style thrash.
- Sanitation/helpers reducing duplicated DOM queries and origin checks.
- Diagnostic utilities: `__navMetrics()` (quick stats) and `__navSummary()` (median, p95, mean, heuristic cache hit ratio).

Enhancements (Post-Phases):
- Cache TTL & LRU: in-memory cache capped (`NAV_CACHE_MAX_ENTRIES`=20) with 5‑minute TTL (`NAV_CACHE_TTL_MS`). Expired or least‑recently used entries are evicted automatically.
- Opt‑out attribute: add `data-no-spa` on any `<a>` to force a full page load (skips interception & prefetch).
- Performance budgets: configurable runtime budgets with warnings when exceeded.

Runtime Diagnostics & APIs (open DevTools Console):
```js
__navMetrics();        // Quick count/median/p95 summary
__navSummary();        // Collapsed console table summary
__navExport();         // Detailed per-navigation records (path, duration, cached, longTasks)
__setNavBudgets({      // Update performance budget thresholds
	warnMedian: 320,
	warnP95: 800,
	warnLongTasks: 2
});
// Current budgets available at window.__navBudgets
```

Performance Budgets (defaults):
- Median warning: 350ms
- P95 warning: 900ms
- Long Tasks per navigation: >3

When a threshold is exceeded a `[nav-budget]` warning logs with context.

Rollback: checkout a pre-optimization tag (create one before merging, e.g. `git tag pre-nav-optimization`) or remove SPA init & related instrumentation blocks in `public/js/main.js`.

Future Opportunities:
- Persist navigation metrics to a JSON artifact for CI diffing.
- Lighthouse CI integration with budgets (TBT, CLS, LCP targets).
- Add `data-preload` hint to elevate priority of specific prefetch routes.
- Service Worker layer for offline cache & stale‑while‑revalidate.

## License

MIT License

Copyright (c) 2025 Gorazd Guštin

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

## Author

**Gorazd Guštin** - Front-end Designer & Developer

- Website: https://qua.si
- Email: gorazd@qua.si
