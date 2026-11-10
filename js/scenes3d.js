/*
 * VitalCheer real-time 3D scenes (Three.js).
 *  - Hero: the VitalCheer device (models/vitalcheer-device.glb) with a
 *    drag-to-rotate (it also turns gently as the hero scrolls).
 *  - Clinical challenge: a gravity IV set (models/iv-set.glb) whose camera
 *    travels to the part that matches the active challenge.
 * Models are built in Blender by tools/3d/*.py and compressed by tools/build-models.mjs.
 *
 * Bundled with esbuild into js/scenes3d.bundle.js (a plain script), so it also
 * runs when index.html is opened straight from disk:  npm run build
 */
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { MeshoptDecoder } from "three/addons/libs/meshopt_decoder.module.js";

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const loader = new GLTFLoader();
loader.setMeshoptDecoder(MeshoptDecoder);

const MODEL_VERSION = "5";
const fromDisk = location.protocol === "file:";
let embeddedModels = null;

/** Browsers block fetching files from file:// pages, so read the embedded copies instead. */
function loadEmbeddedModels() {
    if (!embeddedModels) {
        embeddedModels = new Promise((resolve, reject) => {
            if (window.__VC_MODELS) return resolve(window.__VC_MODELS);
            const tag = document.createElement("script");
            tag.src = "js/models-data.js";
            tag.onload = () => resolve(window.__VC_MODELS);
            tag.onerror = reject;
            document.head.append(tag);
        });
    }
    return embeddedModels;
}

async function loadModel(name) {
    if (!fromDisk) return loader.loadAsync(`models/${name}.glb?v=${MODEL_VERSION}`);
    const data = await loadEmbeddedModels();
    const bin = Uint8Array.from(atob(data[name]), (c) => c.charCodeAt(0));
    return loader.parseAsync(bin.buffer, "");
}

const hasWebGL = (() => {
    try {
        const c = document.createElement("canvas");
        return !!(c.getContext("webgl2") || c.getContext("webgl"));
    } catch {
        return false;
    }
})();

const clamp01 = (v) => Math.min(1, Math.max(0, v));
const damp = (current, target, lambda, dt) =>
    current + (target - current) * (1 - Math.exp(-lambda * dt));

function makeRenderer(host, maxPixelRatio = 1.75) {
    const renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        powerPreference: "high-performance",
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, maxPixelRatio));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.setClearColor(0x000000, 0);
    renderer.domElement.className = "scene3d-canvas";
    renderer.domElement.setAttribute("aria-hidden", "true");
    return renderer;
}

function studioEnvironment(renderer) {
    const pmrem = new THREE.PMREMGenerator(renderer);
    const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();
    return env;
}

function fitRenderer(host, renderer, camera) {
    const resize = () => {
        const w = Math.max(1, host.clientWidth);
        const h = Math.max(1, host.clientHeight);
        renderer.setSize(w, h, false);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
    };
    new ResizeObserver(resize).observe(host);
    resize();
}

/** Run `frame(dt, time)` only while `el` is on screen and the tab is visible. */
function loopWhileVisible(el, frame) {
    let raf = 0;
    let onScreen = false;
    let last = 0;
    const tick = (now) => {
        raf = requestAnimationFrame(tick);
        const dt = Math.min(0.05, (now - last) / 1000 || 0.016);
        last = now;
        frame(dt, now / 1000);
    };
    const sync = () => {
        const run = onScreen && !document.hidden;
        if (run && !raf) {
            last = performance.now();
            raf = requestAnimationFrame(tick);
        } else if (!run && raf) {
            cancelAnimationFrame(raf);
            raf = 0;
        }
    };
    new IntersectionObserver(([entry]) => {
        onScreen = entry.isIntersecting;
        sync();
    }, { rootMargin: "120px" }).observe(el);
    document.addEventListener("visibilitychange", sync);
}

/** Printed decals (logo, labels...) need alpha and should never z-fight. */
const DECALS = new Set(["Badge", "Cross", "Label", "PowerIcon", "BagPrint"]);

function prepareDecals(root) {
    root.traverse((o) => {
        if (!o.isMesh) return;
        const m = o.material;
        if (m && DECALS.has(m.name)) {
            m.transparent = true;
            m.alphaTest = 0.04;
            m.depthWrite = false;
            m.polygonOffset = true;
            m.polygonOffsetFactor = -2;
            m.polygonOffsetUnits = -2;
            o.renderOrder = 3;
        }
    });
}

/* ======================================================================
   HERO — VitalCheer device
   ====================================================================== */
async function initHeroDevice() {
    const host = document.querySelector("[data-device-3d]");
    if (!host) return;

    const renderer = makeRenderer(host);
    const scene = new THREE.Scene();
    scene.environment = studioEnvironment(renderer);
    scene.environmentIntensity = 0.95;

    const camera = new THREE.PerspectiveCamera(24, 1, 0.1, 60);
    // camera framing is computed from the model so it never leaves the canvas
    const target = new THREE.Vector3(0, 0.6, 0);
    const viewDir = new THREE.Vector3(1.6, 1.25, 5.9).normalize();
    let fitRadius = 1.4;

    const key = new THREE.DirectionalLight(0xffffff, 1.6);
    key.position.set(-2.5, 5.5, 4);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.radius = 8;
    key.shadow.bias = -0.0004;
    Object.assign(key.shadow.camera, { left: -3, right: 3, top: 3, bottom: -3, near: 0.5, far: 15 });
    scene.add(key);
    const rim = new THREE.DirectionalLight(0xcdebf6, 0.9);
    rim.position.set(3, 3, -4);
    scene.add(rim);

    const floor = new THREE.Mesh(
        new THREE.PlaneGeometry(14, 14),
        new THREE.ShadowMaterial({ opacity: 0.13 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    const gltf = await loadModel("vitalcheer-device");
    const model = gltf.scene;
    prepareDecals(model);
    model.traverse((o) => {
        if (o.isMesh) {
            o.castShadow = true;
            o.receiveShadow = true;
        }
    });

    const pivot = new THREE.Group();
    pivot.add(model);
    scene.add(pivot);

    // Turn around the whole product's centre (device + cable + sensor) and
    // measure the space it sweeps while rotating, so framing can contain it.
    {
        const box = new THREE.Box3().setFromObject(model);
        const c = box.getCenter(new THREE.Vector3());
        model.position.x -= c.x;
        model.position.z -= c.z;
        model.updateMatrixWorld(true);
        let sweep = 0;
        let yMin = Infinity;
        let yMax = -Infinity;
        const v = new THREE.Vector3();
        model.traverse((o) => {
            if (!o.isMesh) return;
            const pos = o.geometry.attributes.position;
            const step = Math.max(1, Math.floor(pos.count / 4000));
            for (let i = 0; i < pos.count; i += step) {
                v.fromBufferAttribute(pos, i).applyMatrix4(o.matrixWorld);
                sweep = Math.max(sweep, Math.hypot(v.x, v.z));
                yMin = Math.min(yMin, v.y);
                yMax = Math.max(yMax, v.y);
            }
        });
        target.set(0, (yMin + yMax) / 2, 0);
        fitRadius = Math.hypot(sweep, (yMax - yMin) / 2);
    }

    // Neon-blue light bar: fills its recess, glows from within (no halo).
    // toneMapped:false keeps the blue saturated instead of washing to white.
    const ledMaterial = new THREE.MeshStandardMaterial({
        name: "LED",
        color: 0x1f6bff,
        emissive: 0x2a78ff,
        emissiveIntensity: 1.3,
        roughness: 0.3,
        toneMapped: false,
    });
    model.traverse((o) => {
        if (o.isMesh && o.material && o.material.name === "LED") o.material = ledMaterial;
    });

    const parts = {};
    for (const name of ["Lid", "DoorPivot", "Clamp", "Mechanism", "Sensor", "BackPanel"]) {
        const node = model.getObjectByName(name);
        if (node) parts[name] = { node, pos: node.position.clone(), rot: node.rotation.clone() };
    }

    fitRenderer(host, renderer, camera);
    // compile every shader up front so the first frames (and scrolling back) never stutter
    await renderer.compileAsync(scene, camera);
    host.appendChild(renderer.domElement);
    host.closest(".product-stage")?.classList.add("has-3d");
    requestAnimationFrame(() => renderer.domElement.classList.add("is-ready"));

    // ---- interaction: drag to turn (horizontal); the device never opens up
    let drag = 0;
    let dragVelocity = 0;
    let dragging = false;
    let lastX = 0;
    const canvas = renderer.domElement;
    canvas.addEventListener("pointerdown", (e) => {
        if (e.pointerType === "mouse") e.preventDefault(); // no text selection while dragging
        dragging = true;
        lastX = e.clientX;
        canvas.setPointerCapture(e.pointerId);
        host.classList.add("is-dragging");
    });
    canvas.addEventListener("pointermove", (e) => {
        if (!dragging) return;
        const dx = (e.clientX - lastX) / Math.max(200, host.clientWidth);
        lastX = e.clientX;
        drag += dx * 4;
        dragVelocity = dx * 4 * 60;
    });
    const endDrag = () => {
        dragging = false;
        host.classList.remove("is-dragging");
    };
    canvas.addEventListener("pointerup", endDrag);
    canvas.addEventListener("pointercancel", endDrag);

    const hero = document.querySelector(".hero");
    let intro = 0;
    let turn = 0;

    loopWhileVisible(host, (dt, t) => {
        const still = reduceMotion.matches;
        intro = still ? 1 : damp(intro, 1, 2.2, dt);

        const rect = hero.getBoundingClientRect();
        const scrollP = clamp01(-rect.top / (rect.height * 0.75));
        turn = still ? scrollP : damp(turn, scrollP, 4, dt);

        if (!dragging) {
            drag += dragVelocity * dt;
            dragVelocity = damp(dragVelocity, 0, 3, dt);
        }

        // slow "breathing" light, like a status LED
        ledMaterial.emissiveIntensity = still ? 1.3 : 1.05 + 0.4 * (0.5 + 0.5 * Math.sin(t * 1.7));

        pose(0, -0.12 + turn * 1.45 + drag + (1 - intro) * -0.6,
            (still ? 0 : Math.sin(t * 0.9) * 0.018) + (1 - intro) * -0.25, 0.9 + 0.1 * intro);
        renderer.render(scene, camera);
    });

    function pose(e, yaw, lift = 0, scale = 1) {
        pivot.rotation.y = yaw;
        pivot.position.y = lift;
        pivot.scale.setScalar(scale);

        // Exploded view, like a product teardown
        if (parts.Lid) parts.Lid.node.position.y = parts.Lid.pos.y + e * 0.34;
        if (parts.DoorPivot) parts.DoorPivot.node.rotation.y = parts.DoorPivot.rot.y + e * 0.75;
        if (parts.Mechanism) parts.Mechanism.node.position.x = parts.Mechanism.pos.x + e * 0.2;
        if (parts.Clamp) parts.Clamp.node.position.z = parts.Clamp.pos.z - e * 0.42;
        if (parts.BackPanel) parts.BackPanel.node.position.z = parts.BackPanel.pos.z - e * 0.06;

        // fit the swept volume inside the tighter of the two view angles
        const vHalf = THREE.MathUtils.degToRad(camera.fov / 2);
        const hHalf = Math.atan(Math.tan(vHalf) * camera.aspect);
        // 0.9: the swept sphere is conservative; the canvas edge feather covers the rest
        const dist = (fitRadius * 0.9) / Math.sin(Math.min(vHalf, hHalf));
        camera.position.copy(target).addScaledVector(viewDir, dist);
        camera.lookAt(target);
    }

    if (new URLSearchParams(location.search).has("debug3d")) {
        window.__hero = { scene, camera, renderer, pose };
    }
}

/* ======================================================================
   CLINICAL CHALLENGE — gravity IV set
   ====================================================================== */
const IV_MATERIALS = {
    BagPVC: { transparent: true, opacity: 0.2, roughness: 0.16, clearcoat: 1, clearcoatRoughness: 0.12, depthWrite: false, side: THREE.DoubleSide },
    BagSeal: { transparent: true, opacity: 0.42, roughness: 0.38, depthWrite: false },
    Fluid: { transmission: 1, thickness: 0.6, roughness: 0.03, ior: 1.33, color: 0xeefcfa, attenuationColor: new THREE.Color("#9fd8ee"), attenuationDistance: 2.2 },
    ChamberClear: { transparent: true, opacity: 0.18, roughness: 0.04, clearcoat: 1, depthWrite: false, side: THREE.DoubleSide },
    TubePVC: { transparent: true, opacity: 0.26, roughness: 0.08, clearcoat: 1, depthWrite: false },
    ClampHousing: { transparent: true, opacity: 0.9, roughness: 0.3, clearcoat: 0.6 },
    CannulaHub: { transparent: true, opacity: 0.88, roughness: 0.22, clearcoat: 1 },
    Dressing: { transparent: true, opacity: 0.3, roughness: 0.32, clearcoat: 0.6, depthWrite: false },
    Skin: { roughness: 0.62, sheen: 0.5, sheenRoughness: 0.55, sheenColor: new THREE.Color("#f2c3a8") },
    Blanket: { roughness: 0.95, sheen: 1, sheenRoughness: 0.75, sheenColor: new THREE.Color("#e9fffb") },
    Sheet: { roughness: 0.95, sheen: 0.6, sheenRoughness: 0.8, sheenColor: new THREE.Color("#ffffff") },
};

function retuneMaterials(root) {
    const cache = new Map();
    root.traverse((o) => {
        if (!o.isMesh || !o.material) return;
        const base = o.material;
        const spec = IV_MATERIALS[base.name];
        if (!spec) return;
        if (!cache.has(base)) {
            const m = new THREE.MeshPhysicalMaterial({
                name: base.name,
                color: base.color,
                map: base.map,
                roughness: base.roughness,
                metalness: base.metalness,
            });
            Object.assign(m, spec);
            if (spec.color !== undefined) m.color = new THREE.Color(spec.color);
            cache.set(base, m);
        }
        o.material = cache.get(base);
        if (spec.transparent) o.renderOrder = 2;
    });
}

// Camera framing for each stage (three.js Y-up coordinates).
const SHOTS = {
    0: { pos: [2.6, 5.0, 20.5], look: [0.7, 3.5, 0.1] },
    1: { pos: [2.1, 3.2, 5.4], look: [-0.3, 2.3, 0] },
    2: { pos: [-2.4, 5.3, 5.0], look: [-0.3, 4.35, 0] },
    3: { pos: [0.6, 5.2, 5.6], look: [2.45, 4.5, -0.1] },
    4: { pos: [7.5, 7.8, 21], look: [0.4, 2.8, -3.5] },
    5: { pos: [-0.4, 0.4, 5.6], look: [1.15, -1.35, 0.6] },
    6: { pos: [6.2, 3.8, 6.6], look: [2.7, 2.3, -0.15] },
};

async function initIVScene() {
    const section = document.querySelector(".cc");
    const host = section?.querySelector(".cc-visual");
    if (!host) return;

    // glass + fluid materials are heavy, so this scene renders at a lower pixel ratio
    const renderer = makeRenderer(host, 1.25);
    const scene = new THREE.Scene();
    scene.environment = studioEnvironment(renderer);
    scene.environmentIntensity = 0.42;
    scene.fog = new THREE.Fog(0x051a4d, 16, 40);

    const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 120);
    const camPos = new THREE.Vector3(...SHOTS[0].pos);
    const camLook = new THREE.Vector3(...SHOTS[0].look);

    // Cinematic lighting: soft key, cool blue rim, low fill
    const keyLight = new THREE.SpotLight(0xfff8f0, 260, 40, 0.6, 0.6, 1.6);
    keyLight.position.set(-5, 12, 9);
    keyLight.target.position.set(0.5, 2, 0);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.set(1024, 1024);
    keyLight.shadow.bias = -0.0006;
    keyLight.shadow.radius = 6;
    scene.add(keyLight, keyLight.target);
    const rimLight = new THREE.DirectionalLight(0x6fcff0, 2.2);
    rimLight.position.set(4, 7, -7);
    scene.add(rimLight);
    scene.add(new THREE.HemisphereLight(0xd9f6f2, 0x03201e, 0.45));

    const gltf = await loadModel("iv-set");
    const root = gltf.scene;
    retuneMaterials(root);
    prepareDecals(root);
    root.traverse((o) => {
        if (o.isMesh) {
            const mat = o.material;
            const clear = mat && mat.transparent && mat.opacity < 0.5;
            o.castShadow = !clear;
            o.receiveShadow = true;
        }
    });
    scene.add(root);

    // Other beds on the ward (challenge 04): dimmed copies in the fog
    const wardCopies = [];
    const base = root.clone(true);
    for (const n of ["Patient", "Clipboard", "Pump"]) base.getObjectByName(n)?.removeFromParent();
    for (const [x, z, ry] of [[-6.5, -6, 0.3], [8, -7.5, -0.4], [-1.5, -13, 0.1], [12, -15, -0.2]]) {
        const copy = base.clone(true);
        copy.position.set(x, 0, z);
        copy.rotation.y = ry;
        scene.add(copy);
        wardCopies.push(copy);
    }

    const byName = (n) => root.getObjectByName(n);
    const drop = byName("Drop");
    const dropY0 = drop ? drop.position.y : 0;
    // compressed models keep each mesh's real size in its node scale, so animate relative to it
    const dropScale0 = drop ? drop.scale.clone() : null;
    const wheel = byName("ClampWheelPivot");
    const pump = byName("Pump");
    const cannula = byName("Cannula");

    // Highlight materials per stage (cloned so the glow stays local)
    const STAGE_NODES = { 1: "RollerClamp", 2: "DripChamber", 3: "Clipboard", 5: "Cannula", 6: "Pump" };
    const glowSets = {};
    for (const [stage, name] of Object.entries(STAGE_NODES)) {
        const node = byName(name);
        if (!node) continue;
        glowSets[stage] = [];
        node.traverse((o) => {
            if (o.isMesh && o.material) {
                o.material = o.material.clone();
                if (!o.material.emissive || o.material.emissiveMap) return;
                o.material.emissive.set("#d83995");
                o.material.emissiveIntensity = 0;
                glowSets[stage].push(o.material);
            }
        });
    }
    const accent = new THREE.Color("#d83995");

    // Pump only appears for challenge 06
    const pumpMaterials = [];
    pump?.traverse((o) => {
        if (o.isMesh) {
            o.material.transparent = true;
            pumpMaterials.push(o.material);
        }
    });

    // Pulse ring around the cannula site (challenge 05)
    const ring = new THREE.Mesh(
        new THREE.RingGeometry(0.16, 0.2, 64),
        new THREE.MeshBasicMaterial({ color: 0xd83995, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide })
    );
    ring.rotation.x = -Math.PI / 2;
    if (cannula) {
        cannula.getWorldPosition(ring.position);
        ring.position.y += 0.08;
        ring.position.x += 0.15;
    }
    scene.add(ring);

    fitRenderer(host, renderer, camera);
    await renderer.compileAsync(scene, camera);
    host.prepend(renderer.domElement);
    section.classList.add("has-3d");
    requestAnimationFrame(() => renderer.domElement.classList.add("is-ready"));
    if (new URLSearchParams(location.search).has("debug3d")) {
        window.__iv = { THREE, scene, camera, renderer, root };
    }

    // ---- hotspots follow their 3D parts
    const anchors = {
        1: byName("RollerClamp"),
        2: byName("DripChamber"),
        3: byName("Clipboard"),
        4: wardCopies[0]?.getObjectByName("Bag"),
        5: cannula,
        6: pump,
    };
    const hotspots = [...section.querySelectorAll(".cc-hot")];
    const tmp = new THREE.Vector3();
    const placeHotspots = () => {
        for (const btn of hotspots) {
            const anchor = anchors[btn.dataset.ccGo];
            if (!anchor) continue;
            anchor.getWorldPosition(tmp);
            if (btn.dataset.ccGo === "4") tmp.y += 1.2;
            tmp.project(camera);
            const inView = tmp.z < 1 && Math.abs(tmp.x) < 0.92 && Math.abs(tmp.y) < 0.86;
            btn.style.setProperty("--x", `${((tmp.x + 1) / 2) * 100}%`);
            btn.style.setProperty("--y", `${((1 - tmp.y) / 2) * 100}%`);
            btn.classList.toggle("is-offscreen", !inView);
        }
    };

    let pointerX = 0;
    let pointerY = 0;
    host.addEventListener("pointermove", (e) => {
        if (e.pointerType !== "mouse") return;
        const r = host.getBoundingClientRect();
        pointerX = (e.clientX - r.left) / r.width - 0.5;
        pointerY = (e.clientY - r.top) / r.height - 0.5;
    });
    host.addEventListener("pointerleave", () => {
        pointerX = pointerY = 0;
    });

    let pumpOpacity = 0;
    const targetPos = new THREE.Vector3();
    const targetLook = new THREE.Vector3();

    loopWhileVisible(host, (dt, t) => {
        const still = reduceMotion.matches;
        const stage = Number(section.dataset.stage) || 0;
        const shot = SHOTS[stage] || SHOTS[0];

        targetPos.set(...shot.pos);
        targetLook.set(...shot.look);
        if (!still) {
            targetPos.x += pointerX * 0.6;
            targetPos.y -= pointerY * 0.4;
            targetPos.x += Math.sin(t * 0.25) * 0.15;
        }
        const k = still ? 1 : 1 - Math.exp(-2.4 * dt);
        camPos.lerp(targetPos, k);
        camLook.lerp(targetLook, k);
        camera.position.copy(camPos);
        camera.lookAt(camLook);

        // drip
        if (drop) {
            const period = stage === 2 ? 0.75 : 1.5;
            const phase = still ? 0.5 : (t % period) / period;
            drop.position.y = dropY0 - 0.55 * phase * phase;
            drop.scale.copy(dropScale0).multiplyScalar(phase > 0.92 ? 1 - (phase - 0.92) * 10 : 1);
        }
        // roller clamp wheel drift (challenge 01)
        if (wheel) {
            const target = stage === 1 && !still ? Math.sin(t * 1.3) * 0.7 : 0;
            wheel.rotation.x = damp(wheel.rotation.x, target, 4, dt);
        }
        // highlight the active part
        const pulse = 0.5 + 0.5 * Math.sin(t * 3);
        for (const [s, mats] of Object.entries(glowSets)) {
            const on = Number(s) === stage;
            for (const m of mats) {
                m.emissive.copy(accent);
                m.emissiveIntensity = damp(m.emissiveIntensity ?? 0, on ? 0.12 + 0.14 * (still ? 0.5 : pulse) : 0, 5, dt);
            }
        }
        // pump fades in for challenge 06
        pumpOpacity = damp(pumpOpacity, stage === 6 ? 1 : 0, 4, dt);
        if (pump) pump.visible = pumpOpacity > 0.01;
        for (const m of pumpMaterials) m.opacity = pumpOpacity;
        // cannula site pulse (challenge 05)
        if (stage === 5) {
            const p = still ? 0.4 : (t % 1.8) / 1.8;
            ring.scale.setScalar(1 + p * 2.2);
            ring.material.opacity = 0.75 * (1 - p);
        } else {
            ring.material.opacity = damp(ring.material.opacity, 0, 6, dt);
        }

        placeHotspots();
        renderer.render(scene, camera);
    });
}

if (hasWebGL) {
    // Hero first (it is on screen), then the IV scene: straight away if the reader
    // is already near it (e.g. reloaded mid-page), otherwise once the hero is ready.
    const hero = initHeroDevice().catch((err) => console.warn("3D device unavailable:", err));
    const ivSection = document.querySelector(".cc");
    let ivStarted = false;
    const startIV = () => {
        if (ivStarted) return;
        ivStarted = true;
        initIVScene().catch((err) => console.warn("3D IV scene unavailable:", err));
    };
    if (ivSection) {
        const near = new IntersectionObserver(([entry]) => {
            if (entry.isIntersecting) {
                near.disconnect();
                startIV();
            }
        }, { rootMargin: "1200px 0px" });
        near.observe(ivSection);
    }
    hero.then(() => {
        const idle = window.requestIdleCallback || ((fn) => setTimeout(fn, 300));
        idle(startIV);
    });
}
