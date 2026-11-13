import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Shield, Vote, PieChart, Lock, Save, Loader2 } from 'lucide-react';
import { getCategoryEmoji } from '../components/CategoryIcon';
import { fetchRules, updateRules } from '../api/client';

interface RuleConfig {
  personal_limit: { enabled: boolean; amount: number };
  vote_threshold: { enabled: boolean; votes: number };
  category_budgets: { enabled: boolean; budgets: Record<string, number> };
  pool_lockout: { enabled: boolean };
}

const CATEGORIES = [
  'groceries', 'rent', 'utilities', 'transport',
  'food', 'entertainment', 'supplies', 'other',
];

const DEFAULT: RuleConfig = {
  personal_limit: { enabled: true, amount: 50 },
  vote_threshold: { enabled: true, votes: 2 },
  category_budgets: { enabled: false, budgets: {} },
  pool_lockout: { enabled: false },
};

export default function RulesEditor() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [config, setConfig] = useState<RuleConfig>(DEFAULT);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const rules = await fetchRules(id!);
        const cfg = { ...DEFAULT };
        for (const r of rules) {
          if (r.rule_type === 'personal_spend_limit') {
            cfg.personal_limit = {
              enabled: !!r.enabled,
              amount: r.config?.limit ?? 50,
            };
          } else if (r.rule_type === 'vote_threshold') {
            cfg.vote_threshold = {
              enabled: !!r.enabled,
              votes: r.config?.threshold ?? 2,
            };
          } else if (r.rule_type === 'category_budget') {
            cfg.category_budgets.enabled = true;
            if (r.config?.category && r.config?.limit) {
              cfg.category_budgets.budgets[r.config.category] = r.config.limit;
            }
          } else if (r.rule_type === 'lockout') {
            cfg.pool_lockout = { enabled: !!r.config?.locked };
          }
        }
        setConfig(cfg);
      } catch {
        // Use defaults
      }
      setLoading(false);
    })();
  }, [id]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const rules: any[] = [
        {
          rule_type: 'personal_spend_limit',
          enabled: config.personal_limit.enabled ? 1 : 0,
          config: { limit: config.personal_limit.amount },
        },
        {
          rule_type: 'vote_threshold',
          enabled: config.vote_threshold.enabled ? 1 : 0,
          config: { threshold: config.vote_threshold.votes },
        },
        {
          rule_type: 'lockout',
          enabled: 1,
          config: { locked: config.pool_lockout.enabled, reason: 'Pool frozen by creator' },
        },
      ];
      if (config.category_budgets.enabled) {
        for (const [cat, limit] of Object.entries(config.category_budgets.budgets)) {
          if (limit > 0) {
            rules.push({
              rule_type: 'category_budget',
              enabled: 1,
              config: { category: cat, limit, period: 'monthly' },
            });
          }
        }
      }
      await updateRules(id!, rules);
      setToast('Rules saved!');
      setTimeout(() => setToast(''), 3000);
    } catch (err: any) {
      setToast(err.message || 'Failed to save');
      setTimeout(() => setToast(''), 3000);
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto space-y-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="card p-5 animate-pulse">
            <div className="h-5 bg-white/[0.06] rounded w-1/3 mb-3" />
            <div className="h-4 bg-white/[0.06] rounded w-2/3" />
          </div>
        ))}
      </div>
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

      <h1 className="text-3xl font-bold text-gray-100 mb-2">Pool Rules</h1>
      <p className="text-gray-500 mb-8">
        Programmable guardrails for your shared money
      </p>

      <div className="space-y-4">
        {/* Personal Spend Limit */}
        <RuleCard
          icon={<Shield size={22} className="text-brand-400" />}
          title="Personal Spend Limit"
          description="Members can spend up to this amount without approval"
          enabled={config.personal_limit.enabled}
          onToggle={() =>
            setConfig({
              ...config,
              personal_limit: {
                ...config.personal_limit,
                enabled: !config.personal_limit.enabled,
              },
            })
          }
        >
          <div className="mt-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-500">Limit</span>
              <span className="font-mono font-bold text-lg text-gray-100">
                ${config.personal_limit.amount}
              </span>
            </div>
            <input
              type="range"
              min={5}
              max={500}
              step={5}
              value={config.personal_limit.amount}
              onChange={(e) =>
                setConfig({
                  ...config,
                  personal_limit: {
                    ...config.personal_limit,
                    amount: parseInt(e.target.value),
                  },
                })
              }
              className="w-full h-2 bg-white/[0.06] rounded-full appearance-none cursor-pointer accent-brand-500"
            />
            <div className="flex justify-between text-[10px] text-gray-600 mt-1">
              <span>$5</span>
              <span>$500</span>
            </div>
          </div>
        </RuleCard>

        {/* Vote Threshold */}
        <RuleCard
          icon={<Vote size={22} className="text-accent-violet" />}
          title="Vote Threshold"
          description="Spends above the limit need this many approvals"
          enabled={config.vote_threshold.enabled}
          onToggle={() =>
            setConfig({
              ...config,
              vote_threshold: {
                ...config.vote_threshold,
                enabled: !config.vote_threshold.enabled,
              },
            })
          }
        >
          <div className="mt-4 flex items-center gap-4">
            <span className="text-sm text-gray-500">Approvals needed:</span>
            <div className="flex items-center gap-2">
              <button
                onClick={() =>
                  setConfig({
                    ...config,
                    vote_threshold: {
                      ...config.vote_threshold,
                      votes: Math.max(1, config.vote_threshold.votes - 1),
                    },
                  })
                }
                className="w-8 h-8 rounded-lg bg-white/[0.06] flex items-center justify-center font-bold text-gray-300 hover:bg-white/[0.1] transition-colors"
              >
                -
              </button>
              <span className="font-mono font-bold text-xl w-8 text-center text-gray-100">
                {config.vote_threshold.votes}
              </span>
              <button
                onClick={() =>
                  setConfig({
                    ...config,
                    vote_threshold: {
                      ...config.vote_threshold,
                      votes: Math.min(10, config.vote_threshold.votes + 1),
                    },
                  })
                }
                className="w-8 h-8 rounded-lg bg-white/[0.06] flex items-center justify-center font-bold text-gray-300 hover:bg-white/[0.1] transition-colors"
              >
                +
              </button>
            </div>
          </div>
        </RuleCard>

        {/* Category Budgets */}
        <RuleCard
          icon={<PieChart size={22} className="text-accent-amber" />}
          title="Category Budgets"
          description="Set spending limits per category"
          enabled={config.category_budgets.enabled}
          onToggle={() =>
            setConfig({
              ...config,
              category_budgets: {
                ...config.category_budgets,
                enabled: !config.category_budgets.enabled,
              },
            })
          }
        >
          <div className="mt-4 space-y-2">
            {CATEGORIES.map((cat) => (
              <div key={cat} className="flex items-center gap-3">
                <span className="text-lg w-7">{getCategoryEmoji(cat)}</span>
                <span className="text-sm capitalize flex-1 text-gray-300">{cat}</span>
                <div className="relative w-28">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-gray-500">
                    $
                  </span>
                  <input
                    type="number"
                    placeholder="-"
                    value={config.category_budgets.budgets[cat] || ''}
                    onChange={(e) => {
                      const budgets = { ...config.category_budgets.budgets };
                      if (e.target.value) {
                        budgets[cat] = parseInt(e.target.value);
                      } else {
                        delete budgets[cat];
                      }
                      setConfig({
                        ...config,
                        category_budgets: {
                          ...config.category_budgets,
                          budgets,
                        },
                      });
                    }}
                    className="w-full rounded-lg border border-white/[0.1] bg-white/[0.04] pl-6 pr-2 py-1.5 text-sm font-mono text-gray-200 outline-none focus:ring-2 focus:ring-brand-500/40 placeholder:text-gray-600"
                    min="0"
                  />
                </div>
              </div>
            ))}
          </div>
        </RuleCard>

        {/* Pool Lockout */}
        <RuleCard
          icon={<Lock size={22} className={config.pool_lockout.enabled ? 'text-rose-400' : 'text-gray-500'} />}
          title="Pool Lockout"
          description="Freeze all spending immediately"
          enabled={config.pool_lockout.enabled}
          onToggle={() =>
            setConfig({
              ...config,
              pool_lockout: {
                enabled: !config.pool_lockout.enabled,
              },
            })
          }
          danger={config.pool_lockout.enabled}
        >
          {config.pool_lockout.enabled && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mt-3 text-sm text-rose-400 font-medium"
            >
              All spending is currently frozen
            </motion.p>
          )}
        </RuleCard>

        {/* Save */}
        <button
          onClick={handleSave}
          disabled={saving}
          className="btn-primary w-full flex items-center justify-center gap-2"
        >
          {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
          {saving ? 'Saving...' : 'Save Rules'}
        </button>
      </div>

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

function RuleCard({
  icon,
  title,
  description,
  enabled,
  onToggle,
  danger,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  enabled: boolean;
  onToggle: () => void;
  danger?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <motion.div
      layout
      className={`card p-5 transition-all ${
        danger
          ? 'ring-1 ring-rose-500/40'
          : enabled
          ? 'ring-1 ring-brand-500/20'
          : 'opacity-80'
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <div className="mt-0.5">{icon}</div>
          <div>
            <h3 className="font-semibold text-gray-100">{title}</h3>
            <p className="text-sm text-gray-500 mt-0.5">{description}</p>
          </div>
        </div>

        {/* Toggle switch */}
        <button
          onClick={onToggle}
          className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${
            enabled
              ? danger
                ? 'bg-rose-500'
                : 'bg-brand-500'
              : 'bg-gray-600'
          }`}
        >
          <motion.div
            className="absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-sm"
            animate={{ left: enabled ? 22 : 2 }}
            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
          />
        </button>
      </div>

      <AnimatePresence>
        {enabled && children && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
