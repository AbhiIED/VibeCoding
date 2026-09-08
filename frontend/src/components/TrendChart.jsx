import React from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { TrendingUp, TrendingDown, Activity, Calendar, AlertTriangle } from 'lucide-react';

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
  trendStats,
  dataSource,
}) {
  // All stats are now provided by the backend — zero business logic on the frontend

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

  // Y-axis domain derived from backend-provided stats (presentation-only padding)
  const low = trendStats?.low ?? 0;
  const high = trendStats?.high ?? 0;
  const padding = (high - low) * 0.1 || low * 0.05;
  const yDomain = [
    Math.max(0, Number((low - padding).toFixed(4))),
    Number((high + padding).toFixed(4)),
  ];

  const isSynthetic = dataSource === 'synthetic';

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

        <div className="flex items-center gap-2">
          {/* Synthetic data disclaimer */}
          {isSynthetic && (
            <div className="flex items-center gap-1 text-[11px] font-medium px-2 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20"
                 title="Historical data not available for this pair — trend is estimated from current rate">
              <AlertTriangle className="w-3 h-3" />
              <span>Estimated</span>
            </div>
          )}

          {trendStats && (
            <div
              className={`flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full border ${
                trendStats.is_positive
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                  : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
              }`}
            >
              {trendStats.is_positive ? (
                <TrendingUp className="w-3.5 h-3.5" />
              ) : (
                <TrendingDown className="w-3.5 h-3.5" />
              )}
              <span>
                {trendStats.is_positive ? '+' : ''}
                {trendStats.change_percent}%
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Mini metric tiles — values come directly from backend-computed stats */}
      {trendStats && (
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-slate-950/40 border border-slate-800/80 rounded-xl p-3">
            <div className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">
              30d Low
            </div>
            <div className="text-sm font-bold font-mono text-slate-200 mt-0.5">
              {trendStats.low}
            </div>
          </div>
          <div className="bg-slate-950/40 border border-slate-800/80 rounded-xl p-3">
            <div className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">
              30d Average
            </div>
            <div className="text-sm font-bold font-mono text-slate-200 mt-0.5">
              {trendStats.average}
            </div>
          </div>
          <div className="bg-slate-950/40 border border-slate-800/80 rounded-xl p-3">
            <div className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">
              30d High
            </div>
            <div className="text-sm font-bold font-mono text-emerald-400 mt-0.5">
              {trendStats.high}
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

      {/* Synthetic data footnote */}
      {isSynthetic && (
        <p className="text-[11px] text-amber-400/70 mt-3 flex items-center gap-1.5">
          <AlertTriangle className="w-3 h-3 flex-shrink-0" />
          Historical time-series data is not available from the ECB for this currency pair.
          Trend shown is estimated from the current live rate.
        </p>
      )}
    </div>
  );
}
