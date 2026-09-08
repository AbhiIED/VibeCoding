import React, { useMemo } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { TrendingUp, TrendingDown, Activity, Calendar } from 'lucide-react';

const CustomTooltip = ({ active, payload, label, targetCurrency }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-slate-950/95 border border-slate-700/80 p-3 rounded-xl shadow-2xl backdrop-blur-md">
        <p className="text-xs text-slate-400 font-mono mb-1">{data.date}</p>
        <p className="text-sm font-bold text-emerald-400 font-mono">
          {Number(data.rate).toFixed(4)}{' '}
          <span className="text-xs text-slate-300 font-normal">{targetCurrency}</span>
        </p>
      </div>
    );
  }
  return null;
};

export default function TrendChart({
  historyData,
  sourceCurrency,
  targetCurrency,
  isLoading,
}) {
  const stats = useMemo(() => {
    if (!historyData || historyData.length === 0) return null;
    const rates = historyData.map((d) => d.rate);
    const min = Math.min(...rates);
    const max = Math.max(...rates);
    const avg = rates.reduce((acc, v) => acc + v, 0) / rates.length;
    const first = rates[0];
    const last = rates[rates.length - 1];
    const change = ((last - first) / first) * 100;

    return {
      min: min.toFixed(4),
      max: max.toFixed(4),
      avg: avg.toFixed(4),
      change: change.toFixed(2),
      isPositive: change >= 0,
    };
  }, [historyData]);

  if (isLoading) {
    return (
      <div className="bg-slate-900/90 border border-slate-800/80 rounded-2xl p-6 shadow-xl backdrop-blur-md animate-pulse">
        <div className="flex justify-between mb-6">
          <div className="h-6 bg-slate-800 rounded w-1/3"></div>
          <div className="h-6 bg-slate-800 rounded w-1/4"></div>
        </div>
        <div className="h-64 bg-slate-800/40 rounded-xl"></div>
      </div>
    );
  }

  if (!historyData || historyData.length === 0) {
    return (
      <div className="bg-slate-900/90 border border-slate-800/80 rounded-2xl p-6 shadow-xl text-center text-slate-400">
        <Activity className="w-8 h-8 mx-auto mb-2 text-slate-600" />
        <p>No historical trend data available for {sourceCurrency} / {targetCurrency}</p>
      </div>
    );
  }

  // Calculate chart domain for dynamic zoom
  const rates = historyData.map((d) => d.rate);
  const minVal = Math.min(...rates);
  const maxVal = Math.max(...rates);
  const padding = (maxVal - minVal) * 0.1 || minVal * 0.05;
  const yDomain = [
    Math.max(0, Number((minVal - padding).toFixed(4))),
    Number((maxVal + padding).toFixed(4)),
  ];

  return (
    <div className="bg-slate-900/90 border border-slate-800/80 rounded-2xl p-6 shadow-xl backdrop-blur-md transition-all hover:border-slate-700/80">
      {/* Header & Stats */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-emerald-500/10 text-emerald-400 rounded-lg border border-emerald-500/20">
              <Activity className="w-4 h-4" />
            </span>
            <h3 className="text-base font-bold text-white">
              30-Day Market Trend
            </h3>
            <span className="text-xs px-2 py-0.5 bg-slate-800 text-slate-300 rounded font-mono font-medium">
              {sourceCurrency}/{targetCurrency}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5 text-slate-500" />
            Daily exchange rate movements over the past 30 days
          </p>
        </div>

        {stats && (
          <div className="flex items-center gap-3">
            <div
              className={`flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full border ${
                stats.isPositive
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                  : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
              }`}
            >
              {stats.isPositive ? (
                <TrendingUp className="w-3.5 h-3.5" />
              ) : (
                <TrendingDown className="w-3.5 h-3.5" />
              )}
              <span>
                {stats.isPositive ? '+' : ''}
                {stats.change}%
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Mini metric tiles */}
      {stats && (
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-slate-950/40 border border-slate-800/80 rounded-xl p-3">
            <div className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">
              30d Low
            </div>
            <div className="text-sm font-bold font-mono text-slate-200 mt-0.5">
              {stats.min}
            </div>
          </div>
          <div className="bg-slate-950/40 border border-slate-800/80 rounded-xl p-3">
            <div className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">
              30d Average
            </div>
            <div className="text-sm font-bold font-mono text-slate-200 mt-0.5">
              {stats.avg}
            </div>
          </div>
          <div className="bg-slate-950/40 border border-slate-800/80 rounded-xl p-3">
            <div className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">
              30d High
            </div>
            <div className="text-sm font-bold font-mono text-emerald-400 mt-0.5">
              {stats.max}
            </div>
          </div>
        </div>
      )}

      {/* Recharts Area Container */}
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={historyData}
            margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
          >
            <defs>
              <linearGradient id="rateGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
            <XAxis
              dataKey="date"
              stroke="#64748b"
              fontSize={11}
              tickLine={false}
              tickFormatter={(d) => {
                const parts = d.split('-');
                return parts.length >= 3 ? `${parts[1]}/${parts[2]}` : d;
              }}
            />
            <YAxis
              stroke="#64748b"
              fontSize={11}
              domain={yDomain}
              tickLine={false}
              tickFormatter={(v) => Number(v).toFixed(2)}
            />
            <Tooltip
              content={<CustomTooltip targetCurrency={targetCurrency} />}
            />
            <Area
              type="monotone"
              dataKey="rate"
              stroke="#10b981"
              strokeWidth={2.5}
              fillOpacity={1}
              fill="url(#rateGradient)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
