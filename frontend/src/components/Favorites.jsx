import React from 'react';
import { Star, ArrowRight, X, Flame, Sparkles } from 'lucide-react';

export default function Favorites({
  favorites,
  activeSource,
  activeTarget,
  onSelectPair,
  onDeleteFavorite,
  onTogglePin,
}) {
  if (!favorites || favorites.length === 0) {
    return (
      <div className="bg-slate-900/60 border border-dashed border-slate-800 rounded-xl p-4 text-center">
        <p className="text-xs text-slate-400 flex items-center justify-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
          Converted currency pairs and starred favorites will automatically appear here for 1-click access.
        </p>
      </div>
    );
  }

  const pinnedCount = favorites.filter((f) => f.is_manual).length;
  const frequentCount = favorites.length - pinnedCount;

  return (
    <div className="bg-slate-900/80 border border-slate-800/80 rounded-xl p-4 shadow-lg backdrop-blur-sm">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
            <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
            Quick Access & Frequently Used
          </h4>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700 font-mono">
            {pinnedCount} pinned • {frequentCount} auto-saved
          </span>
        </div>
        <span className="text-[11px] text-slate-500 font-mono hidden sm:inline">
          Auto-tracked from your conversions
        </span>
      </div>

      <div className="flex flex-wrap gap-2">
        {favorites.map((fav) => {
          const isActive =
            fav.source_currency === activeSource &&
            fav.target_currency === activeTarget;

          return (
            <div
              key={fav.id}
              className={`group flex items-center gap-1.5 pl-2.5 pr-2 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
                isActive
                  ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300 shadow-sm shadow-emerald-500/10'
                  : 'bg-slate-800/60 hover:bg-slate-800 border-slate-700/60 text-slate-300 hover:text-white'
              }`}
            >
              {/* Star toggle icon */}
              {onTogglePin && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onTogglePin(fav.source_currency, fav.target_currency);
                  }}
                  className="p-0.5 rounded hover:bg-slate-700/60 text-slate-400 transition-colors"
                  title={fav.is_manual ? "Pinned Favorite (click to unpin)" : "Auto-saved (click to pin)"}
                >
                  <Star
                    className={`w-3.5 h-3.5 transition-colors ${
                      fav.is_manual
                        ? 'fill-amber-400 text-amber-400'
                        : 'text-slate-500 hover:text-amber-400'
                    }`}
                  />
                </button>
              )}

              {/* Click to select pair */}
              <button
                type="button"
                onClick={() => onSelectPair(fav.source_currency, fav.target_currency)}
                className="flex items-center gap-1.5 focus:outline-none"
                title={`Switch to ${fav.source_currency} → ${fav.target_currency}`}
              >
                <span>{fav.source_currency}</span>
                <ArrowRight className="w-3 h-3 text-slate-500 group-hover:text-emerald-400 transition-colors" />
                <span>{fav.target_currency}</span>
              </button>

              {/* Frequent use badge */}
              {fav.use_count > 1 && !fav.is_manual && (
                <span className="flex items-center text-[10px] text-amber-400/90 font-mono bg-amber-500/10 px-1 py-0.2 rounded border border-amber-500/20" title={`Used ${fav.use_count} times`}>
                  <Flame className="w-2.5 h-2.5 mr-0.5 text-amber-400" />
                  {fav.use_count}
                </span>
              )}

              {/* Remove button */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteFavorite(fav.id);
                }}
                className="ml-1 p-0.5 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"
                title="Remove from quick access"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
