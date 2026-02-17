import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Sparkline, generateTrendData } from './Sparkline';

describe('Sparkline', () => {
  const sampleData = [10, 20, 15, 25, 30, 20];

  it('renders an SVG element', () => {
    const { container } = render(<Sparkline data={sampleData} />);
    
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
  });

  it('returns null for data with less than 2 points', () => {
    const { container } = render(<Sparkline data={[10]} />);
    
    const svg = container.querySelector('svg');
    expect(svg).not.toBeInTheDocument();
  });

  it('returns null for empty data', () => {
    const { container } = render(<Sparkline data={[]} />);
    
    const svg = container.querySelector('svg');
    expect(svg).not.toBeInTheDocument();
  });

  it('applies custom dimensions', () => {
    const { container } = render(<Sparkline data={sampleData} width={100} height={50} />);
    
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('width', '100');
    expect(svg).toHaveAttribute('height', '50');
  });

  it('renders a path for the line', () => {
    const { container } = render(<Sparkline data={sampleData} />);
    
    const paths = container.querySelectorAll('path');
    expect(paths.length).toBeGreaterThan(0);
    
    // Find the stroke path (the visible line)
    const strokePath = Array.from(paths).find(p => p.getAttribute('stroke'));
    expect(strokePath).toBeInTheDocument();
  });

  it('renders a circle for current value', () => {
    const { container } = render(<Sparkline data={sampleData} />);
    
    const circle = container.querySelector('circle');
    expect(circle).toBeInTheDocument();
    expect(circle).toHaveAttribute('r', '2');
  });

  it('applies custom color to stroke', () => {
    const { container } = render(<Sparkline data={sampleData} color="#ff0000" />);
    
    const paths = container.querySelectorAll('path');
    const strokePath = Array.from(paths).find(p => p.getAttribute('stroke'));
    expect(strokePath).toHaveAttribute('stroke', '#ff0000');
  });

  it('applies custom className', () => {
    const { container } = render(<Sparkline data={sampleData} className="custom-sparkline" />);
    
    const svg = container.querySelector('svg');
    expect(svg).toHaveClass('custom-sparkline');
  });

  it('creates gradient definition', () => {
    const { container } = render(<Sparkline data={sampleData} />);
    
    const gradient = container.querySelector('linearGradient');
    expect(gradient).toBeInTheDocument();
  });

  it('handles uniform data (no variation)', () => {
    const uniformData = [10, 10, 10, 10];
    const { container } = render(<Sparkline data={uniformData} />);
    
    // Should still render without errors
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
  });
});

describe('generateTrendData', () => {
  it('generates array with specified number of points', () => {
    const data = generateTrendData(100, 0.1, 10);
    expect(data).toHaveLength(10);
  });

  it('ends with the base value', () => {
    const base = 100;
    const data = generateTrendData(base, 0.1, 12);
    expect(data[data.length - 1]).toBe(base);
  });

  it('generates non-negative values', () => {
    const data = generateTrendData(50, 0.5, 20);
    data.forEach(value => {
      expect(value).toBeGreaterThanOrEqual(0);
    });
  });

  it('uses default points when not specified', () => {
    const data = generateTrendData(100);
    expect(data.length).toBe(12); // default
  });

  it('generates different data on each call', () => {
    const data1 = generateTrendData(100, 0.2);
    const data2 = generateTrendData(100, 0.2);
    
    // Very unlikely to be exactly the same
    const areEqual = data1.every((v, i) => v === data2[i]);
    expect(areEqual).toBe(false);
  });
});
