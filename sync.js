/**
 * TAYYIB AL-HAI — Core Database & Utilities v3
 * Single source of truth for all pages
 */

// ─────────────────────────────────────────────────────────────
// STORAGE
// ─────────────────────────────────────────────────────────────
const DB = {
  K: {
    products : 'th_products',
    invoices : 'th_invoices',
    stock_log: 'th_stock_log',
    accounts : 'th_accounts',
    customers: 'th_customers',
    settings : 'th_settings',
    session  : 'th_session',
  },

  _get(k)    { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } },
  _set(k, v) { localStorage.setItem(k, JSON.stringify(v)); },

  /* ── settings ── */
  settings() {
    return Object.assign({
      store_name : 'طيب الحي للعود والأدهان',
      currency   : 'د.إ',
      vat        : 5,
      low_alert  : 5,
      logo       : null,
      address    : '',
      phone      : '',
      receipt_note: 'شكراً لتعاملكم معنا',
    }, this._get(this.K.settings) || {});
  },
  saveSettings(s) { this._set(this.K.settings, s); },

  /* ── products ── */
  products()  { return this._get(this.K.products) || []; },
  product(bc) { return this.products().find(p => p.barcode === String(bc)) || null; },
  saveProduct(p) {
    const list = this.products();
    const i    = list.findIndex(x => x.barcode === p.barcode);
    const now  = Date.now();
    if (i >= 0) list[i] = { ...list[i], ...p, updated_at: now };
    else        list.push({ ...p, created_at: now, updated_at: now });
    this._set(this.K.products, list);
  },
  deleteProduct(bc) {
    this._set(this.K.products, this.products().filter(p => p.barcode !== bc));
  },
  adjustStock(bc, delta, reason, user) {
    const p = this.product(bc);
    if (!p) return;
    const before = Number(p.qty) || 0;
    const after  = Math.max(0, before + delta);
    this.saveProduct({ ...p, qty: after });
    this._set(this.K.stock_log, [
      { id: Date.now(), barcode: bc, name: p.name, before, delta, after, reason, user, at: Date.now() },
      ...(this._get(this.K.stock_log) || [])
    ].slice(0, 2000));
  },

  /* ── invoices ── */
  invoices() { return this._get(this.K.invoices) || []; },
  invoice(id) { return this.invoices().find(x => x.id === id) || null; },
  addInvoice(inv) {
    const full = { ...inv, id: 'INV' + Date.now(), at: Date.now() };
    this._set(this.K.invoices, [full, ...this.invoices()].slice(0, 5000));
    return full;
  },

  /* ── stock log ── */
  stockLog() { return this._get(this.K.stock_log) || []; },

  /* ── customers ── */
  customers()  { return this._get(this.K.customers) || []; },
  customer(id) { return this.customers().find(c => c.id === id) || null; },
  saveCustomer(c) {
    const list = this.customers();
    const i    = list.findIndex(x => x.id === c.id);
    const now  = Date.now();
    if (i >= 0) list[i] = { ...list[i], ...c, updated_at: now };
    else        list.push({ ...c, id: c.id || ('CUS' + now), created_at: now, updated_at: now });
    this._set(this.K.customers, list);
  },
  deleteCustomer(id) {
    this._set(this.K.customers, this.customers().filter(c => c.id !== id));
  },

  /* ── accounts ── */
  accounts()      { return this._get(this.K.accounts) || []; },
  account(uname)  { return this.accounts().find(a => a.username === uname) || null; },
  saveAccounts(list) { this._set(this.K.accounts, list); },

  /* ── session ── */
  session()  { return this._get(this.K.session); },
  can(perm)  {
    const s = this.session();
    if (!s) return false;
    if (s.role === 'admin') return true;
    return !!(s.permissions || {})[perm];
  },
  requireAuth() {
    if (!this.session()) { location.href = 'index.html'; return false; }
    return true;
  },
  requirePerm(perm) {
    if (!this.requireAuth()) return false;
    if (!this.can(perm)) {
      document.body.innerHTML = `
        <div style="min-height:100vh;display:flex;flex-direction:column;align-items:center;
          justify-content:center;gap:14px;font-family:'Tajawal',sans-serif;background:#0f0d0a;color:#c8b89a">
          <span style="font-size:3rem">🔒</span>
          <span style="font-size:1.1rem;font-weight:700">ليس لديك صلاحية لهذه الصفحة</span>
          <a href="dashboard.html" style="padding:9px 24px;background:#C9A84C;color:#1C1208;
            border-radius:8px;font-weight:700;text-decoration:none;font-size:.9rem">العودة للرئيسية</a>
        </div>`;
      return false;
    }
    return true;
  },

  /* ── helpers ── */
  fmt(n) { return Number(n||0).toLocaleString('ar-SA',{minimumFractionDigits:2,maximumFractionDigits:2}); },
  fmtDate(ts, opts) {
    return new Date(ts).toLocaleDateString('ar-SA-u-nu-latn',
      opts || { year:'numeric', month:'short', day:'numeric', hour:'2-digit', minute:'2-digit' });
  },
  today() {
    return new Date().toLocaleDateString('ar-SA-u-nu-latn',
      { weekday:'long', year:'numeric', month:'long', day:'numeric' });
  },
  isToday(ts)     { const d=new Date(ts),n=new Date(); return d.toDateString()===n.toDateString(); },
  isThisMonth(ts) { const d=new Date(ts),n=new Date(); return d.getFullYear()===n.getFullYear()&&d.getMonth()===n.getMonth(); },
  uid()           { return Math.random().toString(36).slice(2,9); },
};

// ─────────────────────────────────────────────────────────────
// PERMISSIONS MAP
// ─────────────────────────────────────────────────────────────
const PERMS = [
  { key:'view_dashboard',  label:'عرض لوحة التحكم',     group:'عام' },
  { key:'view_reports',    label:'عرض التقارير',         group:'عام' },
  { key:'view_cost',       label:'رؤية سعر الشراء',      group:'عام' },
  { key:'sale',            label:'تنفيذ مبيعات',         group:'الكاشير' },
  { key:'receive',         label:'استلام بضاعة',         group:'الكاشير' },
  { key:'discount',        label:'منح خصومات',           group:'الكاشير' },
  { key:'inventory_view',  label:'عرض المخزون',          group:'المخزون' },
  { key:'inventory_edit',  label:'تعديل المخزون',        group:'المخزون' },
  { key:'customers',       label:'إدارة العملاء',        group:'العملاء' },
  { key:'manage_users',    label:'إدارة الموظفين',       group:'الإدارة' },
  { key:'settings',        label:'تعديل الإعدادات',      group:'الإدارة' },
];

// ─────────────────────────────────────────────────────────────
// SEED DEFAULT ADMIN
// ─────────────────────────────────────────────────────────────
(function seedAdmin() {
  const list = DB.accounts();
  const adminIdx = list.findIndex(a => a.username === 'admin');
  if (adminIdx < 0) {
    // Create fresh admin
    DB.saveAccounts([...list, {
      id: 'admin', username: 'admin', password: 'admin123',
      name: 'مدير النظام', role: 'admin', permissions: {}, active: true,
      created_at: Date.now(),
    }]);
  } else {
    // Ensure existing admin is always active and has admin role
    list[adminIdx].active = true;
    list[adminIdx].role   = 'admin';
    DB.saveAccounts(list);
  }
  // Default settings currency
  const s = DB.settings();
  if (!s._seeded) { s._seeded = true; s.currency = 'د.إ'; DB.saveSettings(s); }
})();

// ─────────────────────────────────────────────────────────────
// UI HELPERS
// ─────────────────────────────────────────────────────────────
function toast(msg, type = 'ok') {
  document.querySelectorAll('.th-toast').forEach(e => e.remove());
  const t = document.createElement('div');
  t.className = 'th-toast';
  t.setAttribute('data-type', type);
  t.textContent = msg;
  document.body.appendChild(t);
  requestAnimationFrame(() => t.classList.add('in'));
  clearTimeout(window._toastTimer);
  window._toastTimer = setTimeout(() => { t.classList.remove('in'); setTimeout(() => t.remove(), 300); }, 2800);
}

// Inject shared CSS once
(function() {
  if (document.getElementById('th-shared')) return;
  const s = document.createElement('style');
  s.id = 'th-shared';
  s.textContent = `
    .th-toast{position:fixed;bottom:32px;left:50%;transform:translateX(-50%) translateY(12px);
      padding:11px 24px;border-radius:10px;font-family:'Tajawal',sans-serif;font-size:.9rem;
      font-weight:600;z-index:9999;opacity:0;transition:.25s;pointer-events:none;
      background:#1a1208;color:#f0e8d8;border:1px solid #3a2a14;
      box-shadow:0 8px 32px rgba(0,0,0,.4)}
    .th-toast.in{opacity:1;transform:translateX(-50%) translateY(0)}
    .th-toast[data-type=ok]{border-color:#C9A84C}
    .th-toast[data-type=err]{border-color:#c0392b;color:#f5a5a0}
    .th-toast[data-type=warn]{border-color:#e67e22;color:#ffd49a}
  `;
  document.head.appendChild(s);
})();
