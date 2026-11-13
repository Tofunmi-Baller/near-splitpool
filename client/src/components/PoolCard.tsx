import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import MemberAvatar from './MemberAvatar';
import { formatCurrency } from '../lib/utils';
import type { Pool } from '../lib/types';

interface PoolCardProps {
  pool: Pool;
}

export default function PoolCard({ pool }: PoolCardProps) {
  const navigate = useNavigate();

  return (
    <motion.div
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.98 }}
      className="card p-5 cursor-pointer group"
      onClick={() => navigate(`/pool/${pool.id}`)}
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="font-bold text-lg group-hover:text-brand-500 transition-colors">
            {pool.name}
          </h3>
          {pool.description && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-1">
              {pool.description}
            </p>
          )}
        </div>
        <div className="text-right">
          <p className="font-mono font-bold text-xl tracking-tight">
            {formatCurrency(pool.balance)}
          </p>
          <p className="text-xs text-gray-400 uppercase tracking-wide">{pool.currency || 'USDC'}</p>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex -space-x-2">
          {pool.members.slice(0, 5).map((m) => (
            <MemberAvatar
              key={m.id}
              name={m.display_name}
              color={m.avatar_color}
              size="sm"
            />
          ))}
          {pool.members.length > 5 && (
            <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-xs font-medium ring-2 ring-white dark:ring-surface-card-dark">
              +{pool.members.length - 5}
            </div>
          )}
        </div>
        <span className="text-xs text-gray-400">
          {pool.members.length} member{pool.members.length !== 1 ? 's' : ''}
        </span>
      </div>
    </motion.div>
  );
}
