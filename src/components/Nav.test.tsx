import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { renderWithApollo } from '../test/mocks';
import { Nav } from './Nav';

describe('Nav', () => {
  const mockSetView = vi.fn();
  const mockOnAgentSelect = vi.fn();
  const mockOnFiberSelect = vi.fn();
  const mockOnDAOSelect = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const defaultProps = {
    view: 'dashboard' as const,
    setView: mockSetView,
    onAgentSelect: mockOnAgentSelect,
    onFiberSelect: mockOnFiberSelect,
    onDAOSelect: mockOnDAOSelect,
  };

  describe('Nav integration', () => {
    it('renders a "Rejections" button that switches view to rejections', () => {
      renderWithApollo(<Nav {...defaultProps} />);
      
      // Look for the rejections button/link in the desktop nav
      const rejectionsButton = screen.getByRole('button', { name: /rejections/i });
      expect(rejectionsButton).toBeInTheDocument();
      
      // Click the button
      fireEvent.click(rejectionsButton);
      
      // Should call setView with 'rejections'
      expect(mockSetView).toHaveBeenCalledWith('rejections');
    });

    it('highlights rejections button when current view is rejections', () => {
      renderWithApollo(<Nav {...defaultProps} view="rejections" />);
      
      const rejectionsButton = screen.getByRole('button', { name: /rejections/i });
      
      // Should have active styling (white text instead of muted)
      expect(rejectionsButton).toHaveClass('text-white');
      expect(rejectionsButton).not.toHaveClass('text-[var(--text-muted)]');
    });

    it('renders rejections button in mobile menu', () => {
      renderWithApollo(<Nav {...defaultProps} />);
      
      // Open mobile menu
      const hamburger = screen.getByRole('button', { name: /☰/i });
      fireEvent.click(hamburger);
      
      // Should find rejections button in mobile menu
      const mobileRejectionsButton = screen.getAllByRole('button', { name: /rejections/i })[1]; // Second one is mobile
      expect(mobileRejectionsButton).toBeInTheDocument();
      
      // Click mobile rejections button
      fireEvent.click(mobileRejectionsButton);
      
      expect(mockSetView).toHaveBeenCalledWith('rejections');
    });
  });

  describe('Existing functionality', () => {
    it('renders all existing nav buttons', () => {
      renderWithApollo(<Nav {...defaultProps} />);
      
      expect(screen.getByRole('button', { name: /home/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /fibers/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /identity/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /contracts/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /markets/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /oracles/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /daos/i })).toBeInTheDocument();
    });

    it('switches views correctly for existing buttons', () => {
      renderWithApollo(<Nav {...defaultProps} />);
      
      fireEvent.click(screen.getByRole('button', { name: /fibers/i }));
      expect(mockSetView).toHaveBeenCalledWith('fibers');
      
      fireEvent.click(screen.getByRole('button', { name: /identity/i }));
      expect(mockSetView).toHaveBeenCalledWith('identity');
    });

    it('highlights active view correctly', () => {
      renderWithApollo(<Nav {...defaultProps} view="fibers" />);
      
      const fibersButton = screen.getByRole('button', { name: /fibers/i });
      const homeButton = screen.getByRole('button', { name: /home/i });
      
      expect(fibersButton).toHaveClass('text-white');
      expect(homeButton).toHaveClass('text-[var(--text-muted)]');
    });
  });
});