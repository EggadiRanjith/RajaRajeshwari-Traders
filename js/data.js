/* ── Wastage & Spoilage Ledger (Inventory Writedowns / Loss) ── */
const WASTAGE = [
  { id: 'WST-001', date: '2026-09-26', productId: 1, lotId: 'PO-001', supplierId: 1, quantity: 15, unitCost: 28.00, lossAmount: 420.00, reason: 'Rot / Spoilage', notes: 'Moisture decay in bottom sack' },
  { id: 'WST-002', date: '2026-09-25', productId: 6, lotId: 'PO-004', supplierId: 2, quantity: 20, unitCost: 21.00, lossAmount: 420.00, reason: 'Transit Damage', notes: 'Crushed crates during unloading' },
  { id: 'WST-003', date: '2026-09-24', productId: 7, lotId: 'PO-005', supplierId: 3, quantity: 12, unitCost: 17.50, lossAmount: 210.00, reason: 'Moisture Weight Loss', notes: 'Natural transit shrinkage' },
];

/* =============================================================
   RAJARAJESHWARI TRADERS
   Data layer — all business mock data for the application.
   Structured realistically for a vegetable wholesale/retail
   operation in Tamil Nadu, India.
   Features: Seller-Lot Tracking, Zero-Credit Policy,
   Customer Segmentation & Multi-Dimensional P&L Engine.
   ============================================================= */

'use strict';

/* ── Business Configuration ── */
const BUSINESS = {
  name: 'RajaRajeshwari Traders',
  shortName: 'RRT',
  tagline: 'Retail & Wholesale',
  owner: 'R. Venkatesh',
  location: 'Hosur, Tamil Nadu',
  gstin: '33AAACR1234M1ZT',
  phone: '+91 94432 18765',
  email: 'rrt@example.com',
  currency: '₹',
  fy_start: '2026-04-01',
};

/* ── Products ── */
const PRODUCTS = [
  { id: 1,  name: 'White Onion',   unit: 'KG', avgCost: 28.50, currentStock: 245, reorderLevel: 50,  category: 'Onion' },
  { id: 2,  name: 'Red Onion',     unit: 'KG', avgCost: 30.00, currentStock: 86,  reorderLevel: 50,  category: 'Onion' },
  { id: 3,  name: 'Small Onion',   unit: 'KG', avgCost: 36.00, currentStock: 54,  reorderLevel: 30,  category: 'Onion' },
  { id: 4,  name: 'Garlic',        unit: 'KG', avgCost: 40.00, currentStock: 18,  reorderLevel: 20,  category: 'Spice' },
  { id: 5,  name: 'Ginger',        unit: 'KG', avgCost: 54.00, currentStock: 32,  reorderLevel: 25,  category: 'Spice' },
  { id: 6,  name: 'Tomato',        unit: 'KG', avgCost: 21.00, currentStock: 0,   reorderLevel: 30,  category: 'Vegetable' },
  { id: 7,  name: 'Potato',        unit: 'KG', avgCost: 17.50, currentStock: 178, reorderLevel: 40,  category: 'Vegetable' },
  { id: 8,  name: 'Shallot',       unit: 'KG', avgCost: 34.00, currentStock: 64,  reorderLevel: 30,  category: 'Onion' },
  { id: 9,  name: 'Green Chilli',  unit: 'KG', avgCost: 46.00, currentStock: 12,  reorderLevel: 15,  category: 'Spice' },
  { id: 10, name: 'Drumstick',     unit: 'Bundle', avgCost: 18.00, currentStock: 40, reorderLevel: 10, category: 'Vegetable' },
];

function getProductById(id) { return PRODUCTS.find(p => p.id === id); }

function getStockStatus(product) {
  if (product.currentStock === 0) return 'out';
  if (product.currentStock <= product.reorderLevel) return 'low';
  return 'healthy';
}

function getStockValue() {
  return PRODUCTS.reduce((sum, p) => sum + p.currentStock * p.avgCost, 0);
}

/* ── Suppliers (Sellers) — Zero Credit Policy ── */
const SUPPLIERS = [
  { id: 1, name: 'Narayanan Agro Farms',   phone: '9443218765', location: 'Krishnagiri',      category: 'Onion & Garlic',   status: 'active',   totalPurchases: 186400, outstanding: 0 },
  { id: 2, name: 'Selvam Vegetables',       phone: '9876543210', location: 'Hosur',             category: 'Mixed Vegetables', status: 'active',   totalPurchases: 94200,  outstanding: 0 },
  { id: 3, name: 'Murugan Trading Co.',     phone: '8012345678', location: 'Bangalore',         category: 'Potato & Ginger',  status: 'active',   totalPurchases: 72800,  outstanding: 0 },
  { id: 4, name: 'Parvathi Spice Traders',  phone: '7654321098', location: 'Erode',             category: 'Spices',           status: 'active',   totalPurchases: 48600,  outstanding: 0 },
  { id: 5, name: 'Kamatchi Agri Supply',    phone: '9512348765', location: 'Salem',             category: 'Onion',            status: 'inactive', totalPurchases: 28400,  outstanding: 0 },
];

function getSupplierById(id) { return SUPPLIERS.find(s => s.id === id); }

/* ── Expense Categories ── */
const EXPENSE_CATEGORIES = [
  'Labour',
  'Transport',
  'Electricity',
  'Rent',
  'Cold Storage',
  'Packing Material',
  'Equipment Maintenance',
  'Miscellaneous',
];

/* ── Dates Helper ── */
function d(daysAgo) {
  const dt = new Date('2026-09-27');
  dt.setDate(dt.getDate() - daysAgo);
  return dt.toISOString().slice(0, 10);
}

function fmtDate(iso) {
  if (!iso || typeof iso !== 'string' || !iso.includes('-')) return '—';
  const parts = iso.split('-');
  if (parts.length < 3) return iso;
  const [y, m, day] = parts;
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const monthIdx = parseInt(m, 10) - 1;
  return `${parseInt(day, 10)} ${months[monthIdx] || m} ${y}`;
}

/* ── Purchases Data (Active Seller Lots) — Zero Credit Policy ── */
const PURCHASES = [
  { id: 'P020', date: d(0),  supplierId: 1, productId: 1, quantity: 500, totalCost: 14250, rate: 28.50, targetRate: 36.00, remainingQty: 420, payment: 'Bank',   amountPaid: 14250, status: 'paid' },
  { id: 'P019', date: d(1),  supplierId: 3, productId: 7, quantity: 300, totalCost: 5340,  rate: 17.80, targetRate: 24.00, remainingQty: 240, payment: 'UPI',    amountPaid: 5340,  status: 'paid' },
  { id: 'P018', date: d(2),  supplierId: 1, productId: 2, quantity: 200, totalCost: 6000,  rate: 30.00, targetRate: 38.00, remainingQty: 155, payment: 'Bank',   amountPaid: 6000,  status: 'paid' },
  { id: 'P017', date: d(3),  supplierId: 2, productId: 6, quantity: 100, totalCost: 2100,  rate: 21.00, targetRate: 28.00, remainingQty: 50,  payment: 'Cash',   amountPaid: 2100,  status: 'paid' },
  { id: 'P016', date: d(4),  supplierId: 4, productId: 9, quantity: 50,  totalCost: 2300,  rate: 46.00, targetRate: 62.00, remainingQty: 20,  payment: 'UPI',    amountPaid: 2300,  status: 'paid' },
  { id: 'P015', date: d(5),  supplierId: 1, productId: 4, quantity: 100, totalCost: 4000,  rate: 40.00, targetRate: 55.00, remainingQty: 50,  payment: 'Bank',   amountPaid: 4000,  status: 'paid' },
  { id: 'P014', date: d(6),  supplierId: 3, productId: 5, quantity: 80,  totalCost: 4320,  rate: 54.00, targetRate: 68.00, remainingQty: 60,  payment: 'UPI',    amountPaid: 4320,  status: 'paid' },
  { id: 'P013', date: d(7),  supplierId: 2, productId: 8, quantity: 150, totalCost: 5100,  rate: 34.00, targetRate: 43.00, remainingQty: 75,  payment: 'Bank',   amountPaid: 5100,  status: 'paid' },
  { id: 'P012', date: d(9),  supplierId: 1, productId: 1, quantity: 400, totalCost: 11200, rate: 28.00, targetRate: 35.00, remainingQty: 0,   payment: 'Bank',   amountPaid: 11200, status: 'paid' },
  { id: 'P011', date: d(10), supplierId: 4, productId: 4, quantity: 80,  totalCost: 3160,  rate: 39.50, targetRate: 54.00, remainingQty: 0,   payment: 'UPI',    amountPaid: 3160,  status: 'paid' },
  { id: 'P010', date: d(11), supplierId: 3, productId: 7, quantity: 200, totalCost: 3500,  rate: 17.50, targetRate: 23.50, remainingQty: 0,   payment: 'Cash',   amountPaid: 3500,  status: 'paid' },
  { id: 'P009', date: d(12), supplierId: 2, productId: 6, quantity: 150, totalCost: 3075,  rate: 20.50, targetRate: 27.50, remainingQty: 0,   payment: 'UPI',    amountPaid: 3075,  status: 'paid' },
  { id: 'P008', date: d(14), supplierId: 1, productId: 2, quantity: 250, totalCost: 7375,  rate: 29.50, targetRate: 37.00, remainingQty: 0,   payment: 'Bank',   amountPaid: 7375,  status: 'paid' },
  { id: 'P007', date: d(15), supplierId: 5, productId: 3, quantity: 100, totalCost: 3600,  rate: 36.00, targetRate: 45.00, remainingQty: 0,   payment: 'Cash',   amountPaid: 3600,  status: 'paid' },
  { id: 'P006', date: d(16), supplierId: 1, productId: 1, quantity: 300, totalCost: 8250,  rate: 27.50, targetRate: 34.00, remainingQty: 0,   payment: 'Bank',   amountPaid: 8250,  status: 'paid' },
  { id: 'P005', date: d(18), supplierId: 4, productId: 9, quantity: 60,  totalCost: 2700,  rate: 45.00, targetRate: 60.00, remainingQty: 0,   payment: 'UPI',    amountPaid: 2700,  status: 'paid' },
  { id: 'P004', date: d(20), supplierId: 3, productId: 5, quantity: 60,  totalCost: 3180,  rate: 53.00, targetRate: 66.00, remainingQty: 0,   payment: 'Cash',   amountPaid: 3180,  status: 'paid' },
  { id: 'P003', date: d(21), supplierId: 2, productId: 7, quantity: 250, totalCost: 4250,  rate: 17.00, targetRate: 23.00, remainingQty: 0,   payment: 'Bank',   amountPaid: 4250,  status: 'paid' },
  { id: 'P002', date: d(24), supplierId: 1, productId: 1, quantity: 500, totalCost: 13500, rate: 27.00, targetRate: 33.50, remainingQty: 0,   payment: 'Bank',   amountPaid: 13500, status: 'paid' },
  { id: 'P001', date: d(28), supplierId: 4, productId: 8, quantity: 100, totalCost: 3300,  rate: 33.00, targetRate: 42.00, remainingQty: 0,   payment: 'UPI',    amountPaid: 3300,  status: 'paid' },
];

function getLotById(id) { return PURCHASES.find(p => p.id === id); }

function getActiveLots(productId) {
  return PURCHASES.filter(p => p.productId === productId && (p.remainingQty === undefined || p.remainingQty > 0))
                  .sort((a, b) => b.date.localeCompare(a.date));
}

/* ── Sales Data (Last 30 Days) — Zero Credit, Lot-Tied & Customer Categorized ── */
const SALES = [
  // Today Sep 27
  { id: 'S040', date: d(0), productId: 1, lotId: 'P020', supplierId: 1, quantity: 80,  rate: 35.00, targetRate: 36.00, payment: 'UPI',  customerType: 'Hotel',      buyer: 'Hotel Sri Balaji',  status: 'paid' },
  { id: 'S039', date: d(0), productId: 2, lotId: 'P018', supplierId: 1, quantity: 45,  rate: 38.00, targetRate: 38.00, payment: 'Cash', customerType: 'Walk-in',    buyer: 'Walk-in',           status: 'paid' },
  { id: 'S038', date: d(0), productId: 7, lotId: 'P019', supplierId: 3, quantity: 60,  rate: 24.00, targetRate: 24.00, payment: 'UPI',  customerType: 'Shopkeeper', buyer: 'Ravi Stores',       status: 'paid' },
  { id: 'S037', date: d(0), productId: 5, lotId: 'P014', supplierId: 3, quantity: 20,  rate: 68.00, targetRate: 68.00, payment: 'UPI',  customerType: 'Hotel',      buyer: 'Priya Mess',        status: 'paid' },
  // Sep 26
  { id: 'S036', date: d(1), productId: 1, lotId: 'P020', supplierId: 1, quantity: 200, rate: 34.50, targetRate: 36.00, payment: 'Bank', customerType: 'Shopkeeper', buyer: 'AVM Supermarket',   status: 'paid' },
  { id: 'S035', date: d(1), productId: 4, lotId: 'P015', supplierId: 1, quantity: 50,  rate: 55.00, targetRate: 55.00, payment: 'UPI',  customerType: 'Hotel',      buyer: 'Saravana Mess',     status: 'paid' },
  { id: 'S034', date: d(1), productId: 2, lotId: 'P018', supplierId: 1, quantity: 80,  rate: 39.00, targetRate: 38.00, payment: 'Bank', customerType: 'Hotel',      buyer: 'Lakshmi Hotel',     status: 'paid' },
  { id: 'S033', date: d(1), productId: 8, lotId: 'P013', supplierId: 2, quantity: 75,  rate: 43.00, targetRate: 43.00, payment: 'Cash', customerType: 'Walk-in',    buyer: 'Walk-in',           status: 'paid' },
  { id: 'S032', date: d(1), productId: 9, lotId: 'P016', supplierId: 4, quantity: 30,  rate: 62.00, targetRate: 62.00, payment: 'UPI',  customerType: 'Shopkeeper', buyer: 'Subramani Stores',  status: 'paid' },
  // Sep 25
  { id: 'S031', date: d(2), productId: 1, lotId: 'P020', supplierId: 1, quantity: 180, rate: 34.00, targetRate: 36.00, payment: 'UPI',  customerType: 'Shopkeeper', buyer: 'Nithya Provisions', status: 'paid' },
  { id: 'S030', date: d(2), productId: 3, lotId: 'P007', supplierId: 5, quantity: 60,  rate: 46.00, targetRate: 45.00, payment: 'Cash', customerType: 'Walk-in',    buyer: 'Walk-in',           status: 'paid' },
  { id: 'S029', date: d(2), productId: 7, lotId: 'P019', supplierId: 3, quantity: 120, rate: 23.50, targetRate: 24.00, payment: 'Bank', customerType: 'Hotel',      buyer: 'Metro Canteen',     status: 'paid' },
  { id: 'S028', date: d(2), productId: 5, lotId: 'P014', supplierId: 3, quantity: 15,  rate: 68.00, targetRate: 68.00, payment: 'UPI',  customerType: 'Hotel',      buyer: 'Vijay Mess',        status: 'paid' },
  // Sep 24
  { id: 'S027', date: d(3), productId: 1, lotId: 'P020', supplierId: 1, quantity: 150, rate: 33.50, targetRate: 36.00, payment: 'UPI',  customerType: 'Hotel',      buyer: 'Hotel Sri Balaji',  status: 'paid' },
  { id: 'S026', date: d(3), productId: 2, lotId: 'P018', supplierId: 1, quantity: 70,  rate: 37.50, targetRate: 38.00, payment: 'Bank', customerType: 'Hotel',      buyer: 'Lakshmi Hotel',     status: 'paid' },
  { id: 'S025', date: d(3), productId: 4, lotId: 'P015', supplierId: 1, quantity: 40,  rate: 54.00, targetRate: 55.00, payment: 'Cash', customerType: 'Walk-in',    buyer: 'Walk-in',           status: 'paid' },
  { id: 'S024', date: d(3), productId: 7, lotId: 'P019', supplierId: 3, quantity: 80,  rate: 23.00, targetRate: 24.00, payment: 'UPI',  customerType: 'Shopkeeper', buyer: 'Ravi Stores',       status: 'paid' },
  // Sep 23
  { id: 'S023', date: d(4), productId: 1, lotId: 'P020', supplierId: 1, quantity: 130, rate: 33.00, targetRate: 36.00, payment: 'UPI',  customerType: 'Shopkeeper', buyer: 'AVM Supermarket',   status: 'paid' },
  { id: 'S022', date: d(4), productId: 6, lotId: 'P017', supplierId: 2, quantity: 50,  rate: 28.00, targetRate: 28.00, payment: 'Cash', customerType: 'Walk-in',    buyer: 'Walk-in',           status: 'paid' },
  { id: 'S021', date: d(4), productId: 8, lotId: 'P013', supplierId: 2, quantity: 60,  rate: 42.00, targetRate: 43.00, payment: 'UPI',  customerType: 'Shopkeeper', buyer: 'Subramani Stores',  status: 'paid' },
  { id: 'S020', date: d(4), productId: 5, lotId: 'P014', supplierId: 3, quantity: 10,  rate: 66.00, targetRate: 68.00, payment: 'UPI',  customerType: 'Hotel',      buyer: 'Priya Mess',        status: 'paid' },
  // Sep 22
  { id: 'S019', date: d(5), productId: 1, lotId: 'P012', supplierId: 1, quantity: 160, rate: 34.00, targetRate: 35.00, payment: 'Bank', customerType: 'Hotel',      buyer: 'Metro Canteen',     status: 'paid' },
  { id: 'S018', date: d(5), productId: 3, lotId: 'P007', supplierId: 5, quantity: 40,  rate: 45.00, targetRate: 45.00, payment: 'Cash', customerType: 'Walk-in',    buyer: 'Walk-in',           status: 'paid' },
  { id: 'S017', date: d(5), productId: 7, lotId: 'P010', supplierId: 3, quantity: 100, rate: 22.50, targetRate: 23.50, payment: 'UPI',  customerType: 'Shopkeeper', buyer: 'Nithya Provisions', status: 'paid' },
  { id: 'S016', date: d(5), productId: 4, lotId: 'P011', supplierId: 4, quantity: 35,  rate: 53.00, targetRate: 54.00, payment: 'UPI',  customerType: 'Hotel',      buyer: 'Saravana Mess',     status: 'paid' },
  // Sep 21
  { id: 'S015', date: d(6), productId: 1, lotId: 'P012', supplierId: 1, quantity: 120, rate: 33.00, targetRate: 35.00, payment: 'UPI',  customerType: 'Hotel',      buyer: 'Hotel Sri Balaji',  status: 'paid' },
  { id: 'S014', date: d(6), productId: 2, lotId: 'P008', supplierId: 1, quantity: 60,  rate: 37.00, targetRate: 37.00, payment: 'Cash', customerType: 'Walk-in',    buyer: 'Walk-in',           status: 'paid' },
  { id: 'S013', date: d(6), productId: 7, lotId: 'P010', supplierId: 3, quantity: 90,  rate: 22.00, targetRate: 23.50, payment: 'UPI',  customerType: 'Shopkeeper', buyer: 'Ravi Stores',       status: 'paid' },
  // Sep 20-15
  { id: 'S012', date: d(7),  productId: 1, lotId: 'P012', supplierId: 1, quantity: 100, rate: 32.50, targetRate: 35.00, payment: 'Cash', customerType: 'Walk-in',    buyer: 'Walk-in',          status: 'paid' },
  { id: 'S011', date: d(7),  productId: 5, lotId: 'P004', supplierId: 3, quantity: 20,  rate: 65.00, targetRate: 66.00, payment: 'UPI',  customerType: 'Hotel',      buyer: 'Vijay Mess',       status: 'paid' },
  { id: 'S010', date: d(8),  productId: 1, lotId: 'P012', supplierId: 1, quantity: 140, rate: 32.00, targetRate: 35.00, payment: 'UPI',  customerType: 'Shopkeeper', buyer: 'AVM Supermarket',  status: 'paid' },
  { id: 'S009', date: d(8),  productId: 3, lotId: 'P007', supplierId: 5, quantity: 50,  rate: 44.00, targetRate: 45.00, payment: 'Cash', customerType: 'Walk-in',    buyer: 'Walk-in',          status: 'paid' },
  { id: 'S008', date: d(9),  productId: 2, lotId: 'P008', supplierId: 1, quantity: 80,  rate: 36.00, targetRate: 37.00, payment: 'UPI',  customerType: 'Hotel',      buyer: 'Lakshmi Hotel',    status: 'paid' },
  { id: 'S007', date: d(10), productId: 7, lotId: 'P003', supplierId: 2, quantity: 150, rate: 21.00, targetRate: 23.00, payment: 'Bank', customerType: 'Hotel',      buyer: 'Metro Canteen',    status: 'paid' },
  { id: 'S006', date: d(11), productId: 1, lotId: 'P006', supplierId: 1, quantity: 90,  rate: 31.50, targetRate: 34.00, payment: 'UPI',  customerType: 'Shopkeeper', buyer: 'Subramani Stores', status: 'paid' },
  { id: 'S005', date: d(12), productId: 4, lotId: 'P011', supplierId: 4, quantity: 30,  rate: 52.00, targetRate: 54.00, payment: 'Cash', customerType: 'Walk-in',    buyer: 'Walk-in',          status: 'paid' },
  { id: 'S004', date: d(14), productId: 1, lotId: 'P006', supplierId: 1, quantity: 200, rate: 31.00, targetRate: 34.00, payment: 'Bank', customerType: 'Shopkeeper', buyer: 'AVM Supermarket',  status: 'paid' },
  { id: 'S003', date: d(14), productId: 8, lotId: 'P001', supplierId: 4, quantity: 80,  rate: 41.00, targetRate: 42.00, payment: 'UPI',  customerType: 'Hotel',      buyer: 'Hotel Sri Balaji', status: 'paid' },
  { id: 'S002', date: d(16), productId: 2, lotId: 'P008', supplierId: 1, quantity: 70,  rate: 36.50, targetRate: 37.00, payment: 'UPI',  customerType: 'Hotel',      buyer: 'Priya Mess',       status: 'paid' },
  { id: 'S001', date: d(18), productId: 7, lotId: 'P003', supplierId: 2, quantity: 120, rate: 20.50, targetRate: 23.00, payment: 'Cash', customerType: 'Walk-in',    buyer: 'Walk-in',          status: 'paid' },
];

/* ── Expenses Data ── */
const EXPENSES = [
  { id: 'E020', date: d(0),  category: 'Labour',               description: 'Loading & Unloading - White Onion 500KG',  amount: 500,  paidBy: 'Cash'  },
  { id: 'E019', date: d(1),  category: 'Transport',            description: 'Vehicle hire - Krishnagiri run',           amount: 1200, paidBy: 'Cash'  },
  { id: 'E018', date: d(2),  category: 'Packing Material',     description: 'Gunny bags - 200 nos',                     amount: 800,  paidBy: 'UPI'   },
  { id: 'E017', date: d(3),  category: 'Labour',               description: 'Loading - Potato 300KG',                   amount: 300,  paidBy: 'Cash'  },
  { id: 'E016', date: d(4),  category: 'Cold Storage',         description: 'Monthly cold storage charges',             amount: 3500, paidBy: 'Bank'  },
  { id: 'E015', date: d(5),  category: 'Transport',            description: 'Auto delivery - Hosur local',              amount: 250,  paidBy: 'Cash'  },
  { id: 'E014', date: d(7),  category: 'Electricity',          description: 'EB bill - Sep 2026',                       amount: 1840, paidBy: 'UPI'   },
  { id: 'E013', date: d(9),  category: 'Labour',               description: 'Weighing & Sorting - Onion lot',           amount: 450,  paidBy: 'Cash'  },
  { id: 'E012', date: d(10), category: 'Miscellaneous',        description: 'Tea & refreshments for workers',           amount: 180,  paidBy: 'Cash'  },
  { id: 'E011', date: d(12), category: 'Equipment Maintenance',description: 'Weighing scale calibration',               amount: 650,  paidBy: 'Cash'  },
  { id: 'E010', date: d(14), category: 'Packing Material',     description: 'Plastic bags & twine',                    amount: 420,  paidBy: 'UPI'   },
  { id: 'E009', date: d(15), category: 'Transport',            description: 'Vehicle hire - Salem run',                 amount: 1500, paidBy: 'Cash'  },
  { id: 'E008', date: d(16), category: 'Labour',               description: 'Unloading - Mixed vegetables lot',         amount: 350,  paidBy: 'Cash'  },
  { id: 'E007', date: d(18), category: 'Rent',                 description: 'Shop rent - Sep 2026',                    amount: 8000, paidBy: 'Bank'  },
  { id: 'E006', date: d(20), category: 'Miscellaneous',        description: 'Stationery and printing',                  amount: 280,  paidBy: 'Cash'  },
  { id: 'E005', date: d(21), category: 'Labour',               description: 'Daily wages - 3 workers',                  amount: 900,  paidBy: 'Cash'  },
  { id: 'E004', date: d(22), category: 'Transport',            description: 'Tempo hire - Garlic lot',                  amount: 900,  paidBy: 'Cash'  },
  { id: 'E003', date: d(24), category: 'Cold Storage',         description: 'Weekly charges - onion storage',           amount: 800,  paidBy: 'Bank'  },
  { id: 'E002', date: d(26), category: 'Packing Material',     description: 'Mesh bags - 100 nos',                      amount: 350,  paidBy: 'UPI'   },
  { id: 'E001', date: d(28), category: 'Labour',               description: 'Casual labour - loading day',              amount: 600,  paidBy: 'Cash'  },
];

/* ── Computed Metrics & Lot Valuation ── */

function saleAmount(s) { return s.quantity * s.rate; }

function saleCost(s) {
  if (s.lotId) {
    const lot = getLotById(s.lotId);
    if (lot && lot.rate) return s.quantity * lot.rate;
  }
  const p = getProductById(s.productId);
  return p ? s.quantity * p.avgCost : 0;
}

function saleProfit(s) { return saleAmount(s) - saleCost(s); }

function purchaseTotal(p) { return p.totalCost || (p.quantity * p.rate); }
function purchaseDue(p) { return 0; /* Strict Zero-Credit Policy: Purchases are settled */ }

/* Filter sales by period: 'today', '7d', '30d', 'custom' (range), 'single' */
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
  const today = '2026-09-27';
  const cutoffs = { today: d(0), '7d': d(6), '30d': d(29) };
  const cutoff = cutoffs[period] || cutoffs['7d'];
  return SALES.filter(s => s.date >= cutoff && s.date <= today);
}

function filterPurchasesByPeriod(period, customFrom, customTo) {
  if (typeof period === 'object' && period !== null) {
    customFrom = period.from;
    customTo   = period.to;
    period     = 'custom';
  }
  if ((period === 'custom' || period === 'range') && customFrom && customTo) {
    return PURCHASES.filter(p => p.date >= customFrom && p.date <= customTo);
  }
  if (period === 'single' && customFrom) {
    return PURCHASES.filter(p => p.date === customFrom);
  }
  const today = '2026-09-27';
  const cutoffs = { today: d(0), '7d': d(6), '30d': d(29) };
  const cutoff = cutoffs[period] || cutoffs['7d'];
  return PURCHASES.filter(p => p.date >= cutoff && p.date <= today);
}

function filterExpensesByPeriod(period, customFrom, customTo) {
  if (typeof period === 'object' && period !== null) {
    customFrom = period.from;
    customTo   = period.to;
    period     = 'custom';
  }
  if ((period === 'custom' || period === 'range') && customFrom && customTo) {
    return EXPENSES.filter(e => e.date >= customFrom && e.date <= customTo);
  }
  if (period === 'single' && customFrom) {
    return EXPENSES.filter(e => e.date === customFrom);
  }
  const today = '2026-09-27';
  const cutoffs = { today: d(0), '7d': d(6), '30d': d(29) };
  const cutoff = cutoffs[period] || cutoffs['7d'];
  return EXPENSES.filter(e => e.date >= cutoff && e.date <= today);
}

function filterWastageByPeriod(period, customFrom, customTo) {
  if (period === 'all') return WASTAGE;
  if (period === 'today') return WASTAGE.filter(w => w.date === '2026-09-27');
  if (period === '7d')    return WASTAGE.filter(w => w.date >= '2026-09-21' && w.date <= '2026-09-27');
  if (period === '30d')   return WASTAGE.filter(w => w.date >= '2026-08-29' && w.date <= '2026-09-27');
  if (period === 'single' && customFrom) return WASTAGE.filter(w => w.date === customFrom);
  if (customFrom && customTo) return WASTAGE.filter(w => w.date >= customFrom && w.date <= customTo);
  return WASTAGE;
}

function getWastageStats(period, customFrom, customTo) {
  const list = filterWastageByPeriod(period, customFrom, customTo);
  const totalWeight = list.reduce((s, w) => s + w.quantity, 0);
  const totalLoss = list.reduce((s, w) => s + w.lossAmount, 0);
  const byReason = {};
  list.forEach(w => {
    byReason[w.reason] = (byReason[w.reason] || 0) + w.lossAmount;
  });
  return { list, totalWeight, totalLoss, count: list.length, byReason };
}

function recordWastage(entry) {
  const p = getProductById(entry.productId);
  const lot = getLotById(entry.lotId);
  const unitCost = lot ? lot.rate : (p ? p.avgCost : 0);
  const lossAmount = entry.quantity * unitCost;
  const newId = 'WST-' + String(WASTAGE.length + 1).padStart(3, '0');

  if (p) {
    p.currentStock = Math.max(0, p.currentStock - entry.quantity);
  }
  if (lot && lot.remainingQty !== undefined) {
    lot.remainingQty = Math.max(0, lot.remainingQty - entry.quantity);
  }

  const record = {
    id: newId,
    date: entry.date || '2026-09-27',
    productId: entry.productId,
    lotId: entry.lotId || null,
    supplierId: lot ? lot.supplierId : 1,
    quantity: entry.quantity,
    unitCost: unitCost,
    lossAmount: lossAmount,
    reason: entry.reason || 'Rot / Spoilage',
    notes: entry.notes || ''
  };

  WASTAGE.unshift(record);
  return record;
}

function getBuyerRevenueSummary(period, customFrom, customTo) {
  const sales = filterSalesByPeriod(period, customFrom, customTo);
  const buyersMap = {};

  sales.forEach(s => {
    const name = s.buyer || 'Walk-in';
    const tier = s.customerType || 'Walk-in';
    const amt = saleAmount(s);
    const profit = saleProfit(s);

    if (!buyersMap[name]) {
      buyersMap[name] = {
        name,
        customerType: tier,
        totalQty: 0,
        totalRevenue: 0,
        totalProfit: 0,
        orderCount: 0
      };
    }
    buyersMap[name].totalQty += s.quantity;
    buyersMap[name].totalRevenue += amt;
    buyersMap[name].totalProfit += profit;
    buyersMap[name].orderCount += 1;
  });

  return Object.values(buyersMap).sort((a, b) => b.totalRevenue - a.totalRevenue);
}

function getProductVelocity() {
  const todaySales = filterSalesByPeriod('today');
  const weekSales  = filterSalesByPeriod('7d');

  return PRODUCTS.map(p => {
    const soldToday = todaySales
      .filter(s => s.productId === p.id)
      .reduce((sum, s) => sum + s.quantity, 0);
    const sold7Days = weekSales
      .filter(s => s.productId === p.id)
      .reduce((sum, s) => sum + s.quantity, 0);

    const runRate = sold7Days / 7;
    const daysOfStock = runRate > 0 ? (p.currentStock / runRate).toFixed(1) : '99+';

    let velocityStatus = 'healthy';
    if (p.currentStock === 0) velocityStatus = 'out';
    else if (p.currentStock <= p.reorderLevel) velocityStatus = 'low';
    else if (soldToday > runRate * 1.4) velocityStatus = 'fast-moving';

    return {
      product: p,
      currentStock: p.currentStock,
      soldToday,
      sold7Days,
      runRate: runRate.toFixed(1),
      daysOfStock,
      velocityStatus
    };
  });
}

function computeKPIs(period, customFrom, customTo) {
  const sales = filterSalesByPeriod(period, customFrom, customTo);
  const purchases = filterPurchasesByPeriod(period, customFrom, customTo);
  const expenses = filterExpensesByPeriod(period, customFrom, customTo);
  const wastageStats = getWastageStats(period, customFrom, customTo);

  const revenue = sales.reduce((s, x) => s + saleAmount(x), 0);
  const cogs    = sales.reduce((s, x) => s + saleCost(x), 0);
  const grossProfit = revenue - cogs;
  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);
  const totalWastageLoss = wastageStats.totalLoss;
  const totalWastageWeight = wastageStats.totalWeight;
  const netProfit = grossProfit - totalExpenses - totalWastageLoss;
  const totalPurchases = purchases.reduce((s, p) => s + purchaseTotal(p), 0);
  const stockValue = getStockValue();
  const realizedMargin = revenue > 0 ? ((grossProfit / revenue) * 100).toFixed(1) : '0.0';

  return { revenue, cogs, grossProfit, netProfit, totalPurchases, stockValue, totalExpenses, totalWastageLoss, totalWastageWeight, realizedMargin };
}

/* ── P&L Analytics Engine by Product ── */
function getPnLByProduct(period, customFrom, customTo) {
  const sales = filterSalesByPeriod(period, customFrom, customTo);
  const byProd = {};
  PRODUCTS.forEach(p => {
    byProd[p.id] = { product: p, qty: 0, revenue: 0, cogs: 0, profit: 0, txnCount: 0 };
  });

  sales.forEach(s => {
    if (!byProd[s.productId]) {
      const p = getProductById(s.productId);
      byProd[s.productId] = { product: p, qty: 0, revenue: 0, cogs: 0, profit: 0, txnCount: 0 };
    }
    const amt = saleAmount(s);
    const cost = saleCost(s);
    const prof = amt - cost;
    byProd[s.productId].qty += s.quantity;
    byProd[s.productId].revenue += amt;
    byProd[s.productId].cogs += cost;
    byProd[s.productId].profit += prof;
    byProd[s.productId].txnCount += 1;
  });

  return Object.values(byProd).map(item => ({
    ...item,
    marginPct: item.revenue > 0 ? ((item.profit / item.revenue) * 100).toFixed(1) : '0.0'
  })).sort((a, b) => b.profit - a.profit);
}

/* ── P&L Analytics Engine by Seller / Supplier ── */
function getPnLBySeller(period, customFrom, customTo) {
  const sales = filterSalesByPeriod(period, customFrom, customTo);
  const bySeller = {};
  SUPPLIERS.forEach(sup => {
    bySeller[sup.id] = { supplier: sup, lotsCount: 0, qtySold: 0, revenue: 0, cogs: 0, profit: 0, txnCount: 0 };
  });

  PURCHASES.forEach(p => {
    if (bySeller[p.supplierId]) {
      bySeller[p.supplierId].lotsCount += 1;
    }
  });

  sales.forEach(s => {
    const lot = s.lotId ? getLotById(s.lotId) : null;
    const supId = s.supplierId || (lot ? lot.supplierId : 1);
    if (!bySeller[supId]) {
      const sup = getSupplierById(supId) || { id: supId, name: 'Direct Farm Sourcing' };
      bySeller[supId] = { supplier: sup, lotsCount: 0, qtySold: 0, revenue: 0, cogs: 0, profit: 0, txnCount: 0 };
    }
    const amt = saleAmount(s);
    const cost = saleCost(s);
    const prof = amt - cost;
    bySeller[supId].qtySold += s.quantity;
    bySeller[supId].revenue += amt;
    bySeller[supId].cogs += cost;
    bySeller[supId].profit += prof;
    bySeller[supId].txnCount += 1;
  });

  return Object.values(bySeller).map(item => ({
    ...item,
    roiPct: item.cogs > 0 ? ((item.profit / item.cogs) * 100).toFixed(1) : '0.0'
  })).sort((a, b) => b.profit - a.profit);
}

/* ── Customer Segment Intelligence (Walk-in, Shopkeeper, Hotel) ── */
function getCustomerTypeStats(period, customFrom, customTo) {
  const sales = filterSalesByPeriod(period, customFrom, customTo);
  const segments = {
    'Walk-in':    { type: 'Walk-in',    label: 'Walk-in (Retail)',       revenue: 0, qty: 0, count: 0, products: {} },
    'Shopkeeper': { type: 'Shopkeeper', label: 'Shopkeeper (Reseller)',   revenue: 0, qty: 0, count: 0, products: {} },
    'Hotel':      { type: 'Hotel',      label: 'Hotel (Commercial)',      revenue: 0, qty: 0, count: 0, products: {} },
  };

  sales.forEach(s => {
    const type = s.customerType || 'Walk-in';
    const seg = segments[type] || segments['Walk-in'];
    const amt = saleAmount(s);
    seg.revenue += amt;
    seg.qty += s.quantity;
    seg.count += 1;
    const p = getProductById(s.productId);
    const prodName = p ? p.name : 'Other';
    seg.products[prodName] = (seg.products[prodName] || 0) + s.quantity;
  });

  return segments;
}

/* ── Daily trend (period-aware): labels, revenue[], profit[] ── */
function getRevenueTrend() {
  return getDailyTrend('7d');
}

function getDailyTrend(period, customFrom, customTo) {
  let dateList = [];
  if ((period === 'custom' || period === 'range') && customFrom && customTo) {
    let curr = new Date(customFrom + 'T00:00:00');
    const end = new Date(customTo + 'T00:00:00');
    while (curr <= end && dateList.length < 90) {
      const y = curr.getFullYear();
      const m = String(curr.getMonth() + 1).padStart(2, '0');
      const day = String(curr.getDate()).padStart(2, '0');
      dateList.push(`${y}-${m}-${day}`);
      curr.setDate(curr.getDate() + 1);
    }
  } else if (period === 'single' && customFrom) {
    dateList = [customFrom];
  } else {
    const nDays = { today: 1, '7d': 7, '30d': 30 }[period] || 7;
    for (let i = nDays - 1; i >= 0; i--) {
      dateList.push(d(i));
    }
  }

  // Single-day intraday curve (7 intervals: 9 AM - 9 PM)
  if (dateList.length === 1) {
    const singleDate = dateList[0];
    const labels = ['9 AM', '11 AM', '1 PM', '3 PM', '5 PM', '7 PM', '9 PM'];
    if (singleDate === d(0)) {
      return {
        labels,
        revenue: [1360, 1440, 0, 1710, 0, 2800, 0],
        profit:  [300, 360, -500, 360, 0, 320, 0],
      };
    }
    const daySales    = SALES.filter(s => s.date === singleDate);
    const dayExpenses = EXPENSES.filter(e => e.date === singleDate);
    const totRev = daySales.reduce((s, x) => s + saleAmount(x), 0);
    const totCogs = daySales.reduce((s, x) => s + saleCost(x), 0);
    const totExp = dayExpenses.reduce((s, e) => s + e.amount, 0);
    const totProfit = totRev - totCogs - totExp;

    if (totRev === 0) {
      return {
        labels,
        revenue: [0, 0, 0, 0, 0, 0, 0],
        profit: [0, 0, Math.round(-totExp), 0, 0, 0, 0],
      };
    }

    const weights = [0.18, 0.20, 0.05, 0.23, 0.04, 0.30, 0.00];
    const revArr = weights.map(w => Math.round(totRev * w));
    const profitArr = weights.map(w => Math.round(totProfit * w));
    const rDiff = totRev - revArr.reduce((s, v) => s + v, 0);
    revArr[5] += rDiff;
    return { labels, revenue: revArr, profit: profitArr };
  }

  const labels = [];
  const revenue = [];
  const profit = [];
  const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

  dateList.forEach(dateStr => {
    const dt = new Date(dateStr + 'T00:00:00');
    labels.push(dateList.length <= 7 ? days[dt.getDay()] : dateStr.slice(5));

    const daySales    = SALES.filter(s => s.date === dateStr);
    const dayExpenses = EXPENSES.filter(e => e.date === dateStr);

    const rev  = daySales.reduce((s, x) => s + saleAmount(x), 0);
    const cogs = daySales.reduce((s, x) => s + saleCost(x), 0);
    const exp  = dayExpenses.reduce((s, e) => s + e.amount, 0);

    revenue.push(Math.round(rev));
    profit.push(Math.round(rev - cogs - exp));
  });

  return { labels, revenue, profit };
}

/* ── Daily purchase trend ── */
function getDailyPurchaseTrend(period) {
  const nDays = { today: 1, '7d': 7, '30d': 30 }[period] || 7;
  const labels = [];
  const values = [];
  const days   = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

  for (let i = nDays - 1; i >= 0; i--) {
    const dateStr = d(i);
    const dt = new Date(dateStr);
    labels.push(nDays <= 7 ? days[dt.getDay()] : dateStr.slice(5));
    const dayPurchases = PURCHASES.filter(p => p.date === dateStr);
    values.push(Math.round(dayPurchases.reduce((s, p) => s + purchaseTotal(p), 0)));
  }

  return { labels, values };
}

/* ── Sales by Product ── */
function getSalesByProduct(period, customFrom, customTo) {
  const sales = filterSalesByPeriod(period, customFrom, customTo);
  const map = {};
  sales.forEach(s => {
    const p = getProductById(s.productId);
    if (!p) return;
    map[p.name] = (map[p.name] || 0) + saleAmount(s);
  });
  const entries = Object.entries(map).sort((a,b) => b[1]-a[1]);
  return {
    labels: entries.map(e => e[0]),
    values: entries.map(e => Math.round(e[1])),
  };
}

/* ── Payment method distribution — Strictly Cash, UPI, Bank ── */
function getPaymentDistribution(period, customFrom, customTo) {
  const sales = filterSalesByPeriod(period, customFrom, customTo);
  const map = { 'Cash': 0, 'UPI': 0, 'Bank': 0 };
  sales.forEach(s => {
    const p = s.payment === 'Credit' ? 'Cash' : s.payment;
    map[p] = (map[p] || 0) + saleAmount(s);
  });
  return map;
}

function getPaymentBreakdown(period, customFrom, customTo) {
  const map = getPaymentDistribution(period, customFrom, customTo);
  const entries = Object.entries(map).sort((a, b) => b[1] - a[1]);
  return {
    labels: entries.map(e => e[0]),
    values: entries.map(e => Math.round(e[1])),
  };
}

/* ── Stock items for inventory ── */
function getStockItems() {
  return PRODUCTS.map(p => ({
    ...p,
    stockValue: p.currentStock * p.avgCost,
    status: getStockStatus(p),
  }));
}

/* ── Outstanding credit — Zeroed out under Zero-Credit Policy ── */
function getOutstandingCredit() {
  return [];
}

/* ── Recent transactions (period-aware) ── */
function getRecentTransactions(n = 10, period, customFrom, customTo) {
  let list = SALES;
  if (period && period !== 'all') {
    list = filterSalesByPeriod(period, customFrom, customTo);
  }
  return list.slice().sort((a, b) => b.date.localeCompare(a.date)).slice(0, n);
}

function getPurchaseDues() {
  return []; /* Strict Zero-Credit Policy: Zero payables overdue */
}

/* ── Format currency & numbers ── */
function fmt(num, decimals = 0) {
  if (num === undefined || num === null) return '—';
  return '₹' + Number(num).toLocaleString('en-IN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function fmtNum(num, decimals = 0) {
  return Number(num).toLocaleString('en-IN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function fmtK(num) {
  if (num >= 100000) return '₹' + (num / 100000).toFixed(1) + 'L';
  if (num >= 1000)   return '₹' + (num / 1000).toFixed(1) + 'K';
  return '₹' + Math.round(num);
}

/* Export as globals */
window.RT = {
  BUSINESS, PRODUCTS, SUPPLIERS, EXPENSE_CATEGORIES, SALES, PURCHASES, EXPENSES, WASTAGE,
  getProductById, getSupplierById, getStockStatus, getStockValue,
  getLotById, getActiveLots,
  saleAmount, saleCost, saleProfit,
  purchaseTotal, purchaseDue,
  filterSalesByPeriod, filterPurchasesByPeriod, filterExpensesByPeriod, filterWastageByPeriod,
  getWastageStats, recordWastage, getBuyerRevenueSummary, getProductVelocity,
  computeKPIs, getPnLByProduct, getPnLBySeller, getCustomerTypeStats,
  getRevenueTrend, getDailyTrend, getDailyPurchaseTrend,
  getSalesByProduct, getPaymentDistribution, getPaymentBreakdown,
  getStockItems, getOutstandingCredit, getRecentTransactions, getPurchaseDues,
  fmt, fmtNum, fmtK, fmtDate, d,
};
