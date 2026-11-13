import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Plus,
  RefreshCw,
  Wallet,
  Users,
  ArrowLeftRight,
  Clock,
} from 'lucide-react';
import PoolCard from '../components/PoolCard';
import { useWallet } from '../context/WalletContext';
import { fetchPools, seedDemo } from '../api/client';
import { formatCurrency } from '../lib/utils';
import type { Pool } from '../lib/types';

export default function Home() {
  const [pools, setPools] = useState<Pool[]>([]);
  const [loading, setLoading] = useState(true);
  const { account, displayName } = useWallet();
  const navigate = useNavigate();
  const seededRef = useRef(false);

  const load = async () => {
    setLoading(true);
    try {
      const mine = account ? await fetchPools(account) : [];
      if (mine.length > 0) {
        setPools(mine);
      } else {
        const all = await fetchPools();
        setPools(all);
      }
    } catch {
      setPools([]);
    }
    setLoading(false);
  };

  // Auto-seed when no pools exist
  const autoSeed = async () => {
    if (seededRef.current) return;
    seededRef.current = true;
    try {
      const data = await seedDemo();
      if (data.poolId) {
        navigate(`/pool/${data.poolId}`);
      } else {
        load();
      }
    } catch {
      // Seed failed, just show empty state
      seededRef.current = false;
    }
  };

  useEffect(() => {
    load();
  }, [account]);

  useEffect(() => {
    if (!loading && pools.length === 0 && !seededRef.current) {
      autoSeed();
    }
  }, [loading, pools.length]);

  // Compute stats from pools
  const totalBalance = pools.reduce((sum, p) => sum + p.balance, 0);
  const totalMembers = pools.reduce((sum, p) => sum + p.members.length, 0);
  const totalTxEstimate = pools.length * 5; // Rough estimate
  const pendingEstimate = pools.length > 0 ? 1 : 0;

  const stats = [
    {
      label: 'Total Balance',
      value: formatCurrency(totalBalance),
      icon: Wallet,
      color: 'text-brand-400',
    },
    {
      label: 'Members',
      value: totalMembers.toString(),
      icon: Users,
      color: 'text-accent-cyan',
    },
    {
      label: 'Transactions',
      value: totalTxEstimate.toString(),
      icon: ArrowLeftRight,
      color: 'text-accent-teal',
    },
    {
      label: 'Pending',
      value: pendingEstimate.toString(),
      icon: Clock,
      color: 'text-accent-amber',
    },
  ];

  return (
    <div>
      {/* Hero */}
      <div className="mb-8">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="text-3xl font-bold text-gray-100 mb-1">
            Welcome back, <span className="text-gradient">{displayName || 'User'}</span>
          </h1>
          <div className="flex items-center gap-2 mt-2">
            <span className="badge-success">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              Connected
            </span>
            <span className="text-sm text-gray-500 font-mono">{account}</span>
          </div>
        </motion.div>
      </div>

      {/* Stats */}
      {!loading && pools.length > 0 && (
        <motion.div
          className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          {stats.map((stat, i) => {
            const Icon = stat.icon;
            return (
              <div key={stat.label} className="stat-card">
                <div className="flex items-center gap-2 mb-2">
                  <Icon size={16} className={stat.color} />
                  <span className="section-title">{stat.label}</span>
                </div>
                <p className="text-2xl font-mono font-bold text-gray-100">{stat.value}</p>
              </div>
            );
          })}
        </motion.div>
      )}

      {/* Section title */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-bold text-gray-100">Your Pools</h2>
          {!loading && (
            <span className="badge-info">
              {pools.length}
            </span>
          )}
        </div>
        <button
          onClick={load}
          className="p-2 rounded-lg hover:bg-white/[0.06] transition-colors text-gray-400"
        >
          <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Loading skeletons */}
      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="card p-6 animate-pulse">
              <div className="h-5 bg-white/[0.06] rounded w-1/3 mb-3" />
              <div className="h-8 bg-white/[0.06] rounded w-1/2 mb-4" />
              <div className="flex gap-2">
                <div className="w-8 h-8 bg-white/[0.06] rounded-full" />
                <div className="w-8 h-8 bg-white/[0.06] rounded-full" />
                <div className="w-8 h-8 bg-white/[0.06] rounded-full" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pool grid */}
      {!loading && pools.length > 0 && (
        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          {pools.map((pool, i) => (
            <motion.div
              key={pool.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
            >
              <PoolCard pool={pool} />
            </motion.div>
          ))}

          {/* Create new pool card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: pools.length * 0.08 }}
          >
            <button
              onClick={() => navigate('/create')}
              className="w-full h-full min-h-[160px] rounded-xl border-2 border-dashed border-white/[0.08] hover:border-brand-500/40 hover:bg-white/[0.02] transition-all flex flex-col items-center justify-center gap-3 text-gray-500 hover:text-brand-400 group"
            >
              <div className="w-12 h-12 rounded-full bg-white/[0.04] group-hover:bg-brand-500/10 flex items-center justify-center transition-colors">
                <Plus size={24} />
              </div>
              <span className="text-sm font-medium">Create New Pool</span>
            </button>
          </motion.div>
        </motion.div>
      )}

      {/* Empty state -- should rarely appear due to auto-seed */}
      {!loading && pools.length === 0 && seededRef.current && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-16"
        >
          <div className="w-16 h-16 rounded-2xl bg-white/[0.04] flex items-center justify-center mx-auto mb-4">
            <Wallet size={32} className="text-gray-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-200 mb-2">No pools yet</h2>
          <p className="text-gray-500 mb-6 max-w-sm mx-auto">
            Create a pool to start splitting expenses with your group.
          </p>
          <button onClick={() => navigate('/create')} className="btn-primary">
            Create Your First Pool
          </button>
        </motion.div>
      )}
    </div>
  );
}
