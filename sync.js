/**
 * sync.js — طيب الحي | قاعدة البيانات المركزية v2
 */
const DB = {
  KEYS: {
    products:  'tayyib_products',
    invoices:  'tayyib_invoices',
    expenses:  'tayyib_expenses',
    settings:  'tayyib_settings',
    stock_log: 'tayyib_stock_log',
    accounts:  'tayyib_accounts',
    customers: 'tayyib_customers',
    user:      'oud_user',
  },

  get(key)      { try { return JSON.parse(localStorage.getItem(key)) ?? null; } catch { return null; } },
  set(key, val) { localStorage.setItem(key, JSON.stringify(val)); },

  // ── Products ─────────────────────────────
  getProducts()  { return this.get(this.KEYS.products) || []; },
  saveProducts(arr) { this.set(this.KEYS.products, arr); },
  getProduct(barcode) { return this.getProducts().find(p => p.barcode === barcode) || null; },
  upsertProduct(product) {
    const list = this.getProducts();
    const idx  = list.findIndex(p => p.barcode === product.barcode);
    const now  = Date.now();
    if (idx >= 0) list[idx] = { ...list[idx], ...product, updated_at: now };
    else          list.push({ ...product, id: now, created_at: now, updated_at: now });
    this.saveProducts(list);
    return product;
  },
  deleteProduct(barcode) { this.saveProducts(this.getProducts().filter(p => p.barcode !== barcode)); },

  // ── Invoices ─────────────────────────────
  getInvoices() { return this.get(this.KEYS.invoices) || []; },
  addInvoice(inv) {
    const list = this.getInvoices();
    const full = { ...inv, id: 'INV-' + Date.now(), created_at: Date.now() };
    list.unshift(full);
    this.set(this.KEYS.invoices, list);
    return full;
  },

  // ── Stock Log ────────────────────────────
  getStockLog() { return this.get(this.KEYS.stock_log) || []; },
  addStockEntry(entry) {
    const log = this.getStockLog();
    log.unshift({ ...entry, id: Date.now(), created_at: Date.now() });
    this.set(this.KEYS.stock_log, log);
  },

  // ── Accounts (Users/Employees) ───────────
  getAccounts() { return this.get(this.KEYS.accounts) || []; },
  saveAccounts(arr) { this.set(this.KEYS.accounts, arr); },
  getAccount(username) { return this.getAccounts().find(a => a.username === username) || null; },

  // ── Customers ────────────────────────────
  getCustomers() { return this.get(this.KEYS.customers) || []; },
  saveCustomers(arr) { this.set(this.KEYS.customers, arr); },
  getCustomer(id) { return this.getCustomers().find(c => c.id === id) || null; },
  upsertCustomer(c) {
    const list = this.getCustomers();
    const idx  = list.findIndex(x => x.id === c.id);
    const now  = Date.now();
    if (idx >= 0) list[idx] = { ...list[idx], ...c, updated_at: now };
    else          list.push({ ...c, id: c.id || 'CUS-' + now, created_at: now, updated_at: now });
    this.saveCustomers(list);
    return c;
  },
  deleteCustomer(id) { this.saveCustomers(this.getCustomers().filter(c => c.id !== id)); },

  // ── Settings ─────────────────────────────
  getSettings() {
    const saved = this.get(this.KEYS.settings);
    const defaults = {
      store_name: 'طيب الحي للعود والأدهان',
      currency: 'د.إ', tax_rate: 5, low_stock_qty: 5,
      logo: null, address: '', phone: '', _initialized: false,
    };
    if (!saved) return defaults;
    if (!saved.currency) saved.currency = 'د.إ';
    return { ...defaults, ...saved };
  },
  saveSettings(s) { this.set(this.KEYS.settings, s); },

  // ── Auth ─────────────────────────────────
  getUser() { return this.get(this.KEYS.user); },
  requireAuth() {
    if (!this.getUser()) { location.href = 'index.html'; return false; }
    return true;
  },
  // Check permission — pass permission key, returns bool
  can(perm) {
    const u = this.getUser();
    if (!u) return false;
    if (u.role === 'admin') return true;
    const perms = u.permissions || {};
    return !!perms[perm];
  },
  // Require specific permission or redirect
  requirePerm(perm) {
    if (!this.requireAuth()) return false;
    if (!this.can(perm)) {
      document.body.innerHTML = `<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;font-family:'Tajawal',sans-serif;background:#F8F3EA;color:#2a1e0e;gap:12px">
        <div style="font-size:2.5rem">🔒</div>
        <div style="font-size:1.1rem;font-weight:700">ليس لديك صلاحية لهذه الصفحة</div>
        <div style="font-size:.85rem;color:#a0896a">تواصل مع مدير النظام</div>
        <a href="dashboard.html" style="margin-top:8px;padding:9px 22px;background:#C9A84C;color:#1C1208;border-radius:8px;font-weight:700;text-decoration:none;font-size:.88rem">العودة للرئيسية</a>
      </div>`;
      return false;
    }
    return true;
  },

  // ── Helpers ──────────────────────────────
  fmt(n) { return Number(n||0).toLocaleString('ar-SA',{minimumFractionDigits:2,maximumFractionDigits:2}); },
  today() { return new Date().toLocaleDateString('ar-SA-u-nu-latn',{weekday:'long',year:'numeric',month:'long',day:'numeric'}); },
  isToday(ts) { const d=new Date(ts),n=new Date(); return d.getFullYear()===n.getFullYear()&&d.getMonth()===n.getMonth()&&d.getDate()===n.getDate(); },
  isThisMonth(ts) { const d=new Date(ts),n=new Date(); return d.getFullYear()===n.getFullYear()&&d.getMonth()===n.getMonth(); },
  shortDate(ts) { return new Date(ts).toLocaleDateString('ar-SA-u-nu-latn',{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'}); },
  fullDate(ts) { return new Date(ts).toLocaleDateString('ar-SA-u-nu-latn',{year:'numeric',month:'long',day:'numeric'}); },
};

// ── All permissions definition ────────────
const PERMISSIONS = [
  { key:'view_dashboard',   label:'عرض لوحة التحكم',       group:'عام' },
  { key:'view_reports',     label:'عرض التقارير',           group:'عام' },
  { key:'view_cost_price',  label:'رؤية سعر الشراء',        group:'عام' },
  { key:'cashier_sale',     label:'إجراء مبيعات (كاشير)',   group:'الكاشير' },
  { key:'cashier_buy',      label:'استلام بضاعة',           group:'الكاشير' },
  { key:'cashier_discount', label:'منح خصومات',             group:'الكاشير' },
  { key:'inventory_view',   label:'عرض المخزون',            group:'المخزون' },
  { key:'inventory_edit',   label:'تعديل المخزون',          group:'المخزون' },
  { key:'customers_view',   label:'عرض العملاء',            group:'العملاء' },
  { key:'customers_edit',   label:'تعديل العملاء',          group:'العملاء' },
  { key:'manage_users',     label:'إدارة الموظفين',         group:'الإدارة' },
  { key:'settings_edit',    label:'تعديل الإعدادات',        group:'الإدارة' },
];

// ── Toast ─────────────────────────────────
function toast(msg, type = 'success') {
  const el = document.createElement('div');
  el.className = 'toast toast-' + type;
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => el.classList.add('show'), 10);
  setTimeout(() => { el.classList.remove('show'); setTimeout(() => el.remove(), 300); }, 3000);
}

(function injectCSS() {
  if (document.getElementById('tayyib-css')) return;
  const s = document.createElement('style');
  s.id = 'tayyib-css';
  s.textContent = `
    .toast{position:fixed;bottom:28px;left:50%;transform:translateX(-50%) translateY(16px);
    background:#1C1208;color:#F8F3EA;padding:10px 22px;border-radius:9px;
    font-size:.88rem;font-family:'Tajawal',sans-serif;z-index:9999;
    opacity:0;transition:opacity .25s,transform .25s;pointer-events:none;
    border-right:3px solid #C9A84C;box-shadow:0 4px 20px rgba(0,0,0,.25)}
    .toast.show{opacity:1;transform:translateX(-50%) translateY(0)}
    .toast.toast-error{border-right-color:#c0392b}
    .toast.toast-warning{border-right-color:#e67e22}
  `;
  document.head.appendChild(s);
})();
