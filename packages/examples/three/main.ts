import * as THREE from 'three';
import { WebGLDebugger } from '@webgltools/core';
import { attachThreeAdapter } from '@webgltools/three-adapter';

// Create scene
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Initialize debugger
const gl = renderer.getContext();
const dbg = new WebGLDebugger(gl, { mode: 'full', logCreates: false });
attachThreeAdapter(renderer, dbg);

// Create a cube
const geometry = new THREE.BoxGeometry();
const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
const cube = new THREE.Mesh(geometry, material);
scene.add(cube);

camera.position.z = 5;

// Animation loop
function animate() {
  requestAnimationFrame(animate);
  
  dbg.beginFrame();
  
  cube.rotation.x += 0.01;
  cube.rotation.y += 0.01;
  
  renderer.render(scene, camera);
  
  dbg.endFrame();
}

animate();

// Mount overlay
import('@webgltools/overlay').then(({ mountOverlay }) => 
  mountOverlay(dbg, undefined, ['stats', 'resources', 'timers', 'device'])
);