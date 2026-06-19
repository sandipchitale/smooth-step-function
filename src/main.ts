import * as THREE from 'three';
import './style.css';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import GUI from 'lil-gui';
// Removed LineSegments2 imports

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
const gridDivisions = 240; // 0.5 unit resolution
// Low contrast colors: Center 0x444455, Grid 0x1a1a2e (BG is 0x050510)
const gridHelper = new THREE.GridHelper(gridSize, gridDivisions, 0x444455, 0x1a1a2e);

// Align grid corner sort of...
gridHelper.rotation.x = Math.PI / 2;
// Position so it covers X: 0..120, Y: -60..60
// Center at X=0, Y=0 to cover -60 to 60 in both X and Y
gridHelper.position.set(0, 0, -0.01); 
scene.add(gridHelper);

// Perpendicular Grid (Hypothetical "Floor" Plane)
// Spans X (Real) and Z (Depth)
// Origin at (0.5, 0, 0). Size 120 covers X=-59.5 to 60.5.
const criticalGridHelper = new THREE.GridHelper(120, 240, 0x444455, 0x1a1a2e);
// Default is XZ plane, so no rotation needed.
criticalGridHelper.position.set(0.5, 0, 0);
scene.add(criticalGridHelper);

// YZ Grid (Passing through Imaginary Axis, X=0)
// Uniform color (no emphasized center axis) — both center and grid lines match.
const imaginaryGridHelper = new THREE.GridHelper(120, 240, 0x1a1a2e, 0x1a1a2e);
imaginaryGridHelper.rotation.z = Math.PI / 2; // Rotate 90 deg around Z to align with YZ plane
imaginaryGridHelper.position.set(0.5, 0, 0); // matches params.originShift; slides with the shift
imaginaryGridHelper.visible = false; // hidden by default (matches params.showYZGrid)
scene.add(imaginaryGridHelper);

// Vertical axis of the YZ plane (the t-axis at the output-frame origin).
// Emphasized like the other axes; slides with originShift and shows with the YZ grid.
const yzAxisMaterial = new THREE.LineBasicMaterial({ color: 0x666666 }); // same gray as the other axes
const yzAxisGeometry = new THREE.BufferGeometry().setFromPoints([
  new THREE.Vector3(0, -60, 0),
  new THREE.Vector3(0, 60, 0),
]);
const yzAxisLine = new THREE.Line(yzAxisGeometry, yzAxisMaterial);
yzAxisLine.position.x = 0.5; // matches params.originShift; slides with the shift
yzAxisLine.visible = true;   // shown by default, independent of the YZ grid lines
scene.add(yzAxisLine);

// Replace multi-colored AxesHelper with simple Gray axes
const axesMaterial = new THREE.LineBasicMaterial({ color: 0x666666 }); // Gray color
const axesGeometry = new THREE.BufferGeometry().setFromPoints([
  new THREE.Vector3(-60, 0, 0), new THREE.Vector3(60, 0, 0), // Real Axis (X)
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

// Add Labels for Critical Strip and Critical Line
// Add Labels for Critical Strip and Critical Line
// Critical Strip Label at the bottom
const stripLabelDiv = document.createElement('div');
stripLabelDiv.className = 'axis-label';
stripLabelDiv.style.color = 'white'; // Explicitly white
stripLabelDiv.textContent = 'Critical Strip (0 < Re(s) < 1)';
const stripLabel = new CSS2DObject(stripLabelDiv);
stripLabel.position.set(-5, 4, 0); // Top Left
scene.add(stripLabel);

// Critical Line Label at the top
const lineLabelDiv = document.createElement('div');
lineLabelDiv.className = 'axis-label';
lineLabelDiv.style.color = 'white'; // Explicitly white
lineLabelDiv.textContent = 'Critical Line (1/2 + it)';
const lineLabel = new CSS2DObject(lineLabelDiv);
lineLabel.position.set(-5, 8, 0); // Top Left, above strip label
scene.add(lineLabel);

// Connector Lines
// Connector Lines (Cylinders/Tubes)
function createConnector(start: THREE.Vector3, end: THREE.Vector3, radius: number = 0.02, color: number = 0x888888) {
    const path = new THREE.LineCurve3(start, end);
    const geometry = new THREE.TubeGeometry(path, 1, radius, 8, false);
    const material = new THREE.MeshBasicMaterial({ color: color, transparent: true, opacity: 0.5 });
    return new THREE.Mesh(geometry, material);
}

const connector1 = createConnector(new THREE.Vector3(-4, 4, 0), new THREE.Vector3(0, 4, 0), 0.02);
scene.add(connector1);

const connector2 = createConnector(new THREE.Vector3(-4, 8, 0), new THREE.Vector3(0.5, 8, 0), 0.02);
scene.add(connector2);

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

// --- Trivial Zeta Zeros (-2, -4, ... -48) ---
const trivialZeros: number[] = [];
for (let n = 2; n <= 48; n += 2) {
    trivialZeros.push(-n);
}

const trivialGeometry = new THREE.BufferGeometry();
const trivialPositions = new Float32Array(trivialZeros.length * 3);

trivialZeros.forEach((z, i) => {
    trivialPositions[i * 3] = z;
    trivialPositions[i * 3 + 1] = 0;
    trivialPositions[i * 3 + 2] = 0;

    // Label
    const div = document.createElement('div');
    div.className = 'prime-label';
    div.textContent = z.toString();
    const label = new CSS2DObject(div);
    label.position.set(z, -2, 0);
    scene.add(label);
});

trivialGeometry.setAttribute('position', new THREE.BufferAttribute(trivialPositions, 3));
const trivialMaterial = new THREE.PointsMaterial({
    color: 0xaaaaaa, // Light gray for trivial zeros
    size: 4,
    sizeAttenuation: false
});
const trivialPoints = new THREE.Points(trivialGeometry, trivialMaterial);
scene.add(trivialPoints);

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

// Key real-axis markers: -1 (zeta = -1/12), 0 (number-line origin),
// 1/2 (critical line / zeta-value origin), 1 (zeta pole)
const realAxisMarks: { value: number; text: string; labelY: number }[] = [
  { value: -1,  text: '-1',  labelY: -2 },
  { value: 0,   text: '0',   labelY: -2 },
  { value: 0.5, text: '1/2', labelY: -4 }, // lower, to avoid colliding with 0 and 1
  { value: 1,   text: '1',   labelY: -2 },
];
const realAxisMarkPositions = new Float32Array(realAxisMarks.length * 3);
realAxisMarks.forEach(({ value, text, labelY }, i) => {
  realAxisMarkPositions[i * 3] = value;
  realAxisMarkPositions[i * 3 + 1] = 0;
  realAxisMarkPositions[i * 3 + 2] = 0;

  const div = document.createElement('div');
  div.className = 'prime-label';
  div.textContent = text;
  const label = new CSS2DObject(div);
  label.position.set(value, labelY, 0);
  scene.add(label);
});

const realAxisMarkGeometry = new THREE.BufferGeometry();
realAxisMarkGeometry.setAttribute('position', new THREE.BufferAttribute(realAxisMarkPositions, 3));
const realAxisMarkMaterial = new THREE.PointsMaterial({
  color: 0xffffff,
  size: 5,
  sizeAttenuation: false, // Constant screen size, matches prime points
});
const realAxisMarkPoints = new THREE.Points(realAxisMarkGeometry, realAxisMarkMaterial);
scene.add(realAxisMarkPoints);

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
  showXYGrid: true,
  showXZGrid: true,
  showYZGrid: false,
  showYZAxis: true, // YZ vertical axis, independent of the grid lines
  showCriticalStrip: true,
  xzGridY: 0,
  showValueLine: true, // the faint connector from the ζ-value label to the red marker
  showArgTrail: false, // projected phasor-tip trail in the XZ floor (depth disambiguation)
  trailWindow: 6,      // ± window in t over which the trail is drawn
  originShift: 0.5, // Re-origin of the output frame: 0 = Im axis, ½ = critical line
  // Explicit-formula reconstruction of the prime staircase from the zeros.
  // Hidden by default; this is an extra "if you're curious" layer.
  piZeros: 10,            // zeros used in the yellow π(x) reconstruction (pairs with cyan)
  showPiApprox: false,    // off by default; independent top-level toggle
  // The ψ-based "explicit formula" group below is the extra curiosity layer.
  showExplicitFormula: false,
  psiZeros: 10,           // zeros used in the green ψ(x) reconstruction
  showPsiTrue: true,
  showPsiApprox: true
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

  scale(k: number): Complex {
    return new Complex(this.re * k, this.im * k);
  }

  abs(): number {
    return Math.hypot(this.re, this.im);
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

// Dirichlet Eta Function (Alternating Zeta), s = 0.5 + iy
// eta(s) = sum (-1)^(n-1) / n^s
//
// Computed via Borwein's algorithm rather than the naive alternating sum.
// The naive series converges far too slowly on the critical line (Re(s)=0.5):
// even 200 terms left zeta(0.5) reading ~-1.38 instead of -1.46. Borwein gives
// ~n digits of accuracy from n terms, so n=60 nails the whole y in [-50,50] range
// (including ~1e-10 magnitude at the nontrivial zeros).
//
//   d_k = n * sum_{i=0}^{k} (n+i-1)! 4^i / ((n-i)! (2i)!)
//   eta(s) = -1/d_n * sum_{k=0}^{n-1} (-1)^k (d_k - d_n) / (k+1)^s
function eta(y: number, n: number = 60): Complex {
  // Build d_k cumulatively. t_0 = 1/n, and
  // t_i = t_{i-1} * (n+i-1) * 4 * (n-i+1) / ((2i)(2i-1)).
  const d = new Array<number>(n + 1);
  let cum = 0;
  let t = 1 / n;
  for (let i = 0; i <= n; i++) {
    cum += t;
    d[i] = n * cum;
    const i1 = i + 1;
    t = t * (n + i1 - 1) * 4 * (n - i1 + 1) / ((2 * i1) * (2 * i1 - 1));
  }

  const dn = d[n];
  let sum = new Complex(0, 0);
  for (let k = 0; k < n; k++) {
    const sign = (k % 2 === 0) ? 1 : -1;
    // nPowMinusS(k+1, y) = (k+1)^(-s) = 1 / (k+1)^s
    sum = sum.add(nPowMinusS(k + 1, y).scale(sign * (d[k] - dn)));
  }
  return sum.scale(-1 / dn);
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
  const num = eta(y); // Borwein algorithm, n=60 terms is accurate over y in [-50,50]
  
  return num.div(denom);
}

// --- Zeta Function Curve ---
const zetaMaterial = new THREE.LineBasicMaterial({ color: 0xff00ff, linewidth: 2 }); // Magenta
const zetaGeometry = new THREE.BufferGeometry();
const zetaPoints: number[] = [];
const zetaRe: number[] = []; // cached Re(ζ) per sample; x = originShift + Re(ζ)
const zetaIm: number[] = []; // cached Im(ζ) per sample (used by the projected phasor trail)
const zetaYs: number[] = []; // cached t = Im(s) per sample
const ZETA_DT = 0.01;        // sampling step in t; trail reuses these samples

// Range -50 to 50
for (let y = -50; y <= 50; y += ZETA_DT) {
    const z = zeta(y);
    // Plot at (originShift + Re(zeta), y, Im(zeta))
    // This wraps the "value" around the critical line in 3D space
    zetaRe.push(z.re);
    zetaIm.push(z.im);
    zetaYs.push(y);
    zetaPoints.push(params.originShift + z.re, y, z.im);
}
zetaGeometry.setAttribute('position', new THREE.Float32BufferAttribute(zetaPoints, 3));
const zetaLine = new THREE.Line(zetaGeometry, zetaMaterial);
scene.add(zetaLine);

// Re-position the ribbon when the origin shift changes (cheap: x only, no zeta recompute).
function updateZetaShift() {
    const pos = zetaGeometry.attributes.position.array as Float32Array;
    for (let i = 0; i < zetaRe.length; i++) {
        pos[i * 3] = params.originShift + zetaRe[i];
    }
    zetaGeometry.attributes.position.needsUpdate = true;
    updateArgTrail(); // trail x-positions depend on the shift too
}

// --- Projected phasor-tip "argument trail" ---
// The ribbon's value (Re ζ, Im ζ) over a window of t around the current XZ floor,
// flattened into that floor plane (constant y = xzGridY). Reading the winding in a
// flat reference plane disambiguates the depth (Z = Im ζ) excursion of the 3D ribbon.
// vertexColors lets the trail fade out toward both ends (away from the red dot at t = Y0):
// each vertex's colour is the base magenta dimmed toward black by its distance in t.
const argTrailMaterial = new THREE.LineBasicMaterial({ vertexColors: true, transparent: true });
const argTrailGeometry = new THREE.BufferGeometry();
const argTrailLine = new THREE.Line(argTrailGeometry, argTrailMaterial);
scene.add(argTrailLine);

function updateArgTrail() {
    if (!params.showArgTrail) { argTrailLine.visible = false; return; }
    argTrailLine.visible = true;
    const Y0 = params.xzGridY;
    const W = params.trailWindow;
    const pts: number[] = [];
    const cols: number[] = [];
    // Base trail colour: magenta 0xff66ff.
    const baseR = 1.0, baseG = 0.4, baseB = 1.0;
    // zetaYs is uniformly sampled at ZETA_DT, so map the window to index range directly.
    let lo = Math.ceil((Y0 - W - zetaYs[0]) / ZETA_DT);
    let hi = Math.floor((Y0 + W - zetaYs[0]) / ZETA_DT);
    lo = Math.max(0, lo);
    hi = Math.min(zetaYs.length - 1, hi);
    for (let i = lo; i <= hi; i++) {
        // Flatten onto the floor: keep (X = origin+Re ζ, Z = Im ζ), force y = Y0.
        pts.push(params.originShift + zetaRe[i], Y0, zetaIm[i]);
        // Fade with distance from the red dot (t = Y0): bright at centre, dark at the ends.
        const f = Math.pow(Math.max(0, 1 - Math.abs(zetaYs[i] - Y0) / W), 1.5);
        cols.push(baseR * f, baseG * f, baseB * f);
    }
    argTrailGeometry.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    argTrailGeometry.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
    argTrailGeometry.computeBoundingSphere();
}



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

// ============================================================================
// --- Explicit Formula: building the staircase FROM the zeros on the line ---
// ============================================================================
// Riemann/von Mangoldt explicit formula for the Chebyshev function psi(x):
//
//   psi(x) = x  -  sum over zeros rho of  x^rho / rho  -  log(2*pi)  -  1/2 log(1 - x^-2)
//
// psi(x) = sum_{p^k <= x} log p  is the prime "staircase" weighted by log p,
// jumping at every prime power. Pairing each zero rho = 1/2 + i*gamma with its
// conjugate 1/2 - i*gamma collapses x^rho/rho into a real oscillation:
//
//   2 Re(x^rho / rho) = sqrt(x) * (cos(gamma ln x) + 2*gamma sin(gamma ln x)) / (1/4 + gamma^2)
//
// So each zero on the critical line contributes one decaying wave; summing more
// zeros makes the smooth curve ring into the exact staircase. The same gamma
// values plotted vertically on the line (Im(s)) are what generate this curve.

// Imaginary parts (gamma) of the first 50 nontrivial zeros (standard tabulated).
const nontrivialZerosImag = [
  14.134725142, 21.022039639, 25.010857580, 30.424876126, 32.935061588,
  37.586178159, 40.918719012, 43.327073281, 48.005150881, 49.773832478,
  52.970321478, 56.446247697, 59.347044003, 60.831778525, 65.112544048,
  67.079810529, 69.546401711, 72.067157674, 75.704690699, 77.144840069,
  79.337375020, 82.910380854, 84.735492981, 87.425274613, 88.809111208,
  92.491899271, 94.651344041, 95.870634228, 98.831194218, 101.317851006,
  103.725538040, 105.446623052, 107.168611184, 111.029535543, 111.874659177,
  114.320220915, 116.226680321, 118.790782866, 121.370125002, 122.946829294,
  124.256818554, 127.516683880, 129.578704200, 131.087688531, 133.497737203,
  134.756509753, 138.116042055, 139.736208952, 141.123707404, 143.111845808,
];

// True Chebyshev psi(x): cumulative log p over all prime powers p^k <= x.
const primePowers: { value: number; logP: number }[] = [];
for (const p of getPrimesUpTo(MAX_X)) {
  const logP = Math.log(p);
  for (let pk = p; pk <= MAX_X; pk *= p) {
    primePowers.push({ value: pk, logP });
  }
}
primePowers.sort((a, b) => a.value - b.value);

function psiTrue(x: number): number {
  let sum = 0;
  for (const { value, logP } of primePowers) {
    if (value <= x) sum += logP;
    else break;
  }
  return sum;
}

// Explicit-formula approximation of psi(x) using the first N zeros.
function psiApprox(x: number, N: number): number {
  if (x <= 1.05) return 0; // formula has a singularity at x = 1; psi(x)=0 below 2 anyway
  const lnx = Math.log(x);
  const sqrtx = Math.sqrt(x);
  let osc = 0;
  for (let n = 0; n < N; n++) {
    const g = nontrivialZerosImag[n];
    const theta = g * lnx;
    osc += (Math.cos(theta) + 2 * g * Math.sin(theta)) / (0.25 + g * g);
  }
  return x - sqrtx * osc - Math.log(2 * Math.PI) - 0.5 * Math.log(1 - 1 / (x * x));
}

// True psi staircase (orange), computed once.
const psiTrueMaterial = new THREE.LineBasicMaterial({ color: 0xffaa00, linewidth: 2 });
const psiTrueGeometry = new THREE.BufferGeometry();
const psiTruePositions = new Float32Array(STEPS * 3);
for (let i = 0; i < STEPS; i++) {
  const x = (i / (STEPS - 1)) * MAX_X;
  psiTruePositions[i * 3] = x;
  psiTruePositions[i * 3 + 1] = psiTrue(x);
  psiTruePositions[i * 3 + 2] = 0;
}
psiTrueGeometry.setAttribute('position', new THREE.BufferAttribute(psiTruePositions, 3));
const psiTrueLine = new THREE.Line(psiTrueGeometry, psiTrueMaterial);
scene.add(psiTrueLine);

// Explicit-formula reconstruction (green), updated as the zero count changes.
const psiApproxMaterial = new THREE.LineBasicMaterial({ color: 0x00ff88, linewidth: 2 });
const psiApproxGeometry = new THREE.BufferGeometry();
psiApproxGeometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(STEPS * 3), 3));
const psiApproxLine = new THREE.Line(psiApproxGeometry, psiApproxMaterial);
scene.add(psiApproxLine);

// Convergence readout: rides the end of the curve, narrating what the slider does.
const psiApproxLabel = createLabel('', MAX_X, 0, 0);
psiApproxLabel.element.style.color = '#00ff88';
scene.add(psiApproxLabel);

function updatePsiApprox() {
  const N = Math.min(params.psiZeros, nontrivialZerosImag.length);
  const pos = psiApproxLine.geometry.attributes.position.array as Float32Array;
  let peak = 0; // peak |reconstruction − true| → the Gibbs-like ringing amplitude
  let endY = 0;
  for (let i = 0; i < STEPS; i++) {
    const x = (i / (STEPS - 1)) * MAX_X;
    const yApprox = psiApprox(x, N);
    pos[i * 3] = x;
    pos[i * 3 + 1] = yApprox;
    pos[i * 3 + 2] = 0;
    if (x > 2) peak = Math.max(peak, Math.abs(yApprox - psiTrue(x))); // skip x≤2 (formula singular)
    endY = yApprox;
  }
  psiApproxLine.geometry.attributes.position.needsUpdate = true;
  psiApproxLabel.element.textContent = `ψ from ${N} zeros · peak ringing ±${peak.toFixed(1)}`;
  psiApproxLabel.position.set(MAX_X, endY, 0);
}

// ============================================================================
// --- Riemann's formula: the HEIGHT-1 prime count pi(x) from the zeros ---
// ============================================================================
// psi(x) jumps by log p; the actual counting function pi(x) jumps by exactly 1
// at each prime. Reconstructing pi(x) from the zeros is Riemann's formula:
//
//   pi(x) ~ R(x) - sum over zeros rho of R(x^rho)
//
// where R(w) = sum_{n>=1} mu(n)/n * li(w^(1/n))  is Riemann's R function, and
// li(w) = Ei(ln w) is the logarithmic integral. For w = x^rho this needs the
// exponential integral of a COMPLEX argument, Ei(rho * ln x). Pairing rho with
// its conjugate makes each zero's contribution real: 2 * Re(li(x^rho)).

const EULER = 0.5772156649015329; // Euler-Mascheroni constant

function cExp(z: Complex): Complex {
  const e = Math.exp(z.re);
  return new Complex(e * Math.cos(z.im), e * Math.sin(z.im));
}

function cLog(z: Complex): Complex {
  return new Complex(Math.log(z.abs()), Math.atan2(z.im, z.re));
}

// Complex exponential integral Ei(z).
// Power series for small |z|; asymptotic series (optimal truncation) for large.
function Ei(z: Complex): Complex {
  if (z.abs() < 20) {
    // Ei(z) = gamma + ln(z) + sum_{k>=1} z^k / (k * k!)
    let sum = cLog(z).add(new Complex(EULER, 0));
    let zk = new Complex(1, 0); // running z^k / k!
    for (let k = 1; k <= 400; k++) {
      zk = zk.mul(z).scale(1 / k);
      const add = zk.scale(1 / k);
      sum = sum.add(add);
      if (add.abs() < 1e-16 * sum.abs() && k > z.abs()) break;
    }
    return sum;
  }
  // Ei(z) ~ (e^z / z) * sum_{k>=0} k! / z^k, truncated at the smallest term.
  const pref = cExp(z).div(z);
  let sum = new Complex(0, 0);
  let term = new Complex(1, 0); // k! / z^k
  let prevMag = Infinity;
  for (let k = 0; k <= 400; k++) {
    const mag = term.abs();
    if (mag > prevMag) break; // asymptotic series starts diverging -> stop
    sum = sum.add(term);
    prevMag = mag;
    term = term.scale(k + 1).div(z);
  }
  return pref.mul(sum);
}

// Mobius function for the small n needed here (n <= log2(MAX_X) ~ 5).
const mobius = [0, 1, -1, -1, 0, -1, 1, -1, 0, 0, 1];

// Riemann's reconstruction of pi(x) using the first N zeros.
function piRiemann(x: number, N: number): number {
  if (x < 2) return 0;
  const lnx = Math.log(x);
  const nMax = Math.floor(lnx / Math.LN2); // include n only while x^(1/n) >= 2
  let total = 0;
  for (let n = 1; n <= nMax; n++) {
    const mu = mobius[n];
    if (mu === 0) continue;
    const Ln = lnx / n; // ln(x^(1/n))
    let term = Ei(new Complex(Ln, 0)).re; // li(x^(1/n)) = main term R(x)
    let zsum = 0;
    for (let k = 0; k < N; k++) {
      const g = nontrivialZerosImag[k];
      // li(x^(rho/n)) = Ei(rho * Ln), rho = 1/2 + i*g; pair with conjugate -> 2 Re
      zsum += 2 * Ei(new Complex(Ln * 0.5, g * Ln)).re;
    }
    term -= zsum;
    total += (mu / n) * term;
  }
  return total;
}

// pi(x) reconstruction curve (yellow). Ei is expensive, so use a coarser grid.
const PI_STEPS = 3000;
const piApproxMaterial = new THREE.LineBasicMaterial({ color: 0xffff00, linewidth: 2 });
const piApproxGeometry = new THREE.BufferGeometry();
piApproxGeometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(PI_STEPS * 3), 3));
const piApproxLine = new THREE.Line(piApproxGeometry, piApproxMaterial);
scene.add(piApproxLine);

// Convergence readout for the π reconstruction.
const piApproxLabel = createLabel('', MAX_X, 0, 0);
piApproxLabel.element.style.color = '#ffff00';
scene.add(piApproxLabel);

function updatePiApprox() {
  const N = Math.min(params.piZeros, nontrivialZerosImag.length);
  const pos = piApproxLine.geometry.attributes.position.array as Float32Array;
  let peak = 0; // peak |reconstruction − true π(x)| → the ringing amplitude
  let endY = 0;
  let pIdx = 0; // running count of primes ≤ x (x increases monotonically)
  for (let i = 0; i < PI_STEPS; i++) {
    const x = (i / (PI_STEPS - 1)) * MAX_X;
    const yApprox = piRiemann(x, N);
    pos[i * 3] = x;
    pos[i * 3 + 1] = yApprox;
    pos[i * 3 + 2] = 0;
    while (pIdx < primes.length && primes[pIdx] <= x) pIdx++;
    if (x > 2) peak = Math.max(peak, Math.abs(yApprox - pIdx)); // pIdx = true π(x)
    endY = yApprox;
  }
  piApproxLine.geometry.attributes.position.needsUpdate = true;
  piApproxLabel.element.textContent = `π from ${N} zeros · peak ringing ±${peak.toFixed(1)}`;
  piApproxLabel.position.set(MAX_X, endY, 0);
}

// --- Intersection Visualization ---
const intersectionMarkerGeometry = new THREE.SphereGeometry(0.1, 16, 16);
const intersectionMarkerMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
const intersectionMarker = new THREE.Mesh(intersectionMarkerGeometry, intersectionMarkerMaterial);
scene.add(intersectionMarker);

const intersectionLabelDiv = document.createElement('div');
intersectionLabelDiv.className = 'axis-label';
intersectionLabelDiv.style.color = 'white';
// intersectionLabelDiv.style.fontSize = '12px'; // Optional
const intersectionLabel = new CSS2DObject(intersectionLabelDiv);
scene.add(intersectionLabel);

let intersectionConnector: THREE.Mesh | null = null;
// Radial line: perpendicular from the red dot to the YZ vertical axis.
// Foot at (originShift, t, 0); length = |ζ(½+it)|. Always visible with the marker.
let radialLine: THREE.Mesh | null = null;

function updateIntersection(y: number) {
    const z = zeta(y);
    // Plotting logic matches the curve: x = originShift + Re(zeta), y = y (Im(s)), z = Im(zeta)
    const point = new THREE.Vector3(params.originShift + z.re, y, z.im);

    intersectionMarker.position.copy(point);

    // Projected phasor-tip trail follows the floor height and the shift.
    updateArgTrail();

    // Radial line: from the foot on the YZ vertical axis (originShift, y, 0) to the red dot.
    const foot = new THREE.Vector3(params.originShift, y, 0);
    if (radialLine) {
        scene.remove(radialLine);
        radialLine.geometry.dispose();
        (radialLine.material as THREE.Material).dispose();
    }
    if (foot.distanceTo(point) > 1e-4) {
        radialLine = createConnector(foot, point, 0.04, 0xff5555);
        (radialLine.material as THREE.MeshBasicMaterial).opacity = 0.9;
        scene.add(radialLine);
    } else {
        radialLine = null; // |ζ| ≈ 0: marker sits on the axis, no radius to draw
    }
    
    const mod = Math.hypot(z.re, z.im);
    const argDeg = Math.atan2(z.im, z.re) * 180 / Math.PI;
    const sign = z.im < 0 ? '−' : '+';
    intersectionLabelDiv.textContent =
        `ζ = ${z.re.toFixed(2)} ${sign} ${Math.abs(z.im).toFixed(2)}i   |ζ| = ${mod.toFixed(2)}   arg = ${argDeg.toFixed(0)}°`;
    
    // Offset label to the left side (negative half of the XY grid)
    const labelPos = point.clone().add(new THREE.Vector3(-15, 5, 0));
    intersectionLabel.position.copy(labelPos);
    
    // Update Connector
    if (intersectionConnector) {
        scene.remove(intersectionConnector);
        intersectionConnector.geometry.dispose();
        (intersectionConnector.material as THREE.Material).dispose(); // Clean up material as createConnector makes new one
    }
    // Faint connector, same color as the non-axis grid lines (0x1a1a2e); toggleable.
    intersectionConnector = createConnector(labelPos, point, 0.02, 0x1a1a2e);
    intersectionConnector.visible = params.showValueLine;
    scene.add(intersectionConnector);
}

// Initial update
updateGraph();
updatePsiApprox();
updatePiApprox();
updateIntersection(params.xzGridY);

// Master gate: each explicit-formula curve is visible only when the whole
// group is enabled AND its individual toggle is on.
function applyExplicitFormulaVisibility() {
  const on = params.showExplicitFormula;
  psiTrueLine.visible = on && params.showPsiTrue;
  psiApproxLine.visible = on && params.showPsiApprox;
  psiApproxLabel.visible = on && params.showPsiApprox;
}
applyExplicitFormulaVisibility(); // start hidden

// The pi(x) reconstruction goes with the cyan prime-count, NOT the explicit-
// formula group, so it has its own independent toggle.
piApproxLine.visible = params.showPiApprox;
piApproxLabel.visible = params.showPiApprox;

// --- Plane identity labels (input vs output) ---
// Color-matched to the sidebar grid key: XY = cyan (input s-plane),
// XZ = yellow (output ζ-plane). The output label rides the movable XZ floor.
const inputPlaneLabel = createLabel('input  s-plane', 45, 50, 0);
inputPlaneLabel.element.style.color = '#00ffff';
scene.add(inputPlaneLabel);

const outputPlaneLabel = createLabel('output  ζ-plane', 40, params.xzGridY, 40);
outputPlaneLabel.element.style.color = '#ffff00';
scene.add(outputPlaneLabel);


// --- GUI ---
const gui = new GUI({ width: 600 });
gui.add(params, 'e', 0, 0.99).name('Smoothness (e)').onChange(updateGraph);
// pi(x) reconstructed from the zeros — pairs with the cyan prime-count staircase.
gui.add(params, 'showPiApprox').name('π(x) from zeros (yellow)').onChange((v: boolean) => {
    piApproxLine.visible = v;
    piApproxLabel.visible = v;
});
gui.add(params, 'piZeros', 0, nontrivialZerosImag.length, 1)
    .name('  └ # zeros (π reconstruction)').onChange(updatePiApprox);
gui.add(params, 'showXYGrid').name('Show XY Grid').onChange((v: boolean) => {
    gridHelper.visible = v;
    inputPlaneLabel.visible = v;
});
gui.add(params, 'showXZGrid').name('Show XZ Grid').onChange((v: boolean) => {
    criticalGridHelper.visible = v;
    outputPlaneLabel.visible = v;
});
gui.add(params, 'xzGridY', -60, 60, 0.01).name('XZ Grid Y').onChange((v: number) => {
    criticalGridHelper.position.y = v;
    outputPlaneLabel.position.y = v;
    updateIntersection(v);
});
gui.add(params, 'showValueLine').name('Show ζ-value label').onChange((v: boolean) => {
    if (intersectionConnector) intersectionConnector.visible = v;
    intersectionLabel.visible = v; // label and its connector toggle together
});
gui.add(params, 'showArgTrail').name('Show phasor trail').onChange(updateArgTrail);
gui.add(params, 'trailWindow', 1, 25, 1).name('  └ trail ± window (t)').onChange(updateArgTrail);
gui.add(params, 'originShift', 0, 1, 0.01).name('Origin shift (0 = Im axis, ½ = critical line)').onChange((v: number) => {
    updateZetaShift();
    criticalGridHelper.position.x = v; // output-frame origin (center cross) tracks the shift
    imaginaryGridHelper.position.x = v; // YZ plane slides with the shift too
    yzAxisLine.position.x = v;          // YZ vertical axis slides with the shift too
    updateIntersection(params.xzGridY);
});
gui.add(params, 'showYZGrid').name('Show YZ Grid (output origin)').onChange((v: boolean) => {
    imaginaryGridHelper.visible = v;
});
gui.add(params, 'showYZAxis').name('Show YZ vertical axis').onChange((v: boolean) => {
    yzAxisLine.visible = v;
});
gui.add(params, 'showCriticalStrip').name('Show Critical Strip').onChange((v: boolean) => {
    criticalStrip.visible = v;
});

// Explicit-formula reconstruction of the staircase from the zeros
const efFolder = gui.addFolder('Explicit Formula — staircases from zeros');
efFolder.add(params, 'showExplicitFormula').name('Show explicit-formula curves')
    .onChange(applyExplicitFormulaVisibility);
efFolder.add(params, 'showPsiApprox').name('ψ(x) from zeros (green)')
    .onChange(applyExplicitFormulaVisibility);
efFolder.add(params, 'psiZeros', 0, nontrivialZerosImag.length, 1)
    .name('  └ # zeros (ψ / green)').onChange(updatePsiApprox);
efFolder.add(params, 'showPsiTrue').name('True ψ(x), log-p steps (orange)')
    .onChange(applyExplicitFormulaVisibility);
efFolder.close();

// --- Animation Loop ---
function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
  labelRenderer.render(scene, camera);
}

animate();

// --- Legend sidebar toggle ---
const sidebarToggle = document.getElementById('sidebar-toggle');
sidebarToggle?.addEventListener('click', () => {
  const collapsed = document.body.classList.toggle('sidebar-collapsed');
  sidebarToggle.textContent = collapsed ? '›' : '‹'; // › to expand, ‹ to collapse
});

// --- Window Resize ---
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  labelRenderer.setSize(window.innerWidth, window.innerHeight);
});
