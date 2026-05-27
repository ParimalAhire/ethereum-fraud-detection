import { useEffect, useRef, useState, useCallback } from 'react'
import ForceGraph3D from 'react-force-graph-3d'
import * as THREE from 'three'

export default function TransactionGraph({ graphData, wallet }) {
  const fgRef = useRef()
  const [selected, setSelected] = useState(null)
  const [graphReady, setGraphReady] = useState(false)
  const [fg3dData, setFg3dData] = useState({ nodes: [], links: [] })

  useEffect(() => {
    if (!graphData?.nodes || !graphData?.edges) return

    // Convert React Flow format to force-graph format
    const nodes = graphData.nodes.map(n => ({
      id: n.id,
      address: n.data.address,
      score: n.data.score,
      xgb: n.data.xgb,
      sage: n.data.sage,
      isRoot: n.data.isRoot,
      color: n.data.color,
    }))

    const links = graphData.edges.map(e => ({
      source: e.source,
      target: e.target,
      score: e.data?.score || 0,
      value: e.data?.value || 0,
      color: e.style?.stroke || '#ef4444',
    }))

    setFg3dData({ nodes, links })
    setGraphReady(true)
  }, [graphData])

  // Auto rotate on load
  useEffect(() => {
    if (!graphReady || !fgRef.current) return
    let angle = 0
    const interval = setInterval(() => {
      if (fgRef.current) {
        fgRef.current.cameraPosition({
          x: 300 * Math.sin(angle),
          z: 300 * Math.cos(angle),
        })
        angle += 0.003
      }
    }, 16)
    // Stop rotation after 5 seconds
    setTimeout(() => clearInterval(interval), 5000)
    return () => clearInterval(interval)
  }, [graphReady])

  const handleNodeClick = useCallback((node) => {
    setSelected(node)
    // Zoom to clicked node
    if (fgRef.current) {
      fgRef.current.cameraPosition(
        { x: node.x + 50, y: node.y + 50, z: node.z + 100 },
        node,
        1000
      )
    }
  }, [])

  const nodeThreeObject = useCallback((node) => {
    const isRoot = node.isRoot
    const radius = isRoot ? 8 : 4
    const color = node.color || '#22c55e'

    const geometry = new THREE.SphereGeometry(radius, 16, 16)
    const material = new THREE.MeshLambertMaterial({
      color,
      transparent: true,
      opacity: isRoot ? 1.0 : 0.85,
    })
    const sphere = new THREE.Mesh(geometry, material)

    // Add glow ring for root node
    if (isRoot) {
      const ringGeo = new THREE.RingGeometry(10, 13, 32)
      const ringMat = new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.4,
        side: THREE.DoubleSide,
      })
      const ring = new THREE.Mesh(ringGeo, ringMat)
      sphere.add(ring)

      // Add star label
      const canvas = document.createElement('canvas')
      canvas.width = 64
      canvas.height = 64
      const ctx = canvas.getContext('2d')
      ctx.font = '40px Arial'
      ctx.fillStyle = 'white'
      ctx.textAlign = 'center'
      ctx.fillText('★', 32, 48)
      const texture = new THREE.CanvasTexture(canvas)
      const spriteMat = new THREE.SpriteMaterial({ map: texture })
      const sprite = new THREE.Sprite(spriteMat)
      sprite.scale.set(16, 16, 1)
      sphere.add(sprite)
    }

    return sphere
  }, [])

  return (
    <div className="relative bg-dark-800 rounded-xl border border-dark-500 overflow-hidden" style={{ height: 520 }}>
      {graphReady && (
        <ForceGraph3D
          ref={fgRef}
          graphData={fg3dData}
          nodeThreeObject={nodeThreeObject}
          nodeThreeObjectExtend={false}
          nodeLabel={node => `${node.address}\nScore: ${(node.score * 100).toFixed(1)}%`}
          onNodeClick={handleNodeClick}
          linkColor={link => link.color}
          linkWidth={link => link.score > 0.5 ? 2 : 1}
          linkDirectionalArrowLength={4}
          linkDirectionalArrowRelPos={1}
          linkDirectionalParticles={link => link.score > 0.5 ? 3 : 0}
          linkDirectionalParticleSpeed={0.006}
          linkDirectionalParticleColor={link => link.color}
          backgroundColor="#0f0f1e"
          width={window.innerWidth > 1200 ? 1100 : window.innerWidth - 60}
          height={520}
          showNavInfo={false}
        />
      )}

      {/* Legend */}
      <div className="absolute bottom-4 left-4 bg-dark-800/90 rounded-lg p-3 border border-dark-500 text-xs space-y-1 z-10">
        {[['#22c55e', 'Licit (< 0.3)'], ['#eab308', 'Suspicious (0.3–0.5)'], ['#ef4444', 'Fraud (> 0.5)']].map(([color, label]) => (
          <div key={label} className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
            <span className="text-gray-400">{label}</span>
          </div>
        ))}
        <div className="flex items-center gap-2">
          <span className="text-white">★</span>
          <span className="text-gray-400">Target wallet</span>
        </div>
        <p className="text-gray-600 mt-1">🖱 Drag to rotate · Scroll to zoom</p>
      </div>

      {/* Node detail panel */}
      {selected && (
        <div className="absolute top-4 right-4 bg-dark-800/95 rounded-lg p-3 border border-dark-500 text-xs w-56 z-10">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-400">Wallet Detail</span>
            <button onClick={() => setSelected(null)} className="text-gray-500 hover:text-white">✕</button>
          </div>
          <p className="font-mono text-blue-300 text-xs mb-2 break-all">{selected.address}</p>
          {[['Ensemble', selected.score], ['XGBoost', selected.xgb], ['GraphSAGE', selected.sage]].map(([k, v]) => (
            <div key={k} className="flex justify-between py-0.5">
              <span className="text-gray-400">{k}</span>
              <span className="font-mono" style={{ color: v > 0.5 ? '#ef4444' : v > 0.3 ? '#eab308' : '#22c55e' }}>
                {(v * 100).toFixed(1)}%
              </span>
            </div>
          ))}
          {selected.isRoot && <p className="text-blue-400 mt-2 text-center">⭐ Target Wallet</p>}
        </div>
      )}
    </div>
  )
}