const API_BASE = import.meta.env.VITE_API_URL || '/api';

/**
 * Converts currency using the backend live rate endpoint.
 */
export async function convertCurrency(from, to, amount) {
  const url = `${API_BASE}/convert?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&amount=${encodeURIComponent(amount)}`;
  const res = await fetch(url);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Conversion failed with status ${res.status}`);
  }
  return res.json();
}

/**
 * Fetches 30-day historical time-series data for the pair.
 */
export async function fetchHistorical(from, to, days = 30) {
  const url = `${API_BASE}/historical?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&days=${days}`;
  const res = await fetch(url);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Historical rates failed with status ${res.status}`);
  }
  return res.json();
}

/**
 * Fetches travel budget conversions across 5 major global currencies.
 */
export async function fetchTravelBudget(base, amount) {
  const url = `${API_BASE}/budget?base=${encodeURIComponent(base)}&amount=${encodeURIComponent(amount)}`;
  const res = await fetch(url);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Budget calculation failed with status ${res.status}`);
  }
  return res.json();
}

/**
 * Fetches user favorites.
 */
export async function fetchFavorites() {
  const res = await fetch(`${API_BASE}/favorites`);
  if (!res.ok) throw new Error('Failed to load favorites');
  return res.json();
}

/**
 * Adds a currency pair to favorites (marks as manual pinned favorite).
 */
export async function addFavorite(source, target) {
  const res = await fetch(`${API_BASE}/favorites`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ source, target }),
  });
  if (!res.ok) throw new Error('Failed to save favorite');
  return res.json();
}

/**
 * Toggles the pinned favorite status of a currency pair.
 */
export async function toggleFavorite(source, target) {
  const res = await fetch(`${API_BASE}/favorites/toggle`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ source, target }),
  });
  if (!res.ok) throw new Error('Failed to toggle favorite');
  return res.json();
}

/**
 * Removes a favorite pair by ID.
 */
export async function deleteFavorite(id) {
  const res = await fetch(`${API_BASE}/favorites/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Failed to remove favorite');
  return res.json();
}

/**
 * Fetches recent conversion logs.
 */
export async function fetchConversionHistory(limit = 10) {
  const res = await fetch(`${API_BASE}/history?limit=${limit}`);
  if (!res.ok) throw new Error('Failed to load history');
  return res.json();
}

/**
 * Fetches supported currencies list.
 */
export async function fetchCurrencies() {
  const res = await fetch(`${API_BASE}/currencies`);
  if (!res.ok) throw new Error('Failed to load currency list');
  return res.json();
}
