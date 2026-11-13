import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { X, UserPlus, Shield, Vote } from 'lucide-react';
import { useWallet } from '../context/WalletContext';
import { createPool, addMember } from '../api/client';

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
    <div className="max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-100 mb-2">Create a Pool</h1>
      <p className="text-gray-500 mb-8">Set up a shared fund with programmable rules</p>

      <div className="space-y-6">
        {/* Pool name */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1.5">Pool Name *</label>
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
          <label className="block text-sm font-medium text-gray-300 mb-1.5">Description</label>
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
          <label className="block text-sm font-medium text-gray-300 mb-1.5">Currency</label>
          <input
            type="text"
            value="USDC"
            disabled
            className="input-field bg-white/[0.02] text-gray-500 cursor-not-allowed"
          />
        </div>

        {/* Invite members */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1.5">
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
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-brand-500/10 border border-brand-500/20 text-brand-400 text-sm"
                >
                  {m}
                  <button
                    onClick={() => removeMember(m)}
                    className="hover:text-rose-400 transition-colors"
                  >
                    <X size={14} />
                  </button>
                </motion.span>
              ))}
            </div>
          )}
        </div>

        {/* Default rules preview */}
        <div className="card p-5">
          <h3 className="section-title mb-4">Default Rules</h3>
          <div className="space-y-3">
            <div className="flex items-center gap-3 text-sm text-gray-300">
              <Shield size={16} className="text-brand-400 shrink-0" />
              <span>Personal spend limit: <strong className="text-gray-100">$50</strong></span>
            </div>
            <div className="flex items-center gap-3 text-sm text-gray-300">
              <Vote size={16} className="text-brand-400 shrink-0" />
              <span>Votes needed for big spends: <strong className="text-gray-100">2</strong></span>
            </div>
          </div>
          <p className="text-xs text-gray-600 mt-4">
            You can customize rules after creating the pool
          </p>
        </div>

        {error && (
          <p className="text-sm text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-xl px-4 py-2">
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
