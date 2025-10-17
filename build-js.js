import * as esbuild from 'esbuild';
import path from 'path';

const isWatch = process.argv.includes('--watch');
const isProd = process.env.ELEVENTY_ENV === 'production';

const buildOptions = {
  entryPoints: [
    'public/js/main.js',
    'public/js/matter.js'
  ],
  outdir: '_site/js',
  entryNames: '[name].bundle',
  bundle: true,
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
        }
        
        console.log('✅ JavaScript build complete');
    }
  } catch (error) {
    console.error('❌ JavaScript build failed:', error);
    process.exit(1);
  }
}

build();
