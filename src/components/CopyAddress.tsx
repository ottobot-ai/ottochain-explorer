import { useState } from 'react';

interface CopyAddressProps {
  address: string;
  truncate?: boolean;
  className?: string;
}

export function CopyAddress({ address, truncate = true, className = '' }: CopyAddressProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const displayAddress = truncate 
    ? `${address.slice(0, 8)}...${address.slice(-6)}`
    : address;

  return (
    <button
      onClick={handleCopy}
      className={`group inline-flex items-center gap-1.5 mono text-[var(--text-muted)] hover:text-white transition-colors ${className}`}
      title="Click to copy"
    >
      <span className={copied ? 'text-[var(--green)]' : ''}>
        {copied ? '✓ Copied!' : displayAddress}
      </span>
      {!copied && (
        <span className="opacity-0 group-hover:opacity-100 transition-opacity text-xs">
          📋
        </span>
      )}
    </button>
  );
}
