import express, { Request, Response } from 'express';
import { sheetStore } from './sheetStore';
import { runBusinessLogicScenario } from './testScenario';

export const tradersRouter = express.Router();

tradersRouter.use(express.json());

// Helper to forward to Google Apps Script if APPS_SCRIPT_URL is configured
async function forwardToAppsScriptIfConfigured(action: string, payload?: any, method: 'GET' | 'POST' = 'GET') {
  const settings = sheetStore.getSettings();
  if (!settings.appsScriptUrl || settings.appsScriptUrl.trim() === '') {
    return null;
  }

  try {
    let url = settings.appsScriptUrl;
    let options: RequestInit = {};

    if (method === 'GET') {
      const u = new URL(url);
      u.searchParams.set('action', action);
      if (payload && typeof payload === 'object') {
        Object.keys(payload).forEach(k => u.searchParams.set(k, String(payload[k])));
      }
      url = u.toString();
      options = { method: 'GET' };
    } else {
      options = {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, payload })
      };
    }

    const res = await fetch(url, options);
    if (!res.ok) {
      throw new Error(`Apps Script responded with HTTP ${res.status}`);
    }
    const data = await res.json();
    return data;
  } catch (err: any) {
    console.warn(`Forwarding to Apps Script failed (${action}):`, err.message);
    // Fall back to server sheetStore
    return null;
  }
}

// 1. Dashboard
tradersRouter.get('/dashboard', async (req: Request, res: Response) => {
  try {
    const filter = (req.query.filter as string) || 'Today';
    const remote = await forwardToAppsScriptIfConfigured('getDashboardData', { filter }, 'GET');
    if (remote && remote.success && remote.data) {
      return res.json({ success: true, source: 'apps_script', data: remote.data });
    }

    const data = sheetStore.getDashboardData(filter, req.query.start as string, req.query.end as string);
    res.json({ success: true, source: 'sheet_store', data });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 2. Products
tradersRouter.get('/products', async (_req: Request, res: Response) => {
  try {
    const remote = await forwardToAppsScriptIfConfigured('getProducts', null, 'GET');
    if (remote && remote.success && remote.data) {
      return res.json({ success: true, source: 'apps_script', data: remote.data });
    }

    const data = sheetStore.getProducts();
    res.json({ success: true, source: 'sheet_store', data });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

tradersRouter.post('/products', async (req: Request, res: Response) => {
  try {
    const remote = await forwardToAppsScriptIfConfigured('createProduct', req.body, 'POST');
    if (remote && remote.success) {
      // Also update local copy
      try { sheetStore.createProduct(req.body); } catch (_) {}
      return res.json({ success: true, source: 'apps_script', data: remote.data });
    }

    const prod = sheetStore.createProduct(req.body);
    res.json({ success: true, source: 'sheet_store', data: prod });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// 3. Suppliers
tradersRouter.get('/suppliers', async (_req: Request, res: Response) => {
  try {
    const remote = await forwardToAppsScriptIfConfigured('getSuppliers', null, 'GET');
    if (remote && remote.success && remote.data) {
      return res.json({ success: true, source: 'apps_script', data: remote.data });
    }

    const data = sheetStore.getSuppliers();
    res.json({ success: true, source: 'sheet_store', data });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

tradersRouter.post('/suppliers', async (req: Request, res: Response) => {
  try {
    const remote = await forwardToAppsScriptIfConfigured('createSupplier', req.body, 'POST');
    if (remote && remote.success) {
      try { sheetStore.createSupplier(req.body); } catch (_) {}
      return res.json({ success: true, source: 'apps_script', data: remote.data });
    }

    const sup = sheetStore.createSupplier(req.body);
    res.json({ success: true, source: 'sheet_store', data: sup });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

tradersRouter.put('/suppliers/:id', async (req: Request, res: Response) => {
  try {
    const payload = { ...req.body, id: req.params.id };
    const remote = await forwardToAppsScriptIfConfigured('updateSupplier', payload, 'POST');
    if (remote && remote.success) {
      try { sheetStore.updateSupplier(payload); } catch (_) {}
      return res.json({ success: true, source: 'apps_script', data: remote.data });
    }

    const sup = sheetStore.updateSupplier(payload);
    res.json({ success: true, source: 'sheet_store', data: sup });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// 4. Stock
tradersRouter.get('/stock', async (_req: Request, res: Response) => {
  try {
    const remote = await forwardToAppsScriptIfConfigured('getStock', null, 'GET');
    if (remote && remote.success && remote.data) {
      return res.json({ success: true, source: 'apps_script', data: remote.data });
    }

    const data = sheetStore.getStock();
    res.json({ success: true, source: 'sheet_store', data });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 5. Sales
tradersRouter.get('/sales', async (_req: Request, res: Response) => {
  try {
    const remote = await forwardToAppsScriptIfConfigured('getSales', null, 'GET');
    if (remote && remote.success && remote.data) {
      return res.json({ success: true, source: 'apps_script', data: remote.data });
    }

    const data = sheetStore.getSales();
    res.json({ success: true, source: 'sheet_store', data });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

tradersRouter.post('/sales', async (req: Request, res: Response) => {
  try {
    // 1. Validate in sheetStore first for immediate business rule feedback
    const sale = sheetStore.createSale(req.body);

    // 2. If Apps Script is connected, asynchronously or synchronously sync to sheet
    forwardToAppsScriptIfConfigured('createSale', req.body, 'POST').catch(err => {
      console.error('Remote sheet sync error on sale:', err);
    });

    res.json({ success: true, source: 'sheet_store', data: sale });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// 6. Purchases
tradersRouter.get('/purchases', async (_req: Request, res: Response) => {
  try {
    const remote = await forwardToAppsScriptIfConfigured('getPurchases', null, 'GET');
    if (remote && remote.success && remote.data) {
      return res.json({ success: true, source: 'apps_script', data: remote.data });
    }

    const data = sheetStore.getPurchases();
    res.json({ success: true, source: 'sheet_store', data });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

tradersRouter.post('/purchases', async (req: Request, res: Response) => {
  try {
    const purchase = sheetStore.createPurchase(req.body);

    forwardToAppsScriptIfConfigured('createPurchase', req.body, 'POST').catch(err => {
      console.error('Remote sheet sync error on purchase:', err);
    });

    res.json({ success: true, source: 'sheet_store', data: purchase });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// 7. Expenses
tradersRouter.get('/expenses', async (_req: Request, res: Response) => {
  try {
    const remote = await forwardToAppsScriptIfConfigured('getExpenses', null, 'GET');
    if (remote && remote.success && remote.data) {
      return res.json({ success: true, source: 'apps_script', data: remote.data });
    }

    const data = sheetStore.getExpenses();
    res.json({ success: true, source: 'sheet_store', data });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

tradersRouter.post('/expenses', async (req: Request, res: Response) => {
  try {
    const exp = sheetStore.createExpense(req.body);

    forwardToAppsScriptIfConfigured('createExpense', req.body, 'POST').catch(err => {
      console.error('Remote sheet sync error on expense:', err);
    });

    res.json({ success: true, source: 'sheet_store', data: exp });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// 8. Stock Adjustments
tradersRouter.get('/adjustments', async (_req: Request, res: Response) => {
  try {
    const data = sheetStore.getAdjustments();
    res.json({ success: true, source: 'sheet_store', data });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

tradersRouter.post('/adjustments', async (req: Request, res: Response) => {
  try {
    const adj = sheetStore.createStockAdjustment(req.body);

    forwardToAppsScriptIfConfigured('createStockAdjustment', req.body, 'POST').catch(err => {
      console.error('Remote sheet sync error on adjustment:', err);
    });

    res.json({ success: true, source: 'sheet_store', data: adj });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// 9. Settings
tradersRouter.get('/settings', (_req: Request, res: Response) => {
  res.json({ success: true, data: sheetStore.getSettings() });
});

tradersRouter.post('/settings', (req: Request, res: Response) => {
  const updated = sheetStore.updateSettings(req.body);
  res.json({ success: true, data: updated });
});

// 10. Ping Apps Script Endpoint
tradersRouter.post('/ping-apps-script', async (req: Request, res: Response) => {
  const { url } = req.body;
  if (!url) {
    return res.status(400).json({ success: false, error: 'Apps Script URL is required' });
  }
  try {
    const pingUrl = new URL(url);
    pingUrl.searchParams.set('action', 'ping');
    const response = await fetch(pingUrl.toString());
    const data = await response.json();
    if (data && data.success) {
      sheetStore.updateSettings({ appsScriptUrl: url, syncStatus: 'connected', lastSyncTime: new Date().toISOString() });
      return res.json({ success: true, data });
    }
    res.status(400).json({ success: false, error: data.error || 'Invalid response from Apps Script' });
  } catch (err: any) {
    res.status(400).json({ success: false, error: 'Could not connect to Apps Script: ' + err.message });
  }
});

// 11. Run 21-Step Automated Verification Scenario
tradersRouter.post('/test-scenario', (_req: Request, res: Response) => {
  try {
    const report = runBusinessLogicScenario();
    res.json({ success: true, data: report });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 12. Reset to clean state (clears any temporary test data, preserving initial 5 products)
tradersRouter.post('/reset', (_req: Request, res: Response) => {
  try {
    sheetStore.resetToCleanState();
    res.json({ success: true, message: 'Workbook store reset to clean production baseline' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 13. Export Data
tradersRouter.get('/export', (_req: Request, res: Response) => {
  res.json({ success: true, data: sheetStore.exportData() });
});
