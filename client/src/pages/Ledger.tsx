import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Filter, Copy, Check } from 'lucide-react';
import { getCategoryEmoji } from '../components/CategoryIcon';
import { fetchPool, fetchLedger } from '../api/client';
import { formatCurrency, formatRelativeTime, truncateTxHash } from '../lib/utils';
import type { Pool, Transaction } from '../lib/types';

const CATEGORIES = [
  'all', 'groceries', 'rent', 'utilities', 'transport',
  'food', 'entertainment', 'supplies', 'other',
];

export default function Ledger() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [pool, setPool] = useState<Pool | null>(null);
  const [txs, setTxs] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [memberFilter, setMemberFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [copiedHash, setCopiedHash] = useState('');

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [p, ledger] = await Promise.all([
        fetchPool(id),
        fetchLedger(id, {
          member: memberFilter || undefined,
          category: categoryFilter !== 'all' ? categoryFilter : undefined,
        }),
      ]);
      setPool(p);
      setTxs(ledger);
    } catch {
      setTxs([]);
    }
    setLoading(false);
  }, [id, memberFilter, categoryFilter]);

  useEffect(() => {
    load();
  }, [load]);

  const copyHash = async (hash: string) => {
    await navigator.clipboard.writeText(hash);
    setCopiedHash(hash);
    setTimeout(() => setCopiedHash(''), 1500);
  };

  const getAmountColor = (tx: Transaction) => {
    if (tx.tx_type === 'deposit') return 'text-emerald-400';
    if (tx.tx_type === 'settlement') return 'text-brand-400';
    return 'text-rose-400';
  };

  const getAmountSign = (tx: Transaction) => {
    if (tx.tx_type === 'deposit') return '+';
    return '-';
  };

  return (
    <div className="max-w-4xl mx-auto">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1 text-sm text-gray-500 mb-4 hover:text-gray-300 transition-colors"
      >
        <ArrowLeft size={16} />
        Back
      </button>

      <h1 className="text-3xl font-bold text-gray-100 mb-2">Ledger</h1>
      <p className="text-gray-500 mb-6">Full transaction history</p>

      {/* Filters */}
      <div className="card p-5 mb-6">
        <div className="flex items-center gap-2 mb-3">
          <Filter size={14} className="text-gray-500" />
          <span className="text-sm font-medium text-gray-400">Filters</span>
        </div>

        {/* Member filter */}
        {pool && pool.members.length > 0 && (
          <select
            value={memberFilter}
            onChange={(e) => setMemberFilter(e.target.value)}
            className="input-field mb-3 text-sm"
          >
            <option value="">All members</option>
            {pool.members.map((m) => (
              <option key={m.id} value={m.near_account}>
                {m.display_name}
              </option>
            ))}
          </select>
        )}

        {/* Category chips */}
        <div className="flex flex-wrap gap-1.5">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${
                categoryFilter === cat
                  ? 'bg-brand-500/20 text-brand-400 border-brand-500/30'
                  : 'bg-white/[0.03] border-white/[0.06] text-gray-400 hover:bg-white/[0.06]'
              }`}
            >
              {cat !== 'all' && (
                <span className="mr-1">{getCategoryEmoji(cat)}</span>
              )}
              {cat.charAt(0).toUpperCase() + cat.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Transaction list */}
      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="card p-4 animate-pulse">
              <div className="flex gap-3">
                <div className="w-8 h-8 bg-white/[0.06] rounded-full" />
                <div className="flex-1">
                  <div className="h-4 bg-white/[0.06] rounded w-2/3 mb-2" />
                  <div className="h-3 bg-white/[0.06] rounded w-1/3" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : txs.length === 0 ? (
        <div className="text-center py-12 card">
          <div className="w-12 h-12 rounded-full bg-white/[0.04] flex items-center justify-center mx-auto mb-3">
            <Filter size={20} className="text-gray-600" />
          </div>
          <p className="text-gray-500">No transactions yet</p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {txs.map((tx, i) => (
            <motion.div
              key={tx.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              className="card p-4"
            >
              <div className="flex items-start gap-3">
                <span className="text-xl mt-0.5">
                  {getCategoryEmoji(
                    tx.tx_type === 'deposit'
                      ? 'deposit'
                      : tx.tx_type === 'settlement'
                      ? 'settlement'
                      : tx.category
                  )}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-200">{tx.description || tx.tx_type}</p>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    {tx.from_account && (
                      <span className="text-xs text-gray-500">{tx.from_account}</span>
                    )}
                    {tx.from_account && tx.to_account && (
                      <span className="text-xs text-gray-600">{'→'}</span>
                    )}
                    {tx.to_account && (
                      <span className="text-xs text-gray-500">{tx.to_account}</span>
                    )}
                    {tx.category && tx.tx_type !== 'deposit' && tx.tx_type !== 'settlement' && (
                      <span className="px-1.5 py-0.5 text-[10px] bg-white/[0.04] border border-white/[0.06] rounded capitalize text-gray-400">
                        {tx.category}
                      </span>
                    )}
                  </div>

                  {/* Tx hash */}
                  {tx.tx_hash && (
                    <div className="flex items-center gap-1.5 mt-2">
                      <span className="font-mono text-[10px] text-gray-600">
                        {truncateTxHash(tx.tx_hash)}
                      </span>
                      <button
                        onClick={() => copyHash(tx.tx_hash)}
                        className="p-0.5 hover:bg-white/[0.06] rounded"
                      >
                        {copiedHash === tx.tx_hash ? (
                          <Check size={10} className="text-emerald-400" />
                        ) : (
                          <Copy size={10} className="text-gray-500" />
                        )}
                      </button>
                      {tx.tx_hash.startsWith('sim_') && (
                        <span className="badge-info">simulated</span>
                      )}
                    </div>
                  )}
                </div>

                <div className="text-right shrink-0">
                  <p className={`font-mono font-bold text-sm ${getAmountColor(tx)}`}>
                    {getAmountSign(tx)}{formatCurrency(tx.amount)}
                  </p>
                  <p className="text-[10px] text-gray-600 mt-0.5">
                    {formatRelativeTime(tx.created_at)}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
