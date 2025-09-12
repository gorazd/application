// Basic Three.js scene setup encapsulated in a function so we can call it after SPA navigations.
// The scene will attach a canvas to an element with id "three-root" if present, otherwise to body.
// Selective imports to aid tree-shaking instead of namespace import.
import {
  Scene,
  PerspectiveCamera,
  WebGLRenderer,
  CylinderGeometry,
  MeshStandardMaterial,
  MeshPhysicalMaterial,
  Mesh,
  HemisphereLight,
  DirectionalLight,
  SRGBColorSpace,
  Group
} from 'three';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

let __threeMounted = false;
let __resizeHandler = null;

export function initThreeScene() {
  const container = document.getElementById('three-root') || document.body;
  if (!container || __threeMounted) return; // Prevent duplicate init

  const scene = new Scene();
  // Transparent background so underlying page shows through
  scene.background = null;

  const camera = new PerspectiveCamera(75, 1, 0.1, 70); // square aspect for 400x400
  camera.position.set(0, 0, 3);
  camera.lookAt(0, 0, 0);

  const renderer = new WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(400, 400, false);
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.physicallyCorrectLights = true;
  renderer.toneMappingExposure = 1.1;
  container.appendChild(renderer.domElement);

  // Style canvas as fixed overlay top-right
  Object.assign(renderer.domElement.style, {
    position: 'fixed',
    top: '0',
    right: '0',
    width: '400px',
    height: '400px',
    pointerEvents: 'none', // allow clicks to pass through
    zIndex: '9999'
  });

  // Golden coin: thin cylinder with high metalness and low roughness
  const coinGroup = new Group();
  const radiusTop = 0.9;
  const radiusBottom = 0.9;
  const height = 0.22;
  const radialSegments = 96;
  const heightSegments = 1;
  const openEnded = false;
  const coinGeo = new CylinderGeometry(radiusTop, radiusBottom, height, radialSegments, heightSegments, openEnded);
  // Add reeded (grooved) edge by alternating slight radial offsets on side vertices
  (function addEdgeGrooves(g, segments) {
    const pos = g.getAttribute('position');
    const normal = g.getAttribute('normal');
    const sideVertexCount = (segments + 1) * 2; // side section only (top & bottom rings)
    const ampOut = 0.012; // outward ridge
    const ampIn = -0.008; // inward groove
    for (let i = 0; i < sideVertexCount; i++) {
      // normals of side vertices have ~0 y component
      const ny = normal.getY(i);
      if (Math.abs(ny) < 0.25) { // ensure it's a side vertex
        const radialIndex = i % (segments + 1);
        const sx = pos.getX(i);
        const sz = pos.getZ(i);
        const r = Math.sqrt(sx * sx + sz * sz) || 1;
        const dirX = sx / r;
        const dirZ = sz / r;
        const delta = (radialIndex % 2 === 0) ? ampOut : ampIn;
        pos.setX(i, sx + dirX * delta);
        pos.setZ(i, sz + dirZ * delta);
      }
    }
    pos.needsUpdate = true;
    g.computeVertexNormals();
    g.computeBoundingSphere();
  })(coinGeo, radialSegments);
  // Slight normal tweak: scale in Y to emphasize thinness visually
  const goldMaterial = new MeshPhysicalMaterial({
    color: 0xE6C200, // slightly warmer than pure FF
    metalness: 1.0,
    roughness: 0.15,
    clearcoat: 0.55,
    clearcoatRoughness: 0.2,
    sheen: 0.0,
    reflectivity: 1.0
  });
  const coinMesh = new Mesh(coinGeo, goldMaterial);
  coinMesh.rotation.x = Math.PI * 0.5; // face camera initially
  coinGroup.add(coinMesh);

  // Add a subtle rim detail by duplicating slightly scaled geometry with darker tone
  const rimMaterial = new MeshStandardMaterial({ color: 0xB8860B, metalness: 0.9, roughness: 0.35 });
  const rim = new Mesh(coinGeo.clone(), rimMaterial);
  rim.scale.set(1.01, 1.0, 1.01); // slight outward to avoid z-fighting
  rim.rotation.x = Math.PI * 0.5; // match coin face orientation
  coinGroup.add(rim);

  scene.add(coinGroup);

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
  gsap.to(coinGroup.rotation, {
    y: Math.PI * 6,
    x: '+=' + (Math.PI * 0.25),
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
    requestAnimationFrame(render); // keep lightweight loop so gsap-updated values display
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
  if (import.meta && import.meta.env && import.meta.env.DEV) {
    console.info('[three] scene initialized');
  } else {
    console.log('[three] scene initialized');
  }
}

// Optional cleanup if needed in the future
export function disposeThreeScene() {
  if (!__threeMounted) return;
  window.removeEventListener('resize', __resizeHandler);
  __threeMounted = false;
}
