import { useRef, useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Layers,
  DollarSign,
  Wallet,
  Users,
  ArrowUpDown,
  Shield,
  Repeat,
  Vote,
  PlusCircle,
  Settings,
  Handshake,
  ArrowRight,
  Github,
  Check,
  ChevronRight,
} from 'lucide-react';

/* ─────────────────── helpers ─────────────────── */

function useCountUp(end: number, duration = 1600) {
  const [value, setValue] = useState(0);
  const [started, setStarted] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started) setStarted(true);
      },
      { threshold: 0.3 },
    );
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [started]);

  useEffect(() => {
    if (!started) return;
    const steps = 40;
    const inc = end / steps;
    let current = 0;
    const interval = setInterval(() => {
      current += inc;
      if (current >= end) {
        setValue(end);
        clearInterval(interval);
      } else {
        setValue(Math.floor(current));
      }
    }, duration / steps);
    return () => clearInterval(interval);
  }, [started, end, duration]);

  return { ref, value };
}

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.55, ease: [0.25, 0.4, 0.25, 1] },
  }),
};

const stagger = {
  visible: { transition: { staggerChildren: 0.1 } },
};

/* ─────────────────── sub-components ─────────────────── */

function NavBar() {
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <nav
      className={`fixed top-0 inset-x-0 z-50 transition-colors duration-300 ${
        scrolled ? 'bg-surface-950/80 backdrop-blur-lg border-b border-white/[0.06]' : ''
      }`}
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between px-6 h-16">
        {/* logo */}
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="w-8 h-8 rounded-lg bg-brand-500/15 flex items-center justify-center group-hover:bg-brand-500/25 transition-colors">
            <Layers className="w-4.5 h-4.5 text-brand-400" />
          </div>
          <span className="text-lg font-bold tracking-tight">SplitPool</span>
        </Link>

        {/* links */}
        <div className="hidden md:flex items-center gap-1">
          <a href="#how-it-works" className="btn-ghost text-sm text-gray-400 hover:text-gray-100">
            How it Works
          </a>
          <a href="#features" className="btn-ghost text-sm text-gray-400 hover:text-gray-100">
            Features
          </a>
          <a
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-ghost text-sm text-gray-400 hover:text-gray-100"
          >
            View Source
          </a>
          <button onClick={() => navigate('/dashboard')} className="btn-primary ml-3 text-sm py-2 px-5">
            Launch App
          </button>
        </div>

        {/* mobile */}
        <button onClick={() => navigate('/dashboard')} className="md:hidden btn-primary text-sm py-2 px-4">
          Launch App
        </button>
      </div>
    </nav>
  );
}

/* ── Hero illustration ── */

function PoolIllustration() {
  const members = [
    { initials: 'A', color: '#6366F1', x: 0, y: -90 },
    { initials: 'B', color: '#EC4899', x: 90, y: 0 },
    { initials: 'C', color: '#10B981', x: 0, y: 90 },
    { initials: 'D', color: '#F59E0B', x: -90, y: 0 },
  ];

  const miniCards = [
    { text: '+$500 USDC', x: 100, y: -70, delay: 0 },
    { text: '$35 groceries', x: -110, y: 60, delay: 0.8 },
    { text: 'Vote: 2/2', x: 95, y: 55, delay: 1.6 },
  ];

  return (
    <div className="relative w-full h-full min-h-[400px] flex items-center justify-center">
      {/* radial glow */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-[500px] h-[500px] rounded-full bg-brand-500/[0.07] blur-[100px]" />
      </div>

      <motion.div
        animate={{ y: [0, -10, 0] }}
        transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
        className="relative"
      >
        {/* SVG connector lines */}
        <svg className="absolute inset-0 w-full h-full" viewBox="-140 -140 280 280" fill="none">
          {members.map((m, i) => (
            <motion.line
              key={i}
              x1={0}
              y1={0}
              x2={m.x}
              y2={m.y}
              stroke="rgba(59, 91, 255, 0.2)"
              strokeWidth={1}
              strokeDasharray="6 4"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{ duration: 1.2, delay: 0.5 + i * 0.15 }}
            />
          ))}
        </svg>

        {/* center pool circle */}
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="relative z-10 w-28 h-28 rounded-full bg-surface-900/90 border border-white/[0.1] flex flex-col items-center justify-center shadow-2xl shadow-brand-500/10"
        >
          <span className="text-[10px] uppercase tracking-wider text-gray-500 font-medium">Pool</span>
          <span className="text-xl font-bold font-mono text-gray-100">$3,550</span>
        </motion.div>

        {/* member avatars */}
        {members.map((m, i) => (
          <motion.div
            key={m.initials}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.3 + i * 0.12 }}
            className="absolute top-1/2 left-1/2 z-10"
            style={{
              transform: `translate(calc(-50% + ${m.x}px), calc(-50% + ${m.y}px))`,
            }}
          >
            <div
              className="w-11 h-11 rounded-full flex items-center justify-center text-sm font-bold text-white shadow-lg"
              style={{ backgroundColor: m.color }}
            >
              {m.initials}
            </div>
          </motion.div>
        ))}

        {/* floating mini cards */}
        {miniCards.map((card, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 1.2 + card.delay }}
            className="absolute top-1/2 left-1/2 z-20"
            style={{
              transform: `translate(calc(-50% + ${card.x}px), calc(-50% + ${card.y}px))`,
            }}
          >
            <div className="bg-surface-900/90 backdrop-blur-sm border border-white/[0.08] rounded-lg px-3 py-1.5 flex items-center gap-1.5 shadow-lg whitespace-nowrap">
              <Check className="w-3 h-3 text-emerald-400" />
              <span className="text-xs font-medium text-gray-300">{card.text}</span>
            </div>
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
}

/* ── Stat card ── */

function StatCard({
  end,
  label,
  icon: Icon,
  prefix = '',
  index,
}: {
  end: number;
  label: string;
  icon: React.ElementType;
  prefix?: string;
  index: number;
}) {
  const { ref, value } = useCountUp(end);

  return (
    <motion.div
      custom={index}
      variants={fadeUp}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.3 }}
      className="stat-card"
    >
      <div className="flex items-center justify-between mb-1">
        <span ref={ref} className="text-2xl font-bold font-mono text-gray-100">
          {prefix}{value.toLocaleString()}
        </span>
        <div className="w-9 h-9 rounded-lg bg-brand-500/10 flex items-center justify-center">
          <Icon className="w-4 h-4 text-brand-400" />
        </div>
      </div>
      <span className="text-sm text-gray-400">{label}</span>
    </motion.div>
  );
}

/* ── Feature card ── */

function FeatureCard({
  title,
  description,
  icon: Icon,
  iconColor,
  children,
  index,
}: {
  title: string;
  description: string;
  icon: React.ElementType;
  iconColor: string;
  children: React.ReactNode;
  index: number;
}) {
  return (
    <motion.div
      custom={index}
      variants={fadeUp}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.2 }}
      className="card-glow p-6 flex flex-col"
    >
      <div
        className="w-10 h-10 rounded-lg flex items-center justify-center mb-4"
        style={{ backgroundColor: `${iconColor}15` }}
      >
        <Icon className="w-5 h-5" style={{ color: iconColor }} />
      </div>
      <h3 className="text-lg font-semibold text-gray-100 mb-2">{title}</h3>
      <p className="text-sm text-gray-400 leading-relaxed mb-5">{description}</p>
      <div className="mt-auto">{children}</div>
    </motion.div>
  );
}

/* ── Step ── */

function Step({
  number,
  title,
  description,
  icon: Icon,
  isLast,
  index,
}: {
  number: number;
  title: string;
  description: string;
  icon: React.ElementType;
  isLast: boolean;
  index: number;
}) {
  return (
    <motion.div
      custom={index}
      variants={fadeUp}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.3 }}
      className="flex flex-col md:flex-row items-start md:items-center gap-4 md:gap-0 flex-1"
    >
      <div className="flex flex-col items-center text-center flex-1">
        {/* number circle */}
        <div className="w-12 h-12 rounded-full bg-brand-500/15 border border-brand-500/30 flex items-center justify-center mb-3">
          <span className="text-sm font-bold text-brand-400">{number}</span>
        </div>
        <div className="w-9 h-9 rounded-lg bg-white/[0.04] flex items-center justify-center mb-3">
          <Icon className="w-4 h-4 text-gray-400" />
        </div>
        <h4 className="text-sm font-semibold text-gray-100 mb-1">{title}</h4>
        <p className="text-xs text-gray-500 max-w-[180px] leading-relaxed">{description}</p>
      </div>

      {/* connector */}
      {!isLast && (
        <div className="hidden md:flex items-center px-2">
          <div className="w-12 h-px bg-gradient-to-r from-brand-500/30 to-transparent" />
          <ChevronRight className="w-3.5 h-3.5 text-brand-500/40 -ml-1" />
        </div>
      )}
    </motion.div>
  );
}

/* ── Mini UI mockups inside feature cards ── */

function RulesMockup() {
  const rules = [
    { label: 'Spend limit', value: '$50', active: true },
    { label: 'Votes needed', value: '2', active: false },
    { label: 'Groceries cap', value: '$600/mo', active: false },
  ];
  return (
    <div className="space-y-2">
      {rules.map((r) => (
        <div key={r.label} className="flex items-center justify-between rounded-lg bg-white/[0.03] border border-white/[0.05] px-3 py-2">
          <span className="text-xs text-gray-400">{r.label}</span>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-medium text-gray-200">{r.value}</span>
            {r.active && <Check className="w-3 h-3 text-emerald-400" />}
          </div>
        </div>
      ))}
    </div>
  );
}

function TokenSwapMockup() {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      {[
        { name: 'NEAR', color: 'bg-white/[0.08] text-gray-300' },
        { name: 'wNEAR', color: 'bg-white/[0.08] text-gray-300' },
      ].map((t) => (
        <span key={t.name} className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium ${t.color} border border-white/[0.06]`}>
          {t.name}
        </span>
      ))}
      <ArrowRight className="w-3.5 h-3.5 text-gray-500" />
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
        USDC
      </span>
    </div>
  );
}

function VoteMockup() {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <div className="flex -space-x-1.5">
          {['#6366F1', '#EC4899'].map((c) => (
            <div key={c} className="w-5 h-5 rounded-full border-2 border-surface-900" style={{ backgroundColor: c }} />
          ))}
        </div>
        <span className="text-xs text-gray-400">2 of 2 approved</span>
      </div>
      <div className="flex items-center gap-3">
        <div className="flex-1 h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
          <div className="h-full w-full rounded-full bg-emerald-500" />
        </div>
        <Check className="w-3.5 h-3.5 text-emerald-400" />
      </div>
    </div>
  );
}

/* ─────────────────── main page ─────────────────── */

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-surface-950 text-gray-100">
      <NavBar />

      {/* ── Hero ── */}
      <section className="relative pt-28 pb-20 md:pt-36 md:pb-28 overflow-hidden">
        {/* grid overlay */}
        <div className="absolute inset-0 bg-grid-pattern bg-grid opacity-100 pointer-events-none" />
        {/* radial fade from center */}
        <div className="absolute inset-0 bg-gradient-radial from-brand-500/[0.04] via-transparent to-transparent pointer-events-none" />

        <div className="relative max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center gap-12 md:gap-8">
          {/* left */}
          <div className="md:w-[58%] flex-shrink-0">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/[0.08] bg-white/[0.03] text-xs text-gray-400 mb-6"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-brand-400 animate-pulse" />
              NEAR Hackathon 2026
              <span className="text-gray-600">|</span>
              Track 12: Social Money
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-[1.1] tracking-tight mb-6"
            >
              Split expenses.
              <br />
              <span className="text-gradient">Set rules.</span>
              <br />
              No arguments.
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-lg text-gray-400 max-w-lg leading-relaxed mb-8"
            >
              SplitPool is a shared wallet where friend groups set spending limits,
              vote on big purchases, and settle up transparently &mdash; powered by NEAR.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="flex flex-wrap items-center gap-3 mb-4"
            >
              <button onClick={() => navigate('/demo')} className="btn-primary flex items-center gap-2">
                Try Interactive Demo
                <ArrowRight className="w-4 h-4" />
              </button>
              <button onClick={() => navigate('/dashboard')} className="btn-secondary">
                Launch App
              </button>
            </motion.div>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.5 }}
              className="text-xs text-gray-500"
            >
              4 demo accounts pre-loaded &bull; No wallet needed &bull; Full flow in 60 seconds
            </motion.p>
          </div>

          {/* right — illustration, hidden on mobile */}
          <div className="hidden md:block md:w-[42%]">
            <PoolIllustration />
          </div>
        </div>
      </section>

      {/* ── Stats ── */}
      <section className="relative max-w-7xl mx-auto px-6 -mt-4 mb-20">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard end={3550} label="Total Deposited" icon={DollarSign} prefix="$" index={0} />
          <StatCard end={1826} label="Pool Balance" icon={Wallet} prefix="$" index={1} />
          <StatCard end={4} label="Active Members" icon={Users} index={2} />
          <StatCard end={12} label="Transactions" icon={ArrowUpDown} index={3} />
        </div>
      </section>

      {/* ── Features ── */}
      <section id="features" className="max-w-7xl mx-auto px-6 py-20">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mb-12"
        >
          <h2 className="text-3xl font-bold tracking-tight mb-2">Why SplitPool</h2>
          <p className="text-gray-500">Everything a group wallet should be, nothing it shouldn't.</p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-5">
          <FeatureCard
            index={0}
            title="Programmable Rules"
            description="Set personal spend limits, vote thresholds, and category budgets. Rules enforce themselves — no awkward conversations needed."
            icon={Shield}
            iconColor="#3B5BFF"
          >
            <RulesMockup />
          </FeatureCard>

          <FeatureCard
            index={1}
            title="Any-Token Deposits"
            description="Deposit NEAR, wNEAR, or USDC. Intents auto-swap everything to USDC so the pool math stays clean."
            icon={Repeat}
            iconColor="#06B6D4"
          >
            <TokenSwapMockup />
          </FeatureCard>

          <FeatureCard
            index={2}
            title="Democratic Spending"
            description="Small spends auto-approve. Big purchases go to group vote. Every transaction is logged with on-chain hashes."
            icon={Vote}
            iconColor="#8B5CF6"
          >
            <VoteMockup />
          </FeatureCard>
        </div>
      </section>

      {/* ── How It Works ── */}
      <section id="how-it-works" className="max-w-7xl mx-auto px-6 py-20">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mb-14"
        >
          <h2 className="text-3xl font-bold tracking-tight mb-2">How It Works</h2>
          <p className="text-gray-500">From zero to settled in four steps.</p>
        </motion.div>

        <div className="flex flex-col md:flex-row items-start md:items-start gap-8 md:gap-0">
          <Step
            number={1}
            title="Create a Pool"
            description="Name it, set currency, invite members by NEAR account."
            icon={PlusCircle}
            isLast={false}
            index={0}
          />
          <Step
            number={2}
            title="Set Your Rules"
            description="Personal limits, vote thresholds, category budgets, lockout periods."
            icon={Settings}
            isLast={false}
            index={1}
          />
          <Step
            number={3}
            title="Fund & Spend"
            description="Deposit any token. Request spends. Auto-approve or group vote."
            icon={ArrowUpDown}
            isLast={false}
            index={2}
          />
          <Step
            number={4}
            title="Settle Up"
            description="Algorithm calculates who owes who. One-click settlement."
            icon={Handshake}
            isLast={true}
            index={3}
          />
        </div>
      </section>

      {/* ── Tech Stack ── */}
      <section className="max-w-7xl mx-auto px-6 py-16">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-8"
        >
          <h2 className="text-lg font-semibold text-gray-400">Built With</h2>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="flex flex-wrap items-center justify-center gap-3"
        >
          {[
            'NEAR Intents',
            'Sputnik DAO Patterns',
            'Chain Signatures',
            'React + TypeScript',
            'SQLite',
            'Tailwind CSS',
          ].map((tech) => (
            <span
              key={tech}
              className="inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium text-gray-300 bg-white/[0.04] border border-white/[0.06] hover:border-white/[0.12] transition-colors"
            >
              {tech}
            </span>
          ))}
        </motion.div>
      </section>

      {/* ── CTA ── */}
      <section className="max-w-7xl mx-auto px-6 py-24">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center"
        >
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">
            See the full flow in 60 seconds
          </h2>
          <p className="text-gray-400 mb-8 max-w-md mx-auto">
            Four pre-loaded demo accounts, no wallet required. Try the complete deposit-spend-vote-settle loop.
          </p>
          <button
            onClick={() => navigate('/demo')}
            className="btn-primary text-base px-8 py-3.5 inline-flex items-center gap-2"
          >
            Launch Interactive Demo
            <ArrowRight className="w-4.5 h-4.5" />
          </button>
          <p className="mt-4">
            <button
              onClick={() => navigate('/dashboard')}
              className="text-sm text-gray-500 hover:text-gray-300 transition-colors inline-flex items-center gap-1"
            >
              Or jump straight to the app
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </p>
        </motion.div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-white/[0.06]">
        <div className="max-w-7xl mx-auto px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <span className="text-sm text-gray-500">Built for NEAR Hackathon 2026</span>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-500">Track 12: Social Money</span>
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-500 hover:text-gray-300 transition-colors"
            >
              <Github className="w-4.5 h-4.5" />
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
