import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { WebGLDebugger } from '@webgltools/core'
import { attachThreeAdapter } from '@webgltools/three-adapter'
import { mountOverlay } from '@webgltools/overlay'
import { createStressTestScene } from '../lib/stressTest'
import { createPostProcessingScene } from '../lib/postProcessing'
import { createInstancingScene } from '../lib/instancing'
import { createResourceLeakScene } from '../lib/resourceLeak'

type SceneType = 'basic' | 'stress' | 'postprocess' | 'instancing' | 'resourceleak'
type DebugMode = 'off' | 'sampled' | 'full'

export default function PlaygroundScene() {
  const mountRef = useRef<HTMLDivElement>(null)
  const sceneRef = useRef<THREE.Scene | null>(null)
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
  const debuggerRef = useRef<WebGLDebugger | null>(null)
  const animateRef = useRef<number>()
  const cleanupRef = useRef<(() => void) | null>(null)

  const [sceneType, setSceneType] = useState<SceneType>('basic')
  const [debugMode, setDebugMode] = useState<DebugMode>('full')
  const [objectCount, setObjectCount] = useState(100)
  const [showOverlay, setShowOverlay] = useState(true)

  useEffect(() => {
    if (!mountRef.current) return

    // Create canvas and context first
    const canvas = document.createElement('canvas')
    const gl = canvas.getContext('webgl2', { 
      antialias: true,
      powerPreference: 'high-performance'
    }) || canvas.getContext('webgl', {
      antialias: true,
      powerPreference: 'high-performance'
    })
    
    if (!gl) {
      console.error('WebGL not supported')
      return
    }

    // Initialize debugger BEFORE Three.js gets the context
    const dbg = new WebGLDebugger(gl as WebGLRenderingContext | WebGL2RenderingContext, { 
      mode: debugMode, 
      sampleRate: 0.25,
      logCreates: debugMode === 'full' 
    })
    debuggerRef.current = dbg
    
    // Debug logging
    console.log('WebGL Debugger initialized:', {
      mode: debugMode,
      glType: gl.constructor.name
    })

    // Now create renderer with our instrumented context
    const renderer = new THREE.WebGLRenderer({ 
      canvas,
      context: gl as WebGLRenderingContext,
      antialias: true,
      powerPreference: 'high-performance'
    })
    renderer.setSize(window.innerWidth, window.innerHeight)
    renderer.setPixelRatio(window.devicePixelRatio)
    mountRef.current.appendChild(canvas)
    rendererRef.current = renderer
    
    attachThreeAdapter(renderer, dbg)

    // Mount overlay
    if (showOverlay) {
      mountOverlay(dbg, undefined, ['stats', 'resources', 'timers', 'device'])
    }

    // Handle resize
    const handleResize = () => {
      renderer.setSize(window.innerWidth, window.innerHeight)
    }
    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      if (animateRef.current) cancelAnimationFrame(animateRef.current)
      renderer.dispose()
      if (mountRef.current?.contains(canvas)) {
        mountRef.current.removeChild(canvas)
      }
      dbg.unmountOverlay()
    }
  }, [debugMode, showOverlay])

  useEffect(() => {
    if (!rendererRef.current || !debuggerRef.current) return

    // Clean up previous scene
    if (cleanupRef.current) {
      cleanupRef.current()
      cleanupRef.current = null
    }
    if (animateRef.current) {
      cancelAnimationFrame(animateRef.current)
    }

    // Create new scene based on type
    let sceneSetup: ReturnType<typeof createStressTestScene>
    
    switch (sceneType) {
      case 'stress':
        sceneSetup = createStressTestScene(objectCount)
        break
      case 'postprocess':
        sceneSetup = createPostProcessingScene()
        break
      case 'instancing':
        sceneSetup = createInstancingScene(objectCount * 10)
        break
      case 'resourceleak':
        sceneSetup = createResourceLeakScene()
        break
      default:
        sceneSetup = createBasicScene(objectCount)
    }

    sceneRef.current = sceneSetup.scene
    cleanupRef.current = sceneSetup.cleanup || null

    // Animation loop
    let frameCount = 0
    const animate = () => {
      animateRef.current = requestAnimationFrame(animate)
      
      debuggerRef.current!.beginFrame()
      
      if (sceneSetup.update) {
        sceneSetup.update(debuggerRef.current!)
      }
      
      rendererRef.current!.render(sceneSetup.scene, sceneSetup.camera)
      
      debuggerRef.current!.endFrame()
      
      // Debug log every 60 frames
      frameCount++
      if (frameCount % 60 === 0) {
        const stats = debuggerRef.current!.getStats()
        console.log('Frame', frameCount, 'stats:', stats)
      }
    }
    animate()

    return () => {
      if (animateRef.current) cancelAnimationFrame(animateRef.current)
      if (cleanupRef.current) cleanupRef.current()
    }
  }, [sceneType, objectCount])

  const handleCreateResources = () => {
    if (!sceneRef.current) return
    
    // Create some test resources
    const textures = []
    for (let i = 0; i < 10; i++) {
      const texture = new THREE.Texture()
      texture.image = new ImageData(512, 512)
      texture.needsUpdate = true
      textures.push(texture)
    }

    // Create buffers
    const geometries = []
    for (let i = 0; i < 5; i++) {
      const geometry = new THREE.BufferGeometry()
      const vertices = new Float32Array(1000 * 3)
      geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3))
      geometries.push(geometry)
    }
  }

  const handleTriggerShaderError = () => {
    if (!sceneRef.current || !rendererRef.current) return
    
    // Create a shader with an error
    const material = new THREE.ShaderMaterial({
      vertexShader: `
        void main() {
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        void main() {
          undefined_function(); // This will cause an error
          gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0);
        }
      `
    })
    
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(), material)
    sceneRef.current.add(mesh)
  }

  return (
    <>
      <div ref={mountRef} style={{ width: '100vw', height: '100vh' }} />
      
      <div className="control-panel">
        <h2>WebGL Tools Playground</h2>
        
        <div className="control-group">
          <label>Scene Type</label>
          <select value={sceneType} onChange={(e) => setSceneType(e.target.value as SceneType)}>
            <option value="basic">Basic Scene</option>
            <option value="stress">Stress Test</option>
            <option value="postprocess">Post Processing</option>
            <option value="instancing">Instancing Demo</option>
            <option value="resourceleak">Resource Leak Test</option>
          </select>
        </div>

        <div className="control-group">
          <label>Debug Mode</label>
          <select value={debugMode} onChange={(e) => setDebugMode(e.target.value as DebugMode)}>
            <option value="off">Off (Production)</option>
            <option value="sampled">Sampled (25%)</option>
            <option value="full">Full (Development)</option>
          </select>
        </div>

        <div className="control-group">
          <label>
            Object Count: <span className="range-value">{objectCount}</span>
          </label>
          <input 
            type="range" 
            min="10" 
            max="1000" 
            value={objectCount}
            onChange={(e) => setObjectCount(Number(e.target.value))}
          />
        </div>

        <div className="control-group">
          <label>
            <input 
              type="checkbox" 
              checked={showOverlay}
              onChange={(e) => setShowOverlay(e.target.checked)}
            />
            {' '}Show Debug Overlay
          </label>
        </div>

        <div className="control-group">
          <button onClick={handleCreateResources}>
            Create Test Resources
          </button>
          <button onClick={handleTriggerShaderError}>
            Trigger Shader Error
          </button>
          <button onClick={() => debuggerRef.current?.pushPass('CustomPass')}>
            Push Custom Pass
          </button>
        </div>
      </div>
    </>
  )
}

function createBasicScene(count: number) {
  const scene = new THREE.Scene()
  scene.background = new THREE.Color(0x0a0a0a)
  
  const camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  )
  camera.position.set(0, 0, 10)

  // Lighting
  const ambientLight = new THREE.AmbientLight(0x404040)
  scene.add(ambientLight)
  
  const directionalLight = new THREE.DirectionalLight(0xffffff, 1)
  directionalLight.position.set(5, 5, 5)
  scene.add(directionalLight)

  // Create multiple rotating cubes
  const cubes: THREE.Mesh[] = []
  const geometry = new THREE.BoxGeometry(0.5, 0.5, 0.5)
  
  for (let i = 0; i < count; i++) {
    const material = new THREE.MeshPhongMaterial({ 
      color: new THREE.Color().setHSL(i / count, 0.5, 0.5) 
    })
    const cube = new THREE.Mesh(geometry, material)
    
    // Arrange in a grid
    const gridSize = Math.ceil(Math.sqrt(count))
    const x = (i % gridSize - gridSize / 2) * 1.5
    const y = (Math.floor(i / gridSize) - gridSize / 2) * 1.5
    cube.position.set(x, y, 0)
    
    scene.add(cube)
    cubes.push(cube)
  }

  let time = 0

  return {
    scene,
    camera,
    update: () => {
      time += 0.01
      cubes.forEach((cube, i) => {
        cube.rotation.x = time + i * 0.1
        cube.rotation.y = time * 0.5 + i * 0.1
        cube.position.z = Math.sin(time + i * 0.5) * 0.5
      })
    },
    cleanup: () => {
      geometry.dispose()
      cubes.forEach(cube => {
        (cube.material as THREE.Material).dispose()
      })
    }
  }
}