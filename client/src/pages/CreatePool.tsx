import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { X, UserPlus, Shield, Vote } from 'lucide-react';
import { useWallet } from '../context/WalletContext';
import { createPool, addMember } from '../api/client';

const AVATAR_COLORS = [
  '#3B5BFF', '#F43F5E', '#10B981', '#F59E0B', '#8B5CF6',
  '#EC4899', '#06B6D4', '#EF4444', '#14B8A6', '#6366F1',
];

export default function CreatePool() {
  const navigate = useNavigate();
  const { account } = useWallet();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [memberInput, setMemberInput] = useState('');
  const [members, setMembers] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const addInviteMember = () => {
    const trimmed = memberInput.trim();
    if (trimmed && !members.includes(trimmed) && trimmed !== account) {
      setMembers([...members, trimmed]);
      setMemberInput('');
    }
  };

  const removeMember = (m: string) => {
    setMembers(members.filter((x) => x !== m));
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      setError('Pool name is required');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const pool = await createPool({
        name: name.trim(),
        description: description.trim(),
        creator: account!,
      });

      // Add invited members
      for (let i = 0; i < members.length; i++) {
        const nearAccount = members[i];
        const rawName = nearAccount.split('.')[0];
        await addMember(pool.id, {
          nearAccount,
          displayName: rawName.charAt(0).toUpperCase() + rawName.slice(1),
        });
      }

      navigate(`/pool/${pool.id}`);
    } catch (err: any) {
      setError(err.message || 'Failed to create pool');
    }
    setLoading(false);
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Create a Pool</h1>

      <div className="space-y-5">
        {/* Pool name */}
        <div>
          <label className="block text-sm font-medium mb-1.5">Pool Name *</label>
          <input
            type="text"
            placeholder="Apartment expenses, Trip fund..."
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="input-field"
            maxLength={50}
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium mb-1.5">Description</label>
          <textarea
            placeholder="What's this pool for?"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="input-field resize-none"
            maxLength={200}
          />
        </div>

        {/* Currency */}
        <div>
          <label className="block text-sm font-medium mb-1.5">Currency</label>
          <input
            type="text"
            value="USDC"
            disabled
            className="input-field bg-gray-50 dark:bg-gray-900 text-gray-400 cursor-not-allowed"
          />
        </div>

        {/* Invite members */}
        <div>
          <label className="block text-sm font-medium mb-1.5">
            <UserPlus size={14} className="inline mr-1.5" />
            Invite Members
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="bob.testnet"
              value={memberInput}
              onChange={(e) => setMemberInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addInviteMember()}
              className="input-field flex-1"
            />
            <button
              onClick={addInviteMember}
              className="btn-secondary px-4 py-3 text-sm"
            >
              Add
            </button>
          </div>

          {members.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {members.map((m) => (
                <motion.span
                  key={m}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-brand-50 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400 text-sm"
                >
                  {m}
                  <button
                    onClick={() => removeMember(m)}
                    className="hover:text-coral-500 transition-colors"
                  >
                    <X size={14} />
                  </button>
                </motion.span>
              ))}
            </div>
          )}
        </div>

        {/* Default rules preview */}
        <div className="card p-4">
          <h3 className="text-sm font-semibold mb-3 text-gray-500 uppercase tracking-wide">
            Default Rules
          </h3>
          <div className="space-y-2.5">
            <div className="flex items-center gap-3 text-sm">
              <Shield size={16} className="text-brand-500 shrink-0" />
              <span>Personal spend limit: <strong>$50</strong></span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <Vote size={16} className="text-brand-500 shrink-0" />
              <span>Votes needed for big spends: <strong>2</strong></span>
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-3">
            You can customize rules after creating the pool
          </p>
        </div>

        {error && (
          <p className="text-sm text-coral-500 bg-coral-500/10 rounded-xl px-4 py-2">
            {error}
          </p>
        )}

        <button
          onClick={handleSubmit}
          disabled={loading || !name.trim()}
          className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Creating...
            </span>
          ) : (
            'Create Pool'
          )}
        </button>
      </div>
    </div>
  );
}
