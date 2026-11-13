import { useNavigate, useLocation, Outlet, useParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Home, Receipt, Plus, Wallet, Zap } from 'lucide-react';
import ThemeToggle from './ThemeToggle';
import { useWallet } from '../context/WalletContext';
import { truncateAddress } from '../lib/utils';
import { seedDemo } from '../api/client';
import { useState } from 'react';

export default function Layout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { id: poolId } = useParams<{ id: string }>();
  const { account, isConnected, connect, disconnect } = useWallet();
  const [showWalletMenu, setShowWalletMenu] = useState(false);
  const [seeding, setSeeding] = useState(false);

  const handleSeedDemo = async () => {
    setSeeding(true);
    try {
      const data = await seedDemo();
      if (data.poolId) {
        navigate(`/pool/${data.poolId}`);
      } else {
        navigate('/');
      }
    } catch (err) {
      console.error('Seed failed:', err);
    }
    setSeeding(false);
  };

  const navItems = [
    { path: '/', icon: Home, label: 'Home' },
    {
      path: poolId ? `/pool/${poolId}/ledger` : '/',
      icon: Receipt,
      label: 'Activity',
    },
    { path: '/create', icon: Plus, label: 'Create' },
  ];

  return (
    <div className="min-h-screen bg-surface-light dark:bg-surface-dark flex flex-col">
      {/* Top bar */}
      <header className="sticky top-0 z-40 bg-white/80 dark:bg-surface-dark/80 backdrop-blur-xl border-b border-gray-100 dark:border-gray-800">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center justify-between">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 font-bold text-lg"
          >
            <span className="text-xl">{'\u{1F4B0}'}</span>
            <span className="bg-gradient-to-r from-brand-500 to-brand-700 bg-clip-text text-transparent">
              SplitPool
            </span>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={handleSeedDemo}
              disabled={seeding}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-brand-50 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400 hover:bg-brand-100 dark:hover:bg-brand-900/50 transition-colors"
            >
              <Zap size={13} />
              {seeding ? 'Seeding...' : 'Demo'}
            </button>

            <ThemeToggle />

            {/* Wallet badge */}
            <div className="relative">
              <button
                onClick={() => {
                  if (isConnected) setShowWalletMenu(!showWalletMenu);
                  else connect();
                }}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              >
                {isConnected ? (
                  <>
                    <span className="w-2 h-2 rounded-full bg-mint-500" />
                    <span className="text-xs font-medium max-w-[100px] truncate">
                      {truncateAddress(account!)}
                    </span>
                  </>
                ) : (
                  <>
                    <Wallet size={14} />
                    <span className="text-xs font-medium">Connect</span>
                  </>
                )}
              </button>

              {showWalletMenu && isConnected && (
                <div className="absolute right-0 mt-2 w-48 card p-2 shadow-lg z-50">
                  <p className="px-3 py-2 text-xs text-gray-500 font-mono">{account}</p>
                  <button
                    onClick={() => {
                      disconnect();
                      setShowWalletMenu(false);
                    }}
                    className="w-full text-left px-3 py-2 text-sm rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-coral-500"
                  >
                    Disconnect
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 max-w-lg mx-auto w-full px-4 py-4 pb-24">
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/80 dark:bg-surface-dark/80 backdrop-blur-xl border-t border-gray-100 dark:border-gray-800 sm:hidden">
        <div className="max-w-lg mx-auto flex items-center justify-around h-16 px-4">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              item.label === 'Home'
                ? location.pathname === '/'
                : item.label === 'Create'
                ? location.pathname === '/create'
                : location.pathname.includes('/ledger');

            return (
              <button
                key={item.label}
                onClick={() => navigate(item.path)}
                className={`flex flex-col items-center gap-1 px-4 py-1.5 rounded-xl transition-colors ${
                  isActive
                    ? 'text-brand-500'
                    : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
                }`}
              >
                {item.label === 'Create' ? (
                  <div className="w-10 h-10 rounded-full bg-brand-500 flex items-center justify-center -mt-4 shadow-lg shadow-brand-500/30">
                    <Icon size={22} className="text-white" />
                  </div>
                ) : (
                  <Icon size={22} />
                )}
                <span className="text-[10px] font-medium">{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Connect modal */}
      {!isConnected && (
        <ConnectModal onConnect={connect} />
      )}
    </div>
  );
}

function ConnectModal({ onConnect }: { onConnect: (name?: string) => void }) {
  const [name, setName] = useState('');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-sm mx-4 card p-6 shadow-2xl"
      >
        <div className="text-center mb-6">
          <span className="text-4xl block mb-3">{'\u{1F4B0}'}</span>
          <h2 className="text-2xl font-bold mb-1">Welcome to SplitPool</h2>
          <p className="text-sm text-gray-500">Connect your NEAR wallet to get started</p>
        </div>

        <input
          type="text"
          placeholder="alice.testnet"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="input-field mb-4"
        />

        <button
          onClick={() => onConnect(name || undefined)}
          className="btn-primary w-full"
        >
          Connect Wallet
        </button>

        <p className="text-xs text-gray-400 text-center mt-3">
          Simulated wallet for hackathon demo
        </p>
      </motion.div>
    </div>
  );
}
