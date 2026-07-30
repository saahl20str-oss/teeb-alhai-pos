// ═══════════════════════════════════════════════════════════
// طيب الحي POS — sync.js
// بنية هجينة: localStorage (فوري) + Supabase (خلفية)
// كل الصفحات تعمل بدون أي تعديل
// ═══════════════════════════════════════════════════════════

const _SB_URL = 'https://xwjhewvjlmnnuqiylxht.supabase.co';
const _SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh3amhld3ZqbG1ubnVxaXlseGh0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUyMzU1NDgsImV4cCI6MjEwMDgxMTU0OH0.7sJGJESM-c6AKNKwscUO-onvSX3Zzco5baWlSEUvHFU';

// ─── Supabase: fire & forget (لا ينتظر — لا يعطل الصفحة) ──
function _sbPush(path, method, body) {
  fetch(_SB_URL + '/rest/v1/' + path, {
    method, body: body ? JSON.stringify(body) : undefined,
    headers: {
      'apikey': _SB_KEY,
      'Authorization': 'Bearer ' + _SB_KEY,
      'Content-Type': 'application/json',
      'Prefer': 'resolution=merge-duplicates,return=minimal',
    },
  }).catch(e => console.warn('[SB push failed]', e.message));
}

// ─── Supabase: قراءة مع انتظار ──────────────────────────
async function _sbGet(path) {
  try {
    const r = await fetch(_SB_URL + '/rest/v1/' + path, {
      headers: {
        'apikey': _SB_KEY,
        'Authorization': 'Bearer ' + _SB_KEY,
      },
    });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return await r.json();
  } catch (e) {
    console.warn('[SB get failed]', e.message);
    return null;
  }
}

// ─── localStorage helper ─────────────────────────────────
const _K = {
  settings:  'th_settings',
  products:  'th_products',
  invoices:  'th_invoices',
  stockLog:  'th_stock_log',
  customers: 'th_customers',
  accounts:  'th_accounts',
  session:   'th_session',
  suppliers: 'th_suppliers',
};
function _get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } }
function _set(k, v) { localStorage.setItem(k, JSON.stringify(v)); }
function _del(k) { localStorage.removeItem(k); }

// ─── PERMISSIONS ─────────────────────────────────────────
const PERMS = [
  { key: 'view_dashboard',  label: 'عرض لوحة التحكم',    group: 'عام' },
  { key: 'view_reports',    label: 'عرض التقارير',        group: 'عام' },
  { key: 'view_cost',       label: 'رؤية سعر الشراء',     group: 'عام' },
  { key: 'sale',            label: 'تنفيذ مبيعات',        group: 'الكاشير' },
  { key: 'receive',         label: 'استلام بضاعة',        group: 'الكاشير' },
  { key: 'discount',        label: 'منح خصومات',          group: 'الكاشير' },
  { key: 'returns',         label: 'تنفيذ المرتجعات',     group: 'الكاشير' },
  { key: 'inventory_view',  label: 'عرض المخزون',         group: 'المخزون' },
  { key: 'inventory_edit',  label: 'تعديل المخزون',       group: 'المخزون' },
  { key: 'customers',       label: 'إدارة العملاء',       group: 'العملاء' },
  { key: 'manage_users',    label: 'إدارة الموظفين',      group: 'الإدارة' },
  { key: 'settings',        label: 'تعديل الإعدادات',     group: 'الإدارة' },
];

// ═══════════════════════════════════════════════════════════
const DB = {

  // ── مفاتيح localStorage (للتوافق مع الكود القديم) ──────
  K: _K,
  _get, _set,

  // ── SESSION ──────────────────────────────────────────────
  session() {
    const s = _get(_K.session);
    if (!s) return null;
    if ((Date.now() - s.loginAt) > 8 * 60 * 60 * 1000) {
      _del(_K.session); return null;
    }
    return s;
  },
  setSession(s) { _set(_K.session, s); },
  clearSession() { _del(_K.session); },

  can(perm) {
    const s = this.session(); if (!s) return false;
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
      document.body.innerHTML = `<div style="min-height:100vh;display:flex;flex-direction:column;
        align-items:center;justify-content:center;gap:14px;font-family:'Tajawal',sans-serif;
        background:#fff"><span style="font-size:3rem">🔒</span>
        <span style="font-size:1.1rem;font-weight:700">ليس لديك صلاحية لهذه الصفحة</span>
        <a href="${this.firstAccessiblePage()}" style="padding:9px 24px;background:#C9A84C;
        color:#1C1208;border-radius:8px;font-weight:700;text-decoration:none">العودة</a></div>`;
      return false;
    }
    return true;
  },

  PAGE_PERMS: {
    'dashboard.html': 'view_dashboard',
    'cashier.html':   ['sale', 'receive'],
    'inventory.html': 'inventory_view',
    'suppliers.html': 'inventory_view',
    'reports.html':   'view_reports',
    'customers.html': 'customers',
    'users.html':     'manage_users',
  },

  firstAccessiblePage() {
    const order = ['dashboard.html','cashier.html','inventory.html',
                   'reports.html','customers.html','suppliers.html','users.html'];
    for (const p of order) {
      const perm = this.PAGE_PERMS[p];
      if (Array.isArray(perm) ? perm.some(x => this.can(x)) : this.can(perm)) return p;
    }
    return 'index.html';
  },

  applyNavPermissions() {
    document.querySelectorAll('.tb-nav a[href]').forEach(a => {
      const perm = this.PAGE_PERMS[a.getAttribute('href')];
      if (!perm) return;
      if (!(Array.isArray(perm) ? perm.some(x => this.can(x)) : this.can(perm)))
        a.style.display = 'none';
    });
  },

  enforcePageAccess() {
    if (!this.requireAuth()) return false;
    const file = location.pathname.split('/').pop() || 'dashboard.html';
    const perm = this.PAGE_PERMS[file];
    if (!perm) return true;
    const ok = Array.isArray(perm) ? perm.some(x => this.can(x)) : this.can(perm);
    if (!ok) { location.href = this.firstAccessiblePage(); return false; }
    return true;
  },

  // ── ACCOUNTS (localStorage فقط — أمان) ──────────────────
  accounts() { return _get(_K.accounts) || []; },
  account(u) { return this.accounts().find(a => a.username === u) || null; },
  saveAccounts(list) { _set(_K.accounts, list); },
  saveAccount(acc) {
    const list = this.accounts();
    const i = list.findIndex(a => a.id === acc.id);
    if (i >= 0) list[i] = { ...list[i], ...acc }; else list.push(acc);
    this.saveAccounts(list);
  },
  deleteAccount(id) { this.saveAccounts(this.accounts().filter(a => a.id !== id)); },

  seedAdmin() {
    if (!this.account('admin')) {
      this.saveAccount({
        id: 'admin', username: 'admin', password: 'admin123',
        name: 'مدير النظام', role: 'admin', permissions: {},
        active: true, created_at: Date.now(),
      });
    }
  },

  recordPasswordChange(username) {
    const list = this.accounts();
    const i = list.findIndex(a => a.username === username);
    if (i >= 0) {
      list[i].password_changed_at = Date.now();
      list[i].password_warning_dismissed = false;
      this.saveAccounts(list);
    }
  },
  daysSincePasswordChange(username) {
    const acc = this.account(username);
    if (!acc?.password_changed_at) return null;
    return Math.floor((Date.now() - acc.password_changed_at) / 86400000);
  },
  shouldWarnPassword() {
    const s = this.settings();
    const days = Number(s.pw_reminder_days || 90); if (!days) return false;
    const me = this.session(); if (!me) return false;
    const acc = this.account(me.username);
    if (!acc || acc.password_warning_dismissed) return false;
    const since = this.daysSincePasswordChange(me.username);
    return since === null || since >= days;
  },

  // ── SETTINGS ─────────────────────────────────────────────
  // متزامن (من localStorage) — يزامن مع Supabase في الخلفية
  settings() {
    const s = _get(_K.settings);
    return Object.assign({
      store_name: 'طيب الحي للعود والأدهان', currency: 'د.إ',
      vat: 5, vat_enabled: true, low_alert: 5, return_days: 7,
      pw_reminder_days: 90, receipt_note: 'شكراً لتعاملكم معنا',
      address: '', phone: '',
    }, s || {});
  },
  // alias للتوافق مع dashboard الجديد
  async getSettings() { return this.settings(); },

  saveSettings(data) {
    _set(_K.settings, data);
    // Logo stored separately (too large)
    const { logo, ...dbData } = data;
    if (logo) _set('th_logo', logo);
    // Push to Supabase in background
    _sbPush('th_settings?id=eq.main', 'PATCH', { data: dbData });
  },

  // ── PRODUCTS ─────────────────────────────────────────────
  products() {
    return (_get(_K.products) || []).map(p => ({
      ...p, img: _get('th_img_' + p.barcode) || p.img || null,
    }));
  },
  // aliases للتوافق
  async getProducts() { return this.products(); },
  product(bc) { return this.products().find(p => p.barcode === bc) || null; },
  async getProduct(bc) { return this.product(bc); },

  saveProduct(p) {
    // Save image locally
    if (p.img && p.img.startsWith('data:')) {
      _set('th_img_' + p.barcode, p.img);
    }
    const list = _get(_K.products) || [];
    const i = list.findIndex(x => x.barcode === p.barcode);
    const saved = { ...p, img: null, updated_at: Date.now(), created_at: p.created_at || Date.now() };
    if (i >= 0) list[i] = saved; else list.push(saved);
    _set(_K.products, list);
    // Push to Supabase
    _sbPush('th_products', 'POST', saved);
  },

  deleteProduct(bc) {
    _del('th_img_' + bc);
    _set(_K.products, (_get(_K.products) || []).filter(p => p.barcode !== bc));
    _sbPush('th_products?barcode=eq.' + encodeURIComponent(bc), 'DELETE');
  },

  adjustStock(bc, delta, reason, user) {
    const p = this.product(bc); if (!p) return;
    const before = Number(p.qty) || 0;
    const after = Math.max(0, before + delta);
    this.saveProduct({ ...p, qty: after });
    const log = { id: Date.now(), barcode: bc, name: p.name, before, delta, after, reason, user: user || '—', at: Date.now() };
    const logs = _get(_K.stockLog) || [];
    logs.unshift(log);
    _set(_K.stockLog, logs.slice(0, 500));
    _sbPush('th_stock_log', 'POST', log);
  },

  // ── INVOICES ─────────────────────────────────────────────
  invoices() { return _get(_K.invoices) || []; },
  async getInvoices() { return this.invoices(); },
  invoice(id) { return this.invoices().find(i => i.id === id) || null; },
  async getInvoice(id) { return this.invoice(id); },

  addInvoice(inv) {
    const full = { ...inv, id: 'INV' + Date.now(), at: inv.at || Date.now() };
    const list = _get(_K.invoices) || [];
    list.unshift(full);
    _set(_K.invoices, list.slice(0, 2000));
    _sbPush('th_invoices', 'POST', full);
    return full;
  },

  // ── STOCK LOG ────────────────────────────────────────────
  stockLog() { return _get(_K.stockLog) || []; },
  async getStockLog() { return this.stockLog(); },

  // ── CUSTOMERS ────────────────────────────────────────────
  customers() { return _get(_K.customers) || []; },
  async getCustomers() { return this.customers(); },
  customer(id) { return this.customers().find(c => c.id === id) || null; },
  async getCustomer(id) { return this.customer(id); },

  saveCustomer(c) {
    const list = _get(_K.customers) || [];
    const i = list.findIndex(x => x.id === c.id);
    const saved = { ...c, updated_at: Date.now(), created_at: c.created_at || Date.now() };
    if (i >= 0) list[i] = saved; else list.push(saved);
    _set(_K.customers, list);
    _sbPush('th_customers', 'POST', saved);
  },

  deleteCustomer(id) {
    _set(_K.customers, (_get(_K.customers) || []).filter(c => c.id !== id));
    _sbPush('th_customers?id=eq.' + encodeURIComponent(id), 'DELETE');
  },

  // ── SUPPLIERS (localStorage — linked by name) ────────────
  getSuppliers() { return _get(_K.suppliers) || []; },
  saveSuppliers(list) { _set(_K.suppliers, list); },

  // ── HELPERS ──────────────────────────────────────────────
  fmt(n) {
    return Number(n||0).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});
  },
  fmtDate(ts, opts) {
    const d=new Date(ts);
    if(opts) return d.toLocaleDateString('ar-SA-u-nu-latn',opts);
    return d.toLocaleDateString('ar-SA-u-nu-latn',{year:'numeric',month:'short',day:'numeric'})
      +' '+d.toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit',hour12:true});
  },
  today() { return new Date().toLocaleDateString('ar-SA-u-nu-latn', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }); },
  isToday(ts) { return new Date(ts).toDateString() === new Date().toDateString(); },
  isThisMonth(ts) { const d = new Date(ts), n = new Date(); return d.getFullYear() === n.getFullYear() && d.getMonth() === n.getMonth(); },
  uid() { return Math.random().toString(36).slice(2, 9); },
};

// ─── Auto-seed admin ─────────────────────────────────────
DB.seedAdmin();

// ─── مزامنة من Supabase عند بدء الصفحة ──────────────────
(async function syncFromSupabase() {
  try {
    // Settings
    const sRows = await _sbGet('th_settings?id=eq.main&select=data');
    if (sRows?.[0]?.data) {
      const existing = _get(_K.settings) || {};
      _set(_K.settings, { ...sRows[0].data, logo: existing.logo });
    }
    // Products
    const prods = await _sbGet('th_products?select=*&order=updated_at.desc&limit=1000');
    if (prods?.length) {
      const local = _get(_K.products) || [];
      // Merge: Supabase wins for non-image fields, keep local images
      const merged = prods.map(sp => {
        const lp = local.find(x => x.barcode === sp.barcode);
        return { ...sp, img: lp?.img || null };
      });
      _set(_K.products, merged);
    }
    // Invoices
    const invs = await _sbGet('th_invoices?select=*&order=at.desc&limit=2000');
    if (invs?.length) _set(_K.invoices, invs);
    // Customers
    const custs = await _sbGet('th_customers?select=*&order=name.asc');
    if (custs?.length) _set(_K.customers, custs);
    // Stock log
    const logs = await _sbGet('th_stock_log?select=*&order=at.desc&limit=500');
    if (logs?.length) _set(_K.stockLog, logs);

    console.log('[Supabase] تمت المزامنة بنجاح ✓');
  } catch (e) {
    console.warn('[Supabase] فشلت المزامنة — يعمل من localStorage', e.message);
  }
})();

// ─── مزامنة دورية كل 30 ثانية (للأجهزة الأخرى) ─────────
setInterval(async () => {
  const prods = await _sbGet('th_products?select=*&order=updated_at.desc&limit=1000');
  if (prods?.length) {
    const local = _get(_K.products) || [];
    _set(_K.products, prods.map(sp => ({ ...sp, img: local.find(x=>x.barcode===sp.barcode)?.img||null })));
  }
  const invs = await _sbGet('th_invoices?select=*&order=at.desc&limit=2000');
  if (invs?.length) _set(_K.invoices, invs);
  const custs = await _sbGet('th_customers?select=*&order=name.asc');
  if (custs?.length) _set(_K.customers, custs);
}, 30000);


// ─── IDLE TIMER (2 minutes → auto logout) ──────────────
(function setupIdleTimer(){
  let _idleTimer = null;
  const IDLE_MS = 2 * 60 * 1000; // 2 minutes

  function resetIdle(){
    clearTimeout(_idleTimer);
    // Only run if user is logged in
    if(!DB.session()) return;
    _idleTimer = setTimeout(()=>{
      DB.clearSession();
      location.href = 'index.html?timeout=1';
    }, IDLE_MS);
  }

  ['mousemove','mousedown','keydown','touchstart','scroll','click'].forEach(ev=>{
    document.addEventListener(ev, resetIdle, { passive:true });
  });

  // Start timer
  resetIdle();
})();

// ─── TOAST ───────────────────────────────────────────────
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

// ─── LOADING ─────────────────────────────────────────────
function showLoading(msg = 'جاري التحميل…') {
  if (document.getElementById('th-loading')) return;
  const el = document.createElement('div'); el.id = 'th-loading'; el.className = 'th-loading';
  el.innerHTML = `<div class="th-spinner"></div><div style="font-family:'Tajawal',sans-serif;font-size:.9rem;color:#7A6A50">${msg}</div>`;
  document.body.appendChild(el);
}
function hideLoading() { const el = document.getElementById('th-loading'); if (el) el.remove(); }

// ─── Shared CSS ───────────────────────────────────────────
(function () {
  if (document.getElementById('th-shared')) return;
  const s = document.createElement('style'); s.id = 'th-shared';
  s.textContent = `
    .th-toast{position:fixed;bottom:32px;left:50%;transform:translateX(-50%) translateY(12px);
      padding:11px 24px;border-radius:10px;font-family:'Tajawal',sans-serif;font-size:.9rem;
      font-weight:600;z-index:9999;opacity:0;transition:.25s;pointer-events:none;
      background:#fff;color:#1F1709;border:1px solid #EBE3D5;box-shadow:0 8px 32px rgba(0,0,0,.15)}
    .th-toast.in{opacity:1;transform:translateX(-50%) translateY(0)}
    .th-toast[data-type=ok]{border-color:#C9A84C}
    .th-toast[data-type=err]{border-color:#c0392b;color:#c0392b}
    .th-toast[data-type=warn]{border-color:#e67e22;color:#b06a20}
    .th-loading{position:fixed;inset:0;background:rgba(255,255,255,.88);z-index:9998;
      display:flex;align-items:center;justify-content:center;flex-direction:column;gap:14px}
    .th-spinner{width:40px;height:40px;border:3px solid #EBE3D5;border-top-color:#C9A84C;
      border-radius:50%;animation:th-spin .7s linear infinite}
    @keyframes th-spin{to{transform:rotate(360deg)}}
  `;
  document.head.appendChild(s);
})();
