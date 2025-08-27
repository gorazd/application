# Gemini Project Information

This file contains project-specific information for the Gemini AI assistant.

## Project Overview

This is a job application website built with Eleventy and uses a custom esbuild script for JavaScript bundling. It uses GSAP for animations.

## Directory Structure

*   **Input:** `content`
*   **Output:** `_site`
*   **Includes:** `_includes`
*   **Data:** `_data`
*   **Static Assets:** `public` (copied to `/`)

## Key Technologies

*   **[@11ty/eleventy](https://www.11ty.dev/):** Static site generator.
*   **[esbuild](https://esbuild.github.io/):** A fast JavaScript bundler and minifier.
*   **[GSAP](https://greensock.com/gsap/):** JavaScript animation library.

## Available Commands

*   `npm start`: Starts the Eleventy development server and watches for JavaScript changes.
*   `npm run build`: Builds the site for production.
*   `npm run build:js`: Runs the custom esbuild script to bundle JavaScript.

## Build & Deployment

*   The site is built using Eleventy and a custom `build-js.js` script that uses `esbuild`.
*   The project is configured for deployment on Netlify.
*   Netlify is configured to handle 404 pages.
