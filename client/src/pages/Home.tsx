import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Plus, RefreshCw } from 'lucide-react';
import PoolCard from '../components/PoolCard';
import { useWallet } from '../context/WalletContext';
import { fetchPools } from '../api/client';
import type { Pool } from '../lib/types';

export default function Home() {
  const [pools, setPools] = useState<Pool[]>([]);
  const [loading, setLoading] = useState(true);
  const { account } = useWallet();
  const navigate = useNavigate();

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

  useEffect(() => {
    load();
  }, [account]);

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-bold">Your Pools</h1>
          {!loading && (
            <p className="text-sm text-gray-500 mt-0.5">
              {pools.length} pool{pools.length !== 1 ? 's' : ''}
            </p>
          )}
        </div>
        <button
          onClick={load}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Loading */}
      {loading && (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="card p-5 animate-pulse">
              <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-3" />
              <div className="h-7 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-4" />
              <div className="flex gap-2">
                <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded-full" />
                <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded-full" />
                <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && pools.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-16"
        >
          <span className="text-6xl block mb-4">{'\u{1F3CA}'}</span>
          <h2 className="text-xl font-bold mb-2">No pools yet!</h2>
          <p className="text-gray-500 mb-6 max-w-xs mx-auto">
            Create one or ask a friend to invite you. Pool money together and split expenses
            transparently.
          </p>
          <button onClick={() => navigate('/create')} className="btn-primary">
            Create Your First Pool
          </button>
        </motion.div>
      )}

      {/* Pool list */}
      {!loading && pools.length > 0 && (
        <motion.div
          className="space-y-3"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ staggerChildren: 0.1 }}
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
        </motion.div>
      )}

      {/* Floating create button */}
      {!loading && pools.length > 0 && (
        <motion.button
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.3, type: 'spring' }}
          onClick={() => navigate('/create')}
          className="fixed bottom-20 right-4 sm:right-8 w-14 h-14 rounded-full bg-brand-500 hover:bg-brand-600 text-white shadow-lg shadow-brand-500/30 flex items-center justify-center z-30"
        >
          <Plus size={24} />
        </motion.button>
      )}
    </div>
  );
}
