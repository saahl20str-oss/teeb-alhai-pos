// مصفوفة التصنيفات الأساسية لـ "طيب الحي"
const INITIAL_CATEGORIES = ['عود', 'دخون', 'عطور', 'زعفران', 'مسك', 'بخور', 'هدايا'];

// ⚠️ تم وضع روابط ومفاتيح مشروع "طيب الحي" بنجاح هنا
const SUPABASE_URL = 'https://jeufcuwgahtgwmjvhnqq.supabase.co'; 
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpldWZjdXdnYWh0Z3dtanZobnFxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA0ODA5MzgsImV4cCI6MjA5NjA1NjkzOH0.GkE1XuyyppO2EQ9jkUNJDqbPn-e-B0BYrIjccuQnozA';

// تفعيل الاتصال المباشر بقاعدة البيانات السحابية
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

function App() {
  // --- حالات النظام العامة ---
  const [currentView, setCurrentView] = React.useState('landing'); 
  const [currentRole, setCurrentRole] = React.useState('admin'); 
  const [dashboardTab, setDashboardTab] = React.useState('overview'); 
  const [isAuthenticated, setIsAuthenticated] = React.useState(false);
  
  // --- حالات البيانات القادمة من السيرفر الفعلي ---
  const [products, setProducts] = React.useState([]);
  const [categories] = React.useState(INITIAL_CATEGORIES);
  const [invoices, setInvoices] = React.useState([]);
  const [notifications, setNotifications] = React.useState([]);
  const [isLoading, setIsLoading] = React.useState(true);

  // --- حالات الكاشير POS ---
  const [posCart, setPosCart] = React.useState([]);
  const [posSearch, setPosSearch] = React.useState('');
  const [posCustomerPhone, setPosCustomerPhone] = React.useState('');
  const [posCustomerName, setPosCustomerName] = React.useState('');
  const [posDiscount, setPosDiscount] = React.useState('');
  const [posPaymentMethod, setPosPaymentMethod] = React.useState('cash');

  // --- نموذج إضافة منتج جديد ---
  const [newProduct, setNewProduct] = React.useState({
    barcode: '', name: '', category: 'عود', unit: 'توله', purchase_price: '', sale_price: '', quantity: '', min_stock_level: '', supplier: ''
  });
  
  const [storeSettings] = React.useState({
    store_name: 'طيب الحي للعود والأدهان',
    currency: 'AED',
    tax_rate: 5,
    phone: '+971 50 000 0000',
    email: 'info@teebalhai.com'
  });

  // جلب البيانات الحية من جدول الـ products في Supabase
  const fetchProducts = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setProducts(data);
    } else {
      console.error('خطأ في جلب المنتجات:', error?.message);
    }
    setIsLoading(false);
  };

  // جلب الفواتير السابقة من السيرفر للتدقيق والأرشفة
  const fetchInvoices = async () => {
    const { data, error } = await supabase
      .from('invoices')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setInvoices(data);
    }
  };

  React.useEffect(() => {
    fetchProducts();
    fetchInvoices();
  }, []);

  // المراقبة والتنبيهات لمستويات المخزون الحرج
  React.useEffect(() => {
    const alerts = [];
    products.forEach(p => {
      if (p.quantity <= p.min_stock_level) {
        alerts.push({ id: p.id, type: 'danger', message: `تنبيه حرج: مخزون (${p.name}) منخفض جداً! المتبقي: ${p.quantity} ${p.unit || 'توله'}` });
      }
    });
    setNotifications(alerts);
  }, [products]);

  React.useEffect(() => {
    if (currentRole === 'sales') setDashboardTab('pos');
    else if (currentRole === 'inventory') setDashboardTab('products');
    else setDashboardTab('overview');
  }, [currentRole]);

  // التحكم في سلة الكاشير ومطابقة المخزون
  const handleAddToPosCart = (product) => {
    const exists = posCart.find(item => item.id === product.id);
    const currentQtyInCart = exists ? exists.cartQty : 0;

    if (currentQtyInCart >= product.quantity) {
      alert(`عذراً! لا يمكن إضافة المزيد. المتاح في المخزن الفعلي هو ${product.quantity} قطعة فقط.`);
      return;
    }

    if (exists) {
      setPosCart(posCart.map(item => item.id === product.id ? { ...item, cartQty: item.cartQty + 1 } : item));
    } else {
      setPosCart([...posCart, { ...product, cartQty: 1 }]);
    }
  };

  const handleUpdateCartQty = (id, newQty) => {
    const product = products.find(p => p.id === id);
    const qty = parseInt(newQty) || 0;

    if (qty > product.quantity) {
      alert(`خطأ: الكمية المطلوبة تتجاوز المخزون الحالي المتاح (${product.quantity}).`);
      return;
    }

    if (qty <= 0) {
      setPosCart(posCart.filter(item => item.id !== id));
    } else {
      setPosCart(posCart.map(item => item.id === id ? { ...item, cartQty: qty } : item));
    }
  };

  // --- الحسابات المالية الدقيقة للفاتورة ---
  const cartSubtotal = posCart.reduce((sum, item) => sum + (item.sale_price * item.cartQty), 0);
  const discountValue = parseFloat(posDiscount) || 0;
  
  const taxableAmount = Math.max(0, cartSubtotal - discountValue);
  const taxValue = taxableAmount * (storeSettings.tax_rate / 100);
  const cartTotalFinal = taxableAmount + taxValue;

  // إتمـام عملية البيع ورفع الفاتورة إلى Supabase
  const handleCheckout = async () => {
    if (posCart.length === 0) return alert('خطأ: سلة المشتريات فارغة تماماً!');

    // أ- إدخال الفاتورة في جدول الفواتير بالسيرفر
    const { error: invoiceError } = await supabase
      .from('invoices')
      .insert([{
        customer_name: posCustomerName || 'عميل نقدي سريع',
        customer_phone: posCustomerPhone || 'غير مسجل',
        subtotal: cartSubtotal,
        tax_amount: taxValue,
        discount: discountValue,
        total_amount: cartTotalFinal,
        payment_method: posPaymentMethod
      }]);

    if (invoiceError) {
      alert('خطأ أثناء حفظ الفاتورة في السيرفر: ' + invoiceError.message);
      return;
    }

    // ب- تحديث المخزون الفعلي في جدول المنتجات لكل منتج تم بيعه
    for (const item of posCart) {
      const newStockQty = item.quantity - item.cartQty;
      await supabase
        .from('products')
        .update({ quantity: newStockQty })
        .eq('id', item.id);
    }

    alert(`🎉 تم إصدار الفاتورة بنجاح، وتحديث كميات المستودع الفعلي على السيرفر.`);
    setPosCart([]);
    setPosCustomerName('');
    setPosCustomerPhone('');
    setPosDiscount('');
    fetchProducts();
    fetchInvoices();
  };

  // إضافة صنف جديد وحفظه في قاعدة البيانات
  const handleAddProductSubmit = async (e) => {
    e.preventDefault();
    
    const { error } = await supabase
      .from('products')
      .insert([{
        barcode: newProduct.barcode,
        name: newProduct.name,
        category: newProduct.category,
        unit: newProduct.unit,
        purchase_price: parseFloat(newProduct.purchase_price) || 0,
        sale_price: parseFloat(newProduct.sale_price) || 0,
        quantity: parseInt(newProduct.quantity) || 0,
        min_stock_level: parseInt(newProduct.min_stock_level) || 5,
        supplier: newProduct.supplier || 'مورد عام'
      }]);

    if (error) {
      alert('فشل إضافة المنتج في السيرفر: ' + error.message);
    } else {
      alert('✅ تم إدراج المنتج الجديد بنجاح في قاعدة البيانات الحية.');
      setNewProduct({ barcode: '', name: '', category: 'عود', unit: 'توله', purchase_price: '', sale_price: '', quantity: '', min_stock_level: '', supplier: '' });
      fetchProducts();
    }
  };

  const totalSalesAllTime = invoices.reduce((sum, inv) => sum + Number(inv.total_amount || 0), 0);

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 font-sans antialiased selection:bg-amber-500 selection:text-black" dir="rtl">
      
      {/* الهيدر الرئيسي للمتجر */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-neutral-950/90 border-b border-amber-500/20 px-4 lg:px-8 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => setCurrentView('landing')}>
          <div className="w-11 h-11 rounded-full border border-amber-500/30 bg-white overflow-hidden p-0.5 shadow-md shadow-amber-500/5 flex items-center justify-center">
            <span className="text-xl">⚜️</span>
          </div>
          <div>
            <h1 className="text-lg font-bold bg-gradient-to-l from-amber-200 via-amber-400 to-amber-100 bg-clip-text text-transparent">طيب الحي</h1>
            <p className="text-[10px] text-neutral-400 font-light">للعود والأدهان والعطور الفاخرة</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isAuthenticated ? (
            <div className="flex items-center gap-2">
              <button onClick={() => setCurrentView('dashboard')} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-gradient-to-r from-amber-600 to-amber-500 text-neutral-950 rounded-lg shadow-sm hover:from-amber-500 transition-all">
                 لوحة النظام
              </button>
              <button onClick={() => { setIsAuthenticated(false); setCurrentView('landing'); }} className="p-1.5 bg-neutral-900 border border-neutral-800 rounded-lg text-red-400 hover:bg-neutral-800 transition-colors text-xs">
                خروج
              </button>
            </div>
          ) : (
            <button onClick={() => setCurrentView('auth')} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-amber-500/30 bg-amber-500/5 text-amber-400 rounded-lg hover:bg-amber-500/10 transition-all">
               دخول النظام
            </button>
          )}
        </div>
      </header>

      {/* شاشة العرض 1: صفحة الهبوط واستعراض المنتجات */}
      {currentView === 'landing' && (
        <div>
          <section className="relative min-h-[40vh] flex items-center justify-center text-center px-4 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-neutral-900 via-neutral-950 to-neutral-950">
            <div className="space-y-4 max-w-3xl z-10">
              <span className="px-3 py-1 rounded-full text-[11px] font-medium tracking-wide bg-amber-500/10 border border-amber-500/20 text-amber-400">⚜️ طيب الحي للعود والأدهان</span>
              <h2 className="text-2xl sm:text-4xl font-black text-neutral-100 leading-tight">المنتجات المتوفرة بالمستودعات حياً</h2>
              <p className="text-xs text-neutral-400 max-w-xl mx-auto font-light">متصل مباشرة بقاعدة البيانات الفوقية لضمان توفر الكميات بدقة تامة.</p>
            </div>
          </section>

          <section className="py-10 max-w-7xl mx-auto px-4 lg:px-8">
            {isLoading ? (
              <p className="text-center text-xs text-amber-400 animate-pulse">جاري الاتصال بقاعدة البيانات وجلب المنتجات الفاخرة...</p>
            ) : products.length === 0 ? (
              <p className="text-center text-xs text-neutral-500">المستودع فارغ حالياً. قم بتسجيل الدخول كمسؤول لإضافة منتجاتك الأولى.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {products.map(p => (
                  <div key={p.id} className="bg-neutral-900/50 border border-neutral-900 rounded-2xl p-5 flex flex-col justify-between space-y-4">
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 font-medium">{p.category}</span>
                        <span className="text-[11px] text-neutral-500">الوحدة: {p.unit}</span>
                      </div>
                      <h4 className="text-sm font-bold text-neutral-200">{p.name}</h4>
                    </div>
                    <div className="flex justify-between items-center pt-2 border-t border-neutral-950">
                      <span className="text-xs text-neutral-400">السعر</span>
                      <span className="text-base font-bold text-amber-400">{p.sale_price} {storeSettings.currency}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      )}

      {/* شاشة العرض 2: تسجيل الدخول */}
      {currentView === 'auth' && (
        <div className="min-h-[60vh] flex items-center justify-center px-4">
          <div className="w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-2xl p-6 space-y-4 shadow-xl">
            <h3 className="text-center text-base font-bold">بوابة الموظفين والربط السحابي</h3>
            <div className="space-y-2">
              {[{ id: 'admin', label: 'مدير النظام (كامل الصلاحيات)' }, { id: 'sales', label: 'موظف مبيعات / كاشير' }].map(role => (
                <button key={role.id} onClick={() => setCurrentRole(role.id)} className={`w-full text-right p-3 rounded-xl border text-xs ${currentRole === role.id ? 'border-amber-500 bg-amber-500/10 text-amber-400' : 'border-neutral-800 bg-neutral-950'}`}>
                  {role.label}
                </button>
              ))}
            </div>
            <button onClick={() => { setIsAuthenticated(true); setCurrentView('dashboard'); }} className="w-full py-2.5 bg-amber-500 text-neutral-950 font-bold rounded-xl text-xs">دخول</button>
          </div>
        </div>
      )}

      {/* شاشة العرض 3: لوحة التحكم والـ POS */}
      {currentView === 'dashboard' && isAuthenticated && (
        <div className="min-h-screen grid grid-cols-1 lg:grid-cols-12">
          <aside className="lg:col-span-2 bg-neutral-900 border-l border-neutral-800 p-4 space-y-2">
            {currentRole === 'admin' && <button onClick={() => setDashboardTab('overview')} className={`w-full text-right p-2.5 rounded-lg text-xs ${dashboardTab === 'overview' ? 'bg-amber-500 text-black font-bold' : ''}`}>📈 نظرة عامة والمالية</button>}
            <button onClick={() => setDashboardTab('pos')} className={`w-full text-right p-2.5 rounded-lg text-xs ${dashboardTab === 'pos' ? 'bg-amber-500 text-black font-bold' : ''}`}>🛍️ الكاشير الذكي POS</button>
            <button onClick={() => setDashboardTab('products')} className={`w-full text-right p-2.5 rounded-lg text-xs ${dashboardTab === 'products' ? 'bg-amber-500 text-black font-bold' : ''}`}>📦 إدارة المنتجات والجرد</button>
          </aside>

          <main className="lg:col-span-10 p-4 lg:p-6 space-y-6">
            {notifications.map((notif, idx) => (
              <div key={idx} className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-xs">{notif.message}</div>
            ))}

            {dashboardTab === 'overview' && currentRole === 'admin' && (
              <div className="bg-neutral-900 p-5 rounded-xl border border-neutral-800">
                <span className="text-xs text-neutral-400">إجمالي إيرادات المبيعات الفعلية بالسيرفر:</span>
                <h3 className="text-2xl font-black text-amber-400 mt-1">{totalSalesAllTime.toFixed(2)} {storeSettings.currency}</h3>
              </div>
            )}

            {dashboardTab === 'pos' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-7 space-y-4">
                  <input type="text" placeholder="ابحث بالاسم أو الباركود..." value={posSearch} onChange={(e) => setPosSearch(e.target.value)} className="w-full p-2 bg-neutral-900 border border-neutral-800 rounded-lg text-xs" />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {products.filter(p => p.name.includes(posSearch) || p.barcode.includes(posSearch)).map(product => (
                      <div key={product.id} onClick={() => handleAddToPosCart(product)} className="bg-neutral-900 border border-neutral-800 p-3 rounded-xl cursor-pointer hover:border-amber-500 flex justify-between items-center">
                        <div>
                          <h5 className="text-xs font-bold">{product.name}</h5>
                          <p className="text-[10px] text-neutral-400">المتاح: {product.quantity} {product.unit}</p>
                        </div>
                        <span className="text-xs font-bold text-amber-400">{product.sale_price} {storeSettings.currency}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="lg:col-span-5 bg-neutral-900 p-4 rounded-2xl border border-neutral-800 flex flex-col justify-between space-y-4">
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold border-b border-neutral-800 pb-2">السلة الحالية</h4>
                    {posCart.map(item => (
                      <div key={item.id} className="flex justify-between items-center text-xs bg-neutral-950 p-2 rounded-lg">
                        <span>{item.name}</span>
                        <input type="number" min="1" value={item.cartQty} onChange={(e) => handleUpdateCartQty(item.id, e.target.value)} className="w-12 bg-neutral-900 text-center rounded text-xs" />
                      </div>
                    ))}
                  </div>
                  <div className="bg-neutral-950 p-3 rounded-xl space-y-1.5 text-xs">
                    <div className="flex justify-between"><span>الإجمالي النهائي (شامل الضريبة):</span><span className="font-bold text-amber-400">{cartTotalFinal.toFixed(2)} {storeSettings.currency}</span></div>
                    <button onClick={handleCheckout} className="w-full py-2 bg-amber-500 text-black font-bold rounded-lg text-xs mt-2">تأكيد عملية البيع وتحديث السيرفر</button>
                  </div>
                </div>
              </div>
            )}

            {dashboardTab === 'products' && (
              <div className="space-y-4">
                <form onSubmit={handleAddProductSubmit} className="bg-neutral-900 p-4 rounded-xl border border-neutral-800 grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <input type="text" required placeholder="الباركود الدولي" value={newProduct.barcode} onChange={(e) => setNewProduct({...newProduct, barcode: e.target.value})} className="p-2 bg-neutral-950 border border-neutral-800 rounded-lg text-xs" />
                  <input type="text" required placeholder="اسم صنف البخور/العطر" value={newProduct.name} onChange={(e) => setNewProduct({...newProduct, name: e.target.value})} className="p-2 bg-neutral-950 border border-neutral-800 rounded-lg text-xs" />
                  <input type="number" required placeholder="سعر البيع" value={newProduct.sale_price} onChange={(e) => setNewProduct({...newProduct, sale_price: e.target.value})} className="p-2 bg-neutral-950 border border-neutral-800 rounded-lg text-xs" />
                  <input type="number" required placeholder="سعر التكلفة (الشراء)" value={newProduct.purchase_price} onChange={(e) => setNewProduct({...newProduct, purchase_price: e.target.value})} className="p-2 bg-neutral-950 border border-neutral-800 rounded-lg text-xs" />
                  <input type="number" required placeholder="الكمية المتوفرة بالمستودع" value={newProduct.quantity} onChange={(e) => setNewProduct({...newProduct, quantity: e.target.value})} className="p-2 bg-neutral-950 border border-neutral-800 rounded-lg text-xs" />
                  <button type="submit" className="bg-amber-500 text-black font-bold rounded-lg text-xs">إدخال للمخزن الفعلي</button>
                </form>

                <div className="bg-neutral-900 rounded-xl overflow-hidden text-xs">
                  <table className="w-full text-right">
                    <thead className="bg-neutral-950 text-neutral-400">
                      <tr><th className="p-3">الاسم</th><th className="p-3">السعر</th><th className="p-3">المخزون الحالي</th></tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-800">
                      {products.map(p => (
                        <tr key={p.id}>
                          <td className="p-3 font-bold">{p.name}</td>
                          <td className="p-3 text-amber-400">{p.sale_price}</td>
                          <td className="p-3">{p.quantity} {p.unit}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </main>
        </div>
      )}
    </div>
  );
}

// تشغيل وربط الريأكت في الصفحة
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(React.createElement(App));
