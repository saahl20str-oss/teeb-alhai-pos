/**
 * sync.js — طيب الحي | قاعدة البيانات المركزية
 */
const DB = {
  KEYS: {
    products:  'tayyib_products',
    invoices:  'tayyib_invoices',
    expenses:  'tayyib_expenses',
    settings:  'tayyib_settings',
    stock_log: 'tayyib_stock_log',
    user:      'oud_user',
  },

  get(key)       { try { return JSON.parse(localStorage.getItem(key)) ?? null; } catch { return null; } },
  set(key, val)  { localStorage.setItem(key, JSON.stringify(val)); },

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

  // ── Settings ─────────────────────────────
  getSettings() {
    const saved = this.get(this.KEYS.settings);
    const defaults = {
      store_name:    'طيب الحي للعود والأدهان',
      currency:      'د.إ',
      tax_rate:      5,
      low_stock_qty: 5,
      logo:          null,
      address:       '',
      phone:         '',
      _initialized:  false,
    };
    if (!saved) return defaults;
    // Always ensure currency defaults to د.إ if not set
    if (!saved.currency) saved.currency = 'د.إ';
    return { ...defaults, ...saved };
  },
  saveSettings(s) { this.set(this.KEYS.settings, s); },

  // ── Auth ─────────────────────────────────
  getUser()    { return this.get(this.KEYS.user); },
  requireAuth() {
    if (!this.getUser()) { location.href = 'index.html'; return false; }
    return true;
  },

  // ── Helpers ──────────────────────────────
  fmt(n) {
    return Number(n || 0).toLocaleString('ar-SA', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  },
  today() {
    return new Date().toLocaleDateString('ar-SA-u-nu-latn', { weekday:'long', year:'numeric', month:'long', day:'numeric' });
  },
  isToday(ts) {
    const d = new Date(ts), n = new Date();
    return d.getFullYear() === n.getFullYear() && d.getMonth() === n.getMonth() && d.getDate() === n.getDate();
  },
  isThisMonth(ts) {
    const d = new Date(ts), n = new Date();
    return d.getFullYear() === n.getFullYear() && d.getMonth() === n.getMonth();
  },
  shortDate(ts) {
    return new Date(ts).toLocaleDateString('ar-SA-u-nu-latn', { month:'short', day:'numeric', hour:'2-digit', minute:'2-digit' });
  },
};

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
    .toast {
      position:fixed;bottom:28px;left:50%;transform:translateX(-50%) translateY(16px);
      background:#1C1208;color:#F8F3EA;padding:10px 22px;border-radius:9px;
      font-size:.88rem;font-family:'Tajawal',sans-serif;z-index:9999;
      opacity:0;transition:opacity .25s,transform .25s;pointer-events:none;
      border-right:3px solid #C9A84C;box-shadow:0 4px 20px rgba(0,0,0,.25);
    }
    .toast.show{opacity:1;transform:translateX(-50%) translateY(0)}
    .toast.toast-error{border-right-color:#c0392b}
    .toast.toast-warning{border-right-color:#e67e22}
  `;
  document.head.appendChild(s);
})();
