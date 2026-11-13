import { useState, useCallback, useRef, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  PlusCircle,
  Users,
  ArrowDownCircle,
  Settings,
  Receipt,
  CheckCircle,
  Handshake,
  ChevronLeft,
  Loader2,
  Shield,
  Vote,
  ShoppingCart,
  Film,
  ArrowRight,
  RotateCcw,
  Sparkles,
  ExternalLink,
  Check,
  Clock,
  ArrowRightLeft,
} from 'lucide-react';
import {
  createPool,
  addMember,
  deposit,
  updateRules,
  createSpendRequest,
  voteOnRequest,
  fetchSettlement,
  executeSettlement,
} from '../api/client';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface StepDef {
  title: string;
  description: string;
  icon: React.ElementType;
}

type StepStatus = 'locked' | 'ready' | 'running' | 'done';

interface SubResult {
  id: string;
  label: string;
  content: React.ReactNode;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STEPS: StepDef[] = [
  { title: 'Create Pool', description: 'Create a shared wallet named "Apartment Q4 2027" for roommate expenses.', icon: PlusCircle },
  { title: 'Invite Roommates', description: 'Add 3 more roommates to the pool by their NEAR accounts.', icon: Users },
  { title: 'Fund the Pool', description: 'Members deposit funds via NEAR Intents. Any token auto-swaps to USDC.', icon: ArrowDownCircle },
  { title: 'Set Spending Rules', description: 'The pool creator configures programmable rules that the system enforces automatically.', icon: Settings },
  { title: 'Request a Spend', description: 'Alice requests $35 for groceries (auto-approved!), then Bob requests $800 for rent (needs votes).', icon: Receipt },
  { title: 'Group Vote', description: 'Alice and Carol vote to approve the $800 rent payment. Once 2 approvals are reached, it executes automatically.', icon: CheckCircle },
  { title: 'Settlement', description: 'Calculate who owes who and generate settlement transactions.', icon: Handshake },
];

const AVATAR_COLORS: Record<string, string> = {
  alice: '#3B5BFF',
  bob: '#06B6D4',
  carol: '#F59E0B',
  dave: '#10B981',
};

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

function truncateHash(hash: string | undefined | null): string {
  if (!hash) return 'Bx7k...3fQp';
  if (hash.length <= 12) return hash;
  return `${hash.slice(0, 4)}...${hash.slice(-4)}`;
}

function formatUSD(n: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function Avatar({ name, size = 32 }: { name: string; size?: number }) {
  const initial = name.charAt(0).toUpperCase();
  const color = AVATAR_COLORS[name.toLowerCase()] ?? '#8B5CF6';
  return (
    <div
      className="inline-flex items-center justify-center rounded-full text-white font-bold shrink-0"
      style={{ width: size, height: size, backgroundColor: color, fontSize: size * 0.42 }}
    >
      {initial}
    </div>
  );
}

function TxBadge({ hash, simulated = true }: { hash?: string | null; simulated?: boolean }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <code className="font-mono text-xs text-gray-500">{truncateHash(hash)}</code>
      {simulated && <span className="badge-info text-[10px]">simulated</span>}
    </span>
  );
}

function PulsingDot() {
  return (
    <span className="relative flex h-2.5 w-2.5">
      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-400 opacity-75" />
      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-brand-500" />
    </span>
  );
}

function RunningLabel({ text }: { text: string }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex items-center gap-2 text-sm text-brand-400"
    >
      <Loader2 className="w-4 h-4 animate-spin" />
      {text}
    </motion.div>
  );
}

function ResultCard({ children, delay: d = 0 }: { children: React.ReactNode; delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 24 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: d * 0.001, duration: 0.35, ease: 'easeOut' }}
      className="card p-5 mb-4"
    >
      {children}
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Step Result renderers
// ---------------------------------------------------------------------------

function StepResults({ stepIndex, results }: { stepIndex: number; results: SubResult[] }) {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={stepIndex}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
      >
        {results.map((r, i) => (
          <motion.div
            key={r.id}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.08, duration: 0.35 }}
          >
            {r.content}
          </motion.div>
        ))}
      </motion.div>
    </AnimatePresence>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function DemoPage() {
  const navigate = useNavigate();

  // Step state
  const [currentStep, setCurrentStep] = useState(0);
  const [stepStatuses, setStepStatuses] = useState<StepStatus[]>([
    'ready',
    ...Array(6).fill('locked'),
  ] as StepStatus[]);
  const [running, setRunning] = useState(false);
  const [runningLabel, setRunningLabel] = useState('');
  const [results, setResults] = useState<SubResult[][]>(Array(7).fill([]));
  const [completed, setCompleted] = useState(false);

  // Persisted data between steps
  const poolIdRef = useRef<string>('');
  const pendingReqIdRef = useRef<string>('');
  const runningBalanceRef = useRef(0);

  // Scroll result panel to bottom as new items appear
  const resultPanelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (resultPanelRef.current) {
      resultPanelRef.current.scrollTo({
        top: resultPanelRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
  }, [results]);

  // ---- helpers ----
  const addResult = useCallback((stepIdx: number, sub: SubResult) => {
    setResults((prev) => {
      const next = [...prev];
      next[stepIdx] = [...next[stepIdx], sub];
      return next;
    });
  }, []);

  const setStatus = useCallback((idx: number, s: StepStatus) => {
    setStepStatuses((prev) => {
      const next = [...prev];
      next[idx] = s;
      return next;
    });
  }, []);

  // ---- step runners ----

  const runStep0 = async () => {
    setRunningLabel('Creating pool on NEAR...');
    const pool = await createPool({
      name: 'Apartment Q4 2027',
      description: 'Shared expenses — rent, groceries, utilities',
      creator: 'alice.testnet',
    });
    poolIdRef.current = pool.id;
    addResult(0, {
      id: 'pool-created',
      label: 'Pool Created',
      content: (
        <div className="card p-5 mb-4">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-lg font-semibold text-white">{pool.name}</h3>
              <p className="text-sm text-gray-400 mt-0.5">{pool.description}</p>
            </div>
            <span className="badge-success">Created</span>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-500">Pool ID</span>
              <p className="font-mono text-xs text-gray-300 mt-0.5">{truncateHash(pool.id)}</p>
            </div>
            <div>
              <span className="text-gray-500">Creator</span>
              <div className="flex items-center gap-2 mt-0.5">
                <Avatar name="Alice" size={20} />
                <span className="text-gray-300">alice.testnet</span>
              </div>
            </div>
            <div>
              <span className="text-gray-500">Currency</span>
              <p className="text-gray-300 mt-0.5">USDC</p>
            </div>
            <div>
              <span className="text-gray-500">Created</span>
              <p className="text-gray-300 mt-0.5">{new Date().toLocaleTimeString()}</p>
            </div>
          </div>
        </div>
      ),
    });
  };

  const runStep1 = async () => {
    const members = [
      { nearAccount: 'bob.testnet', displayName: 'Bob' },
      { nearAccount: 'carol.testnet', displayName: 'Carol' },
      { nearAccount: 'dave.testnet', displayName: 'Dave' },
    ];

    for (let i = 0; i < members.length; i++) {
      setRunningLabel(`Adding ${members[i].displayName}...`);
      const m = await addMember(poolIdRef.current, members[i]);
      await delay(400);
      addResult(1, {
        id: `member-${i}`,
        label: members[i].displayName,
        content: (
          <div className="card p-4 mb-3 flex items-center gap-4">
            <Avatar name={members[i].displayName} />
            <div className="flex-1 min-w-0">
              <p className="font-medium text-white">{members[i].displayName}</p>
              <p className="text-sm text-gray-500 font-mono">{members[i].nearAccount}</p>
            </div>
            <div className="text-right">
              <span className="badge-success text-xs">Joined</span>
              <p className="text-[11px] text-gray-600 mt-0.5">{new Date().toLocaleTimeString()}</p>
            </div>
          </div>
        ),
      });
    }

    // show summary
    addResult(1, {
      id: 'member-summary',
      label: 'Summary',
      content: (
        <div className="mt-2 p-4 rounded-lg bg-brand-500/5 border border-brand-500/10">
          <p className="text-sm text-brand-300">
            <Check className="w-4 h-4 inline mr-1.5 -mt-0.5" />
            Pool now has <strong>4 members</strong>: Alice (creator), Bob, Carol, and Dave
          </p>
        </div>
      ),
    });
  };

  const runStep2 = async () => {
    const deposits = [
      { nearAccount: 'alice.testnet', amount: 500, token: 'USDC', name: 'Alice' },
      { nearAccount: 'bob.testnet', amount: 75, token: 'NEAR', name: 'Bob' },
      { nearAccount: 'carol.testnet', amount: 300, token: 'USDC', name: 'Carol' },
      { nearAccount: 'dave.testnet', amount: 200, token: 'wNEAR', name: 'Dave' },
    ];

    let runningTotal = 0;

    for (let i = 0; i < deposits.length; i++) {
      const d = deposits[i];
      setRunningLabel(`Depositing ${d.amount} ${d.token} from ${d.name}...`);
      const res = await deposit(poolIdRef.current, {
        nearAccount: d.nearAccount,
        amount: d.amount,
        token: d.token,
      });

      const txn = res.transaction || {};
      const dep = res.deposit || {};
      const depositedUSDC = dep.amountUSDC ?? txn.amount ?? d.amount;
      const fee = dep.fee ?? 0;
      const isSwap = d.token !== 'USDC';
      runningTotal += Number(depositedUSDC);

      await delay(500);

      addResult(2, {
        id: `deposit-${i}`,
        label: d.name,
        content: (
          <div className="card p-5 mb-3">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <Avatar name={d.name} />
                <div>
                  <p className="font-medium text-white">{d.name}</p>
                  <p className="text-xs text-gray-500 font-mono">{d.nearAccount}</p>
                </div>
              </div>
              <span className="badge-success">Deposited</span>
            </div>

            {isSwap ? (
              <div className="mb-3 p-3 rounded-lg bg-accent-cyan/5 border border-accent-cyan/10">
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-gray-300 font-semibold">{d.amount} {d.token}</span>
                  <ArrowRightLeft className="w-4 h-4 text-accent-cyan" />
                  <span className="text-accent-cyan font-semibold">{formatUSD(depositedUSDC)}</span>
                  <span className="text-xs text-gray-500">USDC</span>
                </div>
                <p className="text-[11px] text-accent-cyan/70 mt-1">Swapped via NEAR Intents</p>
              </div>
            ) : (
              <div className="mb-3">
                <span className="text-2xl font-bold text-white">{formatUSD(depositedUSDC)}</span>
                <span className="text-sm text-gray-500 ml-1.5">USDC</span>
              </div>
            )}

            <div className="flex items-center justify-between text-xs">
              <TxBadge hash={txn.tx_hash} />
              {fee > 0 && (
                <span className="text-gray-500">Fee: {formatUSD(fee)}</span>
              )}
            </div>

            <div className="mt-3 pt-3 border-t border-white/[0.04] flex items-center justify-between">
              <span className="text-xs text-gray-500">Pool Balance</span>
              <span className="text-sm font-semibold text-white">{formatUSD(runningTotal)}</span>
            </div>
          </div>
        ),
      });
    }

    runningBalanceRef.current = runningTotal;
  };

  const runStep3 = async () => {
    setRunningLabel('Configuring spending rules...');
    const rules = await updateRules(poolIdRef.current, [
      { rule_type: 'personal_spend_limit', config: { limit: 50 }, enabled: 1 },
      { rule_type: 'vote_threshold', config: { threshold: 2 }, enabled: 1 },
      { rule_type: 'category_budget', config: { category: 'groceries', limit: 600, period: 'monthly' }, enabled: 1 },
      { rule_type: 'category_budget', config: { category: 'entertainment', limit: 200, period: 'monthly' }, enabled: 1 },
    ]);

    await delay(300);

    const ruleCards: { icon: React.ElementType; title: string; desc: string; color: string }[] = [
      { icon: Shield, title: 'Personal Spend Limit: $50', desc: 'Spends under $50 auto-approve — no vote needed', color: 'text-brand-400' },
      { icon: Vote, title: 'Vote Threshold: 2 approvals', desc: 'Bigger spends need group consensus', color: 'text-accent-violet' },
      { icon: ShoppingCart, title: 'Groceries Budget: $600/month', desc: 'Monthly cap on grocery spending', color: 'text-accent-emerald' },
      { icon: Film, title: 'Entertainment Budget: $200/month', desc: 'Monthly cap on entertainment', color: 'text-accent-amber' },
    ];

    for (let i = 0; i < ruleCards.length; i++) {
      await delay(350);
      const rc = ruleCards[i];
      const Icon = rc.icon;
      addResult(3, {
        id: `rule-${i}`,
        label: rc.title,
        content: (
          <div className="card p-4 mb-3 flex items-start gap-4">
            <div className={`mt-0.5 ${rc.color}`}>
              <Icon className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-white text-sm">{rc.title}</p>
              <p className="text-xs text-gray-500 mt-0.5">{rc.desc}</p>
            </div>
            <span className="badge-info text-[10px]">Active</span>
          </div>
        ),
      });
    }
  };

  const runStep4 = async () => {
    // Request 1: auto-approved
    setRunningLabel('Alice requesting $35 for groceries...');
    const r1 = await createSpendRequest(poolIdRef.current, {
      requestedBy: 'alice.testnet',
      amount: 35,
      description: 'Weekly groceries',
      category: 'groceries',
    });

    await delay(500);

    const autoApproved = r1.evaluation?.autoApproved ?? (r1.request?.status === 'approved');
    addResult(4, {
      id: 'spend-1',
      label: 'Groceries',
      content: (
        <div className="card p-5 mb-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <Avatar name="Alice" />
              <div>
                <p className="font-medium text-white">Weekly groceries</p>
                <p className="text-xs text-gray-500">alice.testnet &middot; groceries</p>
              </div>
            </div>
            <span className="text-xl font-bold text-white">{formatUSD(35)}</span>
          </div>
          <div className="p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/10 mb-3">
            <p className="text-sm text-emerald-400 font-medium">
              <Check className="w-4 h-4 inline mr-1 -mt-0.5" />
              Auto-approved
            </p>
            <p className="text-xs text-emerald-400/70 mt-0.5">
              Under the $50 personal limit — no vote needed
            </p>
          </div>
          {r1.transaction && <TxBadge hash={r1.transaction?.tx_hash} />}
        </div>
      ),
    });

    // Request 2: needs votes
    setRunningLabel('Bob requesting $800 for rent...');
    await delay(600);
    const r2 = await createSpendRequest(poolIdRef.current, {
      requestedBy: 'bob.testnet',
      amount: 800,
      description: 'November rent',
      category: 'rent',
    });

    const req2 = r2.request || r2;
    pendingReqIdRef.current = req2.id;
    const votesNeeded = r2.evaluation?.votesNeeded ?? req2.votes_needed ?? 2;

    await delay(400);
    addResult(4, {
      id: 'spend-2',
      label: 'Rent',
      content: (
        <div className="card p-5 mb-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <Avatar name="Bob" />
              <div>
                <p className="font-medium text-white">November rent</p>
                <p className="text-xs text-gray-500">bob.testnet &middot; rent</p>
              </div>
            </div>
            <span className="text-xl font-bold text-white">{formatUSD(800)}</span>
          </div>
          <div className="p-3 rounded-lg bg-amber-500/5 border border-amber-500/10 mb-3">
            <p className="text-sm text-amber-400 font-medium">
              Pending votes
            </p>
            <p className="text-xs text-amber-400/70 mt-0.5">
              Over the $50 limit — needs {votesNeeded} member approvals
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <Clock className="w-3.5 h-3.5" />
            <span>0 / {votesNeeded} votes</span>
          </div>
        </div>
      ),
    });
  };

  const runStep5 = async () => {
    // Vote 1
    setRunningLabel('Alice voting to approve...');
    const v1 = await voteOnRequest(poolIdRef.current, pendingReqIdRef.current, {
      voter: 'alice.testnet',
      decision: 'approve',
    });

    await delay(500);
    addResult(5, {
      id: 'vote-1',
      label: 'Alice votes',
      content: (
        <div className="card p-4 mb-3">
          <div className="flex items-center gap-3 mb-3">
            <Avatar name="Alice" />
            <div className="flex-1">
              <p className="font-medium text-white text-sm">Alice</p>
              <p className="text-xs text-gray-500">alice.testnet</p>
            </div>
            <span className="badge-success">Approve</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex-1 h-2 rounded-full bg-white/[0.06] overflow-hidden">
              <motion.div
                className="h-full bg-brand-500 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: '50%' }}
                transition={{ duration: 0.6, ease: 'easeOut' }}
              />
            </div>
            <span className="text-xs font-medium text-gray-400">1 / 2</span>
          </div>
        </div>
      ),
    });

    // Vote 2
    setRunningLabel('Carol voting to approve...');
    await delay(800);
    const v2 = await voteOnRequest(poolIdRef.current, pendingReqIdRef.current, {
      voter: 'carol.testnet',
      decision: 'approve',
    });

    await delay(400);
    addResult(5, {
      id: 'vote-2',
      label: 'Carol votes',
      content: (
        <div className="card p-4 mb-3">
          <div className="flex items-center gap-3 mb-3">
            <Avatar name="Carol" />
            <div className="flex-1">
              <p className="font-medium text-white text-sm">Carol</p>
              <p className="text-xs text-gray-500">carol.testnet</p>
            </div>
            <span className="badge-success">Approve</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex-1 h-2 rounded-full bg-white/[0.06] overflow-hidden">
              <motion.div
                className="h-full bg-emerald-500 rounded-full"
                initial={{ width: '50%' }}
                animate={{ width: '100%' }}
                transition={{ duration: 0.6, ease: 'easeOut' }}
              />
            </div>
            <span className="text-xs font-medium text-emerald-400">2 / 2</span>
          </div>
        </div>
      ),
    });

    await delay(400);
    const finalStatus = v2.status ?? v2.request?.status ?? 'approved';
    addResult(5, {
      id: 'vote-approved',
      label: 'Approved',
      content: (
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 24 }}
          className="p-5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 mb-4"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
              <Check className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <p className="text-lg font-semibold text-emerald-400">Approved! Transaction executed.</p>
              <p className="text-xs text-emerald-400/70">$800.00 rent payment has been processed</p>
            </div>
          </div>
          {v2.transaction && (
            <div className="mt-2">
              <TxBadge hash={v2.transaction?.tx_hash} />
            </div>
          )}
        </motion.div>
      ),
    });
  };

  const runStep6 = async () => {
    // Fetch settlement
    setRunningLabel('Calculating settlement...');
    const settlement = await fetchSettlement(poolIdRef.current);

    await delay(500);

    const balances = settlement.balances || [];
    addResult(6, {
      id: 'balances',
      label: 'Balances',
      content: (
        <div className="card p-5 mb-4">
          <h4 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">Member Balances</h4>
          <div className="space-y-3">
            {balances.map((b: any, i: number) => {
              const name = (b.member?.display_name || b.near_account || b.display_name || `Member ${i + 1}`);
              const contributed = Number(b.contributed ?? b.contribution ?? 0);
              const fairShare = Number(b.fair_share ?? b.fairShare ?? 0);
              const net = contributed - fairShare;
              return (
                <div key={i} className="flex items-center gap-3">
                  <Avatar name={name} size={28} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white">{name}</p>
                    <p className="text-xs text-gray-500">
                      Contributed {formatUSD(contributed)} &middot; Fair share {formatUSD(fairShare)}
                    </p>
                  </div>
                  <span className={`text-sm font-semibold ${net >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {net >= 0 ? '+' : ''}{formatUSD(net)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      ),
    });

    const settlements = settlement.settlements || [];
    if (settlements.length > 0) {
      addResult(6, {
        id: 'transfers',
        label: 'Transfers',
        content: (
          <div className="card p-5 mb-4">
            <h4 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">Settlement Transfers</h4>
            <div className="space-y-3">
              {settlements.map((s: any, i: number) => {
                const fromName = s.from?.display_name || s.from_account || s.from || `Sender ${i}`;
                const toName = s.to?.display_name || s.to_account || s.to || `Receiver ${i}`;
                return (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-white/[0.02]">
                    <Avatar name={String(fromName)} size={28} />
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-gray-300">{String(fromName)}</span>
                      <ArrowRight className="w-4 h-4 text-brand-400" />
                      <span className="text-gray-300">{String(toName)}</span>
                    </div>
                    <div className="ml-auto">
                      <Avatar name={String(toName)} size={28} />
                    </div>
                    <span className="font-semibold text-white">{formatUSD(Number(s.amount))}</span>
                  </div>
                );
              })}
            </div>
          </div>
        ),
      });
    }

    // Execute settlement
    setRunningLabel('Executing settlement transfers...');
    await delay(600);
    const execution = await executeSettlement(poolIdRef.current);

    await delay(400);
    const executed = execution.executed || execution.settlements || [];
    addResult(6, {
      id: 'executed',
      label: 'Executed',
      content: (
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 24 }}
          className="p-5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 mb-4"
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
              <Handshake className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <p className="text-lg font-semibold text-emerald-400">Settlement Complete</p>
              <p className="text-xs text-emerald-400/70">All transfers have been executed</p>
            </div>
          </div>
          {Array.isArray(executed) && executed.length > 0 && (
            <div className="space-y-1 mt-2">
              {executed.map((ex: any, i: number) => (
                <div key={i} className="flex items-center gap-2 text-xs text-gray-400">
                  <Check className="w-3 h-3 text-emerald-500" />
                  <TxBadge hash={ex.transaction?.tx_hash || ex.tx_hash} />
                </div>
              ))}
            </div>
          )}
        </motion.div>
      ),
    });
  };

  // ---- main run dispatcher ----

  const stepRunners = [runStep0, runStep1, runStep2, runStep3, runStep4, runStep5, runStep6];

  const handleRun = useCallback(async () => {
    if (running) return;
    if (currentStep > 6) return;

    setRunning(true);
    setStatus(currentStep, 'running');

    try {
      await stepRunners[currentStep]();
      setStatus(currentStep, 'done');

      if (currentStep < 6) {
        const next = currentStep + 1;
        setCurrentStep(next);
        setStatus(next, 'ready');
      } else {
        setCompleted(true);
      }
    } catch (err: any) {
      console.error('Step failed:', err);
      // Show error but keep going
      addResult(currentStep, {
        id: `error-${Date.now()}`,
        label: 'Error',
        content: (
          <div className="p-4 rounded-lg bg-rose-500/10 border border-rose-500/20 mb-4 text-sm text-rose-400">
            {err.message || 'Something went wrong. The backend may not be running.'}
          </div>
        ),
      });
      setStatus(currentStep, 'done');
      if (currentStep < 6) {
        const next = currentStep + 1;
        setCurrentStep(next);
        setStatus(next, 'ready');
      }
    }

    setRunning(false);
    setRunningLabel('');
  }, [running, currentStep]);

  const handleReset = useCallback(() => {
    setCurrentStep(0);
    setStepStatuses(['ready', ...Array(6).fill('locked')] as StepStatus[]);
    setResults(Array(7).fill([]));
    setCompleted(false);
    setRunning(false);
    setRunningLabel('');
    poolIdRef.current = '';
    pendingReqIdRef.current = '';
    runningBalanceRef.current = 0;
  }, []);

  // ---- Render ----

  const activeStep = STEPS[currentStep] || STEPS[6];

  return (
    <div className="h-screen flex flex-col bg-surface-950 text-gray-100">
      {/* Top Bar */}
      <header className="sticky top-0 z-50 flex items-center justify-between px-6 py-3 border-b border-white/[0.06] bg-surface-950/80 backdrop-blur-md">
        <Link
          to="/"
          className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          Back to SplitPool
        </Link>
        <h1 className="text-sm font-semibold text-gradient tracking-wide">Interactive Demo</h1>
        <span className="text-xs text-gray-500 font-mono">
          Step {Math.min(currentStep + 1, 7)} / 7
        </span>
      </header>

      {/* Main split layout */}
      <div className="flex flex-1 min-h-0">
        {/* Left Panel: step list */}
        <aside className="w-80 shrink-0 border-r border-white/[0.06] bg-surface-900 flex flex-col">
          <div className="flex-1 overflow-y-auto py-4 px-2">
            {STEPS.map((step, i) => {
              const status = stepStatuses[i];
              const isActive = i === currentStep && !completed;
              const Icon = step.icon;

              return (
                <button
                  key={i}
                  onClick={() => {
                    if (status === 'done') setCurrentStep(i);
                  }}
                  className={`
                    w-full text-left px-4 py-3.5 rounded-lg mb-1 flex items-start gap-3 transition-all duration-200 group
                    ${isActive ? 'bg-white/[0.04] border-l-2 border-brand-500 pl-3.5' : 'border-l-2 border-transparent'}
                    ${status === 'locked' ? 'opacity-40 cursor-default' : 'cursor-pointer hover:bg-white/[0.03]'}
                  `}
                >
                  {/* Step indicator */}
                  <div className="mt-0.5 shrink-0">
                    {status === 'done' ? (
                      <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center">
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      </div>
                    ) : status === 'running' ? (
                      <div className="w-6 h-6 rounded-full bg-brand-500/20 flex items-center justify-center">
                        <Loader2 className="w-3.5 h-3.5 text-brand-400 animate-spin" />
                      </div>
                    ) : isActive ? (
                      <div className="w-6 h-6 rounded-full bg-brand-500/20 flex items-center justify-center">
                        <PulsingDot />
                      </div>
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-white/[0.06] flex items-center justify-center">
                        <span className="text-[11px] text-gray-600 font-medium">{i + 1}</span>
                      </div>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-brand-400' : 'text-gray-500'}`} />
                      <span className={`text-sm font-medium ${isActive ? 'text-white' : status === 'done' ? 'text-gray-300' : 'text-gray-500'}`}>
                        {step.title}
                      </span>
                    </div>
                    {isActive && (
                      <motion.p
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="text-xs text-gray-500 mt-1.5 leading-relaxed"
                      >
                        {step.description}
                      </motion.p>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Run button */}
          <div className="p-4 border-t border-white/[0.06]">
            {completed ? (
              <button onClick={handleReset} className="btn-secondary w-full flex items-center justify-center gap-2">
                <RotateCcw className="w-4 h-4" />
                Run Again
              </button>
            ) : (
              <button
                onClick={handleRun}
                disabled={running}
                className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-wait"
              >
                {running ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Running...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    {stepStatuses[currentStep] === 'ready' && currentStep === 0 ? 'Start Demo' : 'Run Next Step'}
                  </>
                )}
              </button>
            )}

            {running && runningLabel && (
              <div className="mt-3">
                <RunningLabel text={runningLabel} />
              </div>
            )}
          </div>
        </aside>

        {/* Right Panel: results */}
        <main ref={resultPanelRef} className="flex-1 overflow-y-auto p-8">
          <AnimatePresence mode="wait">
            {completed ? (
              /* Completion state */
              <motion.div
                key="complete"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="max-w-lg mx-auto text-center py-16"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                  className="w-20 h-20 rounded-2xl bg-gradient-to-br from-brand-500 to-accent-cyan mx-auto mb-6 flex items-center justify-center"
                >
                  <Sparkles className="w-10 h-10 text-white" />
                </motion.div>

                <h2 className="text-3xl font-bold text-white mb-2">Demo Complete!</h2>
                <p className="text-gray-400 mb-8">
                  You just saw the full SplitPool flow: pool creation, deposits via NEAR Intents,
                  programmable spending rules, group voting, and automated settlement.
                </p>

                <div className="grid grid-cols-2 gap-4 mb-8">
                  <div className="stat-card items-center">
                    <span className="text-2xl font-bold text-brand-400">4</span>
                    <span className="text-xs text-gray-500">Members</span>
                  </div>
                  <div className="stat-card items-center">
                    <span className="text-2xl font-bold text-accent-cyan">4</span>
                    <span className="text-xs text-gray-500">Deposits</span>
                  </div>
                  <div className="stat-card items-center">
                    <span className="text-2xl font-bold text-accent-emerald">2</span>
                    <span className="text-xs text-gray-500">Spend Requests</span>
                  </div>
                  <div className="stat-card items-center">
                    <span className="text-2xl font-bold text-accent-amber">2</span>
                    <span className="text-xs text-gray-500">Votes Cast</span>
                  </div>
                </div>

                <div className="flex gap-3 justify-center">
                  <button
                    onClick={() => navigate('/dashboard')}
                    className="btn-primary flex items-center gap-2"
                  >
                    Launch the App
                    <ExternalLink className="w-4 h-4" />
                  </button>
                  <button onClick={handleReset} className="btn-secondary flex items-center gap-2">
                    <RotateCcw className="w-4 h-4" />
                    Run Again
                  </button>
                </div>
              </motion.div>
            ) : results[currentStep] && results[currentStep].length > 0 ? (
              /* Step results */
              <motion.div key={`results-${currentStep}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <div className="mb-6">
                  <div className="flex items-center gap-3 mb-1">
                    {(() => { const Icon = STEPS[currentStep].icon; return <Icon className="w-5 h-5 text-brand-400" />; })()}
                    <h2 className="text-xl font-semibold text-white">{STEPS[currentStep].title}</h2>
                    {stepStatuses[currentStep] === 'done' && (
                      <span className="badge-success text-xs">Complete</span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 ml-8">{STEPS[currentStep].description}</p>
                </div>
                <StepResults stepIndex={currentStep} results={results[currentStep]} />
              </motion.div>
            ) : (
              /* Waiting / empty state */
              <motion.div
                key={`empty-${currentStep}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center justify-center h-full text-center"
              >
                <div className="w-16 h-16 rounded-2xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center mb-5">
                  {(() => { const Icon = activeStep.icon; return <Icon className="w-8 h-8 text-gray-600" />; })()}
                </div>
                <h2 className="text-xl font-semibold text-gray-300 mb-2">{activeStep.title}</h2>
                <p className="text-sm text-gray-500 max-w-md mb-6">{activeStep.description}</p>
                {running ? (
                  <RunningLabel text={runningLabel || 'Processing...'} />
                ) : (
                  <p className="text-xs text-gray-600">
                    Click <strong className="text-gray-400">{currentStep === 0 ? 'Start Demo' : 'Run Next Step'}</strong> to begin
                  </p>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
