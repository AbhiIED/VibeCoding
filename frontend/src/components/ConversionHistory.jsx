import React from 'react';
import { History, ArrowRight, RotateCcw, Clock } from 'lucide-react';

export default function ConversionHistory({
  history,
  onSelectPair,
  onRefresh,
}) {
  if (!history || history.length === 0) {
    return (
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 text-center text-slate-500 text-xs">
        <Clock className="w-5 h-5 mx-auto mb-1.5 opacity-40" />
        No conversions recorded yet. Perform a conversion to view your ledger.
      </div>
    );
  }

  return (
    <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-5 shadow-lg backdrop-blur-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <span className="p-1.5 bg-slate-800 text-slate-300 rounded-lg">
            <History className="w-4 h-4" />
          </span>
          Recent Conversions Ledger
        </h3>
        <button
          type="button"
          onClick={onRefresh}
          className="text-xs text-slate-400 hover:text-emerald-400 flex items-center gap-1 transition-colors"
          title="Refresh history"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Refresh</span>
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-950/50 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
            <tr>
              <th className="py-2.5 px-3">Pair</th>
              <th className="py-2.5 px-3">Input Amount</th>
              <th className="py-2.5 px-3">Converted Value</th>
              <th className="py-2.5 px-3">Applied Rate</th>
              <th className="py-2.5 px-3 text-right">Time</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 text-slate-300 font-mono">
            {history.map((row) => (
              <tr
                key={row.id}
                onClick={() => onSelectPair(row.source_currency, row.target_currency, row.amount)}
                className="hover:bg-slate-800/40 cursor-pointer transition-colors group"
                title="Click to load into converter"
              >
                <td className="py-2.5 px-3 font-semibold text-white flex items-center gap-1">
                  <span>{row.source_currency}</span>
                  <ArrowRight className="w-3 h-3 text-slate-500 group-hover:text-emerald-400 transition-colors" />
                  <span>{row.target_currency}</span>
                </td>
                <td className="py-2.5 px-3 text-slate-300">
                  {Number(row.amount).toLocaleString()}{' '}
                  <span className="text-slate-500 font-sans">{row.source_currency}</span>
                </td>
                <td className="py-2.5 px-3 text-emerald-400 font-semibold">
                  {Number(row.converted_amount).toLocaleString()}{' '}
                  <span className="text-slate-400 font-sans">{row.target_currency}</span>
                </td>
                <td className="py-2.5 px-3 text-slate-400">
                  {row.rate}
                </td>
                <td className="py-2.5 px-3 text-right text-slate-500 text-[11px] font-sans">
                  {row.created_at ? row.created_at.split(' ')[1] || row.created_at : 'Just now'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
