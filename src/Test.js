import React, { useEffect, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import Loading from "./Loading";
import { Vector3 } from "three";
import * as CANNON from "cannon";

var world,
  world2,
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
  rodMesh,
  cameraTarget,
  currentView = "main",
  cameraHelper,
  rodMesh;

const BALL_RADIUS = 1;
const EARTH_RADIUS = 10;
const GRAVITY_ACCN = -9.81;
const SECONDS_IN_DAY = 86400;
const PENDULUM_TO_SECONDS_IN_DAY = 1;
const DISPLAY_PENDULUM_LENGTH = 10;

const loader = new THREE.TextureLoader();

const degToRad = (angle) => (angle * Math.PI) / 180;
const radToDeg = (angle) => (angle * 180) / Math.PI;

const getMainCamera = (aspect, target) => {
  const camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    1,
    1000
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
    1000
  );
  camera.translateY(EARTH_RADIUS);
  camera.translateX(1);
  return camera;
};

function periodToLength(period) {
  return (period / (2 * Math.PI)) ** 2 * Math.abs(GRAVITY_ACCN);
}

function rotateAboutPoint(obj, point, axis, theta, pointIsWorld) {
  pointIsWorld = pointIsWorld === undefined ? false : pointIsWorld;

  if (pointIsWorld) {
    obj.parent.localToWorld(obj.position); // compensate for world coordinate
  }

  obj.position.sub(point); // remove the offset
  obj.position.applyAxisAngle(axis, theta); // rotate the POSITION
  obj.position.add(point); // re-add the offset

  if (pointIsWorld) {
    obj.parent.worldToLocal(obj.position); // undo world coordinates compensation
  }

  obj.rotateOnAxis(axis, theta); // rotate the OBJECT
}

function createSkyboxMaterialArray() {
  const loader = new THREE.TextureLoader();
  let sides = ["px", "nx", "py", "ny", "pz", "nz"];
  return sides.map(
    (side) =>
      new THREE.MeshBasicMaterial({
        map: loader.load(`cube_maps/stars/${side}.png`),
        side: THREE.BackSide,
      })
  );
}

export default function Test() {
  const [container, setContainer] = useState();
  const [isLoading, setLoading] = useState(true);
  const [demoSpeed, setDemoSpeed] = useState(10000);

  const [pendulumObj, setPendulumObj] = useState({
    period: 1,
    mass: 1,
    intialAngle: Math.PI / 4,
  });
  const [earthPeriod, setEarthPeriod] = useState(SECONDS_IN_DAY / demoSpeed);

  const containerMountCb = (node) => {
    if (node) {
      setContainer(node);
    }
  };

  useEffect(() => {
    demoSpeed && setEarthPeriod(SECONDS_IN_DAY / demoSpeed);
    if (pendulumObj && world) {
      initPendulumPhysics(pendulumObj);
    }
  }, [demoSpeed]);

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
    ballMesh.position.set(
      periodToLength(earthPeriod / pendulumObj.period) *
        Math.sin(pendulumObj.intialAngle),
      -periodToLength(earthPeriod / pendulumObj.period) *
        Math.cos(pendulumObj.intialAngle),
      0
    );
    const pivot = new THREE.Mesh(
      new THREE.SphereGeometry(0.1, 32, 16),
      material
    );

    const starCube = new THREE.BoxGeometry(1000, 1000, 1000);
    const stars = new THREE.Mesh(starCube, createSkyboxMaterialArray());
    scene.add(stars);

    const earthGeometry = new THREE.SphereGeometry(EARTH_RADIUS, 64, 32);
    const earthMaterial = new THREE.MeshBasicMaterial({
      map: loader.load("/earth.jpg"),
    });

    earthMesh = new THREE.Group();
    earthMesh.position.y = -EARTH_RADIUS - 3 * DISPLAY_PENDULUM_LENGTH;
    scene.add(earthMesh);

    const _earthMesh = new THREE.Mesh(earthGeometry, earthMaterial);
    earthMesh.add(_earthMesh);

    pendulum.add(pivot);
    pendulum.add(ballMesh);

    const rodGeometry = new THREE.CylinderGeometry(
      0.05,
      0.05,
      DISPLAY_PENDULUM_LENGTH,
      32,
      16
    );
    rodMesh = new THREE.Mesh(rodGeometry, material);
    rodMesh.translateY(-DISPLAY_PENDULUM_LENGTH / 2);
    pendulum.add(rodMesh);

    wrapper.appendChild(renderer.domElement);

    const aspect = wrapper.offsetWidth / wrapper.offsetHeight;
    mainCamera = getMainCamera(aspect);
    earthCamera = getEarthCamera();
    camera = mainCamera;
    cameraTarget = new Vector3(0, 0, 0);

    // cameraHelper = new THREE.CameraHelper(earthCamera);
    // earthCamera.lookAt(new Vector3(0, 0, 0));
    // scene.add(cameraHelper);

    scene.add(mainCamera);
    earthMesh.add(earthCamera);

    controls = new OrbitControls(camera, wrapper);
    controls.maxDistance = 80;
    controls.minDistance = 20;

    const onWindowResize = () => {
      if (!container) return;
      camera.aspect = container.offsetWidth / container.offsetHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.offsetWidth, container.offsetHeight);
    };
    window.addEventListener("resize", onWindowResize, false);
  }

  function initCannon() {
    initPendulumPhysics(pendulumObj);
  }

  function initPendulumPhysics(pendulumObj) {
    world = new CANNON.World();
    world.gravity.set(0, GRAVITY_ACCN, 0);
    world.broadphase = new CANNON.NaiveBroadphase();
    world.solver.iterations = 10;
    world.quatNormalizeFast = false;
    world.quatNormalizeSkip = 0;

    world2 = new CANNON.World();
    world2.gravity.set(0, 0, 0);
    world2.broadphase = new CANNON.NaiveBroadphase();
    world2.solver.iterations = 10;
    world2.quatNormalizeFast = false;
    world2.quatNormalizeSkip = 0;

    const pivotShape = new CANNON.Sphere(1);
    const pivot = new CANNON.Body({
      mass: 0,
    });
    pivot.addShape(pivotShape);

    world.addBody(pivot);

    const ballShape = new CANNON.Sphere(BALL_RADIUS);
    ball = new CANNON.Body({
      mass: 1,
    });

    ball.position.set(
      periodToLength(earthPeriod / pendulumObj.period) *
        Math.sin(pendulumObj.intialAngle),
      -periodToLength(earthPeriod / pendulumObj.period) *
        Math.cos(pendulumObj.intialAngle),
      0
    );
    ball.linearDamping = 0;
    ball.angularDamping = 0;
    ball.addShape(ballShape);
    world.addBody(ball);

    const earthShape = new CANNON.Sphere(EARTH_RADIUS);

    earth = new CANNON.Body({
      mass: 100,
    });
    earth.addShape(earthShape);
    earth.angularDamping = 0;
    earth.angularVelocity.set(0, (2 * Math.PI) / earthPeriod, 0);
    world2.addBody(earth);

    var c = new CANNON.DistanceConstraint(
      ball,
      pivot,
      periodToLength(earthPeriod / pendulumObj.period)
    );
    world.addConstraint(c);
  }
  var prevAngle = 0;
  function animate() {
    updatePhysics();
    renderer.render(scene, camera);
    camera.lookAt(cameraTarget);
    camera.updateProjectionMatrix();
    controls.update();

    requestAnimationFrame(animate);
    const currAngle = Math.atan(-ballMesh.position.x / ballMesh.position.y);
    rotateAboutPoint(
      rodMesh,
      new Vector3(0, 0, 0),
      new Vector3(0, 0, 1),
      currAngle - prevAngle
    );
    prevAngle = currAngle;
  }

  function updatePhysics() {
    // Step the physics world
    world.step(timeStep);
    world2.step(timeStep);

    // Scale and copy coordinates from Cannon.js to Three.js
    if (ball) {
      const ballX = ball.position.x;
      const ballY = ball.position.y;
      const ballZ = ball.position.z;

      const theta = Math.atan(ballX / ballY);
      const scaledX = DISPLAY_PENDULUM_LENGTH * Math.sin(theta);
      const scaledY = -DISPLAY_PENDULUM_LENGTH * Math.cos(theta);
      const scaledZ = ballZ;
      ballMesh.position.copy(new Vector3(scaledX, scaledY, scaledZ));
    }
    earth && earthMesh.quaternion.copy(earth.quaternion);
  }
  useEffect(() => {
    if (container) {
      initCannon(container);
      initThree(container);

      animate();
    }
  }, [container]);

  useEffect(() => {
    if (pendulumObj && world) {
      initPendulumPhysics(pendulumObj);
    }
  }, [pendulumObj]);

  THREE.DefaultLoadingManager.onLoad = function () {
    setLoading(false);
  };

  function toggleCameraView() {
    if (camera === mainCamera) {
      console.log("switching to earth view");
      camera = earthCamera;
      controls.enabled = false;
    } else {
      console.log("switching to main view");
      camera = mainCamera;
      controls.enabled = true;
    }
  }

  const updatePendulum = (prop, val) => {
    setPendulumObj((obj) => ({ ...obj, [prop]: val }));
  };

  return (
    <>
      {isLoading && <Loading />}
      <div className="w-full h-full" ref={containerMountCb}></div>
      <div className="fixed z-30 flex flex-col top-5 left-5">
        <button
          onClick={toggleCameraView}
          className="px-3 py-2 rounded-2xl bg-indigo-300"
        >
          Switch!
        </button>
        <span className="text-white">
          Earth period: {pendulumObj.period} x Pendulum's period
        </span>
        <input
          type="range"
          max={5}
          min={1}
          step={1}
          value={pendulumObj.period}
          onChange={(e) => updatePendulum("period", Number(e.target.value))}
        />
        <span className="text-white">Demo Speed: {demoSpeed}</span>
        <input
          type="range"
          max={100000}
          min={1}
          step={1000}
          value={demoSpeed}
          onChange={(e) => setDemoSpeed(Number(e.target.value))}
        />
      </div>
    </>
  );
}
