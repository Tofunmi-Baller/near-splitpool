import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ArrowRight, Loader2, CheckCircle2 } from 'lucide-react';
import MemberAvatar from '../components/MemberAvatar';
import { fetchPool, fetchSettlement, executeSettlement } from '../api/client';
import { formatCurrency, truncateTxHash } from '../lib/utils';
import type { Pool, Settlement } from '../lib/types';

export default function SettleUp() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [pool, setPool] = useState<Pool | null>(null);
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [loading, setLoading] = useState(true);
  const [executing, setExecuting] = useState(false);
  const [txResults, setTxResults] = useState<any[]>([]);
  const [done, setDone] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [p, s] = await Promise.all([
          fetchPool(id!),
          fetchSettlement(id!).catch(() => ({ settlements: [] })),
        ]);
        setPool(p);
        const mapped = (s.settlements || []).map((t: any) => {
          const fromMember = p.members.find((m: any) => m.near_account === t.from);
          const toMember = p.members.find((m: any) => m.near_account === t.to);
          return {
            from: fromMember || { display_name: t.from, avatar_color: '#6366F1' },
            to: toMember || { display_name: t.to, avatar_color: '#10B981' },
            amount: t.amount,
          };
        });
        setSettlements(mapped);
      } catch (err) {
        console.error(err);
      }
      setLoading(false);
    })();
  }, [id]);

  const handleExecute = async () => {
    setExecuting(true);
    try {
      const res = await executeSettlement(id!);
      const results = (res.executed || []).map((r: any) => r.transaction || r);
      setTxResults(results);
      setDone(true);
    } catch (err: any) {
      console.error(err);
    }
    setExecuting(false);
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="card p-5 animate-pulse">
            <div className="h-12 bg-white/[0.06] rounded" />
          </div>
        ))}
      </div>
    );
  }

  if (!pool) return null;

  const fairShare = pool.balance / (pool.members.length || 1);

  return (
    <div className="max-w-2xl mx-auto">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1 text-sm text-gray-500 mb-4 hover:text-gray-300 transition-colors"
      >
        <ArrowLeft size={16} />
        Back
      </button>

      <h1 className="text-3xl font-bold text-gray-100 mb-2">Time to settle up</h1>
      <p className="text-gray-500 mb-8">Calculate and execute fair settlements</p>

      {/* Member balances */}
      <div className="card p-5 mb-6">
        <h2 className="section-title mb-4">Balances</h2>
        <div className="space-y-3">
          {pool.members.map((m) => {
            const diff = m.contribution - fairShare;
            return (
              <div key={m.id} className="flex items-center gap-3">
                <MemberAvatar name={m.display_name} color={m.avatar_color} size="md" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-200">{m.display_name}</p>
                  <p className="text-xs text-gray-500">
                    Contributed: {formatCurrency(m.contribution)} | Fair share:{' '}
                    {formatCurrency(fairShare)}
                  </p>
                </div>
                <span
                  className={`font-mono font-bold text-sm ${
                    diff > 0.01
                      ? 'text-emerald-400'
                      : diff < -0.01
                      ? 'text-rose-400'
                      : 'text-gray-500'
                  }`}
                >
                  {diff > 0.01 ? '+' : ''}
                  {formatCurrency(diff)}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Settlement transfers */}
      {settlements.length > 0 && !done && (
        <div className="card p-5 mb-6">
          <h2 className="section-title mb-4">Transfers Needed</h2>
          <div className="space-y-3">
            {settlements.map((s, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
                className="flex items-center gap-3 p-4 rounded-xl bg-white/[0.03] border border-white/[0.04]"
              >
                <MemberAvatar
                  name={s.from.display_name}
                  color={s.from.avatar_color}
                  size="sm"
                />
                <div className="flex-1 flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-200">{s.from.display_name}</span>
                  <motion.div
                    animate={{ x: [0, 5, 0] }}
                    transition={{ repeat: Infinity, duration: 1.5 }}
                  >
                    <ArrowRight size={16} className="text-brand-400" />
                  </motion.div>
                  <span className="text-sm font-medium text-gray-200">{s.to.display_name}</span>
                </div>
                <MemberAvatar
                  name={s.to.display_name}
                  color={s.to.avatar_color}
                  size="sm"
                />
                <span className="font-mono font-bold text-brand-400">
                  {formatCurrency(s.amount)}
                </span>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {settlements.length === 0 && !done && (
        <div className="text-center py-10 card mb-6">
          <CheckCircle2 size={40} className="text-emerald-400 mx-auto mb-3" />
          <p className="font-medium text-gray-200">Everyone is settled up!</p>
          <p className="text-sm text-gray-500 mt-1">No transfers needed</p>
        </div>
      )}

      {/* Execute button */}
      {settlements.length > 0 && !done && (
        <button
          onClick={handleExecute}
          disabled={executing}
          className="btn-primary w-full flex items-center justify-center gap-2 mb-6"
        >
          {executing ? (
            <Loader2 size={18} className="animate-spin" />
          ) : null}
          {executing ? 'Executing Settlements...' : 'Execute Settlement'}
        </button>
      )}

      {/* Results */}
      <AnimatePresence>
        {done && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="card p-6 text-center"
          >
            <CheckCircle2 size={48} className="text-emerald-400 mx-auto mb-3" />
            <h2 className="text-xl font-bold text-gray-100 mb-1">All settled!</h2>
            <p className="text-sm text-gray-500 mb-4">
              {txResults.length} transfer{txResults.length !== 1 ? 's' : ''} executed
            </p>

            {txResults.length > 0 && (
              <div className="space-y-2 text-left">
                {txResults.map((tx: any, i: number) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-3 rounded-lg bg-white/[0.03] border border-white/[0.04] text-sm"
                  >
                    <span className="font-mono text-xs text-gray-500">
                      {truncateTxHash(tx.tx_hash || tx.hash || `sim_${i}`)}
                    </span>
                    <span className="badge-info">simulated</span>
                  </div>
                ))}
              </div>
            )}

            <button
              onClick={() => navigate(`/pool/${id}`)}
              className="btn-primary mt-6"
            >
              Back to Pool
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
