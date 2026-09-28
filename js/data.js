/* =============================================================
   RAJARAJESHWARI TRADERS — Live Data Layer v3.0
   Fetches all data from Google Apps Script / Google Sheets.
   NO mock data. Real data only, or empty, or error state.
   ============================================================= */

'use strict';

/* ── Stable Google Apps Script Web App Deployment URL ── */
/* DO NOT use googleusercontent.com/macros/echo URLs — use stable /exec endpoint */
const API_BASE_URL = 'https://script.google.com/macros/s/AKfycbwJKmimHTYqlmP30DLPWnU0plBSDd45suEu5NGZ3yvn32bSdZzLbh7vVG8dOaiBT-6e/exec';

/* ── Cache TTL in milliseconds (5 minutes for reference data, 60s for transactions) ── */
const CACHE_TTL = { ref: 5 * 60 * 1000, txn: 60 * 1000 };

/* ── Business Config ── */
const BUSINESS = {
  name: 'RajaRajeshwari Traders',
  shortName: 'RRT',
  tagline: 'Retail & Wholesale',
  owner: 'Budime Aravind',
  location: 'Huzurabad, Telangana',
  currency: '₹',
  version: '2.0',
  fy_start: null,
};

/* ── Live data arrays — start empty, hydrated on boot ── */
let PRODUCTS   = [];
let SUPPLIERS  = [];
let PURCHASES  = [];
let SALES      = [];
let EXPENSES   = [];
let WASTAGE    = [];
let STOCK      = [];  /* STOCK sheet items */

const EXPENSE_CATEGORIES = [
  'Labour', 'Transport', 'Electricity', 'Rent',
  'Cold Storage', 'Packing Material', 'Equipment Maintenance', 'Miscellaneous',
];

/* ── Sync state ── */
const _syncState = {
  loading:    true,
  error:      null,
  lastSynced: null,
  syncing:    false,
};

/* ────────────────────────────────────────────────────
   CACHE HELPERS (localStorage — live GAS data only)
   ──────────────────────────────────────────────────── */

const CACHE_SCHEMA_VER = 'rrt_live_v4_';

/* Purge all legacy mock data keys from previous sessions */
(function _purgeLegacyMockStorage() {
  try {
    const purgeKey = 'rrt_purged_mock_ledger_v4';
    if (!localStorage.getItem(purgeKey)) {
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const k = localStorage.key(i);
        if (k && (k.startsWith('rrt_') || k.startsWith('rrt_v3_') || k.startsWith('rrt_v2_'))) {
          localStorage.removeItem(k);
        }
      }
      localStorage.setItem(purgeKey, 'true');
    }
  } catch (e) { /* storage restricted */ }
})();

function _cacheKey(k) { return CACHE_SCHEMA_VER + k; }

function _saveCache(key, data) {
  try {
    localStorage.setItem(_cacheKey(key), JSON.stringify({ ts: Date.now(), data, origin: 'live_gas' }));
  } catch (e) {
    /* If storage is full, clear older transaction keys and retry once */
    try {
      localStorage.removeItem(_cacheKey('sales'));
      localStorage.removeItem(_cacheKey('purchases'));
      localStorage.setItem(_cacheKey(key), JSON.stringify({ ts: Date.now(), data, origin: 'live_gas' }));
    } catch (_) {}
  }
}

function _loadCache(key, ttl) {
  try {
    const raw = localStorage.getItem(_cacheKey(key));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || parsed.origin !== 'live_gas') return null;
    if (Date.now() - parsed.ts > ttl) return null;
    return parsed.data;
  } catch (e) { return null; }
}

function _clearCache() {
  ['products','suppliers','purchases','sales','expenses','wastage','stock'].forEach(k => {
    try {
      localStorage.removeItem(_cacheKey(k));
      localStorage.removeItem('rrt_v3_' + k);
      localStorage.removeItem('rrt_' + k);
    } catch(e){}
  });
}

/* ────────────────────────────────────────────────────
   GAS FETCH WRAPPERS
   ──────────────────────────────────────────────────── */

async function _gasGet(action, params = {}, retries = 2, baseDelay = 400) {
  const url = new URL(API_BASE_URL);
  url.searchParams.set('action', action);
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null) url.searchParams.set(k, v);
  }

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url.toString(), { redirect: 'follow' });
      if (!res.ok) {
        // Transient Google CDN edge replication delay or throttling (404, 429, 5xx)
        if ((res.status === 404 || res.status === 429 || res.status >= 500) && attempt < retries) {
          console.warn(`[RT] Transient HTTP ${res.status} on ${action}. Retrying (${attempt + 1}/${retries})...`);
          await new Promise(r => setTimeout(r, baseDelay * Math.pow(1.5, attempt)));
          continue;
        }
        throw new Error(`HTTP ${res.status} on ${action}`);
      }
      const json = await res.json();
      if (!json.success) throw new Error(json.error || `GAS error on ${action}`);
      return json.data;
    } catch (err) {
      if (attempt < retries) {
        console.warn(`[RT] Network hiccup on ${action}: ${err.message}. Retrying (${attempt + 1}/${retries})...`);
        await new Promise(r => setTimeout(r, baseDelay * Math.pow(1.5, attempt)));
      } else {
        throw err;
      }
    }
  }
}

async function _gasPost(action, payload) {
  const res = await fetch(API_BASE_URL, {
    method:  'POST',
    headers: { 'Content-Type': 'text/plain' },  // GAS CORS requires text/plain
    body:    JSON.stringify({ action, payload }),
    redirect: 'follow',
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} on ${action}`);
  const json = await res.json();
  if (!json.success) throw new Error(json.error || `GAS error on ${action}`);
  return json.data;
}

/* ────────────────────────────────────────────────────
   LOADING / ERROR UI
   ──────────────────────────────────────────────────── */

function _showLoadingOverlay() {
  let el = document.getElementById('rrt-loading-overlay');
  if (!el) {
    el = document.createElement('div');
    el.id = 'rrt-loading-overlay';
    el.style.cssText = `
      position:fixed;inset:0;z-index:99999;
      background:radial-gradient(ellipse at 50% 35%, #0d1b2a 0%, #050a12 100%);
      display:flex;flex-direction:column;align-items:center;justify-content:center;
      transition:opacity 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    `;
    el.innerHTML = `
      <div style="
        background:rgba(15, 23, 42, 0.85);
        backdrop-filter:blur(24px);
        -webkit-backdrop-filter:blur(24px);
        border:1px solid rgba(255, 255, 255, 0.08);
        box-shadow:0 30px 60px -12px rgba(0,0,0,0.8), 0 0 40px rgba(16,185,129,0.06);
        border-radius:20px;
        padding:40px 48px;
        width:90%;
        max-width:440px;
        display:flex;
        flex-direction:column;
        align-items:center;
        text-align:center;
      ">
        <div style="
          width:54px;height:54px;border-radius:14px;
          background:linear-gradient(135deg, rgba(16,185,129,0.18) 0%, rgba(245,158,11,0.12) 100%);
          border:1px solid rgba(16,185,129,0.3);
          display:flex;align-items:center;justify-content:center;
          margin-bottom:18px;
          box-shadow:0 0 24px rgba(16,185,129,0.2);
        ">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
            <line x1="3" y1="6" x2="21" y2="6"/>
            <path d="M16 10a4 4 0 0 1-8 0"/>
          </svg>
        </div>

        <div style="color:#f8fafc;font-size:17px;font-weight:700;letter-spacing:-0.01em;font-family:inherit;">RajaRajeshwari Traders</div>
        <div style="color:#64748b;font-size:12px;font-weight:500;margin-top:2px;">Business Intelligence &amp; Retail Ledger</div>

        <div style="margin:26px 0 14px;display:flex;align-items:baseline;justify-content:center;gap:3px;">
          <span id="rrt-loader-pct" style="font-size:42px;font-weight:800;color:#10b981;font-family:monospace;letter-spacing:-0.03em;line-height:1;text-shadow:0 0 24px rgba(16,185,129,0.35);">0</span>
          <span style="font-size:20px;font-weight:700;color:#34d399;font-family:monospace;">%</span>
        </div>

        <div style="width:100%;height:6px;background:rgba(255,255,255,0.06);border-radius:999px;overflow:hidden;position:relative;">
          <div id="rrt-loader-bar" style="
            height:100%;width:0%;
            background:linear-gradient(90deg, #10b981 0%, #34d399 50%, #f59e0b 100%);
            border-radius:999px;
            transition:width 0.28s cubic-bezier(0.4, 0, 0.2, 1);
            box-shadow:0 0 14px rgba(16,185,129,0.5);
          "></div>
        </div>

        <div id="rrt-loading-sub" style="color:#94a3b8;font-size:12.5px;font-weight:500;margin-top:14px;min-height:18px;">
          Establishing connection to Google Sheets…
        </div>

        <div style="display:flex;align-items:center;gap:6px;margin-top:18px;padding:4px 10px;background:rgba(255,255,255,0.03);border-radius:999px;border:1px solid rgba(255,255,255,0.05);">
          <span style="width:6px;height:6px;background:#10b981;border-radius:50%;box-shadow:0 0 6px #10b981;animation:pulse-dot 1.5s infinite;"></span>
          <span style="font-size:10.5px;color:#64748b;font-weight:600;letter-spacing:0.02em;text-transform:uppercase;">Secure Apps Script Gateway</span>
        </div>
      </div>
      <style>
        @keyframes pulse-dot { 0%,100%{opacity:1;transform:scale(1);} 50%{opacity:0.4;transform:scale(0.85);} }
      </style>
    `;
    document.body.appendChild(el);
  } else {
    el.style.opacity = '1';
    el.style.display = 'flex';
  }
}

function _setProgress(pct, msg) {
  const bar   = document.getElementById('rrt-loader-bar');
  const pctEl = document.getElementById('rrt-loader-pct');
  const sub   = document.getElementById('rrt-loading-sub');
  if (bar) bar.style.width = Math.min(100, Math.max(0, pct)) + '%';
  if (pctEl) pctEl.textContent = Math.round(pct);
  if (sub && msg) sub.textContent = msg;
}

function _hideLoadingOverlay() {
  const el = document.getElementById('rrt-loading-overlay');
  if (el) {
    el.style.opacity = '0';
    setTimeout(() => {
      el.style.display = 'none';
    }, 300);
  }
}

function _showSyncError(msg) {
  let el = document.getElementById('rrt-sync-error-banner');
  if (!el) {
    el = document.createElement('div');
    el.id = 'rrt-sync-error-banner';
    el.style.cssText = `
      position:fixed;bottom:20px;right:20px;z-index:9998;
      background:#7f1d1d;border:1px solid #991b1b;border-radius:10px;
      padding:14px 18px;max-width:380px;
      display:flex;align-items:flex-start;gap:12px;
      box-shadow:0 8px 32px rgba(0,0,0,0.6);
    `;
    document.body.appendChild(el);
  }
  el.innerHTML = `
    <div style="color:#fca5a5;font-size:18px;margin-top:1px;">⚠</div>
    <div>
      <div style="color:#fca5a5;font-size:13px;font-weight:700;margin-bottom:3px;">Google Sheets Connection Error</div>
      <div style="color:#fecaca;font-size:12px;line-height:1.5;">${msg}</div>
      <div style="margin-top:10px;display:flex;gap:8px;">
        <button onclick="window.RT.refresh()" style="background:#991b1b;color:#fca5a5;border:none;padding:6px 12px;border-radius:6px;font-size:11px;font-weight:700;cursor:pointer;">Retry</button>
        <button onclick="document.getElementById('rrt-sync-error-banner').style.display='none'" style="background:transparent;color:#94a3b8;border:1px solid #334155;padding:6px 12px;border-radius:6px;font-size:11px;cursor:pointer;">Dismiss</button>
      </div>
    </div>
  `;
  el.style.display = 'flex';
}

function _hideSyncError() {
  const el = document.getElementById('rrt-sync-error-banner');
  if (el) el.style.display = 'none';
}

function _updateSyncBadge(status) {
  /* Update the "Live" dot in the header if it exists */
  const dot  = document.querySelector('.system-status-dot');
  const lbl  = document.querySelector('.system-status-label');
  if (!dot || !lbl) return;
  if (status === 'ok') {
    dot.style.background = '#10b981';
    lbl.textContent = 'Live';
  } else if (status === 'syncing') {
    dot.style.background = '#f59e0b';
    lbl.textContent = 'Syncing…';
  } else {
    dot.style.background = '#ef4444';
    lbl.textContent = 'Offline';
  }
}

/* ────────────────────────────────────────────────────
   BOOTSTRAP — Load all data on page start
   ──────────────────────────────────────────────────── */

async function _bootstrap() {
  // Stale-While-Revalidate: inspect cache for existing live GAS dataset
  const cachedProducts  = _loadCache('products',  24 * 60 * 60 * 1000);
  const cachedSuppliers = _loadCache('suppliers', 24 * 60 * 60 * 1000);
  const cachedStock     = _loadCache('stock',     24 * 60 * 60 * 1000);
  const cachedPurchases = _loadCache('purchases', 24 * 60 * 60 * 1000);
  const cachedSales     = _loadCache('sales',     24 * 60 * 60 * 1000);
  const cachedExpenses  = _loadCache('expenses',  24 * 60 * 60 * 1000);
  const cachedWastage   = _loadCache('wastage',   24 * 60 * 60 * 1000);

  const hasCache = Array.isArray(cachedProducts) && cachedProducts.length > 0;

  if (hasCache) {
    // Instant 0ms paint from cached live dataset
    _hydrateAll({
      products:  cachedProducts,
      suppliers: cachedSuppliers || [],
      stock:     cachedStock || [],
      purchases: cachedPurchases || [],
      sales:     cachedSales || [],
      expenses:  cachedExpenses || [],
      wastage:   cachedWastage || [],
    });
    _syncState.loading = false;
    _updateSyncBadge('syncing');
    _triggerRender();

    // Revalidate live data from Google Sheets in the background silently
    _refreshFromGAS(true).catch(err => {
      console.warn('[RT] Silent background sync encounter:', err.message);
    });
  } else {
    // Cold start with no prior cache: render loader overlay and fetch
    _syncState.loading = true;
    _showLoadingOverlay();
    _setProgress(5, 'Initializing platform workspace…');
    try {
      await _refreshFromGAS(false);
    } catch (err) {
      _syncState.error = err.message;
      _syncState.loading = false;
      _hideLoadingOverlay();
      _updateSyncBadge('offline');
      _showSyncError(`Cannot reach Google Sheets. Check your internet connection or Apps Script deployment.\n\n${err.message}`);
      _triggerRender();
    }
  }
}

async function _refreshFromGAS(silent = false) {
  if (_syncState.syncing) return;
  _syncState.syncing = true;
  _updateSyncBadge('syncing');

  try {
    if (!silent) _setProgress(15, 'Establishing secure Google Apps Script handshake…');

    let completed = 0;
    const totalCalls = 8;
    const wrap = (promise, name) => promise.then(val => {
      completed++;
      if (!silent) {
        const pct = 15 + Math.round((completed / totalCalls) * 75);
        _setProgress(pct, `Reconciling ${name} (${completed}/${totalCalls})…`);
      }
      return val;
    });

    // Parallel fetch of all entities with individual fault-tolerance & progress tracking
    const [
      pingRes,
      prodRes,
      supRes,
      stockRes,
      purRes,
      salesRes,
      expRes,
      wasRes
    ] = await Promise.allSettled([
      wrap(_gasGet('ping'), 'system status'),
      wrap(_gasGet('getProducts'), 'catalog'),
      wrap(_gasGet('getSuppliers'), 'suppliers'),
      wrap(_gasGet('getStock'), 'live stock'),
      wrap(_gasGet('getPurchases'), 'purchase lots'),
      wrap(_gasGet('getSales', { filter: 'all' }), 'sales ledger'),
      wrap(_gasGet('getExpenses', { filter: 'all' }), 'expenses'),
      wrap(_gasGet('getWastage', { filter: 'all' }), 'spoilage records'),
    ]);

    // Check critical entity: products. If completely unfulfilled and cold, abort.
    if (prodRes.status === 'rejected' && PRODUCTS.length === 0) {
      throw new Error(`Failed to load product catalog: ${prodRes.reason?.message || 'Network error'}`);
    }

    if (pingRes.status === 'fulfilled' && pingRes.value) {
      const pingInfo = pingRes.value;
      if (pingInfo.business || pingInfo.store) BUSINESS.name = pingInfo.business || pingInfo.store;
      if (pingInfo.owner)    BUSINESS.owner = pingInfo.owner;
      if (pingInfo.location) BUSINESS.location = pingInfo.location;
      if (pingInfo.currency) BUSINESS.currency = pingInfo.currency;
      if (pingInfo.version)  BUSINESS.version = pingInfo.version;
      if (pingInfo.settings) {
        if (pingInfo.settings['Business Name']) BUSINESS.name = pingInfo.settings['Business Name'];
        if (pingInfo.settings['Owner']) BUSINESS.owner = pingInfo.settings['Owner'];
        if (pingInfo.settings['Location']) BUSINESS.location = pingInfo.settings['Location'];
        if (pingInfo.settings['Currency']) BUSINESS.currency = pingInfo.settings['Currency'];
      }
    }

    if (!silent) _setProgress(94, 'Computing live inventory valuations & margins…');

    const products  = prodRes.status === 'fulfilled'  ? prodRes.value  : PRODUCTS;
    const suppliers = supRes.status === 'fulfilled'   ? supRes.value   : SUPPLIERS;
    const stock     = stockRes.status === 'fulfilled' ? stockRes.value : STOCK;
    const purchases = purRes.status === 'fulfilled'   ? purRes.value   : PURCHASES;
    const sales     = salesRes.status === 'fulfilled' ? salesRes.value : SALES;
    const expenses  = expRes.status === 'fulfilled'   ? expRes.value   : EXPENSES;
    const wastage   = wasRes.status === 'fulfilled'   ? wasRes.value   : WASTAGE;

    _hydrateAll({ products, suppliers, stock, purchases, sales, expenses, wastage });

    /* Save to live cache */
    if (prodRes.status === 'fulfilled')  _saveCache('products',  products);
    if (supRes.status === 'fulfilled')   _saveCache('suppliers', suppliers);
    if (stockRes.status === 'fulfilled') _saveCache('stock',     stock);
    if (purRes.status === 'fulfilled')   _saveCache('purchases', purchases);
    if (salesRes.status === 'fulfilled') _saveCache('sales',     sales);
    if (expRes.status === 'fulfilled')   _saveCache('expenses',  expenses);
    if (wasRes.status === 'fulfilled')   _saveCache('wastage',   wastage);

    _syncState.error      = null;
    _syncState.lastSynced = new Date();
    _hideSyncError();
    _updateSyncBadge('ok');

    if (!silent) {
      _setProgress(100, 'Platform synchronized. Launching…');
      setTimeout(() => {
        _syncState.loading = false;
        _hideLoadingOverlay();
      }, 350);
    }
    _triggerRender();
  } catch (err) {
    _syncState.syncing = false;
    if (!silent) throw err;
    _syncState.error = err.message;
    _updateSyncBadge('offline');
    _showSyncError(`Background sync encountered an issue. Displaying cached data.\n\n${err.message}`);
  } finally {
    _syncState.syncing = false;
  }
}

function _hydrateAll({ products, suppliers, stock, purchases, sales, expenses, wastage }) {
  /* Replace array contents in-place to preserve references held by app.js */
  PRODUCTS.length   = 0; PRODUCTS.push(...(products  || []));
  SUPPLIERS.length  = 0; SUPPLIERS.push(...(suppliers || []));
  STOCK.length      = 0; STOCK.push(...(stock        || []));
  PURCHASES.length  = 0; PURCHASES.push(...(purchases || []));
  SALES.length      = 0; SALES.push(...(sales        || []));
  EXPENSES.length   = 0; EXPENSES.push(...(expenses   || []));
  WASTAGE.length    = 0; WASTAGE.push(...(wastage     || []));

  /* Normalise PRODUCTS: GAS returns productId/productName or id/name */
  PRODUCTS.forEach(p => {
    p.id           = p.id || p.productId;
    p.name         = p.name || p.productName;
    p.currentStock = p.currentStock !== undefined ? Number(p.currentStock) : 0;
    p.avgCost      = Number(p.avgCost !== undefined ? p.avgCost : (p.averageCost || 0));
    p.reorderLevel = Number(p.reorderLevel || 0);
    p.unit         = p.unit || 'KG';
  });

  /* Normalise STOCK sheet items for stock page */
  STOCK.forEach(s => {
    s.id           = s.id || s.productId;
    s.name         = s.name || s.productName;
    s.productId    = s.productId || s.id;
    s.productName  = s.productName || s.name;
    s.currentStock = Number(s.currentStock || 0);
    s.avgCost      = Number(s.avgCost !== undefined ? s.avgCost : (s.averageCost || 0));
    s.stockValue   = Number(s.stockValue !== undefined ? s.stockValue : (s.currentStock * s.avgCost) || 0);
    s.reorderLevel = Number(s.reorderLevel || 0);
    s.status       = s.status || getStockStatus({ currentStock: s.currentStock, reorderLevel: s.reorderLevel });
  });

  /* Sync currentStock from STOCK sheet back into PRODUCTS for UI compat */
  const stockByProductId = {};
  STOCK.forEach(s => { stockByProductId[s.productId] = s; });
  PRODUCTS.forEach(p => {
    const s = stockByProductId[p.id];
    if (s) {
      p.currentStock = s.currentStock;
      p.avgCost      = s.avgCost || p.avgCost;
      p.unit         = s.unit || p.unit;
    }
  });

  /* Normalise SUPPLIERS */
  SUPPLIERS.forEach(s => {
    s.id             = s.id || s.supplierId;
    s.name           = s.name || s.supplierName;
    s.category       = s.category || s.supplyCategory || '—';
    s.supplyCategory = s.supplyCategory || s.category;
    s.status         = (s.status || 'active').toLowerCase();
    s.totalPurchases = Number(s.totalPurchases || 0);
    s.outstanding    = Number(s.outstanding || 0);
  });

  /* Normalise SALES */
  SALES.forEach(s => {
    s.id          = s.id || s.invoiceId;
    s.productId   = s.productId || s.product_id;
    s.productName = s.productName || s.product_name;
    s.quantity    = Number(s.quantity  || s.soldQty || 0);
    s.rate        = Number(s.rate      || s.sellingRate || 0);
    s.revenue     = Number(s.revenue   || s.quantity * s.rate || 0);
    s.cogs        = Number(s.cogs      || 0);
    s.grossProfit = Number(s.grossProfit !== undefined ? s.grossProfit : (s.revenue - s.cogs) || 0);
    s.targetRate  = Number(s.targetRate  || 0);
    s.payment     = s.payment || s.paymentMode || 'Cash';
    s.status      = 'paid';
  });

  /* Normalise PURCHASES */
  PURCHASES.forEach(p => {
    p.id           = p.id || p.lotId;
    p.productId    = p.productId || p.product_id;
    p.productName  = p.productName || p.product_name;
    p.supplierId   = p.supplierId || p.supplier_id;
    p.supplierName = p.supplierName || p.supplier_name;
    p.date         = p.date || p.purchaseDate || '';
    p.quantity     = Number(p.quantity !== undefined ? p.quantity : (p.totalQty !== undefined ? p.totalQty : (p.quantityKg || 0)));
    p.totalCost    = Number(p.totalCost !== undefined ? p.totalCost : (p.totalAmount || 0));
    p.rate         = Number(p.rate !== undefined ? p.rate : (p.unitCost !== undefined ? p.unitCost : (p.purchaseRate || 0)));
    p.targetRate   = Number(p.targetRate  || 0);
    p.remainingQty = Number(p.remainingQty !== undefined ? p.remainingQty : p.quantity);
    p.amountPaid   = Number(p.amountPaid !== undefined ? p.amountPaid : (p.totalCost || 0));
    p.payment      = p.payment || p.paymentMode || 'Bank';
    p.status       = 'paid';
  });

  /* Pre-aggregate actual purchase volume, spend & lot count per supplier.
     STRICT supplierId matching only — no name-based fallback.
     Name matching causes cross-contamination when multiple supplier records
     share the same name (e.g. "Ramesh" for White Onion vs Red Onion). */
  SUPPLIERS.forEach(s => {
    const sLots = PURCHASES.filter(p =>
      p.supplierId && String(p.supplierId) === String(s.id)
    );
    s.totalPurchases = sLots.reduce((sum, p) => sum + (p.totalCost || 0), 0);
    s.totalVolume    = sLots.reduce((sum, p) => sum + (p.quantity || 0), 0);
    s.lotsCount      = sLots.length;
  });

  /* Normalise EXPENSES */
  EXPENSES.forEach(e => {
    e.id     = e.id || e.expenseId;
    e.amount = Number(e.amount || 0);
    e.paidBy = e.paidBy || e.paymentMode || 'Cash';
  });

  /* Normalise WASTAGE */
  WASTAGE.forEach(w => {
    w.id         = w.id || w.wastageId;
    w.quantity   = Number(w.quantity   || 0);
    w.unitCost   = Number(w.unitCost   || 0);
    w.lossAmount = Number(w.lossAmount || w.quantity * w.unitCost || 0);
  });

  _syncDomSettings();
}

function _syncDomSettings() {
  const sideBrand = document.querySelector('.sidebar-brand-name');
  if (sideBrand && BUSINESS.name) sideBrand.textContent = BUSINESS.name;
  const sideSub = document.querySelector('.sidebar-brand-sub');
  if (sideSub && BUSINESS.location) sideSub.textContent = BUSINESS.location;
  const sideUser = document.getElementById('sidebar-user-name');
  if (sideUser && BUSINESS.owner) sideUser.textContent = BUSINESS.owner;
  const sideAvatar = document.getElementById('sidebar-user-avatar');
  if (sideAvatar && BUSINESS.owner) {
    const initials = BUSINESS.owner.split(' ').map(w => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();
    sideAvatar.textContent = initials || 'RT';
  }
  const setOwner = document.getElementById('settings-owner');
  if (setOwner && BUSINESS.owner) setOwner.value = BUSINESS.owner;
  const setName = document.getElementById('settings-business-name');
  if (setName && BUSINESS.name) setName.value = BUSINESS.name;
  const setLoc = document.getElementById('settings-location');
  if (setLoc && BUSINESS.location) setLoc.value = BUSINESS.location;
  const setMeta = document.getElementById('settings-business-meta');
  if (setMeta && BUSINESS.location) {
    setMeta.textContent = `${BUSINESS.location} · Connected to Google Sheets REST API v${BUSINESS.version || '2.0'}`;
  }
}

function _triggerRender() {
  /* Re-render whatever page the router currently has active */
  if (window.STATE && window.renderPage) {
    renderPage(STATE.page || 'dashboard');
  }
  document.dispatchEvent(new CustomEvent('rt:ready'));
  document.dispatchEvent(new CustomEvent('rt:refreshed'));
  if (window.lucide) lucide.createIcons();
}

/* ────────────────────────────────────────────────────
   LOOKUP HELPERS
   ──────────────────────────────────────────────────── */

function getProductById(id) {
  return PRODUCTS.find(p => p.id === id || p.id === String(id) || String(p.id) === String(id));
}

function getSupplierById(id) {
  return SUPPLIERS.find(s => s.id === id || String(s.id) === String(id));
}

function getLotById(id) {
  if (!id) return null;
  const sid = String(id).trim();
  return PURCHASES.find(p => p.id === id || String(p.id).trim() === sid || (p.lotId && String(p.lotId).trim() === sid)) || null;
}

function getActiveLots(productId) {
  const pid = String(productId);
  return PURCHASES
    .filter(p => String(p.productId) === pid && (p.remainingQty === undefined || p.remainingQty > 0))
    .sort((a, b) => b.date.localeCompare(a.date));
}

function getStockStatus(product) {
  if (!product || product.currentStock <= 0) return 'out';
  if (product.currentStock <= product.reorderLevel) return 'low';
  return 'healthy';
}

function getStockValue() {
  /* Prefer STOCK sheet totals; fall back to PRODUCTS */
  if (STOCK.length > 0) {
    return STOCK.reduce((sum, s) => sum + (s.stockValue || s.currentStock * s.avgCost), 0);
  }
  return PRODUCTS.reduce((sum, p) => sum + p.currentStock * p.avgCost, 0);
}

/* ────────────────────────────────────────────────────
   DATE HELPERS — dynamic (no hardcoded dates)
   ──────────────────────────────────────────────────── */

function _formatLocalDate(dateObj) {
  const y = dateObj.getFullYear();
  const m = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function d(daysAgo) {
  const dt = new Date();
  dt.setDate(dt.getDate() - daysAgo);
  return _formatLocalDate(dt);
}

function todayStr() {
  return _formatLocalDate(new Date());
}

function fmtDate(iso) {
  if (!iso || typeof iso !== 'string' || !iso.includes('-')) return '—';
  const parts = iso.split('-');
  if (parts.length < 3) return iso;
  const [y, m, day] = parts;
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${parseInt(day, 10)} ${months[parseInt(m, 10) - 1] || m} ${y}`;
}

/* ────────────────────────────────────────────────────
   COMPUTED METRICS
   ──────────────────────────────────────────────────── */

function saleAmount(s) {
  return s.revenue || (s.quantity * s.rate) || 0;
}

function saleCost(s) {
  if (s.cogs !== undefined && s.cogs > 0) return s.cogs;
  if (s.lotId) {
    const lot = getLotById(s.lotId);
    if (lot && lot.rate) return s.quantity * lot.rate;
  }
  const p = getProductById(s.productId);
  return p ? s.quantity * p.avgCost : 0;
}

function saleProfit(s) {
  return s.grossProfit !== undefined ? s.grossProfit : saleAmount(s) - saleCost(s);
}

function purchaseTotal(p) {
  return p.totalCost || (p.quantity * p.rate) || 0;
}

function purchaseDue(p) { return 0; /* Zero-Credit Policy */ }

/* ────────────────────────────────────────────────────
   PERIOD FILTERS — uses live SALES/EXPENSES/etc.
   ──────────────────────────────────────────────────── */

function _periodCutoff(period) {
  const today = todayStr();
  if (period === 'today') return { from: today, to: today };
  if (period === '7d')    return { from: d(6),  to: today };
  if (period === '30d')   return { from: d(29), to: today };
  return null;
}

function filterSalesByPeriod(period, customFrom, customTo) {
  if (typeof period === 'object' && period !== null) {
    customFrom = period.from;
    customTo   = period.to;
    period     = 'custom';
  }
  if ((period === 'custom' || period === 'range') && customFrom && customTo) {
    return SALES.filter(s => s.date >= customFrom && s.date <= customTo);
  }
  if (period === 'single' && customFrom) {
    return SALES.filter(s => s.date === customFrom);
  }
  const c = _periodCutoff(period);
  if (!c) return [...SALES];
  return SALES.filter(s => s.date >= c.from && s.date <= c.to);
}

function filterPurchasesByPeriod(period, customFrom, customTo) {
  if (typeof period === 'object' && period !== null) {
    customFrom = period.from; customTo = period.to; period = 'custom';
  }
  if ((period === 'custom' || period === 'range') && customFrom && customTo) {
    return PURCHASES.filter(p => p.date >= customFrom && p.date <= customTo);
  }
  if (period === 'single' && customFrom) return PURCHASES.filter(p => p.date === customFrom);
  const c = _periodCutoff(period);
  if (!c) return [...PURCHASES];
  return PURCHASES.filter(p => p.date >= c.from && p.date <= c.to);
}

function filterExpensesByPeriod(period, customFrom, customTo) {
  if (typeof period === 'object' && period !== null) {
    customFrom = period.from; customTo = period.to; period = 'custom';
  }
  if ((period === 'custom' || period === 'range') && customFrom && customTo) {
    return EXPENSES.filter(e => e.date >= customFrom && e.date <= customTo);
  }
  if (period === 'single' && customFrom) return EXPENSES.filter(e => e.date === customFrom);
  const c = _periodCutoff(period);
  if (!c) return [...EXPENSES];
  return EXPENSES.filter(e => e.date >= c.from && e.date <= c.to);
}

function filterWastageByPeriod(period, customFrom, customTo) {
  if (period === 'all') return [...WASTAGE];
  if ((period === 'custom' || period === 'range') && customFrom && customTo) {
    return WASTAGE.filter(w => w.date >= customFrom && w.date <= customTo);
  }
  if (period === 'single' && customFrom) return WASTAGE.filter(w => w.date === customFrom);
  const c = _periodCutoff(period);
  if (!c) return [...WASTAGE];
  return WASTAGE.filter(w => w.date >= c.from && w.date <= c.to);
}

/* ────────────────────────────────────────────────────
   ANALYTICS ENGINES
   ──────────────────────────────────────────────────── */

function getWastageStats(period, customFrom, customTo) {
  const list = filterWastageByPeriod(period, customFrom, customTo);
  const totalWeight = list.reduce((s, w) => s + w.quantity, 0);
  const totalLoss   = list.reduce((s, w) => s + w.lossAmount, 0);
  const byReason    = {};
  list.forEach(w => { byReason[w.reason] = (byReason[w.reason] || 0) + w.lossAmount; });
  return { list, totalWeight, totalLoss, count: list.length, byReason };
}

function getBuyerRevenueSummary(period, customFrom, customTo) {
  const sales = filterSalesByPeriod(period, customFrom, customTo);
  const map   = {};
  sales.forEach(s => {
    const name   = s.buyer || 'Walk-in';
    const tier   = s.customerType || 'Walk-in';
    const amt    = saleAmount(s);
    const profit = saleProfit(s);
    if (!map[name]) {
      map[name] = { name, customerType: tier, totalQty: 0, totalRevenue: 0, totalProfit: 0, orderCount: 0 };
    }
    map[name].totalQty     += s.quantity;
    map[name].totalRevenue += amt;
    map[name].totalProfit  += profit;
    map[name].orderCount   += 1;
  });
  return Object.values(map).sort((a, b) => b.totalRevenue - a.totalRevenue);
}

function getProductVelocity() {
  const todaySales = filterSalesByPeriod('today');
  const weekSales  = filterSalesByPeriod('7d');

  /* Use STOCK sheet if available, otherwise PRODUCTS */
  const items = STOCK.length > 0 ? STOCK : PRODUCTS.map(p => ({
    productId: p.id, productName: p.name, currentStock: p.currentStock,
    unit: p.unit, reorderLevel: p.reorderLevel, status: getStockStatus(p),
  }));

  return items.map(item => {
    const pid = item.productId;
    const soldToday = todaySales
      .filter(s => String(s.productId) === String(pid))
      .reduce((sum, s) => sum + s.quantity, 0);
    const sold7Days = weekSales
      .filter(s => String(s.productId) === String(pid))
      .reduce((sum, s) => sum + s.quantity, 0);

    const runRate    = sold7Days / 7;
    const daysOfStock = runRate > 0 ? (item.currentStock / runRate).toFixed(1) : '99+';

    let velocityStatus = 'healthy';
    if (item.currentStock <= 0)               velocityStatus = 'out';
    else if (item.currentStock <= item.reorderLevel) velocityStatus = 'low';
    else if (soldToday > runRate * 1.4)       velocityStatus = 'fast-moving';

    return {
      product: getProductById(pid) || { id: pid, name: item.productName, unit: item.unit },
      productName: item.productName,
      currentStock: item.currentStock,
      unit: item.unit,
      soldToday, sold7Days,
      runRate: runRate.toFixed(1),
      daysOfStock,
      velocityStatus,
    };
  });
}

function computeKPIs(period, customFrom, customTo) {
  const sales         = filterSalesByPeriod(period, customFrom, customTo);
  const purchases     = filterPurchasesByPeriod(period, customFrom, customTo);
  const expenses      = filterExpensesByPeriod(period, customFrom, customTo);
  const wastageStats  = getWastageStats(period, customFrom, customTo);

  const revenue       = sales.reduce((s, x) => s + saleAmount(x), 0);
  const cogs          = sales.reduce((s, x) => s + saleCost(x), 0);
  const grossProfit   = revenue - cogs;
  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);
  const totalWastageLoss   = wastageStats.totalLoss;
  const totalWastageWeight = wastageStats.totalWeight;
  const netProfit     = grossProfit - totalExpenses - totalWastageLoss;
  const totalPurchases = purchases.reduce((s, p) => s + purchaseTotal(p), 0);
  const stockValue    = getStockValue();
  const realizedMargin = revenue > 0 ? ((grossProfit / revenue) * 100).toFixed(1) : '0.0';

  return {
    revenue, cogs, grossProfit, netProfit, totalPurchases,
    stockValue, totalExpenses, totalWastageLoss, totalWastageWeight, realizedMargin,
  };
}

function getPnLByProduct(period, customFrom, customTo) {
  const sales  = filterSalesByPeriod(period, customFrom, customTo);
  const byProd = {};

  PRODUCTS.forEach(p => {
    byProd[p.id] = { product: p, qty: 0, revenue: 0, cogs: 0, profit: 0, txnCount: 0 };
  });

  sales.forEach(s => {
    const pid = s.productId;
    if (!byProd[pid]) {
      const p = getProductById(pid);
      byProd[pid] = { product: p || { name: s.productName || pid }, qty: 0, revenue: 0, cogs: 0, profit: 0, txnCount: 0 };
    }
    const amt  = saleAmount(s);
    const cost = saleCost(s);
    byProd[pid].qty      += s.quantity;
    byProd[pid].revenue  += amt;
    byProd[pid].cogs     += cost;
    byProd[pid].profit   += saleProfit(s);
    byProd[pid].txnCount += 1;
  });

  return Object.values(byProd).map(item => ({
    ...item,
    marginPct: item.revenue > 0 ? ((item.profit / item.revenue) * 100).toFixed(1) : '0.0',
  })).sort((a, b) => b.profit - a.profit);
}

function getPnLBySeller(period, customFrom, customTo) {
  const sales    = filterSalesByPeriod(period, customFrom, customTo);
  const bySeller = {};

  SUPPLIERS.forEach(sup => {
    bySeller[sup.id] = { supplier: sup, lotsCount: 0, qtySold: 0, revenue: 0, cogs: 0, profit: 0, txnCount: 0 };
  });

  PURCHASES.forEach(p => {
    if (bySeller[p.supplierId]) bySeller[p.supplierId].lotsCount += 1;
  });

  sales.forEach(s => {
    const supId = s.supplierId;
    if (!bySeller[supId]) {
      const sup = getSupplierById(supId) || { id: supId, name: s.supplierName || 'Unknown' };
      bySeller[supId] = { supplier: sup, lotsCount: 0, qtySold: 0, revenue: 0, cogs: 0, profit: 0, txnCount: 0 };
    }
    bySeller[supId].qtySold  += s.quantity;
    bySeller[supId].revenue  += saleAmount(s);
    bySeller[supId].cogs     += saleCost(s);
    bySeller[supId].profit   += saleProfit(s);
    bySeller[supId].txnCount += 1;
  });

  return Object.values(bySeller).map(item => ({
    ...item,
    roiPct: item.cogs > 0 ? ((item.profit / item.cogs) * 100).toFixed(1) : '0.0',
  })).sort((a, b) => b.profit - a.profit);
}

function getCustomerTypeStats(period, customFrom, customTo) {
  const sales    = filterSalesByPeriod(period, customFrom, customTo);
  const segments = {
    'Walk-in':    { type: 'Walk-in',    label: 'Walk-in (Retail)',       revenue: 0, qty: 0, count: 0, products: {} },
    'Shopkeeper': { type: 'Shopkeeper', label: 'Shopkeeper (Reseller)',   revenue: 0, qty: 0, count: 0, products: {} },
    'Hotel':      { type: 'Hotel',      label: 'Hotel (Commercial)',      revenue: 0, qty: 0, count: 0, products: {} },
  };
  sales.forEach(s => {
    const type = s.customerType || 'Walk-in';
    const seg  = segments[type] || segments['Walk-in'];
    const amt  = saleAmount(s);
    seg.revenue += amt;
    seg.qty     += s.quantity;
    seg.count   += 1;
    const p = getProductById(s.productId);
    const prodName = p ? p.name : (s.productName || 'Other');
    seg.products[prodName] = (seg.products[prodName] || 0) + s.quantity;
  });
  return segments;
}

function getRevenueTrend() { return getDailyTrend('7d'); }

function getDailyTrend(period, customFrom, customTo) {
  let dateList = [];

  if ((period === 'custom' || period === 'range') && customFrom && customTo) {
    let curr = new Date(customFrom + 'T00:00:00');
    const end = new Date(customTo + 'T00:00:00');
    while (curr <= end && dateList.length < 90) {
      dateList.push(curr.toISOString().slice(0, 10));
      curr.setDate(curr.getDate() + 1);
    }
  } else if (period === 'single' && customFrom) {
    dateList = [customFrom];
  } else {
    const nDays = { today: 1, '7d': 7, '30d': 30 }[period] || 7;
    for (let i = nDays - 1; i >= 0; i--) dateList.push(d(i));
  }

  /* Single-day: spread across intraday intervals using ratio of actual total */
  if (dateList.length === 1) {
    const singleDate = dateList[0];
    const labels     = ['9 AM', '11 AM', '1 PM', '3 PM', '5 PM', '7 PM', '9 PM'];
    const daySales   = SALES.filter(s => s.date === singleDate);
    const dayExp     = EXPENSES.filter(e => e.date === singleDate);
    const totRev     = daySales.reduce((s, x) => s + saleAmount(x), 0);
    const totCogs    = daySales.reduce((s, x) => s + saleCost(x), 0);
    const totExp     = dayExp.reduce((s, e) => s + e.amount, 0);
    const totProfit  = totRev - totCogs - totExp;

    if (totRev === 0) {
      return { labels, revenue: [0,0,0,0,0,0,0], profit: [0,0,Math.round(-totExp),0,0,0,0] };
    }
    const w = [0.18, 0.20, 0.05, 0.23, 0.04, 0.30, 0.00];
    const revArr = w.map(x => Math.round(totRev * x));
    const diff = totRev - revArr.reduce((s, v) => s + v, 0);
    revArr[5] += diff;
    return { labels, revenue: revArr, profit: w.map(x => Math.round(totProfit * x)) };
  }

  const labels  = [];
  const revenue = [];
  const profit  = [];
  const days    = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

  dateList.forEach(dateStr => {
    const dt = new Date(dateStr + 'T00:00:00');
    labels.push(dateList.length <= 7 ? days[dt.getDay()] : dateStr.slice(5));
    const daySales = SALES.filter(s => s.date === dateStr);
    const dayExp   = EXPENSES.filter(e => e.date === dateStr);
    const rev  = daySales.reduce((s, x) => s + saleAmount(x), 0);
    const cogs = daySales.reduce((s, x) => s + saleCost(x), 0);
    const exp  = dayExp.reduce((s, e) => s + e.amount, 0);
    revenue.push(Math.round(rev));
    profit.push(Math.round(rev - cogs - exp));
  });

  return { labels, revenue, profit };
}

function getDailyPurchaseTrend(period) {
  const nDays = { today: 1, '7d': 7, '30d': 30 }[period] || 7;
  const labels = [];
  const values = [];
  const days   = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  for (let i = nDays - 1; i >= 0; i--) {
    const dateStr = d(i);
    const dt = new Date(dateStr + 'T00:00:00');
    labels.push(nDays <= 7 ? days[dt.getDay()] : dateStr.slice(5));
    values.push(Math.round(
      PURCHASES.filter(p => p.date === dateStr).reduce((s, p) => s + purchaseTotal(p), 0)
    ));
  }
  return { labels, values };
}

function getSalesByProduct(period, customFrom, customTo) {
  const sales = filterSalesByPeriod(period, customFrom, customTo);
  const map   = {};
  sales.forEach(s => {
    const p = getProductById(s.productId);
    const name = p ? p.name : (s.productName || s.productId);
    map[name] = (map[name] || 0) + saleAmount(s);
  });
  const entries = Object.entries(map).sort((a, b) => b[1] - a[1]);
  return { labels: entries.map(e => e[0]), values: entries.map(e => Math.round(e[1])) };
}

function getPaymentDistribution(period, customFrom, customTo) {
  const sales = filterSalesByPeriod(period, customFrom, customTo);
  const map   = { Cash: 0, UPI: 0, Bank: 0 };
  sales.forEach(s => {
    const p = s.payment || 'Cash';
    map[p] = (map[p] || 0) + saleAmount(s);
  });
  return map;
}

function getPaymentBreakdown(period, customFrom, customTo) {
  const map     = getPaymentDistribution(period, customFrom, customTo);
  const entries = Object.entries(map).sort((a, b) => b[1] - a[1]);
  return { labels: entries.map(e => e[0]), values: entries.map(e => Math.round(e[1])) };
}

function getStockItems() {
  if (STOCK.length > 0) return STOCK.map(s => ({ ...s, status: getStockStatus(s) }));
  return PRODUCTS.map(p => ({
    ...p,
    productId:   p.id,
    productName: p.name,
    stockValue:  p.currentStock * p.avgCost,
    status:      getStockStatus(p),
  }));
}

function getOutstandingCredit() { return []; }

function getRecentTransactions(n = 10, period, customFrom, customTo) {
  let list = period && period !== 'all'
    ? filterSalesByPeriod(period, customFrom, customTo)
    : SALES;
  return [...list].sort((a, b) => b.date.localeCompare(a.date)).slice(0, n);
}

function getPurchaseDues() { return []; }

/* ────────────────────────────────────────────────────
   WRITE OPERATIONS — POST to GAS, then refresh cache
   ──────────────────────────────────────────────────── */

async function recordWastage(entry) {
  const result = await _gasPost('createWastage', {
    productId: entry.productId,
    lotId:     entry.lotId || '',
    quantity:  entry.quantity,
    reason:    entry.reason || 'Rot / Spoilage',
    notes:     entry.notes  || '',
    date:      entry.date   || todayStr(),
  });
  /* Invalidate and refresh */
  _clearCache();
  await _refreshFromGAS(true);
  return result;
}

/* ────────────────────────────────────────────────────
   FORMAT HELPERS
   ──────────────────────────────────────────────────── */

function fmt(num, decimals = 0) {
  if (num === undefined || num === null || isNaN(Number(num))) return '₹0';
  return '₹' + Number(num).toLocaleString('en-IN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function fmtNum(num, decimals = 0) {
  if (num === undefined || num === null || isNaN(Number(num))) return '0';
  return Number(num).toLocaleString('en-IN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function fmtK(num) {
  if (num === undefined || num === null || isNaN(Number(num))) return '₹0';
  const n = Number(num);
  if (n >= 100000) return '₹' + (n / 100000).toFixed(1) + 'L';
  if (n >= 1000)   return '₹' + (n / 1000).toFixed(1) + 'K';
  return '₹' + Math.round(n);
}

/* ────────────────────────────────────────────────────
   PUBLIC API — window.RT
   Same contract as before; app.js & charts.js need no changes.
   ──────────────────────────────────────────────────── */

window.RT = {
  /* Data arrays (live, mutable) */
  get BUSINESS()  { return BUSINESS; },
  get PRODUCTS()  { return PRODUCTS; },
  get SUPPLIERS() { return SUPPLIERS; },
  get PURCHASES() { return PURCHASES; },
  get SALES()     { return SALES; },
  get EXPENSES()  { return EXPENSES; },
  get WASTAGE()   { return WASTAGE; },
  get STOCK()     { return STOCK; },
  EXPENSE_CATEGORIES,

  /* Sync state */
  get isLoading() { return _syncState.loading; },
  get syncError() { return _syncState.error; },
  get lastSynced(){ return _syncState.lastSynced; },

  /* Refresh manually (call from Retry button or Settings page) */
  refresh() {
    _clearCache();
    _syncState.loading = true;
    _showLoadingOverlay();
    return _refreshFromGAS(false);
  },

  /* Lookup helpers */
  getProductById, getSupplierById, getLotById, getActiveLots,
  getStockStatus, getStockValue,

  /* Sale computed */
  saleAmount, saleCost, saleProfit,
  purchaseTotal, purchaseDue,

  /* Period filters */
  filterSalesByPeriod, filterPurchasesByPeriod,
  filterExpensesByPeriod, filterWastageByPeriod,

  /* Analytics */
  getWastageStats, recordWastage,
  getBuyerRevenueSummary, getProductVelocity,
  computeKPIs, getPnLByProduct, getPnLBySeller, getCustomerTypeStats,
  getRevenueTrend, getDailyTrend, getDailyPurchaseTrend,
  getSalesByProduct, getPaymentDistribution, getPaymentBreakdown,
  getStockItems, getOutstandingCredit, getRecentTransactions, getPurchaseDues,

  /* Backend API Config */
  API_BASE_URL,

  /* GAS write wrappers */
  gasPost: _gasPost,
  gasGet:  _gasGet,

  /* Formatters */
  fmt, fmtNum, fmtK, fmtDate,

  /* Date helpers */
  d, todayStr,
};

/* ────────────────────────────────────────────────────
   BOOT — run after DOM ready
   ──────────────────────────────────────────────────── */
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', _bootstrap);
} else {
  _bootstrap();
}
