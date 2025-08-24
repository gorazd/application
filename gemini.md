# Gemini Project Information

This file contains project-specific information for the Gemini AI assistant.

## Project Overview

This is a job application website built with Eleventy and Vite. It uses GSAP for animations.

## Directory Structure

*   **Input:** `content`
*   **Output:** `_site`
*   **Includes:** `_includes`
*   **Data:** `_data`
*   **Static Assets:** `public` (copied to `/`)

## Key Technologies

*   **[@11ty/eleventy](https://www.11ty.dev/):** Static site generator.
*   **[Vite](https://vitejs.dev/):** Frontend build tool.
*   **[GSAP](https://greensock.com/gsap/):** JavaScript animation library.

## Available Commands

*   `npm start`: Starts the Eleventy development server.
*   `npm run build`: Builds the site for production.

## Build & Deployment

*   The site is built using Eleventy and Vite.
*   Vite is configured to use `esbuild` for minification.
*   The project is configured for deployment on Netlify.
*   Netlify is configured to handle 404 pages.