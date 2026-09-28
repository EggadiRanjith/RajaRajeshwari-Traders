/* =============================================================
   RAJARAJESHWARI TRADERS  —  Application Logic v2
   Router, page renders, tables, modals, forms, toasts
   ============================================================= */

'use strict';

/* ──────────────────────────────────────────────
   STATE
   ────────────────────────────────────────────── */
const STATE = {
  pnlView: 'product',
  page: 'dashboard',
  period: '7d',
  salesSearch: '', salesPage: 1,
  purchasesSearch: '', purchasesPage: 1,
  stockSearch: '',
  suppliersSearch: '',
  expensesSearch: '', expensesPage: 1,
  wastageSearch: '', wastagePage: 1,
  counterCart: [],
};

/* ──────────────────────────────────────────────
   TABLE DATE FILTERS
   Independent period state for each data table.
   mode: 'today' | '7d' | '30d' | 'range' | 'single'
   ────────────────────────────────────────────── */
const TABLE_FILTERS = {
  sales:     { mode: '7d',  from: '', to: '' },
  purchases: { mode: '7d',  from: '', to: '' },
  expenses:  { mode: '7d',  from: '', to: '' },
  wastage:   { mode: '7d',  from: '', to: '' },
  stock:     { mode: 'all', status: 'all' },  /* inventory uses status filter */
};

/* Apply a period or custom-date filter for a given table and re-render */
function setTableFilter(table, mode) {
  TABLE_FILTERS[table].mode = mode;

  /* Show / hide date input groups */
  const rangeEl  = document.getElementById(`${table}-filter-range`);
  const singleEl = document.getElementById(`${table}-filter-single`);
  if (rangeEl)  rangeEl.style.display  = mode === 'range'  ? 'flex' : 'none';
  if (singleEl) singleEl.style.display = mode === 'single' ? 'flex' : 'none';

  if (mode === 'range') {
    const fromEl = document.getElementById(`${table}-from`);
    const toEl   = document.getElementById(`${table}-to`);
    if (fromEl && !fromEl.value) fromEl.value = RT.d(6);
    if (toEl && !toEl.value)     toEl.value   = RT.todayStr();
  } else if (mode === 'single') {
    const singleInput = document.getElementById(`${table}-date`);
    if (singleInput && !singleInput.value) singleInput.value = RT.todayStr();
  }

  /* Update active button styling */
  document.querySelectorAll(`#${table}-filter-bar .tfilter-btn`).forEach(btn => {
    btn.classList.toggle('active', btn.dataset.mode === mode);
  });

  /* Don't re-render until dates are chosen for custom modes */
  if (mode === 'range' || mode === 'single') return;

  TABLE_FILTERS[table].from = '';
  TABLE_FILTERS[table].to   = '';
  rerenderTable(table);
}

function applyCustomFilter(table) {
  const f = TABLE_FILTERS[table];
  if (f.mode === 'range') {
    const fromEl = document.getElementById(`${table}-from`);
    const toEl   = document.getElementById(`${table}-to`);
    f.from = fromEl ? fromEl.value : '';
    f.to   = toEl   ? toEl.value   : '';
    if (!f.from || !f.to) {
      showToast('Please select both From and To dates', 'warning');
      return;
    }
    if (f.from > f.to) {
      const tmp = f.from; f.from = f.to; f.to = tmp;
      if (fromEl) fromEl.value = f.from;
      if (toEl) toEl.value = f.to;
    }
    showToast(`${table.toUpperCase()} filtered: ${RT.fmtDate(f.from)} → ${RT.fmtDate(f.to)}`, 'success');
  } else if (f.mode === 'single') {
    const dateEl = document.getElementById(`${table}-date`);
    f.from = dateEl ? dateEl.value : '';
    if (!f.from) {
      showToast('Please select a date', 'warning');
      return;
    }
    showToast(`${table.toUpperCase()} filtered for ${RT.fmtDate(f.from)}`, 'success');
  }
  rerenderTable(table);
}

function rerenderTable(table) {
  if (table === 'sales') {
    renderSalesStats();
    renderSalesTable();
  } else if (table === 'purchases') {
    renderPurchasesStats();
    renderPurchasesTable();
  } else if (table === 'expenses') {
    renderExpensesStats();
    renderExpensesTable();
  } else if (table === 'wastage') {
    renderWastageStats();
    renderWastageTable();
  } else if (table === 'stock') {
    renderStock();
  }
}

/* Reset all filters on a table and repopulate standard records */
function resetTableFilters(table) {
  if (TABLE_FILTERS[table]) {
    TABLE_FILTERS[table].mode = (table === 'stock') ? 'all' : '7d';
    TABLE_FILTERS[table].from = '';
    TABLE_FILTERS[table].to   = '';
    if (table === 'stock') TABLE_FILTERS.stock.status = 'all';
  }
  if (table === 'sales') {
    STATE.salesSearch = '';
    const s = document.getElementById('sales-search');
    if (s) s.value = '';
  } else if (table === 'purchases') {
    STATE.purchasesSearch = '';
    const p = document.getElementById('purchases-search');
    if (p) p.value = '';
  } else if (table === 'expenses') {
    STATE.expensesSearch = '';
    const e = document.getElementById('expenses-search');
    if (e) e.value = '';
  } else if (table === 'stock') {
    STATE.stockSearch = '';
    const st = document.getElementById('stock-search');
    if (st) st.value = '';
  }

  /* Reset button styles */
  document.querySelectorAll(`#${table}-filter-bar .tfilter-btn`).forEach(btn => {
    btn.classList.toggle('active', btn.dataset.mode === '7d');
  });
  document.querySelectorAll(`#${table}-filter-bar .tfilter-status-btn`).forEach(btn => {
    btn.classList.toggle('active', btn.dataset.status === 'all');
  });

  const rangeEl  = document.getElementById(`${table}-filter-range`);
  const singleEl = document.getElementById(`${table}-filter-single`);
  if (rangeEl)  rangeEl.style.display  = 'none';
  if (singleEl) singleEl.style.display = 'none';

  rerenderTable(table);
  showToast(`Reset ${table} filters`, 'info');
}

/* Get filtered data array for a table */
function getTableData(table) {
  const f = TABLE_FILTERS[table];
  const src = table === 'sales' ? RT.SALES
            : table === 'purchases' ? RT.PURCHASES
            : table === 'wastage' ? RT.WASTAGE
            : RT.EXPENSES;

  /* date string helper: 'YYYY-MM-DD' comparison */
  if (f.mode === 'range' && f.from && f.to) {
    return src.filter(r => r.date >= f.from && r.date <= f.to)
              .sort((a, b) => b.date.localeCompare(a.date));
  }
  if (f.mode === 'single' && f.from) {
    return src.filter(r => r.date === f.from)
              .sort((a, b) => b.date.localeCompare(a.date));
  }
  /* Standard period */
  if (table === 'sales')     return RT.filterSalesByPeriod(f.mode).sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));
  if (table === 'purchases') return RT.filterPurchasesByPeriod(f.mode).sort((a, b) => b.date.localeCompare(a.date));
  if (table === 'expenses')  return RT.filterExpensesByPeriod(f.mode).sort((a, b) => b.date.localeCompare(a.date));
  if (table === 'wastage')   return RT.filterWastageByPeriod(f.mode).sort((a, b) => b.date.localeCompare(a.date));
  return src;
}

/* Dashboard custom date: update KPIs + charts with custom range */
function setDashboardPeriod(mode) {
  /* Update active button */
  document.querySelectorAll('.date-tab').forEach(b => {
    b.classList.toggle('active', b.dataset.period === mode);
  });

  /* Custom date range UI */
  const customEl = document.getElementById('dash-custom-dates');
  const singleEl = document.getElementById('dash-single-date');
  if (customEl) customEl.style.display = mode === 'custom' ? 'flex' : 'none';
  if (singleEl) singleEl.style.display = mode === 'single' ? 'flex' : 'none';

  if (mode === 'custom') {
    const fromEl = document.getElementById('dash-from');
    const toEl   = document.getElementById('dash-to');
    if (fromEl && !fromEl.value) fromEl.value = RT.d(6);
    if (toEl && !toEl.value)     toEl.value   = RT.todayStr();
  } else if (mode === 'single') {
    const singleInput = document.getElementById('dash-single');
    if (singleInput && !singleInput.value) singleInput.value = RT.todayStr();
  }

  if (mode !== 'custom' && mode !== 'single') {
    STATE.period     = mode;
    STATE.customFrom = null;
    STATE.customTo   = null;
    renderDashboard();
  }
}

function applyDashboardCustomDate() {
  const fromEl = document.getElementById('dash-from');
  const toEl   = document.getElementById('dash-to');
  if (!fromEl || !toEl) return;
  let from = fromEl.value;
  let to   = toEl.value;
  if (!from || !to) {
    showToast('Please select both From and To dates', 'warning');
    return;
  }
  if (from > to) {
    const tmp = from; from = to; to = tmp;
    fromEl.value = from; toEl.value = to;
  }
  STATE.period     = 'custom';
  STATE.customFrom = from;
  STATE.customTo   = to;
  renderDashboard();
  showToast(`Dashboard updated: ${RT.fmtDate(from)} → ${RT.fmtDate(to)}`, 'success');
}

function applyDashboardSingleDate() {
  const dateEl = document.getElementById('dash-single');
  if (!dateEl) return;
  const val = dateEl.value;
  if (!val) {
    showToast('Please select a date', 'warning');
    return;
  }
  STATE.period     = 'single';
  STATE.customFrom = val;
  STATE.customTo   = val;
  renderDashboard();
  showToast(`Dashboard updated for ${RT.fmtDate(val)}`, 'success');
}

const PAGE_SIZE = 10;

/* ──────────────────────────────────────────────
   ROUTER
   ────────────────────────────────────────────── */
function navigateTo(page) {
  document.querySelectorAll('.page').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));

  const pageEl = document.getElementById(`page-${page}`);
  const navEl  = document.querySelector(`[data-page="${page}"]`);
  if (pageEl) pageEl.classList.add('active');
  if (navEl)  navEl.classList.add('active');

  const periodTabs = document.getElementById('global-period-tabs');
  if (periodTabs) periodTabs.style.display = page === 'dashboard' ? 'flex' : 'none';
  const customEl = document.getElementById('dash-custom-dates');
  const singleEl = document.getElementById('dash-single-date');
  if (customEl && page !== 'dashboard') customEl.style.display = 'none';
  if (singleEl && page !== 'dashboard') singleEl.style.display = 'none';

  STATE.page = page;
  renderPage(page);
  closeSidebar();
  if (window.lucide) lucide.createIcons();

  const titles = {
    'make-sale': ['Make a Sale', 'Operations → Make a Sale'],
    dashboard: ['Business Overview', 'Dashboard'],
    sales: ['Sales', 'Operations → Sales'],
    purchases: ['Purchases', 'Operations → Purchases'],
    stock: ['Inventory', 'Operations → Inventory'],
    suppliers: ['Suppliers', 'Management → Suppliers'],
    expenses: ['Expenses', 'Management → Expenses'],
    wastage: ['Wastage & Spoilage', 'Management → Wastage & Loss'],
    reports: ['Reports', 'Management → Reports'],
    settings: ['Settings', 'Configuration'],
  };

  const [title, breadcrumb] = titles[page] || [page, page];
  const titleEl = document.getElementById('header-title');
  const bcEl    = document.getElementById('header-breadcrumb');
  if (titleEl) titleEl.textContent = title;
  if (bcEl)    bcEl.textContent = breadcrumb;
}

function renderPage(page) {
  const renderers = {
    'make-sale': renderMakeSalePage,
    dashboard: renderDashboard,
    sales: renderSales,
    purchases: renderPurchases,
    stock: renderStock,
    suppliers: renderSuppliers,
    expenses: renderExpenses,
    wastage: renderWastagePage,
    reports: renderReports,
    settings: renderSettings,
  };
  if (renderers[page]) renderers[page]();
}

/* ──────────────────────────────────────────────
   PAGE: MAKE A SALE (DIRECT BILLING CONTROLLER)
   ────────────────────────────────────────────── */
let _makeSaleRowSeq = 0;
let _makeSaleActiveRowIds = [];

function renderMakeSalePage() {
  const dateInput = document.getElementById('ms-date');
  if (dateInput && !dateInput.value) dateInput.value = RT.todayStr();

  initMakeSalePaymentPills();
  renderMakeSaleLast10();

  const container = document.getElementById('ms-items-container');
  if (container && (!container.children.length || _makeSaleActiveRowIds.length === 0)) {
    container.innerHTML = '';
    _makeSaleRowSeq = 0;
    _makeSaleActiveRowIds = [];
    addMakeSaleRow();
  } else {
    calcMakeSaleRows();
  }
  if (window.lucide) lucide.createIcons();
}

function initMakeSalePaymentPills() {
  document.querySelectorAll('.ms-pay-pill').forEach(pill => {
    pill.onclick = () => {
      document.querySelectorAll('.ms-pay-pill').forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      const hidden = document.getElementById('ms-payment');
      if (hidden) hidden.value = pill.dataset.pay;
    };
  });
}

function handleCustomerTypeChange() {
  const type = document.getElementById('ms-customer-type')?.value || 'Walk-in';
  const buyerInput = document.getElementById('ms-buyer');
  if (buyerInput) {
    if (type === 'Walk-in' && (!buyerInput.value || buyerInput.value === 'Hotel Sri Balaji' || buyerInput.value === 'Ravi Stores')) {
      buyerInput.value = 'Walk-in';
    } else if (type === 'Shopkeeper' && (buyerInput.value === 'Walk-in' || !buyerInput.value)) {
      buyerInput.value = 'Ravi Stores';
    } else if (type === 'Hotel' && (buyerInput.value === 'Walk-in' || !buyerInput.value)) {
      buyerInput.value = 'Hotel Sri Balaji';
    }
  }
  setEl('ms-ticket-tier', type.toUpperCase());
}

function getProductOptionsHtml(selectedId = '') {
  return '<option value="">Select produce to sell…</option>' +
    RT.PRODUCTS.map(p => {
      const stock = Number(p.currentStock) || 0;
      const isOut = stock <= 0;
      const stockStr = isOut ? `OUT OF STOCK — 0 ${p.unit}` : `${RT.fmtNum(stock)} ${p.unit}`;
      const disabledAttr = isOut ? 'disabled' : '';
      const selectedAttr = (p.id === selectedId && !isOut) ? 'selected' : '';
      return `<option value="${p.id}" ${disabledAttr} ${selectedAttr} style="${isOut ? 'color:var(--text-3);background:var(--surface-2);' : ''}">${p.name} (${stockStr})</option>`;
    }).join('');
}

function addMakeSaleRow(prefillData = null) {
  const container = document.getElementById('ms-items-container');
  if (!container) return;

  _makeSaleRowSeq++;
  const rowId = 'row_' + _makeSaleRowSeq;
  _makeSaleActiveRowIds.push(rowId);

  const rowEl = document.createElement('div');
  rowEl.className = 'ms-item-row';
  rowEl.id = `ms-item-row-${rowId}`;
  rowEl.dataset.rowId = rowId;
  rowEl.style.cssText = 'display:grid;grid-template-columns:minmax(140px,1.4fr) minmax(160px,1.6fr) minmax(85px,0.9fr) minmax(95px,1.05fr) minmax(130px,1.3fr) 34px;gap:8px;align-items:start;padding:8px 10px;background:var(--surface-1);border:1px solid var(--border-md);border-radius:8px;margin-bottom:6px;box-sizing:border-box;';

  rowEl.innerHTML = `
    <!-- Product -->
    <div class="form-group" style="margin-bottom:0">
      <div class="ms-col-header" style="height:18px;display:flex;align-items:center;justify-content:space-between;margin-bottom:4px;">
        <label class="form-label" style="font-size:11px;font-weight:700;margin:0">Produce <span class="required">*</span></label>
        <span class="ms-stock-chip" id="ms-stock-${rowId}" style="font-size:10px;padding:1px 5px;">Stock: --</span>
      </div>
      <select class="input ms-row-product" id="ms-product-${rowId}" required onchange="handleRowProductChange('${rowId}')" style="height:36px;box-sizing:border-box;">
        ${getProductOptionsHtml(prefillData?.productId || '')}
      </select>
    </div>

    <!-- Sourced Lot -->
    <div class="form-group" style="margin-bottom:0">
      <div class="ms-col-header" style="height:18px;display:flex;align-items:center;justify-content:space-between;margin-bottom:4px;">
        <label class="form-label" style="font-size:11px;font-weight:700;margin:0">Seller Lot <span class="required">*</span></label>
        <span class="ms-stock-chip" id="ms-lot-badge-${rowId}" style="font-size:10px;color:var(--primary);font-weight:700;padding:1px 5px;">Lot: --</span>
      </div>
      <select class="input ms-row-lot" id="ms-lot-${rowId}" required onchange="handleRowLotChange('${rowId}')" style="height:36px;box-sizing:border-box;">
        <option value="">Select seller lot…</option>
      </select>
    </div>

    <!-- Quantity -->
    <div class="form-group ms-row-qty" style="margin-bottom:0">
      <div class="ms-col-header" style="height:18px;display:flex;align-items:center;justify-content:space-between;margin-bottom:4px;">
        <label class="form-label" style="font-size:11px;font-weight:700;margin:0">Quantity <span class="required">*</span></label>
        <span class="ms-stock-chip" id="ms-unit-chip-${rowId}" style="font-size:10px;padding:1px 5px;">Unit: KG</span>
      </div>
      <div class="input-wrap">
        <input class="input has-suffix" type="number" id="ms-qty-${rowId}" placeholder="0.00" step="any" min="0.1" required oninput="calcMakeSaleRows()" value="${prefillData?.qty || ''}" style="height:36px;box-sizing:border-box;padding-right:36px;">
        <span class="input-suffix ms-row-unit" id="ms-unit-${rowId}">KG</span>
      </div>
    </div>

    <!-- Rate -->
    <div class="form-group" style="margin-bottom:0">
      <div class="ms-col-header" style="height:18px;display:flex;align-items:center;justify-content:space-between;margin-bottom:4px;">
        <label class="form-label" style="font-size:11px;font-weight:700;margin:0">Selling Rate <span class="required">*</span></label>
        <span class="ms-stock-chip" id="ms-target-${rowId}" style="font-size:10px;padding:1px 5px;">Tgt: --</span>
      </div>
      <div class="input-wrap">
        <span class="input-prefix">₹</span>
        <input class="input has-prefix ms-row-rate" type="number" id="ms-rate-${rowId}" placeholder="0.00" step="0.50" min="0.01" required oninput="calcMakeSaleRows()" value="${prefillData?.rate || ''}" style="height:36px;box-sizing:border-box;">
      </div>
    </div>

    <!-- Line Total & Individual Profit Badge -->
    <div class="form-group" style="margin-bottom:0">
      <div class="ms-col-header" style="height:18px;display:flex;align-items:center;justify-content:space-between;margin-bottom:4px;">
        <label class="form-label" style="font-size:11px;font-weight:700;margin:0">Line Total & Profit</label>
        <span class="ms-stock-chip" id="ms-margin-badge-${rowId}" style="font-size:10px;padding:1px 5px;">Est. Margin</span>
      </div>
      <div class="ms-line-total-box" id="ms-total-box-${rowId}" style="height:36px;display:flex;align-items:center;justify-content:space-between;padding:0 8px;background:var(--surface-2);border:1px solid var(--border-md);border-radius:6px;box-sizing:border-box;">
        <span class="ms-line-subtotal" id="ms-subtotal-${rowId}" style="font-family:var(--font-mono);font-weight:700;font-size:12px;color:var(--text-1);">₹0.00</span>
        <span class="ms-line-profit" id="ms-profit-${rowId}" style="font-family:var(--font-mono);font-weight:700;font-size:11px;color:var(--text-3);">₹0 (0%)</span>
      </div>
    </div>

    <!-- Remove Row Button -->
    <div class="ms-btn-del-wrap" style="height:36px;margin-top:22px;display:flex;align-items:center;justify-content:center;">
      <button type="button" class="ms-btn-del-row" onclick="removeMakeSaleRow('${rowId}')" id="ms-del-${rowId}" style="height:32px;width:32px;display:${_makeSaleActiveRowIds.length > 1 ? 'flex' : 'none'};align-items:center;justify-content:center;background:none;border:none;color:#EF4444;cursor:pointer;border-radius:6px;" title="Remove this produce line">
        <i data-lucide="trash-2" style="width:15px;height:15px;"></i>
      </button>
    </div>
  `;

  container.appendChild(rowEl);
  if (window.lucide) lucide.createIcons({ nodes: [rowEl] });

  _syncDeleteButtonsVisibility();

  if (prefillData?.productId) {
    handleRowProductChange(rowId);
  }

  calcMakeSaleRows();
  return rowId;
}

function _syncDeleteButtonsVisibility() {
  const canDelete = _makeSaleActiveRowIds.length > 1;
  _makeSaleActiveRowIds.forEach(id => {
    const btn = document.getElementById(`ms-del-${id}`);
    if (btn) btn.style.display = canDelete ? 'flex' : 'none';
  });
  const countBadge = document.getElementById('ms-items-badge');
  if (countBadge) countBadge.textContent = `${_makeSaleActiveRowIds.length} Item${_makeSaleActiveRowIds.length > 1 ? 's' : ''}`;
  const countSummary = document.getElementById('ms-items-count-summary');
  if (countSummary) countSummary.textContent = `${_makeSaleActiveRowIds.length} produce line${_makeSaleActiveRowIds.length > 1 ? 's' : ''} in bill`;
}

function removeMakeSaleRow(rowId) {
  if (_makeSaleActiveRowIds.length <= 1) return;
  const rowEl = document.getElementById(`ms-item-row-${rowId}`);
  if (rowEl) rowEl.remove();
  _makeSaleActiveRowIds = _makeSaleActiveRowIds.filter(id => id !== rowId);
  _syncDeleteButtonsVisibility();
  calcMakeSaleRows();
}

function handleRowProductChange(rowId) {
  const prodSel = document.getElementById(`ms-product-${rowId}`);
  const lotSel  = document.getElementById(`ms-lot-${rowId}`);
  const stockBadge = document.getElementById(`ms-stock-${rowId}`);
  const unitLabel  = document.getElementById(`ms-unit-${rowId}`);
  const unitChip   = document.getElementById(`ms-unit-chip-${rowId}`);
  const productId = prodSel?.value || '';
  const p = RT.getProductById(productId);

  // Hard guard: 0-stock check
  if (p && (Number(p.currentStock) || 0) <= 0) {
    showToast(`Cannot sell ${p.name}: Currently out of stock (0 ${p.unit})!`, 'warning');
    if (prodSel) prodSel.value = '';
    if (stockBadge) {
      stockBadge.textContent = 'Out of Stock';
      stockBadge.className = 'ms-stock-chip out';
    }
    if (lotSel) {
      lotSel.innerHTML = '<option value="" disabled selected>Produce Out of Stock</option>';
    }
    setEl(`ms-lot-badge-${rowId}`, 'Lot: --');
    setEl(`ms-target-${rowId}`, 'Tgt: --');
    calcMakeSaleRows();
    return;
  }

  if (unitLabel) unitLabel.textContent = p ? p.unit : 'KG';
  if (unitChip) unitChip.textContent = p ? `Unit: ${p.unit}` : 'Unit: KG';

  if (stockBadge) {
    if (p) {
      const stock = Number(p.currentStock) || 0;
      stockBadge.textContent = `Stock: ${RT.fmtNum(stock)} ${p.unit}`;
      if (stock <= 0) {
        stockBadge.className = 'ms-stock-chip out';
      } else if (stock <= p.reorderLevel) {
        stockBadge.className = 'ms-stock-chip low';
      } else {
        stockBadge.className = 'ms-stock-chip ok';
      }
    } else {
      stockBadge.textContent = 'Stock: --';
      stockBadge.className = 'ms-stock-chip';
    }
  }

  if (lotSel) {
    if (!p) {
      lotSel.innerHTML = '<option value="">Select seller lot…</option>';
      setEl(`ms-lot-badge-${rowId}`, 'Lot: --');
    } else {
      const allLots = RT.getActiveLots(productId);
      const activeWithStock = allLots.filter(lot => {
        const avail = lot.remainingQty !== undefined ? Number(lot.remainingQty) : Number(lot.quantity);
        return avail > 0;
      });

      if (!activeWithStock.length) {
        if ((Number(p.currentStock) || 0) > 0) {
          lotSel.innerHTML = `<option value="">Direct Stock (${RT.fmtNum(p.currentStock)} ${p.unit})</option>`;
          setEl(`ms-lot-badge-${rowId}`, `Avail: ${RT.fmtNum(p.currentStock)} ${p.unit}`);
        } else {
          lotSel.innerHTML = '<option value="" disabled selected>No Active Stock Available</option>';
          setEl(`ms-lot-badge-${rowId}`, 'Depleted');
        }
      } else {
        lotSel.innerHTML = activeWithStock.map(lot => {
          const sup = RT.getSupplierById(lot.supplierId);
          const supName = sup ? sup.name : (lot.supplierName || 'Direct Sourcing');
          const supId = lot.supplierId || (sup ? sup.id : '');
          const supLabel = supId ? `${supName} (${supId})` : supName;
          const lotDate = lot.date ? RT.fmtDate(lot.date) : '';
          const tRate = lot.targetRate || (lot.rate * 1.25);
          const avail = lot.remainingQty !== undefined ? Number(lot.remainingQty) : Number(lot.quantity);
          return `<option value="${lot.id}">
            ${supLabel} · Lot #${lot.id} · ${lotDate} (Avail: ${RT.fmtNum(avail)} ${p.unit} · Target: ₹${Number(tRate).toFixed(2)})
          </option>`;
        }).join('');
      }
    }
  }

  handleRowLotChange(rowId);
}

function handleRowLotChange(rowId) {
  const lotSel = document.getElementById(`ms-lot-${rowId}`);
  const lotId = lotSel?.value;
  const lot = RT.getLotById(lotId);
  const prodSel = document.getElementById(`ms-product-${rowId}`);
  const p = RT.getProductById(prodSel?.value || '');

  const lotBadge = document.getElementById(`ms-lot-badge-${rowId}`);
  const targetBadge = document.getElementById(`ms-target-${rowId}`);
  const rateInput = document.getElementById(`ms-rate-${rowId}`);

  if (lot) {
    const avail = lot.remainingQty !== undefined ? Number(lot.remainingQty) : Number(lot.quantity);
    if (lotBadge) lotBadge.textContent = `Avail: ${RT.fmtNum(avail)} ${p ? p.unit : 'KG'}`;
    const targetPrice = lot.targetRate || Math.round(lot.rate * 1.25);
    if (targetBadge) targetBadge.textContent = `Target: ₹${targetPrice.toFixed(2)}`;

    if (rateInput && (!rateInput.value || rateInput.dataset.autoPopulated === 'true')) {
      rateInput.value = targetPrice.toFixed(2);
      rateInput.dataset.autoPopulated = 'true';
    }
  } else {
    if (lotBadge) lotBadge.textContent = p ? `Avail: ${RT.fmtNum(p.currentStock)} ${p.unit}` : 'Lot: --';
    const targetPrice = p ? Math.round(p.avgCost * 1.25) : 0;
    if (targetBadge) targetBadge.textContent = p ? `Target: ₹${targetPrice.toFixed(2)}` : 'Target: --';
    if (rateInput && (!rateInput.value || rateInput.dataset.autoPopulated === 'true') && p) {
      rateInput.value = targetPrice.toFixed(2);
      rateInput.dataset.autoPopulated = 'true';
    }
  }

  if (rateInput && !rateInput.dataset.listenerAttached) {
    rateInput.addEventListener('input', () => { rateInput.dataset.autoPopulated = 'false'; });
    rateInput.dataset.listenerAttached = 'true';
  }

  calcMakeSaleRows();
}

function calcMakeSaleRows() {
  let grandSubtotal = 0;
  let grandCost     = 0;
  let grandQty      = 0;
  let validItemsCount = 0;
  const itemsSummaryList = [];

  _makeSaleActiveRowIds.forEach(rowId => {
    const p = RT.getProductById((document.getElementById(`ms-product-${rowId}`)?.value || '').trim());
    const lot = RT.getLotById(document.getElementById(`ms-lot-${rowId}`)?.value);
    const qty = parseFloat(document.getElementById(`ms-qty-${rowId}`)?.value) || 0;
    const rate = parseFloat(document.getElementById(`ms-rate-${rowId}`)?.value) || 0;

    const lotCost = lot ? lot.rate : (p ? p.avgCost : 0);
    const rowSubtotal = qty * rate;
    const rowCost = qty * lotCost;
    const rowProfit = rowSubtotal - rowCost;
    const rowMarginPct = rowSubtotal > 0 ? ((rowProfit / rowSubtotal) * 100).toFixed(1) : '0.0';

    const subtotalEl = document.getElementById(`ms-subtotal-${rowId}`);
    const profitEl   = document.getElementById(`ms-profit-${rowId}`);
    const marginBadge = document.getElementById(`ms-margin-badge-${rowId}`);

    if (subtotalEl) subtotalEl.textContent = RT.fmt(rowSubtotal, 2);

    if (profitEl) {
      if (qty > 0 && rate > 0) {
        if (rowProfit >= 0) {
          profitEl.className = 'ms-line-profit pos';
          profitEl.textContent = `+${RT.fmt(rowProfit, 0)} (+${rowMarginPct}%)`;
        } else {
          profitEl.className = 'ms-line-profit neg';
          profitEl.textContent = `-${RT.fmt(Math.abs(rowProfit), 0)} (${rowMarginPct}%)`;
        }
      } else {
        profitEl.className = 'ms-line-profit';
        profitEl.textContent = '₹0 (0%)';
      }
    }

    if (marginBadge) {
      if (qty > 0 && rate > 0) {
        marginBadge.textContent = rowMarginPct + '%';
        marginBadge.className = 'ms-stock-chip ' + (rowProfit >= 0 ? 'ok' : 'out');
      } else {
        marginBadge.textContent = 'Est. Margin';
        marginBadge.className = 'ms-stock-chip';
      }
    }

    if (p && qty > 0) {
      grandSubtotal += rowSubtotal;
      grandCost     += rowCost;
      grandQty      += qty;
      validItemsCount++;
      itemsSummaryList.push({
        name: p.name,
        unit: p.unit,
        qty,
        rate,
        subtotal: rowSubtotal,
        profit: rowProfit,
        marginPct: rowMarginPct
      });
    }
  });

  const grandProfit = grandSubtotal - grandCost;
  const mixedMarginPct = grandSubtotal > 0 ? ((grandProfit / grandSubtotal) * 100).toFixed(1) : '0.0';

  // Update Right-Hand Ticket Card (Draft & Mixed P&L)
  const nextInvoiceNum = RT.SALES.length + 1;
  const nextId = 'S' + String(nextInvoiceNum).padStart(3, '0');
  setEl('ms-invoice-preview', `#${nextId}`);
  setEl('ms-ticket-badge', `${validItemsCount || _makeSaleActiveRowIds.length} Item${(validItemsCount || _makeSaleActiveRowIds.length) > 1 ? 's' : ''}`);

  const ticketList = document.getElementById('ms-ticket-items-list');
  if (ticketList) {
    if (itemsSummaryList.length === 0) {
      ticketList.innerHTML = `
        <div style="font-size:12.5px;color:var(--text-3);padding:10px 0;text-align:center;">
          Select product & enter quantity on the left
        </div>
      `;
    } else {
      ticketList.innerHTML = itemsSummaryList.map(it => `
        <div style="display:flex;justify-content:space-between;align-items:center;padding:5px 8px;background:var(--surface-2);border:1px solid var(--border-subtle);border-radius:6px;font-size:12px;">
          <div>
            <div style="font-weight:700;color:var(--text-1);">${it.name}</div>
            <div style="color:var(--text-3);font-size:11px;">${RT.fmtNum(it.qty)} ${it.unit} × ${RT.fmt(it.rate, 2)}</div>
          </div>
          <div style="text-align:right;">
            <div style="font-family:var(--font-mono);font-weight:700;color:var(--text-1);">${RT.fmt(it.subtotal, 2)}</div>
            <div style="font-size:10.5px;font-weight:700;color:${it.profit >= 0 ? 'var(--success)' : 'var(--danger)'};">
              ${it.profit >= 0 ? '+' : ''}${RT.fmt(it.profit, 0)} (${it.marginPct}%)
            </div>
          </div>
        </div>
      `).join('');
    }
  }

  setEl('ms-ticket-weight', `${RT.fmtNum(grandQty)} KG (${validItemsCount} item${validItemsCount !== 1 ? 's' : ''})`);
  setEl('ms-subtotal', RT.fmt(grandSubtotal, 2));
  setEl('ms-cost', RT.fmt(grandCost, 2));

  const grandProfitEl = document.getElementById('ms-profit');
  if (grandProfitEl) {
    if (grandSubtotal > 0) {
      if (grandProfit >= 0) {
        grandProfitEl.innerHTML = `<span style="color:var(--success)">+${RT.fmt(grandProfit, 2)} (+${mixedMarginPct}% Mixed Profit)</span>`;
      } else {
        grandProfitEl.innerHTML = `<span style="color:var(--danger)">-${RT.fmt(Math.abs(grandProfit), 2)} (${mixedMarginPct}% Mixed Loss)</span>`;
      }
    } else {
      grandProfitEl.innerHTML = '<span style="color:var(--text-3)">₹0.00 (0.0%)</span>';
    }
  }

  setEl('ms-total-amt', RT.fmt(grandSubtotal, 2));
  const submitBtnLabel = document.getElementById('ms-submit-btn-label');
  if (submitBtnLabel) {
    submitBtnLabel.textContent = grandSubtotal > 0 ? `Record Sale (${RT.fmt(grandSubtotal)})` : 'Record Sale (Enter)';
  }
}

function resetMakeSaleForm() {
  const form = document.getElementById('make-sale-form');
  if (form) form.reset();
  const dateInput = document.getElementById('ms-date');
  if (dateInput) dateInput.value = RT.todayStr();
  const buyerInput = document.getElementById('ms-buyer');
  if (buyerInput) buyerInput.value = 'Walk-in';
  const custType = document.getElementById('ms-customer-type');
  if (custType) custType.value = 'Walk-in';

  document.querySelectorAll('.ms-pay-pill').forEach(p => p.classList.toggle('active', p.dataset.pay === 'Cash'));
  const hidden = document.getElementById('ms-payment');
  if (hidden) hidden.value = 'Cash';

  const container = document.getElementById('ms-items-container');
  if (container) container.innerHTML = '';
  _makeSaleRowSeq = 0;
  _makeSaleActiveRowIds = [];
  addMakeSaleRow();

  if (window.lucide) lucide.createIcons();
}

/* ── Concurrency Mutex & Double-Submit Protection ── */
const _activeSubmissionLocks = new Set();

async function withSubmissionLock(lockKey, buttonSelectorOrEl, asyncCallback) {
  if (_activeSubmissionLocks.has(lockKey)) {
    console.warn(`[RT] Concurrency lock active for "${lockKey}". Double-click ignored.`);
    return false;
  }
  _activeSubmissionLocks.add(lockKey);

  const btn = typeof buttonSelectorOrEl === 'string'
    ? document.querySelector(buttonSelectorOrEl)
    : buttonSelectorOrEl;

  let originalHtml = '';
  if (btn) {
    originalHtml = btn.innerHTML;
    btn.disabled = true;
    btn.style.opacity = '0.75';
    btn.style.cursor = 'not-allowed';
    btn.innerHTML = '<span class="btn-spinner"></span> Posting to Sheets…';
  }

  try {
    await asyncCallback();
    return true;
  } finally {
    _activeSubmissionLocks.delete(lockKey);
    if (btn) {
      btn.disabled = false;
      btn.style.opacity = '';
      btn.style.cursor = '';
      btn.innerHTML = originalHtml;
      if (window.lucide) lucide.createIcons({ nodes: [btn] });
    }
  }
}

async function handleMakeSaleSubmit() {
  const date      = document.getElementById('ms-date')?.value || RT.todayStr();
  const custType  = document.getElementById('ms-customer-type')?.value || 'Walk-in';
  const buyer     = document.getElementById('ms-buyer')?.value?.trim() || 'Walk-in';
  const payment   = document.getElementById('ms-payment')?.value || 'Cash';
  const notes     = document.getElementById('ms-notes')?.value?.trim() || '';

  if (!validateField('ms-date', !!date, 'Please select transaction date')) return;
  if (!validateField('ms-payment', !!payment, 'Please select a payment mode')) return;

  const validItems = [];
  for (const rowId of _makeSaleActiveRowIds) {
    const prodSel = document.getElementById(`ms-product-${rowId}`);
    const lotSel  = document.getElementById(`ms-lot-${rowId}`);
    const qtyInput = document.getElementById(`ms-qty-${rowId}`);
    const rateInput = document.getElementById(`ms-rate-${rowId}`);

    const productId = (prodSel?.value || '').trim();
    const lotId = (lotSel?.value || '').trim();
    const qty = parseFloat(qtyInput?.value);
    const rate = parseFloat(rateInput?.value);

    // If row is completely untouched and we have other rows, skip it
    if (!productId && isNaN(qty) && isNaN(rate) && _makeSaleActiveRowIds.length > 1) {
      continue;
    }

    if (!validateField(`ms-product-${rowId}`, !!productId, 'Please select a product')) return;
    if (!validateField(`ms-qty-${rowId}`, !isNaN(qty) && qty > 0, 'Quantity must be greater than zero')) return;
    if (!validateField(`ms-rate-${rowId}`, !isNaN(rate) && rate > 0, 'Selling rate must be greater than zero')) return;

    const p = RT.getProductById(productId);
    if (!p || (Number(p.currentStock) || 0) <= 0) {
      showToast(`Cannot sell ${p ? p.name : 'product'}: Completely out of stock (0 ${p ? p.unit : 'KG'})`, 'danger');
      return;
    }

    const lot = lotId ? RT.getLotById(lotId) : null;
    if (lot && lot.remainingQty !== undefined && Number(lot.remainingQty) <= 0) {
      showToast(`Cannot sell from depleted Lot #${lot.id} for ${p.name}`, 'danger');
      return;
    }

    const lotCost = lot ? lot.rate : (p ? p.avgCost : 0);
    const rowSubtotal = qty * rate;
    const rowCost = qty * lotCost;

    validItems.push({
      rowId,
      productId,
      productName: p ? p.name : 'Produce',
      unit: p ? p.unit : 'KG',
      lotId: lotId || '',
      qty,
      rate,
      lotCost,
      subtotal: rowSubtotal,
      cogs: rowCost,
      grossProfit: rowSubtotal - rowCost
    });
  }

  if (validItems.length === 0) {
    showToast('Please add at least one produce item with quantity and rate', 'warning');
    return;
  }

  // Cross-row inventory allocation validation
  const reqByLot = {};
  const reqByProd = {};
  for (const it of validItems) {
    if (it.lotId) reqByLot[it.lotId] = (reqByLot[it.lotId] || 0) + it.qty;
    reqByProd[it.productId] = (reqByProd[it.productId] || 0) + it.qty;
  }

  for (const it of validItems) {
    const lot = it.lotId ? RT.getLotById(it.lotId) : null;
    const p = RT.getProductById(it.productId);
    if (lot && lot.remainingQty !== undefined && reqByLot[it.lotId] > lot.remainingQty) {
      showToast(`Insufficient stock in Lot #${lot.id} for ${it.productName}! Total requested: ${reqByLot[it.lotId]} ${it.unit}, Available: ${lot.remainingQty} ${it.unit}`, 'danger');
      return;
    }
    if (p && reqByProd[it.productId] > p.currentStock) {
      showToast(`Insufficient inventory for ${it.productName}! Total requested: ${reqByProd[it.productId]} ${it.unit}, Available: ${p.currentStock} ${it.unit}`, 'danger');
      return;
    }
  }

  await withSubmissionLock('makeSale', '#btn-make-sale-submit', async () => {
    try {
      const nextInvoiceNum = RT.SALES.length + 1;
      const invoiceId = 'S' + String(nextInvoiceNum).padStart(3, '0');
      let result = null;

      try {
        result = await RT.gasPost('createBatchSale', {
          invoiceId,
          date,
          customerType: custType,
          buyer,
          payment,
          notes,
          items: validItems.map(it => ({
            productId: it.productId,
            lotId: it.lotId,
            quantity: it.qty,
            rate: it.rate
          }))
        });
      } catch (batchErr) {
        console.warn('[RT] createBatchSale fallback to sequential createSale:', batchErr.message);
        for (let i = 0; i < validItems.length; i++) {
          const it = validItems[i];
          const itemRes = await RT.gasPost('createSale', {
            date,
            productId: it.productId,
            lotId: it.lotId,
            quantity: it.qty,
            rate: it.rate,
            customerType: custType,
            buyer,
            payment,
            notes: notes ? `${notes} (Item ${i+1}/${validItems.length})` : ''
          });
          if (i === 0 && itemRes) result = itemRes;
        }
      }

      const assignedId = (result && (result.invoiceId || result.id)) || invoiceId;
      let totalBillRev = 0;
      let totalBillCost = 0;

      // Optimistic in-memory update across all items in RT.SALES
      validItems.forEach(it => {
        const p = RT.getProductById(it.productId);
        const lot = it.lotId ? RT.getLotById(it.lotId) : null;
        totalBillRev += it.subtotal;
        totalBillCost += it.cogs;

        const newSale = {
          id: assignedId,
          invoiceId: assignedId,
          date: date || RT.todayStr(),
          productId: it.productId,
          productName: it.productName,
          lotId: it.lotId || '',
          quantity: it.qty,
          rate: it.rate,
          revenue: it.subtotal,
          cogs: it.cogs,
          grossProfit: it.grossProfit,
          customerType: custType,
          buyer,
          payment,
          status: 'paid',
          notes: notes || ''
        };
        RT.SALES.unshift(newSale);

        if (p) p.currentStock = Math.max(0, p.currentStock - it.qty);
        if (lot) {
          const curLotRem = lot.remainingQty !== undefined ? lot.remainingQty : lot.quantity;
          lot.remainingQty = Math.max(0, curLotRem - it.qty);
        }
      });

      const totalProfit = totalBillRev - totalBillCost;
      const marginPct = totalBillRev > 0 ? ((totalProfit / totalBillRev) * 100).toFixed(1) : '0.0';
      showToast(`Bill #${assignedId} recorded — ${RT.fmt(totalBillRev)} (${validItems.length} produce item${validItems.length > 1 ? 's' : ''} for ${buyer}, ${totalProfit >= 0 ? '+' : ''}${marginPct}% margin)`, 'success');

      resetMakeSaleForm();
      renderMakeSaleLast10(assignedId);

      // Silent non-blocking background synchronization with Google Sheets
      RT.refresh(true).catch(err => console.warn('[RT] Silent sync warning:', err.message));
    } catch (err) {
      showToast(err.message || 'Failed to record sale in Google Sheets', 'danger');
    }
  });
}

function renderMakeSaleLast10(highlightId) {
  const container = document.getElementById('make-sale-last10-tbody');
  if (!container) return;

  const txns = RT.SALES.slice(0, 10);
  if (!txns.length) {
    container.innerHTML = `<tr><td colspan="10">
      <div class="table-empty">
        <div class="table-empty-icon"><i data-lucide="inbox"></i></div>
        <div class="table-empty-title">No transactions recorded yet</div>
      </div>
    </td></tr>`;
    if (window.lucide) lucide.createIcons({ nodes: [container] });
    return;
  }

  container.innerHTML = txns.map(s => {
    const p = RT.getProductById(s.productId);
    const amount = RT.saleAmount(s);
    const isNew = s.id === highlightId;
    const lot = s.lotId ? RT.getLotById(s.lotId) : null;
    const sup = lot ? RT.getSupplierById(lot.supplierId) : null;
    const lotLabel = lot ? `${sup ? sup.name.split(' ')[0] : 'Lot'} #${lot.id}` : 'General';
    const tier = s.customerType || 'Walk-in';
    const tierColor = tier === 'Hotel' ? 'var(--primary)' : tier === 'Shopkeeper' ? 'var(--info)' : 'var(--text-2)';
    const tierBg = tier === 'Hotel' ? 'rgba(26,50,98,0.08)' : tier === 'Shopkeeper' ? 'rgba(12,74,110,0.08)' : 'rgba(0,0,0,0.05)';

    return `
      <tr class="${isNew ? 'row-flash' : ''}">
        <td class="col-mono" style="font-weight:var(--fw-bold);color:var(--primary)">${s.id}</td>
        <td>${RT.fmtDate(s.date)}</td>
        <td class="col-primary" style="font-weight:600">${p ? p.name : '—'}</td>
        <td><span class="badge badge-neutral" style="font-size:11px">${lotLabel}</span></td>
        <td class="num">${RT.fmtNum(s.quantity, 0)} ${p ? p.unit : ''}</td>
        <td class="num">${RT.fmt(s.rate, 2)}</td>
        <td class="num col-amount" style="font-weight:700">${RT.fmt(amount)}</td>
        <td><span class="badge" style="background:${tierBg};color:${tierColor};font-size:10px;font-weight:700">${tier.toUpperCase()}</span></td>
        <td>${s.buyer}</td>
        <td>${paymentBadge(s.payment)}</td>
      </tr>
    `;
  }).join('');

  if (window.lucide) lucide.createIcons({ nodes: [container] });
}

/* ──────────────────────────────────────────────
   DASHBOARD
   ────────────────────────────────────────────── */
/* ──────────────────────────────────────────────
   DUAL P&L ANALYTICS (PRODUCT & SELLER INTELLIGENCE)
   ────────────────────────────────────────────── */
function switchPnLView(type) {
  STATE.pnlView = type;
  document.getElementById('pnl-tab-product')?.classList.toggle('active', type === 'product');
  document.getElementById('pnl-tab-seller')?.classList.toggle('active', type === 'seller');
  renderPnLTable();
}

function renderPnLTable() {
  const thead = document.getElementById('pnl-table-head');
  const tbody = document.getElementById('pnl-table-body');
  if (!thead || !tbody) return;

  if (STATE.pnlView === 'product') {
    thead.innerHTML = `
      <tr>
        <th>Product Name</th>
        <th>Category</th>
        <th class="num">Units Sold</th>
        <th class="num">Total Revenue</th>
        <th class="num">Cost of Goods</th>
        <th class="num">Gross Profit</th>
        <th class="num">Realized Margin</th>
      </tr>
    `;
    const data = RT.getPnLByProduct(STATE.period, STATE.customFrom, STATE.customTo);
    tbody.innerHTML = data.map(row => {
      const p = row.product;
      const profitColor = row.profit > 0 ? 'var(--success)' : row.profit < 0 ? 'var(--danger)' : 'var(--text-2)';
      return `
        <tr>
          <td class="col-primary" style="font-weight:700">${p ? p.name : 'Unknown'}</td>
          <td><span class="badge badge-neutral">${p ? p.category : 'General'}</span></td>
          <td class="num">${RT.fmtNum(row.qty)} ${p ? p.unit : ''}</td>
          <td class="num">${RT.fmt(row.revenue)}</td>
          <td class="num" style="color:var(--text-3)">${RT.fmt(row.cogs)}</td>
          <td class="num col-amount" style="color:${profitColor};font-weight:700">${RT.fmt(row.profit)}</td>
          <td class="num" style="color:${profitColor};font-weight:700">${row.marginPct}%</td>
        </tr>
      `;
    }).join('');
  } else {
    thead.innerHTML = `
      <tr>
        <th>Seller / Supplier</th>
        <th>Location</th>
        <th class="num">Lots Sourced</th>
        <th class="num">Units Sold</th>
        <th class="num">Sourced Cost</th>
        <th class="num">Revenue Generated</th>
        <th class="num">Realized Profit</th>
        <th class="num">Supplier ROI %</th>
      </tr>
    `;
    const data = RT.getPnLBySeller(STATE.period, STATE.customFrom, STATE.customTo);
    tbody.innerHTML = data.map(row => {
      const sup = row.supplier;
      const profitColor = row.profit > 0 ? 'var(--success)' : row.profit < 0 ? 'var(--danger)' : 'var(--text-2)';
      return `
        <tr>
          <td class="col-primary" style="font-weight:700">${sup ? sup.name : 'Direct Sourcing'}</td>
          <td>${sup && sup.location ? sup.location : 'Tamil Nadu'}</td>
          <td class="num">${row.lotsCount} lots</td>
          <td class="num">${RT.fmtNum(row.qtySold)} KG</td>
          <td class="num" style="color:var(--text-3)">${RT.fmt(row.cogs)}</td>
          <td class="num">${RT.fmt(row.revenue)}</td>
          <td class="num col-amount" style="color:${profitColor};font-weight:700">${RT.fmt(row.profit)}</td>
          <td class="num" style="color:${profitColor};font-weight:700">${row.roiPct}%</td>
        </tr>
      `;
    }).join('');
  }
}

function renderDashboard() {
  const chartSubEl = document.getElementById('chart-revenue-subtitle');
  if (chartSubEl) {
    const text = {
      today: `Intraday performance (9 AM – 9 PM) — Today (${RT.fmtDate(RT.todayStr())})`,
      '7d': 'Daily performance — last 7 days',
      '30d': 'Daily performance — last 30 days',
      custom: (STATE.customFrom && STATE.customTo) ? `Daily performance — ${RT.fmtDate(STATE.customFrom)} to ${RT.fmtDate(STATE.customTo)}` : 'Daily performance — Custom range',
      single: STATE.customFrom ? `Intraday performance (9 AM – 9 PM) — ${RT.fmtDate(STATE.customFrom)}` : 'Daily performance — Selected date',
    }[STATE.period] || 'Daily performance';
    chartSubEl.textContent = text;
  }

  renderPerfStrip();
  renderKPIs();
  renderPnLTable();
  renderBuyerRevenueTable();
  renderProductVelocityTable();
  renderLowStockAlert();
  renderRecentTransactions();
  setTimeout(() => {
    Charts.renderRevenueTrend(STATE.period, STATE.customFrom, STATE.customTo);
    Charts.renderSalesByProduct(STATE.period, STATE.customFrom, STATE.customTo);
    Charts.renderCustomerSegments(STATE.period, STATE.customFrom, STATE.customTo);
    Charts.renderStockDonut();
  }, 60);
}

function renderBuyerRevenueTable() {
  const tbody = document.getElementById('buyer-revenue-tbody');
  if (!tbody) return;

  const buyers = RT.getBuyerRevenueSummary(STATE.period, STATE.customFrom, STATE.customTo);
  if (!buyers.length) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:var(--sp-4);color:var(--text-3)">No buyer records for period</td></tr>';
    return;
  }

  tbody.innerHTML = buyers.slice(0, 10).map(b => {
    const tier = b.customerType || 'Walk-in';
    const tierColor = tier === 'Hotel' ? 'var(--primary)' : tier === 'Shopkeeper' ? 'var(--info)' : 'var(--text-2)';
    const tierBg = tier === 'Hotel' ? 'rgba(26,50,98,0.08)' : tier === 'Shopkeeper' ? 'rgba(12,74,110,0.08)' : 'rgba(0,0,0,0.05)';
    return `
      <tr>
        <td class="col-primary" style="font-weight:600">${b.name}</td>
        <td><span class="badge" style="background:${tierBg};color:${tierColor};font-size:10px;font-weight:700">${tier.toUpperCase()}</span></td>
        <td class="num">${b.orderCount}</td>
        <td class="num" style="font-weight:600">${RT.fmtNum(b.totalQty)} KG</td>
        <td class="num col-amount" style="font-weight:700">${RT.fmt(b.totalRevenue)}</td>
      </tr>
    `;
  }).join('');
}

function renderProductVelocityTable() {
  const tbody = document.getElementById('product-velocity-tbody');
  if (!tbody) return;

  const velocity = RT.getProductVelocity();
  tbody.innerHTML = velocity.map(v => {
    const p = v.product;
    const badgeClass = v.velocityStatus === 'fast-moving' ? 'badge-velocity-fast'
      : v.velocityStatus === 'out' ? 'badge-velocity-out'
      : v.velocityStatus === 'low' ? 'badge-velocity-low'
      : 'badge-velocity-healthy';

    const statusLabel = v.velocityStatus === 'fast-moving' ? 'Fast-Moving'
      : v.velocityStatus === 'out' ? 'Out of Stock'
      : v.velocityStatus === 'low' ? 'Low Stock'
      : 'Healthy';

    return `
      <tr>
        <td class="col-primary" style="font-weight:600">${p.name}</td>
        <td class="num" style="font-weight:700;color:${v.currentStock === 0 ? 'var(--danger)' : 'var(--text-1)'}">${RT.fmtNum(v.currentStock)} ${p.unit}</td>
        <td class="num" style="color:var(--success);font-weight:600">${RT.fmtNum(v.soldToday)} ${p.unit}</td>
        <td class="num">${RT.fmtNum(v.sold7Days)} ${p.unit}</td>
        <td class="num" style="color:var(--text-2);font-weight:600">${v.runRate} /day</td>
        <td><span class="badge ${badgeClass}">${statusLabel}</span></td>
      </tr>
    `;
  }).join('');
}

/* Performance Strip — Today's snapshot */
function renderPerfStrip() {
  const todayKPIs  = RT.computeKPIs('today');
  const todaySales = RT.filterSalesByPeriod('today');
  const margin = todayKPIs.revenue
    ? ((todayKPIs.grossProfit / todayKPIs.revenue) * 100).toFixed(1)
    : '0.0';

  setEl('strip-revenue', RT.fmt(todayKPIs.revenue));
  setEl('strip-revenue-sub', `${todaySales.length} transaction${todaySales.length !== 1 ? 's' : ''} recorded today`);
  setEl('strip-txns', String(todaySales.length));
  setEl('strip-profit', RT.fmt(todayKPIs.grossProfit));
  setEl('strip-margin', `${margin}% gross margin`);
  setEl('strip-purchases', RT.fmt(todayKPIs.totalPurchases));
  setEl('strip-stock', RT.fmt(todayKPIs.stockValue));

  // Semantic color on live values
  const profitEl = document.getElementById('strip-profit');
  if (profitEl) profitEl.style.color = todayKPIs.grossProfit >= 0 ? 'var(--success)' : 'var(--danger)';
}

function renderKPIs() {
  const kpis = RT.computeKPIs(STATE.period, STATE.customFrom, STATE.customTo);
  const container = document.getElementById('kpi-grid');
  if (!container) return;

  const periodLabel = {
    today: 'today',
    '7d': '7-day period',
    '30d': '30-day period',
    custom: (STATE.customFrom && STATE.customTo) ? `${RT.fmtDate(STATE.customFrom)} → ${RT.fmtDate(STATE.customTo)}` : 'custom range',
    single: STATE.customFrom ? `${RT.fmtDate(STATE.customFrom)}` : 'selected date',
  }[STATE.period] || 'selected period';
  const grossMargin = kpis.revenue ? ((kpis.grossProfit / kpis.revenue) * 100).toFixed(1) : '0.0';
  const netMargin   = kpis.revenue ? ((kpis.netProfit / kpis.revenue) * 100).toFixed(1) : '0.0';

  container.innerHTML = [
    kpiCard({
      label: 'Revenue',
      value: RT.fmt(kpis.revenue),
      context: periodLabel,
      accent: 'primary',
      icon: 'trending-up',
      iconClass: 'primary',
    }),
    kpiCard({
      label: 'Gross Profit',
      value: RT.fmt(kpis.grossProfit),
      sub: `${grossMargin}% gross margin`,
      context: periodLabel,
      accent: 'success',
      icon: 'bar-chart-2',
      iconClass: 'success',
    }),
    kpiCard({
      label: 'Net Profit',
      value: RT.fmt(kpis.netProfit),
      sub: `${netMargin}% net margin`,
      context: periodLabel,
      accent: kpis.netProfit >= 0 ? 'success' : 'danger',
      icon: 'activity',
      iconClass: kpis.netProfit >= 0 ? 'success' : 'danger',
      valueColor: kpis.netProfit >= 0 ? 'var(--success)' : 'var(--danger)',
    }),
    kpiCard({
      label: 'Purchases',
      value: RT.fmt(kpis.totalPurchases),
      context: periodLabel,
      accent: 'warning',
      icon: 'shopping-cart',
      iconClass: 'warning',
    }),
    kpiCard({
      label: 'Inventory Value',
      value: RT.fmt(kpis.stockValue),
      sub: `${RT.PRODUCTS.length} SKUs tracked`,
      context: 'current',
      accent: 'gold',
      icon: 'package',
      iconClass: 'gold',
    }),
    kpiCard({
      label: 'Wastage & Spoilage',
      value: RT.fmt(kpis.totalWastageLoss || 0),
      sub: `${kpis.totalWastageWeight || 0} KG written off`,
      context: periodLabel,
      accent: (kpis.totalWastageLoss || 0) > 0 ? 'danger' : 'success',
      icon: 'trash-2',
      iconClass: (kpis.totalWastageLoss || 0) > 0 ? 'danger' : 'success',
      valueColor: (kpis.totalWastageLoss || 0) > 0 ? 'var(--danger)' : undefined,
    }),
  ].join('');

  if (window.lucide) lucide.createIcons({ nodes: [container] });
}

function kpiCard({ label, value, sub, context, accent, icon, iconClass, valueColor }) {
  return `
    <div class="kpi-card ${accent ? `accent-${accent}` : ''}">
      <div class="kpi-icon ${iconClass}">
        <i data-lucide="${icon}"></i>
      </div>
      <div class="kpi-label">${label}</div>
      <div class="kpi-value" ${valueColor ? `style="color:${valueColor}"` : ''}>${value}</div>
      <div class="kpi-context">
        ${sub ? `<span class="kpi-period" style="font-weight:var(--fw-semibold);color:var(--text-2)">${sub}</span>` : ''}
        ${context ? `<span class="kpi-period">${context}</span>` : ''}
      </div>
    </div>
  `;
}

function renderRecentTransactions() {
  const container = document.getElementById('recent-transactions-body');
  if (!container) return;
  const txns = RT.getRecentTransactions(8, STATE.period, STATE.customFrom, STATE.customTo);

  const subEl = document.querySelector('#page-dashboard .section-subtitle');
  if (subEl) {
    const periodLabel = {
      today: 'recorded today',
      '7d': 'past 7 days',
      '30d': 'past 30 days',
      custom: (STATE.customFrom && STATE.customTo) ? `${RT.fmtDate(STATE.customFrom)} to ${RT.fmtDate(STATE.customTo)}` : 'custom range',
      single: STATE.customFrom ? `${RT.fmtDate(STATE.customFrom)}` : 'selected date',
    }[STATE.period] || 'selected period';
    subEl.textContent = `Latest sales — ${periodLabel}`;
  }

  if (!txns.length) {
    container.innerHTML = `<tr><td colspan="9">
      <div class="table-empty">
        <div class="table-empty-icon"><i data-lucide="inbox"></i></div>
        <div class="table-empty-title">No transactions yet</div>
        <div class="table-empty-sub">Record your first sale to see it here</div>
      </div>
    </td></tr>`;
    if (window.lucide) lucide.createIcons({ nodes: [container] });
    return;
  }

  container.innerHTML = txns.map(s => {
    const p = RT.getProductById(s.productId);
    const amount = RT.saleAmount(s);
    const tier = s.customerType || 'Walk-in';
    const tierColor = tier === 'Hotel' ? 'var(--primary)' : tier === 'Shopkeeper' ? 'var(--info)' : 'var(--text-2)';
    const tierBg = tier === 'Hotel' ? 'rgba(26,50,98,0.08)' : tier === 'Shopkeeper' ? 'rgba(12,74,110,0.08)' : 'rgba(0,0,0,0.05)';

    return `
      <tr>
        <td class="col-mono" style="font-weight:700;color:var(--primary)">${s.id}</td>
        <td>${RT.fmtDate(s.date)}</td>
        <td class="col-primary" style="font-weight:600">${p ? p.name : '—'}</td>
        <td class="num">${RT.fmtNum(s.quantity, 0)} ${p ? p.unit : ''}</td>
        <td class="num">${RT.fmt(s.rate, 2)}</td>
        <td class="num col-amount" style="font-weight:700">${RT.fmt(amount)}</td>
        <td><span class="badge" style="background:${tierBg};color:${tierColor};font-size:10px;font-weight:700">${tier.toUpperCase()}</span></td>
        <td>${s.buyer}</td>
        <td>${paymentBadge(s.payment)}</td>
      </tr>
    `;
  }).join('');

  if (window.lucide) lucide.createIcons({ nodes: [container] });
}

function renderLowStockAlert() {
  const banner = document.getElementById('low-stock-alert');
  const details = document.getElementById('low-stock-details');
  if (!banner) return;

  const low = RT.PRODUCTS.filter(p => RT.getStockStatus(p) !== 'healthy');
  if (!low.length) { banner.style.display = 'none'; return; }

  banner.style.display = 'flex';
  if (details) {
    const out = low.filter(p => RT.getStockStatus(p) === 'out');
    const lowStock = low.filter(p => RT.getStockStatus(p) === 'low');
    let html = '';
    if (out.length) html += `<strong>${out.map(p => p.name).join(', ')}</strong> — out of stock. `;
    if (lowStock.length) html += `${lowStock.map(p => `${p.name} (${p.currentStock} ${p.unit})`).join(', ')} — below reorder level.`;
    details.innerHTML = html;
  }
  if (window.lucide) lucide.createIcons({ nodes: [banner] });
}

/* ──────────────────────────────────────────────
   SALES
   ────────────────────────────────────────────── */
function renderSales() {
  renderSalesStats();
  renderSalesTable();
}

function renderSalesStats() {
  const sales = getTableData('sales');
  const revenue = sales.reduce((s, x) => s + RT.saleAmount(x), 0);
  const count = sales.length;
  const avg = count ? revenue / count : 0;
  const profit = sales.reduce((s, x) => s + RT.saleProfit(x), 0);
  const marginPct = revenue > 0 ? ((profit / revenue) * 100).toFixed(1) : '0.0';

  const f = TABLE_FILTERS.sales;
  const periodLabel = f.mode === 'today' ? 'today'
    : f.mode === '7d' ? 'last 7 days'
    : f.mode === '30d' ? 'last 30 days'
    : f.mode === 'single' ? RT.fmtDate(f.from)
    : (f.from && f.to ? `${RT.fmtDate(f.from)} → ${RT.fmtDate(f.to)}` : 'custom range');

  const el = document.getElementById('sales-stats');
  if (!el) return;
  el.innerHTML = `
    <div class="stat-card">
      <div class="stat-card-label">Total Transactions</div>
      <div class="stat-card-value">${count}</div>
      <div class="stat-card-sub">${periodLabel}</div>
    </div>
    <div class="stat-card">
      <div class="stat-card-label">Revenue</div>
      <div class="stat-card-value">${RT.fmt(revenue)}</div>
      <div class="stat-card-sub">Avg ${RT.fmt(avg)} per transaction</div>
    </div>
    <div class="stat-card">
      <div class="stat-card-label">Gross Profit Realized</div>
      <div class="stat-card-value" style="color:var(--success)">${RT.fmt(profit)}</div>
      <div class="stat-card-sub">${marginPct}% margin · Zero-credit policy</div>
    </div>
  `;
}

function renderSalesTable() {
  const container = document.getElementById('sales-table-body');
  if (!container) return;

  let data = getTableData('sales');

  if (STATE.salesSearch) {
    const q = STATE.salesSearch.toLowerCase();
    data = data.filter(s => {
      const p = RT.getProductById(s.productId);
      return s.id.toLowerCase().includes(q)
        || (p && p.name.toLowerCase().includes(q))
        || s.buyer.toLowerCase().includes(q)
        || s.payment.toLowerCase().includes(q);
    });
  }

  const total = data.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  STATE.salesPage = Math.min(STATE.salesPage, totalPages);
  const page = data.slice((STATE.salesPage - 1) * PAGE_SIZE, STATE.salesPage * PAGE_SIZE);

  if (!page.length) {
    const isFiltered = STATE.salesSearch || TABLE_FILTERS.sales.mode !== '7d';
    container.innerHTML = `<tr><td colspan="10">
      <div class="table-empty">
        <div class="table-empty-icon"><i data-lucide="trending-up"></i></div>
        <div class="table-empty-title">No sales found</div>
        <div class="table-empty-sub">${isFiltered ? 'No transactions match current filters' : 'Record your first sale to get started'}</div>
        ${isFiltered
          ? `<button class="table-empty-action" onclick="resetTableFilters('sales')"><i data-lucide="rotate-ccw"></i> Reset Filters & Show All</button>`
          : `<button class="btn btn-primary btn-sm" style="margin-top:var(--sp-3)" onclick="navigateTo('make-sale')"><i data-lucide="plus"></i> New Sale</button>`}
      </div>
    </td></tr>`;
    if (window.lucide) lucide.createIcons({ nodes: [container] });
    updatePagination('sales', 0, 0, 1);
    return;
  }

  container.innerHTML = page.map(s => {
    const p = RT.getProductById(s.productId);
    const amount = RT.saleAmount(s);
    const profit = RT.saleProfit(s);
    const lot = s.lotId ? RT.getLotById(s.lotId) : null;
    const sup = lot ? RT.getSupplierById(lot.supplierId) : null;
    const lotLabel = lot ? `${sup ? sup.name.split(' ')[0] : 'Lot'} #${lot.id}` : 'General';
    const tier = s.customerType || 'Walk-in';
    const tierColor = tier === 'Hotel' ? 'var(--primary)' : tier === 'Shopkeeper' ? 'var(--info)' : 'var(--text-2)';
    const tierBg = tier === 'Hotel' ? 'rgba(26,50,98,0.08)' : tier === 'Shopkeeper' ? 'rgba(12,74,110,0.08)' : 'rgba(0,0,0,0.05)';

    return `
      <tr>
        <td class="col-mono">${s.id}</td>
        <td>${RT.fmtDate(s.date)}</td>
        <td class="col-primary" style="font-weight:600">${p ? p.name : '—'}</td>
        <td><span class="badge badge-neutral" style="font-size:11px">${lotLabel}</span></td>
        <td class="num">${RT.fmtNum(s.quantity, 0)} ${p ? p.unit : ''}</td>
        <td class="num">${RT.fmt(s.rate, 2)}</td>
        <td class="num col-amount">${RT.fmt(amount)}</td>
        <td class="num" style="color:${profit >= 0 ? 'var(--success)' : 'var(--danger)'};font-weight:var(--fw-bold)">${RT.fmt(profit)}</td>
        <td><span class="badge" style="background:${tierBg};color:${tierColor};font-size:10.5px;font-weight:700">${tier.toUpperCase()}</span></td>
        <td>${s.buyer}</td>
        <td>${paymentBadge(s.payment)}</td>
      </tr>
    `;
  }).join('');

  if (window.lucide) lucide.createIcons({ nodes: [container] });
  updatePagination('sales', STATE.salesPage, total, totalPages);
}

/* ──────────────────────────────────────────────
   PURCHASES
   ────────────────────────────────────────────── */
function renderPurchases() {
  renderPurchasesStats();
  renderPurchasesTable();
}

function renderPurchasesStats() {
  const purchases = getTableData('purchases');
  const total = purchases.reduce((s, p) => s + RT.purchaseTotal(p), 0);
  const totalUnits = purchases.reduce((s, p) => s + p.quantity, 0);
  const uniqueProducts = new Set(purchases.map(p => p.productId)).size;
  const activeLots = purchases.length;

  const f = TABLE_FILTERS.purchases;
  const periodLabel = f.mode === 'today' ? 'today'
    : f.mode === '7d' ? 'last 7 days'
    : f.mode === '30d' ? 'last 30 days'
    : f.mode === 'single' ? RT.fmtDate(f.from)
    : (f.from && f.to ? `${RT.fmtDate(f.from)} → ${RT.fmtDate(f.to)}` : 'custom range');

  const el = document.getElementById('purchases-stats');
  if (!el) return;
  el.innerHTML = `
    <div class="stat-card">
      <div class="stat-card-label">Total Sourced Cost</div>
      <div class="stat-card-value">${RT.fmt(total)}</div>
      <div class="stat-card-sub">${purchases.length} purchase lots · ${periodLabel}</div>
    </div>
    <div class="stat-card">
      <div class="stat-card-label">Total Units Sourced</div>
      <div class="stat-card-value" style="color:var(--primary)">${RT.fmtNum(totalUnits)} KG</div>
      <div class="stat-card-sub">Active lot intake inventory</div>
    </div>
    <div class="stat-card">
      <div class="stat-card-label">Active Sourced Batches</div>
      <div class="stat-card-value" style="color:var(--success)">${activeLots} Batches</div>
      <div class="stat-card-sub">${uniqueProducts} distinct commodities</div>
    </div>
  `;
}

function renderPurchasesTable() {
  const container = document.getElementById('purchases-table-body');
  if (!container) return;

  let data = getTableData('purchases');

  if (STATE.purchasesSearch) {
    const q = STATE.purchasesSearch.toLowerCase();
    data = data.filter(p => {
      const sup  = RT.SUPPLIERS.find(s => s.id === p.supplierId);
      const prod = RT.getProductById(p.productId);
      return p.id.toLowerCase().includes(q)
        || (sup && sup.name.toLowerCase().includes(q))
        || (prod && prod.name.toLowerCase().includes(q));
    });
  }

  const total = data.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  STATE.purchasesPage = Math.min(STATE.purchasesPage, totalPages);
  const page = data.slice((STATE.purchasesPage - 1) * PAGE_SIZE, STATE.purchasesPage * PAGE_SIZE);

  if (!page.length) {
    const isFiltered = STATE.purchasesSearch || TABLE_FILTERS.purchases.mode !== '7d';
    container.innerHTML = `<tr><td colspan="10">
      <div class="table-empty">
        <div class="table-empty-icon"><i data-lucide="shopping-cart"></i></div>
        <div class="table-empty-title">No purchases found</div>
        <div class="table-empty-sub">${isFiltered ? 'No purchase records match current filters' : 'Record a purchase order to get started'}</div>
        ${isFiltered
          ? `<button class="table-empty-action" onclick="resetTableFilters('purchases')"><i data-lucide="rotate-ccw"></i> Reset Filters & Show All</button>`
          : `<button class="btn btn-primary btn-sm" style="margin-top:var(--sp-3)" onclick="openModal('new-purchase')"><i data-lucide="plus"></i> New Purchase</button>`}
      </div>
    </td></tr>`;
    if (window.lucide) lucide.createIcons({ nodes: [container] });
    updatePagination('purchases', 0, 0, 1);
    return;
  }

  container.innerHTML = page.map(p => {
    const sup  = RT.SUPPLIERS.find(s => s.id === p.supplierId);
    const prod = RT.getProductById(p.productId);
    const total = RT.purchaseTotal(p);
    const tRate = p.targetRate || (p.rate * 1.25);
    const rem   = p.remainingQty !== undefined ? p.remainingQty : p.quantity;
    return `
      <tr>
        <td class="col-mono" style="font-weight:700;color:var(--primary)">${p.id}</td>
        <td>${RT.fmtDate(p.date)}</td>
        <td class="col-primary" style="font-weight:600">${sup ? sup.name : '—'}</td>
        <td>${prod ? prod.name : '—'}</td>
        <td class="num">${RT.fmtNum(p.quantity, 0)} ${prod ? prod.unit : ''}</td>
        <td class="num col-amount">${RT.fmt(total)}</td>
        <td class="num" style="font-weight:600">${RT.fmt(p.rate, 2)}</td>
        <td class="num" style="color:var(--primary);font-weight:700">${RT.fmt(tRate, 2)}</td>
        <td class="num" style="color:${rem > 0 ? 'var(--success)' : 'var(--text-3)'};font-weight:700">${RT.fmtNum(rem, 0)} ${prod ? prod.unit : ''}</td>
        <td>${paymentBadge(p.payment)}</td>
      </tr>
    `;
  }).join('');

  if (window.lucide) lucide.createIcons({ nodes: [container] });
  updatePagination('purchases', STATE.purchasesPage, total, totalPages);
}

/* ──────────────────────────────────────────────
   STOCK / INVENTORY
   ────────────────────────────────────────────── */
function setStockFilter(status) {
  TABLE_FILTERS.stock = TABLE_FILTERS.stock || {};
  TABLE_FILTERS.stock.status = status;
  document.querySelectorAll('#stock-filter-bar .tfilter-status-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.status === status);
  });
  renderStock();
}

function renderStock() {
  const container = document.getElementById('stock-table-body');
  if (!container) return;

  let items = RT.getStockItems();
  if (TABLE_FILTERS.stock && TABLE_FILTERS.stock.status && TABLE_FILTERS.stock.status !== 'all') {
    items = items.filter(i => i.status === TABLE_FILTERS.stock.status);
  }
  if (STATE.stockSearch) {
    const q = STATE.stockSearch.toLowerCase();
    items = items.filter(i => i.name.toLowerCase().includes(q) || i.category.toLowerCase().includes(q));
  }

  // Summary stats
  const summaryEl = document.getElementById('stock-summary');
  if (summaryEl) {
    const totalValue   = items.reduce((s, i) => s + i.stockValue, 0);
    const lowCount     = items.filter(i => i.status === 'low').length;
    const outCount     = items.filter(i => i.status === 'out').length;
    const healthyCount = items.filter(i => i.status === 'healthy').length;

    summaryEl.innerHTML = `
      <div class="stat-card">
        <div class="stat-card-label">Total SKUs</div>
        <div class="stat-card-value">${items.length}</div>
        <div class="stat-card-sub">${healthyCount} healthy · ${lowCount} low · ${outCount} out</div>
      </div>
      <div class="stat-card">
        <div class="stat-card-label">Inventory Value</div>
        <div class="stat-card-value">${RT.fmt(totalValue)}</div>
        <div class="stat-card-sub">At weighted average cost</div>
      </div>
      <div class="stat-card">
        <div class="stat-card-label">Attention Required</div>
        <div class="stat-card-value" style="color:${outCount > 0 ? 'var(--danger)' : lowCount > 0 ? 'var(--warning)' : 'var(--success)'}">
          ${outCount + lowCount}
        </div>
        <div class="stat-card-sub">${outCount} out of stock · ${lowCount} below reorder</div>
      </div>
    `;
  }

  if (!items.length) {
    const isFiltered = STATE.stockSearch || (TABLE_FILTERS.stock && TABLE_FILTERS.stock.status !== 'all');
    container.innerHTML = `<tr><td colspan="7">
      <div class="table-empty">
        <div class="table-empty-icon"><i data-lucide="package"></i></div>
        <div class="table-empty-title">No products found</div>
        <div class="table-empty-sub">${isFiltered ? 'No inventory items match current filters' : 'Inventory catalogue is empty'}</div>
        ${isFiltered
          ? `<button class="table-empty-action" onclick="resetTableFilters('stock')"><i data-lucide="rotate-ccw"></i> Reset Filters & Show All</button>`
          : ''}
      </div>
    </td></tr>`;
    if (window.lucide) lucide.createIcons({ nodes: [container] });
    return;
  }

  container.innerHTML = items.map(item => {
    const fillPct = Math.min(100, (item.currentStock / (item.reorderLevel * 3)) * 100);
    return `
      <tr>
        <td class="col-primary">${item.name}</td>
        <td><span class="badge badge-neutral">${item.category}</span></td>
        <td class="num col-amount" style="color:${item.status === 'out' ? 'var(--danger)' : item.status === 'low' ? 'var(--warning)' : 'var(--text-1)'}">
          ${RT.fmtNum(item.currentStock)} ${item.unit}
        </td>
        <td class="num" style="color:var(--text-3)">${RT.fmtNum(item.reorderLevel)} ${item.unit}</td>
        <td class="num">${RT.fmt(item.avgCost, 2)}</td>
        <td class="num col-amount">${RT.fmt(item.stockValue)}</td>
        <td>${stockStatusBadge(item.status)}</td>
      </tr>
    `;
  }).join('');

  if (window.lucide) lucide.createIcons({ nodes: [container] });

  // Stock page donut
  setTimeout(() => Charts.renderStockPageDonut(), 60);
}

/* ──────────────────────────────────────────────
   SUPPLIERS
   ────────────────────────────────────────────── */
function handleSupplierAnalyticsChange(supplierId) {
  if (typeof Charts !== 'undefined' && Charts.renderSupplierHistory) {
    Charts.renderSupplierHistory(supplierId);
  }
}

function renderSuppliers() {
  const container = document.getElementById('suppliers-table-body');
  if (!container) return;

  // Populate supplier analytics selector
  const supSelect = document.getElementById('supplier-analytics-select');
  if (supSelect) {
    const activeSups = RT.SUPPLIERS.filter(s => s.status === 'active');
    const prevVal = supSelect.value;
    supSelect.innerHTML = activeSups.length === 0
      ? '<option value="">No registered suppliers</option>'
      : activeSups.map(s => {
          const cat = s.category || s.supplyCategory || '';
          const catLabel = cat ? ` (${cat})` : '';
          return `<option value="${s.id}">${s.name} · ${s.location}${catLabel}</option>`;
        }).join('');

    if (prevVal && activeSups.some(s => String(s.id) === String(prevVal))) {
      supSelect.value = prevVal;
    } else if (activeSups.length > 0) {
      supSelect.value = activeSups[0].id;
    }
  }

  // Capture the selected ID NOW — before anything can rebuild the dropdown
  const selectedSupplierId = (() => {
    if (supSelect && supSelect.value) return supSelect.value;
    const firstActive = (RT.SUPPLIERS || []).find(s => s.status === 'active');
    return firstActive ? firstActive.id : '';
  })();

  // Trigger supplier chart with the captured ID (immune to DOM race conditions)
  setTimeout(() => {
    if (typeof Charts !== 'undefined' && Charts.renderSupplierHistory && selectedSupplierId) {
      Charts.renderSupplierHistory(selectedSupplierId);
    }
  }, 60);

  let data = RT.SUPPLIERS.slice();
  if (STATE.suppliersSearch) {
    const q = STATE.suppliersSearch.toLowerCase();
    data = data.filter(s =>
      s.name.toLowerCase().includes(q)
      || s.location.toLowerCase().includes(q)
      || s.category.toLowerCase().includes(q)
    );
  }

  if (!data.length) {
    container.innerHTML = `<tr><td colspan="7">
      <div class="table-empty">
        <div class="table-empty-icon"><i data-lucide="truck"></i></div>
        <div class="table-empty-title">No suppliers found</div>
      </div>
    </td></tr>`;
    if (window.lucide) lucide.createIcons({ nodes: [container] });
    return;
  }

  container.innerHTML = data.map(s => {
    /* Strict supplierId matching — no name fallback to prevent cross-contamination */
    const sPurchases = (RT.PURCHASES || []).filter(p =>
      p.supplierId && String(p.supplierId) === String(s.id)
    );
    const totalVolume = sPurchases.reduce((sum, p) => sum + (p.quantity || 0), 0);
    const totalSpent = sPurchases.reduce((sum, p) => sum + (p.totalCost || 0), 0) || s.totalPurchases || 0;
    const batchCount = sPurchases.length;

    return `
      <tr>
        <td class="col-primary" style="font-weight:600">${s.name}</td>
        <td>${s.phone || '—'}</td>
        <td>${s.location || '—'}</td>
        <td><span class="badge badge-neutral">${s.category || s.supplyCategory || '—'}</span></td>
        <td class="num col-amount" style="font-weight:700">${RT.fmt(totalSpent)}</td>
        <td class="num" style="font-weight:600;color:var(--text-1)">${RT.fmtNum(totalVolume)} KG <span style="font-size:11px;color:var(--text-3);font-weight:400">(${batchCount} lot${batchCount === 1 ? '' : 's'})</span></td>
        <td>${s.status === 'active'
          ? '<span class="badge badge-success">Active</span>'
          : '<span class="badge badge-neutral">Inactive</span>'}</td>
      </tr>
    `;
  }).join('');

  if (window.lucide) lucide.createIcons({ nodes: [container] });
}

/* ──────────────────────────────────────────────
   EXPENSES
   ────────────────────────────────────────────── */
function renderExpenses() {
  renderExpensesStats();
  renderExpensesTable();
  setTimeout(() => Charts.renderExpenseByCategory(STATE.period), 60);
}

function renderExpensesStats() {
  const expenses = getTableData('expenses');
  const total = expenses.reduce((s, e) => s + e.amount, 0);
  const byCategory = {};
  expenses.forEach(e => { byCategory[e.category] = (byCategory[e.category] || 0) + e.amount; });
  const top = Object.entries(byCategory).sort((a, b) => b[1] - a[1])[0];

  const f = TABLE_FILTERS.expenses;
  let days = 7;
  if (f.mode === 'today' || f.mode === 'single') days = 1;
  else if (f.mode === '7d') days = 7;
  else if (f.mode === '30d') days = 30;
  else if (f.mode === 'range' && f.from && f.to) {
    days = Math.max(1, Math.round((new Date(f.to + 'T00:00:00') - new Date(f.from + 'T00:00:00')) / 86400000) + 1);
  }

  const periodLabel = f.mode === 'today' ? 'today'
    : f.mode === '7d' ? 'last 7 days'
    : f.mode === '30d' ? 'last 30 days'
    : f.mode === 'single' ? RT.fmtDate(f.from)
    : (f.from && f.to ? `${RT.fmtDate(f.from)} → ${RT.fmtDate(f.to)}` : 'custom range');

  const el = document.getElementById('expenses-stats');
  if (!el) return;
  el.innerHTML = `
    <div class="stat-card">
      <div class="stat-card-label">Total Expenses</div>
      <div class="stat-card-value">${RT.fmt(total)}</div>
      <div class="stat-card-sub">${expenses.length} transactions · ${periodLabel}</div>
    </div>
    <div class="stat-card">
      <div class="stat-card-label">Largest Category</div>
      <div class="stat-card-value" style="font-size:var(--tx-3xl)">${top ? top[0] : '—'}</div>
      <div class="stat-card-sub">${top ? RT.fmt(top[1]) + ' spent' : 'No data'}</div>
    </div>
    <div class="stat-card">
      <div class="stat-card-label">Daily Average</div>
      <div class="stat-card-value">${RT.fmt(days ? total / days : 0)}</div>
      <div class="stat-card-sub">Per day estimate</div>
    </div>
  `;
}

function renderExpensesTable() {
  const container = document.getElementById('expenses-table-body');
  if (!container) return;

  let data = getTableData('expenses');

  if (STATE.expensesSearch) {
    const q = STATE.expensesSearch.toLowerCase();
    data = data.filter(e =>
      e.description.toLowerCase().includes(q) || e.category.toLowerCase().includes(q)
    );
  }

  const total = data.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  STATE.expensesPage = Math.min(STATE.expensesPage, totalPages);
  const page = data.slice((STATE.expensesPage - 1) * PAGE_SIZE, STATE.expensesPage * PAGE_SIZE);

  if (!page.length) {
    const isFiltered = STATE.expensesSearch || TABLE_FILTERS.expenses.mode !== '7d';
    container.innerHTML = `<tr><td colspan="6">
      <div class="table-empty">
        <div class="table-empty-icon"><i data-lucide="receipt"></i></div>
        <div class="table-empty-title">No expenses found</div>
        <div class="table-empty-sub">${isFiltered ? 'No expenses match current filters' : 'Recording expenses accurately improves profit calculations'}</div>
        ${isFiltered
          ? `<button class="table-empty-action" onclick="resetTableFilters('expenses')"><i data-lucide="rotate-ccw"></i> Reset Filters & Show All</button>`
          : `<button class="btn btn-primary btn-sm" style="margin-top:var(--sp-3)" onclick="openModal('new-expense')"><i data-lucide="plus"></i> New Expense</button>`}
      </div>
    </td></tr>`;
    if (window.lucide) lucide.createIcons({ nodes: [container] });
    updatePagination('expenses', 0, 0, 1);
    return;
  }

  container.innerHTML = page.map(e => `
    <tr>
      <td class="col-mono">${e.id}</td>
      <td>${RT.fmtDate(e.date)}</td>
      <td><span class="badge badge-neutral">${e.category}</span></td>
      <td class="col-primary">${e.description}</td>
      <td class="num col-amount">${RT.fmt(e.amount)}</td>
      <td>${paymentBadge(e.paidBy)}</td>
    </tr>
  `).join('');

  updatePagination('expenses', STATE.expensesPage, total, totalPages);
}

/* ──────────────────────────────────────────────
   REPORTS
   ────────────────────────────────────────────── */
function renderReports() {
  renderPLSummary();
  setTimeout(() => {
    Charts.renderPurchaseSalesTrend();
    Charts.renderPLChart(STATE.period);
  }, 60);
}

function renderPLSummary() {
  const kpis = RT.computeKPIs(STATE.period);
  const grossMargin = kpis.revenue ? ((kpis.grossProfit / kpis.revenue) * 100).toFixed(1) : '0.0';
  const netMargin   = kpis.revenue ? ((kpis.netProfit / kpis.revenue) * 100).toFixed(1) : '0.0';
  const periodLabel = { today: 'Today', '7d': 'Last 7 Days', '30d': 'Last 30 Days' }[STATE.period];

  const labelEl = document.getElementById('pl-period-label');
  if (labelEl) labelEl.textContent = periodLabel;

  const el = document.getElementById('pl-summary');
  if (!el) return;

  el.innerHTML = `
    <div class="insight-row">
      <span class="insight-label">Gross Revenue</span>
      <span class="insight-value">${RT.fmt(kpis.revenue)}</span>
    </div>
    <div class="insight-row">
      <span class="insight-label" style="color:var(--warning)">Cost of Goods Sold</span>
      <span class="insight-value" style="color:var(--warning)">−${RT.fmt(kpis.cogs)}</span>
    </div>
    <div class="insight-row success-highlight" style="margin:var(--sp-2) 0">
      <span class="insight-label strong" style="color:var(--success-text)">Gross Profit</span>
      <span class="insight-value" style="font-size:var(--tx-lg);color:var(--success)">${RT.fmt(kpis.grossProfit)}</span>
    </div>
    <div class="insight-row" style="padding-top:var(--sp-3)">
      <span class="insight-label" style="color:var(--danger)">Operating Expenses</span>
      <span class="insight-value" style="color:var(--danger)">−${RT.fmt(kpis.totalExpenses)}</span>
    </div>
    <div class="insight-row highlighted" style="margin:var(--sp-2) 0">
      <span class="insight-label strong" style="color:var(--primary)">Net Profit</span>
      <span class="insight-value" style="font-size:var(--tx-lg);color:var(--primary)">${RT.fmt(kpis.netProfit)}</span>
    </div>
    <div style="height:1px;background:var(--border);margin:var(--sp-4) 0"></div>
    <div class="insight-row">
      <span class="insight-label">Gross Margin</span>
      <span class="insight-value" style="color:var(--success)">${grossMargin}%</span>
    </div>
    <div class="insight-row">
      <span class="insight-label">Net Margin</span>
      <span class="insight-value" style="color:${parseFloat(netMargin) >= 0 ? 'var(--primary)' : 'var(--danger)'}">${netMargin}%</span>
    </div>
    <div class="insight-row">
      <span class="insight-label">Total Purchases</span>
      <span class="insight-value">${RT.fmt(kpis.totalPurchases)}</span>
    </div>
    <div class="insight-row">
      <span class="insight-label">Credit Outstanding</span>
      <span class="insight-value" style="color:${kpis.creditSales > 0 ? 'var(--warning)' : 'var(--text-3)'}">${RT.fmt(kpis.creditSales)}</span>
    </div>
  `;
}

/* ──────────────────────────────────────────────
   SETTINGS
   ────────────────────────────────────────────── */
function renderSettings() {
  const fields = {
    'settings-business-name': RT.BUSINESS.name,
    'settings-owner':         RT.BUSINESS.owner,
    'settings-location':      RT.BUSINESS.location,
    'settings-phone':         RT.BUSINESS.phone,
    'settings-gstin':         RT.BUSINESS.gstin,
  };
  Object.entries(fields).forEach(([id, val]) => {
    const el = document.getElementById(id);
    if (el) el.value = val;
  });
}

/* ──────────────────────────────────────────────
   BADGE HELPERS
   ────────────────────────────────────────────── */
function statusBadge(status) {
  const m = { paid: ['badge-success','Paid'], partial: ['badge-warning','Partial'], credit: ['badge-warning','Credit'] };
  const [cls, label] = m[status] || ['badge-neutral', status];
  return `<span class="badge ${cls}">${label}</span>`;
}

function purchaseStatusBadge(status) {
  const m = { paid: ['badge-success','Paid'], partial: ['badge-warning','Partial'], credit: ['badge-warning','Due'] };
  const [cls, label] = m[status] || ['badge-neutral', status];
  return `<span class="badge ${cls}">${label}</span>`;
}

function paymentBadge(method) {
  const m = { UPI: 'badge-primary', Cash: 'badge-neutral', Bank: 'badge-info', Credit: 'badge-warning', 'Bank Transfer': 'badge-info' };
  return `<span class="badge ${m[method] || 'badge-neutral'}">${method}</span>`;
}

function stockStatusBadge(status) {
  const m = { healthy: ['badge-success','Healthy'], low: ['badge-warning','Low Stock'], out: ['badge-danger','Out of Stock'] };
  const [cls, label] = m[status] || ['badge-neutral', status];
  return `<span class="badge ${cls}">${label}</span>`;
}

/* ──────────────────────────────────────────────
   PAGINATION
   ────────────────────────────────────────────── */
function updatePagination(key, current, total, totalPages) {
  const countEl = document.getElementById(`${key}-count`);
  if (countEl) countEl.textContent = `${total} record${total !== 1 ? 's' : ''}`;

  const el = document.getElementById(`${key}-pagination`);
  if (!el) return;
  if (totalPages <= 1) { el.innerHTML = ''; return; }

  let html = `<button class="page-btn" onclick="goPage('${key}',${current-1})" ${current===1?'disabled':''}>
    <i data-lucide="chevron-left" style="width:13px;height:13px"></i></button>`;

  for (let i = 1; i <= totalPages; i++) {
    if (totalPages > 7 && Math.abs(i - current) > 2 && i !== 1 && i !== totalPages) {
      if (i === current - 3 || i === current + 3) html += `<span style="padding:0 3px;color:var(--text-3)">…</span>`;
      continue;
    }
    html += `<button class="page-btn ${i === current ? 'active' : ''}" onclick="goPage('${key}',${i})">${i}</button>`;
  }

  html += `<button class="page-btn" onclick="goPage('${key}',${current+1})" ${current===totalPages?'disabled':''}>
    <i data-lucide="chevron-right" style="width:13px;height:13px"></i></button>`;

  el.innerHTML = html;
  if (window.lucide) lucide.createIcons({ nodes: [el] });
}

function goPage(key, page) {
  const map = {
    sales: ['salesPage', renderSalesTable],
    purchases: ['purchasesPage', renderPurchasesTable],
    expenses: ['expensesPage', renderExpensesTable],
    wastage: ['wastagePage', renderWastageTable]
  };
  if (map[key]) { STATE[map[key][0]] = page; map[key][1](); }
}

/* ──────────────────────────────────────────────
   PERIOD SELECTOR
   ────────────────────────────────────────────── */
function setPeriod(period) {
  STATE.period = period;
  document.querySelectorAll('.date-tab').forEach(btn =>
    btn.classList.toggle('active', btn.dataset.period === period)
  );
  renderPage(STATE.page);
}

/* ──────────────────────────────────────────────
   MODAL MANAGEMENT
   ────────────────────────────────────────────── */
function openModal(id) {
  const overlay = document.getElementById('modal-overlay');
  const modal   = document.getElementById(`modal-${id}`);
  if (!overlay || !modal) return;

  document.querySelectorAll('.modal').forEach(m => m.style.display = 'none');
  modal.style.display = 'flex';
  overlay.classList.add('open');
  document.body.style.overflow = 'hidden';

  // Reset form
  const form = modal.querySelector('form');
  if (form) form.reset();

  if (id === 'new-wastage') {
    populateWastageProducts();
    // Auto-select first product that has active lots or stock
    const pSel = document.getElementById('wastage-product');
    if (pSel && pSel.options.length > 1) {
      pSel.selectedIndex = 1;
      handleWastageProductChange();
    }
  }

  if (id === 'new-purchase') {
    const pDate = document.getElementById('purchase-date');
    if (pDate) pDate.value = RT.todayStr();
    const supSel = document.getElementById('purchase-supplier');
    if (supSel) supSel.value = '';
    const prodSel = document.getElementById('purchase-product');
    if (prodSel) prodSel.value = '';
    const qty = document.getElementById('purchase-qty');
    if (qty) qty.value = '';
    const totalCost = document.getElementById('purchase-total-cost');
    if (totalCost) totalCost.value = '';
    const targetRate = document.getElementById('purchase-target-rate');
    if (targetRate) targetRate.value = '';
    const calcRate = document.getElementById('purchase-calculated-rate');
    if (calcRate) calcRate.value = '';
  }

  // Reset summary values
  const resets = {
    'new-sale':     [['sale-subtotal','₹0.00'],['sale-est-cost','₹0.00'],['sale-est-profit','₹0.00']],
    'new-purchase': [['purchase-total','₹0.00'],['purchase-due','₹0.00'],['purchase-paid-display','₹0.00'],['purchase-avg-cost-display','₹0.00 / KG'],['purchase-planned-margin','+₹0.00 (+0.0%)']],
    'new-wastage':  [['wastage-unit-cost-display','₹0.00 / KG'],['wastage-loss-total','₹0.00']],
    'new-supplier': [],
  };
  (resets[id] || []).forEach(([elId, val]) => setEl(elId, val));

  if (window.lucide) lucide.createIcons({ nodes: [modal] });
}

function closeModal() {
  const overlay = document.getElementById('modal-overlay');
  if (overlay) overlay.classList.remove('open');
  document.body.style.overflow = '';
}

/* ── Sale calculation ── */
function updateSaleCalc() {
  const productId = (document.getElementById('sale-product')?.value || '').trim();
  const qty  = parseFloat(document.getElementById('sale-qty')?.value) || 0;
  const rate = parseFloat(document.getElementById('sale-rate')?.value) || 0;
  const p    = RT.getProductById(productId);

  const subtotal  = qty * rate;
  const estCost   = p ? qty * p.avgCost : 0;
  const estProfit = subtotal - estCost;

  setEl('sale-subtotal',   RT.fmt(subtotal, 2));
  setEl('sale-est-cost',   RT.fmt(estCost, 2));
  setEl('sale-est-profit', RT.fmt(estProfit, 2));

  const profitEl = document.getElementById('sale-est-profit');
  if (profitEl) profitEl.style.color = estProfit >= 0 ? 'var(--success)' : 'var(--danger)';
}

/* ── Purchase calculation (Lot Sourcing & Target Pricing) ── */
function handlePurchaseProductChange() {
  const sel = document.getElementById('purchase-product');
  const productId = sel?.value;
  const p = RT.getProductById(productId);
  const unit = p ? p.unit : 'KG';
  setEl('purchase-unit-label', unit);
  setEl('purchase-calc-unit-label', `/ ${unit}`);
  setEl('purchase-target-unit-label', `/ ${unit}`);
  updatePurchaseCalc();
}

function updatePurchaseCalc() {
  const qty       = parseFloat(document.getElementById('purchase-qty')?.value) || 0;
  const totalCost = parseFloat(document.getElementById('purchase-total-cost')?.value) || 0;
  const targetRate= parseFloat(document.getElementById('purchase-target-rate')?.value) || 0;

  const avgCost = qty > 0 ? (totalCost / qty) : 0;
  const spread  = targetRate > 0 ? (targetRate - avgCost) : 0;
  const spreadPct = avgCost > 0 ? ((spread / avgCost) * 100).toFixed(1) : '0.0';

  const rateField = document.getElementById('purchase-calculated-rate');
  if (rateField) rateField.value = avgCost > 0 ? avgCost.toFixed(2) : '0.00';

  const prodSel = document.getElementById('purchase-product');
  const p = prodSel?.value ? RT.getProductById(prodSel.value) : null;
  const unit = p ? p.unit : 'KG';

  setEl('purchase-total', RT.fmt(totalCost, 2));
  setEl('purchase-avg-cost-display', avgCost > 0 ? `${RT.fmt(avgCost, 2)} / ${unit}` : `₹0.00 / ${unit}`);

  const spreadEl = document.getElementById('purchase-planned-margin');
  if (spreadEl) {
    spreadEl.textContent = `${spread >= 0 ? '+' : ''}${RT.fmt(spread, 2)} / ${unit} (${spread >= 0 ? '+' : ''}${spreadPct}%)`;
    spreadEl.style.color = spread >= 0 ? 'var(--success)' : 'var(--danger)';
  }
}

function validateField(elementId, isValid, errorMessage) {
  const el = document.getElementById(elementId);
  if (!el) return isValid;
  if (!isValid) {
    el.classList.add('is-invalid');
    showToast(errorMessage, 'warning');
    el.focus();
    const clear = () => el.classList.remove('is-invalid');
    el.addEventListener('input', clear, { once: true });
    el.addEventListener('change', clear, { once: true });
    return false;
  }
  el.classList.remove('is-invalid');
  return true;
}

/* ── Save Sale ── */
async function saveSale() {
  const date      = document.getElementById('sale-date')?.value || RT.todayStr();
  const productId = (document.getElementById('sale-product')?.value || '').trim();
  const qty       = parseFloat(document.getElementById('sale-qty')?.value);
  const rate      = parseFloat(document.getElementById('sale-rate')?.value);
  const buyer     = document.getElementById('sale-buyer')?.value?.trim() || 'Walk-in';
  const payment   = document.getElementById('sale-payment')?.value || 'Cash';

  if (!validateField('sale-date', !!date, 'Please select a transaction date')) return;
  if (!validateField('sale-product', !!productId, 'Please select a product')) return;
  if (!validateField('sale-qty', !isNaN(qty) && qty > 0, 'Quantity must be a positive number')) return;
  if (!validateField('sale-rate', !isNaN(rate) && rate > 0, 'Unit rate must be greater than zero')) return;
  if (!validateField('sale-payment', !!payment, 'Please select a payment mode')) return;

  const lots = RT.getActiveLots(productId);
  const lotId = lots.length > 0 ? lots[0].id : '';

  await withSubmissionLock('modalSale', '#btn-save-sale', async () => {
    try {
      const result = await RT.gasPost('createSale', {
        date,
        productId,
        lotId,
        quantity: qty,
        rate,
        customerType: 'Walk-in',
        buyer,
        payment
      });

      closeModal();
      const newId = result.invoiceId || result.id || `S${String(RT.SALES.length + 1).padStart(3, '0')}`;
      const rev = Number(result.revenue !== undefined ? result.revenue : (qty * rate));
      const p = RT.getProductById(productId);
      const lot = lotId ? RT.getLotById(lotId) : null;
      const cogs = Number(result.cogs !== undefined ? result.cogs : (lot ? lot.rate * qty : (p ? p.avgCost * qty : 0)));
      const gp = Number(result.grossProfit !== undefined ? result.grossProfit : (rev - cogs));

      const newSale = {
        id: newId,
        invoiceId: newId,
        date: date || RT.todayStr(),
        productId,
        productName: p ? p.name : '',
        lotId: lotId || '',
        quantity: qty,
        rate,
        revenue: rev,
        cogs,
        grossProfit: gp,
        customerType: 'Walk-in',
        buyer,
        payment,
        status: 'paid'
      };
      RT.SALES.unshift(newSale);
      if (p) p.currentStock = Math.max(0, p.currentStock - qty);
      if (lot) {
        const curRem = lot.remainingQty !== undefined ? lot.remainingQty : lot.quantity;
        lot.remainingQty = Math.max(0, curRem - qty);
      }

      showToast(`Sale #${newId} recorded — ${RT.fmt(rev)}`, 'success');
      renderPage(STATE.page);
      RT.refresh(true).catch(err => console.warn('[RT] Sync warning:', err.message));
    } catch (err) {
      showToast(err.message || 'Failed to record sale in Google Sheets', 'danger');
    }
  });
}

/* ── Save Purchase (Lot Sourcing & Valuation) ── */
async function savePurchase() {
  const date       = document.getElementById('purchase-date')?.value || RT.todayStr();
  const supplierId = (document.getElementById('purchase-supplier')?.value || '').trim();
  const productId  = (document.getElementById('purchase-product')?.value || '').trim();
  const qty        = parseFloat(document.getElementById('purchase-qty')?.value);
  const totalCost  = parseFloat(document.getElementById('purchase-total-cost')?.value);
  const targetRate = parseFloat(document.getElementById('purchase-target-rate')?.value);
  const payment    = document.getElementById('purchase-payment')?.value || 'Bank';

  if (!validateField('purchase-date', !!date, 'Please select a purchase date')) return;
  if (!validateField('purchase-supplier', !!supplierId, 'Please select a supplier')) return;
  if (!validateField('purchase-product', !!productId, 'Please select a product')) return;
  if (!validateField('purchase-qty', !isNaN(qty) && qty > 0, 'Quantity must be a positive number')) return;
  if (!validateField('purchase-total-cost', !isNaN(totalCost) && totalCost > 0, 'Total purchase price must be greater than zero')) return;
  if (!validateField('purchase-target-rate', !isNaN(targetRate) && targetRate > 0, 'Target selling rate must be greater than zero')) return;

  await withSubmissionLock('savePurchase', '#btn-save-purchase', async () => {
    try {
      const result = await RT.gasPost('createPurchase', {
        date,
        supplierId,
        productId,
        totalQty: qty,
        totalCost,
        targetRate,
        payment
      });

      closeModal();
      const newId = result.lotId || result.id || `P${String(RT.PURCHASES.length + 1).padStart(3, '0')}`;
      const prod = RT.getProductById(productId);
      const sup = RT.getSupplierById(supplierId);
      const newPurchase = {
        id: newId,
        lotId: newId,
        date: date || RT.todayStr(),
        productId,
        productName: prod ? prod.name : '',
        supplierId,
        supplierName: sup ? sup.name : '',
        quantity: qty,
        totalCost,
        rate: Number(result.unitCost !== undefined ? result.unitCost : (totalCost / qty)),
        targetRate,
        remainingQty: qty,
        amountPaid: totalCost,
        payment,
        status: 'paid'
      };
      RT.PURCHASES.unshift(newPurchase);
      if (prod) prod.currentStock += qty;

      showToast(`Purchase lot ${newId} posted — ${RT.fmt(totalCost)}`, 'success');
      renderPage(STATE.page);
      RT.refresh(true).catch(err => console.warn('[RT] Sync warning:', err.message));
    } catch (err) {
      showToast(err.message || 'Failed to record purchase in Google Sheets', 'danger');
    }
  });
}

/* ── Save Expense ── */
async function saveExpense() {
  const date     = document.getElementById('expense-date')?.value || RT.todayStr();
  const category = document.getElementById('expense-category')?.value;
  const desc     = document.getElementById('expense-desc')?.value?.trim() || '';
  const amount   = parseFloat(document.getElementById('expense-amount')?.value);
  const paidBy   = document.getElementById('expense-paidby')?.value || 'Cash';

  if (!validateField('expense-date', !!date, 'Please select an expense date')) return;
  if (!validateField('expense-category', !!category, 'Please select an expense category')) return;
  if (!validateField('expense-desc', !!desc, 'Please enter an expense description')) return;
  if (!validateField('expense-amount', !isNaN(amount) && amount > 0, 'Expense amount must be greater than zero')) return;
  if (!validateField('expense-paidby', !!paidBy, 'Please select payment method')) return;

  await withSubmissionLock('saveExpense', '#btn-save-expense', async () => {
    try {
      const payMode = paidBy || 'Cash';
      const result = await RT.gasPost('createExpense', {
        date,
        category,
        description: desc,
        amount,
        paidBy: payMode,
        paymentMode: payMode,
        payment: payMode,
        payment_mode: payMode
      });

      closeModal();
      const expId = result.expenseId || result.id || `E${String(RT.EXPENSES.length + 1).padStart(3, '0')}`;
      const newExp = {
        id: expId,
        expenseId: expId,
        date: date || RT.todayStr(),
        category,
        description: desc,
        amount,
        paidBy: payMode,
        paymentMode: payMode
      };
      RT.EXPENSES.unshift(newExp);

      showToast(`Expense ${expId} recorded — ${RT.fmt(amount)}`, 'success');
      renderPage(STATE.page);
      RT.refresh(true).catch(err => console.warn('[RT] Sync warning:', err.message));
    } catch (err) {
      showToast(err.message || 'Failed to record expense in Google Sheets', 'danger');
    }
  });
}

/* ──────────────────────────────────────────────
   SIDEBAR
   ────────────────────────────────────────────── */
function openSidebar() {
  document.getElementById('sidebar')?.classList.add('open');
  document.getElementById('sidebar-overlay')?.classList.add('visible');
  document.body.style.overflow = 'hidden';
}

function closeSidebar() {
  document.getElementById('sidebar')?.classList.remove('open');
  document.getElementById('sidebar-overlay')?.classList.remove('visible');
  document.body.style.overflow = '';
}

/* ──────────────────────────────────────────────
   TOASTS
   ────────────────────────────────────────────── */
function showToast(msg, type = '') {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const icons = { success: 'check-circle', warning: 'alert-triangle', danger: 'x-circle' };
  const iconName = icons[type] || 'info';
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <i data-lucide="${iconName}" class="toast-icon"></i>
    <div class="toast-content"><div class="toast-msg">${msg}</div></div>
  `;
  container.appendChild(toast);
  if (window.lucide) lucide.createIcons({ nodes: [toast] });
  setTimeout(() => { toast.classList.add('removing'); setTimeout(() => toast.remove(), 200); }, 3000);
}

/* ──────────────────────────────────────────────
   SEARCH
   ────────────────────────────────────────────── */
function handleSearch(key, value) {
  STATE[`${key}Search`] = value;
  STATE[`${key}Page`] = 1;
  const renders = { sales: renderSalesTable, purchases: renderPurchasesTable, stock: renderStock, suppliers: renderSuppliers, expenses: renderExpensesTable };
  if (renders[key]) renders[key]();
}

/* ──────────────────────────────────────────────
   UTILITY
   ────────────────────────────────────────────── */
function setEl(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

/* ══════════════════════════════════════════════
   GLOBAL ERROR BOUNDARY
   ══════════════════════════════════════════════ */
function initErrorBoundary() {
  window.onerror = function(msg, url, lineNo, columnNo, error) {
    showErrorBanner(msg || 'An unexpected runtime error occurred.');
    console.error('Captured by Enterprise Error Boundary:', { msg, url, lineNo, columnNo, error });
    return false;
  };

  window.addEventListener('unhandledrejection', function(event) {
    const reason = event.reason?.message || event.reason || 'Unhandled asynchronous rejection.';
    showErrorBanner(reason);
    console.error('Captured by Enterprise Unhandled Rejection Boundary:', event.reason);
  });
}

function showErrorBanner(message) {
  const banner = document.getElementById('enterprise-error-banner');
  const msgEl  = document.getElementById('err-boundary-msg');
  if (banner && msgEl) {
    msgEl.textContent = String(message).slice(0, 140);
    banner.style.display = 'flex';
  }
}

function dismissErrorBanner() {
  const banner = document.getElementById('enterprise-error-banner');
  if (banner) banner.style.display = 'none';
}

function recoverSafeState() {
  dismissErrorBanner();
  STATE.page = 'dashboard';
  STATE.period = '7d';
  STATE.customFrom = null;
  STATE.customTo = null;
  STATE.salesSearch = '';
  STATE.purchasesSearch = '';
  STATE.stockSearch = '';
  STATE.expensesSearch = '';
  navigateTo('dashboard');
  showToast('Restored safe system view', 'info');
}

/* ──────────────────────────────────────────────
   INIT
   ────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  initErrorBoundary();
  Charts.init();

  document.querySelectorAll('.nav-item[data-page]').forEach(item => {
    item.addEventListener('click', () => navigateTo(item.dataset.page));
  });

  document.querySelectorAll('.date-tab[data-period]').forEach(btn => {
    btn.addEventListener('click', () => setPeriod(btn.dataset.period));
  });

  document.getElementById('mobile-menu-btn')?.addEventListener('click', openSidebar);
  document.getElementById('sidebar-overlay')?.addEventListener('click', closeSidebar);

  document.getElementById('modal-overlay')?.addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closeModal();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModal();
  });

  // Set today's date in all date inputs
  document.querySelectorAll('.date-default').forEach(input => {
    input.value = RT.todayStr();
  });

  navigateTo('dashboard');
  if (window.lucide) lucide.createIcons();
});

/* ──────────────────────────────────────────────
   WASTAGE & SPOILAGE MANAGEMENT
   ────────────────────────────────────────────── */
function renderWastagePage() {
  renderWastageStats();
  renderWastageTable();
}

function renderWastageStats() {
  const wastage = getTableData('wastage');
  const totalWeight = wastage.reduce((s, w) => s + (w.quantity !== undefined ? w.quantity : (w.wastedQty || 0)), 0);
  const totalLoss   = wastage.reduce((s, w) => s + (w.lossAmount || 0), 0);

  const f = TABLE_FILTERS.wastage;
  const periodLabel = f.mode === 'today' ? 'today'
    : f.mode === '7d' ? 'last 7 days'
    : f.mode === '30d' ? 'last 30 days'
    : f.mode === 'single' ? RT.fmtDate(f.from)
    : (f.from && f.to ? `${RT.fmtDate(f.from)} → ${RT.fmtDate(f.to)}` : 'custom range');

  const el = document.getElementById('wastage-stats');
  if (!el) return;
  el.innerHTML = `
    <div class="stat-card">
      <div class="stat-card-label">Total Wasted Weight</div>
      <div class="stat-card-value" style="color:var(--danger)">${RT.fmtNum(totalWeight)} KG</div>
      <div class="stat-card-sub">${wastage.length} writedown events · ${periodLabel}</div>
    </div>
    <div class="stat-card">
      <div class="stat-card-label">Financial Shrinkage Loss</div>
      <div class="stat-card-value" style="color:var(--danger)">${RT.fmt(totalLoss)}</div>
      <div class="stat-card-sub">Realized procurement write-off</div>
    </div>
    <div class="stat-card">
      <div class="stat-card-label">Avg Loss / Entry</div>
      <div class="stat-card-value" style="color:var(--warning)">${RT.fmt(wastage.length ? totalLoss / wastage.length : 0)}</div>
      <div class="stat-card-sub">Per spoilage incident</div>
    </div>
  `;
}

function renderWastageTable() {
  const container = document.getElementById('wastage-table-body');
  if (!container) return;

  let data = getTableData('wastage');
  if (STATE.wastageSearch) {
    const q = STATE.wastageSearch.toLowerCase();
    data = data.filter(w => {
      const p = RT.getProductById(w.productId);
      const prodName = p ? p.name.toLowerCase() : '';
      return w.id.toLowerCase().includes(q) ||
             w.reason.toLowerCase().includes(q) ||
             prodName.includes(q);
    });
  }

  const total = data.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  STATE.wastagePage = Math.min(STATE.wastagePage, totalPages);
  const page = data.slice((STATE.wastagePage - 1) * PAGE_SIZE, STATE.wastagePage * PAGE_SIZE);

  if (!page.length) {
    const isFiltered = STATE.wastageSearch || TABLE_FILTERS.wastage.mode !== '7d';
    container.innerHTML = `<tr><td colspan="9">
      <div class="table-empty">
        <div class="table-empty-icon"><i data-lucide="check-circle-2"></i></div>
        <div class="table-empty-title">Zero produce wastage recorded</div>
        <div class="table-empty-sub">${isFiltered ? 'No wastage entries match current filters' : 'Great job! No spoilage or transit losses reported.'}</div>
      </div>
    </td></tr>`;
    if (window.lucide) lucide.createIcons({ nodes: [container] });
    updatePagination('wastage', 0, 0, 1);
    return;
  }

  container.innerHTML = page.map(w => {
    const p   = RT.getProductById(w.productId);
    const lot = w.lotId ? RT.getLotById(w.lotId) : null;
    const sup = lot ? RT.getSupplierById(lot.supplierId) : null;
    const lotLabel = lot ? `${sup ? sup.name.split(' ')[0] : 'Lot'} #${lot.id}` : 'General Stock';

    return `
      <tr>
        <td class="col-mono" style="font-weight:700;color:var(--danger)">${w.id}</td>
        <td>${RT.fmtDate(w.date)}</td>
        <td class="col-primary" style="font-weight:600">${p ? p.name : '—'}</td>
        <td><span class="badge badge-neutral" style="font-size:11px">${lotLabel}</span></td>
        <td class="num" style="color:var(--danger);font-weight:700">${RT.fmtNum(w.quantity !== undefined ? w.quantity : (w.wastedQty || 0))} ${p ? p.unit : 'KG'}</td>
        <td class="num">${RT.fmt(w.unitCost, 2)}</td>
        <td class="num col-amount" style="color:var(--danger);font-weight:700">${RT.fmt(w.lossAmount)}</td>
        <td><span class="badge" style="background:rgba(139,26,26,0.08);color:var(--danger);font-size:11px;font-weight:600">${w.reason}</span></td>
        <td style="color:var(--text-2);font-size:12px">${w.notes || '—'}</td>
      </tr>
    `;
  }).join('');

  if (window.lucide) lucide.createIcons({ nodes: [container] });
  updatePagination('wastage', STATE.wastagePage, total, totalPages);
}

function populateWastageProducts() {
  const sel = document.getElementById('wastage-product');
  if (!sel) return;
  sel.innerHTML = '<option value="">Select product…</option>' +
    RT.PRODUCTS.map(p => `<option value="${p.id}">${p.name} (Stock: ${RT.fmtNum(p.currentStock)} ${p.unit})</option>`).join('');

  handleWastageProductChange();
}

function handleWastageProductChange() {
  const pId = (document.getElementById('wastage-product')?.value || '').trim();
  const lotSel = document.getElementById('wastage-lot');
  if (!lotSel) return;

  if (!pId) {
    lotSel.innerHTML = '<option value="">Select product first…</option>';
    return;
  }

  const p = RT.getProductById(pId);
  const unit = p ? p.unit : 'KG';
  setEl('wastage-unit-label', unit);

  const lots = RT.getActiveLots(pId);
  if (!lots.length) {
    lotSel.innerHTML = '<option value="">No active lots (General Stock)</option>';
  } else {
    lotSel.innerHTML = lots.map(lot => {
      const sup = RT.getSupplierById(lot.supplierId);
      const supName = sup ? sup.name : (lot.supplierName || 'Vendor');
      const supId = lot.supplierId || (sup ? sup.id : '');
      const supDisplay = supId ? `${supName} (${supId})` : supName;
      const dateStr = lot.date ? RT.fmtDate(lot.date) : '';
      const avail = lot.remainingQty !== undefined ? lot.remainingQty : (lot.quantity || 0);
      const cost = lot.rate || (lot.quantity > 0 ? lot.totalCost / lot.quantity : 0);
      return `<option value="${lot.id}" data-cost="${cost}">
        ${supDisplay} · Lot #${lot.id} · ${dateStr} (${RT.fmtNum(avail)} ${unit} @ ${RT.fmt(cost, 2)})
      </option>`;
    }).join('');
  }

  handleWastageLotChange();
}

function handleWastageLotChange() {
  const lotSel = document.getElementById('wastage-lot');
  const opt = lotSel?.selectedOptions[0];
  const cost = opt?.dataset?.cost ? parseFloat(opt.dataset.cost) : 0;
  setEl('wastage-unit-cost-display', `₹${cost.toFixed(2)} / KG`);
  updateWastageCalc();
}

function updateWastageCalc() {
  const qty = parseFloat(document.getElementById('wastage-qty')?.value) || 0;
  const lotSel = document.getElementById('wastage-lot');
  const opt = lotSel?.selectedOptions[0];
  let unitCost = opt?.dataset?.cost ? parseFloat(opt.dataset.cost) : 0;

  if (!unitCost) {
    const pId = (document.getElementById('wastage-product')?.value || '').trim();
    const p = RT.getProductById(pId);
    unitCost = p ? p.avgCost : 0;
  }

  const totalLoss = qty * unitCost;
  setEl('wastage-unit-cost-display', `₹${unitCost.toFixed(2)} / KG`);
  setEl('wastage-loss-total', RT.fmt(totalLoss, 2));
}

/* ── Save Wastage ── */
async function saveWastage() {
  const date      = document.getElementById('wastage-date')?.value || RT.todayStr();
  const productId = (document.getElementById('wastage-product')?.value || '').trim();
  const lotId     = (document.getElementById('wastage-lot')?.value || '').trim();
  const qty       = parseFloat(document.getElementById('wastage-qty')?.value);
  const reason    = document.getElementById('wastage-reason')?.value || 'Rot / Spoilage';
  const notes     = document.getElementById('wastage-notes')?.value?.trim() || '';

  if (!validateField('wastage-date', !!date, 'Please select a date')) return;
  if (!validateField('wastage-product', !!productId, 'Please select a product')) return;
  if (!validateField('wastage-qty', !isNaN(qty) && qty > 0, 'Quantity must be greater than zero')) return;

  const p = RT.getProductById(productId);
  const lot = lotId ? RT.getLotById(lotId) : null;

  if (lot && lot.remainingQty !== undefined && qty > lot.remainingQty) {
    validateField('wastage-qty', false, `Cannot waste more than available in Lot #${lot.id} (${lot.remainingQty} ${p ? p.unit : 'KG'})`);
    return;
  }
  if (p && qty > p.currentStock) {
    validateField('wastage-qty', false, `Cannot waste more than available inventory (${p.currentStock} ${p.unit})`);
    return;
  }

  await withSubmissionLock('saveWastage', '#btn-save-wastage', async () => {
    try {
      const rec = await RT.gasPost('createWastage', {
        productId,
        lotId,
        quantity: qty,
        reason,
        notes,
        date
      });

      closeModal();
      const newId = rec.wastageId || rec.id || `W${String(RT.WASTAGE.length + 1).padStart(3, '0')}`;
      const unitCost = lot ? (lot.rate || (lot.quantity > 0 ? lot.totalCost / lot.quantity : 0)) : (p ? p.avgCost : 0);
      const newWastage = {
        id: newId,
        wastageId: newId,
        date: date || RT.todayStr(),
        productId,
        productName: p ? p.name : '',
        lotId: lotId || '',
        quantity: qty,
        wastedQty: qty,
        unitCost,
        lossAmount: Number(rec.lossAmount !== undefined ? rec.lossAmount : (qty * unitCost)),
        reason,
        notes
      };
      RT.WASTAGE.unshift(newWastage);
      if (p) p.currentStock = Math.max(0, p.currentStock - qty);
      if (lot && lot.remainingQty !== undefined) {
        lot.remainingQty = Math.max(0, lot.remainingQty - qty);
      }

      showToast(`Wastage record #${newId} recorded`, 'warning');
      renderPage(STATE.page);
      RT.refresh(true).catch(err => console.warn('[RT] Sync warning:', err.message));
    } catch (err) {
      showToast(err.message || 'Failed to save wastage in Google Sheets', 'danger');
    }
  });
}

/* ──────────────────────────────────────────────
   SUPPLIER MANAGEMENT (Zero-Credit Direct Sourcing)
   ────────────────────────────────────────────── */
async function saveSupplier() {
  const name     = document.getElementById('supplier-name')?.value?.trim();
  const phone    = document.getElementById('supplier-phone')?.value?.trim();
  const location = document.getElementById('supplier-location')?.value?.trim();
  const category = document.getElementById('supplier-category')?.value || (RT.PRODUCTS && RT.PRODUCTS[0] ? RT.PRODUCTS[0].name : 'White Onion');
  const notes    = document.getElementById('supplier-notes')?.value?.trim() || '';

  if (!validateField('supplier-name', !!name, 'Please enter supplier or farm name')) return;
  if (!validateField('supplier-phone', !!phone && phone.length >= 8, 'Please enter a valid phone number')) return;
  if (!validateField('supplier-location', !!location, 'Please enter supplier location')) return;

  const exists = RT.SUPPLIERS.some(s =>
    s.name.toLowerCase() === name.toLowerCase() &&
    (s.category || s.supplyCategory || '').toLowerCase() === category.toLowerCase()
  );
  if (exists) {
    showToast(`Supplier "${name}" for "${category}" is already registered!`, 'warning');
    return;
  }

  await withSubmissionLock('saveSupplier', '#btn-save-supplier', async () => {
    try {
      await RT.gasPost('createSupplier', {
        name,
        phone,
        location,
        category,
        supplyCategory: category,
        status: 'Active',
        notes
      });

      closeModal();
      const newId = `SUP-${String(RT.SUPPLIERS.length + 1).padStart(3, '0')}`;
      const newSup = {
        id: newId,
        supplierId: newId,
        name,
        phone,
        location,
        category,
        supplyCategory: category,
        status: 'active',
        totalPurchases: 0,
        outstanding: 0,
        notes
      };
      RT.SUPPLIERS.unshift(newSup);

      showToast(`Supplier "${name}" registered`, 'success');
      renderSuppliers();
      RT.refresh(true).catch(err => console.warn('[RT] Sync warning:', err.message));
    } catch (err) {
      showToast(err.message || 'Failed to save supplier in Google Sheets', 'danger');
    }
  });
}
