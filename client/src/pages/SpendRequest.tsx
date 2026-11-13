import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, CheckCircle2, Vote } from 'lucide-react';
import { getCategoryEmoji } from '../components/CategoryIcon';
import { useWallet } from '../context/WalletContext';
import { createSpendRequest } from '../api/client';
import { formatCurrency } from '../lib/utils';

const CATEGORIES = [
  { value: 'groceries', label: 'Groceries', emoji: '\u{1F6D2}' },
  { value: 'rent', label: 'Rent', emoji: '\u{1F3E0}' },
  { value: 'utilities', label: 'Utilities', emoji: '\u{26A1}' },
  { value: 'transport', label: 'Transport', emoji: '\u{1F697}' },
  { value: 'food', label: 'Food', emoji: '\u{1F355}' },
  { value: 'entertainment', label: 'Entertainment', emoji: '\u{1F3AC}' },
  { value: 'supplies', label: 'Supplies', emoji: '\u{1F4E6}' },
  { value: 'other', label: 'Other', emoji: '\u{1F4B3}' },
];

type ResultState = null | { type: 'auto-approved' } | { type: 'pending-votes' };

export default function SpendRequestPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { account } = useWallet();

  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('other');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<ResultState>(null);

  const amountNum = parseFloat(amount) || 0;
  const isUnderLimit = amountNum <= 50;

  const handleSubmit = async () => {
    if (!amount || !description.trim()) {
      setError('Amount and description are required');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await createSpendRequest(id!, {
        requestedBy: account!,
        amount: amountNum,
        description: description.trim(),
        category,
      });
      if (res.request?.status === 'approved' || res.evaluation?.autoApproved) {
        setResult({ type: 'auto-approved' });
      } else {
        setResult({ type: 'pending-votes' });
      }
    } catch (err: any) {
      setError(err.message || 'Failed to create request');
    }
    setLoading(false);
  };

  if (result) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center py-12 max-w-lg mx-auto"
      >
        {result.type === 'auto-approved' ? (
          <>
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', delay: 0.1 }}
            >
              <CheckCircle2 size={64} className="text-emerald-400 mx-auto mb-4" />
            </motion.div>
            <h2 className="text-2xl font-bold text-gray-100 mb-2">Auto-approved!</h2>
            <p className="text-gray-500 mb-1">
              {getCategoryEmoji(category)} {description}
            </p>
            <p className="text-xl font-mono font-bold text-emerald-400">
              {formatCurrency(amountNum)}
            </p>
          </>
        ) : (
          <>
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', delay: 0.1 }}
            >
              <Vote size={64} className="text-brand-400 mx-auto mb-4" />
            </motion.div>
            <h2 className="text-2xl font-bold text-gray-100 mb-2">Submitted for voting</h2>
            <p className="text-gray-500 mb-1">
              {getCategoryEmoji(category)} {description}
            </p>
            <p className="text-xl font-mono font-bold text-brand-400">
              {formatCurrency(amountNum)}
            </p>
            <p className="text-sm text-gray-500 mt-2">
              Waiting for member approvals
            </p>
          </>
        )}

        <button
          onClick={() => navigate(`/pool/${id}`)}
          className="btn-primary mt-8"
        >
          Back to Pool
        </button>
      </motion.div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1 text-sm text-gray-500 mb-4 hover:text-gray-300 transition-colors"
      >
        <ArrowLeft size={16} />
        Back
      </button>

      <h1 className="text-3xl font-bold text-gray-100 mb-2">Request a Spend</h1>
      <p className="text-gray-500 mb-8">Submit an expense for the pool</p>

      <div className="space-y-6">
        {/* Amount */}
        <div className="card p-8 text-center">
          <label className="text-sm text-gray-500 mb-3 block">Amount</label>
          <div className="flex items-center justify-center">
            <span className="text-3xl font-mono text-gray-600 mr-1">$</span>
            <input
              type="number"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="text-4xl font-mono font-bold text-center bg-transparent outline-none w-48 placeholder-gray-700 text-gray-100"
              min="0"
              step="0.01"
            />
          </div>
        </div>

        {/* Rules hint */}
        <AnimatePresence>
          {amountNum > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div
                className={`rounded-xl px-4 py-3 text-sm font-medium border ${
                  isUnderLimit
                    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                    : 'bg-brand-500/10 border-brand-500/20 text-brand-400'
                }`}
              >
                {isUnderLimit ? (
                  <span className="flex items-center gap-2">
                    <CheckCircle2 size={16} />
                    Under $50 -- Auto-approved
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Vote size={16} />
                    Over $50 -- Needs 2 votes
                  </span>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1.5">What's it for?</label>
          <input
            type="text"
            placeholder="Weekly groceries, Uber ride..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="input-field"
            maxLength={100}
          />
        </div>

        {/* Category */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-3">Category</label>
          <div className="grid grid-cols-4 gap-2">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.value}
                onClick={() => setCategory(cat.value)}
                className={`p-3 rounded-xl text-center transition-all border ${
                  category === cat.value
                    ? 'bg-brand-500/10 border-brand-500/30 ring-1 ring-brand-500/40 shadow-sm'
                    : 'bg-white/[0.03] border-white/[0.06] hover:bg-white/[0.06]'
                }`}
              >
                <span className="text-xl block">{cat.emoji}</span>
                <span className="text-[10px] font-medium mt-1 block text-gray-400">{cat.label}</span>
              </button>
            ))}
          </div>
        </div>

        {error && (
          <p className="text-sm text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-xl px-4 py-2">
            {error}
          </p>
        )}

        <button
          onClick={handleSubmit}
          disabled={loading || !amount || !description.trim()}
          className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Submitting...
            </span>
          ) : (
            `Request ${amountNum > 0 ? formatCurrency(amountNum) : 'Spend'}`
          )}
        </button>
      </div>
    </div>
  );
}
