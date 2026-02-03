import * as THREE from 'three';
import './style.css';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import GUI from 'lil-gui';

// --- Configuration ---
const MAX_PRIME_VALUE = 47;
const MAX_X = 55;
const STEPS = 10000; // Resolution

// --- Primes Calculation ---
function getPrimesUpTo(limit: number): number[] {
  const primes: number[] = [];
  for (let num = 2; num <= limit; num++) {
    let isPrime = true;
    for (const p of primes) {
        if (num % p === 0) {
            isPrime = false;
            break;
        }
    }
    if (isPrime) primes.push(num);
  }
  return primes;
}

const primes = getPrimesUpTo(MAX_PRIME_VALUE);

// --- Scene Setup ---
const app = document.getElementById('app')!;
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x050510); // Deep dark blue/black
scene.fog = new THREE.FogExp2(0x050510, 0.002);

const camera = new THREE.PerspectiveCamera(
  45,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
// Position camera to look at the plot
camera.position.set(30, 30, 60);
camera.lookAt(30, 15, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
app.appendChild(renderer.domElement);

const labelRenderer = new CSS2DRenderer();
labelRenderer.setSize(window.innerWidth, window.innerHeight);
labelRenderer.domElement.style.position = 'absolute';
labelRenderer.domElement.style.top = '0px';
labelRenderer.domElement.style.pointerEvents = 'none'; // Allow interactions to pass through
document.body.appendChild(labelRenderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.target.set(30, 15, 0);

// --- Lights ---
const ambientLight = new THREE.AmbientLight(0x404040, 2); // Soft white light
scene.add(ambientLight);

const pointLight = new THREE.PointLight(0xffffff, 2, 200);
pointLight.position.set(50, 50, 50);
scene.add(pointLight);

// --- Helpers (Grid & Axes) ---
const gridSize = 60;
const gridDivisions = 60; // Unit size (1) squares
const gridHelper = new THREE.GridHelper(gridSize, gridDivisions, 0x333333, 0x1a1a1a);

// Align grid corner with origin.
gridHelper.rotation.x = Math.PI / 2;
gridHelper.position.set(gridSize / 2, gridSize / 2, -0.01); 
scene.add(gridHelper);

// Replace multi-colored AxesHelper with simple Gray axes
const axesMaterial = new THREE.LineBasicMaterial({ color: 0x666666 }); // Gray color
const axesGeometry = new THREE.BufferGeometry().setFromPoints([
  new THREE.Vector3(0, 0, 0), new THREE.Vector3(60, 0, 0), // Real Axis (X)
  new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 60, 0), // Imaginary / Count Axis (Y)
]);
const axesLines = new THREE.LineSegments(axesGeometry, axesMaterial);
scene.add(axesLines);

// Critical Strip (0 < Re(s) < 1)
const stripGeometry = new THREE.PlaneGeometry(1, 60); // Width 1, Height 60
const stripMaterial = new THREE.MeshBasicMaterial({ 
  color: 0x888888, 
  transparent: true, 
  opacity: 0.2,
  side: THREE.DoubleSide
});
const criticalStrip = new THREE.Mesh(stripGeometry, stripMaterial);
// Position: Center X = 0.5. Center Y = 30 (Half of 60).
criticalStrip.position.set(0.5, 30, 0.01);
scene.add(criticalStrip);

// Critical Line (Re(s) = 0.5)
const criticalLineMaterial = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.5 });
const criticalLineGeometry = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(0.5, 0, 0),
    new THREE.Vector3(0.5, 60, 0)
]);
const criticalLine = new THREE.Line(criticalLineGeometry, criticalLineMaterial);
scene.add(criticalLine);

// --- Zeta Zeros ---
const zetaZeros = [
  14.134725, 21.022040, 25.010858, 30.424876, 32.935062,
  37.586178, 40.918719, 43.327073, 48.005151, 49.773832
];

const zeroesGeometry = new THREE.BufferGeometry();
const zeroesPositions = new Float32Array(zetaZeros.length * 3);

zetaZeros.forEach((z, i) => {
  zeroesPositions[i * 3] = 0.5;
  zeroesPositions[i * 3 + 1] = z;
  zeroesPositions[i * 3 + 2] = 0.02; // Slightly in front of critical line

  // Label for Zeta Zero
  const div = document.createElement('div');
  div.className = 'prime-label'; // Reusing prime-label for consistent style, or could make new one
  // div.style.color = '#aaf'; // Removed override to use CSS default (white)
  div.textContent = `i${z.toFixed(2)}`;
  const label = new CSS2DObject(div);
  label.position.set(-2, z, 0); // Position to the left of the imaginary axis (0)
  scene.add(label);
});

zeroesGeometry.setAttribute('position', new THREE.BufferAttribute(zeroesPositions, 3));
const zeroesMaterial = new THREE.PointsMaterial({
    color: 0xffffff,
    size: 4,
    sizeAttenuation: false
});
const zeroesPoints = new THREE.Points(zeroesGeometry, zeroesMaterial);
scene.add(zeroesPoints);

// Axis Labels
function createLabel(text: string, x: number, y: number, z: number, className: string = 'axis-label') {
  const div = document.createElement('div');
  div.className = className;
  div.textContent = text;
  const label = new CSS2DObject(div);
  label.position.set(x, y, z);
  return label;
}

// X: Real, Y: Imaginary & Count, Z: Depth (Unused for function)
scene.add(createLabel('Real (Re)', 60, 0, 0));
scene.add(createLabel('Imaginary (Im) / Count π(x)', 0, 60, 0)); // Vertical Y

// scene.add(createLabel('Count π(x)', 0, 0, 50));      // Removed Z label

// --- Primes Visualization ---
const primesGeometry = new THREE.BufferGeometry();
const primesPositions = new Float32Array(primes.length * 3);

primes.forEach((p, i) => {
  primesPositions[i * 3] = p;
  primesPositions[i * 3 + 1] = 0;
  primesPositions[i * 3 + 2] = 0;

  // Label for prime
  const div = document.createElement('div');
  div.className = 'prime-label';
  div.textContent = p.toString();
  const label = new CSS2DObject(div);
  label.position.set(p, -2, 0); // Position below the point
  scene.add(label);
});

primesGeometry.setAttribute('position', new THREE.BufferAttribute(primesPositions, 3));

const primesMaterial = new THREE.PointsMaterial({
    color: 0xffffff,
    size: 5,
    sizeAttenuation: false // Constant screen size, looks like data points
});

const primesPoints = new THREE.Points(primesGeometry, primesMaterial);
scene.add(primesPoints);

// --- Step Function Visualization ---
const params = {
  e: 0.0,
};

const graphMaterial = new THREE.LineBasicMaterial({ color: 0x00ffff, linewidth: 2 }); // Cyan
const graphGeometry = new THREE.BufferGeometry();
// We'll calculate positions dynamically
const positions = new Float32Array(STEPS * 3);
graphGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

const graphLine = new THREE.Line(graphGeometry, graphMaterial);
scene.add(graphLine);

// --- Math Functions ---

// Smoothstep implementation: 3x^2 - 2x^3 for x in [0, 1]
function smoothStep(edge0: number, edge1: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

function smoothPrimeCount(x: number, e: number): number {
  let count = 0;
  for (const p of primes) {
    if (e === 0) {
      if (x >= p) count += 1;
    } else {
      // Transition range: [p-e, p+e]
      // smoothstep(edge0, edge1, x)
      // edge0 = p - e
      // edge1 = p + e
      
      // Optimization: if x is way past p+e, add 1. If way before p-e, add 0.
      if (x > p + e) {
        count += 1;
      } else if (x < p - e) {
        // count += 0
      } else {
        count += smoothStep(p - e, p + e, x);
      }
    }
  }
  return count;
}

function updateGraph() {
  const positions = graphLine.geometry.attributes.position.array as Float32Array;
  
  for (let i = 0; i < STEPS; i++) {
    const x = (i / (STEPS - 1)) * MAX_X;
    
    // Existing (Cheated) Smooth Count
    const count = smoothPrimeCount(x, params.e);
    
    positions[i * 3] = x;
    positions[i * 3 + 1] = count;
    positions[i * 3 + 2] = 0;
  }
  
  graphLine.geometry.attributes.position.needsUpdate = true;
}

// Initial Update
updateGraph();

// --- GUI ---
const gui = new GUI();
gui.add(params, 'e', 0, 0.99).name('Smoothness (e)').onChange(updateGraph);

// --- Animation Loop ---
function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
  labelRenderer.render(scene, camera);
}

animate();

// --- Window Resize ---
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  labelRenderer.setSize(window.innerWidth, window.innerHeight);
});
