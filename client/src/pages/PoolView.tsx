import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Receipt,
  Settings,
  Handshake,
  BookOpen,
  ChevronRight,
  ArrowDownCircle,
  Loader2,
} from 'lucide-react';
import MemberAvatar from '../components/MemberAvatar';
import ContributionBar from '../components/ContributionBar';
import TransactionItem from '../components/TransactionItem';
import VoteModal from '../components/VoteModal';
import { getCategoryEmoji } from '../components/CategoryIcon';
import { useWallet } from '../context/WalletContext';
import { fetchPool, fetchSpendRequests, fetchLedger, deposit } from '../api/client';
import { formatCurrency, formatRelativeTime } from '../lib/utils';
import type { Pool, SpendRequest, Transaction } from '../lib/types';

const TOKENS = ['USDC', 'NEAR', 'wNEAR'];

export default function PoolView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { account } = useWallet();

  const [pool, setPool] = useState<Pool | null>(null);
  const [pendingRequests, setPendingRequests] = useState<SpendRequest[]>([]);
  const [recentTxs, setRecentTxs] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDeposit, setShowDeposit] = useState(false);
  const [depositAmount, setDepositAmount] = useState('');
  const [depositToken, setDepositToken] = useState('USDC');
  const [depositing, setDepositing] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<SpendRequest | null>(null);
  const [toast, setToast] = useState('');

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const loadData = useCallback(async () => {
    if (!id) return;
    try {
      const [poolData, requests, txs] = await Promise.all([
        fetchPool(id),
        fetchSpendRequests(id, 'pending').catch(() => []),
        fetchLedger(id).catch(() => []),
      ]);
      setPool(poolData);
      setPendingRequests(requests);
      setRecentTxs(txs.slice(0, 5));
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  }, [id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleDeposit = async () => {
    if (!depositAmount || !id) return;
    setDepositing(true);
    try {
      await deposit(id, {
        nearAccount: account!,
        amount: parseFloat(depositAmount),
        token: depositToken,
      });
      showToast('Deposit successful!');
      setShowDeposit(false);
      setDepositAmount('');
      loadData();
    } catch (err: any) {
      showToast(err.message || 'Deposit failed');
    }
    setDepositing(false);
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="card p-6 animate-pulse">
            <div className="h-6 bg-white/[0.06] rounded w-1/3 mb-4" />
            <div className="h-10 bg-white/[0.06] rounded w-1/2 mb-2" />
            <div className="h-4 bg-white/[0.06] rounded w-1/4" />
          </div>
        </div>
        <div className="space-y-4">
          <div className="card p-4 animate-pulse">
            <div className="flex gap-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="w-10 h-10 bg-white/[0.06] rounded-full" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!pool) {
    return (
      <div className="text-center py-16">
        <div className="w-16 h-16 rounded-2xl bg-white/[0.04] flex items-center justify-center mx-auto mb-4">
          <span className="text-3xl text-gray-600">?</span>
        </div>
        <p className="text-gray-500">Pool not found</p>
      </div>
    );
  }

  const actions = [
    { label: 'Request', icon: Receipt, path: `/pool/${id}/spend`, color: 'text-brand-400' },
    { label: 'Rules', icon: Settings, path: `/pool/${id}/rules`, color: 'text-accent-violet' },
    { label: 'Settle', icon: Handshake, path: `/pool/${id}/settle`, color: 'text-accent-teal' },
    { label: 'Ledger', icon: BookOpen, path: `/pool/${id}/ledger`, color: 'text-accent-amber' },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Left column: 2/3 */}
      <div className="lg:col-span-2 space-y-6">
        {/* Balance card */}
        <div className="card overflow-hidden">
          <div className="bg-gradient-to-br from-brand-600 via-brand-700 to-brand-800 p-8">
            <h1 className="text-xl font-bold text-white/90 mb-1">{pool.name}</h1>
            {pool.description && (
              <p className="text-sm text-white/50 mb-5">{pool.description}</p>
            )}
            <p className="text-5xl font-mono font-extrabold tracking-tight text-white">
              {formatCurrency(pool.balance)}
            </p>
            <p className="text-sm text-white/40 uppercase tracking-wider mt-2">
              {pool.currency || 'USDC'}
            </p>
          </div>

          <div className="p-5">
            <button
              onClick={() => setShowDeposit(!showDeposit)}
              className="w-full btn-primary flex items-center justify-center gap-2"
            >
              <ArrowDownCircle size={18} />
              Deposit
            </button>

            <AnimatePresence>
              {showDeposit && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="pt-4 space-y-3">
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-mono">
                          $
                        </span>
                        <input
                          type="number"
                          placeholder="0.00"
                          value={depositAmount}
                          onChange={(e) => setDepositAmount(e.target.value)}
                          className="input-field pl-7 font-mono"
                          min="0"
                          step="0.01"
                        />
                      </div>
                      <select
                        value={depositToken}
                        onChange={(e) => setDepositToken(e.target.value)}
                        className="input-field w-28"
                      >
                        {TOKENS.map((t) => (
                          <option key={t} value={t}>
                            {t}
                          </option>
                        ))}
                      </select>
                    </div>
                    <button
                      onClick={handleDeposit}
                      disabled={depositing || !depositAmount}
                      className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-semibold bg-emerald-500 hover:bg-emerald-600 text-white transition-all disabled:opacity-50 shadow-lg shadow-emerald-500/25"
                    >
                      {depositing ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : null}
                      {depositing ? 'Processing...' : 'Confirm Deposit'}
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Pending requests */}
        {pendingRequests.length > 0 && (
          <div className="card p-5">
            <h2 className="section-title mb-4">
              Pending Requests ({pendingRequests.length})
            </h2>
            <div className="space-y-2">
              {pendingRequests.map((req) => (
                <motion.button
                  key={req.id}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setSelectedRequest(req)}
                  className="w-full flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.04] transition-colors text-left"
                >
                  <span className="text-xl">{getCategoryEmoji(req.category)}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-200 truncate">{req.description}</p>
                    <p className="text-xs text-gray-500">
                      {req.requested_by} &middot; {formatRelativeTime(req.created_at)}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-mono font-bold text-rose-400">
                      {formatCurrency(req.amount)}
                    </p>
                    <p className="text-[10px] text-gray-500">
                      {req.votes?.length || 0}/{req.votes_needed} votes
                    </p>
                  </div>
                  <ChevronRight size={16} className="text-gray-600 shrink-0" />
                </motion.button>
              ))}
            </div>
          </div>
        )}

        {/* Recent transactions */}
        {recentTxs.length > 0 && (
          <div className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="section-title">Recent Activity</h2>
              <button
                onClick={() => navigate(`/pool/${id}/ledger`)}
                className="text-xs text-brand-400 font-medium hover:text-brand-300 transition-colors"
              >
                View all
              </button>
            </div>
            {recentTxs.map((tx) => (
              <TransactionItem key={tx.id} tx={tx} />
            ))}
          </div>
        )}
      </div>

      {/* Right column: 1/3 */}
      <div className="space-y-6">
        {/* Members */}
        <div className="card p-5">
          <h2 className="section-title mb-4">
            Members ({pool.members.length})
          </h2>
          <div className="space-y-3">
            {pool.members.map((m) => (
              <div key={m.id} className="flex items-center gap-3">
                <MemberAvatar name={m.display_name} color={m.avatar_color} size="md" showOnline />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-200 truncate">
                    {m.display_name}
                  </p>
                  <p className="text-xs text-gray-500 font-mono">
                    {formatCurrency(m.contribution)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Contribution bars */}
        {pool.members.length > 0 && (
          <div className="card p-5">
            <h2 className="section-title mb-3">Contributions</h2>
            {pool.members.map((m) => (
              <ContributionBar key={m.id} member={m} total={pool.balance} />
            ))}
          </div>
        )}

        {/* Action buttons */}
        <div className="grid grid-cols-2 gap-3">
          {actions.map((a) => (
            <button
              key={a.label}
              onClick={() => navigate(a.path)}
              className="card p-4 flex flex-col items-center gap-2 hover:bg-white/[0.04] transition-all group"
            >
              <a.icon size={20} className={`${a.color} group-hover:scale-110 transition-transform`} />
              <span className="text-xs font-medium text-gray-400 group-hover:text-gray-200 transition-colors">{a.label}</span>
            </button>
          ))}
        </div>

        {/* Quick deposit (sidebar) */}
        <div className="card p-5">
          <h2 className="section-title mb-3">Quick Deposit</h2>
          <div className="space-y-3">
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-mono">$</span>
              <input
                type="number"
                placeholder="0.00"
                value={depositAmount}
                onChange={(e) => setDepositAmount(e.target.value)}
                className="input-field pl-7 font-mono"
                min="0"
                step="0.01"
              />
            </div>
            <button
              onClick={handleDeposit}
              disabled={depositing || !depositAmount}
              className="w-full btn-primary disabled:opacity-50 text-sm"
            >
              {depositing ? 'Processing...' : 'Deposit'}
            </button>
          </div>
        </div>
      </div>

      {/* Vote modal */}
      {selectedRequest && (
        <VoteModal
          request={selectedRequest}
          poolId={id!}
          members={pool.members}
          currentAccount={account!}
          onClose={() => setSelectedRequest(null)}
          onVoted={() => {
            setSelectedRequest(null);
            showToast('Vote submitted!');
            loadData();
          }}
        />
      )}

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-2xl bg-surface-800 border border-white/[0.08] text-gray-100 text-sm font-medium shadow-xl backdrop-blur-sm"
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
