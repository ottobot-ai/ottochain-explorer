import { useRef, useEffect, useMemo, useCallback } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import { useQuery } from '@apollo/client/react';
import { gql } from '@apollo/client/core';

// Query to get interaction data including attestations
const INTERACTION_GRAPH = gql`
  query InteractionGraph {
    agents(limit: 50) {
      address
      displayName
      reputation
      state
      attestationsReceived(limit: 50) {
        issuer { address }
        type
      }
    }
    contracts(limit: 100) {
      proposer { address }
      counterparty { address }
      state
    }
  }
`;

interface Attestation {
  issuer: { address: string } | null;
  type: string;
}

interface Agent {
  address: string;
  displayName: string | null;
  reputation: number;
  state: string;
  attestationsReceived?: Attestation[];
}

interface Contract {
  proposer: { address: string } | null;
  counterparty: { address: string } | null;
  state: string;
}

interface InteractionData {
  agents: Agent[];
  contracts: Contract[];
}

interface GraphNode {
  id: string;
  name: string;
  reputation: number;
  state: string;
  val: number;
}

interface GraphLink {
  source: string;
  target: string;
  value: number;
  type: 'contract' | 'vouch';
}

interface InteractionGraphProps {
  onAgentClick?: (address: string) => void;
  width?: number;
  height?: number;
}

export function InteractionGraph({ onAgentClick, width = 600, height = 400 }: InteractionGraphProps) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const graphRef = useRef<any>(null);
  
  const { data, loading } = useQuery<InteractionData>(INTERACTION_GRAPH, {
    pollInterval: 30000, // 30s - graph doesn't need frequent updates
  });

  const graphData = useMemo(() => {
    if (!data) return { nodes: [], links: [] };

    const nodes: GraphNode[] = data.agents.map((agent: any) => ({
      id: agent.address,
      name: agent.displayName || agent.address.slice(0, 8),
      reputation: agent.reputation,
      state: agent.state,
      val: Math.max(8, Math.sqrt(agent.reputation) * 3),
    }));

    const nodeIds = new Set(nodes.map(n => n.id));
    
    // Build links from contracts
    const contractLinkMap = new Map<string, { count: number; types: Set<string> }>();
    
    data.contracts?.forEach((contract: any) => {
      const source = contract.proposer?.address;
      const target = contract.counterparty?.address;
      
      if (source && target && nodeIds.has(source) && nodeIds.has(target)) {
        const key = [source, target].sort().join('-');
        const existing = contractLinkMap.get(key) || { count: 0, types: new Set() };
        existing.count++;
        existing.types.add(contract.state);
        contractLinkMap.set(key, existing);
      }
    });

    // Build links from attestations (vouches, etc.)
    const attestationLinkMap = new Map<string, number>();
    
    data.agents?.forEach((agent: Agent) => {
      if (agent.attestationsReceived) {
        agent.attestationsReceived.forEach((att) => {
          const issuerAddr = att.issuer?.address;
          if (issuerAddr && nodeIds.has(issuerAddr) && issuerAddr !== agent.address) {
            const key = [issuerAddr, agent.address].sort().join('-');
            attestationLinkMap.set(key, (attestationLinkMap.get(key) || 0) + 1);
          }
        });
      }
    });

    const links: GraphLink[] = [];
    
    // Add contract links (purple)
    contractLinkMap.forEach((value, key) => {
      const [source, target] = key.split('-');
      links.push({
        source,
        target,
        value: value.count,
        type: 'contract',
      });
    });

    // Add attestation links (cyan) - only if no contract link exists
    attestationLinkMap.forEach((count, key) => {
      if (!contractLinkMap.has(key)) {
        const [source, target] = key.split('-');
        links.push({
          source,
          target,
          value: count,
          type: 'vouch',
        });
      }
    });

    return { nodes, links };
  }, [data]);

  // Color based on agent state
  const getNodeColor = useCallback((node: GraphNode) => {
    switch (node.state) {
      case 'ACTIVE': return '#22c55e';
      case 'PENDING': return '#f97316';
      case 'PROBATION': return '#eab308';
      case 'SUSPENDED': return '#ef4444';
      default: return '#a855f7';
    }
  }, []);

  // Link color based on relationship type
  const getLinkColor = useCallback((link: any) => {
    const l = link as GraphLink;
    if (l.type === 'vouch') {
      return 'rgba(6, 182, 212, 0.5)'; // cyan for attestations
    }
    return 'rgba(168, 85, 247, 0.5)'; // purple for contracts
  }, []);

  const initialZoomDone = useRef(false);
  
  useEffect(() => {
    // Zoom to fit only on initial load, not on every update
    if (graphRef.current && graphData.nodes.length > 0 && !initialZoomDone.current) {
      setTimeout(() => {
        graphRef.current?.zoomToFit(400, 50);
        initialZoomDone.current = true;
      }, 500);
    }
  }, [graphData]);

  if (loading && graphData.nodes.length === 0) {
    return (
      <div className="card h-full flex items-center justify-center">
        <div className="text-[var(--text-muted)]">Loading graph...</div>
      </div>
    );
  }

  return (
    <div className="card overflow-hidden">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <span>🔗</span> Agent Interactions
        </h3>
        <div className="flex items-center gap-4 text-xs text-[var(--text-muted)]">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-green-500"></span> Active
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-orange-500"></span> Pending
          </span>
          <span className="flex items-center gap-1 border-l border-[var(--border)] pl-4">
            <span className="w-4 h-0.5 bg-purple-500"></span> Contract
          </span>
          <span className="flex items-center gap-1">
            <span className="w-4 h-0.5 bg-cyan-500"></span> Attestation
          </span>
        </div>
      </div>
      <div className="bg-[var(--bg)] rounded-lg overflow-hidden" style={{ height: height - 60 }}>
        <ForceGraph2D
          ref={graphRef}
          graphData={graphData}
          width={width}
          height={height - 60}
          backgroundColor="transparent"
          nodeColor={(node) => getNodeColor(node as GraphNode)}
          nodeLabel={(node) => `${(node as GraphNode).name}\nRep: ${(node as GraphNode).reputation}`}
          nodeVal={(node) => (node as GraphNode).val}
          nodeCanvasObject={(node, ctx, globalScale) => {
            const n = node as GraphNode;
            const label = n.name;
            const fontSize = Math.max(10, 12 / globalScale);
            const nodeR = Math.sqrt(n.val) * 2;
            
            // Draw node circle
            ctx.beginPath();
            ctx.arc(node.x!, node.y!, nodeR, 0, 2 * Math.PI);
            ctx.fillStyle = getNodeColor(n);
            ctx.fill();
            
            // Draw border
            ctx.strokeStyle = 'rgba(255,255,255,0.3)';
            ctx.lineWidth = 1;
            ctx.stroke();
            
            // Draw label
            ctx.font = `${fontSize}px "Space Grotesk", sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = 'white';
            ctx.fillText(label, node.x!, node.y! + nodeR + fontSize);
          }}
          nodePointerAreaPaint={(node, color, ctx) => {
            const n = node as GraphNode;
            const nodeR = Math.sqrt(n.val) * 2;
            ctx.beginPath();
            ctx.arc(node.x!, node.y!, nodeR + 5, 0, 2 * Math.PI);
            ctx.fillStyle = color;
            ctx.fill();
          }}
          linkColor={getLinkColor}
          linkWidth={(link) => Math.min(4, (link as GraphLink).value + 1)}
          linkDirectionalParticles={3}
          linkDirectionalParticleWidth={3}
          linkDirectionalParticleColor={() => 'rgba(168, 85, 247, 0.8)'}
          onNodeClick={(node) => onAgentClick?.((node as GraphNode).id)}
          cooldownTicks={100}
          d3AlphaDecay={0.02}
          d3VelocityDecay={0.3}
        />
      </div>
    </div>
  );
}
