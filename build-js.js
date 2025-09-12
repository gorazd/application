import * as esbuild from 'esbuild';
import path from 'path';
import { promises as fs } from 'fs';

const isWatch = process.argv.includes('--watch');
const isProd = process.env.ELEVENTY_ENV === 'production';

const buildOptions = {
  entryPoints: ['public/js/main.js'],
  // Use outdir + code splitting (esbuild will create a main bundle + shared chunks)
  outdir: '_site/js',
  entryNames: '[name]-[hash]',
  assetNames: 'assets/[name]-[hash]',
  chunkNames: 'chunks/[name]-[hash]',
  bundle: true,
  splitting: true,
  minify: isProd,
  sourcemap: isProd ? 'external' : 'inline',
  target: ['es2020'],
  format: 'esm',
  platform: 'browser',
  external: [],
  define: {
    'process.env.NODE_ENV': JSON.stringify(isProd ? 'production' : 'development')
  },
  metafile: true,
  logLevel: 'info',
  treeShaking: true,
  legalComments: 'none',
  mainFields: ['module', 'main'],
  conditions: ['import', 'module', 'default'],
  // Preserve console.* statements in production builds
  drop: isProd ? [] : [],
};

async function writeStableAlias(metafile) {
  // Find the emitted main entry file and copy to main.bundle.js for template stability.
  const outputs = Object.keys(metafile.outputs || {});
  const mainOut = outputs.find(o => /\/main-[A-Z0-9]{8}\.js$/i.test(o) || /\/main-[A-Z0-9]{6,}\.js$/i.test(o));
  if (!mainOut) {
    console.warn('[alias] Could not locate hashed main output for aliasing.');
    return;
  }
  const absOut = path.resolve(mainOut);
  const stablePath = path.resolve('_site/js/main.bundle.js');
  try {
    const code = await fs.readFile(absOut);
    await fs.writeFile(stablePath, code);
    console.log(`[alias] Wrote stable alias: ${stablePath}`);
  } catch (e) {
    console.warn('[alias] Failed to write stable alias:', e);
  }
}

async function build() {
  try {
    console.log(`📦 Building JavaScript (${isProd ? 'production' : 'development'})...`);
    
    if (isWatch) {
        const context = await esbuild.context(buildOptions);
        await context.watch();
        console.log('👀 Watching JavaScript files...');
    } else {
        const result = await esbuild.build(buildOptions);
    
        if (result.metafile) {
          const analysis = await esbuild.analyzeMetafile(result.metafile, { color: true });
          console.log('📊 Bundle analysis:\n', analysis);
          await writeStableAlias(result.metafile);
        }
        
        console.log('✅ JavaScript build complete');
    }
  } catch (error) {
    console.error('❌ JavaScript build failed:', error);
    process.exit(1);
  }
}

build();
