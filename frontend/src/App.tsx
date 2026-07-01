import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useEffect } from 'react';
import { Header } from './components/layout/Header';
import { Home } from './pages/Home';
import { ScanProgress } from './pages/ScanProgress';
import { Results } from './pages/Results';
import { History } from './pages/History';
import { useSettingsStore } from './stores/settingsStore';
import './styles/globals.css';

export default function App() {
  const { theme } = useSettingsStore();

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [theme]);

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
        <Header />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/scan/:id" element={<ScanProgress />} />
          <Route path="/results/:id" element={<Results />} />
          <Route path="/history" element={<History />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}
