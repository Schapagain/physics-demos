import React, { useEffect, useState } from "react";
import * as THREE from "three";
import * as CANNON from "cannon";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import Loading from "./Loading";

var world,
  ball,
  rod,
  shape,
  timeStep = 1 / 60,
  camera,
  scene,
  renderer,
  geometry,
  material,
  ballMesh,
  rodMesh;

const ROD_RADIUS = 0.1;
const BALL_RADIUS = 1;
const ROD_HEIGHT = 10;

function Pendulum(length) {
  const geometry = new THREE.SphereGeometry(1, 32, 16);
  const material = new THREE.MeshBasicMaterial({
    color: 0xffff00,
    wireframe: true,
  });
  return new THREE.Mesh(geometry, material);
}

export default function Test() {
  const [container, setContainer] = useState();
  const [isLoading, setLoading] = useState(false);

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

    const ballGeometry = new THREE.SphereGeometry(BALL_RADIUS, 32, 16);
    const material = new THREE.MeshBasicMaterial({
      color: 0x00ffff,
    });

    controls = new OrbitControls(camera, container);

    ballMesh = new THREE.Mesh(ballGeometry, material);
    scene.add(ballMesh);

    const rodGeometry = new THREE.CylinderGeometry(
      ROD_RADIUS,
      ROD_RADIUS,
      10,
      32,
      32
    );
    rodMesh = new THREE.Mesh(rodGeometry, material);
    scene.add(rodMesh);

    wrapper.appendChild(renderer.domElement);

    const onWindowResize = () => {
      if (!container) return;
      camera.aspect = container.offsetWidth / container.offsetHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.offsetWidth, container.offsetHeight);
    };
    window.addEventListener("resize", onWindowResize, false);
  }

  function initCannon() {
    world = new CANNON.World();
    world.gravity.set(0, 0, 0);
    world.broadphase = new CANNON.NaiveBroadphase();
    world.solver.iterations = 10;

    const rodShape = new CANNON.Cylinder(
      ROD_RADIUS,
      ROD_RADIUS,
      ROD_HEIGHT,
      100
    );
    rod = new CANNON.Body({
      mass: 1,
    });
    rod.addShape(rodShape);
    world.addBody(rod);
    rod.position.set(0, 0.5 * ROD_HEIGHT + BALL_RADIUS, 0);

    const ballShape = new CANNON.Sphere(BALL_RADIUS);
    ball = new CANNON.Body({
      mass: 1,
    });
    ball.addShape(ballShape);
    ball.angularVelocity.set(0, 10, 0);
    ball.angularDamping = 0.5;
    world.addBody(ball);
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
    ball & ballMesh.position.copy(ball.position);
    ball & ballMesh.quaternion.copy(ball.quaternion);
    rod && rodMesh.position.copy(rod.position);
    rod && rodMesh.quaternion.copy(rod.quaternion);
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
