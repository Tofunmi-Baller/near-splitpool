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
    if (tx.tx_type === 'deposit') return 'text-mint-500';
    if (tx.tx_type === 'settlement') return 'text-brand-500';
    return 'text-coral-500';
  };

  const getAmountSign = (tx: Transaction) => {
    if (tx.tx_type === 'deposit') return '+';
    return '-';
  };

  return (
    <div>
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1 text-sm text-gray-500 mb-4 hover:text-gray-700 dark:hover:text-gray-300"
      >
        <ArrowLeft size={16} />
        Back
      </button>

      <h1 className="text-2xl font-bold mb-5">Ledger</h1>

      {/* Filters */}
      <div className="card p-4 mb-4">
        <div className="flex items-center gap-2 mb-3">
          <Filter size={14} className="text-gray-400" />
          <span className="text-sm font-medium text-gray-500">Filters</span>
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
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                categoryFilter === cat
                  ? 'bg-brand-500 text-white shadow-sm'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
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
                <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded-full" />
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3 mb-2" />
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/3" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : txs.length === 0 ? (
        <div className="text-center py-12">
          <span className="text-4xl block mb-3">{'\u{1F4CB}'}</span>
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
                  <p className="text-sm font-medium">{tx.description || tx.tx_type}</p>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    {tx.from_account && (
                      <span className="text-xs text-gray-500">{tx.from_account}</span>
                    )}
                    {tx.from_account && tx.to_account && (
                      <span className="text-xs text-gray-400">{'→'}</span>
                    )}
                    {tx.to_account && (
                      <span className="text-xs text-gray-500">{tx.to_account}</span>
                    )}
                    {tx.category && tx.tx_type !== 'deposit' && tx.tx_type !== 'settlement' && (
                      <span className="px-1.5 py-0.5 text-[10px] bg-gray-100 dark:bg-gray-800 rounded capitalize">
                        {tx.category}
                      </span>
                    )}
                  </div>

                  {/* Tx hash */}
                  {tx.tx_hash && (
                    <div className="flex items-center gap-1.5 mt-2">
                      <span className="font-mono text-[10px] text-gray-400">
                        {truncateTxHash(tx.tx_hash)}
                      </span>
                      <button
                        onClick={() => copyHash(tx.tx_hash)}
                        className="p-0.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
                      >
                        {copiedHash === tx.tx_hash ? (
                          <Check size={10} className="text-mint-500" />
                        ) : (
                          <Copy size={10} className="text-gray-400" />
                        )}
                      </button>
                      {tx.tx_hash.startsWith('sim_') && (
                        <span className="text-[10px] px-1 py-0.5 bg-brand-50 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400 rounded">
                          simulated
                        </span>
                      )}
                    </div>
                  )}
                </div>

                <div className="text-right shrink-0">
                  <p className={`font-mono font-bold text-sm ${getAmountColor(tx)}`}>
                    {getAmountSign(tx)}{formatCurrency(tx.amount)}
                  </p>
                  <p className="text-[10px] text-gray-400 mt-0.5">
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
