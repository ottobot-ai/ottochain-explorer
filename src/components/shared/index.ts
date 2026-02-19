/**
 * Shared Components Export (Implementation Stubs)
 * 
 * All shared components are intentionally minimal stubs to support TDD development.
 */

import React from 'react';

// SearchBar Component
export interface SearchBarProps {
  placeholder?: string;
  onSearch: (query: string) => void;
  domain: string;
}

export function SearchBar(props: SearchBarProps): JSX.Element {
  throw new Error('SearchBar component not yet implemented');
}

// LoadingStates Components  
export const LoadingStates = {
  Skeleton: ({ type, rows, columns }: { type: string; rows: number; columns: number }) => {
    throw new Error('LoadingStates.Skeleton not yet implemented');
  },
  Spinner: ({ size, message }: { size: string; message: string }) => {
    throw new Error('LoadingStates.Spinner not yet implemented');
  },
  ProgressBar: ({ progress, message }: { progress: number; message: string }) => {
    throw new Error('LoadingStates.ProgressBar not yet implemented');
  }
};

// ErrorBoundary Component
export interface ErrorBoundaryProps {
  domain: string;
  bridgeError?: boolean;
  onRetry?: () => void;
  children: React.ReactNode;
}

export function ErrorBoundary(props: ErrorBoundaryProps): JSX.Element {
  throw new Error('ErrorBoundary component not yet implemented');
}

// MetricCard Component
export interface MetricCardProps {
  title: string;
  value: any;
  change?: number;
  domain: string;
}

export function MetricCard(props: MetricCardProps): JSX.Element {
  throw new Error('MetricCard component not yet implemented');
}

// StatusIndicator Component
export interface StatusIndicatorProps {
  status: string;
  size?: string;
}

export function StatusIndicator(props: StatusIndicatorProps): JSX.Element {
  throw new Error('StatusIndicator component not yet implemented');
}