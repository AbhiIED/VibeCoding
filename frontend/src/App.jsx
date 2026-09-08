import React, { useState, useEffect, useCallback } from 'react';
import {
  convertCurrency,
  fetchHistorical,
  fetchTravelBudget,
  fetchFavorites,
  addFavorite,
  toggleFavorite,
  deleteFavorite,
  fetchConversionHistory,
  fetchCurrencies,
} from './api';
import DualConverter from './components/DualConverter';
import TrendChart from './components/TrendChart';
import Favorites from './components/Favorites';
import TravelBudget from './components/TravelBudget';
import ConversionHistory from './components/ConversionHistory';
import {
  Plane,
  Coins,
  ShieldCheck,
  TrendingUp,
  Globe2,
  Sparkles,
  Info,
} from 'lucide-react';

const DEFAULT_CURRENCIES = [
  { code: 'USD', name: 'US Dollar', symbol: '$', flag: '🇺🇸' },
  { code: 'EUR', name: 'Euro', symbol: '€', flag: '🇪🇺' },
  { code: 'GBP', name: 'British Pound', symbol: '£', flag: '🇬🇧' },
  { code: 'JPY', name: 'Japanese Yen', symbol: '¥', flag: '🇯🇵' },
  { code: 'CAD', name: 'Canadian Dollar', symbol: 'CA$', flag: '🇨🇦' },
  { code: 'AUD', name: 'Australian Dollar', symbol: 'AU$', flag: '🇦🇺' },
  { code: 'CHF', name: 'Swiss Franc', symbol: 'CHF', flag: '🇨🇭' },
  { code: 'CNY', name: 'Chinese Yuan', symbol: '¥', flag: '🇨🇳' },
  { code: 'INR', name: 'Indian Rupee', symbol: '₹', flag: '🇮🇳' },
  { code: 'SGD', name: 'Singapore Dollar', symbol: 'S$', flag: '🇸🇬' },
];

export default function App() {
  const [currencies, setCurrencies] = useState(DEFAULT_CURRENCIES);
  const [sourceCurrency, setSourceCurrency] = useState('USD');
  const [targetCurrency, setTargetCurrency] = useState('EUR');
  const [amount, setAmount] = useState(1000);

  const [conversionResult, setConversionResult] = useState(null);
  const [historyData, setHistoryData] = useState([]);
  const [budgetData, setBudgetData] = useState(null);
  const [favorites, setFavorites] = useState([]);
  const [conversionHistory, setConversionHistory] = useState([]);

  const [travelMode, setTravelMode] = useState(false);
  const [isConverting, setIsConverting] = useState(false);
  const [isChartLoading, setIsChartLoading] = useState(false);
  const [isBudgetLoading, setIsBudgetLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  // Load initial currencies, favorites, and history
  useEffect(() => {
    const initData = async () => {
      try {
        const [currList, favList, histList] = await Promise.allSettled([
          fetchCurrencies(),
          fetchFavorites(),
          fetchConversionHistory(8),
        ]);
        if (currList.status === 'fulfilled' && currList.value.length) {
          setCurrencies(currList.value);
        }
        if (favList.status === 'fulfilled') {
          setFavorites(favList.value);
        }
        if (histList.status === 'fulfilled') {
          setConversionHistory(histList.value);
        }
      } catch (err) {
        console.error('Initial load error:', err);
      }
    };
    initData();
  }, []);

  // Perform Live Conversion
  const performConversion = useCallback(
    async (src, tgt, amt) => {
      if (amt < 0 || isNaN(amt)) return;
      setIsConverting(true);
      setError(null);
      try {
        const data = await convertCurrency(src, tgt, amt);
        setConversionResult(data);
        setLastUpdated(new Date());

        // Refresh recent conversion history and auto-tracked favorites
        fetchConversionHistory(8)
          .then(setConversionHistory)
          .catch(() => {});
        fetchFavorites()
          .then(setFavorites)
          .catch(() => {});
      } catch (err) {
        setError(err.message || 'Failed to obtain live rate');
      } finally {
        setIsConverting(false);
      }
    },
    []
  );

  // Fetch 30-Day Trend Chart
  const loadHistoricalTrend = useCallback(async (src, tgt) => {
    setIsChartLoading(true);
    try {
      const data = await fetchHistorical(src, tgt, 30);
      setHistoryData(data);
    } catch (err) {
      console.error('Historical fetch error:', err);
    } finally {
      setIsChartLoading(false);
    }
  }, []);

  // Fetch Travel Budget Matrix
  const loadTravelBudget = useCallback(async (base, amt) => {
    setIsBudgetLoading(true);
    try {
      const data = await fetchTravelBudget(base, amt);
      setBudgetData(data);
    } catch (err) {
      console.error('Budget fetch error:', err);
    } finally {
      setIsBudgetLoading(false);
    }
  }, []);

  // Trigger conversion & budget calculation on amount or currency change
  useEffect(() => {
    performConversion(sourceCurrency, targetCurrency, amount);
  }, [sourceCurrency, targetCurrency, amount, performConversion]);

  // Trigger historical trend on currency pair change
  useEffect(() => {
    loadHistoricalTrend(sourceCurrency, targetCurrency);
  }, [sourceCurrency, targetCurrency, loadHistoricalTrend]);

  // Trigger travel budget calculation when in travel mode or base/amount updates
  useEffect(() => {
    if (travelMode) {
      loadTravelBudget(sourceCurrency, amount);
    }
  }, [travelMode, sourceCurrency, amount, loadTravelBudget]);

  // Swap currencies
  const handleSwap = () => {
    const oldSrc = sourceCurrency;
    const oldTgt = targetCurrency;
    setSourceCurrency(oldTgt);
    setTargetCurrency(oldSrc);
  };

  // Toggle Favorite
  const handleToggleFavorite = async (src = sourceCurrency, tgt = targetCurrency) => {
    try {
      await toggleFavorite(src, tgt);
      const updated = await fetchFavorites();
      setFavorites(updated);
    } catch (err) {
      console.error('Toggle favorite error:', err);
    }
  };

  const handleDeleteFavorite = async (id) => {
    try {
      await deleteFavorite(id);
      setFavorites((prev) => prev.filter((f) => f.id !== id));
    } catch (err) {
      console.error('Delete favorite error:', err);
    }
  };

  const handleSelectPair = (src, tgt, amt) => {
    setSourceCurrency(src);
    setTargetCurrency(tgt);
    if (amt !== undefined && amt !== null) {
      setAmount(amt);
    }
  };

  const isFavorite = favorites.some(
    (f) =>
      f.source_currency === sourceCurrency &&
      f.target_currency === targetCurrency &&
      Boolean(f.is_manual)
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-emerald-500 selection:text-slate-950">
      {/* Top Navbar */}
      <header className="border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center shadow-lg shadow-emerald-500/20 ring-1 ring-emerald-400/30">
              <Coins className="w-5 h-5 text-slate-950" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-lg text-white tracking-tight">
                  Vibe<span className="text-emerald-400">FX</span>
                </span>
                <span className="hidden sm:inline-block text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full">
                  WAL Cached
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block">
                Interbank Currency Matrix & Historical Intelligence
              </p>
            </div>
          </div>

          {/* Travel Mode Toggle Button */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setTravelMode(!travelMode)}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all border shadow-sm ${
                travelMode
                  ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-emerald-500/20'
                  : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-700 hover:border-slate-600'
              }`}
            >
              <Plane
                className={`w-4 h-4 transition-transform ${
                  travelMode ? 'rotate-45' : ''
                }`}
              />
              <span>Travel Budget Mode</span>
              <span
                className={`w-2 h-2 rounded-full ${
                  travelMode ? 'bg-slate-950 animate-ping' : 'bg-slate-600'
                }`}
              />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-7">
        {/* Quick-Access Favorites Bar */}
        <Favorites
          favorites={favorites}
          activeSource={sourceCurrency}
          activeTarget={targetCurrency}
          onSelectPair={handleSelectPair}
          onDeleteFavorite={handleDeleteFavorite}
          onTogglePin={handleToggleFavorite}
        />

        {/* Travel Mode Banner if Active */}
        {travelMode && (
          <div className="animate-in fade-in slide-in-from-top-2 duration-300">
            <TravelBudget
              baseCurrency={sourceCurrency}
              baseAmount={amount}
              budgetData={budgetData}
              isLoading={isBudgetLoading}
            />
          </div>
        )}

        {/* Core Grid: Converter & 30-Day Trend Chart */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-7 items-start">
          {/* Left Column: Dual Converter */}
          <div className="lg:col-span-6 space-y-6">
            <DualConverter
              currencies={currencies}
              sourceCurrency={sourceCurrency}
              targetCurrency={targetCurrency}
              amount={amount}
              onSourceChange={setSourceCurrency}
              onTargetChange={setTargetCurrency}
              onAmountChange={setAmount}
              onSwap={handleSwap}
              conversionResult={conversionResult}
              isLoading={isConverting}
              error={error}
              isFavorite={isFavorite}
              onToggleFavorite={handleToggleFavorite}
              lastUpdated={lastUpdated}
            />

            {/* Architecture Highlights Pill Box */}
            <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-5 text-xs text-slate-400 space-y-2">
              <div className="flex items-center gap-2 font-semibold text-slate-300">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Enterprise Rate Pipeline</span>
              </div>
              <ul className="list-disc list-inside space-y-1 text-slate-400">
                <li>
                  <strong className="text-slate-300">1-Hour TTL SQLite Cache:</strong> Prevents N+1 rate-burnout and minimizes API latency.
                </li>
                <li>
                  <strong className="text-slate-300">Resilient Fallback:</strong> Seamlessly falls back to Frankfurter API and Open ER-API with zero key configuration.
                </li>
                <li>
                  <strong className="text-slate-300">WAL Mode:</strong> Full concurrent multi-read/write SQLite operations with zero lock starvation.
                </li>
              </ul>
            </div>
          </div>

          {/* Right Column: 30-Day Trend Chart */}
          <div className="lg:col-span-6 space-y-6">
            <TrendChart
              historyData={historyData}
              sourceCurrency={sourceCurrency}
              targetCurrency={targetCurrency}
              isLoading={isChartLoading}
            />

            {/* SQLite Conversion History Ledger */}
            <ConversionHistory
              history={conversionHistory}
              onSelectPair={handleSelectPair}
              onRefresh={() => fetchConversionHistory(8).then(setConversionHistory)}
            />
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-950 py-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Globe2 className="w-4 h-4 text-emerald-500" />
            <span>VibeFX Real-time Currency Converter • Powered by FastAPI & SQLite</span>
          </div>
          <div className="text-slate-600 font-mono text-[11px]">
            FastAPI (WAL) • Frankfurter API • React 19 • Recharts • Tailwind CSS
          </div>
        </div>
      </footer>
    </div>
  );
}
