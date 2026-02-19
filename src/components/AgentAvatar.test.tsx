import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AgentAvatar } from './AgentAvatar';

describe('AgentAvatar', () => {
  const testAddress = 'DAG1234567890abcdef';

  it('renders an avatar image', () => {
    render(<AgentAvatar address={testAddress} />);
    
    const img = screen.getByRole('img');
    expect(img).toBeInTheDocument();
  });

  it('uses address as alt text when no displayName provided', () => {
    render(<AgentAvatar address={testAddress} />);
    
    const img = screen.getByRole('img');
    expect(img).toHaveAttribute('alt', 'DAG12345');
  });

  it('uses displayName as alt text when provided', () => {
    render(<AgentAvatar address={testAddress} displayName="TestBot" />);
    
    const img = screen.getByRole('img');
    expect(img).toHaveAttribute('alt', 'TestBot');
  });

  it('applies custom size', () => {
    render(<AgentAvatar address={testAddress} size={64} />);
    
    const img = screen.getByRole('img');
    expect(img).toHaveAttribute('width', '64');
    expect(img).toHaveAttribute('height', '64');
  });

  it('applies custom className', () => {
    render(<AgentAvatar address={testAddress} className="custom-class" />);
    
    const img = screen.getByRole('img');
    expect(img).toHaveClass('custom-class');
    expect(img).toHaveClass('rounded-full');
  });

  it('generates data URI for avatar', () => {
    render(<AgentAvatar address={testAddress} />);
    
    const img = screen.getByRole('img');
    expect(img.getAttribute('src')).toMatch(/^data:image\/svg\+xml/);
  });

  it('generates different avatars for different addresses', () => {
    const { rerender } = render(<AgentAvatar address="DAG111" />);
    const img1Src = screen.getByRole('img').getAttribute('src');

    rerender(<AgentAvatar address="DAG222" />);
    const img2Src = screen.getByRole('img').getAttribute('src');

    expect(img1Src).not.toBe(img2Src);
  });

  it('generates same avatar for same address', () => {
    const { rerender } = render(<AgentAvatar address={testAddress} />);
    const img1Src = screen.getByRole('img').getAttribute('src');

    rerender(<AgentAvatar address={testAddress} />);
    const img2Src = screen.getByRole('img').getAttribute('src');

    expect(img1Src).toBe(img2Src);
  });
});
