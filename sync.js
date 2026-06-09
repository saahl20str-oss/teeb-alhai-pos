// ============================================================
// sync.js — طيب الحي | نقطة البيانات المركزية
// أضف هذا السطر في <head> لكل ملف HTML:
// <script src="sync.js"></script>
// ============================================================

const TayyibDB = {

  // ── KEYS ──────────────────────────────────────────────────
  KEYS: {
    products : 'tayyib_products',
    invoices : 'tayyib_invoices',
    accounts : 'tayyib_accounts',
    expenses : 'tayyib_expenses',
    settings : 'tayyib_settings',
    log      : 'tayyib_stock_log',
    customers: 'tayyib_customers',
  },

  // ── READ ──────────────────────────────────────────────────
  get(key) {
    try { return JSON.parse(localStorage.getItem(this.KEYS[key]) || '[]'); }
    catch(e) { return []; }
  },
  getObj(key) {
    try { return JSON.parse(localStorage.getItem(this.KEYS[key]) || '{}'); }
    catch(e) { return {}; }
  },

  // ── WRITE ─────────────────────────────────────────────────
  save(key, data) {
    localStorage.setItem(this.KEYS[key], JSON.stringify(data));
    // fire event so other open tabs update instantly
    window.dispatchEvent(new CustomEvent('tayyib_update', { detail: { key } }));
  },

  // ── PRODUCTS ──────────────────────────────────────────────
  getProducts()         { return this.get('products'); },
  saveProducts(data)    { this.save('products', data); },

  findProduct(codeOrId) {
    const list = this.getProducts();
    return list.find(p =>
      p.id === codeOrId ||
      (p.code && p.code.toLowerCase() === String(codeOrId).toLowerCase())
    );
  },

  addProduct(prod) {
    const list = this.getProducts();
    if (list.find(p => p.code === prod.code)) return false; // duplicate
    prod.id = prod.id || Date.now();
    prod.createdAt = new Date().toISOString();
    list.push(prod);
    this.saveProducts(list);
    this.addLog(prod, 'in', prod.stock || 0, 'إدخال أولي');
    return true;
  },

  updateProduct(id, changes) {
    const list = this.getProducts();
    const idx = list.findIndex(p => p.id === id);
    if (idx < 0) return false;
    list[idx] = { ...list[idx], ...changes };
    this.saveProducts(list);
    return true;
  },

  deleteProduct(id) {
    const list = this.getProducts().filter(p => p.id !== id);
    this.saveProducts(list);
  },

  // ── STOCK MOVE ────────────────────────────────────────────
  stockIn(productId, qty, reason, ref) {
    const list = this.getProducts();
    const p = list.find(x => x.id === productId);
    if (!p) return false;
    p.stock = +(p.stock + qty).toFixed(4);
    this.saveProducts(list);
    this.addLog(p, 'in', qty, reason || 'إدخال', ref);
    this.checkLowStock(p);
    return true;
  },

  stockOut(productId, qty, reason, ref) {
    const list = this.getProducts();
    const p = list.find(x => x.id === productId);
    if (!p || p.stock < qty) return false;
    p.stock = +(p.stock - qty).toFixed(4);
    this.saveProducts(list);
    this.addLog(p, 'out', qty, reason || 'إخراج', ref);
    this.checkLowStock(p);
    return true;
  },

  checkLowStock(product) {
    if (product.stock <= 0) {
      this._notify('⛔ نفاد المخزون: ' + product.name, 'err');
    } else if (product.stock <= product.alertAt) {
      this._notify('⚠ مخزون منخفض: ' + product.name + ' (' + product.stock + ' ' + product.unit + ')', 'warn');
    }
  },

  // ── STOCK LOG ─────────────────────────────────────────────
  addLog(product, type, qty, reason, ref) {
    const user = this._currentUser();
    const log = this.get('log');
    log.unshift({
      id       : Date.now(),
      code     : product.code,
      name     : product.name,
      type,          // 'in' | 'out' | 'sale' | 'return' | 'purchase'
      qty,
      unit     : product.unit,
      stockAfter: product.stock,
      reason   : reason || '—',
      ref      : ref || '—',
      by       : user.name || 'مدير',
      date     : new Date().toISOString(),
    });
    this.save('log', log.slice(0, 500)); // keep last 500 entries
  },

  getLog() { return this.get('log'); },

  // ── INVOICES ──────────────────────────────────────────────
  getInvoices()      { return this.get('invoices'); },

  getNextInvNo(type) {
    const s = this.getSettings();
    const prefix = type === 'sell' ? 'INV' : 'PO';
    const key = 'tayyib_inv_counter_' + type;
    let n = parseInt(localStorage.getItem(key) || '1000');
    n++;
    localStorage.setItem(key, n);
    return '#' + prefix + '-' + n;
  },

  saveInvoice(invoice) {
    const list = this.getInvoices();
    list.unshift(invoice);
    this.save('invoices', list.slice(0, 1000));

    // deduct / add stock automatically
    if (invoice.type === 'sell') {
      (invoice.items || []).forEach(item => {
        this.stockOut(item.id, item.qty, 'مبيعات', invoice.no);
      });
    } else if (invoice.type === 'purchase') {
      (invoice.items || []).forEach(item => {
        this.stockIn(item.id, item.qty, 'مشتريات', invoice.no);
      });
    } else if (invoice.type === 'return') {
      (invoice.items || []).forEach(item => {
        this.stockIn(item.id, item.qty, 'مرتجع', invoice.no);
      });
    }

    // save customer
    if (invoice.customer && invoice.customer !== 'عميل زيارة') {
      this.upsertCustomer(invoice.customer, invoice.grand);
    }
  },

  // ── CUSTOMERS ─────────────────────────────────────────────
  getCustomers() { return this.get('customers'); },

  upsertCustomer(name, amount) {
    const list = this.getCustomers();
    const idx = list.findIndex(c => c.name === name);
    if (idx >= 0) {
      list[idx].visits = (list[idx].visits || 0) + 1;
      list[idx].totalSpent = (list[idx].totalSpent || 0) + amount;
      list[idx].lastVisit = new Date().toISOString();
    } else {
      list.unshift({ id: Date.now(), name, visits: 1, totalSpent: amount, lastVisit: new Date().toISOString() });
    }
    this.save('customers', list);
  },

  // ── ACCOUNTS / EMPLOYEES ──────────────────────────────────
  getAccounts() {
    const saved = this.get('accounts');
    if (saved.length) return saved;
    // default admin
    return [{
      id: 1, username: 'admin', password: 'admin123',
      name: 'مدير النظام', email: '', phone: '',
      store: 'طيب الحي', role: 'admin',
      permissions: ['dashboard','inventory','cashier','invoices',
                    'customers','reports','employees','settings'],
      status: 'active', createdAt: new Date().toISOString()
    }];
  },

  saveAccounts(data) { this.save('accounts', data); },

  authenticate(username, password) {
    return this.getAccounts().find(
      a => a.username === username && a.password === password
    );
  },

  // ── EXPENSES ──────────────────────────────────────────────
  getExpenses()  { return this.get('expenses'); },
  addExpense(exp) {
    const list = this.getExpenses();
    exp.id   = Date.now();
    exp.date = exp.date || new Date().toISOString().split('T')[0];
    exp.by   = this._currentUser().name || 'مدير';
    list.unshift(exp);
    this.save('expenses', list);
  },

  // ── SETTINGS ──────────────────────────────────────────────
  getSettings() { return this.getObj('settings'); },
  saveSettings(obj) {
    const cur = this.getSettings();
    this.save('settings', { ...cur, ...obj });
  },
  get currency() { return this.getSettings().currency || 'د.إ'; },
  get taxRate()  { return parseFloat(this.getSettings().tax  || 5) / 100; },

  // ── ANALYTICS ─────────────────────────────────────────────
  getTodayStats() {
    const today = new Date().toISOString().split('T')[0];
    const inv   = this.getInvoices();
    const exp   = this.getExpenses();
    const prods = this.getProducts();

    const todayInv  = inv.filter(i => i.date && i.date.startsWith(today) && i.type === 'sell');
    const todaySales = todayInv.reduce((s, i) => s + i.grand, 0);
    const todayCount = todayInv.length;
    const todayExp   = exp.filter(e => e.date && e.date.startsWith(today))
                          .reduce((s, e) => s + e.amount, 0);

    const todayProfit = todayInv.reduce((s, inv) => {
      const cost = (inv.items || []).reduce((sc, item) => {
        const p = prods.find(pp => pp.id === item.id);
        return sc + (p ? (p.cost || 0) : 0) * item.qty;
      }, 0);
      return s + (inv.sub - cost);
    }, 0);

    const stockVal = prods.reduce((s, p) => s + p.stock * (p.cost || p.price || 0), 0);
    const lowProds = prods.filter(p => p.stock <= p.alertAt && p.stock >= 0);
    const outProds = prods.filter(p => p.stock <= 0);

    return {
      todaySales, todayCount, todayProfit,
      todayExp, stockVal, lowProds, outProds,
      productCount: prods.length,
      invoiceCount: inv.length,
    };
  },

  getLast7Days() {
    const inv = this.getInvoices();
    const days = [];
    const labels = ['الأحد','الاثنين','الثلاثاء','الأربعاء','الخميس','الجمعة','السبت'];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const ds = d.toISOString().split('T')[0];
      const total = inv
        .filter(x => x.date && x.date.startsWith(ds) && x.type === 'sell')
        .reduce((s, x) => s + x.grand, 0);
      days.push({ label: labels[d.getDay()], date: ds, val: total });
    }
    return days;
  },

  // ── BARCODE HELPER ────────────────────────────────────────
  // Call this in any page to enable barcode scanning into a search input
  enableBarcodeScanner(inputId, onScan) {
    let buffer = '';
    let timer  = null;
    document.addEventListener('keydown', (e) => {
      // Ignore if focused on a different input
      const active = document.activeElement;
      if (active && active.tagName === 'TEXTAREA') return;
      if (active && active.type === 'password') return;

      if (e.key === 'Enter') {
        if (buffer.length >= 3) {
          const product = this.findProduct(buffer.trim());
          if (product && onScan) onScan(product);
          else {
            // fill the search input for manual lookup
            const inp = document.getElementById(inputId);
            if (inp) { inp.value = buffer.trim(); inp.dispatchEvent(new Event('input')); }
          }
        }
        buffer = '';
        if (timer) clearTimeout(timer);
        return;
      }

      if (e.key.length === 1) {
        buffer += e.key;
        if (timer) clearTimeout(timer);
        timer = setTimeout(() => { buffer = ''; }, 200);
      }
    });
  },

  // ── RESET (for testing) ───────────────────────────────────
  resetAll() {
    if (!confirm('تحذير: سيتم حذف جميع البيانات. هل أنت متأكد؟')) return;
    Object.values(this.KEYS).forEach(k => localStorage.removeItem(k));
    ['tayyib_inv_counter_sell','tayyib_inv_counter_purchase'].forEach(k => localStorage.removeItem(k));
    location.reload();
  },

  // ── EXPORT (backup) ───────────────────────────────────────
  exportBackup() {
    const data = {};
    Object.entries(this.KEYS).forEach(([k, v]) => {
      const raw = localStorage.getItem(v);
      if (raw) data[k] = JSON.parse(raw);
    });
    data.exportDate = new Date().toISOString();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = 'tayyib_backup_' + new Date().toISOString().split('T')[0] + '.json';
    a.click();
    URL.revokeObjectURL(url);
  },

  importBackup(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        Object.entries(this.KEYS).forEach(([k, v]) => {
          if (data[k]) localStorage.setItem(v, JSON.stringify(data[k]));
        });
        this._notify('✅ تم استيراد البيانات بنجاح', 'ok');
        setTimeout(() => location.reload(), 1500);
      } catch(err) {
        this._notify('⚠ خطأ في ملف النسخة الاحتياطية', 'warn');
      }
    };
    reader.readAsText(file);
  },

  // ── PRIVATE ───────────────────────────────────────────────
  _currentUser() {
    try { return JSON.parse(localStorage.getItem('oud_user') || '{}'); }
    catch(e) { return {}; }
  },

  _notify(msg, type) {
    // will use page toast if available
    if (typeof showToast === 'function') showToast(msg, type);
    else console.log('[TayyibDB]', msg);
  },
};

// ── AUTO-SYNC between tabs ────────────────────────────────────
window.addEventListener('storage', (e) => {
  if (e.key && e.key.startsWith('tayyib_')) {
    if (typeof refreshDashboard === 'function') refreshDashboard();
    if (typeof renderProducts   === 'function') renderProducts();
    if (typeof renderCart       === 'function') renderCart();
  }
});

// ── LIVE RELOAD every 60s (optional) ─────────────────────────
// Uncomment to auto-refresh dashboard every 60 seconds
// setInterval(() => { if (typeof refreshDashboard === 'function') refreshDashboard(); }, 60000);

console.log('[طيب الحي] TayyibDB ready ✓');
