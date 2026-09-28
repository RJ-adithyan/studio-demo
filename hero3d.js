import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.min.js';

const clamp = value => Math.min(1, Math.max(0, value));

export function initHero3D() {
  const stage = document.querySelector('#hero3d');
  if (!stage || stage.querySelector('canvas')) return;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'low-power' });
  } catch {
    stage.dataset.state = 'fallback';
    return;
  }
  renderer.setClearColor(0xe9e4dc, 1);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  renderer.domElement.setAttribute('aria-hidden', 'true');
  stage.append(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-10, 10, 8, -8, .1, 100);
  camera.position.set(13, 15, 17);
  camera.lookAt(0, .35, 0);
  scene.add(new THREE.HemisphereLight(0xfffcf5, 0xc1b7a8, 2.3));
  const sun = new THREE.DirectionalLight(0xfff6e9, 2.5);
  sun.position.set(-7, 16, 9);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  Object.assign(sun.shadow.camera, { left: -12, right: 12, top: 12, bottom: -12, near: 1, far: 45 });
  sun.shadow.normalBias = .035;
  sun.shadow.bias = -.0002;
  sun.shadow.radius = 4;
  scene.add(sun);

  const stone = new THREE.MeshStandardMaterial({ color: 0xd2c9bb, roughness: 1 });
  const plaster = new THREE.MeshStandardMaterial({ color: 0xf4efe5, roughness: .96 });
  const floorMaterial = new THREE.MeshStandardMaterial({ color: 0xe0d7c7, roughness: 1 });
  function box(x, y, z, width, height, depth, material) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), material);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    scene.add(mesh);
    return mesh;
  }
  // Solid limestone plinth, a thin floor plate and one quiet ground shadow.
  box(0, -.36, 0, 12.4, .55, 10.4, stone);
  box(0, -.04, 0, 11, .1, 9, floorMaterial);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), new THREE.MeshStandardMaterial({ color: 0xe9e4dc, roughness: 1 }));
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -.65;
  ground.receiveShadow = true;
  scene.add(ground);

  // Door and window gaps remain legible in both the plan and the raised model.
  const segments = [
    [-2, -4, 6, 0], [4, -4, 2, 0],
    [-2.85, 4, 4.3, 0], [2.85, 4, 4.3, 0],
    [-5, 0, 8, Math.PI / 2], [5, 0, 8, Math.PI / 2],
    [0, -2.4, 3.2, Math.PI / 2], [0, 2.3, 3.4, Math.PI / 2],
    [-4.1, 0, 1.8, 0], [-1.1, 0, 2.2, 0], [1, 0, 2, 0], [4, 0, 2, 0],
  ];
  const height = 2.45;
  const walls = segments.map(([x, z, length, rotation]) => {
    const wall = box(x, 0, z, length, height, .18, plaster);
    wall.rotation.y = rotation;
    return wall;
  });
  const points = [];
  for (const [x, z, length, rotation] of segments) {
    const dx = Math.cos(rotation) * length / 2;
    const dz = -Math.sin(rotation) * length / 2;
    points.push(new THREE.Vector3(x - dx, .025, z - dz), new THREE.Vector3(x + dx, .025, z + dz));
  }
  scene.add(new THREE.LineSegments(
    new THREE.BufferGeometry().setFromPoints(points),
    new THREE.LineBasicMaterial({ color: 0x8e8576, transparent: true, opacity: .65 }),
  ));

  let onScreen = false;
  let frame = 0;
  let contextLost = false;
  function draw() {
    frame = 0;
    if (!onScreen || document.hidden || contextLost) return;
    const rect = stage.getBoundingClientRect();
    const progress = reduced.matches ? 1 : clamp((innerHeight * .85 - rect.top) / (rect.height + innerHeight * .15));
    const rise = progress * progress * (3 - 2 * progress);
    walls.forEach(wall => {
      wall.scale.y = Math.max(.008, rise);
      wall.position.y = height * wall.scale.y / 2 + .015;
    });
    renderer.render(scene, camera);
    stage.classList.add('is-live');
    stage.dataset.state = reduced.matches ? 'static' : 'live';
    stage.dataset.progress = rise.toFixed(3);
  }
  function requestDraw() {
    if (!frame && onScreen && !document.hidden && !contextLost) frame = requestAnimationFrame(draw);
  }
  function resize() {
    const { width, height: stageHeight } = stage.getBoundingClientRect();
    if (!width || !stageHeight) return;
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, innerWidth < 900 ? 1.25 : 1.5));
    renderer.setSize(width, stageHeight, false);
    const half = innerWidth < 900 ? 9 : 7.8;
    camera.left = -half * width / stageHeight;
    camera.right = half * width / stageHeight;
    camera.top = half;
    camera.bottom = -half;
    camera.updateProjectionMatrix();
    requestDraw();
  }
  resize();
  new ResizeObserver(resize).observe(stage);
  new IntersectionObserver(([entry]) => {
    onScreen = entry.isIntersecting;
    if (onScreen) requestDraw();
  }).observe(stage);
  addEventListener('scroll', () => { if (!reduced.matches) requestDraw(); }, { passive: true });
  addEventListener('resize', requestDraw, { passive: true });
  reduced.addEventListener('change', requestDraw);
  document.addEventListener('visibilitychange', requestDraw);
  renderer.domElement.addEventListener('webglcontextlost', event => {
    event.preventDefault();
    contextLost = true;
    stage.classList.remove('is-live');
    stage.dataset.state = 'fallback';
  });
  renderer.domElement.addEventListener('webglcontextrestored', () => {
    contextLost = false;
    resize();
    requestDraw();
  });
}

initHero3D();
