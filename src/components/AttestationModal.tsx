import { CopyAddress } from './CopyAddress';
import { AgentAvatar } from './AgentAvatar';

interface AttestationModalData {
  id: string;
  type: string;
  delta: number;
  reason: string | null;
  createdAt: string;
  txHash: string;
  agent: { address: string; displayName: string | null };
  issuer?: { address: string; displayName: string | null } | null;
}

interface AttestationModalProps {
  attestation: AttestationModalData;
  onClose: () => void;
  onAgentClick: (address: string) => void;
}

export function AttestationModal({ attestation, onClose, onAgentClick }: AttestationModalProps) {
  const getTypeStyle = (type: string) => {
    switch (type) {
      case 'VOUCH': return { color: 'text-yellow-400', bg: 'bg-yellow-500/20', icon: '⭐', label: 'Vouch' };
      case 'COMPLETION': return { color: 'text-green-400', bg: 'bg-green-500/20', icon: '✅', label: 'Completion' };
      case 'BEHAVIORAL': return { color: 'text-cyan-400', bg: 'bg-cyan-500/20', icon: '🎯', label: 'Behavioral' };
      case 'VIOLATION': return { color: 'text-red-400', bg: 'bg-red-500/20', icon: '⚠️', label: 'Violation' };
      default: return { color: 'text-purple-400', bg: 'bg-purple-500/20', icon: '✨', label: type };
    }
  };

  const style = getTypeStyle(attestation.type);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-[var(--bg-card)] border border-[var(--border)] rounded-xl max-w-lg w-full shadow-2xl">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-[var(--text-muted)] hover:text-white text-2xl"
        >
          ×
        </button>
        
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center gap-4 mb-6">
            <div className={`w-16 h-16 rounded-xl ${style.bg} flex items-center justify-center text-3xl`}>
              {style.icon}
            </div>
            <div>
              <h2 className="text-2xl font-bold">{style.label} Attestation</h2>
              <div className={`text-3xl font-bold ${attestation.delta > 0 ? 'text-green-400' : 'text-red-400'}`}>
                {attestation.delta > 0 ? '+' : ''}{attestation.delta} reputation
              </div>
            </div>
          </div>

          {/* Parties */}
          <div className="space-y-4 mb-6">
            {/* Recipient */}
            <div 
              className="p-4 bg-[var(--bg-elevated)] rounded-lg border border-[var(--border)] cursor-pointer hover:border-[var(--accent)] transition-colors"
              onClick={() => {
                onAgentClick(attestation.agent.address);
                onClose();
              }}
            >
              <div className="text-xs text-[var(--text-muted)] mb-2">RECIPIENT</div>
              <div className="flex items-center gap-3">
                <AgentAvatar address={attestation.agent.address} displayName={attestation.agent.displayName} size={40} />
                <div className="flex-1">
                  <div className="font-medium">{attestation.agent.displayName || 'Anonymous'}</div>
                  <CopyAddress address={attestation.agent.address} className="text-xs" />
                </div>
              </div>
            </div>

            {/* Issuer */}
            {attestation.issuer && (
              <div 
                className="p-4 bg-[var(--bg-elevated)] rounded-lg border border-[var(--border)] cursor-pointer hover:border-[var(--accent-2)] transition-colors"
                onClick={() => {
                  onAgentClick(attestation.issuer!.address);
                  onClose();
                }}
              >
                <div className="text-xs text-[var(--text-muted)] mb-2">ISSUED BY</div>
                <div className="flex items-center gap-3">
                  <AgentAvatar address={attestation.issuer.address} displayName={attestation.issuer.displayName} size={40} />
                  <div className="flex-1">
                    <div className="font-medium text-[var(--accent-2)]">{attestation.issuer.displayName || 'Anonymous'}</div>
                    <CopyAddress address={attestation.issuer.address} className="text-xs" />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Reason */}
          {attestation.reason && (
            <div className="mb-6">
              <div className="text-xs text-[var(--text-muted)] mb-2">REASON</div>
              <div className="p-3 bg-[var(--bg-elevated)] rounded-lg text-sm">
                {attestation.reason}
              </div>
            </div>
          )}

          {/* Metadata */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-xs text-[var(--text-muted)] mb-1">TIMESTAMP</div>
              <div>{new Date(attestation.createdAt).toLocaleString()}</div>
            </div>
            <div>
              <div className="text-xs text-[var(--text-muted)] mb-1">TX HASH</div>
              <CopyAddress address={attestation.txHash} className="text-xs" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
