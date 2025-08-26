import * as THREE from 'three'
import type { WebGLDebugger } from '@webgltools/core'

export function createPostProcessingScene() {
  const scene = new THREE.Scene()
  scene.background = new THREE.Color(0x0a0a0a)
  
  const camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  )
  camera.position.z = 5

  // Lighting
  const ambientLight = new THREE.AmbientLight(0x404040)
  scene.add(ambientLight)
  
  const pointLight = new THREE.PointLight(0xffffff, 1)
  pointLight.position.set(5, 5, 5)
  scene.add(pointLight)

  // Create multiple render targets to simulate post processing
  const renderTargets: THREE.WebGLRenderTarget[] = []
  for (let i = 0; i < 3; i++) {
    const rt = new THREE.WebGLRenderTarget(
      window.innerWidth,
      window.innerHeight,
      {
        minFilter: THREE.LinearFilter,
        magFilter: THREE.LinearFilter,
        format: THREE.RGBAFormat,
        type: THREE.FloatType
      }
    )
    renderTargets.push(rt)
  }

  // Create scene objects
  const geometry = new THREE.TorusKnotGeometry(2, 0.5, 128, 32)
  const material = new THREE.MeshPhongMaterial({
    color: 0x4a9eff,
    specular: 0xffffff,
    shininess: 100
  })
  const torusKnot = new THREE.Mesh(geometry, material)
  scene.add(torusKnot)

  // Particles
  const particlesGeometry = new THREE.BufferGeometry()
  const particleCount = 1000
  const positions = new Float32Array(particleCount * 3)
  const colors = new Float32Array(particleCount * 3)

  for (let i = 0; i < particleCount; i++) {
    const i3 = i * 3
    positions[i3] = (Math.random() - 0.5) * 10
    positions[i3 + 1] = (Math.random() - 0.5) * 10
    positions[i3 + 2] = (Math.random() - 0.5) * 10

    colors[i3] = Math.random()
    colors[i3 + 1] = Math.random()
    colors[i3 + 2] = Math.random()
  }

  particlesGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  particlesGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))

  const particlesMaterial = new THREE.PointsMaterial({
    size: 0.05,
    vertexColors: true,
    blending: THREE.AdditiveBlending
  })
  
  const particles = new THREE.Points(particlesGeometry, particlesMaterial)
  scene.add(particles)

  let time = 0

  return {
    scene,
    camera,
    update: (dbg: WebGLDebugger) => {
      time += 0.01

      // Animate torus knot
      torusKnot.rotation.x += 0.01
      torusKnot.rotation.y += 0.01

      // Animate particles
      particles.rotation.y += 0.001

      // Animate point light
      pointLight.position.x = Math.sin(time) * 5
      pointLight.position.z = Math.cos(time) * 5

      // Simulate post processing passes
      dbg.pushPass('Bloom')
      dbg.pushPass('FXAA')
      dbg.pushPass('ToneMapping')
    },
    cleanup: () => {
      geometry.dispose()
      material.dispose()
      particlesGeometry.dispose()
      particlesMaterial.dispose()
      renderTargets.forEach(rt => rt.dispose())
    }
  }
}