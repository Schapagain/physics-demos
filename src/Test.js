import React, { useEffect, useState } from "react";
import * as THREE from "three";
import * as CANNON from "cannon";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import Loading from "./Loading";

const raycaster = new THREE.Raycaster();

var world,
  mass,
  body,
  shape,
  timeStep = 1 / 60,
  camera,
  scene,
  renderer,
  geometry,
  material,
  mesh;

export default function Test() {
  const [container, setContainer] = useState();
  const [isLoading, setLoading] = useState(false);

  function raycast(e, touch = false, click = false) {
    var mouse = { x: 0, y: 0 };
    if (touch) {
      mouse.x = 2 * (e.changedTouches[0].clientX / window.innerWidth) - 1;
      mouse.y = 1 - 2 * (e.changedTouches[0].clientY / window.innerHeight);
    } else {
      mouse.x = 2 * (e.clientX / window.innerWidth) - 1;
      mouse.y = 1 - 2 * (e.clientY / window.innerHeight);
    }
    // update the picking ray with the camera and mouse position
    raycaster.setFromCamera(mouse, camera);

    // calculate objects intersecting the picking ray
    var intersects = raycaster.intersectObjects(scene.children, true);

    if (intersects[0]) {
    }
  }

  const containerMountCb = (node) => {
    if (node) {
      setContainer(node);
    }
  };

  let controls;

  function initThree(wrapper) {
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      1,
      100
    );
    camera.position.z = 5;
    camera.aspect = wrapper.offsetWidth / wrapper.offsetHeight;
    camera.updateProjectionMatrix();
    scene.add(camera);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(wrapper.offsetWidth, wrapper.offsetHeight);

    geometry = new THREE.BoxGeometry(2, 2, 2);
    material = new THREE.MeshBasicMaterial({
      color: 0xff0000,
      wireframe: true,
    });

    controls = new OrbitControls(camera, container);
    controls.minDistance = 500;
    controls.maxDistance = 1500;

    mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);

    wrapper.appendChild(renderer.domElement);

    const onWindowResize = () => {
      if (!container) return;
      camera.aspect = container.offsetWidth / container.offsetHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.offsetWidth, container.offsetHeight);
    };
    window.addEventListener("resize", onWindowResize, false);
    window.addEventListener("click", (e) => raycast(e, false, true));
    window.addEventListener("mousemove", (e) => raycast(e));
    window.addEventListener("touchend", (e) => raycast(e, true, true));
  }

  function initCannon() {
    world = new CANNON.World();
    world.gravity.set(0, 0, 0);
    world.broadphase = new CANNON.NaiveBroadphase();
    world.solver.iterations = 10;

    shape = new CANNON.Box(new CANNON.Vec3(1, 1, 1));
    mass = 1;
    body = new CANNON.Body({
      mass: 1,
    });
    body.addShape(shape);
    body.angularVelocity.set(0, 10, 0);
    body.angularDamping = 0.5;
    world.addBody(body);
  }

  function animate() {
    renderer.render(scene, camera);
    controls.update();
    updatePhysics();
    requestAnimationFrame(animate);
  }

  function updatePhysics() {
    // Step the physics world
    world.step(timeStep);
    // Copy coordinates from Cannon.js to Three.js
    mesh.position.copy(body.position);
    mesh.quaternion.copy(body.quaternion);
  }

  useEffect(() => {
    if (container) {
      initThree(container);
      initCannon(container);
      animate();
    }
  }, [container]);

  THREE.DefaultLoadingManager.onLoad = function () {
    setLoading(false);
  };

  return (
    <>
      {isLoading && <Loading />}
      <div className="w-full h-full" ref={containerMountCb}></div>
    </>
  );
}
