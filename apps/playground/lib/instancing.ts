import * as THREE from 'three'
import type { WebGLDebugger } from '@webgltools/core'

export function createInstancingScene(count: number) {
  const scene = new THREE.Scene()
  scene.background = new THREE.Color(0x0a0a0a)
  
  const camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  )
  camera.position.set(0, 0, 30)

  // Lighting
  const ambientLight = new THREE.AmbientLight(0x404040)
  scene.add(ambientLight)
  
  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8)
  directionalLight.position.set(5, 5, 5)
  scene.add(directionalLight)

  // Create instanced mesh
  const geometry = new THREE.BoxGeometry(0.5, 0.5, 0.5)
  const material = new THREE.MeshPhongMaterial({ 
    color: 0xffffff,
    emissive: 0x4a9eff,
    emissiveIntensity: 0.2
  })

  const mesh = new THREE.InstancedMesh(geometry, material, count)
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
  scene.add(mesh)

  // Set initial positions
  const matrix = new THREE.Matrix4()
  const position = new THREE.Vector3()
  const rotation = new THREE.Euler()
  const quaternion = new THREE.Quaternion()
  const scale = new THREE.Vector3()
  const color = new THREE.Color()

  for (let i = 0; i < count; i++) {
    position.set(
      (Math.random() - 0.5) * 40,
      (Math.random() - 0.5) * 40,
      (Math.random() - 0.5) * 40
    )
    
    rotation.set(
      Math.random() * Math.PI,
      Math.random() * Math.PI,
      Math.random() * Math.PI
    )
    
    quaternion.setFromEuler(rotation)
    scale.setScalar(0.5 + Math.random() * 1)
    
    matrix.compose(position, quaternion, scale)
    mesh.setMatrixAt(i, matrix)
    
    // Set color
    color.setHSL(i / count, 0.5, 0.5)
    mesh.setColorAt(i, color)
  }
  mesh.instanceMatrix.needsUpdate = true
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true

  // Store instance data for animation
  const instanceData = new Array(count).fill(0).map(() => ({
    position: new THREE.Vector3(
      (Math.random() - 0.5) * 40,
      (Math.random() - 0.5) * 40,
      (Math.random() - 0.5) * 40
    ),
    rotation: new THREE.Euler(
      Math.random() * Math.PI,
      Math.random() * Math.PI,
      Math.random() * Math.PI
    ),
    scale: 0.5 + Math.random() * 1,
    speed: 0.01 + Math.random() * 0.02
  }))

  let time = 0

  return {
    scene,
    camera,
    update: (dbg: WebGLDebugger) => {
      time += 0.01

      // Update instances
      for (let i = 0; i < count; i++) {
        const data = instanceData[i]
        
        // Animate position
        data.position.y += Math.sin(time + i * 0.1) * 0.05
        
        // Animate rotation
        data.rotation.x += data.speed
        data.rotation.y += data.speed * 0.5
        
        // Update matrix
        quaternion.setFromEuler(data.rotation)
        scale.setScalar(data.scale * (1 + Math.sin(time + i) * 0.1))
        
        matrix.compose(data.position, quaternion, scale)
        mesh.setMatrixAt(i, matrix)
      }
      
      mesh.instanceMatrix.needsUpdate = true

      // Rotate camera
      camera.position.x = Math.sin(time * 0.3) * 30
      camera.position.z = Math.cos(time * 0.3) * 30
      camera.lookAt(0, 0, 0)

      // Track custom metric
      dbg.incCustom('instancesAnimated', count)
    },
    cleanup: () => {
      geometry.dispose()
      material.dispose()
    }
  }
}