import { useMemo } from 'react';
import { createAvatar } from '@dicebear/core';
import { bottts, identicon, shapes } from '@dicebear/collection';

interface AgentAvatarProps {
  address: string;
  displayName?: string | null;
  size?: number;
  className?: string;
  style?: 'bottts' | 'identicon' | 'shapes';
}

export function AgentAvatar({ 
  address, 
  displayName,
  size = 40, 
  className = '',
  style = 'bottts'
}: AgentAvatarProps) {
  const avatarSvg = useMemo(() => {
    const seed = displayName || address;
    const collection = style === 'bottts' ? bottts : style === 'identicon' ? identicon : shapes;
    
    const avatar = createAvatar(collection, {
      seed,
      size,
      // Add some fun variation
      ...(style === 'bottts' ? {
        colors: ['purple', 'blue', 'cyan', 'teal', 'green'],
      } : {}),
    });
    
    return avatar.toDataUri();
  }, [address, displayName, size, style]);

  return (
    <img 
      src={avatarSvg}
      alt={displayName || address.slice(0, 8)}
      width={size}
      height={size}
      className={`rounded-full ${className}`}
      style={{ backgroundColor: 'var(--bg-elevated)' }}
    />
  );
}
