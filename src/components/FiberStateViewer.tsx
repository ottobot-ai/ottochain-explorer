import { useMemo, useRef, useEffect, useState } from 'react';

interface StateDefinition {
  name: string;
  metadata?: { description?: string };
  actions?: Array<{
    eventName: string;
    target: string;
    guards?: unknown[];
  }>;
}

interface StateMachineDefinition {
  metadata?: { name?: string; description?: string };
  initialState: string;
  states: Record<string, StateDefinition>;
}

interface FiberStateViewerProps {
  definition: StateMachineDefinition;
  currentState: string;
  className?: string;
  onStateClick?: (stateName: string) => void;
}

interface NodePosition {
  x: number;
  y: number;
  state: string;
}

interface Edge {
  from: string;
  to: string;
  label: string;
}

export function FiberStateViewer({ 
  definition, 
  currentState, 
  className = '',
  onStateClick 
}: FiberStateViewerProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [hoveredState, setHoveredState] = useState<string | null>(null);
  const [hoveredEdge, setHoveredEdge] = useState<Edge | null>(null);

  // Calculate node positions in a circular/hierarchical layout
  const { nodes, edges, width, height } = useMemo(() => {
    const states = Object.entries(definition.states);
    const stateNames = states.map(([name]) => name);
    
    // Build edges from actions
    const edgeList: Edge[] = [];
    states.forEach(([fromState, stateDef]) => {
      (stateDef.actions || []).forEach(action => {
        if (stateNames.includes(action.target)) {
          edgeList.push({
            from: fromState,
            to: action.target,
            label: action.eventName
          });
        }
      });
    });

    // Calculate positions - use layered layout
    // Group by depth from initial state
    const depths = new Map<string, number>();
    const visited = new Set<string>();
    const queue: Array<{ state: string; depth: number }> = [
      { state: definition.initialState, depth: 0 }
    ];

    while (queue.length > 0) {
      const { state, depth } = queue.shift()!;
      if (visited.has(state)) continue;
      visited.add(state);
      depths.set(state, depth);

      const stateEdges = edgeList.filter(e => e.from === state);
      stateEdges.forEach(edge => {
        if (!visited.has(edge.to)) {
          queue.push({ state: edge.to, depth: depth + 1 });
        }
      });
    }

    // Any unvisited states get max depth + 1
    stateNames.forEach(state => {
      if (!depths.has(state)) {
        depths.set(state, (Math.max(...Array.from(depths.values())) || 0) + 1);
      }
    });

    // Group by depth
    const depthGroups = new Map<number, string[]>();
    depths.forEach((depth, state) => {
      if (!depthGroups.has(depth)) depthGroups.set(depth, []);
      depthGroups.get(depth)!.push(state);
    });

    const maxDepth = Math.max(...Array.from(depthGroups.keys()));
    const nodeWidth = 120;
    const nodeHeight = 50;
    const horizontalGap = 180;
    const verticalGap = 80;

    const nodePositions: NodePosition[] = [];
    depthGroups.forEach((statesAtDepth, depth) => {
      const totalHeight = statesAtDepth.length * (nodeHeight + verticalGap) - verticalGap;
      statesAtDepth.forEach((state, idx) => {
        nodePositions.push({
          state,
          x: 80 + depth * horizontalGap,
          y: 60 + idx * (nodeHeight + verticalGap) + (300 - totalHeight) / 2
        });
      });
    });

    const svgWidth = Math.max(400, 160 + (maxDepth + 1) * horizontalGap);
    const svgHeight = Math.max(300, Math.max(...Array.from(depthGroups.values()).map(g => g.length)) * (nodeHeight + verticalGap) + 100);

    return {
      nodes: nodePositions,
      edges: edgeList,
      width: svgWidth,
      height: svgHeight
    };
  }, [definition]);

  // Draw curved edges with arrows
  const getEdgePath = (from: NodePosition, to: NodePosition, edgeIndex: number, totalEdges: number) => {
    const fromX = from.x + 60; // Right side of from node
    const fromY = from.y + 25; // Middle height
    const toX = to.x;          // Left side of to node
    const toY = to.y + 25;     // Middle height

    // Self-loop
    if (from.state === to.state) {
      return `M ${from.x + 60} ${from.y} 
              C ${from.x + 100} ${from.y - 40}, 
                ${from.x + 100} ${from.y + 90}, 
                ${from.x + 60} ${from.y + 50}`;
    }

    // Offset for multiple edges between same nodes
    const offset = (edgeIndex - (totalEdges - 1) / 2) * 15;

    // Curved path
    const midX = (fromX + toX) / 2;
    const midY = (fromY + toY) / 2 + offset;
    const controlOffset = Math.abs(toX - fromX) * 0.3;

    return `M ${fromX} ${fromY} 
            Q ${midX} ${midY + (offset > 0 ? controlOffset : -controlOffset)}, 
              ${toX} ${toY}`;
  };

  return (
    <div className={`bg-[var(--bg-elevated)] rounded-lg p-4 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-[var(--text-secondary)]">
          State Machine
        </h3>
        <div className="text-xs text-[var(--text-muted)]">
          {definition.metadata?.name || 'Unnamed'} • {Object.keys(definition.states).length} states
        </div>
      </div>

      <div className="overflow-auto" style={{ maxHeight: '400px' }}>
        <svg
          ref={svgRef}
          width={width}
          height={height}
          className="select-none"
        >
          {/* Edges */}
          <g className="edges">
            {edges.map((edge, idx) => {
              const fromNode = nodes.find(n => n.state === edge.from);
              const toNode = nodes.find(n => n.state === edge.to);
              if (!fromNode || !toNode) return null;

              // Count edges between same pair
              const sameEdges = edges.filter(
                e => (e.from === edge.from && e.to === edge.to) || 
                     (e.from === edge.to && e.to === edge.from)
              );
              const edgeIndex = sameEdges.indexOf(edge);

              const isHovered = hoveredEdge === edge || 
                               hoveredState === edge.from || 
                               hoveredState === edge.to;

              return (
                <g 
                  key={`edge-${idx}`}
                  onMouseEnter={() => setHoveredEdge(edge)}
                  onMouseLeave={() => setHoveredEdge(null)}
                  className="cursor-pointer"
                >
                  <path
                    d={getEdgePath(fromNode, toNode, edgeIndex, sameEdges.length)}
                    fill="none"
                    stroke={isHovered ? 'var(--accent)' : 'var(--border)'}
                    strokeWidth={isHovered ? 2 : 1.5}
                    markerEnd="url(#arrowhead)"
                    className="transition-all duration-200"
                  />
                  {/* Edge label */}
                  {isHovered && (
                    <text
                      x={(fromNode.x + toNode.x) / 2 + 30}
                      y={(fromNode.y + toNode.y) / 2 + 20}
                      fontSize="11"
                      fill="var(--accent)"
                      className="font-medium"
                    >
                      {edge.label}
                    </text>
                  )}
                </g>
              );
            })}
          </g>

          {/* Arrow marker definition */}
          <defs>
            <marker
              id="arrowhead"
              markerWidth="10"
              markerHeight="7"
              refX="9"
              refY="3.5"
              orient="auto"
            >
              <polygon
                points="0 0, 10 3.5, 0 7"
                fill="var(--border)"
              />
            </marker>
          </defs>

          {/* State nodes */}
          {nodes.map(node => {
            const isCurrent = node.state === currentState;
            const isInitial = node.state === definition.initialState;
            const isHovered = hoveredState === node.state;
            const stateInfo = definition.states[node.state];

            return (
              <g
                key={node.state}
                transform={`translate(${node.x}, ${node.y})`}
                onClick={() => onStateClick?.(node.state)}
                onMouseEnter={() => setHoveredState(node.state)}
                onMouseLeave={() => setHoveredState(null)}
                className="cursor-pointer"
              >
                {/* Node background */}
                <rect
                  width={120}
                  height={50}
                  rx={8}
                  fill={isCurrent ? 'var(--accent)' : 'var(--bg-card)'}
                  stroke={isHovered ? 'var(--accent)' : isCurrent ? 'var(--accent)' : 'var(--border)'}
                  strokeWidth={isHovered || isCurrent ? 2 : 1}
                  className="transition-all duration-200"
                />

                {/* Initial state indicator */}
                {isInitial && (
                  <circle
                    cx={-8}
                    cy={25}
                    r={4}
                    fill="var(--green)"
                  />
                )}

                {/* Current state glow */}
                {isCurrent && (
                  <rect
                    width={120}
                    height={50}
                    rx={8}
                    fill="none"
                    stroke="var(--accent)"
                    strokeWidth={1}
                    opacity={0.5}
                    className="animate-pulse"
                  />
                )}

                {/* State name */}
                <text
                  x={60}
                  y={28}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize="12"
                  fontWeight={isCurrent ? 600 : 400}
                  fill={isCurrent ? 'var(--bg)' : 'var(--text-primary)'}
                >
                  {node.state.length > 14 ? node.state.slice(0, 12) + '...' : node.state}
                </text>

                {/* State description tooltip */}
                {isHovered && stateInfo?.metadata?.description && (
                  <foreignObject x={0} y={55} width={200} height={60}>
                    <div className="text-xs bg-[var(--bg)] border border-[var(--border)] rounded p-2 shadow-lg">
                      {stateInfo.metadata.description}
                    </div>
                  </foreignObject>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mt-4 text-xs text-[var(--text-muted)]">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-[var(--accent)]" />
          <span>Current State</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-[var(--green)]" />
          <span>Initial State</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-8 h-0.5 bg-[var(--border)]" />
          <span>Transition</span>
        </div>
      </div>
    </div>
  );
}
