/**
 * Application Configuration
 * 
 * The Google Apps Script Web App URL is the ONLY backend.
 * No Express server, no Firebase, no Supabase.
 * The browser talks directly to Google Apps Script over HTTPS.
 */

export const API_BASE_URL = 'https://script.google.com/macros/s/AKfycbwJKmimHTYqlmP30DLPWnU0plBSDd45suEu5NGZ3yvn32bSdZzLbh7vVG8dOaiBT-6e/exec';

export const APP_CONFIG = {
  businessName: 'RajaRajeshwari Traders',
  shortName: 'RRT',
  currency: '₹',
  unit: 'KG',
  location: 'Huzurabad, Telangana',
  owner: 'Budime Aravind',
} as const;

export const CUSTOMER_TYPES = ['Walk-in', 'Shopkeeper', 'Hotel'] as const;
export const PAYMENT_MODES = ['Cash', 'UPI', 'Bank'] as const;
export const WASTAGE_REASONS = ['Rot / Spoilage', 'Transit Damage', 'Moisture Weight Loss', 'Grade Rejection', 'Other'] as const;
export const EXPENSE_CATEGORIES = ['Labour', 'Transport', 'Electricity', 'Rent', 'Cold Storage', 'Packing Material', 'Equipment Maintenance', 'Miscellaneous'] as const;
export const STOCK_STATUSES = ['HEALTHY', 'LOW STOCK', 'OUT OF STOCK'] as const;
