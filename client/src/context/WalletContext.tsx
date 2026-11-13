import { createContext, useContext, useState, ReactNode } from 'react';

interface WalletContextValue {
  account: string | null;
  isConnected: boolean;
  connect: (accountName?: string) => void;
  disconnect: () => void;
}

const WalletContext = createContext<WalletContextValue>({
  account: null,
  isConnected: false,
  connect: () => {},
  disconnect: () => {},
});

export function WalletProvider({ children }: { children: ReactNode }) {
  const [account, setAccount] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('splitpool-wallet') || null;
    }
    return null;
  });

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
      value={{ account, isConnected: !!account, connect, disconnect }}
    >
      {children}
    </WalletContext.Provider>
  );
}

export const useWallet = () => useContext(WalletContext);
