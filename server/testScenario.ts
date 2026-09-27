import { Product, Supplier, StockItem } from '../src/types/index';

export interface TestStepResult {
  step: number;
  description: string;
  expected: string;
  actual: string;
  passed: boolean;
  details?: any;
}

export interface ScenarioTestReport {
  timestamp: string;
  totalSteps: number;
  passedSteps: number;
  failedSteps: number;
  allPassed: boolean;
  steps: TestStepResult[];
}

export function runBusinessLogicScenario(): ScenarioTestReport {
  const steps: TestStepResult[] = [];
  let stepIndex = 1;

  // Sandbox state initialized
  const products: Product[] = [
    { id: 'P001', name: 'White Onion', category: 'Vegetables', baseUnit: 'KG', lowStockThreshold: 50, active: true },
    { id: 'P002', name: 'Red Onion', category: 'Vegetables', baseUnit: 'KG', lowStockThreshold: 50, active: true },
    { id: 'P003', name: 'Ginger', category: 'Spices', baseUnit: 'KG', lowStockThreshold: 20, active: true },
    { id: 'P004', name: 'Garlic', category: 'Spices', baseUnit: 'KG', lowStockThreshold: 20, active: true },
    { id: 'P005', name: 'Potato', category: 'Vegetables', baseUnit: 'KG', lowStockThreshold: 50, active: true }
  ];

  let stockItem: StockItem = {
    productId: 'P001',
    productName: 'White Onion',
    category: 'Vegetables',
    baseUnit: 'KG',
    openingStock: 0,
    purchased: 0,
    sold: 0,
    adjusted: 0,
    currentStock: 0,
    averageCost: 0,
    stockValue: 0,
    lowStockThreshold: 50,
    status: 'OUT OF STOCK'
  };

  const sales: any[] = [];
  const purchases: any[] = [];
  const expenses: any[] = [];
  const suppliers: Supplier[] = [];

  // Helper for purchase
  const doPurchase = (supplierId: string, supplierName: string, qty: number, rate: number, amountPaid: number) => {
    const totalAmount = Math.round(qty * rate * 100) / 100;
    const currentStock = stockItem.currentStock;
    const oldAvgCost = stockItem.averageCost;
    const newStock = currentStock + qty;

    let newAvgCost = rate;
    if (currentStock > 0) {
      newAvgCost = ((currentStock * oldAvgCost) + (qty * rate)) / newStock;
    }
    newAvgCost = Math.round(newAvgCost * 100) / 100;

    stockItem.purchased += qty;
    stockItem.currentStock = newStock;
    stockItem.averageCost = newAvgCost;
    stockItem.stockValue = Math.round(newStock * newAvgCost * 100) / 100;
    stockItem.status = newStock <= 0 ? 'OUT OF STOCK' : (newStock <= stockItem.lowStockThreshold ? 'LOW STOCK' : 'NORMAL');

    const pur = {
      id: `PUR-${String(purchases.length + 1).padStart(5, '0')}`,
      supplierId,
      supplierName,
      productId: 'P001',
      quantityKg: qty,
      purchaseRate: rate,
      totalAmount,
      amountPaid,
      amountDue: totalAmount - amountPaid
    };
    purchases.push(pur);
    return pur;
  };

  // Helper for sale
  const doSale = (qty: number, sellingRate: number, paymentMethod: 'Cash' | 'Credit', buyer = 'Customer') => {
    if (qty > stockItem.currentStock) {
      throw new Error(`Insufficient stock. Available: ${stockItem.currentStock} KG.`);
    }

    const revenue = Math.round(qty * sellingRate * 100) / 100;
    const costRate = stockItem.averageCost; // Moving weighted average at time of sale
    const cogs = Math.round(qty * costRate * 100) / 100;
    const grossProfit = Math.round((revenue - cogs) * 100) / 100;

    stockItem.sold += qty;
    stockItem.currentStock = Math.round((stockItem.currentStock - qty) * 1000) / 1000;
    stockItem.stockValue = Math.round(stockItem.currentStock * stockItem.averageCost * 100) / 100;
    stockItem.status = stockItem.currentStock <= 0 ? 'OUT OF STOCK' : (stockItem.currentStock <= stockItem.lowStockThreshold ? 'LOW STOCK' : 'NORMAL');

    const sale = {
      id: `SAL-${String(sales.length + 1).padStart(5, '0')}`,
      productId: 'P001',
      quantityKg: qty,
      sellingRate,
      revenue,
      costRate,
      cogs,
      grossProfit,
      buyer,
      paymentMethod
    };
    sales.push(sale);
    return sale;
  };

  // Step 1: Add Supplier A
  suppliers.push({ id: 'SUP-001', name: 'Supplier A', phone: '9876543210', address: 'Market Yard', active: true });
  steps.push({
    step: stepIndex++,
    description: 'Add Supplier A',
    expected: 'Supplier A created with ID SUP-001',
    actual: `Created ${suppliers[0].name} (${suppliers[0].id})`,
    passed: suppliers[0].id === 'SUP-001' && suppliers[0].name === 'Supplier A'
  });

  // Step 2: Add Supplier B
  suppliers.push({ id: 'SUP-002', name: 'Supplier B', phone: '9876543211', address: 'APMC Market', active: true });
  steps.push({
    step: stepIndex++,
    description: 'Add Supplier B',
    expected: 'Supplier B created with ID SUP-002',
    actual: `Created ${suppliers[1].name} (${suppliers[1].id})`,
    passed: suppliers[1].id === 'SUP-002' && suppliers[1].name === 'Supplier B'
  });

  // Step 3: Purchase 100 KG White Onion from Supplier A at ₹28
  const pur1 = doPurchase('SUP-001', 'Supplier A', 100, 28, 2800);
  steps.push({
    step: stepIndex++,
    description: 'Purchase 100 KG White Onion from Supplier A at ₹28',
    expected: 'Stock: 100 KG, Average Cost: ₹28',
    actual: `Stock: ${stockItem.currentStock} KG, Average Cost: ₹${stockItem.averageCost}`,
    passed: stockItem.currentStock === 100 && stockItem.averageCost === 28
  });

  // Step 4: Purchase 100 KG White Onion from Supplier B at ₹32
  const pur2 = doPurchase('SUP-002', 'Supplier B', 100, 32, 2000); // 1200 due
  steps.push({
    step: stepIndex++,
    description: 'Purchase 100 KG White Onion from Supplier B at ₹32',
    expected: 'Stock: 200 KG',
    actual: `Stock: ${stockItem.currentStock} KG`,
    passed: stockItem.currentStock === 200
  });

  // Step 5: Verify average cost = ₹30
  // (100 * 28 + 100 * 32) / 200 = 6000 / 200 = 30
  steps.push({
    step: stepIndex++,
    description: 'Verify average cost = ₹30',
    expected: '₹30/KG',
    actual: `₹${stockItem.averageCost}/KG`,
    passed: stockItem.averageCost === 30
  });

  // Step 6: Sell 10 KG White Onion at ₹36
  const sale1 = doSale(10, 36, 'Cash', 'Walk-in');
  steps.push({
    step: stepIndex++,
    description: 'Sell 10 KG White Onion at ₹36',
    expected: 'Sale recorded for 10 KG @ ₹36',
    actual: `Sale ${sale1.id}: 10 KG @ ₹${sale1.sellingRate}`,
    passed: sale1.quantityKg === 10 && sale1.sellingRate === 36
  });

  // Step 7: Verify revenue = ₹360
  steps.push({
    step: stepIndex++,
    description: 'Verify revenue = ₹360',
    expected: '₹360',
    actual: `₹${sale1.revenue}`,
    passed: sale1.revenue === 360
  });

  // Step 8: Verify COGS = ₹300 (10 KG * ₹30 avg cost)
  steps.push({
    step: stepIndex++,
    description: 'Verify COGS = ₹300',
    expected: '₹300',
    actual: `₹${sale1.cogs}`,
    passed: sale1.cogs === 300
  });

  // Step 9: Verify gross profit = ₹60 (₹360 - ₹300)
  steps.push({
    step: stepIndex++,
    description: 'Verify gross profit = ₹60',
    expected: '₹60',
    actual: `₹${sale1.grossProfit}`,
    passed: sale1.grossProfit === 60
  });

  // Step 10: Verify stock = 190 KG
  steps.push({
    step: stepIndex++,
    description: 'Verify stock = 190 KG',
    expected: '190 KG',
    actual: `${stockItem.currentStock} KG`,
    passed: stockItem.currentStock === 190
  });

  // Step 11: Purchase another 100 KG at ₹40
  // New average cost: (190 * 30 + 100 * 40) / 290 = (5700 + 4000) / 290 = 9700 / 290 ≈ 33.45
  const pur3 = doPurchase('SUP-001', 'Supplier A', 100, 40, 4000);
  steps.push({
    step: stepIndex++,
    description: 'Purchase another 100 KG at ₹40',
    expected: 'Total stock: 290 KG',
    actual: `Stock: ${stockItem.currentStock} KG`,
    passed: stockItem.currentStock === 290
  });

  // Step 12: Verify new average cost: (190 * 30 + 100 * 40) / 290 = ₹33.45
  const expectedNewAvg = Math.round(((190 * 30 + 100 * 40) / 290) * 100) / 100; // 33.45
  steps.push({
    step: stepIndex++,
    description: 'Verify new average cost',
    expected: `₹${expectedNewAvg}/KG`,
    actual: `₹${stockItem.averageCost}/KG`,
    passed: stockItem.averageCost === expectedNewAvg
  });

  // Step 13: Verify the previous sale still has COGS = ₹300
  const firstSale = sales[0];
  steps.push({
    step: stepIndex++,
    description: 'Verify previous sale still has COGS = ₹300 (No retroactive mutation)',
    expected: 'COGS: ₹300, Gross Profit: ₹60',
    actual: `COGS: ₹${firstSale.cogs}, Gross Profit: ₹${firstSale.grossProfit}`,
    passed: firstSale.cogs === 300 && firstSale.grossProfit === 60
  });

  // Step 14 & 15: Try selling more than available stock (try selling 300 KG when stock is 290)
  let saleBlocked = false;
  let blockErrorMessage = '';
  try {
    doSale(300, 45, 'Cash');
  } catch (err: any) {
    saleBlocked = true;
    blockErrorMessage = err.message;
  }

  steps.push({
    step: stepIndex++,
    description: 'Try selling more than available stock (300 KG vs 290 KG available)',
    expected: 'Operation throws Insufficient Stock error',
    actual: saleBlocked ? 'Caught exception as expected' : 'Allowed sale (FAIL)',
    passed: saleBlocked
  });

  steps.push({
    step: stepIndex++,
    description: 'Verify the sale is blocked with exact user message',
    expected: 'Insufficient stock. Available: 290 KG.',
    actual: blockErrorMessage,
    passed: blockErrorMessage.includes('Insufficient stock. Available: 290 KG.')
  });

  // Step 16: Add an expense (Transport: ₹25)
  expenses.push({ id: 'EXP-00001', category: 'Transport', amount: 25, description: 'Tempo tempo delivery', paymentMethod: 'Cash' });
  steps.push({
    step: stepIndex++,
    description: 'Add an expense (Transport: ₹25)',
    expected: 'Expense EXP-00001 added with amount ₹25',
    actual: `Recorded ${expenses[0].id}: ₹${expenses[0].amount}`,
    passed: expenses[0].amount === 25
  });

  // Step 17: Verify net profit (Gross Profit ₹60 - Expenses ₹25 = ₹35)
  const totalGrossProfit = sales.reduce((sum, s) => sum + s.grossProfit, 0);
  const totalExp = expenses.reduce((sum, e) => sum + e.amount, 0);
  const netProfit = totalGrossProfit - totalExp;
  steps.push({
    step: stepIndex++,
    description: 'Verify net profit = Gross Profit (₹60) - Expenses (₹25) = ₹35',
    expected: '₹35',
    actual: `₹${netProfit}`,
    passed: netProfit === 35
  });

  // Step 18: Add a credit sale (10 KG @ ₹38 to Hotel Annapoorna)
  const creditSale = doSale(10, 38, 'Credit', 'Hotel Annapoorna');
  steps.push({
    step: stepIndex++,
    description: 'Add a credit sale (10 KG @ ₹38 to Hotel Annapoorna)',
    expected: 'Credit sale recorded, Buyer: Hotel Annapoorna, Revenue: ₹380',
    actual: `Sale ${creditSale.id}: ₹${creditSale.revenue} on Credit to ${creditSale.buyer}`,
    passed: creditSale.paymentMethod === 'Credit' && creditSale.revenue === 380 && creditSale.buyer === 'Hotel Annapoorna'
  });

  // Step 19: Verify customer credit (₹380)
  const totalCustomerCredit = sales
    .filter(s => s.paymentMethod === 'Credit')
    .reduce((sum, s) => sum + s.revenue, 0);
  steps.push({
    step: stepIndex++,
    description: 'Verify customer credit',
    expected: '₹380',
    actual: `₹${totalCustomerCredit}`,
    passed: totalCustomerCredit === 380
  });

  // Step 20: Verify supplier outstanding
  // Pur 1: Total 2800, Paid 2800 -> 0
  // Pur 2: Total 3200, Paid 2000 -> 1200 due
  // Pur 3: Total 4000, Paid 4000 -> 0
  // Total Supplier Outstanding = 1200
  const totalSupplierOutstanding = purchases.reduce((sum, p) => sum + p.amountDue, 0);
  steps.push({
    step: stepIndex++,
    description: 'Verify supplier outstanding',
    expected: '₹1200',
    actual: `₹${totalSupplierOutstanding}`,
    passed: totalSupplierOutstanding === 1200
  });

  // Step 21: Verify low-stock status
  // Current stock is 280 KG (Threshold is 50 KG) -> NORMAL.
  // Now let's sell 240 KG to reach 40 KG (which is <= 50 KG threshold)
  doSale(240, 38, 'Cash', 'Wholesale Buyer');
  steps.push({
    step: stepIndex++,
    description: 'Verify low-stock status triggers when stock drops to 40 KG (Threshold = 50 KG)',
    expected: 'Current Stock: 40 KG, Status: LOW STOCK',
    actual: `Current Stock: ${stockItem.currentStock} KG, Status: ${stockItem.status}`,
    passed: stockItem.currentStock === 40 && stockItem.status === 'LOW STOCK'
  });

  const passedSteps = steps.filter(s => s.passed).length;

  return {
    timestamp: new Date().toISOString(),
    totalSteps: steps.length,
    passedSteps,
    failedSteps: steps.length - passedSteps,
    allPassed: passedSteps === steps.length,
    steps
  };
}
