import React, { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { SparkRenderer, SplatMesh, dyno } from "@sparkjsdev/spark";
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'

export type GaussianData = {
  positions: number[][]
  colors: number[][]
  sizes: number[]
  opacities: number[]
  ply_url?: string
} | null

export type EffectType = 'None' | 'Magic' | 'Spread' | 'Unroll' | 'Twister' | 'Rain';

export function GaussianViewer({ 
  data, 
  pointScale = 1.0, 
  modelScale = 1.0,
  effect = 'None',
  effectDirection = 'Y',
  resetAnimTrigger = 0,
  showAxes = true,
  showGrid = true,
  cameraViewTrigger = null,
  audioData = {bass: 0, mid: 0, high: 0},
  audioVisualization = 'none'
}: { 
  data: GaussianData, 
  pointScale?: number, 
  modelScale?: number,
  effect?: EffectType,
  effectDirection?: 'X' | 'Y' | 'Z',
  resetAnimTrigger?: number,
  showAxes?: boolean,
  showGrid?: boolean,
  cameraViewTrigger?: {view: string, timestamp: number} | null,
  audioData?: {bass: number, mid: number, high: number},
  audioVisualization?: 'none' | 'pulse' | 'wave' | 'explode'
}) {
  const mountRef = useRef<HTMLDivElement>(null)
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
  const sceneRef = useRef<THREE.Scene | null>(null)
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null)
  const sparkRef = useRef<SparkRenderer | null>(null)
  const splatMeshRef = useRef<SplatMesh | null>(null)
  const controlsRef = useRef<OrbitControls | null>(null)
  const gridRef = useRef<THREE.GridHelper | null>(null)
  const axesRef = useRef<THREE.Group | null>(null)
  
  const animateTRef = useRef<any>(null)
  const pointScaleRef = useRef<any>(null)
  const centerOffsetXRef = useRef<any>(null)
  const centerOffsetYRef = useRef<any>(null)
  const centerOffsetZRef = useRef<any>(null)
  const baseTimeRef = useRef(0)
  const sceneCenterRef = useRef<THREE.Vector3>(new THREE.Vector3())
  const audioBassRef = useRef<any>(null)
  const audioMidRef = useRef<any>(null)
  const audioHighRef = useRef<any>(null)

  useEffect(() => {
    if (gridRef.current) gridRef.current.visible = showGrid
    if (axesRef.current) axesRef.current.visible = showAxes
  }, [showAxes, showGrid])

  useEffect(() => {
    baseTimeRef.current = 0
  }, [resetAnimTrigger])

  useEffect(() => {
    if (splatMeshRef.current && pointScaleRef.current) {
      pointScaleRef.current.value = pointScale / 80.0
      splatMeshRef.current.updateVersion()
    }
  }, [pointScale])

  useEffect(() => {
    if (splatMeshRef.current) {
      let s = modelScale
      
      // Apply audio visualization scaling
      if (audioVisualization === 'pulse') {
        s *= (1 + audioData.bass * 1.2)
      } else if (audioVisualization === 'explode') {
        s *= (1 + audioData.bass * 1.0)
      }
      
      splatMeshRef.current.scale.set(s, s, s)
    }
    
    // Update audio dyno refs
    if (audioBassRef.current) audioBassRef.current.value = audioData.bass
    if (audioMidRef.current) audioMidRef.current.value = audioData.mid
    if (audioHighRef.current) audioHighRef.current.value = audioData.high
    if (splatMeshRef.current && (audioVisualization === 'wave' || audioVisualization === 'pulse')) {
      splatMeshRef.current.updateVersion()
    }
  }, [modelScale, audioData, audioVisualization])

  useEffect(() => {
    const mount = mountRef.current!
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setPixelRatio(window.devicePixelRatio)
    renderer.setSize(mount.clientWidth, mount.clientHeight)
    mount.appendChild(renderer.domElement)

    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x111111)

    const camera = new THREE.PerspectiveCamera(60, mount.clientWidth / mount.clientHeight, 0.01, 100)
    camera.position.set(0, 0, 4)

    const grid = new THREE.GridHelper(20, 20)
    grid.position.set(0, 0, 0)
    scene.add(grid)
    // Ensure initial visibility follows the prop value
    grid.visible = showGrid
    gridRef.current = grid

    const axesGroup = new THREE.Group()
    const axesHelper = new THREE.AxesHelper(2)
    axesGroup.add(axesHelper)
    
    const arrowGeometry = new THREE.ConeGeometry(0.03, 0.12, 8)
    const xArrow = new THREE.Mesh(arrowGeometry, new THREE.MeshBasicMaterial({ color: 0xff0000 }))
    xArrow.position.set(2.06, 0, 0)
    xArrow.rotation.z = -Math.PI / 2
    axesGroup.add(xArrow)
    
    const yArrow = new THREE.Mesh(arrowGeometry, new THREE.MeshBasicMaterial({ color: 0x00ff00 }))
    yArrow.position.set(0, 2.06, 0)
    axesGroup.add(yArrow)
    
    const zArrow = new THREE.Mesh(arrowGeometry, new THREE.MeshBasicMaterial({ color: 0x0000ff }))
    zArrow.position.set(0, 0, 2.06)
    zArrow.rotation.x = Math.PI / 2
    axesGroup.add(zArrow)
    
    // Add text labels
    const createTextSprite = (text: string, color: string) => {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')!
      canvas.width = 64
      canvas.height = 64
      
      ctx.fillStyle = color
      ctx.font = 'bold 48px Arial'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(text, 32, 32)
      
      const texture = new THREE.CanvasTexture(canvas)
      const material = new THREE.SpriteMaterial({ map: texture, depthTest: false })
      const sprite = new THREE.Sprite(material)
      sprite.scale.set(0.3, 0.3, 1)
      return sprite
    }
    
    const xLabel = createTextSprite('X', '#ff0000')
    xLabel.position.set(2.3, 0, 0)
    axesGroup.add(xLabel)
    
    const yLabel = createTextSprite('Y', '#00ff00')
    yLabel.position.set(0, 2.3, 0)
    axesGroup.add(yLabel)
    
    const zLabel = createTextSprite('Z', '#0000ff')
    zLabel.position.set(0, 0, 2.3)
    axesGroup.add(zLabel)
    
    scene.add(axesGroup)
    // Ensure initial visibility follows the prop value
    axesGroup.visible = showAxes
    axesRef.current = axesGroup

    const spark = new SparkRenderer({ renderer, maxStdDev: 1.0, focalDistance: 4.0 })
    scene.add(spark)
    sparkRef.current = spark

    const controls = new OrbitControls(camera, renderer.domElement)
    controls.target.set(0, 0, 0)
    controls.enableDamping = true
    controls.dampingFactor = 0.05
    controls.enablePan = false
    controls.minDistance = 1
    controls.maxDistance = 50
    controlsRef.current = controls

    rendererRef.current = renderer
    sceneRef.current = scene
    cameraRef.current = camera

    const onResize = () => {
      if (!rendererRef.current || !cameraRef.current) return
      const w = mount.clientWidth, h = mount.clientHeight
      rendererRef.current.setSize(w, h)
      cameraRef.current.aspect = w / h
      cameraRef.current.updateProjectionMatrix()
    }
    const obs = new ResizeObserver(onResize)
    obs.observe(mount)

    renderer.setAnimationLoop(() => {
      if (controlsRef.current) controlsRef.current.update()
      
      if (splatMeshRef.current && animateTRef.current) {
        baseTimeRef.current += 1/60
        animateTRef.current.value = baseTimeRef.current
        splatMeshRef.current.updateVersion()
      }

      renderer.render(scene, camera)
    })

    return () => {
      renderer.setAnimationLoop(null)
      obs.disconnect()
      renderer.dispose()
      mount.removeChild(renderer.domElement)
    }
  }, [])

  useEffect(() => {
    const scene = sceneRef.current
    if (!scene || !data?.ply_url || !sparkRef.current) return

    if (splatMeshRef.current) {
      sparkRef.current.remove(splatMeshRef.current)
      splatMeshRef.current = null
    }

    const mesh = new SplatMesh({ url: data.ply_url })
    const s = modelScale
    mesh.scale.set(s, s, s)
    mesh.quaternion.set(1, 0, 0, 0)
    mesh.position.set(0, 0, 0)

    // Calculate center for proper centering at origin
    const center = new THREE.Vector3()
    if (data.positions && data.positions.length > 0) {
      data.positions.forEach(pos => {
        center.x += pos[0]
        center.y += pos[1]
        center.z += pos[2]
      })
      center.divideScalar(data.positions.length)
      sceneCenterRef.current.copy(center)
    }
    
    pointScaleRef.current = dyno.dynoFloat(pointScale / 80.0)
    centerOffsetXRef.current = dyno.dynoFloat(center.x)
    centerOffsetYRef.current = dyno.dynoFloat(center.y)
    centerOffsetZRef.current = dyno.dynoFloat(center.z)

    if (effect !== 'None') {
        animateTRef.current = dyno.dynoFloat(0)
        baseTimeRef.current = 0

        // Adjust rotation/scale for specific effects, but don't override position
        if (effect === "Twister" || effect === "Rain" || effect === "Unroll") {
            mesh.rotation.x = Math.PI
            
            if (effect === "Twister" || effect === "Rain") {
                mesh.scale.set(s * 0.8, s * 0.8, s * 0.8)
            } else {
                mesh.scale.set(s * 1.5, s * 1.5, s * 1.5)
            }
        }

        const effectTypeInt = effect === "Magic" ? 1 : 
                              effect === "Spread" ? 2 : 
                              effect === "Unroll" ? 3 : 
                              effect === "Twister" ? 4 : 5;
        
        const dirInt = effectDirection === 'X' ? 0 : effectDirection === 'Y' ? 1 : 2;

        mesh.objectModifier = dyno.dynoBlock(
            { gsplat: dyno.Gsplat },
            { gsplat: dyno.Gsplat },
            ({ gsplat }) => {
                const d = new dyno.Dyno({
                    inTypes: { gsplat: dyno.Gsplat, t: "float", pScale: "float", centerX: "float", centerY: "float", centerZ: "float", effectType: "int", dir: "int" },
                    outTypes: { gsplat: dyno.Gsplat },
                    globals: () => [
                        dyno.unindent(`
                          // Pseudo-random hash function
                          vec3 hash(vec3 p) {
                            p = fract(p * 0.3183099 + 0.1);
                            p *= 17.0;
                            return fract(vec3(p.x * p.y * p.z, p.x + p.y * p.z, p.x * p.y + p.z));
                          }
            
                          // 3D Perlin-style noise function
                          vec3 noise(vec3 p) {
                            vec3 i = floor(p);
                            vec3 f = fract(p);
                            f = f * f * (3.0 - 2.0 * f);
                            
                            vec3 n000 = hash(i + vec3(0,0,0));
                            vec3 n100 = hash(i + vec3(1,0,0));
                            vec3 n010 = hash(i + vec3(0,1,0));
                            vec3 n110 = hash(i + vec3(1,1,0));
                            vec3 n001 = hash(i + vec3(0,0,1));
                            vec3 n101 = hash(i + vec3(1,0,1));
                            vec3 n011 = hash(i + vec3(0,1,1));
                            vec3 n111 = hash(i + vec3(1,1,1));
                            
                            vec3 x0 = mix(n000, n100, f.x);
                            vec3 x1 = mix(n010, n110, f.x);
                            vec3 x2 = mix(n001, n101, f.x);
                            vec3 x3 = mix(n011, n111, f.x);
                            
                            vec3 y0 = mix(x0, x1, f.y);
                            vec3 y1 = mix(x2, x3, f.y);
                            
                            return mix(y0, y1, f.z);
                          }
            
                          // 2D rotation matrix
                          mat2 rot(float a) {
                            float s=sin(a),c=cos(a);
                            return mat2(c,-s,s,c);
                          }

                          // Helper to swap coordinates to Canonical Y-Major space
                          vec3 toCanonical(vec3 p, int dir) {
                            if (dir == 0) return vec3(p.y, p.x, p.z); // X -> Y
                            if (dir == 2) return vec3(p.x, p.z, p.y); // Z -> Y
                            return p; // Y -> Y
                          }

                          // Helper to swap coordinates back from Canonical Y-Major space
                          vec3 fromCanonical(vec3 p, int dir) {
                            if (dir == 0) return vec3(p.y, p.x, p.z); // Y -> X
                            if (dir == 2) return vec3(p.x, p.z, p.y); // Y -> Z
                            return p; // Y -> Y
                          }

                          // Twister weather effect (Canonical: Vortex in XZ, Depth in Y)
                          // But wait, our previous logic was: Vortex in XY, Depth in Z.
                          // Let's standardize to: "Along" axis is Y.
                          // So Vortex in XZ (Cross), Depth/Twist along Y (Along).
                          vec4 twister(vec3 pos, vec3 scale, float t) {
                            vec3 h = hash(pos);
                            // Use length(pos.xz) for radius (Cross plane)
                            float s = smoothstep(0., 8., t*t*.1 - length(pos.xz)*2.+2.);
                            // Twist affects Y (Along) based on XZ radius
                            if (length(scale) < .05) pos.y = mix(-10., pos.y, pow(s, 2.*h.x));
                            // Swirl XZ plane
                            pos.xz = mix(pos.xz*.5, pos.xz, pow(s, 2.*h.x));
                            float rotationTime = t * (1.0 - s) * 0.2;
                            pos.xz *= rot(rotationTime + pos.y*20.*(1.-s)*exp(-1.*length(pos.xz)));
                            return vec4(pos, s*s*s*s);
                          }
            
                          // Rain weather effect (Canonical: Falls along Y)
                          vec4 rain(vec3 pos, vec3 scale, float t) {
                            vec3 h = hash(pos);
                            // Use length(pos.xz) to distribute rain across the cross plane
                            float s = pow(smoothstep(0., 5., t*t*.1 - length(pos.xz)*2. + 1.), .5 + h.x);
                            float y = pos.y;
                            // Fall along Y
                            pos.y = min(-10. + s*15., pos.y);
                            // Jitter XZ
                            pos.xz = mix(pos.xz*.3, pos.xz, s);
                            // Rotate XZ (swirl rain)
                            pos.xz *= rot(t*.3);
                            return vec4(pos, smoothstep(-10., y, pos.y));
                          }
                        `)
                    ],
                    statements: ({ inputs, outputs }) => dyno.unindentLines(`
                        ${outputs.gsplat} = ${inputs.gsplat};
                        float t = ${inputs.t};
                        float pScale = ${inputs.pScale};
                        vec3 centerOffset = vec3(${inputs.centerX}, ${inputs.centerY}, ${inputs.centerZ});
                        int dir = ${inputs.dir};
                        float s = smoothstep(0.,10.,t-4.5)*10.;
                        vec3 scales = ${inputs.gsplat}.scales * pScale;
                        vec3 localPos = ${inputs.gsplat}.center - centerOffset;
                        float l = length(localPos.xz);
                        
                        if (${inputs.effectType} == 1) {
                          // Magic Effect - Direction-aware reveal
                          // Convert to canonical space based on direction
                          vec3 p = toCanonical(localPos, dir);
                          
                          // Calculate distance in XZ plane (canonical space treats Y as major axis)
                          float l = length(p.xz);
                          float border = abs(s-l-.5);
                          p *= 1.-.2*exp(-20.*border);
                          vec3 finalScales = mix(scales,vec3(0.002 * pScale),smoothstep(s-.5,s,l+.5));
                          
                          // Convert back to world space
                          vec3 worldPos = fromCanonical(p, dir);
                          ${outputs.gsplat}.center = worldPos + .1*noise(worldPos.xyz*2.+t*.5)*smoothstep(s-.5,s,l+.5);
                          ${outputs.gsplat}.scales = finalScales;
                          
                          // Calculate angle in canonical space
                          float at = atan(p.x,p.z)/3.1416 + 1.0;
                          ${outputs.gsplat}.rgba *= step(at,t-2.1416);
                          ${outputs.gsplat}.rgba += exp(-20.*border) + exp(-50.*abs(t-at-2.1416))*.5;
                          
                        } else if (${inputs.effectType} == 2) {
                          // Spread Effect - Direction-aware expansion
                          // Convert to canonical space
                          vec3 p = toCanonical(localPos, dir);
                          float l = length(p.xz);
                          
                          float tt = t*t*.4+.5;
                          p.xz *= min(1.,.3+max(0.,tt*.05));
                          
                          // Convert back to world space
                          ${outputs.gsplat}.center = fromCanonical(p, dir);
                          ${outputs.gsplat}.scales = max(mix(vec3(0.0),scales,min(tt-7.-l*2.5,1.)),mix(vec3(0.0),scales*.2,min(tt-1.-l*2.,1.)));
                          ${outputs.gsplat}.rgba = mix(vec4(.3),${inputs.gsplat}.rgba,clamp(tt-l*2.5-3.,0.,1.));
                          
                        } else {
                          // Directional Effects: Unroll, Twister, Rain
                          // 1. Swap to Canonical Y-Major Space
                          vec3 p = toCanonical(localPos, dir);
                          vec3 s_can = toCanonical(scales, dir);

                          if (${inputs.effectType} == 3) {
                            // Unroll Effect (Canonical: Unroll along Y, Curl XZ)
                            p.xz *= rot((p.y*50.-20.)*exp(-t));
                            p = p * (1.-exp(-t)*2.);
                            s_can = mix(vec3(0.002 * pScale), s_can, smoothstep(.3,.7,t+p.y-2.));
                            ${outputs.gsplat}.rgba = ${inputs.gsplat}.rgba*step(0.,t*.5+p.y-.5);
                          } else if (${inputs.effectType} == 4) {
                            // Twister Effect
                            vec4 res = twister(p, s_can, t);
                            p = res.xyz;
                            s_can = mix(vec3(.002 * pScale), s_can, pow(res.w, 12.));
                            
                            // Rotation
                            float spin = -t * 0.3 * (1.0 - res.w);
                            vec4 spinQ;
                            if (dir == 0) spinQ = vec4(sin(spin*0.5), 0.0, 0.0, cos(spin*0.5)); // X
                            else if (dir == 2) spinQ = vec4(0.0, 0.0, sin(spin*0.5), cos(spin*0.5)); // Z
                            else spinQ = vec4(0.0, sin(spin*0.5), 0.0, cos(spin*0.5)); // Y
                            
                            ${outputs.gsplat}.quaternion = quatQuat(spinQ, ${inputs.gsplat}.quaternion);

                          } else if (${inputs.effectType} == 5) {
                            // Rain Effect
                            vec4 res = rain(p, s_can, t);
                            p = res.xyz;
                            s_can = mix(vec3(.005 * pScale), s_can, pow(res.w, 30.));
                            
                            // Rotation
                            float spin = -t*.3;
                            vec4 spinQ;
                            if (dir == 0) spinQ = vec4(sin(spin*0.5), 0.0, 0.0, cos(spin*0.5)); // X
                            else if (dir == 2) spinQ = vec4(0.0, 0.0, sin(spin*0.5), cos(spin*0.5)); // Z
                            else spinQ = vec4(0.0, sin(spin*0.5), 0.0, cos(spin*0.5)); // Y

                            ${outputs.gsplat}.quaternion = quatQuat(spinQ, ${inputs.gsplat}.quaternion);
                          }

                          // 2. Swap back from Canonical
                          ${outputs.gsplat}.center = fromCanonical(p, dir);
                          ${outputs.gsplat}.scales = fromCanonical(s_can, dir);
                        }
                    `)
                });
                return d.apply({
                    gsplat,
                    t: animateTRef.current,
                    pScale: pointScaleRef.current,
                    centerX: centerOffsetXRef.current,
                    centerY: centerOffsetYRef.current,
                    centerZ: centerOffsetZRef.current,
                    effectType: dyno.dynoInt(effectTypeInt),
                    dir: dyno.dynoInt(dirInt)
                });
            }
        );
        mesh.updateGenerator()
    } else {
        animateTRef.current = null
        // Initialize audio dyno refs
        audioBassRef.current = dyno.dynoFloat(0)
        audioMidRef.current = dyno.dynoFloat(0)
        audioHighRef.current = dyno.dynoFloat(0)
        
        // Apply point scale and audio wave effect
        mesh.objectModifier = dyno.dynoBlock(
          { gsplat: dyno.Gsplat },
          { gsplat: dyno.Gsplat },
          ({ gsplat }) => {
            const d = new dyno.Dyno({
              inTypes: { gsplat: dyno.Gsplat, pScale: "float", centerX: "float", centerY: "float", centerZ: "float", audioBass: "float", audioMid: "float", audioHigh: "float" },
              outTypes: { gsplat: dyno.Gsplat },
              statements: ({ inputs, outputs }) => dyno.unindentLines(`
                ${outputs.gsplat} = ${inputs.gsplat};
                vec3 centerOffset = vec3(${inputs.centerX}, ${inputs.centerY}, ${inputs.centerZ});
                vec3 localPos = ${inputs.gsplat}.center - centerOffset;
                
                // Wave audio visualization
                if (${inputs.audioBass} > 0.01) {
                  float dist = length(localPos.xz);
                  float waveOffset = sin(dist * 3.0 - ${inputs.audioBass} * 10.0) * ${inputs.audioBass} * 0.3;
                  localPos.y += waveOffset;
                }
                
                // Pulse explosion effect - scatter outward based on mid frequency
                vec3 direction = normalize(localPos + vec3(0.001)); // Add small offset to avoid zero vector
                float explosionForce = ${inputs.audioMid} * 2.0;
                localPos += direction * explosionForce;
                
                ${outputs.gsplat}.center = localPos;
                ${outputs.gsplat}.scales = ${inputs.gsplat}.scales * ${inputs.pScale};
              `)
            })
            return d.apply({ 
              gsplat, 
              pScale: pointScaleRef.current, 
              centerX: centerOffsetXRef.current,
              centerY: centerOffsetYRef.current,
              centerZ: centerOffsetZRef.current,
              audioBass: audioBassRef.current,
              audioMid: audioMidRef.current,
              audioHigh: audioHighRef.current
            })
          }
        )
        mesh.updateGenerator()
    }

    sparkRef.current.add(mesh)
    splatMeshRef.current = mesh

    // Update OrbitControls to look at origin (where the centered mesh is)
    if (controlsRef.current) {
      controlsRef.current.target.set(0, 0, 0)
      controlsRef.current.update()
    }
  }, [data?.ply_url, effect, effectDirection, modelScale, pointScale])

  // Camera view switching
  useEffect(() => {
    if (!cameraViewTrigger || !cameraRef.current || !controlsRef.current) return

    const camera = cameraRef.current
    const controls = controlsRef.current
    const distance = 5

    switch (cameraViewTrigger.view) {
      case 'front':
        camera.position.set(0, 0, distance)
        break
      case 'left':
        camera.position.set(-distance, 0, 0)
        break
      case 'right':
        camera.position.set(distance, 0, 0)
        break
      case 'top':
        camera.position.set(0, distance, 0)
        break
    }

    controls.target.set(0, 0, 0)
    controls.update()
  }, [cameraViewTrigger])

  return <div ref={mountRef} style={{ position: 'absolute', inset: 0 }} />
}
