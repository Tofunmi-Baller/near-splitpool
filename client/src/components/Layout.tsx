import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Layers, LayoutDashboard, PlusCircle, ChevronDown, LogOut } from 'lucide-react';
import { useWallet } from '../context/WalletContext';
import { useState, useRef, useEffect } from 'react';

const ACCOUNT_COLORS: Record<string, string> = {
  'alice.testnet': '#3B5BFF',
  'bob.testnet': '#F43F5E',
  'carol.testnet': '#10B981',
  'dave.testnet': '#F59E0B',
};

export default function Layout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { account, displayName, isConnected, connect, disconnect, demoAccounts } = useWallet();
  const [showWalletMenu, setShowWalletMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowWalletMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Auto-connect on mount if not connected
  useEffect(() => {
    if (!isConnected) {
      connect('alice.testnet');
    }
  }, []);

  const navLinks = [
    { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/create', label: 'Create Pool', icon: PlusCircle },
  ];

  return (
    <div className="min-h-screen bg-surface-950 text-gray-100 flex flex-col">
      {/* Top nav */}
      <header className="sticky top-0 z-40 bg-surface-950/80 backdrop-blur-xl border-b border-white/[0.06]">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          {/* Left: Logo */}
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2.5 font-bold text-lg hover:opacity-80 transition-opacity"
          >
            <div className="w-8 h-8 rounded-lg bg-brand-500/20 flex items-center justify-center">
              <Layers size={18} className="text-brand-400" />
            </div>
            <span className="text-gradient text-xl font-bold tracking-tight">SplitPool</span>
          </button>

          {/* Center: Nav links */}
          <nav className="hidden sm:flex items-center gap-1">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = location.pathname === link.path;
              return (
                <button
                  key={link.path}
                  onClick={() => navigate(link.path)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-white/[0.08] text-white'
                      : 'text-gray-400 hover:text-gray-200 hover:bg-white/[0.04]'
                  }`}
                >
                  <Icon size={16} />
                  {link.label}
                </button>
              );
            })}
          </nav>

          {/* Right: Wallet selector */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setShowWalletMenu(!showWalletMenu)}
              className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.06] hover:bg-white/[0.08] transition-all"
            >
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: isConnected ? (ACCOUNT_COLORS[account!] || '#3B5BFF') : '#6B7280' }}
              />
              <span className="text-sm font-medium max-w-[140px] truncate">
                {isConnected ? account : 'Not connected'}
              </span>
              {isConnected && displayName && (
                <span className="text-xs text-gray-500 hidden md:inline">({displayName})</span>
              )}
              <ChevronDown size={14} className={`text-gray-500 transition-transform ${showWalletMenu ? 'rotate-180' : ''}`} />
            </button>

            <AnimatePresence>
              {showWalletMenu && (
                <motion.div
                  initial={{ opacity: 0, y: -4, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -4, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 mt-2 w-64 card p-2 shadow-2xl z-50"
                >
                  <p className="px-3 py-2 text-xs text-gray-500 font-semibold uppercase tracking-wider">
                    Switch Account
                  </p>
                  {Object.entries(demoAccounts).map(([acct, name]) => (
                    <button
                      key={acct}
                      onClick={() => {
                        connect(acct);
                        setShowWalletMenu(false);
                      }}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${
                        account === acct
                          ? 'bg-white/[0.08] text-white'
                          : 'hover:bg-white/[0.04] text-gray-300'
                      }`}
                    >
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: ACCOUNT_COLORS[acct] || '#3B5BFF' }}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{acct}</p>
                        <p className="text-xs text-gray-500">{name}</p>
                      </div>
                      {account === acct && (
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                      )}
                    </button>
                  ))}
                  <div className="border-t border-white/[0.06] mt-1 pt-1">
                    <button
                      onClick={() => {
                        disconnect();
                        setShowWalletMenu(false);
                      }}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left text-rose-400 hover:bg-rose-500/10 transition-colors"
                    >
                      <LogOut size={14} />
                      <span className="text-sm font-medium">Disconnect</span>
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Mobile nav (shown below header on small screens) */}
        <div className="sm:hidden border-t border-white/[0.04] px-4 py-2 flex items-center gap-1">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const isActive = location.pathname === link.path;
            return (
              <button
                key={link.path}
                onClick={() => navigate(link.path)}
                className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-white/[0.08] text-white'
                    : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                <Icon size={15} />
                {link.label}
              </button>
            );
          })}
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-6 py-6">
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
    </div>
  );
}
