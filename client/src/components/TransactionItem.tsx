import { useState } from 'react';
import { ChevronDown, ChevronUp, Copy, Check } from 'lucide-react';
import { getCategoryEmoji } from './CategoryIcon';
import { formatCurrency, formatRelativeTime, truncateTxHash } from '../lib/utils';
import type { Transaction } from '../lib/types';

interface TransactionItemProps {
  tx: Transaction;
}

export default function TransactionItem({ tx }: TransactionItemProps) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  const isDeposit = tx.tx_type === 'deposit';
  const isSettlement = tx.tx_type === 'settlement';
  const amountColor = isDeposit
    ? 'text-emerald-400'
    : isSettlement
    ? 'text-brand-400'
    : 'text-rose-400';
  const sign = isDeposit ? '+' : isSettlement ? '~' : '-';

  const copyHash = async () => {
    if (tx.tx_hash) {
      await navigator.clipboard.writeText(tx.tx_hash);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  };

  return (
    <div
      className="py-3 border-b border-white/[0.04] last:border-0 cursor-pointer hover:bg-white/[0.02] rounded-lg px-2 -mx-2 transition-colors"
      onClick={() => setExpanded(!expanded)}
    >
      <div className="flex items-center gap-3">
        <span className="text-xl shrink-0">
          {getCategoryEmoji(tx.tx_type === 'deposit' ? 'deposit' : tx.tx_type === 'settlement' ? 'settlement' : tx.category)}
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-200 truncate">{tx.description || tx.tx_type}</p>
          <p className="text-xs text-gray-500">
            {tx.from_account && `${tx.from_account}`}
            {tx.from_account && tx.to_account && ' → '}
            {tx.to_account && `${tx.to_account}`}
          </p>
        </div>
        <div className="text-right shrink-0">
          <p className={`text-sm font-mono font-bold ${amountColor}`}>
            {sign}{formatCurrency(tx.amount)}
          </p>
          <p className="text-xs text-gray-600">{formatRelativeTime(tx.created_at)}</p>
        </div>
        {tx.tx_hash && (
          <span className="text-gray-600">
            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </span>
        )}
      </div>

      {expanded && tx.tx_hash && (
        <div className="mt-2 ml-9 flex items-center gap-2">
          <span className="font-mono text-xs text-gray-600 bg-white/[0.04] px-2 py-0.5 rounded-md">
            {truncateTxHash(tx.tx_hash)}
          </span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              copyHash();
            }}
            className="p-1 hover:bg-white/[0.06] rounded"
          >
            {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} className="text-gray-500" />}
          </button>
          {tx.tx_hash.startsWith('sim_') && (
            <span className="badge-info">simulated</span>
          )}
        </div>
      )}
    </div>
  );
}
