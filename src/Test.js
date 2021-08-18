import React, { useEffect, useState } from "react";
import * as THREE from "three";
import * as CANNON from "cannon";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import Loading from "./Loading";
import Matter from "matter-js";

var world,
  ball,
  earth,
  rod,
  shape,
  timeStep = 1 / 60,
  camera,
  scene,
  renderer,
  geometry,
  material,
  ballMesh,
  earthMesh,
  engine,
  rodMesh;

const ROD_RADIUS = 0.1;
const BALL_RADIUS = 1;
const ROD_HEIGHT = 10;
const EARTH_RADIUS = 10;
const EARTH_MASS = 100;
const SPEEDUP_FACTOR = 8640;
const MAX_ANGLE = Math.PI / 4;

// var Engine = Matter.Engine,
//         Render = Matter.Render,
//         Runner = Matter.Runner,
//         Composites = Matter.Composites,
//         MouseConstraint = Matter.MouseConstraint,
//         Mouse = Matter.Mouse,
//         Composite = Matter.Composite,
//         Constraint = Matter.Constraint,
//         Bodies = Matter.Bodies;

const loader = new THREE.TextureLoader();

export default function Test() {
  const [container, setContainer] = useState();
  const [isLoading, setLoading] = useState(false);

  const containerMountCb = (node) => {
    if (node) {
      setContainer(node);
    }
  };

  let controls;

  // function initMatter() {
  //   engine = Engine.create();
  //   world= engine.world;

  //   const runner = Runner.create();
  //   Runner.run(runner,engine);

  //   ball = Bodies.
  // }

  function initThree(wrapper) {
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      1,
      100
    );
    camera.position.z = EARTH_RADIUS * 3;
    camera.aspect = wrapper.offsetWidth / wrapper.offsetHeight;
    camera.updateProjectionMatrix();

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(wrapper.offsetWidth, wrapper.offsetHeight);

    const ballGeometry = new THREE.SphereGeometry(BALL_RADIUS, 32, 16);
    const material = new THREE.MeshBasicMaterial({
      color: 0x00ffff,
    });

    controls = new OrbitControls(camera, container);

    const pendulum = new THREE.Group();
    scene.add(pendulum);
    pendulum.position.y = EARTH_RADIUS * 2;
    ballMesh = new THREE.Mesh(ballGeometry, material);

    // const rodGeometry = new THREE.CylinderGeometry(
    //   ROD_RADIUS,
    //   ROD_RADIUS,
    //   10,
    //   32,
    //   32
    // );
    const rodGeometry = new THREE.SphereGeometry(BALL_RADIUS, 32, 16);
    rodMesh = new THREE.Mesh(rodGeometry, material);
    rodMesh.position.y = 0.5 * ROD_HEIGHT;
    pendulum.add(rodMesh);

    pendulum.add(ballMesh);

    const earthGeometry = new THREE.SphereGeometry(EARTH_RADIUS, 64, 32);
    const earthMaterial = new THREE.MeshBasicMaterial({
      map: loader.load("/earth.jpg"),
    });

    earthMesh = new THREE.Group();
    scene.add(earthMesh);
    scene.add(camera);

    const _earthMesh = new THREE.Mesh(earthGeometry, earthMaterial);
    earthMesh.add(_earthMesh);
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
    world.quatNormalizeFast = false;
    world.quatNormalizeSkip = 0;

    // const rodShape = new CANNON.Cylinder(
    //   ROD_RADIUS,
    //   ROD_RADIUS,
    //   ROD_HEIGHT,
    //   100
    // );
    const rodShape = new CANNON.Sphere(BALL_RADIUS);
    rod = new CANNON.Body({
      mass: 0,
    });

    rod.addShape(rodShape);
    world.addBody(rod);
    rod.position.set(0, 0, 7 * BALL_RADIUS);

    const ballShape = new CANNON.Sphere(BALL_RADIUS);
    ball = new CANNON.Body({
      mass: EARTH_MASS,
    });
    ball.position.set(0, 0, -BALL_RADIUS * 3);
    ball.velocity.set(5, 0, 0);
    ball.linearDamping = 0;
    ball.angularDamping = 0;
    ball.addShape(ballShape);
    world.addBody(ball);

    // const earthShape = new CANNON.Sphere(EARTH_RADIUS);

    // earth = new CANNON.Body({
    //   mass: EARTH_MASS,
    // });
    // earth.addShape(earthShape);
    // earth.angularVelocity.set(0, (SPEEDUP_FACTOR * (2 * Math.PI)) / 86400, 0);
    // world.addBody(earth);

    var c = new CANNON.PointToPointConstraint(
      ball,
      rod.position,
      rod,
      ball.position
    );
    world.addConstraint(c);
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

  return (
    <>
      {isLoading && <Loading />}
      <div className="w-full h-full" ref={containerMountCb}></div>
    </>
  );
}
