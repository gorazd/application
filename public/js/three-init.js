// Basic Three.js scene setup encapsulated in a function so we can call it after SPA navigations.
// The scene will attach a canvas to an element with id "three-root" if present, otherwise to body.
// Selective imports to aid tree-shaking instead of namespace import.
import {
  Scene,
  PerspectiveCamera,
  HemisphereLight,
  DirectionalLight,
  SRGBColorSpace,
  Group,
  Box3,
  Vector3,
  ACESFilmicToneMapping
} from 'three';
import { WebGPURenderer } from 'three/webgpu';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
// TSL (Three Shader Language) utilities for halftone effect
import { color as tslColor, mix, normalWorld, output, Fn, uniform, vec4, rotate, screenCoordinate, screenSize } from 'three/tsl';
// Node-based material compatible with TSL (exported from three/webgpu build)
import { MeshStandardNodeMaterial } from 'three/webgpu';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

let __threeMounted = false;
let __resizeHandler = null;
let __rafId = 0;
let __renderer = null;
let __spinTween = null;
let __clockStart = 0;

// Halftone configuration (adapted from three.js WebGPU TSL example)
let __halftoneSettings = null;
let __halftonesFn = null;

export async function initThreeScene() {
  const container = document.getElementById('three-root');
  if (!container) return; // Only initialize on pages with #three-root

  // If previously mounted but canvas got removed (due to SPA swap), allow re-init
  if (__threeMounted && (!__renderer || !__renderer.domElement || !document.contains(__renderer.domElement))) {
    __threeMounted = false;
  }
  if (__threeMounted) return; // still active and attached, don't duplicate

  const scene = new Scene();
  // Transparent background so underlying page shows through
  scene.background = null;

  const camera = new PerspectiveCamera(75, 1, 0.1, 70); // square aspect for 400x400
  camera.position.set(0, 0, 3);
  camera.lookAt(0, 0, 0);

  // (guard handled above)

  // Use WebGPU renderer (auto-fallback to WebGL2 if not supported)
  const renderer = new WebGPURenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(400, 400, false);
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.physicallyCorrectLights = true;
  renderer.toneMappingExposure = 1.1;
  renderer.toneMapping = ACESFilmicToneMapping;
  container.appendChild(renderer.domElement);
  __renderer = renderer;
  // Ensure WebGPU backend is initialized before PMREM or rendering
  try {
    if (typeof renderer.init === 'function') {
      await renderer.init();
    }
  } catch (e) {
    console.warn('[three] renderer.init failed (falling back if possible):', e);
  }
  __clockStart = performance.now();
  // (IBL environment disabled to ensure compatibility across WebGPU/WebGL backends.)

  // Style canvas as fixed overlay top-right
  Object.assign(renderer.domElement.style, {
    position: 'fixed',
    top: '0',
    right: '0',
    width: '400px',
    height: '400px',
    pointerEvents: 'none', // allow clicks to pass through
  zIndex: '-1'
  });

  // Load coin GLB and center/scale
  const coinGroup = new Group();
  scene.add(coinGroup);
  const loader = new GLTFLoader();
  loader.load('/model/cyl.glb', (gltf) => {
    const root = gltf.scene || gltf.scenes[0];
    if (!root) return;
    // Normalize pivot to center
    const box = new Box3().setFromObject(root);
    const size = new Vector3();
    const center = new Vector3();
    box.getSize(size);
    box.getCenter(center);
    root.position.sub(center);
    // Scale to fit roughly into unit radius
    const maxDim = Math.max(size.x, size.y, size.z) || 1;
    const target = 1.8; // desired overall diameter in our 400x400 frame
    const s = target / maxDim;
    root.scale.setScalar(s);
    // Face camera initially (X+90deg)
    root.rotation.x = Math.PI * 0.5;
    // Ensure materials leverage environment reflections and apply halftone TSL output
    ensureHalftoneSetup();
    root.traverse((obj) => {
      if (obj.isMesh && obj.material) {
        const convertMaterial = (m) => {
          if (!m) return m;
          // Preserve basic PBR params if present
          const baseParams = {
            color: (m.color && m.color.clone) ? m.color.clone() : undefined,
            roughness: typeof m.roughness === 'number' ? m.roughness : 0.5,
            metalness: typeof m.metalness === 'number' ? m.metalness : 0.0,
            map: m.map || null,
            normalMap: m.normalMap || null,
            roughnessMap: m.roughnessMap || null,
            metalnessMap: m.metalnessMap || null,
            envMapIntensity: typeof m.envMapIntensity === 'number' ? m.envMapIntensity : 1.2,
          };
          let nodeMat;
          try {
            nodeMat = new MeshStandardNodeMaterial(baseParams);
          } catch (e) {
            // Fallback to original material if node material unavailable
            m.envMapIntensity = baseParams.envMapIntensity;
            m.needsUpdate = true;
            return m;
          }
          nodeMat.envMapIntensity = baseParams.envMapIntensity;
          if (__halftonesFn) nodeMat.outputNode = __halftonesFn(output);
          nodeMat.needsUpdate = true;
          return nodeMat;
        };
        if (Array.isArray(obj.material)) {
          obj.material = obj.material.map(convertMaterial);
        } else {
          obj.material = convertMaterial(obj.material);
        }
      }
    });
    coinGroup.add(root);
  }, undefined, (err) => {
    console.error('[three] Failed to load coin.glb', err);
  });

  const hemi = new HemisphereLight(0xffffff, 0x3a2a14, 0.9); // subtle warm ground tint
  scene.add(hemi);

  const key = new DirectionalLight(0xffffff, 1.3);
  key.position.set(2.5, 3.2, 2.2);
  key.castShadow = false;
  scene.add(key);

  const fill = new DirectionalLight(0xf5dfa6, 0.6);
  fill.position.set(-2.2, 1.5, 1.8);
  scene.add(fill);

  const rimLight = new DirectionalLight(0xfff3c2, 0.8);
  rimLight.position.set(-1.2, 0.4, -2.5);
  scene.add(rimLight);

  // Gentle top sparkle
  const topSpec = new DirectionalLight(0xffffff, 0.5);
  topSpec.position.set(0.4, 4.0, 0.3);
  scene.add(topSpec);

  // Scroll-driven rotation with GSAP ScrollTrigger
  // Spin coin around vertical axis while giving slight tumble
  __spinTween = gsap.to(coinGroup.rotation, {
    y: Math.PI * 16,
    x: '+=' + (Math.PI * 3.25),
    ease: 'none',
    scrollTrigger: {
      trigger: document.body,
      start: 'top top',
      end: 'bottom bottom',
      scrub: true
    }
  });

  function render() {
    // Animate one of the halftone directions for subtle motion
    if (__halftoneSettings && __halftoneSettings[1]) {
      const t = (performance.now() - __clockStart) * 0.001;
      const u = __halftoneSettings[1].uniforms;
      if (u && u.direction && u.direction.value) {
        u.direction.value.x = Math.cos(t);
        u.direction.value.y = Math.sin(t);
      }
    }
    renderer.render(scene, camera);
    __rafId = requestAnimationFrame(render); // keep lightweight loop so gsap-updated values display
  }
  render();

  function handleResize() {
    // Maintain fixed 400x400; only adjust pixel ratio on resize for sharpness
    const pr = Math.min(window.devicePixelRatio || 1, 2);
    renderer.setPixelRatio(pr);
  }
  __resizeHandler = handleResize;
  window.addEventListener('resize', handleResize);

  __threeMounted = true;
  // Expose disposer for SPA lifecycle
  window.__disposeThree = disposeThreeScene;
  if (import.meta && import.meta.env && import.meta.env.DEV) {
    console.info('[three] scene initialized');
  } else {
    console.log('[three] scene initialized');
  }
}

// Optional cleanup if needed in the future
export function disposeThreeScene() {
  if (!__threeMounted && !__renderer) return;
  try { window.removeEventListener('resize', __resizeHandler); } catch(e) {}
  try { if (__spinTween) { __spinTween.scrollTrigger && __spinTween.scrollTrigger.kill(); __spinTween.kill(); } } catch(e) {}
  try { if (__rafId) cancelAnimationFrame(__rafId); } catch(e) {}
  try { if (__renderer && __renderer.domElement && __renderer.domElement.parentNode) __renderer.domElement.parentNode.removeChild(__renderer.domElement); } catch(e) {}
  __spinTween = null;
  __renderer = null;
  __rafId = 0;
  __threeMounted = false;
}

// Create halftone settings and shader graph once
function ensureHalftoneSetup() {
  if (__halftoneSettings && __halftonesFn) return;

  // Settings array (colors and layers inspired by the official example)
  __halftoneSettings = [
    // purple shade
    {
      count: 140,
      color: '#fb00ff',
      direction: new Vector3(-0.4, -1.0, 0.5),
      start: 1.0,
      end: 0.0,
      mixLow: 0.0,
      mixHigh: 0.5,
      radius: 0.8,
    },
    // orange shade
    {
      count: 120,
      color: '#ff622e',
      direction: new Vector3(0.5, -1.0, 0.2),
      start: 0.8,
      end: -0.1,
      mixLow: 0.0,
      mixHigh: 0.6,
      radius: 0.8,
    },
    // cyan highlight
    {
      count: 180,
      color: '#94ffd1',
      direction: new Vector3(0.5, 0.5, -0.2),
      start: 0.55,
      end: 0.2,
      mixLow: 0.5,
      mixHigh: 1.0,
      radius: 0.8,
    },
  ];

  // Attach TSL uniforms per settings
  for (const s of __halftoneSettings) {
    const uniforms = {};
    uniforms.count = uniform(s.count);
    uniforms.color = uniform(tslColor(s.color));
    uniforms.direction = uniform(s.direction);
    uniforms.start = uniform(s.start);
    uniforms.end = uniform(s.end);
    uniforms.mixLow = uniform(s.mixLow);
    uniforms.mixHigh = uniform(s.mixHigh);
    uniforms.radius = uniform(s.radius);
    s.uniforms = uniforms;
  }

  // Single halftone layer
  const halftone = Fn(([count, col, direction, start, end, radius, mixLow, mixHigh]) => {
    // Grid in screen space
    let gridUv = screenCoordinate.xy.div(screenSize.yy).mul(count);
    gridUv = rotate(gridUv, Math.PI * 0.25).mod(1);

    // Orientation based on world normal vs direction
    const orientationStrength = normalWorld
      .dot(direction.normalize())
      .remapClamp(end, start, 0, 1);

    // Circular mask per cell with falloff/mix
    const mask = orientationStrength.mul(radius).mul(0.5)
      .step(gridUv.sub(0.5).length())
      .mul(mix(mixLow, mixHigh, orientationStrength));

    return vec4(col, mask);
  });

  // Blend all halftone layers into the current fragment output
  __halftonesFn = Fn(([input]) => {
    const outCol = input;
    for (const s of __halftoneSettings) {
      const h = halftone(
        s.uniforms.count,
        s.uniforms.color,
        s.uniforms.direction,
        s.uniforms.start,
        s.uniforms.end,
        s.uniforms.radius,
        s.uniforms.mixLow,
        s.uniforms.mixHigh,
      );
      outCol.rgb.assign(mix(outCol.rgb, h.rgb, h.a));
    }
    return outCol;
  });
}
