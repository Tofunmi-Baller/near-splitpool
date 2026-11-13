import { Routes, Route } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { WalletProvider } from './context/WalletContext';
import Layout from './components/Layout';
import LandingPage from './pages/LandingPage';
import DemoPage from './pages/DemoPage';
import Home from './pages/Home';
import PoolView from './pages/PoolView';
import CreatePool from './pages/CreatePool';
import SpendRequest from './pages/SpendRequest';
import RulesEditor from './pages/RulesEditor';
import SettleUp from './pages/SettleUp';
import Ledger from './pages/Ledger';

export default function App() {
  return (
    <ThemeProvider>
      <WalletProvider>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/demo" element={<DemoPage />} />
          <Route element={<Layout />}>
            <Route path="/dashboard" element={<Home />} />
            <Route path="/pool/:id" element={<PoolView />} />
            <Route path="/pool/:id/spend" element={<SpendRequest />} />
            <Route path="/pool/:id/rules" element={<RulesEditor />} />
            <Route path="/pool/:id/settle" element={<SettleUp />} />
            <Route path="/pool/:id/ledger" element={<Ledger />} />
            <Route path="/create" element={<CreatePool />} />
          </Route>
        </Routes>
      </WalletProvider>
    </ThemeProvider>
  );
}
