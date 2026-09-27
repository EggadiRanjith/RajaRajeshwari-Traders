import fs from 'fs';
import path from 'path';
import {
  Product,
  Supplier,
  Sale,
  Purchase,
  Expense,
  StockItem,
  StockAdjustment,
  DashboardData,
  SheetStoreSettings
} from '../src/types/index';

const PERSISTENCE_FILE = path.resolve(process.cwd(), 'sheets_data_store.json');

// Default initial products matching requirements: P001 - P005
const INITIAL_PRODUCTS: Product[] = [
  { id: 'P001', name: 'White Onion', category: 'Vegetables', baseUnit: 'KG', lowStockThreshold: 50, active: true },
  { id: 'P002', name: 'Red Onion', category: 'Vegetables', baseUnit: 'KG', lowStockThreshold: 50, active: true },
  { id: 'P003', name: 'Ginger', category: 'Spices', baseUnit: 'KG', lowStockThreshold: 20, active: true },
  { id: 'P004', name: 'Garlic', category: 'Spices', baseUnit: 'KG', lowStockThreshold: 20, active: true },
  { id: 'P005', name: 'Potato', category: 'Vegetables', baseUnit: 'KG', lowStockThreshold: 50, active: true }
];

const INITIAL_STOCK: StockItem[] = INITIAL_PRODUCTS.map(p => ({
  productId: p.id,
  productName: p.name,
  category: p.category,
  baseUnit: p.baseUnit,
  openingStock: 0,
  purchased: 0,
  sold: 0,
  adjusted: 0,
  currentStock: 0,
  averageCost: 0,
  stockValue: 0,
  lowStockThreshold: p.lowStockThreshold,
  status: 'OUT OF STOCK'
}));

const INITIAL_SETTINGS: SheetStoreSettings = {
  sheetName: 'RajaRajeshwari Traders',
  appsScriptUrl: process.env.APPS_SCRIPT_URL || '',
  currency: '₹',
  defaultLowStockThreshold: 50,
  syncStatus: process.env.APPS_SCRIPT_URL ? 'connected' : 'demo',
  lastSyncTime: new Date().toISOString()
};

interface WorkbookState {
  products: Product[];
  suppliers: Supplier[];
  stock: StockItem[];
  sales: Sale[];
  purchases: Purchase[];
  expenses: Expense[];
  adjustments: StockAdjustment[];
  settings: SheetStoreSettings;
}

class SheetStore {
  private state: WorkbookState;

  constructor() {
    this.state = this.loadFromDisk();
  }

  private loadFromDisk(): WorkbookState {
    try {
      if (fs.existsSync(PERSISTENCE_FILE)) {
        const raw = fs.readFileSync(PERSISTENCE_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        if (parsed.products && parsed.stock) {
          return parsed;
        }
      }
    } catch (e) {
      console.error('Failed to load sheets_data_store.json, using defaults:', e);
    }

    return {
      products: INITIAL_PRODUCTS,
      suppliers: [],
      stock: INITIAL_STOCK,
      sales: [],
      purchases: [],
      expenses: [],
      adjustments: [],
      settings: INITIAL_SETTINGS
    };
  }

  private saveToDisk(): void {
    try {
      fs.writeFileSync(PERSISTENCE_FILE, JSON.stringify(this.state, null, 2), 'utf-8');
    } catch (e) {
      console.error('Failed to persist sheets_data_store.json:', e);
    }
  }

  public getSettings(): SheetStoreSettings {
    return this.state.settings;
  }

  public updateSettings(newSettings: Partial<SheetStoreSettings>): SheetStoreSettings {
    this.state.settings = { ...this.state.settings, ...newSettings };
    this.saveToDisk();
    return this.state.settings;
  }

  // 1. Products
  public getProducts(): Product[] {
    return this.state.products;
  }

  public createProduct(data: { name: string; category?: string; lowStockThreshold?: number }): Product {
    if (!data.name || !data.name.trim()) {
      throw new Error('Product name is required');
    }
    // Generate P001, P002...
    let maxNum = 0;
    this.state.products.forEach(p => {
      const m = p.id.match(/^P(\d+)$/);
      if (m) {
        const n = parseInt(m[1], 10);
        if (n > maxNum) maxNum = n;
      }
    });
    const id = 'P' + String(maxNum + 1).padStart(3, '0');
    const newProd: Product = {
      id,
      name: data.name.trim(),
      category: data.category?.trim() || 'Vegetables',
      baseUnit: 'KG',
      lowStockThreshold: data.lowStockThreshold || 50,
      active: true
    };
    this.state.products.push(newProd);

    // Also add to Stock
    this.state.stock.push({
      productId: id,
      productName: newProd.name,
      category: newProd.category,
      baseUnit: 'KG',
      openingStock: 0,
      purchased: 0,
      sold: 0,
      adjusted: 0,
      currentStock: 0,
      averageCost: 0,
      stockValue: 0,
      lowStockThreshold: newProd.lowStockThreshold,
      status: 'OUT OF STOCK'
    });

    this.saveToDisk();
    return newProd;
  }

  // 2. Suppliers
  public getSuppliers(): Supplier[] {
    // Recalculate balances dynamically from purchases
    return this.state.suppliers.map(sup => {
      let totalPurchases = 0;
      let totalPaid = 0;
      let lastDate = '';

      this.state.purchases.forEach(p => {
        if (p.supplierId === sup.id) {
          totalPurchases += p.totalAmount;
          totalPaid += p.amountPaid;
          if (!lastDate || p.date > lastDate) {
            lastDate = p.date;
          }
        }
      });

      return {
        ...sup,
        totalPurchases,
        totalPaid,
        outstanding: Math.max(0, totalPurchases - totalPaid),
        lastPurchaseDate: lastDate
      };
    });
  }

  public createSupplier(data: { name: string; phone?: string; address?: string; notes?: string }): Supplier {
    if (!data.name || !data.name.trim()) {
      throw new Error('Supplier name is required');
    }
    let maxNum = 0;
    this.state.suppliers.forEach(s => {
      const m = s.id.match(/^SUP-(\d+)$/);
      if (m) {
        const n = parseInt(m[1], 10);
        if (n > maxNum) maxNum = n;
      }
    });
    const id = 'SUP-' + String(maxNum + 1).padStart(3, '0');
    const newSup: Supplier = {
      id,
      name: data.name.trim(),
      phone: data.phone?.trim() || '',
      address: data.address?.trim() || '',
      notes: data.notes?.trim() || '',
      active: true,
      totalPurchases: 0,
      totalPaid: 0,
      outstanding: 0,
      lastPurchaseDate: ''
    };
    this.state.suppliers.push(newSup);
    this.saveToDisk();
    return newSup;
  }

  public updateSupplier(data: { id: string; name: string; phone?: string; address?: string; notes?: string; active?: boolean }): Supplier {
    const idx = this.state.suppliers.findIndex(s => s.id === data.id);
    if (idx === -1) throw new Error('Supplier not found: ' + data.id);
    this.state.suppliers[idx] = {
      ...this.state.suppliers[idx],
      name: data.name.trim(),
      phone: data.phone?.trim() || '',
      address: data.address?.trim() || '',
      notes: data.notes?.trim() || '',
      active: data.active !== undefined ? data.active : this.state.suppliers[idx].active
    };
    this.saveToDisk();
    return this.state.suppliers[idx];
  }

  // 3. Stock
  public getStock(): StockItem[] {
    return this.state.stock;
  }

  // 4. Sales
  public getSales(): Sale[] {
    return [...this.state.sales].reverse();
  }

  public createSale(data: {
    productId: string;
    productName?: string;
    quantityKg: number;
    sellingRate: number;
    buyer?: string;
    paymentMethod: 'Cash' | 'UPI' | 'Credit' | 'Other';
    notes?: string;
    date?: string;
    time?: string;
  }): Sale {
    const qty = Number(data.quantityKg);
    const rate = Number(data.sellingRate);

    if (!data.productId) throw new Error('Product is mandatory');
    if (!qty || qty <= 0) throw new Error('Quantity must be greater than zero');
    if (!rate || rate <= 0) throw new Error('Selling rate must be greater than zero');

    // Find in stock
    const stockItem = this.state.stock.find(s => s.productId === data.productId);
    if (!stockItem) throw new Error('Product not found in stock sheet: ' + data.productId);

    // CRITICAL: Check available stock. BLOCK THE SALE if insufficient
    if (qty > stockItem.currentStock) {
      throw new Error(`Insufficient stock. Available: ${stockItem.currentStock} KG.`);
    }

    // Generate unique Sale ID: SAL-00001
    let maxNum = 0;
    this.state.sales.forEach(s => {
      const m = s.id.match(/^SAL-(\d+)$/);
      if (m) {
        const n = parseInt(m[1], 10);
        if (n > maxNum) maxNum = n;
      }
    });
    const saleId = 'SAL-' + String(maxNum + 1).padStart(5, '0');

    const now = new Date();
    const dateStr = data.date || now.toISOString().split('T')[0];
    const timeStr = data.time || now.toTimeString().split(' ')[0];

    // Financial calculations:
    // Revenue = Quantity * Selling Rate
    // COGS = Quantity * current weighted average cost (captured at time of sale)
    // Gross Profit = Revenue - COGS
    const revenue = Math.round(qty * rate * 100) / 100;
    const costRate = stockItem.averageCost;
    const cogs = Math.round(qty * costRate * 100) / 100;
    const grossProfit = Math.round((revenue - cogs) * 100) / 100;

    const sale: Sale = {
      id: saleId,
      date: dateStr,
      time: timeStr,
      productId: stockItem.productId,
      productName: stockItem.productName,
      quantityKg: qty,
      sellingRate: rate,
      revenue,
      costRate,
      cogs,
      grossProfit,
      buyer: data.buyer?.trim() || 'Walk-in',
      paymentMethod: data.paymentMethod || 'Cash',
      paymentStatus: data.paymentMethod === 'Credit' ? 'Credit' : 'Paid',
      notes: data.notes?.trim() || ''
    };

    // Update stock item
    stockItem.sold += qty;
    stockItem.currentStock = Math.round((stockItem.currentStock - qty) * 1000) / 1000;
    stockItem.stockValue = Math.round(stockItem.currentStock * stockItem.averageCost * 100) / 100;

    if (stockItem.currentStock <= 0) {
      stockItem.status = 'OUT OF STOCK';
    } else if (stockItem.currentStock <= stockItem.lowStockThreshold) {
      stockItem.status = 'LOW STOCK';
    } else {
      stockItem.status = 'NORMAL';
    }

    this.state.sales.push(sale);
    this.saveToDisk();
    return sale;
  }

  // 5. Purchases
  public getPurchases(): Purchase[] {
    return [...this.state.purchases].reverse();
  }

  public createPurchase(data: {
    supplierId: string;
    supplierName?: string;
    productId: string;
    productName?: string;
    quantityKg: number;
    purchaseRate: number;
    amountPaid?: number;
    paymentMethod?: 'Cash' | 'UPI' | 'Credit' | 'Other';
    notes?: string;
    date?: string;
    time?: string;
  }): Purchase {
    const qty = Number(data.quantityKg);
    const rate = Number(data.purchaseRate);

    if (!data.supplierId) throw new Error('Supplier is mandatory');
    if (!data.productId) throw new Error('Product is mandatory');
    if (!qty || qty <= 0) throw new Error('Quantity must be greater than zero');
    if (!rate || rate <= 0) throw new Error('Purchase rate must be greater than zero');

    const totalAmount = Math.round(qty * rate * 100) / 100;
    const amountPaid = Math.max(0, Number(data.amountPaid || 0));

    if (amountPaid > totalAmount) {
      throw new Error(`Amount paid cannot exceed total purchase amount of ₹${totalAmount}`);
    }

    const amountDue = Math.round((totalAmount - amountPaid) * 100) / 100;
    let paymentStatus: 'Paid' | 'Partial' | 'Credit' = 'Paid';
    if (amountPaid === 0) {
      paymentStatus = 'Credit';
    } else if (amountPaid < totalAmount) {
      paymentStatus = 'Partial';
    }

    const stockItem = this.state.stock.find(s => s.productId === data.productId);
    if (!stockItem) throw new Error('Product not found in stock sheet: ' + data.productId);

    const supplier = this.state.suppliers.find(s => s.id === data.supplierId);
    const supplierName = supplier ? supplier.name : (data.supplierName || 'Supplier');

    // Generate PUR-00001
    let maxNum = 0;
    this.state.purchases.forEach(p => {
      const m = p.id.match(/^PUR-(\d+)$/);
      if (m) {
        const n = parseInt(m[1], 10);
        if (n > maxNum) maxNum = n;
      }
    });
    const purchaseId = 'PUR-' + String(maxNum + 1).padStart(5, '0');

    const now = new Date();
    const dateStr = data.date || now.toISOString().split('T')[0];
    const timeStr = data.time || now.toTimeString().split(' ')[0];

    const purchase: Purchase = {
      id: purchaseId,
      date: dateStr,
      time: timeStr,
      supplierId: data.supplierId,
      supplierName,
      productId: stockItem.productId,
      productName: stockItem.productName,
      quantityKg: qty,
      purchaseRate: rate,
      totalAmount,
      paymentStatus,
      amountPaid,
      amountDue,
      paymentMethod: data.paymentMethod || 'Cash',
      notes: data.notes?.trim() || ''
    };

    // MOVING WEIGHTED AVERAGE COST:
    // New Stock = Current Stock + Qty
    // New Avg Cost = ((Current Stock * Old Avg Cost) + (Qty * Rate)) / New Stock
    const currentStock = stockItem.currentStock;
    const oldAvgCost = stockItem.averageCost;
    const newStock = Math.round((currentStock + qty) * 1000) / 1000;

    let newAvgCost = rate;
    if (currentStock > 0) {
      newAvgCost = ((currentStock * oldAvgCost) + (qty * rate)) / newStock;
    }
    newAvgCost = Math.round(newAvgCost * 100) / 100;

    stockItem.purchased += qty;
    stockItem.currentStock = newStock;
    stockItem.averageCost = newAvgCost;
    stockItem.stockValue = Math.round(newStock * newAvgCost * 100) / 100;

    if (newStock <= 0) {
      stockItem.status = 'OUT OF STOCK';
    } else if (newStock <= stockItem.lowStockThreshold) {
      stockItem.status = 'LOW STOCK';
    } else {
      stockItem.status = 'NORMAL';
    }

    this.state.purchases.push(purchase);
    this.saveToDisk();
    return purchase;
  }

  // 6. Expenses
  public getExpenses(): Expense[] {
    return [...this.state.expenses].reverse();
  }

  public createExpense(data: {
    category: any;
    description: string;
    amount: number;
    paymentMethod: any;
    notes?: string;
    date?: string;
  }): Expense {
    const amt = Number(data.amount);
    if (!amt || amt <= 0) {
      throw new Error('Expense amount must be greater than zero');
    }

    let maxNum = 0;
    this.state.expenses.forEach(e => {
      const m = e.id.match(/^EXP-(\d+)$/);
      if (m) {
        const n = parseInt(m[1], 10);
        if (n > maxNum) maxNum = n;
      }
    });
    const expId = 'EXP-' + String(maxNum + 1).padStart(5, '0');
    const dateStr = data.date || new Date().toISOString().split('T')[0];

    const exp: Expense = {
      id: expId,
      date: dateStr,
      category: data.category || 'Other',
      description: data.description?.trim() || '',
      amount: amt,
      paymentMethod: data.paymentMethod || 'Cash',
      notes: data.notes?.trim() || ''
    };

    this.state.expenses.push(exp);
    this.saveToDisk();
    return exp;
  }

  // 7. Stock Adjustment
  public createStockAdjustment(data: {
    productId: string;
    adjustmentType: any;
    quantityKg: number;
    reason: string;
    notes?: string;
    date?: string;
  }): StockAdjustment {
    const qty = Number(data.quantityKg);
    if (!data.productId) throw new Error('Product is mandatory');
    if (!qty || isNaN(qty)) throw new Error('Quantity cannot be zero');
    if (!data.reason || !data.reason.trim()) {
      throw new Error('Every adjustment requires a reason');
    }

    const stockItem = this.state.stock.find(s => s.productId === data.productId);
    if (!stockItem) throw new Error('Product not found in stock sheet: ' + data.productId);

    const newStock = Math.round((stockItem.currentStock + qty) * 1000) / 1000;
    if (newStock < 0) {
      throw new Error(`Cannot reduce stock below zero. Current: ${stockItem.currentStock} KG.`);
    }

    let maxNum = 0;
    this.state.adjustments.forEach(a => {
      const m = a.id.match(/^ADJ-(\d+)$/);
      if (m) {
        const n = parseInt(m[1], 10);
        if (n > maxNum) maxNum = n;
      }
    });
    const adjId = 'ADJ-' + String(maxNum + 1).padStart(5, '0');
    const now = new Date();

    const adj: StockAdjustment = {
      id: adjId,
      date: data.date || now.toISOString().split('T')[0],
      time: now.toTimeString().split(' ')[0],
      productId: stockItem.productId,
      productName: stockItem.productName,
      adjustmentType: data.adjustmentType || 'Stock Correction',
      quantityKg: qty,
      reason: data.reason.trim(),
      notes: data.notes?.trim() || ''
    };

    stockItem.adjusted += qty;
    stockItem.currentStock = newStock;
    stockItem.stockValue = Math.round(newStock * stockItem.averageCost * 100) / 100;

    if (newStock <= 0) {
      stockItem.status = 'OUT OF STOCK';
    } else if (newStock <= stockItem.lowStockThreshold) {
      stockItem.status = 'LOW STOCK';
    } else {
      stockItem.status = 'NORMAL';
    }

    this.state.adjustments.push(adj);
    this.saveToDisk();
    return adj;
  }

  public getAdjustments(): StockAdjustment[] {
    return [...this.state.adjustments].reverse();
  }

  // 8. Dashboard Data
  public getDashboardData(filterPeriod: string = 'Today', customStart?: string, customEnd?: string): DashboardData {
    const today = new Date().toISOString().split('T')[0];
    
    // Filter ranges
    let filteredSales = this.state.sales;
    let filteredPurchases = this.state.purchases;
    let filteredExpenses = this.state.expenses;

    const getStartDate = (type: string): string => {
      const d = new Date();
      if (type === 'Today') return today;
      if (type === 'Yesterday') {
        d.setDate(d.getDate() - 1);
        return d.toISOString().split('T')[0];
      }
      if (type === 'This Week') {
        const day = d.getDay() || 7;
        d.setDate(d.getDate() - day + 1); // Monday
        return d.toISOString().split('T')[0];
      }
      if (type === 'This Month') {
        d.setDate(1);
        return d.toISOString().split('T')[0];
      }
      return customStart || '2000-01-01';
    };

    const startDate = getStartDate(filterPeriod);
    const endDate = filterPeriod === 'Yesterday' ? startDate : (customEnd || today);

    // Transactions within selected filter
    const inRange = (dStr: string) => dStr >= startDate && dStr <= endDate;

    filteredSales = this.state.sales.filter(s => inRange(s.date));
    filteredPurchases = this.state.purchases.filter(p => inRange(p.date));
    filteredExpenses = this.state.expenses.filter(e => inRange(e.date));

    let salesTotal = 0;
    let grossProfitTotal = 0;
    filteredSales.forEach(s => {
      salesTotal += s.revenue;
      grossProfitTotal += s.grossProfit;
    });

    let purchasesTotal = 0;
    filteredPurchases.forEach(p => {
      purchasesTotal += p.totalAmount;
    });

    let expensesTotal = 0;
    filteredExpenses.forEach(e => {
      expensesTotal += e.amount;
    });

    const netProfitTotal = grossProfitTotal - expensesTotal;

    // Overall current metrics
    let currentStockValue = 0;
    let lowStockCount = 0;
    let outOfStockCount = 0;
    const lowStockProducts: StockItem[] = [];

    this.state.stock.forEach(item => {
      currentStockValue += item.stockValue;
      if (item.status === 'LOW STOCK') {
        lowStockCount++;
        lowStockProducts.push(item);
      } else if (item.status === 'OUT OF STOCK') {
        outOfStockCount++;
        lowStockProducts.push(item);
      }
    });

    // Customer Credit (Credit sales outstanding)
    let customerCredit = 0;
    this.state.sales.forEach(s => {
      if (s.paymentMethod === 'Credit' || s.paymentStatus === 'Credit') {
        customerCredit += s.revenue;
      }
    });

    // Supplier Outstanding
    let supplierOutstanding = 0;
    this.state.purchases.forEach(p => {
      supplierOutstanding += p.amountDue;
    });

    // Sales Trend (Past 7 days)
    const salesTrend: Array<{ date: string; label: string; sales: number; profit: number; purchases: number }> = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dStr = d.toISOString().split('T')[0];
      const label = d.toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric' });

      let daySales = 0;
      let dayProfit = 0;
      let dayPurchases = 0;

      this.state.sales.forEach(s => {
        if (s.date === dStr) {
          daySales += s.revenue;
          dayProfit += s.grossProfit;
        }
      });

      this.state.purchases.forEach(p => {
        if (p.date === dStr) {
          dayPurchases += p.totalAmount;
        }
      });

      salesTrend.push({
        date: dStr,
        label,
        sales: Math.round(daySales * 100) / 100,
        profit: Math.round(dayProfit * 100) / 100,
        purchases: Math.round(dayPurchases * 100) / 100
      });
    }

    // Top selling products
    const productStats: Record<string, { name: string; qty: number; revenue: number; profit: number }> = {};
    filteredSales.forEach(s => {
      if (!productStats[s.productId]) {
        productStats[s.productId] = { name: s.productName, qty: 0, revenue: 0, profit: 0 };
      }
      productStats[s.productId].qty += s.quantityKg;
      productStats[s.productId].revenue += s.revenue;
      productStats[s.productId].profit += s.grossProfit;
    });

    const topSellingProducts = Object.keys(productStats)
      .map(id => ({
        productId: id,
        productName: productStats[id].name,
        quantityKg: Math.round(productStats[id].qty * 100) / 100,
        revenue: Math.round(productStats[id].revenue * 100) / 100,
        profit: Math.round(productStats[id].profit * 100) / 100
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    return {
      todaySales: Math.round(salesTotal * 100) / 100,
      todayGrossProfit: Math.round(grossProfitTotal * 100) / 100,
      todayNetProfit: Math.round(netProfitTotal * 100) / 100,
      todayPurchases: Math.round(purchasesTotal * 100) / 100,
      totalExpensesToday: Math.round(expensesTotal * 100) / 100,
      currentStockValue: Math.round(currentStockValue * 100) / 100,
      customerCredit: Math.round(customerCredit * 100) / 100,
      supplierOutstanding: Math.round(supplierOutstanding * 100) / 100,
      lowStockCount,
      outOfStockCount,
      lowStockProducts,
      salesTrend,
      topSellingProducts,
      recentSales: [...this.state.sales].reverse().slice(0, 5),
      recentPurchases: [...this.state.purchases].reverse().slice(0, 5),
      period: filterPeriod
    };
  }

  // Reset to initial clean state
  public resetToCleanState(): void {
    this.state = {
      products: INITIAL_PRODUCTS,
      suppliers: [],
      stock: INITIAL_PRODUCTS.map(p => ({
        productId: p.id,
        productName: p.name,
        category: p.category,
        baseUnit: p.baseUnit,
        openingStock: 0,
        purchased: 0,
        sold: 0,
        adjusted: 0,
        currentStock: 0,
        averageCost: 0,
        stockValue: 0,
        lowStockThreshold: p.lowStockThreshold,
        status: 'OUT OF STOCK'
      })),
      sales: [],
      purchases: [],
      expenses: [],
      adjustments: [],
      settings: this.state.settings
    };
    this.saveToDisk();
  }

  // Backup export
  public exportData(): WorkbookState {
    return this.state;
  }
}

export const sheetStore = new SheetStore();
