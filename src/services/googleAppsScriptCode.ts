export const APPS_SCRIPT_CODE = `/**
 * ==============================================================================
 * RAJARAJESHWARI TRADERS - RETAIL INVENTORY, SALES & PROFIT MANAGEMENT SYSTEM
 * Google Apps Script Integration Layer (Code.gs)
 * Single Source of Truth: Existing Google Sheets Workbook
 * ==============================================================================
 */

const SHEET_NAMES = {
  HOME: 'HOME',
  SALES: 'SALES',
  PURCHASES: 'PURCHASES',
  STOCK: 'STOCK',
  SUPPLIERS: 'SUPPLIERS',
  EXPENSES: 'EXPENSES',
  PRODUCTS: 'PRODUCTS',
  SETTINGS: 'SETTINGS',
  ADJUSTMENTS: 'STOCK_ADJUSTMENTS'
};

function doGet(e) {
  try {
    const action = e.parameter.action || 'ping';
    let result = null;

    switch (action) {
      case 'ping':
        result = { status: 'ok', time: new Date().toISOString(), store: 'RajaRajeshwari Traders' };
        break;
      case 'getDashboardData':
        result = getDashboardData(e.parameter.filter || 'Today');
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
      case 'getSales':
        result = getSales();
        break;
      case 'getPurchases':
        result = getPurchases();
        break;
      case 'getExpenses':
        result = getExpenses();
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
      case 'createSale':
        result = createSale(payload);
        break;
      case 'createPurchase':
        result = createPurchase(payload);
        break;
      case 'createExpense':
        result = createExpense(payload);
        break;
      case 'createStockAdjustment':
        result = createStockAdjustment(payload);
        break;
      case 'createProduct':
        result = createProduct(payload);
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

function getSheet(sheetName) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(sheetName);
  if (!sheet) sheet = ss.insertSheet(sheetName);
  return sheet;
}

function getProducts() {
  const sheet = getSheet(SHEET_NAMES.PRODUCTS);
  const rows = sheet.getDataRange().getValues();
  if (rows.length <= 1) return [];
  const products = [];
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row[0]) continue;
    products.push({
      id: String(row[0]).trim(),
      name: String(row[1]).trim(),
      category: String(row[2] || 'Vegetables').trim(),
      baseUnit: String(row[3] || 'KG').trim(),
      lowStockThreshold: Number(row[4] || 0),
      active: String(row[5]).toUpperCase() === 'TRUE' || row[5] === true
    });
  }
  return products;
}

function getSuppliers() {
  const sheet = getSheet(SHEET_NAMES.SUPPLIERS);
  const rows = sheet.getDataRange().getValues();
  if (rows.length <= 1) return [];
  const purchases = getPurchases();
  const suppliers = [];
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row[0]) continue;
    const supId = String(row[0]).trim();
    let totalPurchases = 0;
    let totalPaid = 0;
    let lastDate = '';
    purchases.forEach(p => {
      if (p.supplierId === supId) {
        totalPurchases += Number(p.totalAmount || 0);
        totalPaid += Number(p.amountPaid || 0);
        if (!lastDate || p.date > lastDate) lastDate = p.date;
      }
    });
    suppliers.push({
      id: supId,
      name: String(row[1]).trim(),
      phone: String(row[2] || '').trim(),
      address: String(row[3] || '').trim(),
      notes: String(row[4] || '').trim(),
      active: String(row[5]).toUpperCase() === 'TRUE' || row[5] === true,
      totalPurchases, totalPaid,
      outstanding: Math.max(0, totalPurchases - totalPaid),
      lastPurchaseDate: lastDate
    });
  }
  return suppliers;
}

function getStock() {
  const sheet = getSheet(SHEET_NAMES.STOCK);
  const rows = sheet.getDataRange().getValues();
  if (rows.length <= 1) return [];
  const stockList = [];
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row[0]) continue;
    const currentStock = Number(row[8] || 0);
    const avgCost = Number(row[9] || 0);
    const threshold = Number(row[11] || 0);
    let status = 'NORMAL';
    if (currentStock <= 0) status = 'OUT OF STOCK';
    else if (currentStock <= threshold) status = 'LOW STOCK';

    stockList.push({
      productId: String(row[0]).trim(),
      productName: String(row[1]).trim(),
      category: String(row[2] || '').trim(),
      baseUnit: String(row[3] || 'KG').trim(),
      openingStock: Number(row[4] || 0),
      purchased: Number(row[5] || 0),
      sold: Number(row[6] || 0),
      adjusted: Number(row[7] || 0),
      currentStock, averageCost: avgCost,
      stockValue: Number(row[10] || (currentStock * avgCost)),
      lowStockThreshold: threshold, status
    });
  }
  return stockList;
}

function getSales() {
  const sheet = getSheet(SHEET_NAMES.SALES);
  const rows = sheet.getDataRange().getValues();
  if (rows.length <= 1) return [];
  const sales = [];
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row[0]) continue;
    sales.push({
      id: String(row[0]).trim(),
      date: formatDate(row[1]),
      time: String(row[2] || '').trim(),
      productId: String(row[3]).trim(),
      productName: String(row[4]).trim(),
      quantityKg: Number(row[5] || 0),
      sellingRate: Number(row[6] || 0),
      revenue: Number(row[7] || 0),
      costRate: Number(row[8] || 0),
      cogs: Number(row[9] || 0),
      grossProfit: Number(row[10] || 0),
      buyer: String(row[11] || 'Walk-in').trim(),
      paymentMethod: String(row[12] || 'Cash').trim(),
      paymentStatus: String(row[13] || 'Paid').trim(),
      notes: String(row[14] || '').trim()
    });
  }
  return sales;
}

function getPurchases() {
  const sheet = getSheet(SHEET_NAMES.PURCHASES);
  const rows = sheet.getDataRange().getValues();
  if (rows.length <= 1) return [];
  const purchases = [];
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row[0]) continue;
    purchases.push({
      id: String(row[0]).trim(),
      date: formatDate(row[1]),
      time: String(row[2] || '').trim(),
      supplierId: String(row[3]).trim(),
      supplierName: String(row[4]).trim(),
      productId: String(row[5]).trim(),
      productName: String(row[6]).trim(),
      quantityKg: Number(row[7] || 0),
      purchaseRate: Number(row[8] || 0),
      totalAmount: Number(row[9] || 0),
      paymentStatus: String(row[10] || 'Paid').trim(),
      amountPaid: Number(row[11] || 0),
      amountDue: Number(row[12] || 0),
      paymentMethod: String(row[13] || 'Cash').trim(),
      notes: String(row[14] || '').trim()
    });
  }
  return purchases;
}

function getExpenses() {
  const sheet = getSheet(SHEET_NAMES.EXPENSES);
  const rows = sheet.getDataRange().getValues();
  if (rows.length <= 1) return [];
  const expenses = [];
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row[0]) continue;
    expenses.push({
      id: String(row[0]).trim(),
      date: formatDate(row[1]),
      category: String(row[2] || 'Other').trim(),
      description: String(row[3] || '').trim(),
      amount: Number(row[4] || 0),
      paymentMethod: String(row[5] || 'Cash').trim(),
      notes: String(row[6] || '').trim()
    });
  }
  return expenses;
}

function createSale(saleData) {
  if (!saleData.productId) throw new Error('Product is mandatory');
  const qty = Number(saleData.quantityKg);
  const rate = Number(saleData.sellingRate);
  if (!qty || qty <= 0) throw new Error('Quantity must be greater than zero');
  if (!rate || rate <= 0) throw new Error('Selling rate must be greater than zero');

  const stockSheet = getSheet(SHEET_NAMES.STOCK);
  const stockRows = stockSheet.getDataRange().getValues();
  let foundRowIndex = -1;
  let currentStock = 0;
  let currentAvgCost = 0;
  let productName = saleData.productName || '';

  for (let i = 1; i < stockRows.length; i++) {
    if (String(stockRows[i][0]).trim() === saleData.productId) {
      foundRowIndex = i + 1;
      productName = String(stockRows[i][1]).trim();
      currentStock = Number(stockRows[i][8] || 0);
      currentAvgCost = Number(stockRows[i][9] || 0);
      break;
    }
  }

  if (foundRowIndex === -1) throw new Error('Product not found in stock sheet: ' + saleData.productId);
  if (qty > currentStock) throw new Error('Insufficient stock. Available: ' + currentStock + ' KG.');

  const salesSheet = getSheet(SHEET_NAMES.SALES);
  const salesRows = salesSheet.getDataRange().getValues();
  let maxNum = 0;
  for (let i = 1; i < salesRows.length; i++) {
    const id = String(salesRows[i][0] || '');
    const match = id.match(/SAL-(\\d+)/);
    if (match) {
      const n = parseInt(match[1], 10);
      if (n > maxNum) maxNum = n;
    }
  }
  const saleId = 'SAL-' + String(maxNum + 1).padStart(5, '0');

  const revenue = Math.round((qty * rate) * 100) / 100;
  const cogs = Math.round((qty * currentAvgCost) * 100) / 100;
  const grossProfit = Math.round((revenue - cogs) * 100) / 100;

  const dateStr = saleData.date || Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');
  const timeStr = saleData.time || Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'HH:mm:ss');
  const buyer = saleData.buyer || 'Walk-in';
  const paymentMethod = saleData.paymentMethod || 'Cash';
  const paymentStatus = paymentMethod === 'Credit' ? 'Credit' : 'Paid';

  salesSheet.appendRow([
    saleId, dateStr, timeStr, saleData.productId, productName,
    qty, rate, revenue, currentAvgCost, cogs,
    grossProfit, buyer, paymentMethod, paymentStatus, saleData.notes || ''
  ]);

  const currentSold = Number(stockRows[foundRowIndex - 1][6] || 0) + qty;
  const newCurrentStock = currentStock - qty;
  const newStockValue = Math.round((newCurrentStock * currentAvgCost) * 100) / 100;
  const threshold = Number(stockRows[foundRowIndex - 1][11] || 0);

  let status = 'NORMAL';
  if (newCurrentStock <= 0) status = 'OUT OF STOCK';
  else if (newCurrentStock <= threshold) status = 'LOW STOCK';

  stockSheet.getRange(foundRowIndex, 7).setValue(currentSold);
  stockSheet.getRange(foundRowIndex, 9).setValue(newCurrentStock);
  stockSheet.getRange(foundRowIndex, 11).setValue(newStockValue);
  stockSheet.getRange(foundRowIndex, 13).setValue(status);

  return { saleId, productName, quantityKg: qty, revenue, cogs, grossProfit, remainingStock: newCurrentStock };
}

function createPurchase(purchaseData) {
  if (!purchaseData.supplierId) throw new Error('Supplier is mandatory');
  if (!purchaseData.productId) throw new Error('Product is mandatory');
  const qty = Number(purchaseData.quantityKg);
  const rate = Number(purchaseData.purchaseRate);
  if (!qty || qty <= 0) throw new Error('Quantity must be greater than zero');
  if (!rate || rate <= 0) throw new Error('Purchase rate must be greater than zero');

  const totalAmount = Math.round((qty * rate) * 100) / 100;
  const amountPaid = Math.max(0, Number(purchaseData.amountPaid || 0));
  if (amountPaid > totalAmount) throw new Error('Amount paid cannot exceed total purchase amount of ₹' + totalAmount);
  const amountDue = Math.round((totalAmount - amountPaid) * 100) / 100;
  let paymentStatus = amountPaid === 0 ? 'Credit' : (amountPaid < totalAmount ? 'Partial' : 'Paid');

  const stockSheet = getSheet(SHEET_NAMES.STOCK);
  const stockRows = stockSheet.getDataRange().getValues();
  let foundRowIndex = -1;
  let currentStock = 0;
  let oldAvgCost = 0;
  let productName = purchaseData.productName || '';

  for (let i = 1; i < stockRows.length; i++) {
    if (String(stockRows[i][0]).trim() === purchaseData.productId) {
      foundRowIndex = i + 1;
      productName = String(stockRows[i][1]).trim();
      currentStock = Number(stockRows[i][8] || 0);
      oldAvgCost = Number(stockRows[i][9] || 0);
      break;
    }
  }

  if (foundRowIndex === -1) throw new Error('Product not found in stock sheet: ' + purchaseData.productId);

  const purSheet = getSheet(SHEET_NAMES.PURCHASES);
  const purRows = purSheet.getDataRange().getValues();
  let maxNum = 0;
  for (let i = 1; i < purRows.length; i++) {
    const id = String(purRows[i][0] || '');
    const match = id.match(/PUR-(\\d+)/);
    if (match) {
      const n = parseInt(match[1], 10);
      if (n > maxNum) maxNum = n;
    }
  }
  const purchaseId = 'PUR-' + String(maxNum + 1).padStart(5, '0');
  const dateStr = purchaseData.date || Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');
  const timeStr = purchaseData.time || Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'HH:mm:ss');

  purSheet.appendRow([
    purchaseId, dateStr, timeStr, purchaseData.supplierId, purchaseData.supplierName || 'Supplier',
    purchaseData.productId, productName, qty, rate,
    totalAmount, paymentStatus, amountPaid, amountDue,
    purchaseData.paymentMethod || 'Cash', purchaseData.notes || ''
  ]);

  const newCurrentStock = currentStock + qty;
  let newAvgCost = rate;
  if (currentStock > 0) {
    newAvgCost = ((currentStock * oldAvgCost) + (qty * rate)) / newCurrentStock;
  }
  newAvgCost = Math.round(newAvgCost * 100) / 100;
  const newStockValue = Math.round((newCurrentStock * newAvgCost) * 100) / 100;
  const currentPurchased = Number(stockRows[foundRowIndex - 1][5] || 0) + qty;
  const threshold = Number(stockRows[foundRowIndex - 1][11] || 0);

  let status = 'NORMAL';
  if (newCurrentStock <= 0) status = 'OUT OF STOCK';
  else if (newCurrentStock <= threshold) status = 'LOW STOCK';

  stockSheet.getRange(foundRowIndex, 6).setValue(currentPurchased);
  stockSheet.getRange(foundRowIndex, 9).setValue(newCurrentStock);
  stockSheet.getRange(foundRowIndex, 10).setValue(newAvgCost);
  stockSheet.getRange(foundRowIndex, 11).setValue(newStockValue);
  stockSheet.getRange(foundRowIndex, 13).setValue(status);

  return { purchaseId, totalAmount, amountDue, newCurrentStock, newAverageCost: newAvgCost };
}

function formatDate(val) {
  if (!val) return '';
  if (val instanceof Date) return Utilities.formatDate(val, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  return String(val).substring(0, 10);
}
`;
