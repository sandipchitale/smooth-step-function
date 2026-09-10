import * as THREE from 'three';
import './style.css';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import GUI from 'lil-gui';

import { zeta, CRITICAL_SIGMA } from './math/zeta';
import { getPrimesUpTo, smoothPrimeCount } from './math/primes';
import { nontrivialZerosImag } from './math/zeros';
import { piMainTerm, piZeroTerm } from './math/riemann';
import { initViewCube } from './ui/viewCube';

// --- Configuration ---
const MAX_PRIME_VALUE = 47;
const MAX_X = 55;
const STEPS = 10000; // Resolution

// --- Primes Calculation ---

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

// Orthographic ("isometric"/parallel) camera — same position/orientation as the
// perspective one, swapped in on toggle. Parallel projection = no foreshortening.
// Wide near/far slab (near is negative) so the parallel clip volume never slices the
// scene — orthographic clips along the view axis, unlike a perspective frustum.
const orthoCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, -2000, 2000);
let activeCamera: THREE.Camera = camera;

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.target.set(30, 15, 0);

// Size the ortho frustum to match the perspective view at the current distance,
// so flipping projection doesn't jump the scale.
function syncOrthoToPerspective() {
    const dist = camera.position.distanceTo(controls.target);
    const halfH = Math.tan((camera.fov * Math.PI / 180) / 2) * dist;
    const halfW = halfH * camera.aspect;
    orthoCamera.top = halfH; orthoCamera.bottom = -halfH;
    orthoCamera.left = -halfW; orthoCamera.right = halfW;
    orthoCamera.position.copy(camera.position);
    orthoCamera.quaternion.copy(camera.quaternion);
    orthoCamera.zoom = 1;
    orthoCamera.updateProjectionMatrix();
}

function setProjection(orthographic: boolean) {
    if (orthographic) {
        syncOrthoToPerspective();
        activeCamera = orthoCamera;
    } else {
        // Carry position/orientation back so the view stays continuous.
        camera.position.copy(orthoCamera.position);
        camera.quaternion.copy(orthoCamera.quaternion);
        camera.updateProjectionMatrix();
        activeCamera = camera;
    }
    controls.object = activeCamera;
    controls.update();
}

// --- Lights ---
const ambientLight = new THREE.AmbientLight(0x404040, 2); // Soft white light
scene.add(ambientLight);

const pointLight = new THREE.PointLight(0xffffff, 2, 200);
pointLight.position.set(50, 50, 50);
scene.add(pointLight);

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
imaginaryGridHelper.position.set(0.5, 0, 0); // matches params.sigma; slides with σ
imaginaryGridHelper.visible = false; // hidden by default (matches params.showYZGrid)
scene.add(imaginaryGridHelper);

// Vertical axis of the YZ plane (the t-axis at the output-frame origin).
// Emphasized like the other axes; slides with σ and shows with the YZ grid.
const yzAxisMaterial = new THREE.LineBasicMaterial({ color: 0x666666 }); // same gray as the other axes
const yzAxisGeometry = new THREE.BufferGeometry().setFromPoints([
  new THREE.Vector3(0, -60, 0),
  new THREE.Vector3(0, 60, 0),
]);
const yzAxisLine = new THREE.Line(yzAxisGeometry, yzAxisMaterial);
yzAxisLine.position.x = 0.5; // matches params.sigma; slides with σ
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

// Connector Lines (Cylinders/Tubes)
function createConnector(start: THREE.Vector3, end: THREE.Vector3, radius: number = 0.02, color: number = 0x888888) {
    const path = new THREE.LineCurve3(start, end);
    const geometry = new THREE.TubeGeometry(path, 1, radius, 8, false);
    const material = new THREE.MeshBasicMaterial({ color: color, transparent: true, opacity: 0.5 });
    return new THREE.Mesh(geometry, material);
}

// Remove a mesh from the scene and release its geometry + material.
function disposeMesh(m: THREE.Mesh) {
    scene.remove(m);
    m.geometry.dispose();
    (m.material as THREE.Material).dispose();
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
  orthographic: false, // false = perspective, true = orthographic (parallel) projection
  showValueLine: true, // the faint connector from the ζ-value label to the red marker
  showArgTrail: false, // projected phasor-tip trail in the XZ floor (depth disambiguation)
  trailWindow: 6,      // ± window in t over which the trail is drawn
  // sigma does double duty, and that is the point: it is BOTH the real part of s
  // (which vertical line of the strip gets sampled, ζ(σ + it)) AND the Re-origin
  // of the output frame (where that line is drawn). The two are the same number
  // because the frame is registered onto the line being sampled — so the origin
  // always sits on the line, and ½ is the critical line.
  // Sweeping it off ½ is the "what would an off-line zero look like?" control:
  // the ribbon stops touching the line, and the incidence disappears.
  sigma: CRITICAL_SIGMA,
  // π(x) reconstructed from the zeros (Riemann). Hidden by default; pairs with the
  // cyan prime-count staircase as an extra "if you're curious" layer.
  piZeros: 10,            // zeros used in the yellow π(x) reconstruction (pairs with cyan)
  showPiApprox: false,    // off by default; independent top-level toggle
};

const graphMaterial = new THREE.LineBasicMaterial({ color: 0x00ffff, linewidth: 2 }); // Cyan
const graphGeometry = new THREE.BufferGeometry();
// We'll calculate positions dynamically
const positions = new Float32Array(STEPS * 3);
graphGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

const graphLine = new THREE.Line(graphGeometry, graphMaterial);
scene.add(graphLine);

// --- Math Functions ---


// --- Zeta Function Curve ---
const zetaMaterial = new THREE.LineBasicMaterial({ color: 0xff00ff, linewidth: 2 }); // Magenta
const zetaGeometry = new THREE.BufferGeometry();
const zetaPoints: number[] = [];
const zetaRe: number[] = []; // cached Re(ζ) per sample; x = σ + Re(ζ)
const zetaIm: number[] = []; // cached Im(ζ) per sample (used by the projected phasor trail)
const zetaYs: number[] = []; // cached t = Im(s) per sample
const ZETA_DT = 0.01;        // sampling step in t; trail reuses these samples

const ZETA_T_MIN = -50, ZETA_T_MAX = 50;
const ZETA_SAMPLES = Math.round((ZETA_T_MAX - ZETA_T_MIN) / ZETA_DT) + 1;

// Sample ζ(sigma + it) along t and cache Re/Im per sample.
// Split out so the sigma slider can re-sample the ribbon; translating the frame does
// NOT need this (it only translates x, see updateZetaShift).
function sampleZeta() {
    zetaRe.length = 0; zetaIm.length = 0; zetaYs.length = 0; zetaPoints.length = 0;
    for (let i = 0; i < ZETA_SAMPLES; i++) {
        const y = ZETA_T_MIN + i * ZETA_DT;
        const z = zeta(params.sigma, y);
        // Plot at (σ + Re(zeta), y, Im(zeta))
        // This wraps the "value" around the critical line in 3D space
        zetaRe.push(z.re);
        zetaIm.push(z.im);
        zetaYs.push(y);
        zetaPoints.push(params.sigma + z.re, y, z.im);
    }
}
sampleZeta();
zetaGeometry.setAttribute('position', new THREE.Float32BufferAttribute(zetaPoints, 3));
const zetaLine = new THREE.Line(zetaGeometry, zetaMaterial);
scene.add(zetaLine);

// Re-position the ribbon when the origin shift changes (cheap: x only, no zeta recompute).
function updateZetaShift() {
    const pos = zetaGeometry.attributes.position.array as Float32Array;
    for (let i = 0; i < zetaRe.length; i++) {
        pos[i * 3] = params.sigma + zetaRe[i];
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
        pts.push(params.sigma + zetaRe[i], Y0, zetaIm[i]);
        // Fade with distance from the red dot (t = Y0): bright at centre, dark at the ends.
        const f = Math.pow(Math.max(0, 1 - Math.abs(zetaYs[i] - Y0) / W), 1.5);
        cols.push(baseR * f, baseG * f, baseB * f);
    }
    argTrailGeometry.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    argTrailGeometry.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
    argTrailGeometry.computeBoundingSphere();
}




function updateGraph() {
  const positions = graphLine.geometry.attributes.position.array as Float32Array;
  
  for (let i = 0; i < STEPS; i++) {
    const x = (i / (STEPS - 1)) * MAX_X;
    
    // Existing (Cheated) Smooth Count
    const count = smoothPrimeCount(primes, x, params.e);
    
    positions[i * 3] = x;
    positions[i * 3 + 1] = count;
    positions[i * 3 + 2] = 0;
  }
  
  graphLine.geometry.attributes.position.needsUpdate = true;
}

// ============================================================================
// --- Non-trivial zeros of zeta on the critical line ---
// ============================================================================
// The imaginary parts (gamma) of the zeros. Used to plot the zeros vertically on
// the line, to snap the XZ floor / Origin shift, to drive the green-lock highlights,
// and as input to the π(x)-from-zeros (Riemann) reconstruction below.

// Imaginary parts (gamma) of the first 50 nontrivial zeros (standard tabulated).

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

// --- The zero-count table -------------------------------------------------
// Each zero's correction is independent of how many other zeros are in play,
// so instead of rebuilding the curve for every N we compute each zero's column
// ONCE and prefix-sum. piTable row N = the reconstruction using N zeros, so
// changing the count (or animating it) becomes an array copy.
//
// Cost: (ZERO_COUNT + 1) x PI_STEPS floats ~ 0.6 MB, built once.
const PI_XS = new Float64Array(PI_STEPS);
const PI_TRUE = new Int32Array(PI_STEPS); // true pi(x) at each sample, for the ringing readout
for (let i = 0, pIdx = 0; i < PI_STEPS; i++) {
  const x = (i / (PI_STEPS - 1)) * MAX_X;
  PI_XS[i] = x;
  while (pIdx < primes.length && primes[pIdx] <= x) pIdx++;
  PI_TRUE[i] = pIdx;
}

const piTable = new Float32Array((nontrivialZerosImag.length + 1) * PI_STEPS);
// Two error measures per N, because they tell opposite (and both true) stories:
//   rms  -- converges monotonically as zeros are added: the approximation IS improving.
//   peak -- does NOT converge. pi(x) has unit jumps, and a truncated sum over
//           zeros always overshoots at a discontinuity by a fixed fraction of the
//           jump (a Gibbs phenomenon). Reporting peak alone would make the
//           reconstruction look like it never improves, which is misleading.
const piPeak = new Float32Array(nontrivialZerosImag.length + 1);
const piRms = new Float32Array(nontrivialZerosImag.length + 1);
let piRowsReady = 0;      // rows 0..piRowsReady-1 are filled
let piBuildHandle = 0;

function piRowError(row: number) {
  const base = row * PI_STEPS;
  let peak = 0, sse = 0, n = 0;
  for (let i = 0; i < PI_STEPS; i++) {
    if (PI_XS[i] <= 2) continue; // below the first prime the formula says nothing useful
    const e = Math.abs(piTable[base + i] - PI_TRUE[i]);
    peak = Math.max(peak, e);
    sse += e * e;
    n++;
  }
  piPeak[row] = peak;
  piRms[row] = n ? Math.sqrt(sse / n) : 0;
}

/** Fill row 0 (the main term R(x)) synchronously — it is the cheap one. */
function buildPiRow0() {
  for (let i = 0; i < PI_STEPS; i++) piTable[i] = piMainTerm(PI_XS[i]);
  piRowError(0);
  piRowsReady = 1;
}

/** Add one more zero's column. Returns false when the table is complete. */
function buildNextPiRow(): boolean {
  if (piRowsReady > nontrivialZerosImag.length) return false;
  const k = piRowsReady - 1;           // the zero being added
  const prev = (piRowsReady - 1) * PI_STEPS;
  const cur = piRowsReady * PI_STEPS;
  for (let i = 0; i < PI_STEPS; i++) {
    piTable[cur + i] = piTable[prev + i] + piZeroTerm(PI_XS[i], k);
  }
  piRowError(piRowsReady);
  piRowsReady++;
  return piRowsReady <= nontrivialZerosImag.length;
}

/**
 * Build the remaining rows a zero at a time, one per frame, so the UI never
 * blocks. Rows already built are reused, so this is a no-op once complete.
 */
function ensurePiTable() {
  if (piBuildHandle || piRowsReady > nontrivialZerosImag.length) return;
  const step = () => {
    const more = buildNextPiRow();
    updatePiZerosAvailability();
    if (params.piZeros === piRowsReady - 1) updatePiApprox(); // keep the live curve current
    piBuildHandle = more ? requestAnimationFrame(step) : 0;
  };
  piBuildHandle = requestAnimationFrame(step);
}

/** Highest N the table can currently draw. */
function piMaxReady(): number {
  return Math.max(0, piRowsReady - 1);
}

function updatePiApprox() {
  const N = Math.min(params.piZeros, piMaxReady());
  const pos = piApproxLine.geometry.attributes.position.array as Float32Array;
  const base = N * PI_STEPS;
  for (let i = 0; i < PI_STEPS; i++) {
    pos[i * 3] = PI_XS[i];
    pos[i * 3 + 1] = piTable[base + i];
    pos[i * 3 + 2] = 0;
  }
  piApproxLine.geometry.attributes.position.needsUpdate = true;

  const pending = params.piZeros > N ? ` · computing ${params.piZeros}…` : '';
  const label = N === 0
    ? 'R(x) alone, no zeros'
    : `π from ${N} zero${N === 1 ? '' : 's'}`;
  // rms falls as zeros are added; peak does not (Gibbs at the unit jumps).
  piApproxLabel.element.textContent =
    `${label} · rms ${piRms[N].toFixed(3)} · peak ±${piPeak[N].toFixed(2)}${pending}`;
  piApproxLabel.position.set(MAX_X, piTable[base + PI_STEPS - 1], 0);
}

buildPiRow0();

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
// Foot at (σ, t, 0); length = |ζ(σ+it)|. Always visible with the marker.
let radialLine: THREE.Mesh | null = null;

function updateIntersection(y: number) {
    const z = zeta(params.sigma, y);
    // Plotting logic matches the curve: x = σ + Re(zeta), y = y (Im(s)), z = Im(zeta)
    const point = new THREE.Vector3(params.sigma + z.re, y, z.im);

    intersectionMarker.position.copy(point);

    // Projected phasor-tip trail follows the floor height and the shift.
    updateArgTrail();

    // Radial line: from the foot on the YZ vertical axis (σ, y, 0) to the red dot.
    const foot = new THREE.Vector3(params.sigma, y, 0);
    if (radialLine) disposeMesh(radialLine);
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
    if (intersectionConnector) disposeMesh(intersectionConnector);
    // Faint connector, same color as the non-axis grid lines (0x1a1a2e); toggleable.
    intersectionConnector = createConnector(labelPos, point, 0.02, 0x1a1a2e);
    intersectionConnector.visible = params.showValueLine;
    scene.add(intersectionConnector);
}

// Initial update
updateGraph();
updatePiApprox();
updateIntersection(params.xzGridY);

// The pi(x) reconstruction pairs with the cyan prime-count; it has its own
// independent toggle and starts hidden.
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

// Sorted t-values of the non-trivial zeros (both signs) within range, plus the origin.
// Used for Shift+Arrow snapping on the XZ slider AND for highlighting special floor heights.
const zeroTs = [...nontrivialZerosImag.map(t => -t), ...nontrivialZerosImag]
    .filter(t => t >= -60 && t <= 60)
    .sort((a, b) => a - b);
const xzSnaps = [...zeroTs, 0].sort((a, b) => a - b);

// --- Offset-origin marker: the output-frame origin, kept on the y = 0 plane ---
// Sits at (σ, 0, 0) and slides in x with the σ slider.
const offsetOriginMarker = new THREE.Mesh(
    new THREE.SphereGeometry(0.1, 16, 16),
    new THREE.MeshBasicMaterial({ color: 0x00ff00 })
);
scene.add(offsetOriginMarker);

const offsetOriginLabel = createLabel('', 0, 0, 0);
offsetOriginLabel.element.style.color = '#00ff00';
scene.add(offsetOriginLabel);

let offsetOriginConnector: THREE.Mesh | null = null;

function updateOffsetOrigin() {
    const x = params.sigma;
    const point = new THREE.Vector3(x, 0, 0);          // always on the y = 0 plane
    offsetOriginMarker.position.copy(point);

    // At exactly ½ the offset origin registers with the critical line — signal the
    // specialness of this position by turning the critical line, the ζ ribbon, and the
    // complex (non-trivial) zeros green; otherwise restore their usual colours.
    const atHalf = Math.abs(x - 0.5) < 1e-6;
    criticalLineMaterial.color.set(atHalf ? 0x00ff00 : 0xffffff);
    zetaMaterial.color.set(atHalf ? 0x00ff00 : 0xff00ff);   // ζ ribbon: green at ½, else magenta
    zeroesMaterial.color.set(atHalf ? 0x00ff00 : 0xffffff); // complex zeros: green at ½, else white

    const labelPos = new THREE.Vector3(x, 0, 12); // same x & y as the dot ⇒ connector runs along z, perpendicular to the XY plane
    offsetOriginLabel.position.copy(labelPos);
    offsetOriginLabel.element.textContent = `offset origin (x = ${x.toFixed(2)})`;

    if (offsetOriginConnector) disposeMesh(offsetOriginConnector);
    offsetOriginConnector = createConnector(labelPos, point, 0.02, 0x00ff00);
    (offsetOriginConnector.material as THREE.MeshBasicMaterial).opacity = 0.4; // faint
    scene.add(offsetOriginConnector);
}
updateOffsetOrigin();

// --- XZ plane's z-axis (both directions), highlighted green when the floor is at y = 0 ---
// Same colour & thinness as the critical line; runs through the floor centre along ±z.
const xzPosZAxisMaterial = new THREE.LineBasicMaterial({ color: 0x00ff00, transparent: true, opacity: 0.5 });
const xzPosZAxisGeometry = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(0, 0, -60),
    new THREE.Vector3(0, 0, 60),
]);
const xzPosZAxis = new THREE.Line(xzPosZAxisGeometry, xzPosZAxisMaterial);
scene.add(xzPosZAxis);

function updateXzPosZAxis() {
    xzPosZAxis.position.x = params.sigma;          // sits on the output-frame origin
    xzPosZAxis.position.y = params.xzGridY;              // rides the floor height
    // Shown (green) only at the ½ registration AND when the floor sits at a special
    // height (y = 0 or a non-trivial zero) — both locks must hold.
    const atHalf = Math.abs(params.sigma - 0.5) < 1e-6;
    xzPosZAxis.visible = atHalf && xzSnaps.some(p => Math.abs(p - params.xzGridY) < 1e-6);
}
updateXzPosZAxis();


// --- Live σ readout ---------------------------------------------------------
// Doubles as the standing scope note for the ½ registration: it states, on
// screen and permanently, that the incidence is built into the coordinates
// rather than discovered by them.
const sigmaNote = document.createElement('div');
sigmaNote.id = 'sigma-note';
document.body.appendChild(sigmaNote);

function updateSigmaNote() {
    const onLine = Math.abs(params.sigma - CRITICAL_SIGMA) < 1e-9;
    sigmaNote.className = onLine ? 'on-line' : 'off-line';
    sigmaNote.innerHTML = onLine
        ? '<span class="sn-head">σ = ½ · on the critical line</span>' +
          'The ribbon returns to the line at each zero. That incidence is <b>constructed</b>: ' +
          'plotting x = ½ + Re ζ sends ζ = 0 to x = ½ by definition. A coordinate registration, not a theorem.'
        : `<span class="sn-head">σ = ${params.sigma.toFixed(2)} · off the critical line</span>` +
          'ζ(σ + it) generically misses the line here — no incidences. RH says this is true for ' +
          '<b>every</b> σ ≠ ½ in the strip. Sampling one line cannot prove that.';
}

// --- GUI ---
const gui = new GUI({ width: 600 });
// Projection: a radio choice (a mode switch between two named states), not a checkbox.
const projPanel = document.createElement('div');
projPanel.id = 'projection-radio';
projPanel.innerHTML =
    '<span class="pr-label">Projection</span>' +
    '<div class="pr-options">' +
    '<label><input type="radio" name="projection" value="perspective" checked> Perspective</label>' +
    '<label><input type="radio" name="projection" value="orthographic"> Orthographic</label>' +
    '</div>';
projPanel.addEventListener('change', (e) => {
    const v = (e.target as HTMLInputElement).value;
    params.orthographic = v === 'orthographic';
    setProjection(params.orthographic);
});
const projChildren = (gui as any).$children as HTMLElement;
projChildren.insertBefore(projPanel, projChildren.firstChild); // top of the panel

// Headline control — σ, then the staircase smoothing.
//
// σ is a SINGLE slider doing two things at once, deliberately: it chooses which
// vertical line of the strip is sampled, ζ(σ + it), and it carries the whole
// output frame to that line. Splitting them into two sliders let you register
// the frame onto a line you were not sampling, which is a picture of nothing.
// Keeping them fused is what makes "the ribbon touches the line" mean something.

// Translate the whole output apparatus to Re = v. Cheap: no ζ re-evaluation.
function applyOriginShift(v: number) {
    updateZetaShift();
    criticalGridHelper.position.x = v; // output-frame origin (center cross) tracks σ
    imaginaryGridHelper.position.x = v; // YZ plane slides with σ too
    yzAxisLine.position.x = v;          // YZ vertical axis slides with σ too
    updateOffsetOrigin();              // green offset-origin dot + label follow σ
    updateXzPosZAxis();                // green +z axis tracks σ in x
    updateIntersection(params.xzGridY);
}

// Re-sampling ζ over the whole t range is the expensive half, so it is deferred
// to a frame; the frame translation above lands immediately, which keeps the
// drag feeling direct.
let sigmaPending = 0;
function applySigma() {
    sigmaPending = 0;
    sampleZeta();
    const pos = zetaGeometry.attributes.position.array as Float32Array;
    for (let i = 0; i < zetaRe.length; i++) {
        pos[i * 3] = params.sigma + zetaRe[i];
        pos[i * 3 + 1] = zetaYs[i];
        pos[i * 3 + 2] = zetaIm[i];
    }
    zetaGeometry.attributes.position.needsUpdate = true;
    updateArgTrail();
    updateIntersection(params.xzGridY);
    updateSigmaNote();
}

// Range stops at 0.99, not 1: ζ has its pole at s = 1, and the ribbon already
// blows up to |ζ| ~ 100 near t = 0 by 0.99. 0 is the imaginary axis and is fine.
const sigmaCtrl = gui.add(params, 'sigma', 0, 0.99, 0.01)
    .name('σ = Re(s) & output origin (0 = Im axis, ½ = critical line)')
    .onChange((v: number) => {
        applyOriginShift(v);
        if (!sigmaPending) sigmaPending = requestAnimationFrame(applySigma);
    });
const smoothCtrl = gui.add(params, 'e', 0, 0.99).name('Smoothness (e)').onChange(updateGraph);

// π(x) reconstructed from the zeros (Riemann) — pairs with the cyan prime-count staircase.
const showPiCtrl = gui.add(params, 'showPiApprox').name('π(x) from zeros (yellow)').onChange((v: boolean) => {
    piApproxLine.visible = v;
    piApproxLabel.visible = v;
    if (v) ensurePiTable(); // start filling the zero table the first time it is shown
});
const piZerosCtrl = gui.add(params, 'piZeros', 0, nontrivialZerosImag.length, 1)
    .name('  └ # zeros (π reconstruction)')
    .onChange(() => { stopZeroAnimation(); updatePiApprox(); });

// Reflect table-build progress in the slider's name, so a count that is still
// being computed reads as "not ready yet" rather than looking broken.
function updatePiZerosAvailability() {
    const max = piMaxReady();
    const suffix = max < nontrivialZerosImag.length ? `  (${max}/${nontrivialZerosImag.length} ready)` : '';
    piZerosCtrl.name(`  └ # zeros (π reconstruction)${suffix}`);
}

// --- Watch the staircase emerge from the zeros ------------------------------
// The headline demonstration: sweep N from 0 upward and the yellow curve goes
// from the smooth R(x) to something that visibly counts primes. Each frame is
// just a row lookup in piTable, so this is free once the table is built.
const zeroAnim = { playing: false, n: 0, secPerZero: 0.18, last: 0 };

function stopZeroAnimation() {
    if (!zeroAnim.playing) return;
    zeroAnim.playing = false;
    animateBtnCtrl.name('▶  Animate zeros  (0 → 50)');
}

function toggleZeroAnimation() {
    if (zeroAnim.playing) { stopZeroAnimation(); return; }
    // Make sure the layer being animated is actually visible.
    if (!params.showPiApprox) {
        params.showPiApprox = true;
        piApproxLine.visible = true;
        piApproxLabel.visible = true;
        showPiCtrl.updateDisplay();
    }
    zeroAnim.playing = true;
    zeroAnim.n = 0;
    zeroAnim.last = performance.now();
    animateBtnCtrl.name('■  Stop');
    ensurePiTable();
}

/** Advance the sweep; called once per frame from animate(). */
function stepZeroAnimation() {
    if (!zeroAnim.playing) return;
    const now = performance.now();
    if (now - zeroAnim.last < zeroAnim.secPerZero * 1000) return;
    zeroAnim.last = now;
    if (zeroAnim.n > piMaxReady()) return; // table still catching up — hold here
    params.piZeros = zeroAnim.n;
    piZerosCtrl.updateDisplay();
    updatePiApprox();
    if (zeroAnim.n >= nontrivialZerosImag.length) { stopZeroAnimation(); return; }
    zeroAnim.n++;
}

const animateBtnCtrl = gui.add({ run: toggleZeroAnimation }, 'run')
    .name('▶  Animate zeros  (0 → 50)');
gui.add(zeroAnim, 'secPerZero', 0.04, 0.6, 0.02).name('  └ seconds per zero');

// ζ-ribbon readout — the value label and the flattened phasor trail.
gui.add(params, 'showValueLine').name('Show ζ-value label').onChange((v: boolean) => {
    if (intersectionConnector) intersectionConnector.visible = v;
    intersectionLabel.visible = v; // label and its connector toggle together
});
gui.add(params, 'showArgTrail').name('Show phasor trail').onChange(updateArgTrail);
const trailWindowCtrl = gui.add(params, 'trailWindow', 1, 25, 1).name('  └ trail ± window (t)').onChange(updateArgTrail);

// Grids & planes. (XZ Grid Y is the dedicated VERTICAL slider appended below, not a lil-gui row.)
gui.add(params, 'showXYGrid').name('Show XY Grid').onChange((v: boolean) => {
    gridHelper.visible = v;
    inputPlaneLabel.visible = v;
});
gui.add(params, 'showXZGrid').name('Show XZ Grid').onChange((v: boolean) => {
    criticalGridHelper.visible = v;
    outputPlaneLabel.visible = v;
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

// ============================================================================
// --- Keyboard operability for all ranges + dedicated VERTICAL XZ-Grid-Y slider ---
// ============================================================================

// (zeroTs / xzSnaps are defined earlier, near the floor-highlight markers.)

// Nearest snap point strictly above (dir > 0) or below (dir < 0) v.
function snapNext(points: number[], v: number, dir: number): number {
    if (dir > 0) {
        for (const p of points) if (p > v + 1e-6) return p;
        return points[points.length - 1] ?? v;
    }
    for (let i = points.length - 1; i >= 0; i--) if (points[i] < v - 1e-6) return points[i];
    return points[0] ?? v;
}

// Make a lil-gui numeric controller keyboard-operable: focus its slider, then
// Arrow keys step by the controller's step (Shift = ×10, or snap to snapPoints).
function enableKeyboard(controller: any, opts: { snapPoints?: number[] } = {}) {
    const slider = controller.domElement.querySelector('.lil-slider, .slider') as HTMLElement | null;
    const target = slider ?? (controller.domElement as HTMLElement);
    target.tabIndex = 0;
    target.classList.add('kb-slider');
    target.addEventListener('keydown', (e: KeyboardEvent) => {
        const step = controller._step ?? 1;
        const min = controller._min ?? 0;
        const max = controller._max ?? 1;
        const up = e.key === 'ArrowUp' || e.key === 'ArrowRight';
        const down = e.key === 'ArrowDown' || e.key === 'ArrowLeft';
        let v = controller.getValue();
        let handled = true;
        if (e.shiftKey && opts.snapPoints && (up || down)) v = snapNext(opts.snapPoints, v, up ? 1 : -1);
        else if (up) v += e.shiftKey ? step * 10 : step;
        else if (down) v -= e.shiftKey ? step * 10 : step;
        else if (e.key === 'Home') v = max;
        else if (e.key === 'End') v = min;
        else handled = false;
        if (handled) {
            e.preventDefault();
            controller.setValue(Math.min(max, Math.max(min, v)));
        }
    });
}

enableKeyboard(smoothCtrl);
enableKeyboard(piZerosCtrl);
enableKeyboard(trailWindowCtrl);
enableKeyboard(sigmaCtrl, { snapPoints: [0, 0.5, 0.99] }); // Shift+Arrow snaps to 0 / ½ / edge

// --- Vertical XZ-Grid-Y slider: a narrow strip hugging the right edge ---
// Snap targets for Shift+↑/↓ are xzSnaps (non-trivial zeros + origin), defined earlier.
const xzPanel = document.createElement('div');
xzPanel.id = 'xz-vertical';
const xzLabel = document.createElement('div');
xzLabel.className = 'xz-label';
xzLabel.textContent = 'XZ Grid Y (t)';
const xzInput = document.createElement('input');
xzInput.type = 'range';
xzInput.min = '-60';
xzInput.max = '60';
xzInput.step = 'any';
xzInput.value = String(params.xzGridY);
xzInput.title = 'Sweep the output floor (t).  ↑/↓ move,  Shift+↑/↓ snap to non-trivial zeros / origin';
const xzNumber = document.createElement('input'); // type a value directly
xzNumber.type = 'number';
xzNumber.min = '-60';
xzNumber.max = '60';
xzNumber.step = '0.1';
xzNumber.title = 'Type a t value';
xzPanel.append(xzLabel, xzInput, xzNumber);
document.body.appendChild(xzPanel);

// Sit directly below the lil-gui panel, both hugging the right edge. Track the
// panel's height (folders open/close, window resize) so it stays glued beneath it.
const guiEl = gui.domElement as HTMLElement;
// Pin the panel to the right edge (lil-gui defaults to right: 15px) and retheme its
// background to match the vertical-slider panel. Inline custom properties beat lil-gui's
// injected stylesheet regardless of load order.
guiEl.style.right = '0px';
guiEl.style.setProperty('--background-color', 'rgba(16, 16, 34, 0.85)');
guiEl.style.setProperty('--title-background-color', 'rgba(8, 8, 20, 0.92)');
guiEl.style.backdropFilter = 'blur(8px)';
(guiEl.style as any).webkitBackdropFilter = 'blur(8px)';
function positionXzPanel() {
    xzPanel.style.top = `${guiEl.getBoundingClientRect().bottom}px`;
}
new ResizeObserver(positionXzPanel).observe(guiEl);
window.addEventListener('resize', positionXzPanel);
positionXzPanel();

function setXzGridY(v: number) {
    v = Math.min(60, Math.max(-60, v));
    params.xzGridY = v;
    criticalGridHelper.position.y = v;
    outputPlaneLabel.position.y = v;
    updateXzPosZAxis(); // green +z axis shows only when the floor is at y = 0
    updateIntersection(v);
    xzInput.value = String(v);
    xzNumber.value = v.toFixed(2);
}

xzInput.addEventListener('input', () => setXzGridY(parseFloat(xzInput.value)));
// Only ↑/↓ move the vertical slider (Shift+↑/↓ snap); swallow other range keys.
xzInput.addEventListener('keydown', (e) => {
    const up = e.key === 'ArrowUp';
    const down = e.key === 'ArrowDown';
    if (e.key.startsWith('Arrow') || e.key === 'PageUp' || e.key === 'PageDown' || e.key === 'Home' || e.key === 'End') {
        e.preventDefault(); // disable native Left/Right/Page/Home/End movement
    }
    if (!up && !down) return;
    const v = e.shiftKey ? snapNext(xzSnaps, params.xzGridY, up ? 1 : -1) : params.xzGridY + (up ? 0.1 : -0.1);
    setXzGridY(v);
});
// Number field: commit typed values on change.
xzNumber.addEventListener('change', () => {
    const n = parseFloat(xzNumber.value);
    if (!Number.isNaN(n)) setXzGridY(n);
});

setXzGridY(params.xzGridY); // initialise floor position + readout

// Keep the σ readout docked beneath the ViewCube widget. Driven by resize
// observers rather than the render loop so it never forces a layout per frame.
function positionSigmaNote() {
    const cube = document.getElementById('view-cube');
    if (!cube) return;
    const r = cube.getBoundingClientRect();
    sigmaNote.style.left = `${r.left}px`;
    sigmaNote.style.width = `${r.width}px`;
    // Prefer sitting under the cube; if that would run off the bottom, tuck it
    // above instead so the note is never clipped on a short viewport.
    const h = sigmaNote.offsetHeight || 104;
    const below = r.bottom + 8;
    sigmaNote.style.top = `${below + h <= window.innerHeight - 8 ? below : Math.max(8, r.top - h - 8)}px`;
}

// --- ViewCube (see src/ui/viewCube.ts) ---
const updateViewCube = initViewCube({
    anchorEl: guiEl,
    camera,
    controls,
    getActiveCamera: () => activeCamera,
    syncOrthoIfActive: () => { if (activeCamera === orthoCamera) syncOrthoToPerspective(); },
});

// The note docks under the cube, so re-place it whenever the cube moves.
const viewCubeEl = document.getElementById('view-cube');
if (viewCubeEl) new ResizeObserver(positionSigmaNote).observe(viewCubeEl);
new ResizeObserver(positionSigmaNote).observe(guiEl);
window.addEventListener('resize', positionSigmaNote);
positionSigmaNote();
updateSigmaNote();
updatePiZerosAvailability();

// --- Animation Loop ---
function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, activeCamera);
  labelRenderer.render(scene, activeCamera);
  updateViewCube();
  stepZeroAnimation();
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
  const aspect = window.innerWidth / window.innerHeight;
  camera.aspect = aspect;
  camera.updateProjectionMatrix();
  // Keep the ortho frustum height, re-derive width from the new aspect.
  const halfH = (orthoCamera.top - orthoCamera.bottom) / 2;
  orthoCamera.left = -halfH * aspect;
  orthoCamera.right = halfH * aspect;
  orthoCamera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  labelRenderer.setSize(window.innerWidth, window.innerHeight);
});
