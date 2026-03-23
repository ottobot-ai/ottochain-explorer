/**
 * StateMachineViz — Animated state machine track visualization for the status bar.
 *
 * Shows the AgentIdentity and Contract workflow shapes as compact node graphs
 * with a dot "avatar" that animates between states to hint at live activity.
 * Pure CSS animations — no WebSocket dependency; the dot loops through states
 * on a staggered interval to convey "things are happening."
 */
import { useEffect, useRef, useState } from 'react';

// ─── Workflow Definitions ────────────────────────────────────────────────────

interface State {
  id: string;
  label: string;
  /** x/y in the SVG coordinate space */
  x: number;
  y: number;
  /** terminal states render slightly differently */
  terminal?: boolean;
}

interface Edge {
  from: string;
  to: string;
}

interface Workflow {
  id: string;
  label: string;
  states: State[];
  edges: Edge[];
  /** The happy-path sequence (the dot will follow this) */
  mainPath: string[];
  /** Accent colour for this workflow */
  color: string;
}

// SVG canvas: 220 × 28 px
const AGENT_IDENTITY: Workflow = {
  id: 'agent',
  label: 'Agent',
  color: '#a855f7', // purple
  states: [
    { id: 'REG',  label: 'REG',  x: 14,  y: 14 },
    { id: 'ACT',  label: 'ACT',  x: 58,  y: 14 },
    { id: 'CHAL', label: 'CHAL', x: 102, y: 14 },
    { id: 'SUSP', label: 'SUSP', x: 146, y: 14 },
    { id: 'PROB', label: 'PROB', x: 190, y: 14, terminal: true },
    { id: 'WITH', label: 'OUT',  x: 102, y: 14 }, // re-used visual slot – rendered on demand
  ],
  edges: [
    { from: 'REG',  to: 'ACT'  },
    { from: 'ACT',  to: 'CHAL' },
    { from: 'CHAL', to: 'SUSP' },
    { from: 'SUSP', to: 'PROB' },
  ],
  mainPath: ['REG', 'ACT', 'CHAL', 'SUSP', 'PROB'],
};

const CONTRACT: Workflow = {
  id: 'contract',
  label: 'Contract',
  color: '#06b6d4', // cyan
  states: [
    { id: 'PROP', label: 'PROP', x: 14,  y: 14 },
    { id: 'ACPT', label: 'ACPT', x: 70,  y: 14 },
    { id: 'PROG', label: 'PROG', x: 126, y: 14 },
    { id: 'DONE', label: 'DONE', x: 182, y: 14, terminal: true },
  ],
  edges: [
    { from: 'PROP', to: 'ACPT' },
    { from: 'ACPT', to: 'PROG' },
    { from: 'PROG', to: 'DONE' },
  ],
  mainPath: ['PROP', 'ACPT', 'PROG', 'DONE'],
};

const WORKFLOWS = [AGENT_IDENTITY, CONTRACT];

// ─── Node radius & dot sizing ────────────────────────────────────────────────
const R = 5;   // state node radius
const DR = 3;  // travelling dot radius

// ─── Single workflow SVG track ───────────────────────────────────────────────

function WorkflowTrack({ workflow, tickMs }: { workflow: Workflow; tickMs: number }) {
  // Which index in mainPath the dot is currently "at"
  const [dotIdx, setDotIdx] = useState(0);
  const [animating, setAnimating] = useState(false);

  const mainPath = workflow.mainPath;

  useEffect(() => {
    const interval = setInterval(() => {
      setAnimating(true);
      setTimeout(() => {
        setDotIdx(prev => (prev + 1) % mainPath.length);
        setAnimating(false);
      }, tickMs * 0.4); // dot arrives at next node 40% into the tick
    }, tickMs);

    return () => clearInterval(interval);
  }, [mainPath.length, tickMs]);

  // Map state id → State object
  const stateMap = new Map(workflow.states.map(s => [s.id, s]));

  const dotFrom = stateMap.get(mainPath[dotIdx])!;
  const nextIdx = (dotIdx + 1) % mainPath.length;
  const dotTo   = stateMap.get(mainPath[nextIdx])!;

  // Interpolate dot position
  const t = animating ? 0.5 : 0; // crude: jump to midpoint while animating, snap to node when done
  const dotX = dotFrom.x + (dotTo.x - dotFrom.x) * t;
  const dotY = dotFrom.y + (dotTo.y - dotFrom.y) * t;

  // Only render states that are in mainPath (excludes WITHDRAWN etc.)
  const visibleStates = workflow.states.filter(s => mainPath.includes(s.id));

  return (
    <div className="flex items-center gap-1.5">
      <span
        className="text-[9px] font-mono uppercase tracking-widest"
        style={{ color: workflow.color, opacity: 0.7, minWidth: 44 }}
      >
        {workflow.label}
      </span>
      <svg
        width={210}
        height={28}
        viewBox="0 0 210 28"
        style={{ overflow: 'visible' }}
        aria-label={`${workflow.label} state machine`}
      >
        {/* Edges (connecting lines) */}
        {workflow.edges.map(edge => {
          const from = stateMap.get(edge.from);
          const to   = stateMap.get(edge.to);
          if (!from || !to) return null;
          return (
            <line
              key={`${edge.from}-${edge.to}`}
              x1={from.x + R}
              y1={from.y}
              x2={to.x - R}
              y2={to.y}
              stroke={workflow.color}
              strokeWidth={1}
              strokeOpacity={0.25}
            />
          );
        })}

        {/* State nodes */}
        {visibleStates.map(state => {
          const isActive = mainPath[dotIdx] === state.id;
          return (
            <g key={state.id}>
              <circle
                cx={state.x}
                cy={state.y}
                r={R}
                fill="var(--bg-elevated)"
                stroke={workflow.color}
                strokeWidth={isActive ? 1.5 : 0.75}
                strokeOpacity={isActive ? 1 : 0.4}
              />
              {/* Label below node */}
              <text
                x={state.x}
                y={state.y + R + 8}
                textAnchor="middle"
                fill={workflow.color}
                opacity={isActive ? 0.9 : 0.35}
                fontSize={6}
                fontFamily="'JetBrains Mono', monospace"
              >
                {state.label}
              </text>
            </g>
          );
        })}

        {/* Travelling dot */}
        <circle
          cx={dotX}
          cy={dotY}
          r={DR}
          fill={workflow.color}
          opacity={0.9}
          style={{ transition: animating ? `cx ${tickMs * 0.4}ms ease-in-out, cy ${tickMs * 0.4}ms ease-in-out` : 'none' }}
        />

        {/* Pulse ring on current node when dot arrives */}
        {!animating && (
          <circle
            cx={dotFrom.x}
            cy={dotFrom.y}
            r={R + 3}
            fill="none"
            stroke={workflow.color}
            strokeWidth={0.75}
            opacity={0}
            style={{
              animation: 'smPulse 1s ease-out forwards',
            }}
          />
        )}
      </svg>
    </div>
  );
}

// ─── Public component ────────────────────────────────────────────────────────

interface StateMachineVizProps {
  /** How long (ms) the dot waits at each node before moving on. Default 1800. */
  tickMs?: number;
}

export function StateMachineViz({ tickMs = 1800 }: StateMachineVizProps) {
  // Stagger start times so the two tracks don't move in lockstep
  const agentTick = tickMs;
  const contractTick = Math.round(tickMs * 1.3);

  return (
    <>
      {/* Pulse keyframe injected once into the document */}
      <style>{`
        @keyframes smPulse {
          0%   { r: ${R + 2}; opacity: 0.6; }
          100% { r: ${R + 8}; opacity: 0; }
        }
      `}</style>
      <div className="flex items-center gap-4" aria-label="Live state machine visualization">
        {WORKFLOWS.map((wf, i) => (
          <WorkflowTrack
            key={wf.id}
            workflow={wf}
            tickMs={i === 0 ? agentTick : contractTick}
          />
        ))}
      </div>
    </>
  );
}
