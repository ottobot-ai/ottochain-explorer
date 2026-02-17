import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CopyAddress } from './CopyAddress';

describe('CopyAddress', () => {
  const fullAddress = 'DAG1234567890abcdefghijklmnop';
  // Based on component: `${address.slice(0, 8)}...${address.slice(-6)}`
  // DAG12345 + ... + klmnop = DAG12345...klmnop
  const truncatedAddress = 'DAG12345...klmnop';

  it('renders truncated address by default', () => {
    render(<CopyAddress address={fullAddress} />);
    
    expect(screen.getByText(truncatedAddress)).toBeInTheDocument();
  });

  it('renders full address when truncate is false', () => {
    render(<CopyAddress address={fullAddress} truncate={false} />);
    
    expect(screen.getByText(fullAddress)).toBeInTheDocument();
  });

  it('renders as a button', () => {
    render(<CopyAddress address={fullAddress} />);
    
    const button = screen.getByRole('button');
    expect(button).toBeInTheDocument();
  });

  it('applies custom className', () => {
    render(<CopyAddress address={fullAddress} className="custom-style" />);
    
    const button = screen.getByRole('button');
    expect(button).toHaveClass('custom-style');
  });

  it('has copy tooltip', () => {
    render(<CopyAddress address={fullAddress} />);
    
    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('title', 'Click to copy');
  });

  it('shows copy icon on hover (via CSS classes)', () => {
    render(<CopyAddress address={fullAddress} />);
    
    // The copy icon span has hover-reveal classes
    const icon = screen.getByText('📋');
    expect(icon).toHaveClass('opacity-0');
    expect(icon).toHaveClass('group-hover:opacity-100');
  });

  it('has correct base styling classes', () => {
    render(<CopyAddress address={fullAddress} />);
    
    const button = screen.getByRole('button');
    expect(button).toHaveClass('inline-flex');
    expect(button).toHaveClass('items-center');
    expect(button).toHaveClass('mono');
  });

  // Note: Clipboard API tests are skipped because jsdom doesn't properly
  // support navigator.clipboard mocking. The copy functionality should be
  // tested in e2e tests with a real browser.
});
