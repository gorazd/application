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

**Gorazd Guštin** - Front-End Designer & Developer

- Website: [Your website]
- Email: [Your email]
- LinkedIn: [Your LinkedIn]
