// Basic Three.js scene setup encapsulated in a function so we can call it after SPA navigations.
// The scene will attach a canvas to an element with id "three-root" if present, otherwise to body.
// Selective imports to aid tree-shaking instead of namespace import.
import {
  Scene,
  PerspectiveCamera,
  WebGLRenderer,
  HemisphereLight,
  DirectionalLight,
  SRGBColorSpace,
  Group,
  Box3,
  Vector3,
  PMREMGenerator,
  ACESFilmicToneMapping
} from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

let __threeMounted = false;
let __resizeHandler = null;
let __rafId = 0;
let __renderer = null;
let __spinTween = null;

export function initThreeScene() {
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

  const renderer = new WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(400, 400, false);
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.physicallyCorrectLights = true;
  renderer.toneMappingExposure = 1.1;
  renderer.toneMapping = ACESFilmicToneMapping;
  container.appendChild(renderer.domElement);
  __renderer = renderer;
  // Lightweight environment for proper metal reflections
  const pmrem = new PMREMGenerator(renderer);
  const envTex = pmrem.fromScene(new RoomEnvironment(renderer), 0.04).texture;
  scene.environment = envTex;
  pmrem.dispose();

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
    // Ensure materials leverage environment reflections
    root.traverse((obj) => {
      if (obj.isMesh && obj.material) {
        const apply = (m) => { if (m) { m.envMapIntensity = 1.2; m.needsUpdate = true; } };
        if (Array.isArray(obj.material)) obj.material.forEach(apply); else apply(obj.material);
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
