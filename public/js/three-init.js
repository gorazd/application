// Basic Three.js scene setup encapsulated in a function so we can call it after SPA navigations.
// The scene will attach a canvas to an element with id "three-root" if present, otherwise to body.
import * as THREE from 'three';

let __threeMounted = false;
let __resizeHandler = null;

export function initThreeScene() {
  const container = document.getElementById('three-root') || document.body;
  if (!container || __threeMounted) return; // Prevent duplicate init

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x111111);

  const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100);
  camera.position.set(2, 1.2, 2.2);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(window.devicePixelRatio || 1);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  container.appendChild(renderer.domElement);

  // Simple demo content: a spinning torus knot with basic lighting.
  const geometry = new THREE.TorusKnotGeometry(0.6, 0.2, 128, 32);
  const material = new THREE.MeshStandardMaterial({ color: 0x4dabf7, metalness: 0.35, roughness: 0.25 });
  const mesh = new THREE.Mesh(geometry, material);
  scene.add(mesh);

  const hemi = new THREE.HemisphereLight(0xffffff, 0x202020, 1.1);
  scene.add(hemi);
  const dir = new THREE.DirectionalLight(0xffffff, 0.8);
  dir.position.set(3, 3, 2);
  scene.add(dir);

  const clock = new THREE.Clock();

  function animate() {
    requestAnimationFrame(animate);
    const t = clock.getElapsedTime();
    mesh.rotation.x = t * 0.35;
    mesh.rotation.y = t * 0.22;
    renderer.render(scene, camera);
  }
  animate();

  function handleResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
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
