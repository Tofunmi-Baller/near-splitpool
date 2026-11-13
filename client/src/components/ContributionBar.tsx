import { motion } from 'framer-motion';
import MemberAvatar from './MemberAvatar';
import { formatCurrency } from '../lib/utils';
import type { Member } from '../lib/types';

interface ContributionBarProps {
  member: Member;
  total: number;
}

export default function ContributionBar({ member, total }: ContributionBarProps) {
  const pct = total > 0 ? (member.contribution / total) * 100 : 0;

  return (
    <div className="flex items-center gap-3 py-2">
      <MemberAvatar name={member.display_name} color={member.avatar_color} size="sm" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm font-medium text-gray-300 truncate">{member.display_name}</span>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">{pct.toFixed(0)}%</span>
            <span className="text-sm font-mono font-bold text-gray-400">
              {formatCurrency(member.contribution)}
            </span>
          </div>
        </div>
        <div className="h-2 bg-white/[0.06] rounded-full overflow-hidden">
          <motion.div
            className="h-full rounded-full"
            style={{ backgroundColor: member.avatar_color || '#3B5BFF' }}
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          />
        </div>
      </div>
    </div>
  );
}
