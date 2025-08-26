import * as THREE from 'three'
import type { WebGLDebugger } from '@webgl-tools/core'

export function createStressTestScene(count: number) {
  const scene = new THREE.Scene()
  scene.background = new THREE.Color(0x0a0a0a)
  scene.fog = new THREE.Fog(0x0a0a0a, 10, 50)
  
  const camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  )
  camera.position.set(0, 5, 10)
  camera.lookAt(0, 0, 0)

  // Lighting
  const ambientLight = new THREE.AmbientLight(0x404040)
  scene.add(ambientLight)
  
  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5)
  directionalLight.position.set(10, 10, 5)
  directionalLight.castShadow = true
  scene.add(directionalLight)

  // Create many objects with different materials
  const meshes: THREE.Mesh[] = []
  const geometries = [
    new THREE.BoxGeometry(1, 1, 1),
    new THREE.SphereGeometry(0.5, 32, 16),
    new THREE.ConeGeometry(0.5, 1, 32),
    new THREE.TorusGeometry(0.5, 0.2, 16, 32),
  ]

  const materials = [
    new THREE.MeshPhongMaterial({ color: 0xff0000 }),
    new THREE.MeshPhongMaterial({ color: 0x00ff00 }),
    new THREE.MeshPhongMaterial({ color: 0x0000ff }),
    new THREE.MeshPhongMaterial({ color: 0xffff00 }),
    new THREE.MeshPhongMaterial({ color: 0xff00ff }),
    new THREE.MeshPhongMaterial({ color: 0x00ffff }),
  ]

  for (let i = 0; i < count; i++) {
    const geometry = geometries[i % geometries.length]
    const material = materials[i % materials.length]
    const mesh = new THREE.Mesh(geometry, material)
    
    mesh.position.set(
      (Math.random() - 0.5) * 20,
      (Math.random() - 0.5) * 10,
      (Math.random() - 0.5) * 20
    )
    
    mesh.rotation.set(
      Math.random() * Math.PI,
      Math.random() * Math.PI,
      Math.random() * Math.PI
    )
    
    mesh.scale.setScalar(0.5 + Math.random() * 0.5)
    
    scene.add(mesh)
    meshes.push(mesh)
  }

  // Add ground plane
  const planeGeometry = new THREE.PlaneGeometry(50, 50)
  const planeMaterial = new THREE.MeshPhongMaterial({ color: 0x222222 })
  const plane = new THREE.Mesh(planeGeometry, planeMaterial)
  plane.rotation.x = -Math.PI / 2
  plane.position.y = -5
  scene.add(plane)

  let time = 0

  return {
    scene,
    camera,
    update: (dbg: WebGLDebugger) => {
      time += 0.01
      
      // Rotate all meshes
      meshes.forEach((mesh, i) => {
        mesh.rotation.x += 0.01 * (1 + (i % 3))
        mesh.rotation.y += 0.01 * (1 + (i % 5))
        mesh.position.y += Math.sin(time + i) * 0.01
      })

      // Move camera
      camera.position.x = Math.sin(time * 0.5) * 15
      camera.position.z = Math.cos(time * 0.5) * 15
      camera.lookAt(0, 0, 0)

      // Custom metrics
      dbg.incCustom('meshesAnimated', meshes.length)
    },
    cleanup: () => {
      // Dispose geometries and materials
      geometries.forEach(g => g.dispose())
      materials.forEach(m => m.dispose())
    }
  }
}