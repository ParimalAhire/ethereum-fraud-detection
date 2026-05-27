import ReactFlow, {
  Background, Controls, MiniMap, useNodesState, useEdgesState, Handle, Position,
} from 'reactflow'
import { useEffect, useCallback, useState } from 'react'
import 'reactflow/dist/style.css'

// Custom fraud node
function FraudNode({ data }) {
  const size = data.isRoot ? 'w-10 h-10 border-2' : 'w-7 h-7'
  return (
    <div
      className={`${size} rounded-full flex items-center justify-center cursor-pointer border`}
      style={{
        backgroundColor: data.color + '33',
        borderColor: data.color,
        boxShadow: data.isRoot ? `0 0 12px ${data.color}` : 'none',
      }}
      title={`${data.address}\nScore: ${data.score}`}
    >
      <Handle type="target" position={Position.Top} style={{ opacity: 0, width: 0, height: 0 }} />
      <Handle type="source" position={Position.Bottom} style={{ opacity: 0, width: 0, height: 0 }} />
      {data.isRoot && <span className="text-white text-xs">★</span>}
    </div>
  )
}

const nodeTypes = { fraudNode: FraudNode }

export default function TransactionGraph({ graphData, wallet }) {
  const [nodes, setNodes, onNodesChange] = useNodesState([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])
  const [selected, setSelected] = useState(null)

  useEffect(() => {
    if (graphData?.nodes && graphData?.edges) {
      setNodes(graphData.nodes)

      // Format edges properly for React Flow
      const formattedEdges = graphData.edges.map(e => ({
        ...e,
        type: 'default',
        markerEnd: {
          type: 'arrowclosed',
          color: e.style?.stroke || '#ef4444',
        },
        style: {
          ...e.style,
          strokeWidth: e.style?.stroke === '#ef4444' ? 2 : 1,
          opacity: 0.8,
        },
      }))
      setEdges(formattedEdges)
    }
  }, [graphData])

  const onNodeClick = useCallback((_, node) => setSelected(node.data), [])

  return (
    <div className="relative bg-dark-800 rounded-xl border border-dark-500 overflow-hidden" style={{ height: 520 }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        nodeTypes={nodeTypes}
        fitView
        attributionPosition="bottom-left"
        defaultEdgeOptions={{
          type: 'default',
          style: { strokeWidth: 1.5, opacity: 0.8 },
        }}
      >
        <Background color="#1f2a4a" gap={20} />
        <Controls className="bg-dark-700 border-dark-500" />
        <MiniMap
          nodeColor={n => n.data?.color || '#6b7280'}
          maskColor="#0f0f1eaa"
          className="bg-dark-700 border border-dark-500 rounded-lg"
        />
      </ReactFlow>

      {/* Legend */}
      <div className="absolute bottom-4 left-4 bg-dark-800/90 rounded-lg p-3 border border-dark-500 text-xs space-y-1">
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
      </div>

      {/* Node detail panel */}
      {selected && (
        <div className="absolute top-4 right-4 bg-dark-800/95 rounded-lg p-3 border border-dark-500 text-xs w-56">
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