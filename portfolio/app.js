const root = document.documentElement;
const body = document.body;
const header = document.querySelector(".site-header");
const progressFill = document.querySelector(".chapter-line i");
const chapterCurrent = document.querySelector(".chapter-current");
const menuButton = document.querySelector(".menu-toggle");
const mobileMenu = document.querySelector(".mobile-menu");
const effectsButton = document.querySelector(".effects-toggle");
const effectsLabel = document.querySelector(".effects-label");
const reduceMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

let scrollProgress = 0;
let lowEffects = reduceMotionQuery.matches;
let activeProject = -1;
let renderRequest = true;

document.querySelector("#year").textContent = String(new Date().getFullYear());

function updateScrollState() {
  const scrollable = Math.max(document.documentElement.scrollHeight - window.innerHeight, 1);
  scrollProgress = Math.min(1, Math.max(0, window.scrollY / scrollable));
  header.classList.toggle("is-scrolled", window.scrollY > 24);
  if (progressFill) progressFill.style.setProperty("--progress", `${scrollProgress * 100}%`);
  renderRequest = true;
}

window.addEventListener("scroll", updateScrollState, { passive: true });
updateScrollState();

const revealObserver = new IntersectionObserver(
  (entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting) entry.target.classList.add("is-visible");
    }
  },
  { threshold: 0.14, rootMargin: "0px 0px -7%" },
);

document.querySelectorAll(".reveal").forEach((element) => revealObserver.observe(element));

const chapterObserver = new IntersectionObserver(
  (entries) => {
    const visible = entries
      .filter((entry) => entry.isIntersecting)
      .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
    if (visible) chapterCurrent.textContent = visible.target.dataset.chapter;
  },
  { threshold: [0.2, 0.45, 0.7], rootMargin: "-25% 0px -35%" },
);

document.querySelectorAll("[data-chapter]").forEach((section) => chapterObserver.observe(section));

function setMenu(open) {
  menuButton.setAttribute("aria-expanded", String(open));
  mobileMenu.setAttribute("aria-hidden", String(!open));
  mobileMenu.classList.toggle("is-open", open);
  body.classList.toggle("menu-open", open);
}

menuButton.addEventListener("click", () => {
  setMenu(menuButton.getAttribute("aria-expanded") !== "true");
});

mobileMenu.querySelectorAll("a").forEach((link) => link.addEventListener("click", () => setMenu(false)));

window.addEventListener("keydown", (event) => {
  if (event.key === "Escape") setMenu(false);
});

function applyEffectsMode(reduced) {
  lowEffects = reduced;
  body.classList.toggle("reduced-effects", lowEffects);
  if (effectsButton) effectsButton.setAttribute("aria-pressed", String(lowEffects));
  if (effectsLabel) effectsLabel.textContent = lowEffects ? "Reduced effects" : "Full effects";
  renderRequest = true;
}

if (effectsButton) effectsButton.addEventListener("click", () => applyEffectsMode(!lowEffects));
if (reduceMotionQuery.addEventListener) {
  reduceMotionQuery.addEventListener("change", (event) => applyEffectsMode(event.matches));
}
applyEffectsMode(lowEffects);

document.querySelectorAll("[data-tilt]").forEach((stage) => {
  const card = stage.querySelector(".portrait-card");
  stage.addEventListener("pointermove", (event) => {
    if (lowEffects || event.pointerType === "touch") return;
    const bounds = stage.getBoundingClientRect();
    const x = (event.clientX - bounds.left) / bounds.width - 0.5;
    const y = (event.clientY - bounds.top) / bounds.height - 0.5;
    card.style.setProperty("--tilt-x", `${x * 8}deg`);
    card.style.setProperty("--tilt-y", `${y * -8}deg`);
  });
  stage.addEventListener("pointerleave", () => {
    card.style.setProperty("--tilt-x", "0deg");
    card.style.setProperty("--tilt-y", "0deg");
  });
});

document.querySelectorAll(".project-card").forEach((card, index) => {
  card.addEventListener("pointerenter", () => { activeProject = index; renderRequest = true; });
  card.addEventListener("pointerleave", () => { activeProject = -1; renderRequest = true; });
});

async function createExperience() {
  const canvas = document.querySelector("#experience");

  try {
    const THREE = await import("https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js");
    const renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: window.devicePixelRatio < 2,
      powerPreference: "high-performance",
    });

    renderer.setPixelRatio(Math.min(window.devicePixelRatio, window.innerWidth < 720 ? 1.2 : 1.65));
    renderer.setSize(window.innerWidth, window.innerHeight, false);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x061014, 0.037);

    const camera = new THREE.PerspectiveCamera(42, window.innerWidth / window.innerHeight, 0.1, 120);
    camera.position.set(-8, 4, 15);

    const world = new THREE.Group();
    scene.add(world);

    const cyan = new THREE.Color(0x73e8ff);
    const lime = new THREE.Color(0xb9ff66);
    const orange = new THREE.Color(0xff8b65);

    scene.add(new THREE.HemisphereLight(0x8deeff, 0x071014, 1.35));
    const keyLight = new THREE.PointLight(0x73e8ff, 28, 32, 2);
    keyLight.position.set(8, 8, 8);
    scene.add(keyLight);
    const signalLight = new THREE.PointLight(0xb9ff66, 18, 24, 2);
    signalLight.position.set(-8, 3, 1);
    scene.add(signalLight);

    const terrainGeometry = new THREE.PlaneGeometry(34, 34, 48, 48);
    const terrainPosition = terrainGeometry.attributes.position;
    for (let i = 0; i < terrainPosition.count; i += 1) {
      const x = terrainPosition.getX(i);
      const y = terrainPosition.getY(i);
      const ridge = Math.sin(x * 0.54) * Math.cos(y * 0.38) * 0.72;
      const detail = Math.sin((x + y) * 1.1) * 0.16;
      const basin = -Math.exp(-(x * x + y * y) * 0.024) * 1.2;
      terrainPosition.setZ(i, ridge + detail + basin);
    }
    terrainGeometry.computeVertexNormals();
    const terrainMaterial = new THREE.MeshBasicMaterial({
      color: 0x267484,
      wireframe: true,
      transparent: true,
      opacity: 0.2,
      depthWrite: false,
    });
    const terrain = new THREE.Mesh(terrainGeometry, terrainMaterial);
    terrain.rotation.x = -Math.PI / 2;
    terrain.position.set(4, -4.5, -7);
    world.add(terrain);

    const solidTerrain = new THREE.Mesh(
      terrainGeometry,
      new THREE.MeshStandardMaterial({
        color: 0x07181c,
        roughness: 0.92,
        metalness: 0.1,
        transparent: true,
        opacity: 0.72,
        side: THREE.DoubleSide,
      }),
    );
    solidTerrain.rotation.copy(terrain.rotation);
    solidTerrain.position.copy(terrain.position);
    solidTerrain.position.y -= 0.05;
    world.add(solidTerrain);

    const particleCount = window.innerWidth < 720 ? 280 : 760;
    const particlePositions = new Float32Array(particleCount * 3);
    const particleScales = new Float32Array(particleCount);
    for (let i = 0; i < particleCount; i += 1) {
      const i3 = i * 3;
      particlePositions[i3] = seeded(i + 2) * 42 - 21;
      particlePositions[i3 + 1] = seeded(i + 17) * 22 - 5;
      particlePositions[i3 + 2] = seeded(i + 67) * 36 - 24;
      particleScales[i] = 0.5 + seeded(i + 101) * 1.5;
    }
    const particleGeometry = new THREE.BufferGeometry();
    particleGeometry.setAttribute("position", new THREE.BufferAttribute(particlePositions, 3));
    particleGeometry.setAttribute("size", new THREE.BufferAttribute(particleScales, 1));
    const particles = new THREE.Points(
      particleGeometry,
      new THREE.PointsMaterial({
        color: 0x73e8ff,
        size: window.innerWidth < 720 ? 0.035 : 0.045,
        transparent: true,
        opacity: 0.68,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    );
    world.add(particles);

    const coreGroup = new THREE.Group();
    coreGroup.position.set(5.7, 0.4, -1.5);
    const core = new THREE.Mesh(
      new THREE.IcosahedronGeometry(2.15, 2),
      new THREE.MeshStandardMaterial({
        color: 0x163f49,
        emissive: 0x0b3f49,
        emissiveIntensity: 0.7,
        metalness: 0.62,
        roughness: 0.2,
        wireframe: true,
      }),
    );
    const coreShell = new THREE.Mesh(
      new THREE.IcosahedronGeometry(1.35, 3),
      new THREE.MeshPhysicalMaterial({
        color: 0x73e8ff,
        emissive: 0x104c57,
        emissiveIntensity: 1.2,
        metalness: 0.15,
        roughness: 0.18,
        transparent: true,
        opacity: 0.36,
      }),
    );
    coreGroup.add(core, coreShell);
    world.add(coreGroup);

    const ringGroup = new THREE.Group();
    coreGroup.add(ringGroup);
    [3.2, 4.1, 5.3].forEach((radius, index) => {
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(radius, 0.012 + index * 0.008, 8, 120),
        new THREE.MeshBasicMaterial({
          color: index === 1 ? lime : cyan,
          transparent: true,
          opacity: 0.25 - index * 0.035,
        }),
      );
      ring.rotation.set(Math.PI * (0.25 + index * 0.17), index * 0.66, 0);
      ringGroup.add(ring);
    });

    const city = new THREE.Group();
    city.position.set(-1, -4.1, -4);
    const boxGeometry = new THREE.BoxGeometry(0.52, 1, 0.52);
    const cityMaterial = new THREE.MeshStandardMaterial({
      color: 0x12323a,
      emissive: 0x09252b,
      emissiveIntensity: 0.5,
      roughness: 0.75,
      metalness: 0.2,
    });
    const cityMesh = new THREE.InstancedMesh(boxGeometry, cityMaterial, 90);
    const dummy = new THREE.Object3D();
    for (let i = 0; i < 90; i += 1) {
      const x = (i % 10) - 4.5;
      const z = Math.floor(i / 10) - 4;
      const height = 0.35 + seeded(i + 33) * 2.7;
      dummy.position.set(x * 0.86, height * 0.5, z * 0.86);
      dummy.scale.set(0.58 + seeded(i + 80) * 0.28, height, 0.58 + seeded(i + 91) * 0.28);
      dummy.rotation.y = seeded(i + 42) * 0.16;
      dummy.updateMatrix();
      cityMesh.setMatrixAt(i, dummy.matrix);
      cityMesh.setColorAt(i, new THREE.Color().lerpColors(new THREE.Color(0x163b43), i % 13 === 0 ? orange : cyan, i % 13 === 0 ? 0.55 : 0.08));
    }
    city.add(cityMesh);
    world.add(city);

    const flowGroup = new THREE.Group();
    const flowPoints = [
      new THREE.Vector3(-12, -2.4, 2),
      new THREE.Vector3(-7, -1.6, -2),
      new THREE.Vector3(-1, -2.8, 1),
      new THREE.Vector3(5, -1.4, -3),
      new THREE.Vector3(12, -2.2, 1),
    ];
    for (let i = 0; i < 5; i += 1) {
      const offset = (i - 2) * 0.65;
      const curve = new THREE.CatmullRomCurve3(flowPoints.map((point, pointIndex) => (
        point.clone().add(new THREE.Vector3(0, Math.sin(pointIndex + i) * 0.3, offset))
      )));
      const tube = new THREE.Mesh(
        new THREE.TubeGeometry(curve, 90, 0.018 + i * 0.004, 5, false),
        new THREE.MeshBasicMaterial({
          color: i === 2 ? lime : cyan,
          transparent: true,
          opacity: i === 2 ? 0.7 : 0.25,
          blending: THREE.AdditiveBlending,
        }),
      );
      flowGroup.add(tube);
    }
    flowGroup.position.y = -0.4;
    world.add(flowGroup);

    const halo = new THREE.Mesh(
      new THREE.TorusKnotGeometry(8.5, 0.018, 220, 8, 2, 5),
      new THREE.MeshBasicMaterial({ color: 0x73e8ff, transparent: true, opacity: 0.12 }),
    );
    halo.position.set(0, 1, -8);
    halo.rotation.x = 0.8;
    world.add(halo);

    const cameraPositions = [
      new THREE.Vector3(-8.5, 3.8, 15.5),
      new THREE.Vector3(1, 5.7, 15),
      new THREE.Vector3(10, 4.4, 13),
      new THREE.Vector3(-10, 5.8, 12),
      new THREE.Vector3(0, 8.5, 17),
    ];
    const cameraTargets = [
      new THREE.Vector3(3, -0.2, -2),
      new THREE.Vector3(0, -1.5, -4),
      new THREE.Vector3(-2, -1.5, -4),
      new THREE.Vector3(1, -0.4, -3),
      new THREE.Vector3(0, 0, -7),
    ];
    const target = new THREE.Vector3();
    const desiredPosition = new THREE.Vector3();
    const pointer = new THREE.Vector2();

    window.addEventListener("pointermove", (event) => {
      pointer.x = (event.clientX / window.innerWidth - 0.5) * 2;
      pointer.y = (event.clientY / window.innerHeight - 0.5) * 2;
      renderRequest = true;
    }, { passive: true });

    function frame(time) {
      requestAnimationFrame(frame);
      if (lowEffects && !renderRequest) return;
      renderRequest = false;

      const seconds = time * 0.001;
      const scaled = scrollProgress * (cameraPositions.length - 1);
      const from = Math.min(cameraPositions.length - 2, Math.floor(scaled));
      const mix = smoothstep(scaled - from);
      desiredPosition.lerpVectors(cameraPositions[from], cameraPositions[from + 1], mix);
      target.lerpVectors(cameraTargets[from], cameraTargets[from + 1], mix);

      if (!lowEffects) {
        desiredPosition.x += pointer.x * 0.28;
        desiredPosition.y -= pointer.y * 0.18;
        coreGroup.rotation.x = seconds * 0.12 + scrollProgress * 1.4;
        coreGroup.rotation.y = seconds * 0.18 + scrollProgress * Math.PI * 2;
        ringGroup.rotation.z = seconds * 0.08;
        particles.rotation.y = seconds * 0.012;
        halo.rotation.z = seconds * 0.025;
      } else {
        coreGroup.rotation.y = scrollProgress * Math.PI;
      }

      camera.position.lerp(desiredPosition, lowEffects ? 1 : 0.055);
      camera.lookAt(target);

      terrain.position.y = -4.5 + Math.sin(scrollProgress * Math.PI) * 1.1;
      solidTerrain.position.y = terrain.position.y - 0.05;
      city.rotation.y = -0.28 + scrollProgress * 0.7;
      city.position.y = -4.1 + Math.max(0, Math.sin((scrollProgress - 0.25) * Math.PI * 1.5)) * 1.2;
      flowGroup.position.y = -0.4 + Math.sin(scrollProgress * Math.PI * 3) * 0.25;
      flowGroup.scale.setScalar(0.8 + scrollProgress * 0.4);

      const highlight = activeProject >= 0 ? 1 : 0;
      keyLight.color.copy(cyan).lerp(activeProject === 1 ? lime : activeProject === 2 ? orange : cyan, highlight * 0.65);
      keyLight.intensity = 25 + highlight * 18;
      cityMaterial.emissiveIntensity = 0.5 + (activeProject === 1 ? 0.8 : 0);

      renderer.render(scene, camera);
    }

    requestAnimationFrame(frame);

    window.addEventListener("resize", () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, window.innerWidth < 720 ? 1.2 : 1.65));
      renderer.setSize(window.innerWidth, window.innerHeight, false);
      renderRequest = true;
    });

    canvas.addEventListener("webglcontextlost", (event) => {
      event.preventDefault();
      body.classList.add("no-webgl");
    });
  } catch (error) {
    body.classList.add("no-webgl");
    console.warn("The 3D enhancement could not start; the HTML portfolio remains available.", error);
  }
}

function seeded(value) {
  const x = Math.sin(value * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

function smoothstep(value) {
  const x = Math.min(1, Math.max(0, value));
  return x * x * (3 - 2 * x);
}

createExperience();
