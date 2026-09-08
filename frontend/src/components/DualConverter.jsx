import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeftRight, Star, RefreshCw, AlertCircle, Sparkles } from 'lucide-react';

export default function DualConverter({
  currencies,
  sourceCurrency,
  targetCurrency,
  amount,
  onSourceChange,
  onTargetChange,
  onAmountChange,
  onSwap,
  conversionResult,
  isLoading,
  error,
  isFavorite,
  onToggleFavorite,
  lastUpdated,
}) {
  const [localAmount, setLocalAmount] = useState(amount);
  const debounceTimer = useRef(null);

  // Sync prop changes to local input
  useEffect(() => {
    setLocalAmount(amount);
  }, [amount]);

  // Debounce input typing to prevent N+1 backend spam
  const handleAmountInput = (e) => {
    const val = e.target.value;
    // Allow empty or positive numbers
    if (val === '' || /^\d*\.?\d*$/.test(val)) {
      setLocalAmount(val);
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
      debounceTimer.current = setTimeout(() => {
        const num = parseFloat(val);
        onAmountChange(isNaN(num) ? 0 : num);
      }, 350);
    }
  };

  const handleQuickAmount = (val) => {
    setLocalAmount(val.toString());
    onAmountChange(val);
  };

  const sourceMeta = currencies.find((c) => c.code === sourceCurrency) || {
    flag: '💵',
    symbol: '$',
    name: sourceCurrency,
  };
  const targetMeta = currencies.find((c) => c.code === targetCurrency) || {
    flag: '💶',
    symbol: '€',
    name: targetCurrency,
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800/80 rounded-2xl p-6 sm:p-7 shadow-2xl backdrop-blur-md relative overflow-hidden transition-all hover:border-slate-700/80">
      {/* Subtle glowing accent background */}
      <div className="absolute -top-24 -right-24 w-56 h-56 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header with status and favorite button */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            Instant Currency Conversion
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time interbank rates backed by SQLite low-latency cache
          </p>
        </div>

        <button
          type="button"
          onClick={onToggleFavorite}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all ${
            isFavorite
              ? 'bg-amber-500/15 border-amber-500/40 text-amber-300 shadow-sm shadow-amber-500/20'
              : 'bg-slate-800/60 hover:bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200'
          }`}
          title={isFavorite ? 'Saved to favorites' : 'Save this pair to favorites'}
        >
          <Star
            className={`w-4 h-4 ${
              isFavorite ? 'fill-amber-400 text-amber-400' : ''
            }`}
          />
          <span className="hidden sm:inline">
            {isFavorite ? 'Favorited' : 'Add to Favorites'}
          </span>
        </button>
      </div>

      {/* Amount Input */}
      <div className="mb-5">
        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
          Amount to Convert
        </label>
        <div className="relative rounded-xl border border-slate-700/80 bg-slate-950/60 focus-within:border-emerald-500/80 focus-within:ring-2 focus-within:ring-emerald-500/20 transition-all">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-mono text-lg font-bold">
            {sourceMeta.symbol || '$'}
          </span>
          <input
            type="text"
            inputMode="decimal"
            value={localAmount}
            onChange={handleAmountInput}
            placeholder="0.00"
            className="w-full bg-transparent pl-10 pr-4 py-3 text-xl sm:text-2xl font-bold text-white font-mono placeholder:text-slate-600 focus:outline-none"
          />
        </div>

        {/* Quick Amount presets */}
        <div className="flex items-center gap-2 mt-2.5">
          <span className="text-[11px] text-slate-500 font-medium">Presets:</span>
          {[50, 100, 500, 1000, 5000].map((val) => (
            <button
              key={val}
              type="button"
              onClick={() => handleQuickAmount(val)}
              className={`text-xs px-2.5 py-1 rounded-md transition-all font-mono font-medium ${
                Number(localAmount) === val
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  : 'bg-slate-800/60 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-700/50'
              }`}
            >
              {val}
            </button>
          ))}
        </div>
      </div>

      {/* Dual Selectors with Swap */}
      <div className="grid grid-cols-1 sm:grid-cols-[1fr,auto,1fr] items-center gap-3 mb-6">
        {/* Source Currency */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
            From
          </label>
          <div className="relative">
            <select
              value={sourceCurrency}
              onChange={(e) => onSourceChange(e.target.value)}
              className="w-full appearance-none bg-slate-950/70 border border-slate-700/80 rounded-xl px-4 py-3 pr-10 text-white font-medium focus:outline-none focus:border-emerald-500/80 focus:ring-2 focus:ring-emerald-500/20 transition-all cursor-pointer"
            >
              {currencies.map((c) => (
                <option key={`src-${c.code}`} value={c.code} className="bg-slate-900 text-white">
                  {c.flag} {c.code} — {c.name}
                </option>
              ))}
            </select>
            <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
              <span className="text-xs">▼</span>
            </div>
          </div>
        </div>

        {/* Instant Swap Button */}
        <div className="flex justify-center sm:pt-6">
          <button
            type="button"
            onClick={onSwap}
            className="p-3 bg-slate-800 hover:bg-emerald-500 hover:text-slate-950 text-emerald-400 border border-slate-700 hover:border-emerald-400 rounded-xl shadow-lg transition-all duration-300 hover:scale-105 active:scale-95 group focus:outline-none"
            title="Swap Currencies"
          >
            <ArrowLeftRight className="w-5 h-5 transition-transform duration-300 group-hover:rotate-180" />
          </button>
        </div>

        {/* Target Currency */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
            To
          </label>
          <div className="relative">
            <select
              value={targetCurrency}
              onChange={(e) => onTargetChange(e.target.value)}
              className="w-full appearance-none bg-slate-950/70 border border-slate-700/80 rounded-xl px-4 py-3 pr-10 text-white font-medium focus:outline-none focus:border-emerald-500/80 focus:ring-2 focus:ring-emerald-500/20 transition-all cursor-pointer"
            >
              {currencies.map((c) => (
                <option key={`tgt-${c.code}`} value={c.code} className="bg-slate-900 text-white">
                  {c.flag} {c.code} — {c.name}
                </option>
              ))}
            </select>
            <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
              <span className="text-xs">▼</span>
            </div>
          </div>
        </div>
      </div>

      {/* Conversion Output Panel */}
      <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-5 relative">
        {isLoading ? (
          <div className="flex items-center justify-center py-5 gap-3 text-slate-400">
            <RefreshCw className="w-5 h-5 animate-spin text-emerald-400" />
            <span className="text-sm font-medium">Fetching live exchange rate...</span>
          </div>
        ) : error ? (
          <div className="flex items-center gap-2.5 text-rose-400 text-sm py-2">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        ) : conversionResult ? (
          <div>
            <div className="text-xs font-medium text-slate-400 mb-1 flex items-center justify-between">
              <span>Converted Equivalent</span>
              {lastUpdated && (
                <span className="text-[11px] text-slate-500 font-mono">
                  Updated: {new Date(lastUpdated).toLocaleTimeString()}
                </span>
              )}
            </div>

            <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2">
              <div className="text-3xl sm:text-4xl font-extrabold text-emerald-400 font-mono tracking-tight">
                {targetMeta.symbol}{' '}
                {conversionResult.converted.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 4,
                })}{' '}
                <span className="text-lg text-slate-300 font-sans font-semibold">
                  {targetCurrency}
                </span>
              </div>
            </div>

            {/* Exchange Rate details */}
            <div className="mt-3 pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between text-xs text-slate-400 gap-2">
              <div className="font-mono">
                1 {sourceCurrency} ={' '}
                <span className="text-slate-200 font-semibold">{conversionResult.rate}</span>{' '}
                {targetCurrency}
              </div>
              {conversionResult.inverse_rate > 0 && (
                <div className="font-mono text-slate-500">
                  1 {targetCurrency} ={' '}
                  <span className="text-slate-400">
                    {conversionResult.inverse_rate}
                  </span>{' '}
                  {sourceCurrency}
                </div>
              )}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
