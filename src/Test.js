import React, { useEffect, useState } from "react";
import * as THREE from "three";
import * as CANNON from "cannon";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import Loading from "./Loading";
import { Vector3 } from "three";

var world,
  controls,
  ball,
  earth,
  rod,
  timeStep = 1 / 60,
  camera,
  mainCamera,
  earthCamera,
  scene,
  renderer,
  ballMesh,
  earthMesh,
  cameraTarget,
  currentView = "main",
  cameraHelper,
  rodMesh;

const BALL_RADIUS = 1;
const EARTH_RADIUS = 10;
const GRAVITY_ACCN = -9.81;

const loader = new THREE.TextureLoader();

const degToRad = (angle) => (angle * Math.PI) / 180;

const getMainCamera = (aspect, target) => {
  const camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    1,
    100
  );
  camera.position.z = EARTH_RADIUS * 3;
  camera.aspect = aspect;
  return camera;
};

const getEarthCamera = (target) => {
  const camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    1,
    100
  );
  camera.translateY(EARTH_RADIUS);
  camera.translateX(1);
  return camera;
};

export default function Test() {
  const [container, setContainer] = useState();
  const [isLoading, setLoading] = useState(true);

  const containerMountCb = (node) => {
    if (node) {
      setContainer(node);
    }
  };

  function initThree(wrapper) {
    scene = new THREE.Scene();

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(wrapper.offsetWidth, wrapper.offsetHeight);

    const ballGeometry = new THREE.SphereGeometry(BALL_RADIUS, 32, 16);
    const material = new THREE.MeshBasicMaterial({
      color: 0x00ffff,
    });

    const pendulum = new THREE.Group();
    scene.add(pendulum);
    ballMesh = new THREE.Mesh(ballGeometry, material);
    const pivot = new THREE.Mesh(
      new THREE.SphereGeometry(0.1, 32, 16),
      material
    );
    pivot.position.set(0, 20, 0);
    pendulum.add(pivot);
    pendulum.add(ballMesh);

    const earthGeometry = new THREE.SphereGeometry(EARTH_RADIUS, 64, 32);
    const earthMaterial = new THREE.MeshBasicMaterial({
      map: loader.load("/earth.jpg"),
    });

    earthMesh = new THREE.Group();
    earthMesh.position.y = -EARTH_RADIUS;
    scene.add(earthMesh);

    const _earthMesh = new THREE.Mesh(earthGeometry, earthMaterial);
    _earthMesh.rotateZ(degToRad(-23));
    earthMesh.add(_earthMesh);
    wrapper.appendChild(renderer.domElement);

    const aspect = wrapper.offsetWidth / wrapper.offsetHeight;
    mainCamera = getMainCamera(aspect, new Vector3(0, 0, 0));
    earthCamera = getEarthCamera(new Vector3(0, 20, 0));
    camera = mainCamera;
    cameraTarget = new Vector3(0, 0, 0);

    cameraHelper = new THREE.CameraHelper(earthCamera);
    earthCamera.lookAt(new Vector3(0, 30, 0));
    scene.add(cameraHelper);

    scene.add(mainCamera);
    earthMesh.add(earthCamera);

    // controls = new OrbitControls(camera, wrapper);

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
    world.gravity.set(0, GRAVITY_ACCN, 0);
    world.broadphase = new CANNON.NaiveBroadphase();
    world.solver.iterations = 10;
    world.quatNormalizeFast = false;
    world.quatNormalizeSkip = 0;

    const pivotShape = new CANNON.Sphere(1);
    const pivot = new CANNON.Body({
      mass: 0,
    });
    pivot.addShape(pivotShape);
    pivot.position.set(0, 20, 0);
    world.addBody(pivot);

    const ballShape = new CANNON.Sphere(BALL_RADIUS);
    ball = new CANNON.Body({
      mass: 100,
    });

    ball.velocity.set(-5, 0, 0);
    ball.position.set(0, 10, 0);
    ball.linearDamping = 0;
    ball.angularDamping = 0;
    ball.addShape(ballShape);
    world.addBody(ball);

    var c = new CANNON.PointToPointConstraint(
      ball,
      pivot.position,
      pivot,
      ball.position
    );
    world.addConstraint(c);
  }

  function animate() {
    renderer.render(scene, camera);
    camera.lookAt(cameraTarget);
    camera.updateProjectionMatrix();

    updatePhysics();
    requestAnimationFrame(animate);
    // earthMesh.rotateOnAxis(new THREE.Vector3(0.39, 0.92, 0), 0.05);
    earthMesh.rotateOnAxis(new THREE.Vector3(0, 1, 0), 0.05);
  }

  function updatePhysics() {
    // Step the physics world
    world.step(timeStep);

    // Copy coordinates from Cannon.js to Three.js
    ball & ballMesh.position.copy(ball.position);
    ball & ballMesh.quaternion.copy(ball.quaternion);
    rod && rodMesh.position.copy(rod.position);
    rod && rodMesh.quaternion.copy(rod.quaternion);
    earth && earthMesh.position.copy(earth.position);
    earth && earthMesh.quaternion.copy(earth.quaternion);
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

  function toggleCameraView() {
    if (camera === mainCamera) {
      console.log("switching to earth view");
      camera = earthCamera;
      cameraTarget = new Vector3(0, 20, 0);
    } else {
      console.log("switching to main view");
      camera = mainCamera;
      cameraTarget = new Vector3(0, 0, 0);
    }
  }

  return (
    <>
      {isLoading && <Loading />}
      <div className="w-full h-full" ref={containerMountCb}></div>
      <button
        onClick={toggleCameraView}
        className="fixed z-30 px-3 py-2 top-5 left-5 rounded-2xl bg-indigo-300"
      >
        Switch!
      </button>
    </>
  );
}
