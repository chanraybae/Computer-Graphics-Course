// Citation: Project inspired by: https://medium.com/@curry_is_nice/summer-3d-island-3d0be731ce1b

'use strict';

import * as THREE from 'three';
import { Sky } from 'three/addons/objects/Sky';
import { Water } from 'three/addons/objects/Water';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { Lensflare, LensflareElement } from 'three/addons/objects/Lensflare.js';

let loadingState = 0;

let clock;
let sizes;

let renderer;
let scene, camera, controls;
let ambientLight, dirLight;

let water, waterGeometry;
const water_texture = './public/textures/water_texture.jpeg';

let sky, skyUniforms, sun, pmremGenerator, sun_phi, sun_theta;

let loader;
let mixers = [];
let birds = [];
let numFlyingBirds = 0;

let snow_island_opacity = 0;
let green_island_opacity = 1;
let timeSinceLastFade = new Date();
let fadeTimeThreshMs = 100;
let island_meshes = [];
const green_island_model = './public/models/green_island.glb';
const snow_island_model = './public/models/snow_island.glb';
const flamingo_model = './public/models/bird.glb';

let pointLight;
const lens_flare = './public/textures/lensflare.jpeg';

let sunPosDeg = 84;
let flarePosAbs = 205;
let numMsDayUpdate = 50;
let timeDayLastUpdated = new Date();

let hasRainbow = false;
let rainbow;

let isSnowing = false;
let snowflakes;
let snowflake_positions = [];
let snowflake_velocities = [];
const numSnowflakes = 50000;
const snowflakesMaxRange = 4000;
const snowflakesMinRange = snowflakesMaxRange / 2;
const snowflakesMinHeight = 150;
const snowflake_texture = './public/textures/snowflake_texture.png';

// Hide canvas element.
function hideCanvas() {
  const canvas = document.getElementById('project-canvas');
  canvas.style.display = 'none';
}

// Show canvas element.
function showCanvas() {
  const canvas = document.getElementById('project-canvas');
  canvas.style.display = 'inherit';
}


// Hide completion percentage.
function hideCompletion() {
  const completionP = document.getElementById('loading');
  completionP.style.display = 'none';
}

// Initialize the scene, camera, and lighting.
function init() {
  sizes = {
    width: window.innerWidth,
    height: window.innerHeight,
  };

  clock = new THREE.Clock();

  renderer = new THREE.WebGLRenderer({
    canvas: document.getElementById('project-canvas'),
    antialias: true,
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(sizes.width, sizes.height);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;

  scene = new THREE.Scene();

  camera = new THREE.PerspectiveCamera(
    55,
    sizes.width / sizes.height,
    1,
    20000
  );
  camera.position.set(0, 600, 1600);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(0, 0, 0);
  controls.enableDamping = true;
  controls.enablePan = false;
  controls.maxPolarAngle = 1.5;
  controls.minDistance = 50;
  controls.maxDistance = 1200;

  ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
  scene.add(ambientLight);

  dirLight = new THREE.DirectionalLight(0xffffff, 1);
  dirLight.color.setHSL(0.1, 1, 0.95);
  dirLight.position.set(-1, 1.75, 1);
  dirLight.position.multiplyScalar(30);
  scene.add(dirLight);

  hideCanvas();

  // Handle the window resize event.
  window.addEventListener(
    'resize',
    () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    },
    false
  );
}

function addSun() {
  sky = new Sky();
  sky.scale.setScalar(10000);
  scene.add(sky);
  skyUniforms = sky.material.uniforms;
  skyUniforms['turbidity'].value = 20;
  skyUniforms['rayleigh'].value = 2;
  skyUniforms['mieCoefficient'].value = 0.005;
  skyUniforms['mieDirectionalG'].value = 0.8;
  sun = new THREE.Vector3();
  pmremGenerator = new THREE.PMREMGenerator(renderer);
  sun_phi = THREE.MathUtils.degToRad(sunPosDeg);
  sun_theta = THREE.MathUtils.degToRad(180);
  sun.setFromSphericalCoords(1, sun_phi, sun_theta);
  sky.material.uniforms['sunPosition'].value.copy(sun);
  water.material.uniforms['sunDirection'].value.copy(sun).normalize();
  scene.environment = pmremGenerator.fromScene(sky).texture;
}

function addWater() {
  waterGeometry = new THREE.PlaneGeometry(10000, 10000);
  water = new Water(waterGeometry, {
    textureWidth: 512,
    textureHeight: 512,
    waterNormals: new THREE.TextureLoader().load(water_texture, (texture) => {
      texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    }),
    sunDirection: new THREE.Vector3(),
    sunColor: 0xffffff,
    waterColor: 0x0072ff,
    distortionScale: 4,
    fog: scene.fog !== undefined,
  });
  water.rotation.x = -Math.PI / 2;
  scene.add(water);
}

function addRainbow() {
  if (hasRainbow) {
    return;
  }

  hasRainbow = true;

  const material = new THREE.ShaderMaterial({
    side: THREE.DoubleSide,
    transparent: true,
    uniforms: {},
    vertexShader: document.getElementById('vertex_shader').textContent,
    fragmentShader: document.getElementById('fragment_shader').textContent,
  });
  const geometry = new THREE.TorusGeometry(200, 10, 50, 100);
  rainbow = new THREE.Mesh(geometry, material);
  rainbow.opacity = 0.1;
  rainbow.position.set(0, -50, -400);
  scene.add(rainbow);
}

function removeRainbow() {
  if (!hasRainbow) {
    return;
  }

  hasRainbow = false;
  rainbow.geometry.dispose();
  rainbow.material.dispose();
  scene.remove(rainbow);
}

function setSceneToReady() {
  hideCompletion();
  showCanvas();
}

function addIsland(name, island_model) {
  const manager = new THREE.LoadingManager();
  manager.onProgress = (url, loaded, total) => {
    if (Math.floor((loaded / total) * 100) === 100) {
      loadingState = Math.floor((loaded / total) * 100);
      document.getElementById('loading').innerHTML =
        'Loading: ' + loadingState + '%';
      gsap.to(camera.position, {
        x: 0,
        y: 50,
        z: 140,
        duration: 4,
        onComplete: setSceneToReady(),
      });
    } else {
      loadingState = Math.floor((loaded / total) * 100);
      document.getElementById('loading').innerHTML =
        'Loading: ' + loadingState + '%';
    }
  };
  loader = new GLTFLoader(manager);
  loader.load(island_model, (mesh) => {
    mesh.scene.traverse((child) => {
      if (child.isMesh) {
        child.material.metalness = 0.4;
        child.material.roughness = 0.6;
        child.material.transparent = true;
        child.material.opacity = 1;
        if (name == 'snow_island') {
          child.material.opacity = 0;
        }
      }
    });
    mesh.scene.position.set(0, 0.7, 0);
    mesh.scene.scale.set(0.5, 0.5, 0.5);
    mesh.scene.name = name;
    island_meshes.push(mesh.scene);

    scene.add(mesh.scene);
  });
}

function addBird(posX, posY, posZ) {
  loader.load(flamingo_model, (gltf) => {
    const mesh = gltf.scene.children[0];
    mesh.scale.set(4, 4, 4);
    mesh.position.set(posX, posY, posZ);
    mesh.rotation.z = -1.55;
    mesh.castShadow = true;
    const minSpeed = 2;
    const maxSpeed = 4.5;
    const birdSpeedInterval = Math.random() * (maxSpeed - minSpeed) + minSpeed;
    mesh.birdSpeedInterval = birdSpeedInterval;
    scene.add(mesh);
    birds.push(mesh);
    const mixer = new THREE.AnimationMixer(mesh);
    mixer.clipAction(gltf.animations[0]).setDuration(1.2).play();
    mixers.push(mixer);
  });
}

function maintainFlyingBirds() {
  // Move birds forward.
  let index = birds.length;
  while (index--) {
    const bird = birds[index];
    if (bird.position.x <= -1950) {
      let posX = Math.random() * (1950 - 1600) + 1600;
      let posY = Math.random() * (100 - 20) + 20;
      let posZ = Math.random() * (-2000 - -600) + -600;
      bird.position.set(posX, posY, posZ);
    } else {
      bird.position.x -= bird.birdSpeedInterval;
    }
  }

  // Add a bird in the sky.
  if (numFlyingBirds >= 3) {
    return;
  }

  numFlyingBirds += 1;
  let posX = Math.random() * (2500 - 1000) + 1000;
  let posY = Math.random() * (100 - 20) + 20;
  let posZ = Math.random() * (-2000 - -600) + -600;
  addBird(posX, posY, posZ);
}

function addLensGlow() {
  pointLight = new THREE.PointLight(0xffffff, 1.2, 2000);
  pointLight.color.setHSL(0.995, 0.5, 0.9);
  pointLight.position.set(0, flarePosAbs, -2000);
  const textureLoader = new THREE.TextureLoader();
  const textureFlare = textureLoader.load(lens_flare);
  const lensflare = new Lensflare();
  lensflare.addElement(
    new LensflareElement(textureFlare, 600, 0, pointLight.color)
  );
  lensflare.addElement(new LensflareElement(textureFlare, 60, 0.6));
  lensflare.addElement(new LensflareElement(textureFlare, 70, 0.7));
  lensflare.addElement(new LensflareElement(textureFlare, 120, 0.9));
  lensflare.addElement(new LensflareElement(textureFlare, 70, 1));
  pointLight.add(lensflare);
  scene.add(pointLight);
}

function rotateTimeOfDay() {
  const currentTime = new Date();
  const timeElapsed = currentTime - timeDayLastUpdated;
  if (timeElapsed < numMsDayUpdate) {
    return;
  }

  timeDayLastUpdated = currentTime;

  if (sunPosDeg >= 91) {
    // It is currently night time.
    sunPosDeg = 84;
    flarePosAbs = 205;
    if (!isSnowing) {
      addSnow();
    } else {
      stopSnowAnimation();
    }
  } else {
    sunPosDeg += 0.01;
    flarePosAbs -= 0.4;
  }

  if (sunPosDeg >= 84 && sunPosDeg <= 89 && !isSnowing) {
    addRainbow();
  } else {
    removeRainbow();
  }

  sun_phi = THREE.MathUtils.degToRad(sunPosDeg);
  sun_theta = THREE.MathUtils.degToRad(180);
  sun.setFromSphericalCoords(1, sun_phi, sun_theta);
  sky.material.uniformchnas['sunPosition'].value.copy(sun);
  water.material.uniforms['sunDirection'].value.copy(sun).normalize();

  pointLight.position.set(0, flarePosAbs, -2000);
}

function fadeInSnowIsland() {
  if (!isSnowing) {
    return;
  }

  const currentTime = new Date();
  const timeElapsed = currentTime - timeSinceLastFade;
  if (timeElapsed < fadeTimeThreshMs) {
    return;
  }
  timeSinceLastFade = new Date();

  island_meshes &&
    island_meshes.forEach((island) => {
      if (island.name == 'green_island') {
        if (green_island_opacity > 0) {
          green_island_opacity -= 0.001;
        }
        island.traverse((child) => {
          if (child.isMesh) {
            child.material.opacity = green_island_opacity;
          }
        });
      } else {
        if (snow_island_opacity < 1) {
          snow_island_opacity += 0.01;
        }
        island.traverse((child) => {
          if (child.isMesh) {
            child.material.opacity = snow_island_opacity;
          }
        });
      }
    });
}

function fadeOutSnowIsland() {
  if (isSnowing) {
    return;
  }

  const currentTime = new Date();
  const timeElapsed = currentTime - timeSinceLastFade;
  if (timeElapsed < fadeTimeThreshMs) {
    return;
  }
  timeSinceLastFade = new Date();

  island_meshes &&
    island_meshes.forEach((island) => {
      if (island.name == 'green_island') {
        if (green_island_opacity < 1) {
          green_island_opacity += 0.01;
        }
        island.traverse((child) => {
          if (child.isMesh) {
            child.material.opacity = green_island_opacity;
          }
        });
      } else {
        if (snow_island_opacity > 0) {
          snow_island_opacity -= 0.01;
        }
        island.traverse((child) => {
          if (child.isMesh) {
            child.material.opacity = snow_island_opacity;
          }
        });
      }
    });
}

function addSnow() {
  for (let i = 0; i < numSnowflakes; i++) {
    snowflake_positions.push(
      Math.floor(Math.random() * snowflakesMaxRange - snowflakesMinRange),
      Math.floor(Math.random() * snowflakesMinRange + snowflakesMinHeight),
      Math.floor(Math.random() * snowflakesMaxRange - snowflakesMinRange)
    );

    snowflake_velocities.push(
      Math.floor(Math.random() * 6 - 3) * 0.1,
      Math.floor(Math.random() * 5 + 0.12) * 0.18,
      Math.floor(Math.random() * 6 - 3) * 0.1
    );
  }

  const snowflakesGeometry = new THREE.BufferGeometry();
  const snowflakesTextureLoader = new THREE.TextureLoader();

  snowflakesGeometry.setAttribute(
    'position',
    new THREE.Float32BufferAttribute(snowflake_positions, 3)
  );
  snowflakesGeometry.setAttribute(
    'velocity',
    new THREE.Float32BufferAttribute(snowflake_velocities, 3)
  );

  const snowflakeMaterial = new THREE.PointsMaterial({
    size: 4,
    map: snowflakesTextureLoader.load(snowflake_texture),
    blending: THREE.AdditiveBlending,
    depthTest: false,
    transparent: true,
    opacity: 0.7,
  });

  snowflakes = new THREE.Points(snowflakesGeometry, snowflakeMaterial);
  scene.add(snowflakes);

  isSnowing = true;
}

function animateSnow() {
  if (!isSnowing) {
    return;
  }

  for (let i = 0; i < numSnowflakes * 3; i += 3) {
    snowflakes.geometry.attributes.position.array[i] -=
      snowflakes.geometry.attributes.velocity.array[i];
    snowflakes.geometry.attributes.position.array[i + 1] -=
      snowflakes.geometry.attributes.velocity.array[i + 1];
    snowflakes.geometry.attributes.position.array[i + 2] -=
      snowflakes.geometry.attributes.velocity.array[i + 2];

    // Check if the snowflake is below the ground.
    if (snowflakes.geometry.attributes.position.array[i + 1] < 0) {
      snowflakes.geometry.attributes.position.array[i] = Math.floor(
        Math.random() * snowflakesMaxRange - snowflakesMinRange
      );
      snowflakes.geometry.attributes.position.array[i + 1] = Math.floor(
        Math.random() * snowflakesMinRange + snowflakesMinHeight
      );
      snowflakes.geometry.attributes.position.array[i + 2] = Math.floor(
        Math.random() * snowflakesMaxRange - snowflakesMinRange
      );
    }
  }

  snowflakes.geometry.attributes.position.needsUpdate = true;
}

function stopSnowAnimation() {
  isSnowing = false;
  snowflakes.geometry.dispose();
  snowflakes.material.dispose();
  scene.remove(snowflakes);
}

/*

function changeSeason(){


}

*/

function animate() {
  requestAnimationFrame(animate);

  water.material.uniforms['time'].value += 1.0 / 60.0;
  controls && controls.update();
  const delta = clock.getDelta();
  mixers &&
    mixers.forEach((item) => {
      item.update(delta);
    });
  const timer = Date.now() * 0.0005;
  camera && (camera.position.y += Math.sin(timer) * 0.05);

  rotateTimeOfDay();
  maintainFlyingBirds();
  animateSnow();

  fadeInSnowIsland();
  fadeOutSnowIsland();

  renderer.render(scene, camera);
}

function runProject() {
  // Initialize
  init();

  // Add objects to scene
  addWater();
  addSun();
  addIsland('green_island', green_island_model);
  addIsland('snow_island', snow_island_model);
  addLensGlow();

  animate();
}

// Run the project
runProject();
