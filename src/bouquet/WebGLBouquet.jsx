import React, { useEffect, useRef } from "react";
import * as THREE from "three";
import { buildScene, LIGHT_DIR } from "./engine";

/**
 * True 3D WebGL / Three.js Renderer for the Bouquet
 * Uses the exact scene coordinates and palettes from buildScene(settings)
 * with 3D shaded petals, stems, paper wrapper, ribbon, baby's breath, sparkles, and hearts.
 */
export default function WebGLBouquet({
  settings,
  cameraOffset,
  onPointerHandlers,
  bgColor,
  webglCanvasRef,
}) {
  const mountRef = useRef(null);
  const msgRef = useRef(null);

  // Live settings so motion tweaks don't rebuild the whole 3D scene
  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  // Only rebuild geometry when something structural or chromatic changes
  const structureKey = JSON.stringify([
    settings.seed,
    settings.flowerHeads,
    settings.leafCount,
    settings.babiesCount,
    settings.sparklesCount,
    settings.tulipCount,
    settings.petalMultiplier,
    settings.flowerSizeMin,
    settings.flowerSizeMax,
    settings.heartCount,
    settings.theme,
    settings.palettes,
  ]);

  useEffect(() => {
    const live = () => settingsRef.current;
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || 360;
    const height = container.clientHeight || 460;

    const scene3d = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(34, width / height, 0.1, 100);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      preserveDrawingBuffer: true,
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    container.innerHTML = "";
    container.appendChild(renderer.domElement);
    if (webglCanvasRef) webglCanvasRef.current = renderer.domElement;

    // Lighting matching LIGHT_DIR = (-0.45, 0.6, 0.66)
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.65);
    scene3d.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.35);
    dirLight.position.set(LIGHT_DIR[0] * 5, LIGHT_DIR[1] * 5, LIGHT_DIR[2] * 5);
    scene3d.add(dirLight);

    const rimLight = new THREE.DirectionalLight(0x88ccff, 0.55);
    rimLight.position.set(2, -1, -3);
    scene3d.add(rimLight);

    // Pivot group at PIVOT_Y = 0.2
    const rootGroup = new THREE.Group();
    scene3d.add(rootGroup);

    const bouquetGroup = new THREE.Group();
    bouquetGroup.position.y = -0.2; // Shift by -PIVOT_Y so rotation pivots around y=0.2
    rootGroup.add(bouquetGroup);

    const data = buildScene(live());

    // Solid structure so the 3D version reads as a real wrapped bouquet:
    // paper cone, ribbon band, and a stem per flower head.
    const PAPER_HEX = live().palettes?.PAPER?.[4] || "#6fa8e8";
    const RIBBON_HEX = live().palettes?.RIBBON?.[2] || "#7ec8e3";
    const STEM_HEX = live().palettes?.GREENS?.[6] || "#3a7d54";

    // Wrapper: narrow at the bottom (r0 = 0.06) opening to r1 = 0.36 at the top
    const paperGeo = new THREE.CylinderGeometry(0.36, 0.065, 0.52, 64, 1, true);
    const paperMesh = new THREE.Mesh(
      paperGeo,
      new THREE.MeshStandardMaterial({
        color: PAPER_HEX,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.26,
        roughness: 0.9,
        metalness: 0.05,
        depthWrite: false,
      })
    );
    paperMesh.position.y = 0.05;
    bouquetGroup.add(paperMesh);

    const ribbonRadius = 0.092;
    const ribbonMesh = new THREE.Mesh(
      new THREE.TorusGeometry(ribbonRadius, 0.011, 10, 64),
      new THREE.MeshStandardMaterial({
        color: RIBBON_HEX,
        roughness: 0.35,
        metalness: 0.35,
      })
    );
    ribbonMesh.rotation.x = Math.PI / 2;
    ribbonMesh.position.y = -0.12;
    bouquetGroup.add(ribbonMesh);

    // One slim cylinder from the neck to every flower head
    const stemMat = new THREE.MeshStandardMaterial({
      color: STEM_HEX,
      roughness: 0.7,
    });
    const neckVec = new THREE.Vector3(0, -0.12, 0);
    for (let i = 0; i < data.flowers.length; i++) {
      const fl = data.flowers[i];
      const tip = new THREE.Vector3(fl.pos[0], fl.pos[1], fl.pos[2]);
      const dir = tip.clone().sub(neckVec);
      const len = dir.length();
      if (len < 0.001) continue;
      const stem = new THREE.Mesh(
        new THREE.CylinderGeometry(0.006, 0.008, len, 6, 1, true),
        stemMat
      );
      stem.position.copy(neckVec).add(dir.clone().multiplyScalar(0.5));
      stem.quaternion.setFromUnitVectors(
        new THREE.Vector3(0, 1, 0),
        dir.clone().normalize()
      );
      bouquetGroup.add(stem);
    }

    // 1. Render dense point cloud for wrapper, stems, leaves, and ribbon using shaded 3D spheres/points
    const posArr = [];
    const colArr = [];
    const colorObj = new THREE.Color();

    for (let i = 0; i < data.pts.length; i++) {
      const pt = data.pts[i];
      posArr.push(pt.x, pt.y, pt.z);
      const midIdx = Math.min(
        pt.pal.length - 1,
        Math.max(0, Math.floor((0.68 + pt.tone * 0.5) * pt.pal.length))
      );
      colorObj.set(pt.pal[midIdx] || "#38bdf8");
      colArr.push(colorObj.r, colorObj.g, colorObj.b);
    }

    const ptGeo = new THREE.BufferGeometry();
    ptGeo.setAttribute("position", new THREE.Float32BufferAttribute(posArr, 3));
    ptGeo.setAttribute("color", new THREE.Float32BufferAttribute(colArr, 3));

    const ptMat = new THREE.PointsMaterial({
      size: 0.018,
      vertexColors: true,
      transparent: true,
      opacity: live().theme === "tide" ? 0.75 : 0.85,
    });
    const pointCloud = new THREE.Points(ptGeo, ptMat);
    bouquetGroup.add(pointCloud);

    // 2. Build true 3D flower meshes for each flower head
    const flowerMeshes = [];
    const petalGeo = new THREE.SphereGeometry(1, 12, 10);
    petalGeo.scale(0.38, 0.95, 0.16);

    const centerGeo = new THREE.SphereGeometry(1, 14, 12);
    centerGeo.scale(1, 1, 0.55);

    const tulipPetalGeo = new THREE.SphereGeometry(1, 12, 10);
    tulipPetalGeo.scale(0.45, 0.85, 0.25);

    for (let i = 0; i < data.flowers.length; i++) {
      const fl = data.flowers[i];
      const fGroup = new THREE.Group();
      fGroup.position.set(fl.pos[0], fl.pos[1], fl.pos[2]);

      // Orient flower subtly outward along its axis while facing somewhat toward camera
      const target = new THREE.Vector3(
        fl.pos[0] + fl.axis[0] * 0.4,
        fl.pos[1] + fl.axis[1] * 0.4,
        fl.pos[2] + fl.axis[2] * 0.4 + 0.6
      );
      fGroup.lookAt(target);

      const mainHex = fl.pal[Math.min(fl.pal.length - 1, Math.floor(fl.pal.length * 0.72))];
      const darkHex = fl.pal[Math.max(0, Math.floor(fl.pal.length * 0.35))];

      if (fl.kind === "disc") {
        const cHex = fl.cpal[Math.min(fl.cpal.length - 1, Math.floor(fl.cpal.length * 0.7))];
        const cMat = new THREE.MeshStandardMaterial({
          color: cHex,
          roughness: 0.4,
          metalness: 0.1,
        });
        const cMesh = new THREE.Mesh(centerGeo, cMat);
        cMesh.scale.setScalar(fl.R * 0.34);
        cMesh.position.z = 0.015;
        fGroup.add(cMesh);

        const pMat = new THREE.MeshStandardMaterial({
          color: mainHex,
          emissive: darkHex,
          emissiveIntensity: 0.2,
          roughness: 0.45,
          metalness: 0.05,
        });

        const nPet = Math.max(4, fl.nPet);
        for (let p = 0; p < nPet; p++) {
          const angle = (p / nPet) * Math.PI * 2;
          const pMesh = new THREE.Mesh(petalGeo, pMat);
          const dist = fl.R * 0.56;
          pMesh.position.set(Math.cos(angle) * dist, Math.sin(angle) * dist, 0);
          pMesh.rotation.z = angle - Math.PI / 2;
          pMesh.rotation.x = 0.15;
          pMesh.scale.setScalar(fl.R * 0.52);
          fGroup.add(pMesh);
        }
      } else {
        // Tulip cup
        const tMat = new THREE.MeshStandardMaterial({
          color: mainHex,
          emissive: darkHex,
          emissiveIntensity: 0.22,
          roughness: 0.38,
        });
        for (let p = 0; p < 6; p++) {
          const angle = (p / 6) * Math.PI * 2;
          const tMesh = new THREE.Mesh(tulipPetalGeo, tMat);
          const rOff = fl.R * 0.32;
          tMesh.position.set(Math.cos(angle) * rOff, Math.sin(angle) * rOff, fl.R * 0.1);
          tMesh.rotation.z = angle - Math.PI / 2;
          tMesh.rotation.x = 0.55;
          tMesh.scale.setScalar(fl.R * 0.85);
          fGroup.add(tMesh);
        }
      }

      bouquetGroup.add(fGroup);
      flowerMeshes.push({ group: fGroup, seed: fl.seed, baseR: fl.R });
    }

    // 3. Baby's breath 3D spheres
    const babyGeo = new THREE.SphereGeometry(0.008, 8, 8);
    const babyMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const babyMeshes = data.babies.map(([x, y, z, phase]) => {
      const m = new THREE.Mesh(babyGeo, babyMat.clone());
      m.position.set(x, y, z);
      bouquetGroup.add(m);
      return { mesh: m, phase };
    });

    // 4. Sparkles
    const sparkGeo = new THREE.OctahedronGeometry(0.016, 0);
    const sparkMeshes = data.sparkles.map(([x, y, z, phase, speed]) => {
      const m = new THREE.Mesh(
        sparkGeo,
        new THREE.MeshBasicMaterial({ color: 0xffd7ff, transparent: true, opacity: 0.9 })
      );
      m.position.set(x, y, z);
      bouquetGroup.add(m);
      return { mesh: m, phase, speed };
    });

    // 5. Floating 3D Hearts in background
    const heartShape = new THREE.Shape();
    heartShape.moveTo(0, -0.25);
    heartShape.bezierCurveTo(0, -0.25, -0.25, 0, -0.25, 0.15);
    heartShape.bezierCurveTo(-0.25, 0.3, -0.05, 0.32, 0, 0.18);
    heartShape.bezierCurveTo(0.05, 0.32, 0.25, 0.3, 0.25, 0.15);
    heartShape.bezierCurveTo(0.25, 0, 0, -0.25, 0, -0.25);

    const heartGeo = new THREE.ShapeGeometry(heartShape);
    const heartCount = Math.max(0, Math.round(live().heartCount ?? 57));
    const heartPal = live().palettes?.HEART_COLORS || ["#0087ff"];
    const heartItems = [];

    for (let i = 0; i < heartCount; i++) {
      const col = heartPal[i % heartPal.length];
      const mat = new THREE.MeshBasicMaterial({
        color: col,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.65,
      });
      const mesh = new THREE.Mesh(heartGeo, mat);
      mesh.scale.setScalar(0.07);
      scene3d.add(mesh);
      heartItems.push({
        mesh,
        x: (Math.random() - 0.5) * 3.0,
        y: (Math.random() - 0.5) * 3.0,
        z: -1.3 - Math.random() * 0.8,
        speed: 0.25 + Math.random() * 0.35,
        phase: Math.random() * 6.28,
      });
    }

    let animId;
    let startTime = performance.now();
    let lastFrameTime = startTime;

    const animate = (now) => {
      animId = requestAnimationFrame(animate);
      const s = live();
      const targetInterval = 1000 / Math.max(15, s.fps ?? 120);
      const elapsedSinceLast = now - lastFrameTime;
      if (elapsedSinceLast < targetInterval * 0.85) return;
      const dt = Math.min(0.1, elapsedSinceLast / 1000);
      lastFrameTime = now;

      const t = (now - startTime) / 1000;
      const camOffset = cameraOffset.current || { azimuth: 0, elevation: 0, zoom: 0 };

      const ang = t * (s.spinSpeed ?? 0.45) + (camOffset.azimuth || 0);
      const tiltVal = (s.tilt ?? 0.45) + (camOffset.elevation || 0);
      const camDist = Math.max(1.8, (s.camDist ?? 4.0) + (camOffset.zoom || 0));

      rootGroup.rotation.order = "XZY";
      rootGroup.rotation.y = ang;
      rootGroup.rotation.x = tiltVal;
      camera.position.set(0, 0.05, camDist * 0.72);
      camera.lookAt(0, 0.02, 0);

      // Breathing flowers
      const bAmp = s.breathingAmp ?? 0.06;
      for (let i = 0; i < flowerMeshes.length; i++) {
        const fm = flowerMeshes[i];
        const s = 1 + bAmp * Math.sin(t * 2 + fm.seed);
        fm.group.scale.setScalar(s);
      }

      // Twinkling babies & sparkles
      for (let i = 0; i < babyMeshes.length; i++) {
        const bm = babyMeshes[i];
        const star = Math.sin(t * 2 + bm.phase) > 0.6;
        bm.mesh.scale.setScalar(star ? 1.35 : 0.85);
      }

      for (let i = 0; i < sparkMeshes.length; i++) {
        const sm = sparkMeshes[i];
        const tw = Math.sin(t * sm.speed + sm.phase);
        sm.mesh.visible = tw > 0.0;
        if (tw > 0.0) {
          sm.mesh.scale.setScalar(0.6 + tw * 0.9);
          sm.mesh.rotation.y = t * 2;
        }
      }

      // Rising hearts (in Python y goes from 1 -> 0 downward in row coords = rising upward on screen!)
      const heartSpeed = s.heartSpeed ?? 1.0;
      for (let i = 0; i < heartItems.length; i++) {
        const h = heartItems[i];
        h.y += h.speed * heartSpeed * dt;
        if (h.y > 1.6) {
          h.y = -1.5;
          h.x = (Math.random() - 0.5) * 2.8;
        }
        h.mesh.position.set(h.x + 0.05 * Math.sin(t * 1.2 + h.phase), h.y, h.z);
      }

      // Update bottom message colors
      if (msgRef.current) {
        const msg = String(s.message ?? "for you ♥").slice(0, 100);
        const msgColors = s.palettes?.MSG_COLORS?.length
          ? s.palettes.MSG_COLORS
          : ["#ff5faf", "#00afff"];
        const shift = Math.floor(t * 6);
        let html = "";
        for (let i = 0; i < msg.length; i++) {
          const ch = msg[i] === " " ? "&nbsp;" : msg[i];
          const col = msgColors[(i + shift) % msgColors.length];
          html += `<span style="color:${col}">${ch}</span>`;
        }
        msgRef.current.innerHTML = html;
      }

      renderer.render(scene3d, camera);
    };

    animId = requestAnimationFrame(animate);

    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth || 360;
      const h = container.clientHeight || 460;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener("resize", handleResize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", handleResize);
      if (webglCanvasRef && webglCanvasRef.current === renderer.domElement) {
        webglCanvasRef.current = null;
      }
      renderer.dispose();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [structureKey]);

  return (
    <div
      className="relative w-full h-full select-none overflow-hidden"
      style={{ backgroundColor: bgColor }}
      {...onPointerHandlers}
    >
      <div ref={mountRef} className="w-full h-full" />
      <div
        ref={msgRef}
        className="pointer-events-none absolute bottom-4 left-0 right-0 text-center font-mono text-[12px] font-medium sm:text-[13px]"
      />
    </div>
  );
}
