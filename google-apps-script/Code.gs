/**
 * ==============================================================================
 * RAJARAJESHWARI TRADERS — GOOGLE SHEETS DATABASE BACKEND
 * Google Apps Script (Code.gs) v3.0
 *
 * Schema: Lot-Based Inventory Tracking, Zero-Credit Policy,
 *         Customer Segmentation (Walk-in / Shopkeeper / Hotel),
 *         Wastage & Spoilage Ledger, Multi-Dimensional P&L Engine.
 *
 * Products: White Onion, Red Onion, Garlic, Ginger, Potato (5 fixed items)
 *
 * v3.0 Changes:
 *   - getAllData(): consolidated single-call endpoint (replaces 8 parallel calls)
 *   - GAS CacheService: 5-minute server-side cache on getAllData
 *   - _invalidateDataCache(): called by all write functions to keep cache fresh
 *   - Private _parseXxx() helpers decouple row parsing from sheet fetching
 *
 * SETUP:
 * 1. Open Google Sheet → Extensions → Apps Script
 * 2. Paste this entire script into Code.gs
 * 3. Run initWorkbookSheets() once (authorize when prompted)
 * 4. Deploy → New Deployment → Web App → Execute as: Me → Access: Anyone
 * 5. Copy the Web App URL into your web application
 * ==============================================================================
 */

'use strict';

/* ══════════════════════════════════════════════════
   SHEET NAME CONSTANTS
   ══════════════════════════════════════════════════ */

const SHEET_NAMES = {
  PRODUCTS:  'PRODUCTS',
  STOCK:     'STOCK',
  SUPPLIERS: 'SUPPLIERS',
  PURCHASES: 'PURCHASES',
  SALES:     'SALES',
  WASTAGE:   'WASTAGE',
  EXPENSES:  'EXPENSES',
  SETTINGS:  'SETTINGS'
};

/* GAS CacheService key for consolidated getAllData bundle */
const GAS_CACHE_KEY  = 'rrt_all_data_v3';
const GAS_CACHE_TTL  = 300; // 5 minutes in seconds

/* ══════════════════════════════════════════════════
   HTTP REQUEST HANDLERS
   ══════════════════════════════════════════════════ */

function doGet(e) {
  try {
    const action = (e.parameter.action || 'ping').trim();
    let result = null;

    switch (action) {
      case 'ping':
        result = {
          status: 'ok',
          time: new Date().toISOString(),
          store: 'RajaRajeshwari Traders',
          owner: 'Budime Aravind',
          location: 'Huzurabad, Telangana',
          version: '3.0',
          settings: getSettings()
        };
        break;
      case 'getSettings':
        result = getSettings();
        break;
      case 'getProducts':
        result = getProducts();
        break;
      case 'getSuppliers':
        result = getSuppliers();
        break;
      case 'getStock':
        result = getStock();
        break;
      case 'getPurchases':
        result = getPurchases();
        break;
      case 'getActiveLots':
        result = getActiveLots(e.parameter.productId);
        break;
      case 'getSales':
        result = getSales(e.parameter.filter, e.parameter.from, e.parameter.to);
        break;
      case 'getWastage':
        result = getWastage(e.parameter.filter, e.parameter.from, e.parameter.to);
        break;
      case 'getExpenses':
        result = getExpenses(e.parameter.filter, e.parameter.from, e.parameter.to);
        break;
      /* ── NEW v3.0: Consolidated single-call endpoint ── */
      case 'getAllData':
        result = getAllData();
        break;
      case 'getDashboardData':
        result = getDashboardData(e.parameter.filter || 'today', e.parameter.from, e.parameter.to);
        break;
      case 'getPnLByProduct':
        result = getPnLByProduct(e.parameter.filter, e.parameter.from, e.parameter.to);
        break;
      case 'getPnLBySeller':
        result = getPnLBySeller(e.parameter.filter, e.parameter.from, e.parameter.to);
        break;
      case 'getCustomerTypeStats':
        result = getCustomerTypeStats(e.parameter.filter, e.parameter.from, e.parameter.to);
        break;
      case 'getBuyerRevenueSummary':
        result = getBuyerRevenueSummary(e.parameter.filter, e.parameter.from, e.parameter.to);
        break;
      case 'getProductVelocity':
        result = getProductVelocity();
        break;
      default:
        throw new Error('Unknown GET action: ' + action);
    }

    return ContentService.createTextOutput(JSON.stringify({ success: true, data: result }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000);

    const postData = JSON.parse(e.postData.contents);
    const action = postData.action;
    const payload = postData.payload;
    let result = null;

    switch (action) {
      case 'createPurchase':
        result = createPurchase(payload);
        break;
      case 'createSale':
        result = createSale(payload);
        break;
      case 'createBatchSale':
        result = createBatchSale(payload);
        break;
      case 'createWastage':
        result = createWastage(payload);
        break;
      case 'createExpense':
        result = createExpense(payload);
        break;
      case 'createSupplier':
        result = createSupplier(payload);
        break;
      case 'updateSupplier':
        result = updateSupplier(payload);
        break;
      default:
        throw new Error('Unknown POST action: ' + action);
    }

    return ContentService.createTextOutput(JSON.stringify({ success: true, data: result }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}

/* ══════════════════════════════════════════════════
   UTILITY HELPERS
   ══════════════════════════════════════════════════ */

function getSheet(name) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(name);
  if (!sheet) sheet = ss.insertSheet(name);
  return sheet;
}

function todayStr() {
  return Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');
}

function fmtDate(val) {
  if (!val) return '';
  if (val instanceof Date) {
    return Utilities.formatDate(val, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  }
  return String(val).substring(0, 10);
}

function round2(n) {
  return Math.round(n * 100) / 100;
}

/** Check if a date string falls within a filter period */
function dateInRange(dateStr, filter, from, to) {
  if (!dateStr) return false;
  const today = todayStr();
  if (!filter || filter === 'all') return true;
  if (filter === 'today') return dateStr === today;

  if (filter === '7d') {
    const d = new Date();
    d.setDate(d.getDate() - 6);
    return dateStr >= Utilities.formatDate(d, Session.getScriptTimeZone(), 'yyyy-MM-dd') && dateStr <= today;
  }
  if (filter === '30d') {
    const d = new Date();
    d.setDate(d.getDate() - 29);
    return dateStr >= Utilities.formatDate(d, Session.getScriptTimeZone(), 'yyyy-MM-dd') && dateStr <= today;
  }
  if ((filter === 'custom' || filter === 'range') && from && to) {
    return dateStr >= from && dateStr <= to;
  }
  if (filter === 'single' && from) {
    return dateStr === from;
  }
  return true;
}

/** Generate next sequential ID from existing rows */
function nextId(sheet, prefix, padLen) {
  const rows = sheet.getDataRange().getValues();
  let maxNum = 0;
  const regex = new RegExp(prefix.replace('-', '\\-') + '(\\d+)');
  for (let i = 1; i < rows.length; i++) {
    const id = String(rows[i][0] || '');
    const match = id.match(regex);
    if (match) {
      const n = parseInt(match[1], 10);
      if (n > maxNum) maxNum = n;
    }
  }
  return prefix + String(maxNum + 1).padStart(padLen, '0');
}

/** Find a row in the stock sheet by product ID. Returns { rowIdx (1-based), row (0-indexed data) } or null */
function findStockRow(stockSheet, stockRows, productId) {
  for (let i = 1; i < stockRows.length; i++) {
    if (String(stockRows[i][0]).trim() === productId) {
      return { rowIdx: i + 1, row: stockRows[i] };
    }
  }
  return null;
}

/** Compute stock status string */
function stockStatus(currentStock, threshold) {
  if (currentStock <= 0) return 'OUT OF STOCK';
  if (currentStock <= threshold) return 'LOW STOCK';
  return 'HEALTHY';
}

/* ══════════════════════════════════════════════════
   CACHE MANAGEMENT (GAS CacheService)
   ══════════════════════════════════════════════════ */

/**
 * Invalidate the GAS-side getAllData cache.
 * MUST be called at the end of every write function so the next read
 * fetches fresh data from Google Sheets instead of a stale cached bundle.
 */
function _invalidateDataCache() {
  try {
    CacheService.getScriptCache().remove(GAS_CACHE_KEY);
  } catch (e) {
    // Non-critical — next read will fetch fresh data on TTL expiry anyway
    console.warn('Cache invalidation failed:', e.message);
  }
}

/* ══════════════════════════════════════════════════
   PRIVATE ROW-PARSING HELPERS
   These receive pre-fetched row arrays and return normalised objects.
   Decoupling parsing from sheet access lets getAllData() read once and
   call multiple parsers, while individual getXxx() functions retain their
   existing interface by fetching rows themselves.
   ══════════════════════════════════════════════════ */

function _parseSettings(rows) {
  const settings = {
    'Business Name': 'RajaRajeshwari Traders',
    'Owner': 'Budime Aravind',
    'Location': 'Huzurabad, Telangana',
    'Currency': '₹',
    'Unit': 'KG',
    'Credit Policy': 'ZERO CREDIT — All transactions paid at receipt',
    'Version': '3.0'
  };
  if (rows.length > 1) {
    for (let i = 1; i < rows.length; i++) {
      const k = String(rows[i][0] || '').trim();
      const v = String(rows[i][1] || '').trim();
      if (k) settings[k] = v;
    }
  }
  return settings;
}

function _parseProducts(rows) {
  if (rows.length <= 1) return [];
  const products = [];
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row[0]) continue;
    products.push({
      id: String(row[0]).trim(),
      name: String(row[1]).trim(),
      category: String(row[2]).trim(),
      unit: String(row[3] || 'KG').trim(),
      reorderLevel: Number(row[4] || 0),
      active: String(row[5]).toUpperCase() === 'TRUE' || row[5] === true
    });
  }
  return products;
}

function _parseStock(rows) {
  if (rows.length <= 1) return [];
  const stockList = [];
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row[0]) continue;
    const currentStock = Number(row[9] || 0);
    const avgCost = Number(row[10] || 0);
    const threshold = Number(row[12] || 0);
    stockList.push({
      productId:    String(row[0]).trim(),
      productName:  String(row[1]).trim(),
      category:     String(row[2]).trim(),
      unit:         String(row[3] || 'KG').trim(),
      openingStock: Number(row[4] || 0),
      purchased:    Number(row[5] || 0),
      sold:         Number(row[6] || 0),
      wasted:       Number(row[7] || 0),
      adjusted:     Number(row[8] || 0),
      currentStock: currentStock,
      avgCost:      avgCost,
      stockValue:   Number(row[11] || 0),
      reorderLevel: threshold,
      status:       stockStatus(currentStock, threshold)
    });
  }
  return stockList;
}

/**
 * Parse suppliers — requires both supplier rows AND purchase rows
 * to compute totalPurchases per supplier in a single pass.
 */
function _parseSuppliersRaw(supRows, purRows) {
  if (supRows.length <= 1) return [];

  // Aggregate total purchases per supplier from purchase rows
  const totalsBySupplier = {};
  if (purRows.length > 1) {
    for (let i = 1; i < purRows.length; i++) {
      const supId = String(purRows[i][2] || '').trim();
      if (supId) {
        totalsBySupplier[supId] = (totalsBySupplier[supId] || 0) + Number(purRows[i][7] || 0);
      }
    }
  }

  const suppliers = [];
  for (let i = 1; i < supRows.length; i++) {
    const row = supRows[i];
    if (!row[0]) continue;
    const supId = String(row[0]).trim();
    suppliers.push({
      id:             supId,
      name:           String(row[1]).trim(),
      phone:          String(row[2] || '').trim(),
      location:       String(row[3] || '').trim(),
      category:       String(row[4] || '').trim(),
      status:         String(row[5] || 'Active').toLowerCase() === 'active' ? 'active' : 'inactive',
      totalPurchases: totalsBySupplier[supId] || 0,
      outstanding:    0  // Zero-Credit Policy: always 0
    });
  }
  return suppliers;
}

function _parsePurchases(rows) {
  if (rows.length <= 1) return [];
  const purchases = [];
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row[0]) continue;
    purchases.push({
      id:           String(row[0]).trim(),
      date:         fmtDate(row[1]),
      supplierId:   String(row[2]).trim(),
      supplierName: String(row[3]).trim(),
      productId:    String(row[4]).trim(),
      productName:  String(row[5]).trim(),
      quantity:     Number(row[6] || 0),
      totalCost:    Number(row[7] || 0),
      rate:         Number(row[8] || 0),
      targetRate:   Number(row[9] || 0),
      remainingQty: Number(row[10] || 0),
      payment:      String(row[11] || 'Cash').trim(),
      amountPaid:   Number(row[7] || 0),  // Zero-Credit: paid = totalCost
      status:       'paid'
    });
  }
  return purchases;
}

/** Parse ALL sales rows (no date filter — filtering happens client-side) */
function _parseSalesAll(rows) {
  if (rows.length <= 1) return [];
  const sales = [];
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row[0]) continue;
    sales.push({
      id:           String(row[0]).trim(),
      date:         fmtDate(row[1]),
      productId:    String(row[2]).trim(),
      productName:  String(row[3]).trim(),
      lotId:        String(row[4]).trim(),
      supplierId:   String(row[5]).trim(),
      supplierName: String(row[6]).trim(),
      quantity:     Number(row[7] || 0),
      rate:         Number(row[8] || 0),
      targetRate:   Number(row[9] || 0),
      revenue:      Number(row[10] || 0),
      cogs:         Number(row[11] || 0),
      grossProfit:  Number(row[12] || 0),
      customerType: String(row[13] || 'Walk-in').trim(),
      buyer:        String(row[14] || 'Walk-in').trim(),
      payment:      String(row[15] || 'Cash').trim(),
      status:       'paid'
    });
  }
  return sales;
}

/** Parse ALL expense rows (no date filter) */
function _parseExpensesAll(rows) {
  if (rows.length <= 1) return [];
  const expenses = [];
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row[0]) continue;
    expenses.push({
      id:          String(row[0]).trim(),
      date:        fmtDate(row[1]),
      category:    String(row[2] || '').trim(),
      description: String(row[3] || '').trim(),
      amount:      Number(row[4] || 0),
      paidBy:      String(row[5] || 'Cash').trim(),
      paidTo:      String(row[6] || '').trim()
    });
  }
  return expenses;
}

/** Parse ALL wastage rows (no date filter) */
function _parseWastageAll(rows) {
  if (rows.length <= 1) return [];
  const wastage = [];
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row[0]) continue;
    wastage.push({
      id:          String(row[0]).trim(),
      wastageId:   String(row[0]).trim(),
      date:        fmtDate(row[1]),
      productId:   String(row[2]).trim(),
      productName: String(row[3]).trim(),
      lotId:       String(row[4]).trim(),
      supplierId:  String(row[5]).trim(),
      quantity:    Number(row[6] || 0),
      wastedQty:   Number(row[6] || 0),
      unitCost:    Number(row[7] || 0),
      lossAmount:  Number(row[8] || 0),
      reason:      String(row[9] || '').trim(),
      notes:       String(row[10] || '').trim()
    });
  }
  return wastage;
}

/* ══════════════════════════════════════════════════
   CONSOLIDATED READ ENDPOINT (v3.0 — FAST PATH)
   ══════════════════════════════════════════════════ */

/**
 * getAllData() — returns ALL spreadsheet data in a single GAS execution.
 *
 * Uses CacheService to serve repeat requests in <100ms.
 * Cache is invalidated by _invalidateDataCache() after every write.
 *
 * The frontend (data.js) calls this as the primary GET path.
 * If it fails, data.js falls back to the old 8-call parallel approach.
 */
function getAllData() {
  // Try GAS-side cache first
  try {
    const cache = CacheService.getScriptCache();
    const cached = cache.get(GAS_CACHE_KEY);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (parsed && parsed._ts) {
        parsed._fromCache = true;
        return parsed;
      }
    }
  } catch (cacheErr) {
    // Cache miss or corrupt — fall through to fresh read
    console.warn('getAllData cache read failed:', cacheErr.message);
  }

  // Fresh read: open all sheets, read all data ranges
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  const settingsSheet  = ss.getSheetByName(SHEET_NAMES.SETTINGS)  || ss.insertSheet(SHEET_NAMES.SETTINGS);
  const productSheet   = ss.getSheetByName(SHEET_NAMES.PRODUCTS)  || ss.insertSheet(SHEET_NAMES.PRODUCTS);
  const stockSheet     = ss.getSheetByName(SHEET_NAMES.STOCK)     || ss.insertSheet(SHEET_NAMES.STOCK);
  const supplierSheet  = ss.getSheetByName(SHEET_NAMES.SUPPLIERS) || ss.insertSheet(SHEET_NAMES.SUPPLIERS);
  const purchaseSheet  = ss.getSheetByName(SHEET_NAMES.PURCHASES) || ss.insertSheet(SHEET_NAMES.PURCHASES);
  const salesSheet     = ss.getSheetByName(SHEET_NAMES.SALES)     || ss.insertSheet(SHEET_NAMES.SALES);
  const expenseSheet   = ss.getSheetByName(SHEET_NAMES.EXPENSES)  || ss.insertSheet(SHEET_NAMES.EXPENSES);
  const wastageSheet   = ss.getSheetByName(SHEET_NAMES.WASTAGE)   || ss.insertSheet(SHEET_NAMES.WASTAGE);

  // Read all raw row arrays once
  const settingsRows  = settingsSheet.getDataRange().getValues();
  const productRows   = productSheet.getDataRange().getValues();
  const stockRows     = stockSheet.getDataRange().getValues();
  const supplierRows  = supplierSheet.getDataRange().getValues();
  const purchaseRows  = purchaseSheet.getDataRange().getValues();
  const salesRows     = salesSheet.getDataRange().getValues();
  const expenseRows   = expenseSheet.getDataRange().getValues();
  const wastageRows   = wastageSheet.getDataRange().getValues();

  const result = {
    settings:    _parseSettings(settingsRows),
    products:    _parseProducts(productRows),
    stock:       _parseStock(stockRows),
    suppliers:   _parseSuppliersRaw(supplierRows, purchaseRows),
    purchases:   _parsePurchases(purchaseRows),
    sales:       _parseSalesAll(salesRows),
    expenses:    _parseExpensesAll(expenseRows),
    wastage:     _parseWastageAll(wastageRows),
    _ts:         new Date().toISOString(),
    _fromCache:  false
  };

  // Store in CacheService (5-min TTL)
  // CacheService has a 100KB per-key limit — only cache if under limit
  try {
    const payload = JSON.stringify(result);
    if (payload.length < 95000) {
      CacheService.getScriptCache().put(GAS_CACHE_KEY, payload, GAS_CACHE_TTL);
    }
    // If payload > 95KB, we skip caching (data is too large for CacheService)
    // The frontend still gets the data; it just won't be cached server-side
  } catch (cacheWriteErr) {
    console.warn('getAllData cache write failed (non-critical):', cacheWriteErr.message);
  }

  return result;
}

/* ══════════════════════════════════════════════════
   WORKBOOK INITIALIZATION
   Run this ONCE after pasting the script.
   ══════════════════════════════════════════════════ */

function initWorkbookSheets() {
  const HEADER_BG = '#1a1a2e';
  const HEADER_FG = '#ffffff';

  // ── PRODUCTS ──
  const prodSheet = getSheet(SHEET_NAMES.PRODUCTS);
  if (prodSheet.getLastRow() === 0) {
    prodSheet.appendRow(['Product ID', 'Product Name', 'Category', 'Unit', 'Reorder Level', 'Active']);
    prodSheet.getRange(1, 1, 1, 6).setFontWeight('bold').setBackground(HEADER_BG).setFontColor(HEADER_FG);
    const products = [
      ['PRD-001', 'White Onion', 'Onion',     'KG', 50, 'TRUE'],
      ['PRD-002', 'Red Onion',   'Onion',     'KG', 50, 'TRUE'],
      ['PRD-003', 'Garlic',      'Spice',     'KG', 20, 'TRUE'],
      ['PRD-004', 'Ginger',      'Spice',     'KG', 25, 'TRUE'],
      ['PRD-005', 'Potato',      'Vegetable', 'KG', 40, 'TRUE']
    ];
    prodSheet.getRange(2, 1, products.length, 6).setValues(products);
    prodSheet.setTabColor('#34a853');
  }

  // ── STOCK ──
  const stockSheet = getSheet(SHEET_NAMES.STOCK);
  if (stockSheet.getLastRow() === 0) {
    stockSheet.appendRow([
      'Product ID', 'Product Name', 'Category', 'Unit',
      'Opening Stock', 'Purchased', 'Sold', 'Wasted', 'Adjusted',
      'Current Stock', 'Average Cost', 'Stock Value', 'Reorder Level', 'Status'
    ]);
    stockSheet.getRange(1, 1, 1, 14).setFontWeight('bold').setBackground(HEADER_BG).setFontColor(HEADER_FG);
    const stock = [
      ['PRD-001', 'White Onion', 'Onion',     'KG', 0, 0, 0, 0, 0, 0, 0, 0, 50, 'OUT OF STOCK'],
      ['PRD-002', 'Red Onion',   'Onion',     'KG', 0, 0, 0, 0, 0, 0, 0, 0, 50, 'OUT OF STOCK'],
      ['PRD-003', 'Garlic',      'Spice',     'KG', 0, 0, 0, 0, 0, 0, 0, 0, 20, 'OUT OF STOCK'],
      ['PRD-004', 'Ginger',      'Spice',     'KG', 0, 0, 0, 0, 0, 0, 0, 0, 25, 'OUT OF STOCK'],
      ['PRD-005', 'Potato',      'Vegetable', 'KG', 0, 0, 0, 0, 0, 0, 0, 0, 40, 'OUT OF STOCK']
    ];
    stockSheet.getRange(2, 1, stock.length, 14).setValues(stock);
    stockSheet.setTabColor('#4285f4');
  }

  // ── SUPPLIERS ──
  const supSheet = getSheet(SHEET_NAMES.SUPPLIERS);
  if (supSheet.getLastRow() === 0) {
    supSheet.appendRow(['Supplier ID', 'Supplier Name', 'Phone', 'Location', 'Supply Category', 'Status']);
    supSheet.getRange(1, 1, 1, 6).setFontWeight('bold').setBackground(HEADER_BG).setFontColor(HEADER_FG);
    supSheet.setTabColor('#4285f4');
  }

  // ── PURCHASES ──
  const purSheet = getSheet(SHEET_NAMES.PURCHASES);
  if (purSheet.getLastRow() === 0) {
    purSheet.appendRow([
      'Lot ID', 'Date', 'Supplier ID', 'Supplier Name',
      'Product ID', 'Product Name', 'Total Qty', 'Total Cost',
      'Unit Cost', 'Target Rate', 'Remaining Qty',
      'Payment Mode', 'Payment Status'
    ]);
    purSheet.getRange(1, 1, 1, 13).setFontWeight('bold').setBackground(HEADER_BG).setFontColor(HEADER_FG);
    purSheet.setTabColor('#f29900');
  }

  // ── SALES ──
  const salesSheet = getSheet(SHEET_NAMES.SALES);
  if (salesSheet.getLastRow() === 0) {
    salesSheet.appendRow([
      'Invoice ID', 'Date', 'Product ID', 'Product Name',
      'Lot ID', 'Supplier ID', 'Supplier Name',
      'Sold Qty', 'Selling Rate', 'Target Rate',
      'Revenue', 'COGS', 'Gross Profit',
      'Customer Type', 'Buyer', 'Payment Mode', 'Payment Status'
    ]);
    salesSheet.getRange(1, 1, 1, 17).setFontWeight('bold').setBackground(HEADER_BG).setFontColor(HEADER_FG);
    salesSheet.setTabColor('#0d9488');
  }

  // ── WASTAGE ──
  const wastSheet = getSheet(SHEET_NAMES.WASTAGE);
  if (wastSheet.getLastRow() === 0) {
    wastSheet.appendRow([
      'Wastage ID', 'Date', 'Product ID', 'Product Name',
      'Lot ID', 'Supplier ID', 'Wasted Qty', 'Unit Cost',
      'Loss Amount', 'Reason', 'Notes'
    ]);
    wastSheet.getRange(1, 1, 1, 11).setFontWeight('bold').setBackground(HEADER_BG).setFontColor(HEADER_FG);
    wastSheet.setTabColor('#dc2626');
  }

  // ── EXPENSES ──
  const expSheet = getSheet(SHEET_NAMES.EXPENSES);
  if (expSheet.getLastRow() === 0) {
    expSheet.appendRow(['Expense ID', 'Date', 'Category', 'Description', 'Amount', 'Payment Mode', 'Paid To']);
    expSheet.getRange(1, 1, 1, 7).setFontWeight('bold').setBackground(HEADER_BG).setFontColor(HEADER_FG);
    expSheet.setTabColor('#7c3aed');
  }

  // ── SETTINGS ──
  const setSheet = getSheet(SHEET_NAMES.SETTINGS);
  if (setSheet.getLastRow() === 0) {
    setSheet.appendRow(['Key', 'Value']);
    setSheet.getRange(1, 1, 1, 2).setFontWeight('bold').setBackground(HEADER_BG).setFontColor(HEADER_FG);
    setSheet.appendRow(['Business Name', 'RajaRajeshwari Traders']);
    setSheet.appendRow(['Owner', 'Budime Aravind']);
    setSheet.appendRow(['Location', 'Huzurabad, Telangana']);
    setSheet.appendRow(['Currency', '₹']);
    setSheet.appendRow(['Unit', 'KG']);
    setSheet.appendRow(['Credit Policy', 'ZERO CREDIT — All transactions paid at receipt']);
    setSheet.appendRow(['Version', '3.0']);
    setSheet.setTabColor('#6b7280');
  }

  SpreadsheetApp.getUi().alert('All 8 sheets initialized. RajaRajeshwari Traders database is ready.');
}

/* ══════════════════════════════════════════════════
   GET — READ FUNCTIONS (wrap private parse helpers)
   ══════════════════════════════════════════════════ */

/** Get application settings from SETTINGS sheet */
function getSettings() {
  return _parseSettings(getSheet(SHEET_NAMES.SETTINGS).getDataRange().getValues());
}

/** Get all active products */
function getProducts() {
  return _parseProducts(getSheet(SHEET_NAMES.PRODUCTS).getDataRange().getValues());
}

/** Get current stock levels for all products */
function getStock() {
  return _parseStock(getSheet(SHEET_NAMES.STOCK).getDataRange().getValues());
}

/** Get all suppliers with aggregated purchase totals */
function getSuppliers() {
  return _parseSuppliersRaw(
    getSheet(SHEET_NAMES.SUPPLIERS).getDataRange().getValues(),
    getSheet(SHEET_NAMES.PURCHASES).getDataRange().getValues()
  );
}

/** Get all purchase lots */
function getPurchases() {
  return _parsePurchases(getSheet(SHEET_NAMES.PURCHASES).getDataRange().getValues());
}

/** Get active lots with remaining qty > 0 for a specific product */
function getActiveLots(productId) {
  if (!productId) return [];
  return getPurchases()
    .filter(function(p) { return p.productId === productId && p.remainingQty > 0; })
    .sort(function(a, b) { return b.date.localeCompare(a.date); });
}

/** Get sales, optionally filtered by period */
function getSales(filter, from, to) {
  const rows = getSheet(SHEET_NAMES.SALES).getDataRange().getValues();
  if (rows.length <= 1) return [];

  const sales = [];
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row[0]) continue;
    const dateStr = fmtDate(row[1]);
    if (filter && !dateInRange(dateStr, filter, from, to)) continue;
    sales.push({
      id:           String(row[0]).trim(),
      date:         dateStr,
      productId:    String(row[2]).trim(),
      productName:  String(row[3]).trim(),
      lotId:        String(row[4]).trim(),
      supplierId:   String(row[5]).trim(),
      supplierName: String(row[6]).trim(),
      quantity:     Number(row[7] || 0),
      rate:         Number(row[8] || 0),
      targetRate:   Number(row[9] || 0),
      revenue:      Number(row[10] || 0),
      cogs:         Number(row[11] || 0),
      grossProfit:  Number(row[12] || 0),
      customerType: String(row[13] || 'Walk-in').trim(),
      buyer:        String(row[14] || 'Walk-in').trim(),
      payment:      String(row[15] || 'Cash').trim(),
      status:       'paid'
    });
  }
  return sales;
}

/** Get wastage records, optionally filtered by period */
function getWastage(filter, from, to) {
  const rows = getSheet(SHEET_NAMES.WASTAGE).getDataRange().getValues();
  if (rows.length <= 1) return [];

  const wastage = [];
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row[0]) continue;
    const dateStr = fmtDate(row[1]);
    if (filter && !dateInRange(dateStr, filter, from, to)) continue;
    wastage.push({
      id:          String(row[0]).trim(),
      wastageId:   String(row[0]).trim(),
      date:        dateStr,
      productId:   String(row[2]).trim(),
      productName: String(row[3]).trim(),
      lotId:       String(row[4]).trim(),
      supplierId:  String(row[5]).trim(),
      quantity:    Number(row[6] || 0),
      wastedQty:   Number(row[6] || 0),
      unitCost:    Number(row[7] || 0),
      lossAmount:  Number(row[8] || 0),
      reason:      String(row[9] || '').trim(),
      notes:       String(row[10] || '').trim()
    });
  }
  return wastage;
}

/** Get expenses, optionally filtered by period */
function getExpenses(filter, from, to) {
  const rows = getSheet(SHEET_NAMES.EXPENSES).getDataRange().getValues();
  if (rows.length <= 1) return [];

  const expenses = [];
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row[0]) continue;
    const dateStr = fmtDate(row[1]);
    if (filter && !dateInRange(dateStr, filter, from, to)) continue;
    expenses.push({
      id:          String(row[0]).trim(),
      date:        dateStr,
      category:    String(row[2] || '').trim(),
      description: String(row[3] || '').trim(),
      amount:      Number(row[4] || 0),
      paidBy:      String(row[5] || 'Cash').trim(),
      paidTo:      String(row[6] || '').trim()
    });
  }
  return expenses;
}

/* ══════════════════════════════════════════════════
   POST — WRITE FUNCTIONS (TRANSACTIONS)
   Each write function calls _invalidateDataCache() after mutations
   so the next getAllData() call fetches fresh data.
   ══════════════════════════════════════════════════ */

/**
 * Record a new purchase lot intake.
 * Payload: { supplierId, productId, totalQty, totalCost, targetRate, payment, date? }
 */
function createPurchase(data) {
  if (!data.supplierId) throw new Error('Supplier is required');
  if (!data.productId) throw new Error('Product is required');
  const totalQty = Number(data.totalQty || data.quantity);
  const totalCost = Number(data.totalCost);
  const targetRate = Number(data.targetRate);
  if (!totalQty || totalQty <= 0) throw new Error('Total quantity must be greater than zero');
  if (!totalCost || totalCost <= 0) throw new Error('Total cost must be greater than zero');
  if (!targetRate || targetRate <= 0) throw new Error('Target selling rate must be greater than zero');

  const unitCost = round2(totalCost / totalQty);

  const stockSheet = getSheet(SHEET_NAMES.STOCK);
  const stockRows = stockSheet.getDataRange().getValues();
  const stockHit = findStockRow(stockSheet, stockRows, data.productId);
  if (!stockHit) throw new Error('Product not found in stock sheet: ' + data.productId);

  const productName = String(stockHit.row[1]).trim();
  const currentStock = Number(stockHit.row[9] || 0);
  const oldAvgCost = Number(stockHit.row[10] || 0);

  // Look up supplier name
  const supSheet = getSheet(SHEET_NAMES.SUPPLIERS);
  const supRows = supSheet.getDataRange().getValues();
  let supplierName = data.supplierName || 'Unknown';
  for (let i = 1; i < supRows.length; i++) {
    if (String(supRows[i][0]).trim() === data.supplierId) {
      supplierName = String(supRows[i][1]).trim();
      break;
    }
  }

  const purSheet = getSheet(SHEET_NAMES.PURCHASES);
  const lotId = nextId(purSheet, 'P', 3);
  const dateStr = data.date || todayStr();
  const paymentMode = data.payment || data.paymentMode || 'Cash';

  purSheet.appendRow([
    lotId, dateStr, data.supplierId, supplierName,
    data.productId, productName, totalQty, totalCost,
    unitCost, targetRate, totalQty,
    paymentMode, 'Paid'
  ]);

  // Update STOCK: weighted average cost
  const newCurrentStock = currentStock + totalQty;
  let newAvgCost = unitCost;
  if (currentStock > 0) {
    newAvgCost = round2(((currentStock * oldAvgCost) + (totalQty * unitCost)) / newCurrentStock);
  }
  const newStockValue = round2(newCurrentStock * newAvgCost);
  const currentPurchased = Number(stockHit.row[5] || 0) + totalQty;
  const threshold = Number(stockHit.row[12] || 0);

  stockSheet.getRange(stockHit.rowIdx, 6).setValue(currentPurchased);
  stockSheet.getRange(stockHit.rowIdx, 10).setValue(newCurrentStock);
  stockSheet.getRange(stockHit.rowIdx, 11).setValue(newAvgCost);
  stockSheet.getRange(stockHit.rowIdx, 12).setValue(newStockValue);
  stockSheet.getRange(stockHit.rowIdx, 14).setValue(stockStatus(newCurrentStock, threshold));

  _invalidateDataCache(); // ← Cache bust after write

  return {
    lotId: lotId, productName: productName, supplierName: supplierName,
    totalQty: totalQty, totalCost: totalCost, unitCost: unitCost,
    targetRate: targetRate, remainingQty: totalQty,
    newCurrentStock: newCurrentStock, newAvgCost: newAvgCost
  };
}

/**
 * Record a counter sale transaction.
 * Payload: { productId, lotId, quantity, rate, customerType, buyer, payment, date? }
 */
function createSale(data) {
  if (!data.productId) throw new Error('Product is required');
  if (!data.lotId) throw new Error('Lot selection is required');
  const qty = Number(data.quantity);
  const sellingRate = Number(data.rate || data.sellingRate);
  if (!qty || qty <= 0) throw new Error('Quantity must be greater than zero');
  if (!sellingRate || sellingRate <= 0) throw new Error('Selling rate must be greater than zero');

  const purSheet = getSheet(SHEET_NAMES.PURCHASES);
  const purRows = purSheet.getDataRange().getValues();
  let lotRowIdx = -1;
  let lotUnitCost = 0, lotTargetRate = 0, lotRemainingQty = 0;
  let lotSupplierId = '', lotSupplierName = '', productName = data.productName || '';

  for (let i = 1; i < purRows.length; i++) {
    if (String(purRows[i][0]).trim() === data.lotId) {
      lotRowIdx = i + 1;
      lotSupplierId = String(purRows[i][2]).trim();
      lotSupplierName = String(purRows[i][3]).trim();
      productName = productName || String(purRows[i][5]).trim();
      lotUnitCost = Number(purRows[i][8] || 0);
      lotTargetRate = Number(purRows[i][9] || 0);
      lotRemainingQty = Number(purRows[i][10] || 0);
      break;
    }
  }
  if (lotRowIdx === -1) throw new Error('Lot not found: ' + data.lotId);
  if (qty > lotRemainingQty) throw new Error('Insufficient lot stock. Available: ' + lotRemainingQty + ' KG in lot ' + data.lotId);

  const stockSheet = getSheet(SHEET_NAMES.STOCK);
  const stockRows = stockSheet.getDataRange().getValues();
  const stockHit = findStockRow(stockSheet, stockRows, data.productId);
  if (!stockHit) throw new Error('Product not found in stock sheet: ' + data.productId);
  productName = productName || String(stockHit.row[1]).trim();
  const currentStock = Number(stockHit.row[9] || 0);
  if (qty > currentStock) throw new Error('Insufficient overall stock. Available: ' + currentStock + ' KG.');

  const revenue = round2(qty * sellingRate);
  const cogs = round2(qty * lotUnitCost);
  const grossProfit = round2(revenue - cogs);

  const salesSheet = getSheet(SHEET_NAMES.SALES);
  const invoiceId = nextId(salesSheet, 'S', 3);
  const dateStr = data.date || todayStr();
  const customerType = data.customerType || 'Walk-in';
  const buyer = data.buyer || 'Walk-in';
  const paymentMode = data.payment || data.paymentMode || 'Cash';

  salesSheet.appendRow([
    invoiceId, dateStr, data.productId, productName,
    data.lotId, lotSupplierId, lotSupplierName,
    qty, sellingRate, lotTargetRate,
    revenue, cogs, grossProfit,
    customerType, buyer, paymentMode, 'Paid'
  ]);

  const newLotRemaining = lotRemainingQty - qty;
  purSheet.getRange(lotRowIdx, 11).setValue(newLotRemaining);

  const currentSold = Number(stockHit.row[6] || 0) + qty;
  const newCurrentStock = currentStock - qty;
  const avgCost = Number(stockHit.row[10] || 0);
  const newStockValue = round2(newCurrentStock * avgCost);
  const threshold = Number(stockHit.row[12] || 0);

  stockSheet.getRange(stockHit.rowIdx, 7).setValue(currentSold);
  stockSheet.getRange(stockHit.rowIdx, 10).setValue(newCurrentStock);
  stockSheet.getRange(stockHit.rowIdx, 12).setValue(newStockValue);
  stockSheet.getRange(stockHit.rowIdx, 14).setValue(stockStatus(newCurrentStock, threshold));

  _invalidateDataCache(); // ← Cache bust after write

  return {
    invoiceId: invoiceId, productName: productName,
    lotId: data.lotId, supplierName: lotSupplierName,
    quantity: qty, sellingRate: sellingRate, targetRate: lotTargetRate,
    revenue: revenue, cogs: cogs, grossProfit: grossProfit,
    customerType: customerType, buyer: buyer,
    remainingLotStock: newLotRemaining, remainingProductStock: newCurrentStock
  };
}

/**
 * Record a multi-item counter sale transaction under a single invoice ID.
 * Payload: {
 *   date?, customerType?, buyer?, payment?, notes?,
 *   items: Array<{ productId, lotId, quantity, rate }>
 * }
 */
function createBatchSale(data) {
  if (!data.items || !Array.isArray(data.items) || data.items.length === 0) {
    throw new Error('At least one item is required to record a multi-item sale');
  }

  const salesSheet = getSheet(SHEET_NAMES.SALES);
  const purSheet   = getSheet(SHEET_NAMES.PURCHASES);
  const stockSheet = getSheet(SHEET_NAMES.STOCK);

  const purRows   = purSheet.getDataRange().getValues();
  const stockRows = stockSheet.getDataRange().getValues();

  // Pre-validate all items
  for (let j = 0; j < data.items.length; j++) {
    const item = data.items[j];
    if (!item.productId) throw new Error('Product is required on item ' + (j + 1));
    if (!item.lotId) throw new Error('Lot selection is required on item ' + (j + 1));
    const itemQty = Number(item.quantity);
    const itemRate = Number(item.rate || item.sellingRate);
    if (!itemQty || itemQty <= 0) throw new Error('Quantity must be greater than zero on item ' + (j + 1));
    if (!itemRate || itemRate <= 0) throw new Error('Selling rate must be greater than zero on item ' + (j + 1));
  }

  const invoiceId    = data.invoiceId || nextId(salesSheet, 'S', 3);
  const dateStr      = data.date || todayStr();
  const customerType = data.customerType || 'Walk-in';
  const buyer        = data.buyer || 'Walk-in';
  const paymentMode  = data.payment || data.paymentMode || 'Cash';
  const notes        = data.notes || '';

  let totalRevenue = 0;
  let totalGrossProfit = 0;
  let totalCogs = 0;

  for (let j = 0; j < data.items.length; j++) {
    const it = data.items[j];
    const qty = Number(it.quantity);
    const sellingRate = Number(it.rate || it.sellingRate);

    let lotRowIdx = -1;
    let lotUnitCost = 0, lotTargetRate = 0, lotRemainingQty = 0;
    let lotSupplierId = '', lotSupplierName = '', productName = it.productName || '';

    for (let i = 1; i < purRows.length; i++) {
      if (String(purRows[i][0]).trim() === it.lotId) {
        lotRowIdx = i + 1;
        lotSupplierId = String(purRows[i][2]).trim();
        lotSupplierName = String(purRows[i][3]).trim();
        productName = productName || String(purRows[i][5]).trim();
        lotUnitCost = Number(purRows[i][8] || 0);
        lotTargetRate = Number(purRows[i][9] || 0);
        lotRemainingQty = Number(purRows[i][10] || 0);
        break;
      }
    }
    if (lotRowIdx === -1) throw new Error('Lot not found: ' + it.lotId);
    if (qty > lotRemainingQty) {
      throw new Error('Insufficient lot stock for ' + productName + '. Available: ' + lotRemainingQty + ' KG in lot ' + it.lotId);
    }

    const stockHit = findStockRow(stockSheet, stockRows, it.productId);
    if (!stockHit) throw new Error('Product not found in stock sheet: ' + it.productId);
    productName = productName || String(stockHit.row[1]).trim();
    const currentStock = Number(stockHit.row[9] || 0);
    if (qty > currentStock) {
      throw new Error('Insufficient overall stock for ' + productName + '. Available: ' + currentStock + ' KG.');
    }

    const revenue = round2(qty * sellingRate);
    const cogs = round2(qty * lotUnitCost);
    const grossProfit = round2(revenue - cogs);

    totalRevenue += revenue;
    totalCogs += cogs;
    totalGrossProfit += grossProfit;

    salesSheet.appendRow([
      invoiceId, dateStr, it.productId, productName,
      it.lotId, lotSupplierId, lotSupplierName,
      qty, sellingRate, lotTargetRate,
      revenue, cogs, grossProfit,
      customerType, buyer, paymentMode, 'Paid'
    ]);

    const newLotRemaining = lotRemainingQty - qty;
    purSheet.getRange(lotRowIdx, 11).setValue(newLotRemaining);
    purRows[lotRowIdx - 1][10] = newLotRemaining;

    const currentSold = Number(stockHit.row[6] || 0) + qty;
    const newCurrentStock = currentStock - qty;
    const avgCost = Number(stockHit.row[10] || 0);
    const newStockValue = round2(newCurrentStock * avgCost);
    const threshold = Number(stockHit.row[12] || 0);

    stockSheet.getRange(stockHit.rowIdx, 7).setValue(currentSold);
    stockSheet.getRange(stockHit.rowIdx, 10).setValue(newCurrentStock);
    stockSheet.getRange(stockHit.rowIdx, 12).setValue(newStockValue);
    stockSheet.getRange(stockHit.rowIdx, 14).setValue(stockStatus(newCurrentStock, threshold));

    stockHit.row[6] = currentSold;
    stockHit.row[9] = newCurrentStock;
    stockHit.row[11] = newStockValue;
  }

  _invalidateDataCache(); // ← Cache bust after write

  return {
    invoiceId: invoiceId,
    itemCount: data.items.length,
    revenue: round2(totalRevenue),
    cogs: round2(totalCogs),
    grossProfit: round2(totalGrossProfit),
    customerType: customerType,
    buyer: buyer,
    paymentMode: paymentMode,
    date: dateStr
  };
}

/**
 * Record a wastage / spoilage entry.
 * Payload: { productId, lotId, quantity, reason, notes?, date? }
 */
function createWastage(data) {
  if (!data.productId) throw new Error('Product is required');
  if (!data.lotId) throw new Error('Lot selection is required');
  const qty = Number(data.quantity);
  if (!qty || qty <= 0) throw new Error('Wasted quantity must be greater than zero');
  if (!data.reason) throw new Error('Reason is required for wastage audit');

  const purSheet = getSheet(SHEET_NAMES.PURCHASES);
  const purRows = purSheet.getDataRange().getValues();
  let lotRowIdx = -1;
  let lotUnitCost = 0, lotRemainingQty = 0, lotSupplierId = '';
  let productName = data.productName || '';

  for (let i = 1; i < purRows.length; i++) {
    if (String(purRows[i][0]).trim() === data.lotId) {
      lotRowIdx = i + 1;
      lotSupplierId = String(purRows[i][2]).trim();
      productName = productName || String(purRows[i][5]).trim();
      lotUnitCost = Number(purRows[i][8] || 0);
      lotRemainingQty = Number(purRows[i][10] || 0);
      break;
    }
  }
  if (lotRowIdx === -1) throw new Error('Lot not found: ' + data.lotId);
  if (qty > lotRemainingQty) throw new Error('Cannot waste more than remaining lot qty. Available: ' + lotRemainingQty + ' KG in lot ' + data.lotId);

  const stockSheet = getSheet(SHEET_NAMES.STOCK);
  const stockRows = stockSheet.getDataRange().getValues();
  const stockHit = findStockRow(stockSheet, stockRows, data.productId);
  if (!stockHit) throw new Error('Product not found in stock sheet');
  productName = productName || String(stockHit.row[1]).trim();
  const currentStock = Number(stockHit.row[9] || 0);

  const lossAmount = round2(qty * lotUnitCost);

  const wastSheet = getSheet(SHEET_NAMES.WASTAGE);
  const wastageId = nextId(wastSheet, 'WST-', 3);
  const dateStr = data.date || todayStr();

  wastSheet.appendRow([
    wastageId, dateStr, data.productId, productName,
    data.lotId, lotSupplierId, qty, lotUnitCost,
    lossAmount, data.reason, data.notes || ''
  ]);

  const newLotRemaining = lotRemainingQty - qty;
  purSheet.getRange(lotRowIdx, 11).setValue(newLotRemaining);

  const currentWasted = Number(stockHit.row[7] || 0) + qty;
  const newCurrentStock = currentStock - qty;
  const avgCost = Number(stockHit.row[10] || 0);
  const newStockValue = round2(newCurrentStock * avgCost);
  const threshold = Number(stockHit.row[12] || 0);

  stockSheet.getRange(stockHit.rowIdx, 8).setValue(currentWasted);
  stockSheet.getRange(stockHit.rowIdx, 10).setValue(newCurrentStock);
  stockSheet.getRange(stockHit.rowIdx, 12).setValue(newStockValue);
  stockSheet.getRange(stockHit.rowIdx, 14).setValue(stockStatus(newCurrentStock, threshold));

  _invalidateDataCache(); // ← Cache bust after write

  return {
    wastageId: wastageId, productName: productName,
    lotId: data.lotId, quantity: qty,
    unitCost: lotUnitCost, lossAmount: lossAmount,
    reason: data.reason,
    remainingLotStock: newLotRemaining, remainingProductStock: newCurrentStock
  };
}

/**
 * Record an operating expense.
 * Payload: { category, description, amount, paidBy?, paidTo?, date? }
 */
function createExpense(data) {
  const amount = Number(data.amount);
  if (!amount || amount <= 0) throw new Error('Amount must be greater than zero');
  if (!data.category) throw new Error('Category is required');

  const expSheet = getSheet(SHEET_NAMES.EXPENSES);
  const expId = nextId(expSheet, 'EXP-', 3);
  const dateStr = data.date || todayStr();

  expSheet.appendRow([
    expId, dateStr, data.category,
    data.description || '', amount,
    data.paidBy || data.paymentMode || 'Cash',
    data.paidTo || ''
  ]);

  _invalidateDataCache(); // ← Cache bust after write

  return { expenseId: expId, amount: amount, category: data.category };
}

/**
 * Add a new supplier.
 * Payload: { name, phone?, location?, category?, status? }
 */
function createSupplier(data) {
  if (!data.name) throw new Error('Supplier name is required');

  const supSheet = getSheet(SHEET_NAMES.SUPPLIERS);
  const supId = nextId(supSheet, 'SUP-', 3);

  supSheet.appendRow([
    supId, data.name.trim(),
    data.phone || '', data.location || '',
    data.category || '', 'Active'
  ]);

  _invalidateDataCache(); // ← Cache bust after write

  return { id: supId, name: data.name.trim() };
}

/**
 * Update an existing supplier.
 * Payload: { id, name?, phone?, location?, category?, status? }
 */
function updateSupplier(data) {
  if (!data.id) throw new Error('Supplier ID is required');

  const supSheet = getSheet(SHEET_NAMES.SUPPLIERS);
  const rows = supSheet.getDataRange().getValues();
  let found = -1;
  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][0]).trim() === data.id) {
      found = i + 1;
      break;
    }
  }
  if (found === -1) throw new Error('Supplier not found: ' + data.id);

  if (data.name !== undefined)     supSheet.getRange(found, 2).setValue(data.name);
  if (data.phone !== undefined)    supSheet.getRange(found, 3).setValue(data.phone);
  if (data.location !== undefined) supSheet.getRange(found, 4).setValue(data.location);
  if (data.category !== undefined) supSheet.getRange(found, 5).setValue(data.category);
  if (data.status !== undefined)   supSheet.getRange(found, 6).setValue(data.status === 'active' ? 'Active' : 'Inactive');

  _invalidateDataCache(); // ← Cache bust after write

  return { success: true, id: data.id };
}

/* ══════════════════════════════════════════════════
   ANALYTICS — P&L, CUSTOMER SEGMENTS, VELOCITY
   ══════════════════════════════════════════════════ */

/** P&L breakdown by Product */
function getPnLByProduct(filter, from, to) {
  const sales = getSales(filter, from, to);
  const wastage = getWastage(filter, from, to);
  const products = getProducts();
  const byProd = {};

  products.forEach(function(p) {
    byProd[p.id] = { productId: p.id, productName: p.name, qty: 0, revenue: 0, cogs: 0, profit: 0, wastageLoss: 0, txnCount: 0 };
  });

  sales.forEach(function(s) {
    if (!byProd[s.productId]) {
      byProd[s.productId] = { productId: s.productId, productName: s.productName, qty: 0, revenue: 0, cogs: 0, profit: 0, wastageLoss: 0, txnCount: 0 };
    }
    byProd[s.productId].qty += s.quantity;
    byProd[s.productId].revenue += s.revenue;
    byProd[s.productId].cogs += s.cogs;
    byProd[s.productId].profit += s.grossProfit;
    byProd[s.productId].txnCount++;
  });

  wastage.forEach(function(w) {
    if (byProd[w.productId]) {
      byProd[w.productId].wastageLoss += w.lossAmount;
    }
  });

  return Object.values(byProd).map(function(item) {
    var netProfit = round2(item.profit - item.wastageLoss);
    return {
      productId: item.productId, productName: item.productName,
      qty: item.qty, revenue: round2(item.revenue), cogs: round2(item.cogs),
      grossProfit: round2(item.profit), wastageLoss: round2(item.wastageLoss),
      netProfit: netProfit, txnCount: item.txnCount,
      marginPct: item.revenue > 0 ? round2((item.profit / item.revenue) * 100) : 0
    };
  }).sort(function(a, b) { return b.netProfit - a.netProfit; });
}

/** P&L breakdown by Seller/Supplier */
function getPnLBySeller(filter, from, to) {
  const sales = getSales(filter, from, to);
  const wastage = getWastage(filter, from, to);
  const suppliers = getSuppliers();
  const purchases = getPurchases();
  const bySeller = {};

  suppliers.forEach(function(sup) {
    bySeller[sup.id] = { supplierId: sup.id, supplierName: sup.name, lotsCount: 0, qtySold: 0, revenue: 0, cogs: 0, profit: 0, wastageLoss: 0, txnCount: 0 };
  });

  purchases.forEach(function(p) {
    if (bySeller[p.supplierId]) {
      bySeller[p.supplierId].lotsCount++;
    }
  });

  sales.forEach(function(s) {
    var supId = s.supplierId;
    if (!bySeller[supId]) {
      bySeller[supId] = { supplierId: supId, supplierName: s.supplierName || 'Unknown', lotsCount: 0, qtySold: 0, revenue: 0, cogs: 0, profit: 0, wastageLoss: 0, txnCount: 0 };
    }
    bySeller[supId].qtySold += s.quantity;
    bySeller[supId].revenue += s.revenue;
    bySeller[supId].cogs += s.cogs;
    bySeller[supId].profit += s.grossProfit;
    bySeller[supId].txnCount++;
  });

  wastage.forEach(function(w) {
    if (bySeller[w.supplierId]) {
      bySeller[w.supplierId].wastageLoss += w.lossAmount;
    }
  });

  return Object.values(bySeller).map(function(item) {
    var netProfit = round2(item.profit - item.wastageLoss);
    return {
      supplierId: item.supplierId, supplierName: item.supplierName,
      lotsCount: item.lotsCount, qtySold: item.qtySold,
      revenue: round2(item.revenue), cogs: round2(item.cogs),
      grossProfit: round2(item.profit), wastageLoss: round2(item.wastageLoss),
      netProfit: netProfit, txnCount: item.txnCount,
      roiPct: item.cogs > 0 ? round2((item.profit / item.cogs) * 100) : 0
    };
  }).sort(function(a, b) { return b.netProfit - a.netProfit; });
}

/** Customer Segment analysis (Walk-in / Shopkeeper / Hotel) */
function getCustomerTypeStats(filter, from, to) {
  const sales = getSales(filter, from, to);
  const segments = {
    'Walk-in':    { type: 'Walk-in',    label: 'Walk-in (Retail)',     revenue: 0, qty: 0, count: 0, products: {} },
    'Shopkeeper': { type: 'Shopkeeper', label: 'Shopkeeper (Reseller)', revenue: 0, qty: 0, count: 0, products: {} },
    'Hotel':      { type: 'Hotel',      label: 'Hotel (Commercial)',    revenue: 0, qty: 0, count: 0, products: {} }
  };

  sales.forEach(function(s) {
    var tier = s.customerType || 'Walk-in';
    var seg = segments[tier] || segments['Walk-in'];
    seg.revenue += s.revenue;
    seg.qty += s.quantity;
    seg.count++;
    var prodName = s.productName || 'Other';
    seg.products[prodName] = (seg.products[prodName] || 0) + s.quantity;
  });

  return segments;
}

/** Buyer revenue & volume summary */
function getBuyerRevenueSummary(filter, from, to) {
  const sales = getSales(filter, from, to);
  const buyersMap = {};

  sales.forEach(function(s) {
    var name = s.buyer || 'Walk-in';
    var tier = s.customerType || 'Walk-in';
    if (!buyersMap[name]) {
      buyersMap[name] = { name: name, customerType: tier, totalQty: 0, totalRevenue: 0, totalProfit: 0, orderCount: 0 };
    }
    buyersMap[name].totalQty += s.quantity;
    buyersMap[name].totalRevenue += s.revenue;
    buyersMap[name].totalProfit += s.grossProfit;
    buyersMap[name].orderCount++;
  });

  return Object.values(buyersMap).sort(function(a, b) { return b.totalRevenue - a.totalRevenue; });
}

/** Product stock velocity — today vs 7-day sell rate */
function getProductVelocity() {
  const todaySales = getSales('today');
  const weekSales = getSales('7d');
  const stock = getStock();

  return stock.map(function(item) {
    var soldToday = 0, sold7Days = 0;
    todaySales.forEach(function(s) { if (s.productId === item.productId) soldToday += s.quantity; });
    weekSales.forEach(function(s) { if (s.productId === item.productId) sold7Days += s.quantity; });

    var runRate = sold7Days / 7;
    var daysOfStock = runRate > 0 ? round2(item.currentStock / runRate) : 999;
    var velocityStatus = 'healthy';
    if (item.currentStock <= 0) velocityStatus = 'out';
    else if (item.currentStock <= item.reorderLevel) velocityStatus = 'low';
    else if (soldToday > runRate * 1.4) velocityStatus = 'fast-moving';

    return {
      productId: item.productId, productName: item.productName,
      currentStock: item.currentStock, unit: item.unit,
      soldToday: soldToday, sold7Days: sold7Days,
      runRate: round2(runRate), daysOfStock: daysOfStock,
      velocityStatus: velocityStatus
    };
  });
}

/* ══════════════════════════════════════════════════
   EXECUTIVE DASHBOARD AGGREGATION
   ══════════════════════════════════════════════════ */

function getDashboardData(filter, from, to) {
  var sales = getSales(filter, from, to);
  var expenses = getExpenses(filter, from, to);
  var wastage = getWastage(filter, from, to);
  var stock = getStock();

  var totalRevenue = 0, totalCogs = 0, totalGrossProfit = 0;
  sales.forEach(function(s) {
    totalRevenue += s.revenue;
    totalCogs += s.cogs;
    totalGrossProfit += s.grossProfit;
  });

  var totalExpenses = 0;
  expenses.forEach(function(e) { totalExpenses += e.amount; });

  var totalWastageLoss = 0, totalWastedQty = 0;
  wastage.forEach(function(w) {
    totalWastageLoss += w.lossAmount;
    totalWastedQty += w.quantity;
  });

  var netProfit = round2(totalGrossProfit - totalExpenses - totalWastageLoss);
  var realizedMargin = totalRevenue > 0 ? round2((totalGrossProfit / totalRevenue) * 100) : 0;

  var stockValue = 0, lowStockCount = 0, outOfStockCount = 0;
  var lowStockProducts = [];
  stock.forEach(function(item) {
    stockValue += item.stockValue;
    if (item.status === 'LOW STOCK') {
      lowStockCount++;
      lowStockProducts.push(item);
    } else if (item.status === 'OUT OF STOCK') {
      outOfStockCount++;
      lowStockProducts.push(item);
    }
  });

  return {
    revenue:          round2(totalRevenue),
    cogs:             round2(totalCogs),
    grossProfit:      round2(totalGrossProfit),
    totalExpenses:    round2(totalExpenses),
    totalWastageLoss: round2(totalWastageLoss),
    totalWastedQty:   totalWastedQty,
    netProfit:        netProfit,
    realizedMargin:   realizedMargin,
    stockValue:       round2(stockValue),
    lowStockCount:    lowStockCount,
    outOfStockCount:  outOfStockCount,
    lowStockProducts: lowStockProducts,
    recentSales:      sales.slice(-10).reverse(),
    salesCount:       sales.length,
    period:           filter || 'today'
  };
}
