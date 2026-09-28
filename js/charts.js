/* =============================================================
   RAJARAJESHWARI TRADERS — Charts v3
   Institutional-grade Chart.js — Classic Premium Palette
   Navy · Forest Green · Amber · Deep Violet · Steel · Crimson
   ============================================================= */

'use strict';

const Charts = (() => {

  const registry = {};

  /* ── Institutional 6-color palette (matches CSS tokens v3) ── */
  const COLORS = {
    navy:    '#1A3262',
    green:   '#0B6640',
    amber:   '#9E4C00',
    violet:  '#5B2D8E',
    steel:   '#0C4A6E',
    crimson: '#8B1A1A',

    navyA:    'rgba(26,50,98,0.10)',
    greenA:   'rgba(11,102,64,0.09)',
    amberA:   'rgba(158,76,0,0.09)',
  };

  const PALETTE = [
    COLORS.navy, COLORS.green, COLORS.amber,
    COLORS.violet, COLORS.steel, COLORS.crimson,
  ];

  /* ── Global defaults ── */
  function applyDefaults() {
    if (!window.Chart) return;
    Chart.defaults.font.family    = "'Inter', sans-serif";
    Chart.defaults.font.size      = 11;
    Chart.defaults.color          = '#6B7280';
    Chart.defaults.plugins.legend.display = false;
    Chart.defaults.animation.duration     = 360;
    Chart.defaults.animation.easing       = 'easeOutQuart';
  }

  /* ── Shared axis/grid styles ── */
  const GRID = {
    color: 'rgba(0,0,0,0.055)',
    drawBorder: false,
  };

  const TICK = {
    color: '#6B7280',
    font: { family: "'Inter', sans-serif", size: 10.5, weight: '500' },
    padding: 6,
  };

  /* ── Premium dark tooltip ── */
  const TOOLTIP = {
    backgroundColor: '#0D1117',
    titleColor: '#6B7280',
    bodyColor: '#E8E4D9',
    borderColor: 'rgba(196,154,56,0.18)',
    borderWidth: 1,
    padding: { top: 10, right: 14, bottom: 10, left: 14 },
    cornerRadius: 8,
    boxPadding: 4,
    usePointStyle: true,
    callbacks: {
      label: (ctx) => ` ${ctx.dataset.label || ctx.label}: ${RT.fmt(ctx.parsed.y ?? ctx.parsed)}`,
    },
  };

  /* ── Chart registry ── */
  function destroyChart(id) {
    if (registry[id]) { registry[id].destroy(); delete registry[id]; }
  }

  function createChart(canvasId, config) {
    destroyChart(canvasId);
    const canvas = document.getElementById(canvasId);
    if (!canvas) return null;
    const chart = new Chart(canvas.getContext('2d'), config);
    registry[canvasId] = chart;
    return chart;
  }

  /* ── Warm line chart gradient helper ── */
  function gradient(canvasId, colorRGBA, height = 300) {
    try {
      const canvas = document.getElementById(canvasId);
      if (!canvas) return colorRGBA;
      const ctx = canvas.getContext('2d');
      const g = ctx.createLinearGradient(0, 0, 0, canvas.offsetHeight || height);
      const opaque   = colorRGBA.replace(/[\d.]+\)$/, '0.85)');
      const transparent = colorRGBA.replace(/[\d.]+\)$/, '0)');
      g.addColorStop(0, opaque);
      g.addColorStop(1, transparent);
      return g;
    } catch { return colorRGBA; }
  }

  /* ── Rich Solid Two-Tone Bar Gradient (No milky transparency) ── */
  function solidBarGradient(canvasId, topHex, bottomHex, height = 260) {
    try {
      const canvas = document.getElementById(canvasId);
      if (!canvas) return topHex;
      const ctx = canvas.getContext('2d');
      const h = canvas.offsetHeight || height;
      const g = ctx.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, topHex);
      g.addColorStop(1, bottomHex);
      return g;
    } catch { return topHex; }
  }

  /* ══════════════════════════════════════════════
     REVENUE & PROFIT TREND
     ══════════════════════════════════════════════ */
  function renderRevenueTrend(period, customFrom, customTo) {
    const data = RT.getDailyTrend(period, customFrom, customTo);

    createChart('chart-revenue-trend', {
      type: 'line',
      data: {
        labels: data.labels,
        datasets: [
          {
            label: 'Revenue',
            data: data.revenue,
            borderColor: COLORS.navy,
            backgroundColor: gradient('chart-revenue-trend', COLORS.navyA),
            borderWidth: 2,
            pointBackgroundColor: COLORS.navy,
            pointBorderColor: '#FFFFFF',
            pointBorderWidth: 2,
            pointRadius: 4,
            pointHoverRadius: 6,
            tension: 0.42,
            fill: true,
          },
          {
            label: 'Net Profit',
            data: data.profit,
            borderColor: COLORS.green,
            backgroundColor: gradient('chart-revenue-trend', COLORS.greenA),
            borderWidth: 2,
            pointBackgroundColor: COLORS.green,
            pointBorderColor: '#FFFFFF',
            pointBorderWidth: 2,
            pointRadius: 4,
            pointHoverRadius: 6,
            tension: 0.42,
            fill: true,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { display: false },
          tooltip: TOOLTIP,
        },
        scales: {
          x: {
            grid: { display: false },
            border: { display: false },
            ticks: TICK,
          },
          y: {
            grid: GRID,
            border: { display: false },
            ticks: {
              ...TICK,
              callback: (v) => v < 0
                ? '−₹' + (Math.abs(v) / 1000).toFixed(0) + 'K'
                : '₹' + (v >= 1000 ? (v / 1000).toFixed(0) + 'K' : v),
            },
          },
        },
      },
    });
  }

  /* ══════════════════════════════════════════════
     STOCK DISTRIBUTION DONUT
     ══════════════════════════════════════════════ */
  function renderStockDonut() {
    const items = RT.getStockItems()
      .slice()
      .sort((a, b) => b.stockValue - a.stockValue)
      .slice(0, 6);

    const config = {
      type: 'doughnut',
      data: {
        labels: items.map(i => i.name),
        datasets: [{
          data: items.map(i => Math.round(i.stockValue)),
          backgroundColor: PALETTE,
          borderWidth: 3,
          borderColor: '#FFFFFF',
          hoverOffset: 5,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '68%',
        plugins: {
          legend: {
            display: true,
            position: 'bottom',
            labels: {
              padding: 14,
              usePointStyle: true,
              pointStyle: 'circle',
              pointStyleWidth: 7,
              color: '#374151',
              font: { family: "'Inter', sans-serif", size: 10.5, weight: '500' },
            },
          },
          tooltip: {
            ...TOOLTIP,
            callbacks: {
              label: (ctx) => ` ${ctx.label}: ${RT.fmt(ctx.parsed)} value`,
            },
          },
        },
      },
    };

    createChart('chart-stock-donut', config);
  }

  /* ══════════════════════════════════════════════
     REVENUE BY PRODUCT (Horizontal Bar)
     ══════════════════════════════════════════════ */
  function renderSalesByProduct(period, customFrom, customTo) {
    const pnl = RT.getPnLByProduct(period, customFrom, customTo);
    // Filter items with sales, sort descending by revenue, take top 6
    const top = pnl.filter(r => r.revenue > 0).slice(0, 6);
    const labels = top.map(row => row.product ? row.product.name : 'Unknown');
    const revenues = top.map(row => row.revenue);
    const cogsArr  = top.map(row => row.cogs);
    const profits  = top.map(row => row.profit);
    const margins  = top.map(row => row.marginPct);
    const qtys     = top.map(row => row.qty);

    const gradedPalette = [
      '#1A3262', /* White Onion - Deep Corporate Navy */
      '#2563EB', /* Red Onion - Cobalt */
      '#0B6640', /* Small Onion - Forest Emerald */
      '#0F766E', /* Potato - Dark Teal */
      '#B45309', /* Garlic - Amber Bronze */
      '#6B21A8', /* Ginger - Rich Purple */
    ];

    createChart('chart-sales-product', {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [{
          label: 'Revenue',
          data: revenues,
          backgroundColor: gradedPalette.slice(0, labels.length),
          borderRadius: 6,
          borderSkipped: false,
          barThickness: 16,
          barPercentage: 0.58,
          categoryPercentage: 0.72,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        layout: {
          padding: { left: 4, right: 12, top: 4, bottom: 4 }
        },
        indexAxis: 'y',
        plugins: {
          legend: { display: false },
          tooltip: {
            ...TOOLTIP,
            callbacks: {
              title: (items) => `${items[0].label} Revenue & Margins`,
              label: (ctx) => {
                const idx = ctx.dataIndex;
                return ` Revenue: ${RT.fmt(revenues[idx])}  ·  Volume: ${RT.fmtNum(qtys[idx])} KG`;
              },
              afterLabel: (ctx) => {
                const idx = ctx.dataIndex;
                return ` Sourced Cost: ${RT.fmt(cogsArr[idx])}  ·  Gross Profit: ${RT.fmt(profits[idx])} (${margins[idx]}% margin)`;
              }
            },
          },
        },
        scales: {
          x: {
            grid: GRID,
            border: { display: false },
            ticks: {
              ...TICK,
              callback: (v) => '₹' + (v >= 1000 ? (v / 1000).toFixed(0) + 'K' : v),
              padding: 6,
            },
          },
          y: {
            grid: { display: false },
            border: { display: false },
            ticks: {
              ...TICK,
              font: { ...TICK.font, size: 11, weight: '600' },
              color: '#1F2937',
              padding: 10,
            },
          },
        },
      },
    });
  }

  /* ══════════════════════════════════════════════
     CUSTOMER TIER BREAKDOWN (Walk-in vs Shopkeeper vs Hotel)
     ══════════════════════════════════════════════ */
  function renderCustomerSegments(period, customFrom, customTo) {
    const stats = RT.getCustomerTypeStats(period, customFrom, customTo);
    const labels = ['Walk-in (Retail)', 'Shopkeeper (Reseller)', 'Hotel (Commercial)'];
    const revenues = [stats['Walk-in'].revenue, stats['Shopkeeper'].revenue, stats['Hotel'].revenue];
    const volumes  = [stats['Walk-in'].qty, stats['Shopkeeper'].qty, stats['Hotel'].qty];

    createChart('chart-customer-segments', {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'Revenue (₹)',
            data: revenues,
            backgroundColor: solidBarGradient('chart-customer-segments', '#1A3262', '#2A4D8C'),
            borderColor: '#152A54',
            borderWidth: 1.5,
            borderRadius: { topLeft: 8, topRight: 8, bottomLeft: 0, bottomRight: 0 },
            borderSkipped: false,
            barThickness: 32,
            barPercentage: 0.6,
            categoryPercentage: 0.68,
            yAxisID: 'y',
          },
          {
            label: 'Volume (KG)',
            data: volumes,
            backgroundColor: solidBarGradient('chart-customer-segments', '#0B6640', '#15803D'),
            borderColor: '#084E31',
            borderWidth: 1.5,
            borderRadius: { topLeft: 8, topRight: 8, bottomLeft: 0, bottomRight: 0 },
            borderSkipped: false,
            barThickness: 32,
            barPercentage: 0.6,
            categoryPercentage: 0.68,
            yAxisID: 'y1',
          }
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        layout: {
          padding: { left: 4, right: 18, top: 4, bottom: 4 }
        },
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: {
            display: true,
            position: 'top',
            align: 'end',
            labels: {
              boxWidth: 12,
              boxHeight: 12,
              usePointStyle: true,
              pointStyle: 'rectRounded',
              font: { family: "'Inter', sans-serif", size: 11.5, weight: '700' },
              color: '#1F2937',
              padding: 14,
            }
          },
          tooltip: {
            ...TOOLTIP,
            callbacks: {
              title: (items) => `${items[0].label} Segment`,
              label: (ctx) => {
                if (ctx.datasetIndex === 0) {
                  return ` Realized Revenue: ${RT.fmt(ctx.parsed.y)}`;
                } else {
                  return ` Physical Volume: ${RT.fmtNum(ctx.parsed.y)} KG`;
                }
              },
              footer: (items) => {
                const key = ['Walk-in', 'Shopkeeper', 'Hotel'][items[0].dataIndex];
                const s = stats[key];
                const aov = s.count ? (s.revenue / s.count) : 0;
                return `Orders: ${s.count}  ·  Avg Checkout: ${RT.fmt(aov)}`;
              }
            },
          },
        },
        scales: {
          x: {
            grid: { display: false },
            border: { display: false },
            ticks: { ...TICK, font: { ...TICK.font, size: 11, weight: '700' }, color: '#1F2937', padding: 8 }
          },
          y: {
            type: 'linear',
            position: 'left',
            grid: GRID,
            border: { display: false },
            ticks: {
              ...TICK,
              font: { ...TICK.font, size: 10.5 },
              callback: (v) => '₹' + (v >= 1000 ? (v / 1000).toFixed(0) + 'K' : v),
              padding: 6,
            },
          },
          y1: {
            type: 'linear',
            position: 'right',
            grid: { display: false },
            border: { display: false },
            ticks: {
              ...TICK,
              font: { ...TICK.font, size: 10.5 },
              callback: (v) => `${RT.fmtNum(v)} KG`,
              padding: 10,
            },
          },
        },
      },
    });
  }

  function renderPaymentDonut(period, customFrom, customTo) {
    renderCustomerSegments(period, customFrom, customTo);
  }

  /* ══════════════════════════════════════════════
     REVENUE vs PURCHASES TREND (Reports)
     ══════════════════════════════════════════════ */
  function renderPurchaseSalesTrend() {
    const data    = RT.getDailyTrend('7d');
    const purData = RT.getDailyPurchaseTrend('7d');

    createChart('chart-purchase-sales-trend', {
      type: 'line',
      data: {
        labels: data.labels,
        datasets: [
          {
            label: 'Revenue',
            data: data.revenue,
            borderColor: COLORS.navy,
            backgroundColor: COLORS.navyA,
            borderWidth: 2,
            pointBackgroundColor: COLORS.navy,
            pointBorderColor: '#FFFFFF',
            pointBorderWidth: 2,
            pointRadius: 4,
            pointHoverRadius: 6,
            tension: 0.42,
            fill: true,
          },
          {
            label: 'Purchases',
            data: purData.values,
            borderColor: COLORS.amber,
            backgroundColor: COLORS.amberA,
            borderWidth: 2,
            borderDash: [5, 3],
            pointBackgroundColor: COLORS.amber,
            pointBorderColor: '#FFFFFF',
            pointBorderWidth: 2,
            pointRadius: 4,
            pointHoverRadius: 6,
            tension: 0.42,
            fill: true,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { display: false },
          tooltip: {
            ...TOOLTIP,
            callbacks: {
              label: (ctx) => ` ${ctx.dataset.label}: ${RT.fmt(ctx.parsed.y)}`,
            },
          },
        },
        scales: {
          x: { grid: { display: false }, border: { display: false }, ticks: TICK },
          y: {
            grid: GRID, border: { display: false },
            ticks: {
              ...TICK,
              callback: (v) => '₹' + (v >= 1000 ? (v / 1000).toFixed(0) + 'K' : v),
            },
          },
        },
      },
    });
  }

  /* ══════════════════════════════════════════════
     P&L WATERFALL BAR (Reports)
     ══════════════════════════════════════════════ */
  function renderPLChart(period) {
    const kpis = RT.computeKPIs(period);

    createChart('chart-pl', {
      type: 'bar',
      data: {
        labels: ['Revenue', 'Cost of Goods', 'Gross Profit', 'Expenses', 'Net Profit'],
        datasets: [{
          label: 'Amount',
          data: [kpis.revenue, kpis.cogs, kpis.grossProfit, kpis.totalExpenses, kpis.netProfit],
          backgroundColor: [
            COLORS.navy,
            COLORS.amber,
            COLORS.green,
            COLORS.crimson,
            kpis.netProfit >= 0 ? COLORS.green : COLORS.crimson,
          ],
          borderRadius: 5,
          borderSkipped: false,
          barPercentage: 0.58,
          categoryPercentage: 0.8,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            ...TOOLTIP,
            callbacks: {
              label: (ctx) => ` ${ctx.label}: ${RT.fmt(ctx.parsed.y)}`,
            },
          },
        },
        scales: {
          x: { grid: { display: false }, border: { display: false }, ticks: TICK },
          y: {
            grid: GRID, border: { display: false },
            ticks: {
              ...TICK,
              callback: (v) => '₹' + (v >= 1000 ? (v / 1000).toFixed(0) + 'K' : v),
            },
          },
        },
      },
    });
  }

  /* ══════════════════════════════════════════════
     EXPENSE BY CATEGORY (Expenses page)
     ══════════════════════════════════════════════ */
  function renderExpenseByCategory(period) {
    const expenses = RT.filterExpensesByPeriod(period);
    const byCategory = {};
    expenses.forEach(e => { byCategory[e.category] = (byCategory[e.category] || 0) + e.amount; });
    const sorted = Object.entries(byCategory).sort((a, b) => b[1] - a[1]);

    createChart('chart-expense-category', {
      type: 'bar',
      data: {
        labels: sorted.map(e => e[0]),
        datasets: [{
          label: 'Amount',
          data: sorted.map(e => e[1]),
          backgroundColor: PALETTE,
          borderRadius: 4,
          borderSkipped: false,
          barPercentage: 0.62,
          categoryPercentage: 0.8,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        indexAxis: 'y',
        plugins: {
          legend: { display: false },
          tooltip: {
            ...TOOLTIP,
            callbacks: {
              label: (ctx) => ` ${ctx.label}: ${RT.fmt(ctx.parsed.x)}`,
            },
          },
        },
        scales: {
          x: {
            grid: GRID, border: { display: false },
            ticks: {
              ...TICK,
              callback: (v) => '₹' + (v >= 1000 ? (v / 1000).toFixed(0) + 'K' : v),
            },
          },
          y: { grid: { display: false }, border: { display: false }, ticks: { ...TICK, padding: 8 } },
        },
      },
    });
  }

  /* ══════════════════════════════════════════════
     STOCK PAGE DONUT (separate canvas)
     ══════════════════════════════════════════════ */
  function renderStockPageDonut() {
    const items = RT.getStockItems()
      .slice().sort((a, b) => b.stockValue - a.stockValue).slice(0, 6);

    createChart('chart-stock-donut-page', {
      type: 'doughnut',
      data: {
        labels: items.map(i => i.name),
        datasets: [{
          data: items.map(i => Math.round(i.stockValue)),
          backgroundColor: PALETTE,
          borderWidth: 3,
          borderColor: '#FFFFFF',
          hoverOffset: 5,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '68%',
        plugins: {
          legend: {
            display: true,
            position: 'bottom',
            labels: {
              padding: 14,
              usePointStyle: true,
              pointStyle: 'circle',
              pointStyleWidth: 7,
              color: '#374151',
              font: { family: "'Inter', sans-serif", size: 10.5, weight: '500' },
            },
          },
          tooltip: {
            ...TOOLTIP,
            callbacks: {
              label: (ctx) => ` ${ctx.label}: ${RT.fmt(ctx.parsed)} value`,
            },
          },
        },
      },
    });
  }

  /* ══════════════════════════════════════════════
     SUPPLIER PROCUREMENT SOURCING INTELLIGENCE
     Timeline of money spent, quantity sourced & dates per individual seller
     ══════════════════════════════════════════════ */
  function renderSupplierHistory(supplierId) {
    const canvasId    = 'chart-supplier-history';
    const canvas      = document.getElementById(canvasId);
    const emptyEl     = document.getElementById('supplier-chart-empty');
    const lotsTbody   = document.getElementById('supplier-lots-tbody');
    const lotsCountEl = document.getElementById('supplier-lots-count');
    const metricsBar  = document.getElementById('supplier-metrics-bar');
    if (!canvas) return;

    // Resolve supplier — fall back to first active if nothing passed
    if (!supplierId) {
      const active = (RT.SUPPLIERS || []).filter(s => s.status === 'active');
      if (active.length === 0) return;
      supplierId = active[0].id;
      const sel = document.getElementById('supplier-analytics-select');
      if (sel && !sel.value) sel.value = supplierId;
    }

    const sup = RT.getSupplierById(supplierId);

    /* ── 3-TIER PURCHASE MATCHING ──────────────────────────────────────────
       Tier 1: Strict supplierId string match (preferred).
       Tier 2: supplierName + productName contains supplyCategory (prevents
               cross-contamination between two suppliers with the same name
               but different produce lines, e.g. Ramesh White Onion vs Red Onion).
       Tier 3: supplierName-only (last resort when category data unavailable).
       ─────────────────────────────────────────────────────────────────────── */
    const allPurchases = RT.PURCHASES || [];
    let rawPurchases = [];

    // Tier 1 — strict ID
    rawPurchases = allPurchases.filter(p =>
      supplierId && p.supplierId &&
      String(p.supplierId).trim() === String(supplierId).trim()
    );

    // Tier 2 — name + category
    if (rawPurchases.length === 0 && sup) {
      const sName = (sup.name || '').trim().toLowerCase();
      const sCat  = (sup.category || sup.supplyCategory || '').trim().toLowerCase();
      if (sName && sCat) {
        rawPurchases = allPurchases.filter(p =>
          (p.supplierName || '').trim().toLowerCase() === sName &&
          (p.productName  || '').trim().toLowerCase().includes(sCat)
        );
      }
    }

    // Tier 3 — name only
    if (rawPurchases.length === 0 && sup) {
      const sName = (sup.name || '').trim().toLowerCase();
      if (sName) {
        rawPurchases = allPurchases.filter(p =>
          (p.supplierName || '').trim().toLowerCase() === sName
        );
      }
    }

    // Sort oldest → newest for timeline
    rawPurchases = rawPurchases.slice().sort((a, b) =>
      (a.date || '').localeCompare(b.date || '')
    );

    // ── METRICS BAR ───────────────────────────────────────────────────────
    if (metricsBar) {
      const totalSpend  = rawPurchases.reduce((s, p) => s + (p.totalCost || 0), 0);
      const totalVolume = rawPurchases.reduce((s, p) => s + (p.quantity || 0), 0);
      const rates = rawPurchases.map(p => p.rate || (p.quantity > 0 ? p.totalCost / p.quantity : 0)).filter(r => r > 0);
      const minRate = rates.length ? Math.min(...rates) : 0;
      const maxRate = rates.length ? Math.max(...rates) : 0;
      const rateLabel = minRate === 0 ? '₹0.00' : (minRate === maxRate ? `${RT.fmt(minRate, 2)}` : `${RT.fmt(minRate, 2)} – ${RT.fmt(maxRate, 2)}`);
      const lastDate    = rawPurchases.length > 0 ? rawPurchases[rawPurchases.length - 1].date : null;
      const category    = sup ? (sup.category || sup.supplyCategory || 'Produce') : 'Produce';
      metricsBar.innerHTML = `
        <div style="padding:10px 14px;background:var(--surface-1);border-radius:var(--radius-sm);border:1px solid var(--border-light)">
          <div style="font-size:11px;font-weight:600;color:var(--text-3);text-transform:uppercase;letter-spacing:0.04em;">Total Sourced Spend</div>
          <div style="font-size:18px;font-weight:800;color:var(--primary);margin-top:2px;">${RT.fmt(totalSpend)}</div>
        </div>
        <div style="padding:10px 14px;background:var(--surface-1);border-radius:var(--radius-sm);border:1px solid var(--border-light)">
          <div style="font-size:11px;font-weight:600;color:var(--text-3);text-transform:uppercase;letter-spacing:0.04em;">Total Sourced Volume</div>
          <div style="font-size:18px;font-weight:800;color:var(--success);margin-top:2px;">${RT.fmtNum(totalVolume)} <span style="font-size:12px;font-weight:600;color:var(--text-3)">KG</span></div>
        </div>
        <div style="padding:10px 14px;background:var(--surface-1);border-radius:var(--radius-sm);border:1px solid var(--border-light)">
          <div style="font-size:11px;font-weight:600;color:var(--text-3);text-transform:uppercase;letter-spacing:0.04em;">Lot Rate Range</div>
          <div style="font-size:17px;font-weight:800;color:var(--text-1);margin-top:2px;">${rateLabel} <span style="font-size:11px;font-weight:600;color:var(--text-3)">/ KG</span></div>
        </div>
        <div style="padding:10px 14px;background:var(--surface-1);border-radius:var(--radius-sm);border:1px solid var(--border-light)">
          <div style="font-size:11px;font-weight:600;color:var(--text-3);text-transform:uppercase;letter-spacing:0.04em;">Produce Line</div>
          <div style="font-size:16px;font-weight:700;color:var(--text-1);margin-top:4px;"><span class="badge badge-neutral">${category}</span></div>
        </div>
        <div style="padding:10px 14px;background:var(--surface-1);border-radius:var(--radius-sm);border:1px solid var(--border-light)">
          <div style="font-size:11px;font-weight:600;color:var(--text-3);text-transform:uppercase;letter-spacing:0.04em;">Last Procurement</div>
          <div style="font-size:15px;font-weight:700;color:var(--text-2);margin-top:4px;">${lastDate ? RT.fmtDate(lastDate) : 'No transactions'}</div>
        </div>
      `;
    }

    // ── LOTS COUNT BADGE ──────────────────────────────────────────────────
    if (lotsCountEl) {
      lotsCountEl.textContent = `${rawPurchases.length} Lot${rawPurchases.length === 1 ? '' : 's'}`;
    }

    // ── LOTS TABLE ────────────────────────────────────────────────────────
    if (lotsTbody) {
      if (rawPurchases.length === 0) {
        lotsTbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:32px;color:var(--text-3);font-size:13px;">No procurement lots recorded yet for this supplier.</td></tr>`;
      } else {
        lotsTbody.innerHTML = rawPurchases.slice().reverse().map(p => {
          const prod     = RT.getProductById(p.productId);
          const prodName = p.productName || (prod ? prod.name : 'Produce');
          const unit     = (prod ? prod.unit : null) || 'KG';
          const rate     = p.rate || (p.quantity > 0 ? (p.totalCost / p.quantity) : 0);
          return `<tr>
            <td>${RT.fmtDate(p.date)}</td>
            <td class="col-mono" style="font-weight:700;color:var(--primary)">${p.id || p.lotId || '—'}</td>
            <td class="col-primary">${prodName}</td>
            <td class="num">${RT.fmtNum(p.quantity)} ${unit}</td>
            <td class="num">${RT.fmt(rate, 2)}</td>
            <td class="num col-amount" style="font-weight:700">${RT.fmt(p.totalCost)}</td>
            <td><span class="badge badge-neutral" style="font-size:10px;">${p.payment || p.paymentMode || 'Direct'}</span></td>
          </tr>`;
        }).join('');
      }
    }

    // ── CHART ─────────────────────────────────────────────────────────────
    if (rawPurchases.length === 0) {
      destroyChart(canvasId);
      if (emptyEl) emptyEl.style.display = 'flex';
      canvas.style.display = 'none';
      return;
    }

    if (emptyEl) emptyEl.style.display = 'none';
    canvas.style.display = 'block';

    // ── DISCRETE LOT BATCHES (NO SAME-DAY DATE COLLAPSE) ───────────────────
    const lotLabels = rawPurchases.map(p => {
      const lotNum = p.id || p.lotId || 'Lot';
      const dateText = p.date ? RT.fmtDate(p.date) : '';
      return [`Lot #${lotNum}`, dateText];
    });
    const costData = rawPurchases.map(p => Number(p.totalCost || 0));
    const qtyData  = rawPurchases.map(p => Number(p.quantity || 0));

    createChart(canvasId, {
      data: {
        labels: lotLabels,
        datasets: [
          {
            type: 'bar',
            label: 'Procurement Spend (\u20b9)',
            data: costData,
            backgroundColor: '#1A3262',
            hoverBackgroundColor: '#284B8C',
            borderRadius: { topLeft: 6, topRight: 6, bottomLeft: 0, bottomRight: 0 },
            borderSkipped: false,
            maxBarThickness: 52,
            categoryPercentage: 0.65,
            barPercentage: 0.85,
            yAxisID: 'yCost',
            order: 1,
          },
          {
            type: 'bar',
            label: 'Quantity Sourced (KG)',
            data: qtyData,
            backgroundColor: '#059669',
            hoverBackgroundColor: '#10B981',
            borderRadius: { topLeft: 6, topRight: 6, bottomLeft: 0, bottomRight: 0 },
            borderSkipped: false,
            maxBarThickness: 52,
            categoryPercentage: 0.65,
            barPercentage: 0.85,
            yAxisID: 'yQty',
            order: 2,
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        scales: {
          x: {
            grid: GRID,
            ticks: {
              ...TICK,
              font: { family: "'Inter', sans-serif", size: 11, weight: '600' }
            }
          },
          yCost: {
            type: 'linear',
            position: 'left',
            grid: GRID,
            ticks: { ...TICK, callback: v => RT.fmt(v) },
            title: { display: true, text: 'Spend (\u20b9)', color: '#1A3262', font: { family: "'Inter', sans-serif", size: 11, weight: '700' } }
          },
          yQty: {
            type: 'linear',
            position: 'right',
            grid: { drawOnChartArea: false },
            ticks: { ...TICK, callback: v => `${RT.fmtNum(v)} KG` },
            title: { display: true, text: 'Volume (KG)', color: '#059669', font: { family: "'Inter', sans-serif", size: 11, weight: '700' } }
          }
        },
        plugins: {
          legend: {
            display: true, position: 'top', align: 'end',
            labels: {
              boxWidth: 14,
              boxHeight: 10,
              borderRadius: 3,
              usePointStyle: false,
              font: { family: "'Inter', sans-serif", size: 11, weight: '600' },
              color: '#374151',
              padding: 16
            }
          },
          tooltip: {
            ...TOOLTIP,
            padding: 12,
            callbacks: {
              title: items => {
                const idx = items[0].dataIndex;
                const p = rawPurchases[idx];
                return p ? `Lot #${p.id || p.lotId} · ${RT.fmtDate(p.date)}` : items[0].label;
              },
              afterTitle: items => {
                const idx = items[0].dataIndex;
                const p = rawPurchases[idx];
                if (!p) return '';
                const rate = p.rate || (p.quantity > 0 ? (p.totalCost / p.quantity) : 0);
                return `Acquisition Rate: ${RT.fmt(rate, 2)} / KG`;
              },
              label: ctx => ctx.dataset.yAxisID === 'yCost'
                ? ` Sourced Spend: ${RT.fmt(ctx.parsed.y)}`
                : ` Physical Volume: ${RT.fmtNum(ctx.parsed.y)} KG`
            }
          }
        }
      }
    });
  }

  /* ══════════════════════════════════════════════
     INIT
     ══════════════════════════════════════════════ */
  function init() {
    if (window.Chart) applyDefaults();
    else {
      const check = setInterval(() => {
        if (window.Chart) { applyDefaults(); clearInterval(check); }
      }, 80);
    }
  }

  return {
    init,
    createChart,
    renderRevenueTrend,
    renderStockDonut,
    renderSalesByProduct,
    renderPaymentDonut,
    renderCustomerSegments,
    renderPurchaseSalesTrend,
    renderPLChart,
    renderExpenseByCategory,
    renderStockPageDonut,
    renderSupplierHistory,
  };

})();

window.Charts = Charts;
