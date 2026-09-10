// ============================================================================
// --- ViewCube: a Tinkercad-style navigation widget ---
// ============================================================================
// A small overlay (its own scene + renderer) showing a labeled cube that mirrors
// the main view's orientation. Its 26 regions — 6 faces, 12 edges, 8 corners — are
// pickable: hovering highlights one, clicking snaps the main camera to that view
// (positioned at target + dir·distance, looking at the orbit target). Dragging the
// cube orbits the main view; the home button restores a three-quarter view.
//
// The widget owns no application state: everything it needs to drive the main
// view is passed in as ViewCubeDeps. `getActiveCamera` is a getter rather than a
// value because main.ts swaps the active camera when the projection changes.

import * as THREE from 'three';
import type { OrbitControls } from 'three/addons/controls/OrbitControls.js';

export interface ViewCubeDeps {
    /** Element the cube docks beneath (the lil-gui panel). */
    anchorEl: HTMLElement;
    /** The perspective camera the tween/orbit actually drives. */
    camera: THREE.PerspectiveCamera;
    controls: OrbitControls;
    /** The camera OrbitControls is currently driving (may be the ortho one). */
    getActiveCamera: () => THREE.Camera;
    /** Re-sync the ortho camera from the perspective one IF ortho is active. */
    syncOrthoIfActive: () => void;
}

/** Builds the widget and returns the per-frame update to call from the render loop. */
export function initViewCube(deps: ViewCubeDeps): () => void {
    const { anchorEl: guiEl, camera, controls, getActiveCamera, syncOrthoIfActive } = deps;

    const VIEWCUBE_SIZE = 280; // px

    const cubeContainer = document.createElement('div');
    cubeContainer.id = 'view-cube';
    cubeContainer.style.width = `${VIEWCUBE_SIZE}px`;
    document.body.appendChild(cubeContainer);

    // Sit in a card directly under the lil-gui panel, to the left of the vertical slider.
    // Track the panel's height (folders/resize) so it stays glued just beneath it.
    function positionViewCube() {
        cubeContainer.style.top = `${guiEl.getBoundingClientRect().bottom + 8}px`;
    }
    new ResizeObserver(positionViewCube).observe(guiEl);
    window.addEventListener('resize', positionViewCube);
    positionViewCube();

    const cubeRenderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    cubeRenderer.setSize(VIEWCUBE_SIZE, VIEWCUBE_SIZE);
    cubeRenderer.setPixelRatio(window.devicePixelRatio);
    cubeContainer.appendChild(cubeRenderer.domElement);

    const cubeScene = new THREE.Scene();
    // Frustum half-width just larger than a cube corner (√3·0.5 ≈ 0.87) so the cube
    // fills the canvas with only a thin margin, instead of floating in whitespace.
    const cubeCamera = new THREE.OrthographicCamera(-1.05, 1.05, 1.05, -1.05, 0.1, 100);
    cubeScene.add(new THREE.AmbientLight(0xffffff, 0.9));
    const cubeKeyLight = new THREE.DirectionalLight(0xffffff, 0.55);
    cubeKeyLight.position.set(3, 5, 4);
    cubeScene.add(cubeKeyLight);

    // Face-label textures (light face, dark text). BoxGeometry material order is
    // +X, -X, +Y, -Y, +Z, -Z → RIGHT, LEFT, TOP, BOTTOM, FRONT, BACK.
    function makeFaceTexture(text: string): THREE.CanvasTexture {
        const s = 128;
        const c = document.createElement('canvas');
        c.width = c.height = s;
        const ctx = c.getContext('2d')!;
        ctx.fillStyle = '#eef0fa';
        ctx.fillRect(0, 0, s, s);
        ctx.strokeStyle = 'rgba(80,90,140,0.45)';
        ctx.lineWidth = 6;
        ctx.strokeRect(3, 3, s - 6, s - 6);
        ctx.fillStyle = '#222a4a';
        ctx.font = 'bold 22px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, s / 2, s / 2);
        const tex = new THREE.CanvasTexture(c);
        tex.anisotropy = 4;
        return tex;
    }

    const cubeFaceLabels = ['RIGHT', 'LEFT', 'TOP', 'BOTTOM', 'FRONT', 'BACK'];
    const cubeMaterials = cubeFaceLabels.map(t => new THREE.MeshLambertMaterial({ map: makeFaceTexture(t) }));
    const cubeMesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), cubeMaterials);
    cubeScene.add(cubeMesh);
    const cubeEdges = new THREE.LineSegments(
        new THREE.EdgesGeometry(cubeMesh.geometry),
        new THREE.LineBasicMaterial({ color: 0x2a3358 })
    );
    cubeScene.add(cubeEdges);

    // 26 pickable zones: enumerate (dx,dy,dz) ∈ {-1,0,1}³ minus the origin. Each zone
    // is a thin slab flush to the surface; #non-zero components → face(1)/edge(2)/corner(3).
    const ZONE_BASE = 0x6fb7ff, ZONE_HI = 0x00ffff;
    const CUBE_H = 0.5, ZONE_BAND = 0.2, ZONE_INNER = 1 - 2 * ZONE_BAND; // face inner = 0.6
    const cubeZones: THREE.Mesh[] = [];
    for (let dx = -1; dx <= 1; dx++)
    for (let dy = -1; dy <= 1; dy++)
    for (let dz = -1; dz <= 1; dz++) {
        if (dx === 0 && dy === 0 && dz === 0) continue;
        const d = [dx, dy, dz];
        const size = d.map(c => (c === 0 ? ZONE_INNER : ZONE_BAND));
        const pos = d.map(c => c * (CUBE_H - ZONE_BAND / 2)); // slab flush to its face
        const zone = new THREE.Mesh(
            new THREE.BoxGeometry(size[0], size[1], size[2]),
            new THREE.MeshBasicMaterial({ color: ZONE_BASE, transparent: true, opacity: 0 })
        );
        zone.position.set(pos[0] * 1.01, pos[1] * 1.01, pos[2] * 1.01); // just proud of the face
        zone.userData.dir = new THREE.Vector3(dx, dy, dz).normalize();
        cubeScene.add(zone);
        cubeZones.push(zone);
    }

    // Orientation sync: place the cube camera along the main view's direction so the
    // fixed, axis-aligned cube presents the same orientation as the scene. Read the
    // ACTIVE camera (the one OrbitControls is driving) so the cube also tracks free
    // rotation in orthographic mode, where the perspective camera is left frozen.
    const cubeOffset = new THREE.Vector3();
    function syncCubeOrientation() {
        const cam = getActiveCamera();
        cubeOffset.copy(cam.position).sub(controls.target).normalize().multiplyScalar(5);
        cubeCamera.position.copy(cubeOffset);
        cubeCamera.up.copy(cam.up);
        cubeCamera.lookAt(0, 0, 0);
        cubeCamera.updateMatrixWorld();
    }

    // Picking + hover.
    const cubeRay = new THREE.Raycaster();
    const cubePtr = new THREE.Vector2();
    let hoveredZone: THREE.Mesh | null = null;

    function pickZone(ev: PointerEvent): THREE.Mesh | null {
        const r = cubeRenderer.domElement.getBoundingClientRect();
        cubePtr.x = ((ev.clientX - r.left) / r.width) * 2 - 1;
        cubePtr.y = -((ev.clientY - r.top) / r.height) * 2 + 1;
        cubeRay.setFromCamera(cubePtr, cubeCamera);
        const hit = cubeRay.intersectObjects(cubeZones, false)[0];
        return hit ? (hit.object as THREE.Mesh) : null;
    }

    function setCubeHover(z: THREE.Mesh | null) {
        if (hoveredZone === z) return;
        if (hoveredZone) (hoveredZone.material as THREE.MeshBasicMaterial).opacity = 0;
        hoveredZone = z;
        if (hoveredZone) {
            const m = hoveredZone.material as THREE.MeshBasicMaterial;
            m.color.set(ZONE_HI);
            m.opacity = 0.45;
        }
    }

    // Camera snap animation toward a direction (keeps the current orbit distance).
    const WORLD_UP = new THREE.Vector3(0, 1, 0);
    let cubeTween: { from: THREE.Vector3; to: THREE.Vector3; fromUp: THREE.Vector3; toUp: THREE.Vector3; t0: number; dur: number } | null = null;

    function snapToDir(dir: THREE.Vector3) {
        const n = dir.clone().normalize();
        const dist = camera.position.distanceTo(controls.target);
        const to = controls.target.clone().add(n.clone().multiplyScalar(dist));
        // Up is world-up, except a straight top/bottom view (dir ∥ Y) would gimbal → use Z.
        const toUp = Math.abs(n.dot(WORLD_UP)) > 0.99
            ? new THREE.Vector3(0, 0, n.y > 0 ? -1 : 1)
            : WORLD_UP.clone();
        cubeTween = { from: camera.position.clone(), to, fromUp: camera.up.clone(), toUp, t0: performance.now(), dur: 450 };
        controls.enabled = false; // block orbit input mid-flight
    }

    function updateCubeTween() {
        if (!cubeTween) return;
        const k = Math.min(1, (performance.now() - cubeTween.t0) / cubeTween.dur);
        const e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2; // easeInOutQuad
        camera.position.lerpVectors(cubeTween.from, cubeTween.to, e);
        camera.up.lerpVectors(cubeTween.fromUp, cubeTween.toUp, e).normalize();
        camera.lookAt(controls.target);
        syncOrthoIfActive();
        if (k >= 1) {
            cubeTween = null;
            controls.enabled = true;
            controls.update();
        }
    }

    // Drag the cube to orbit the main view (spherical around the orbit target).
    const _orbitOff = new THREE.Vector3();
    const _orbitSph = new THREE.Spherical();
    function orbitMain(dxPix: number, dyPix: number) {
        if (cubeTween) return;
        _orbitOff.copy(camera.position).sub(controls.target);
        _orbitSph.setFromVector3(_orbitOff);
        _orbitSph.theta -= dxPix * 0.01;
        _orbitSph.phi = Math.max(0.001, Math.min(Math.PI - 0.001, _orbitSph.phi - dyPix * 0.01));
        _orbitOff.setFromSpherical(_orbitSph);
        camera.position.copy(controls.target).add(_orbitOff);
        camera.up.set(0, 1, 0);
        camera.lookAt(controls.target);
        syncOrthoIfActive();
        controls.update();
    }

    const cubeDom = cubeRenderer.domElement;
    let cubeDownX = 0, cubeDownY = 0, cubeDragging = false, cubeMoved = false;
    cubeDom.addEventListener('pointerdown', (ev) => {
        cubeDragging = true; cubeMoved = false;
        cubeDownX = ev.clientX; cubeDownY = ev.clientY;
        cubeDom.setPointerCapture(ev.pointerId);
        cubeContainer.style.cursor = 'grabbing';
    });
    cubeDom.addEventListener('pointermove', (ev) => {
        if (cubeDragging) {
            if (!cubeMoved && Math.hypot(ev.clientX - cubeDownX, ev.clientY - cubeDownY) > 4) cubeMoved = true;
            if (cubeMoved) orbitMain(ev.movementX, ev.movementY);
        } else {
            setCubeHover(pickZone(ev));
            cubeContainer.style.cursor = hoveredZone ? 'pointer' : 'grab';
        }
    });
    cubeDom.addEventListener('pointerup', (ev) => {
        if (cubeDragging && !cubeMoved) {
            const z = pickZone(ev);
            if (z) snapToDir(z.userData.dir as THREE.Vector3);
        }
        cubeDragging = false;
        cubeContainer.style.cursor = 'grab';
    });
    cubeDom.addEventListener('pointerleave', () => { if (!cubeDragging) setCubeHover(null); });

    // Home button → a pleasant three-quarter view (front-right-top).
    const cubeHomeBtn = document.createElement('button');
    cubeHomeBtn.id = 'view-cube-home';
    cubeHomeBtn.title = 'Home view';
    cubeHomeBtn.setAttribute('aria-label', 'Home view');
    cubeHomeBtn.textContent = '⌂';
    cubeHomeBtn.addEventListener('click', () => snapToDir(new THREE.Vector3(1, 0.7, 1)));
    cubeContainer.appendChild(cubeHomeBtn);

    function updateViewCube() {
        updateCubeTween();
        syncCubeOrientation();
        cubeRenderer.render(cubeScene, cubeCamera);
    }

    return updateViewCube;
}
