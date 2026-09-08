import React from 'react';
import { Plane, TrendingUp, Sparkles, DollarSign } from 'lucide-react';

const CURRENCY_META = {
  EUR: { name: 'Euro', flag: '🇪🇺', symbol: '€' },
  GBP: { name: 'British Pound', flag: '🇬🇧', symbol: '£' },
  JPY: { name: 'Japanese Yen', flag: '🇯🇵', symbol: '¥' },
  CAD: { name: 'Canadian Dollar', flag: '🇨🇦', symbol: 'CA$' },
  AUD: { name: 'Australian Dollar', flag: '🇦🇺', symbol: 'AU$' },
};

export default function TravelBudget({ baseCurrency, baseAmount, budgetData, isLoading }) {
  if (isLoading) {
    return (
      <div className="bg-slate-900/90 border border-slate-800/80 rounded-2xl p-6 shadow-xl backdrop-blur-md animate-pulse">
        <div className="h-6 bg-slate-800 rounded w-1/3 mb-4"></div>
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-12 bg-slate-800/60 rounded-xl"></div>
          ))}
        </div>
      </div>
    );
  }

  if (!budgetData || !budgetData.comparisons) return null;

  return (
    <div className="bg-slate-900/90 border border-slate-800/80 rounded-2xl p-6 shadow-xl backdrop-blur-md transition-all duration-300 hover:border-slate-700/80">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div>
          <h3 className="text-lg font-bold text-white flex items-center gap-2.5">
            <span className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg border border-emerald-500/20">
              <Plane className="w-5 h-5" />
            </span>
            Travel Budget Matrix
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Real-time travel spending power across the top 5 global destination currencies.
          </p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 rounded-full shadow-inner">
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            Base: {Number(baseAmount).toLocaleString()} {baseCurrency}
          </span>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/40">
        <table className="w-full text-left text-sm text-slate-300">
          <thead className="bg-slate-800/60 uppercase text-xs tracking-wider text-slate-400 font-semibold border-b border-slate-800">
            <tr>
              <th className="py-3 px-4">Destination Currency</th>
              <th className="py-3 px-4">Exchange Rate</th>
              <th className="py-3 px-4 text-right">Equivalent Budget</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {budgetData.comparisons.map((row) => {
              const meta = CURRENCY_META[row.currency] || { name: row.currency, flag: '🌐', symbol: '' };
              return (
                <tr
                  key={row.currency}
                  className="hover:bg-slate-800/30 transition-colors group"
                >
                  <td className="py-3.5 px-4 font-medium text-white">
                    <div className="flex items-center gap-2.5">
                      <span className="text-xl" role="img" aria-label={row.currency}>
                        {meta.flag}
                      </span>
                      <div>
                        <div className="font-bold flex items-center gap-1.5">
                          {row.currency}
                          <span className="text-xs text-slate-400 font-normal group-hover:text-slate-300">
                            • {meta.name}
                          </span>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="py-3.5 px-4 text-slate-400 font-mono text-xs sm:text-sm">
                    1 {baseCurrency} = <span className="text-slate-200 font-semibold">{row.rate}</span> {row.currency}
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <div className="font-mono font-bold text-emerald-400 text-base">
                      {meta.symbol} {row.equivalent.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                    <div className="text-[11px] text-slate-500 font-mono">
                      {row.currency}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
