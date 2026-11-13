import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

const DEMO_ACCOUNTS: Record<string, string> = {
  'alice.testnet': 'Alice',
  'bob.testnet': 'Bob',
  'carol.testnet': 'Carol',
  'dave.testnet': 'Dave',
};

interface WalletContextValue {
  account: string | null;
  displayName: string;
  isConnected: boolean;
  connect: (accountName?: string) => void;
  disconnect: () => void;
  demoAccounts: typeof DEMO_ACCOUNTS;
}

const WalletContext = createContext<WalletContextValue>({
  account: null,
  displayName: '',
  isConnected: false,
  connect: () => {},
  disconnect: () => {},
  demoAccounts: DEMO_ACCOUNTS,
});

export function WalletProvider({ children }: { children: ReactNode }) {
  const [account, setAccount] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('splitpool-wallet') || null;
    }
    return null;
  });

  // Auto-connect as alice.testnet if not connected
  useEffect(() => {
    if (!account) {
      const defaultAccount = 'alice.testnet';
      setAccount(defaultAccount);
      localStorage.setItem('splitpool-wallet', defaultAccount);
    }
  }, []);

  const displayName = account ? (DEMO_ACCOUNTS[account] || account.split('.')[0]) : '';

  const connect = (accountName?: string) => {
    const name = accountName || 'alice.testnet';
    setAccount(name);
    localStorage.setItem('splitpool-wallet', name);
  };

  const disconnect = () => {
    setAccount(null);
    localStorage.removeItem('splitpool-wallet');
  };

  return (
    <WalletContext.Provider
      value={{
        account,
        displayName,
        isConnected: !!account,
        connect,
        disconnect,
        demoAccounts: DEMO_ACCOUNTS,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}

export const useWallet = () => useContext(WalletContext);
