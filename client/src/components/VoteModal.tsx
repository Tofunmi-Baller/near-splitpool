import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ThumbsUp, ThumbsDown } from 'lucide-react';
import MemberAvatar from './MemberAvatar';
import { getCategoryEmoji } from './CategoryIcon';
import { formatCurrency, formatRelativeTime } from '../lib/utils';
import { voteOnRequest } from '../api/client';
import type { SpendRequest, Member } from '../lib/types';

interface VoteModalProps {
  request: SpendRequest;
  poolId: string;
  members: Member[];
  currentAccount: string;
  onClose: () => void;
  onVoted: () => void;
}

export default function VoteModal({
  request,
  poolId,
  members,
  currentAccount,
  onClose,
  onVoted,
}: VoteModalProps) {
  const [voting, setVoting] = useState(false);

  const approveCount = request.votes?.filter((v) => v.decision === 'approve').length || 0;
  const rejectCount = request.votes?.filter((v) => v.decision === 'reject').length || 0;
  const alreadyVoted = request.votes?.some((v) => v.voter === currentAccount);

  const handleVote = async (decision: 'approve' | 'reject') => {
    setVoting(true);
    try {
      await voteOnRequest(poolId, request.id, {
        voter: currentAccount,
        decision,
      });
      onVoted();
    } catch (err) {
      console.error(err);
    }
    setVoting(false);
  };

  const getMemberByAccount = (account: string) =>
    members.find((m) => m.near_account === account);

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        {/* Backdrop */}
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

        {/* Sheet */}
        <motion.div
          className="relative w-full max-w-md bg-white dark:bg-surface-card-dark rounded-t-3xl sm:rounded-3xl p-6 pb-8 shadow-2xl"
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        >
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-lg font-bold">Spend Request</h3>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              <X size={20} />
            </button>
          </div>

          {/* Request details */}
          <div className="card p-4 mb-5">
            <div className="flex items-start gap-3">
              <span className="text-2xl">{getCategoryEmoji(request.category)}</span>
              <div className="flex-1">
                <p className="font-semibold">{request.description}</p>
                <p className="text-sm text-gray-500 mt-1">
                  by {request.requested_by} &middot; {formatRelativeTime(request.created_at)}
                </p>
              </div>
              <p className="font-mono font-bold text-xl text-coral-500">
                {formatCurrency(request.amount)}
              </p>
            </div>
          </div>

          {/* Vote tally */}
          <div className="mb-5">
            <p className="text-sm font-medium text-gray-500 mb-3">
              Votes ({approveCount + rejectCount} / {request.votes_needed} needed)
            </p>
            <div className="flex gap-4">
              <div className="flex-1 card p-3 text-center border-mint-500/30">
                <ThumbsUp size={20} className="text-mint-500 mx-auto mb-1" />
                <p className="text-lg font-bold text-mint-500">{approveCount}</p>
                <div className="flex justify-center -space-x-1 mt-1.5">
                  {request.votes
                    ?.filter((v) => v.decision === 'approve')
                    .map((v) => {
                      const m = getMemberByAccount(v.voter);
                      return m ? (
                        <MemberAvatar
                          key={v.id}
                          name={m.display_name}
                          color={m.avatar_color}
                          size="sm"
                        />
                      ) : null;
                    })}
                </div>
              </div>
              <div className="flex-1 card p-3 text-center border-coral-500/30">
                <ThumbsDown size={20} className="text-coral-500 mx-auto mb-1" />
                <p className="text-lg font-bold text-coral-500">{rejectCount}</p>
                <div className="flex justify-center -space-x-1 mt-1.5">
                  {request.votes
                    ?.filter((v) => v.decision === 'reject')
                    .map((v) => {
                      const m = getMemberByAccount(v.voter);
                      return m ? (
                        <MemberAvatar
                          key={v.id}
                          name={m.display_name}
                          color={m.avatar_color}
                          size="sm"
                        />
                      ) : null;
                    })}
                </div>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          {!alreadyVoted ? (
            <div className="flex gap-3">
              <button
                onClick={() => handleVote('reject')}
                disabled={voting}
                className="flex-1 btn-secondary flex items-center justify-center gap-2 text-coral-500"
              >
                <ThumbsDown size={18} />
                Reject
              </button>
              <button
                onClick={() => handleVote('approve')}
                disabled={voting}
                className="flex-1 btn-primary flex items-center justify-center gap-2 bg-mint-500 hover:bg-mint-600"
              >
                <ThumbsUp size={18} />
                Approve
              </button>
            </div>
          ) : (
            <div className="text-center py-3 rounded-xl bg-gray-50 dark:bg-gray-800 text-sm text-gray-500">
              You already voted on this request
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
