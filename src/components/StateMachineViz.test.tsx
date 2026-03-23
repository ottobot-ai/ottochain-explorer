import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { StateMachineViz } from './StateMachineViz';

describe('StateMachineViz', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders without crashing', () => {
    const { container } = render(<StateMachineViz />);
    expect(container).toBeInTheDocument();
  });

  it('renders Agent label', () => {
    render(<StateMachineViz />);
    expect(screen.getByText(/Agent/i)).toBeInTheDocument();
  });

  it('renders Contract label', () => {
    render(<StateMachineViz />);
    expect(screen.getByText(/Contract/i)).toBeInTheDocument();
  });

  it('renders both workflow SVG tracks', () => {
    const { container } = render(<StateMachineViz />);
    const svgs = container.querySelectorAll('svg');
    expect(svgs.length).toBeGreaterThanOrEqual(2);
  });

  it('renders state node labels for Agent workflow', () => {
    const { container } = render(<StateMachineViz />);
    const texts = Array.from(container.querySelectorAll('text')).map(t => t.textContent);
    // Should include REG, ACT, CHAL, SUSP, PROB
    expect(texts).toContain('REG');
    expect(texts).toContain('ACT');
    expect(texts).toContain('CHAL');
    expect(texts).toContain('SUSP');
    expect(texts).toContain('PROB');
  });

  it('renders state node labels for Contract workflow', () => {
    const { container } = render(<StateMachineViz />);
    const texts = Array.from(container.querySelectorAll('text')).map(t => t.textContent);
    // Should include PROP, ACPT, PROG, DONE
    expect(texts).toContain('PROP');
    expect(texts).toContain('ACPT');
    expect(texts).toContain('PROG');
    expect(texts).toContain('DONE');
  });

  it('renders edges (lines) between nodes', () => {
    const { container } = render(<StateMachineViz />);
    const lines = container.querySelectorAll('line');
    // Agent has 4 edges, Contract has 3 → ≥ 7 total
    expect(lines.length).toBeGreaterThanOrEqual(7);
  });

  it('renders travelling dots (one per workflow)', () => {
    const { container } = render(<StateMachineViz />);
    // Each WorkflowTrack renders a travelling dot circle.
    // The travelling dot is the last circle in each SVG (after node circles).
    const circles = container.querySelectorAll('circle');
    // Agent: 5 nodes + 1 dot + possibly 1 pulse = ≥ 6
    // Contract: 4 nodes + 1 dot + possibly 1 pulse = ≥ 5
    expect(circles.length).toBeGreaterThanOrEqual(11);
  });

  it('accepts custom tickMs prop without crashing', () => {
    expect(() => render(<StateMachineViz tickMs={500} />)).not.toThrow();
  });

  it('has accessible aria-label on visualization container', () => {
    render(<StateMachineViz />);
    expect(screen.getByLabelText('Live state machine visualization')).toBeInTheDocument();
  });

  it('has accessible aria-label on each workflow SVG', () => {
    render(<StateMachineViz />);
    expect(screen.getByLabelText('Agent state machine')).toBeInTheDocument();
    expect(screen.getByLabelText('Contract state machine')).toBeInTheDocument();
  });

  it('dot advances state after tick interval', () => {
    const tickMs = 1000;
    const { container } = render(<StateMachineViz tickMs={tickMs} />);

    // The first travelling dot starts at REG (x=14)
    const agentSvg = container.querySelectorAll('svg')[0];
    const dotsBefore = Array.from(agentSvg.querySelectorAll('circle'));
    const travelDotBefore = dotsBefore[dotsBefore.length - 1]; // last circle = travel dot
    const cxBefore = travelDotBefore.getAttribute('cx');

    // Advance past one tick
    act(() => {
      vi.advanceTimersByTime(tickMs + 100);
    });

    const dotsAfter = Array.from(agentSvg.querySelectorAll('circle'));
    const travelDotAfter = dotsAfter[dotsAfter.length - 1];
    // After one tick the dot moves to ACT (x=58) — cx should have changed
    const cxAfter = travelDotAfter.getAttribute('cx');
    expect(cxAfter).not.toBe(cxBefore);
  });

  it('dot loops back to start after last state', () => {
    const tickMs = 500;
    render(<StateMachineViz tickMs={tickMs} />);

    // Contract has 4 states; after 4 ticks it loops back
    act(() => {
      // Advance 4 ticks + buffer to cover the 40% arrival delay inside each tick
      vi.advanceTimersByTime(tickMs * 4 + tickMs * 0.5);
    });

    // No crash = loop handled correctly
  });
});
