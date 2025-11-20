// main.js — squishy jellycat splat
import * as THREE from 'https://unpkg.com/three@0.161.0/build/three.module.js';

const canvas = document.getElementById('scene');

// --- renderer / scene / camera ---
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setClearColor(0x050509, 1);

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0x050509, 10, 50);

const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
camera.position.set(0, 0, 18);

// --- resize handling ---
function onResize() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', onResize);
onResize();

// --- interaction state ---
const mouse = new THREE.Vector2();
const raycaster = new THREE.Raycaster();
let isDragging = false;
let currentHitPoint = null;

window.addEventListener('pointerdown', (e) => {
  isDragging = true;
  updateMouseFromEvent(e);
});

window.addEventListener('pointerup', () => {
  isDragging = false;
  currentHitPoint = null;
});

window.addEventListener('pointermove', (e) => {
  updateMouseFromEvent(e);
});

function updateMouseFromEvent(e) {
  const rect = canvas.getBoundingClientRect();
  mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
}

// keyboard: A/D rotate, W/S zoom
const keyState = new Set();
window.addEventListener('keydown', (e) => keyState.add(e.key.toLowerCase()));
window.addEventListener('keyup', (e) => keyState.delete(e.key.toLowerCase()));

// --- jellycat point cloud ---
let points;
let originalPositions; // Float32Array
let velocities;        // Float32Array

// invisible plane used to compute drag position
const deformPlane = new THREE.Mesh(
  new THREE.PlaneGeometry(20, 20),
  new THREE.MeshBasicMaterial({ visible: false })
);
scene.add(deformPlane);

// deformation physics parameters
const DEFORM_RADIUS = 2.0;
const SPRING_STIFFNESS = 45.0;
const DAMPING = 9.0;
const MASS = 1.0;
const PUSH_STRENGTH = 130.0;

loadJellycat().then((cloud) => {
  points = cloud.points;
  originalPositions = cloud.originalPositions;
  velocities = new Float32Array(originalPositions.length);
  scene.add(points);
  animate();
}).catch((err) => {
  console.error('Failed to load jellycat:', err);
});

// build point cloud from jellycat.png
async function loadJellycat() {
  const loader = new THREE.TextureLoader();
  const texture = await loader.loadAsync('./jellycat.png');
  const image = texture.image;

  const tmpCanvas = document.createElement('canvas');
  tmpCanvas.width = image.width;
  tmpCanvas.height = image.height;
  const ctx = tmpCanvas.getContext('2d');
  ctx.drawImage(image, 0, 0);
  const imgData = ctx.getImageData(0, 0, image.width, image.height);
  const data = imgData.data;

  const positions = [];
  const colors = [];

  const step = 3; // sampling step — smaller = more points

  for (let y = 0; y < image.height; y += step) {
    for (let x = 0; x < image.width; x += step) {
      const idx = (y * image.width + x) * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      const a = data[idx + 3];

      if (a < 60) continue; // skip mostly transparent

      // center & scale
      const nx = (x / image.width) - 0.5;
      const ny = (y / image.height) - 0.5;
      const scale = 9.5;

      const px = nx * scale;
      const py = -ny * scale;
      const pz = (Math.random() - 0.5) * 0.7; // jelly thickness

      positions.push(px, py, pz);

      // slightly brighten colors
      const br = Math.pow(r / 255, 0.8);
      const bg = Math.pow(g / 255, 0.8);
      const bb = Math.pow(b / 255, 0.8);
      colors.push(br, bg, bb);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    'position',
    new THREE.Float32BufferAttribute(new Float32Array(positions), 3)
  );
  geometry.setAttribute(
    'color',
    new THREE.Float32BufferAttribute(new Float32Array(colors), 3)
  );

  const material = new THREE.PointsMaterial({
    size: 0.14,
    vertexColors: true,
    depthWrite: false,
    transparent: true,
    opacity: 1.0,
    sizeAttenuation: true,
  });

  const pts = new THREE.Points(geometry, material);
  const original = new Float32Array(positions);

  // slight initial rotation so it’s not perfectly flat
  pts.rotation.x = -0.14;

  return { points: pts, originalPositions: original };
}

// --- animation loop ---
let lastTime = performance.now();

function animate(now) {
  requestAnimationFrame(animate);

  const dt = Math.min((now - lastTime) / 1000, 1 / 30);
  lastTime = now;

  handleCamera(dt);
  handleInteraction(dt);
  renderer.render(scene, camera);
}

// --- camera movement ---
function handleCamera(dt) {
  const rotSpeed = 1.3;
  const zoomSpeed = 13.0;

  if (keyState.has('a')) scene.rotation.y += rotSpeed * dt;
  if (keyState.has('d')) scene.rotation.y -= rotSpeed * dt;

  if (keyState.has('w')) camera.position.z -= zoomSpeed * dt;
  if (keyState.has('s')) camera.position.z += zoomSpeed * dt;

  camera.position.z = THREE.MathUtils.clamp(camera.position.z, 8, 35);
}

// --- deformation & spring physics ---
function handleInteraction(dt) {
  if (!points || !originalPositions || !velocities) return;

  const geom = points.geometry;
  const posAttr = geom.getAttribute('position');
  const pos = posAttr.array;

  // update current hit point if dragging
  if (isDragging) {
    raycaster.setFromCamera(mouse, camera);
    const hits = raycaster.intersectObject(deformPlane);
    if (hits.length > 0) {
      if (!currentHitPoint) currentHitPoint = new THREE.Vector3();
      currentHitPoint.copy(hits[0].point);
    }
  }

  const radiusSq = DEFORM_RADIUS * DEFORM_RADIUS;

  for (let i = 0; i < pos.length; i += 3) {
    const ox = originalPositions[i];
    const oy = originalPositions[i + 1];
    const oz = originalPositions[i + 2];

    let x = pos[i];
    let y = pos[i + 1];
    let z = pos[i + 2];

    let vx = velocities[i];
    let vy = velocities[i + 1];
    let vz = velocities[i + 2];

    // spring force pulling to original
    const dx = ox - x;
    const dy = oy - y;
    const dz = oz - z;

    let fx = SPRING_STIFFNESS * dx - DAMPING * vx;
    let fy = SPRING_STIFFNESS * dy - DAMPING * vy;
    let fz = SPRING_STIFFNESS * dz - DAMPING * vz;

    // squish outward from cursor
    if (isDragging && currentHitPoint) {
      const pdx = x - currentHitPoint.x;
      const pdy = y - currentHitPoint.y;
      const pdz = z - currentHitPoint.z;
      const distSq = pdx * pdx + pdy * pdy + pdz * pdz;

      if (distSq < radiusSq) {
        const dist = Math.sqrt(distSq) + 1e-6;
        const influence = 1.0 - dist / DEFORM_RADIUS;

        const normX = pdx / dist;
        const normY = pdy / dist;
        const normZ = pdz / dist;

        fx += PUSH_STRENGTH * influence * normX;
        fy += PUSH_STRENGTH * influence * normY;
        fz += PUSH_STRENGTH * influence * normZ;
      }
    }

    // integrate
    const ax = fx / MASS;
    const ay = fy / MASS;
    const az = fz / MASS;

    vx += ax * dt;
    vy += ay * dt;
    vz += az * dt;

    x += vx * dt;
    y += vy * dt;
    z += vz * dt;

    velocities[i] = vx;
    velocities[i + 1] = vy;
    velocities[i + 2] = vz;

    pos[i] = x;
    pos[i + 1] = y;
    pos[i + 2] = z;
  }

  posAttr.needsUpdate = true;
}
