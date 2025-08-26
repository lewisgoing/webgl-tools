import * as THREE from 'three'
import type { WebGLDebugger } from '@webgl-tools/core'

export function createResourceLeakScene() {
  const scene = new THREE.Scene()
  scene.background = new THREE.Color(0x0a0a0a)
  
  const camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  )
  camera.position.z = 10

  // Lighting
  const ambientLight = new THREE.AmbientLight(0x404040)
  scene.add(ambientLight)
  
  const pointLight = new THREE.PointLight(0xffffff, 1)
  pointLight.position.set(5, 5, 5)
  scene.add(pointLight)

  // Arrays to track created resources
  const textures: THREE.Texture[] = []
  const geometries: THREE.BufferGeometry[] = []
  const materials: THREE.Material[] = []
  const meshes: THREE.Mesh[] = []
  
  let frameCount = 0
  let lastTextureCreation = 0
  let lastGeometryCreation = 0

  // Main object that persists
  const mainGeometry = new THREE.SphereGeometry(2, 32, 16)
  const mainMaterial = new THREE.MeshPhongMaterial({ color: 0x4a9eff })
  const mainMesh = new THREE.Mesh(mainGeometry, mainMaterial)
  scene.add(mainMesh)

  return {
    scene,
    camera,
    update: (dbg: WebGLDebugger) => {
      frameCount++

      // Rotate main mesh
      mainMesh.rotation.x += 0.01
      mainMesh.rotation.y += 0.01

      // Create a texture every 60 frames (simulating memory leak)
      if (frameCount - lastTextureCreation > 60) {
        lastTextureCreation = frameCount
        
        // Create texture without proper disposal
        const size = 512
        const data = new Uint8Array(size * size * 4)
        for (let i = 0; i < data.length; i += 4) {
          data[i] = Math.random() * 255
          data[i + 1] = Math.random() * 255
          data[i + 2] = Math.random() * 255
          data[i + 3] = 255
        }
        
        const texture = new THREE.DataTexture(data, size, size)
        texture.needsUpdate = true
        textures.push(texture)

        // Create material using the texture (also leaking)
        const material = new THREE.MeshBasicMaterial({ map: texture })
        materials.push(material)

        dbg.incCustom('texturesCreated', 1)
      }

      // Create geometry every 120 frames
      if (frameCount - lastGeometryCreation > 120) {
        lastGeometryCreation = frameCount

        // Create random geometry
        const geometry = new THREE.BufferGeometry()
        const vertices = new Float32Array(300)
        for (let i = 0; i < vertices.length; i++) {
          vertices[i] = (Math.random() - 0.5) * 10
        }
        geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3))
        geometries.push(geometry)

        // Create mesh with the geometry
        const material = new THREE.MeshBasicMaterial({ 
          color: new THREE.Color().setHSL(Math.random(), 0.5, 0.5),
          wireframe: true
        })
        const mesh = new THREE.Mesh(geometry, material)
        mesh.position.set(
          (Math.random() - 0.5) * 20,
          (Math.random() - 0.5) * 20,
          (Math.random() - 0.5) * 20
        )
        scene.add(mesh)
        meshes.push(mesh)
        materials.push(material)

        dbg.incCustom('geometriesCreated', 1)
      }

      // Remove some meshes but "forget" to dispose resources
      if (meshes.length > 10 && frameCount % 200 === 0) {
        const mesh = meshes.shift()
        if (mesh) {
          scene.remove(mesh)
          // NOTE: Intentionally not disposing geometry/material to simulate leak
          dbg.incCustom('meshesRemoved', 1)
        }
      }

      // Track leaked resources
      dbg.incCustom('leakedTextures', textures.length)
      dbg.incCustom('leakedGeometries', geometries.length)
    },
    cleanup: () => {
      // Proper cleanup when switching scenes
      mainGeometry.dispose()
      mainMaterial.dispose()
      
      textures.forEach(t => t.dispose())
      geometries.forEach(g => g.dispose())
      materials.forEach(m => {
        const mat = m as THREE.Material & { map?: THREE.Texture }
        if (mat.map) mat.map.dispose()
        mat.dispose()
      })
    }
  }
}