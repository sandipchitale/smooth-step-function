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
// --- Helpers (Grid & Axes) ---
const gridSize = 120; // Increased to cover -60 to 60 in Y
const gridDivisions = 120;
const gridHelper = new THREE.GridHelper(gridSize, gridDivisions, 0x333333, 0x1a1a1a);

// Align grid corner sort of...
gridHelper.rotation.x = Math.PI / 2;
// Position so it covers X: 0..120, Y: -60..60
// Center at X=60, Y=0.
gridHelper.position.set(60, 0, -0.01); 
scene.add(gridHelper);

// Perpendicular Grid (Hypothetical "Floor" Plane)
// Spans X (Real) and Z (Depth)
// Origin at (0.5, 0, 0). Size 120 covers X=-59.5 to 60.5.
const criticalGridHelper = new THREE.GridHelper(120, 120, 0x333333, 0x1a1a1a);
// Default is XZ plane, so no rotation needed.
criticalGridHelper.position.set(0.5, 0, 0);
scene.add(criticalGridHelper);

// Replace multi-colored AxesHelper with simple Gray axes
const axesMaterial = new THREE.LineBasicMaterial({ color: 0x666666 }); // Gray color
const axesGeometry = new THREE.BufferGeometry().setFromPoints([
  new THREE.Vector3(0, 0, 0), new THREE.Vector3(60, 0, 0), // Real Axis (X)
  new THREE.Vector3(0, -60, 0), new THREE.Vector3(0, 60, 0), // Imaginary / Count Axis (Y) - Range -60 to 60
]);
const axesLines = new THREE.LineSegments(axesGeometry, axesMaterial);
scene.add(axesLines);

// Critical Strip (0 < Re(s) < 1)
const stripGeometry = new THREE.PlaneGeometry(1, 120); // Width 1, Height 120
const stripMaterial = new THREE.MeshBasicMaterial({ 
  color: 0x888888, 
  transparent: true, 
  opacity: 0.2,
  side: THREE.DoubleSide
});
const criticalStrip = new THREE.Mesh(stripGeometry, stripMaterial);
// Position: Center X = 0.5. Center Y = 0 (Center of -60 to 60).
criticalStrip.position.set(0.5, 0, 0.01);
scene.add(criticalStrip);

// Critical Line (Re(s) = 0.5)
const criticalLineMaterial = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.5 });
const criticalLineGeometry = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(0.5, -60, 0),
    new THREE.Vector3(0.5, 60, 0)
]);
const criticalLine = new THREE.Line(criticalLineGeometry, criticalLineMaterial);
scene.add(criticalLine);

// --- Zeta Zeros ---
const positiveZetaZeros = [
  14.134725, 21.022040, 25.010858, 30.424876, 32.935062,
  37.586178, 40.918719, 43.327073, 48.005151, 49.773832
];
// Include negative zeros
const zetaZeros = [...positiveZetaZeros, ...positiveZetaZeros.map(z => -z)];

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
  
  // Format label: i14.13 for positive, -i14.13 for negative
  const sign = z < 0 ? '-' : '';
  div.textContent = `${sign}i${Math.abs(z).toFixed(2)}`;
  
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

// Simple Complex Number implementation
class Complex {
  re: number;
  im: number;
  
  constructor(re: number, im: number) {
    this.re = re;
    this.im = im;
  }

  add(c: Complex): Complex {
    return new Complex(this.re + c.re, this.im + c.im);
  }

  sub(c: Complex): Complex {
    return new Complex(this.re - c.re, this.im - c.im);
  }

  mul(c: Complex): Complex {
    return new Complex(this.re * c.re - this.im * c.im, this.re * c.im + this.im * c.re);
  }

  div(c: Complex): Complex {
    const denom = c.re * c.re + c.im * c.im;
    return new Complex(
      (this.re * c.re + this.im * c.im) / denom,
      (this.im * c.re - this.re * c.im) / denom
    );
  }
}

// Calculate n^(-s) where s = 0.5 + iy
function nPowMinusS(n: number, y: number): Complex {
  // n^(-s) = n^(-0.5) * n^(-iy)
  // = (1/sqrt(n)) * (cos(y ln n) - i sin(y ln n))  <-- standard calc is exp(-iy ln n) = cos(-y ln n) + i sin(-y ln n)
  // = (1/sqrt(n)) * (cos(y * Math.log(n)) - i * sin(y * Math.log(n)))   <-- wait, exp(-ix) = cos(x) - i sin(x). Yes.
  
  const r = 1.0 / Math.sqrt(n);
  const theta = -y * Math.log(n);
  return new Complex(r * Math.cos(theta), r * Math.sin(theta));
}

// Dirichlet Eta Function (Alternating Zeta)
// eta(s) = sum (-1)^(n-1) / n^s
// Valid for Re(s) > 0
function eta(y: number, terms: number = 100): Complex {
  let sum = new Complex(0, 0);
  for (let n = 1; n <= terms; n++) {
    const term = nPowMinusS(n, y);
    if ((n - 1) % 2 === 1) { // Subtract if (n-1) is odd => n is even (2, 4...)
       sum = sum.sub(term);
    } else {
       sum = sum.add(term);
    }
  }
  return sum;
}

// Zeta(s) = eta(s) / (1 - 2^(1-s))
function zeta(y: number): Complex {
  // s_re = 0.5 implicitly
  // 1 - s = 0.5 - iy
  // 2^(1-s) = 2^0.5 * 2^(-iy) = sqrt(2) * (cos(y ln 2) - i sin(y ln 2))  (similar logic to n^-s but base 2)
  const ln2 = Math.log(2);
  const factorRe = Math.sqrt(2) * Math.cos(-y * ln2);
  const factorIm = Math.sqrt(2) * Math.sin(-y * ln2);
  
  const denom = new Complex(1 - factorRe, -factorIm);
  const num = eta(y, 200); // 200 terms for better precision
  
  return num.div(denom);
}

// --- Zeta Function Curve ---
const zetaMaterial = new THREE.LineBasicMaterial({ color: 0xff00ff, linewidth: 2 }); // Magenta
const zetaGeometry = new THREE.BufferGeometry();
const zetaPoints: number[] = [];

// Range -50 to 50
for (let y = -50; y <= 50; y += 0.01) {
    const z = zeta(y);
    // Plot at (0.5 + Re(zeta), y, Im(zeta))
    // This wraps the "value" around the critical line in 3D space
    zetaPoints.push(0.5 + z.re, y, z.im);
}
zetaGeometry.setAttribute('position', new THREE.Float32BufferAttribute(zetaPoints, 3));
const zetaLine = new THREE.Line(zetaGeometry, zetaMaterial);
scene.add(zetaLine);

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
