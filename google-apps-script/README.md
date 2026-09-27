# RajaRajeshwari Traders — Google Sheets Database Backend

## Architecture

```
Your Browser (Vanilla HTML/JS App)
        ↕ fetch() over HTTPS
Google Apps Script (Code.gs — serverless backend)
        ↕ SpreadsheetApp API
Google Sheets (free cloud database)
        ↕
8 Sheets: PRODUCTS | STOCK | SUPPLIERS | PURCHASES | SALES | WASTAGE | EXPENSES | SETTINGS
```

**Cost: ₹0. Forever.**

---

## Setup Instructions (One-Time, ~10 Minutes)

### Step 1 — Create the Google Sheet
1. Go to [sheets.google.com](https://sheets.google.com)
2. Create a new blank spreadsheet
3. Rename it to **"RajaRajeshwari Traders"**

### Step 2 — Add the Apps Script
1. In the spreadsheet, click **Extensions → Apps Script**
2. Delete any existing code in `Code.gs`
3. Copy the ENTIRE contents of `/google-apps-script/Code.gs` from this project
4. Paste it into the Apps Script editor
5. Click **Save** (Ctrl+S)
6. Name the project: `RajaRajeshwari_Traders_API`

### Step 3 — Initialize the Database
1. In the Apps Script editor toolbar, select `initWorkbookSheets` from the function dropdown
2. Click **Run** (▶)
3. Google will ask for authorization — click **Review Permissions**
4. If you see "Google hasn't verified this app", click **Advanced → Go to RajaRajeshwari_Traders_API (unsafe)**
5. Click **Allow**
6. Wait for the success alert: "All 8 sheets initialized"

### Step 4 — Deploy as Web App
1. Click **Deploy → New deployment**
2. Click the gear icon → Select **Web app**
3. Configure:
   - **Description**: `RRT Database API v2.0`
   - **Execute as**: `Me (your email)`
   - **Who has access**: `Anyone`
4. Click **Deploy**
5. Copy the **Web App URL** (looks like: `https://script.google.com/macros/s/AKfycbx.../exec`)

### Step 5 — Connect Your Web App
Paste the Web App URL into your web application's settings. The app will use this URL for all data operations.

---

## Sheet Schema (8 Sheets)

### PRODUCTS
| Column | Type | Description |
|--------|------|-------------|
| Product ID | Text | Primary key (PRD-001 to PRD-005) |
| Product Name | Text | White Onion, Red Onion, Garlic, Ginger, Potato |
| Category | Text | Onion / Spice / Vegetable |
| Unit | Text | KG |
| Reorder Level | Number | Low stock alert threshold |
| Active | Boolean | TRUE / FALSE |

### STOCK (Live Inventory Ledger)
| Column | Type | Description |
|--------|------|-------------|
| Product ID | Text | FK → PRODUCTS |
| Product Name | Text | Denormalized for readability |
| Category | Text | |
| Unit | Text | KG |
| Opening Stock | Number | Initial stock when system started |
| Purchased | Number | Total KG purchased (running sum) |
| Sold | Number | Total KG sold (running sum) |
| Wasted | Number | Total KG wasted/spoiled (running sum) |
| Adjusted | Number | Manual adjustments |
| Current Stock | Number | = Opening + Purchased - Sold - Wasted + Adjusted |
| Average Cost | Currency | Weighted average purchase cost per KG |
| Stock Value | Currency | = Current Stock × Average Cost |
| Reorder Level | Number | Alert threshold |
| Status | Text | HEALTHY / LOW STOCK / OUT OF STOCK |

### SUPPLIERS
| Column | Type | Description |
|--------|------|-------------|
| Supplier ID | Text | Auto-generated: SUP-001, SUP-002... |
| Supplier Name | Text | Business name |
| Phone | Text | 10-digit mobile |
| Location | Text | City/town |
| Supply Category | Text | What they primarily supply |
| Status | Text | Active / Inactive |

### PURCHASES (Lot Intake Ledger)
| Column | Type | Description |
|--------|------|-------------|
| Lot ID | Text | Auto-generated: P001, P002... |
| Date | Date | YYYY-MM-DD |
| Supplier ID | Text | FK → SUPPLIERS |
| Supplier Name | Text | Denormalized |
| Product ID | Text | FK → PRODUCTS |
| Product Name | Text | Denormalized |
| Total Qty | Number | Total inward weight (KG) |
| Total Cost | Currency | Total invoice paid to supplier |
| Unit Cost | Currency | = Total Cost ÷ Total Qty (auto-calculated) |
| Target Rate | Currency | Expected selling rate set at intake |
| Remaining Qty | Number | Unsold qty in this lot (updated on every sale/wastage) |
| Payment Mode | Text | Cash / UPI / Bank |
| Payment Status | Text | Always "Paid" (Zero-Credit Policy) |

### SALES (Counter Billing Ledger)
| Column | Type | Description |
|--------|------|-------------|
| Invoice ID | Text | Auto-generated: S001, S002... |
| Date | Date | YYYY-MM-DD |
| Product ID | Text | FK → PRODUCTS |
| Product Name | Text | Denormalized |
| Lot ID | Text | FK → PURCHASES (which lot was sold) |
| Supplier ID | Text | FK → SUPPLIERS (lot's supplier) |
| Supplier Name | Text | Denormalized |
| Sold Qty | Number | Billed weight (KG) |
| Selling Rate | Currency | Actual price charged to customer |
| Target Rate | Currency | Target rate from the lot |
| Revenue | Currency | = Sold Qty × Selling Rate |
| COGS | Currency | = Sold Qty × Unit Cost (from lot) |
| Gross Profit | Currency | = Revenue - COGS |
| Customer Type | Text | Walk-in / Shopkeeper / Hotel |
| Buyer | Text | Customer name or "Walk-in" |
| Payment Mode | Text | Cash / UPI / Bank |
| Payment Status | Text | Always "Paid" (Zero-Credit Policy) |

### WASTAGE (Spoilage & Loss Ledger)
| Column | Type | Description |
|--------|------|-------------|
| Wastage ID | Text | Auto-generated: WST-001, WST-002... |
| Date | Date | YYYY-MM-DD |
| Product ID | Text | FK → PRODUCTS |
| Product Name | Text | Denormalized |
| Lot ID | Text | FK → PURCHASES |
| Supplier ID | Text | FK → SUPPLIERS |
| Wasted Qty | Number | Damaged/spoiled weight (KG) |
| Unit Cost | Currency | Per-KG cost from the lot |
| Loss Amount | Currency | = Wasted Qty × Unit Cost |
| Reason | Text | Rot / Spoilage, Transit Damage, Moisture Weight Loss, Grade Rejection |
| Notes | Text | Free-text description |

### EXPENSES (Operating Overhead)
| Column | Type | Description |
|--------|------|-------------|
| Expense ID | Text | Auto-generated: EXP-001, EXP-002... |
| Date | Date | YYYY-MM-DD |
| Category | Text | Labour, Transport, Electricity, Rent, Cold Storage, etc. |
| Description | Text | Specific memo |
| Amount | Currency | ₹ payout |
| Payment Mode | Text | Cash / UPI / Bank |
| Paid To | Text | Payee name |

### SETTINGS (Business Configuration)
| Key | Value |
|-----|-------|
| Business Name | RajaRajeshwari Traders |
| Owner | R. Venkatesh |
| Location | Hosur, Tamil Nadu |
| Currency | ₹ |
| Unit | KG |
| Credit Policy | ZERO CREDIT — All transactions paid at receipt |
| Version | 2.0 |

---

## API Endpoints

### GET Actions (via `?action=`)
| Action | Parameters | Returns |
|--------|-----------|---------|
| `ping` | — | Health check |
| `getProducts` | — | All 5 products |
| `getStock` | — | Live inventory levels |
| `getSuppliers` | — | All suppliers with purchase totals |
| `getPurchases` | — | All purchase lots |
| `getActiveLots` | `productId` | Lots with remaining qty > 0 |
| `getSales` | `filter`, `from`, `to` | Sales (filtered) |
| `getWastage` | `filter`, `from`, `to` | Wastage records (filtered) |
| `getExpenses` | `filter`, `from`, `to` | Expenses (filtered) |
| `getDashboardData` | `filter`, `from`, `to` | Executive KPI summary |
| `getPnLByProduct` | `filter`, `from`, `to` | P&L per product |
| `getPnLBySeller` | `filter`, `from`, `to` | P&L per supplier |
| `getCustomerTypeStats` | `filter`, `from`, `to` | Revenue by Walk-in/Shopkeeper/Hotel |
| `getBuyerRevenueSummary` | `filter`, `from`, `to` | Revenue by individual buyer |
| `getProductVelocity` | — | Stock velocity matrix |

**Filter values**: `today`, `7d`, `30d`, `custom` (with `from`/`to`), `single` (with `from`), `all`

### POST Actions (via JSON body)
| Action | Payload | What it does |
|--------|---------|-------------|
| `createPurchase` | `{ supplierId, productId, totalQty, totalCost, targetRate, payment }` | Records lot, updates stock & avg cost |
| `createSale` | `{ productId, lotId, quantity, rate, customerType, buyer, payment }` | Bills sale, deducts lot & stock |
| `createWastage` | `{ productId, lotId, quantity, reason, notes }` | Records loss, deducts lot & stock |
| `createExpense` | `{ category, description, amount, paidBy }` | Logs operating expense |
| `createSupplier` | `{ name, phone, location, category }` | Adds new vendor |
| `updateSupplier` | `{ id, name?, phone?, location?, status? }` | Updates vendor info |

---

## Business Rules Enforced

1. **Zero-Credit Policy**: No Credit, No Due, No Outstanding. Every transaction is marked "Paid" at creation. No exceptions.
2. **Lot-Based FIFO Tracking**: Every sale links to a specific purchase lot. Remaining quantity per lot is atomically decremented.
3. **Weighted Average Costing**: `newAvgCost = ((currentStock × oldAvgCost) + (newQty × newRate)) / (currentStock + newQty)`
4. **Negative Stock Blocking**: Sales and wastage that would push stock below zero are rejected with explicit error messages.
5. **Script Lock**: All POST operations use `LockService.getScriptLock()` for atomic writes across concurrent terminals.
6. **COGS Permanence**: Historical sales permanently retain their COGS at time of sale. Future purchases do not retroactively alter past P&L.
