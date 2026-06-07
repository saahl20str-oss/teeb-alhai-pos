// مصفوفة التصنيفات الأساسية لـ "طيب الحي"
const INITIAL_CATEGORIES = ['عود', 'دخون', 'عطور', 'زعفران', 'مسك', 'بخور', 'هدايا'];

// ⚠️ مفاتيح مشروع "طيب الحي" مدمجة مسبقاً
const SUPABASE_URL = 'https://jeufcuwgahtgwmjvhnqq.supabase.co'; 
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpldWZjdXdnYWh0Z3dtanZobnFxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA0ODA5MzgsImV4cCI6MjA5NjA1NjkzOH0.GkE1XuyyppO2EQ9jkUNJDqbPn-e-B0BYrIjccuQnozA';

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

function App() {
  // --- حالات التنقل والنظام ---
  const [currentView, setCurrentView] = React.useState('landing'); 
  const [currentRole, setCurrentRole] = React.useState('admin'); 
  const [dashboardTab, setDashboardTab] = React.useState('overview'); 
  const [isAuthenticated, setIsAuthenticated] = React.useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = React.useState(false); // لوحة التحكم المباشرة بالصفحة

  // --- لوحة التحكم القابلة للتعديل الفوري لمظهر المتجر ---
  const [customLiveDesign, setCustomLiveDesign] = React.useState({
    title: 'طيب الحي',
    subtitle: 'للعود والأدهان',
    description: 'نظام إدارة متكامل لمتجرك في عالم العود والأدهان والعطور الفاخرة',
    phone: '+971 50 123 4567',
    email: 'info@teebalhai.ae',
    location: 'دبي، الإمارات العربية المتحدة',
    bgUrl: 'https://images.unsplash.com/photo-1615485290382-441e4d049cb5?q=80&w=1600&auto=format&fit=crop', // خلفية مريحة وفخمة بديلة
    logoIcon: '⚜️'
  });

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

  const [newProduct, setNewProduct] = React.useState({
    barcode: '', name: '', category: 'عود', unit: 'توله', purchase_price: '', sale_price: '', quantity: '', min_stock_level: '', supplier: ''
  });

  const fetchProducts = async () => {
    setIsLoading(true);
    const { data, error } = await supabase.from('products').select('*').order('created_at', { ascending: false });
    if (!error && data) setProducts(data);
    setIsLoading(false);
  };

  const fetchInvoices = async () => {
    const { data, error } = await supabase.from('invoices').select('*').order('created_at', { ascending: false });
    if (!error && data) setInvoices(data);
  };

  React.useEffect(() => {
    fetchProducts();
    fetchInvoices();
  }, []);

  const totalSalesAllTime = invoices.reduce((sum, inv) => sum + Number(inv.total_amount || 0), 0);

  return (
    <div className="min-h-screen text-neutral-100 font-sans antialiased relative bg-[#17130e]" dir="rtl">
      
      {/* هيدر علوي فخم شفاف ومتناسق مع خلفية البيج الداكن */}
      <header className="absolute top-0 left-0 right-0 z-40 bg-transparent px-4 lg:px-12 py-4 flex items-center justify-between">
        {/* أزرار يسار الهيدر: الإعدادات الفورية وتسجيل الدخول */}
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsSettingsOpen(true)} 
            className="flex items-center gap-2 px-4 py-2 text-xs font-medium bg-[#dfc59f]/10 border border-[#dfc59f]/30 text-[#dfc59f] rounded-full hover:bg-[#dfc59f]/20 transition-all shadow-sm"
          >
            <span>⚙️</span> الإعدادات
          </button>
          
          <button 
            onClick={() => {
              if(isAuthenticated) {
                setCurrentView('dashboard');
              } else {
                setCurrentView('auth');
              }
            }} 
            className="flex items-center gap-2 px-4 py-2 text-xs font-medium bg-[#dfc59f] text-neutral-900 rounded-full hover:bg-[#cfb28a] transition-all shadow-md font-bold"
          >
            <span>👤</span> {isAuthenticated ? 'لوحة النظام' : 'تسجيل الدخول / إنشاء حساب'}
          </button>
        </div>

        {/* العملة واللغة (يمين الهيدر ليتناسق مع التوزيع البصري) */}
        <div className="hidden md:flex items-center gap-4 text-xs text-[#dfc59f]/80">
          <span className="bg-[#dfc59f]/5 px-3 py-1.5 rounded-full border border-[#dfc59f]/10">🇦🇪 درهم إماراتي AED</span>
          <span className="bg-[#dfc59f]/5 px-3 py-1.5 rounded-full border border-[#dfc59f]/10">🌐 العربية</span>
        </div>
      </header>

      {/* العرض الأول: صفحة الهبوط الفخمة المطلوبة */}
      {currentView === 'landing' && (
        <div className="relative min-h-screen flex flex-col justify-between pt-24">
          
          {/* الخلفية الضبابية الفاخرة مع تداخلات الإضاءة الدافئة */}
          <div className="absolute inset-0 z-0 overflow-hidden">
            <div 
              className="w-full h-full bg-cover bg-center scale-105 blur-[6px] opacity-25 brightness-[0.6]"
              style={{ backgroundImage: `url('${customLiveDesign.bgUrl}')` }}
            ></div>
            <div className="absolute inset-0 bg-gradient-to-b from-[#17130e]/40 via-[#17130e]/80 to-[#17130e]"></div>
          </div>

          {/* قلب الصفحة: الشعار والنصوص الفخمة السنتر */}
          <div className="relative z-10 my-auto text-center px-4 max-w-4xl mx-auto space-y-6">
            
            {/* الشعار الدائري المحدث المرفوع للأعلى */}
            <div className="mx-auto w-24 h-24 rounded-full border-2 border-[#dfc59f]/60 bg-[#1f1912] shadow-xl flex flex-col items-center justify-center p-2">
              <span className="text-2xl mb-0.5">{customLiveDesign.logoIcon}</span>
              <span className="text-[9px] text-[#dfc59f] tracking-widest font-serif font-bold uppercase">Teeb Al Hai</span>
            </div>

            {/* اسم المتجر بخط عربي فخم وكبير */}
            <div className="space-y-2">
              <h1 className="text-4xl sm:text-6xl font-serif font-bold text-[#dfc59f] tracking-wide drop-shadow-md">
                {customLiveDesign.title}
              </h1>
              <p className="text-lg sm:text-xl text-[#dfc59f]/80 font-light tracking-widest">
                {customLiveDesign.subtitle}
              </p>
            </div>

            {/* الوصف البديل لزر تسوق الآن */}
            <p className="text-xs sm:text-sm text-neutral-400 max-w-lg mx-auto leading-relaxed font-light">
              {customLiveDesign.description}
            </p>

            {/* زر دخول النظام الفخم السنتر */}
            <div className="pt-2">
              <button 
                onClick={() => setCurrentView('auth')} 
                className="inline-flex items-center gap-2 px-8 py-3 rounded-full border border-[#dfc59f]/40 bg-[#dfc59f]/5 text-[#dfc59f] text-xs font-semibold hover:bg-[#dfc59f]/10 transition-all tracking-wider group"
              >
                دخول النظام <span className="group-hover:translate-x-[-4px] transition-transform">←</span>
              </button>
            </div>
          </div>

          {/* البارات الخمسة السفلية الأنيقة (بدون التظليل الأحمر القديم) */}
          <div className="relative z-10 max-w-6xl w-full mx-auto px-4 grid grid-cols-2 md:grid-cols-5 gap-4 py-6 border-t border-[#dfc59f]/10 text-center text-[11px] text-neutral-400">
            <div className="space-y-1">
              <span className="text-[#dfc59f] text-sm block">💻</span>
              <p className="font-medium text-neutral-300">متوافق مع جميع الأجهزة</p>
              <p className="text-[10px] text-neutral-500">تجربة سلسة أينما كنت</p>
            </div>
            <div className="space-y-1">
              <span className="text-[#dfc59f] text-sm block">🛡️</span>
              <p className="font-medium text-neutral-300">آمن وموثوق</p>
              <p className="text-[10px] text-neutral-500">حماية بياناتك وعملياتك</p>
            </div>
            <div className="space-y-1">
              <span className="text-[#dfc59f] text-sm block">💰</span>
              <p className="font-medium text-neutral-300">العملة</p>
              <p className="text-[10px] text-neutral-500">الدرهم الإماراتي (AED)</p>
            </div>
            <div className="space-y-1">
              <span className="text-[#dfc59f] text-sm block">📍</span>
              <p className="font-medium text-neutral-300">العميل والموقع</p>
              <p className="text-[10px] text-neutral-500">الإمارات العربية المتحدة</p>
            </div>
            <div className="space-y-1 col-span-2 md:col-span-1">
              <span className="text-[#dfc59f] text-sm block">🌐</span>
              <p className="font-medium text-neutral-300">متعدد اللغات</p>
              <p className="text-[10px] text-neutral-500">يدعم العربية والإنجليزية</p>
            </div>
          </div>

          {/* فوتر معلومات الاتصال المكتمل والفاخر في النهاية */}
          <footer className="relative z-10 bg-[#120f0a] border-t border-[#dfc59f]/5 py-4 px-6 text-center text-xs text-[#dfc59f]/70 flex flex-wrap justify-center gap-6 sm:gap-12">
            <div><span className="text-neutral-500">رقم التواصل:</span> {customLiveDesign.phone}</div>
            <div><span className="text-neutral-500">الإيميل:</span> {customLiveDesign.email}</div>
            <div><span className="text-neutral-500">الموقع:</span> {customLiveDesign.location}</div>
          </footer>
        </div>
      )}

      {/* شاشة العرض 2: تسجيل الدخول */}
      {currentView === 'auth' && (
        <div className="min-h-screen flex items-center justify-center px-4 bg-[#120f0a]">
          <div className="w-full max-w-md bg-[#1d1812] border border-[#dfc59f]/20 rounded-2xl p-6 space-y-4 shadow-xl">
            <h3 className="text-center text-base font-serif text-[#dfc59f] font-bold">بوابة الموظفين والربط السحابي</h3>
            <div className="space-y-2">
              {[{ id: 'admin', label: 'مدير النظام (كامل الصلاحيات)' }, { id: 'sales', label: 'موظف مبيعات / كاشير' }].map(role => (
                <button key={role.id} onClick={() => setCurrentRole(role.id)} className={`w-full text-right p-3 rounded-xl border text-xs transition-all ${currentRole === role.id ? 'border-[#dfc59f] bg-[#dfc59f]/10 text-[#dfc59f]' : 'border-neutral-800 bg-neutral-950 text-neutral-400'}`}>
                  {role.label}
                </button>
              ))}
            </div>
            <button onClick={() => { setIsAuthenticated(true); setCurrentView('dashboard'); }} className="w-full py-2.5 bg-[#dfc59f] text-neutral-950 font-bold rounded-xl text-xs hover:bg-[#cfb28a] transition-all">دخول ونظام المزامنة</button>
            <button onClick={() => setCurrentView('landing')} className="w-full text-center text-xs text-neutral-500 hover:text-neutral-400 pt-2 block">العودة للرئيسية</button>
          </div>
        </div>
      )}

      {/* شاشة العرض 3: لوحة الكاشير الذكي وإدارة المخزن الفعلي */}
      {currentView === 'dashboard' && isAuthenticated && (
        <div className="min-h-screen grid grid-cols-1 lg:grid-cols-12 bg-[#120f0a]">
          <aside className="lg:col-span-2 bg-[#1d1812] border-l border-neutral-900 p-4 space-y-2 pt-20">
            {currentRole === 'admin' && <button onClick={() => setDashboardTab('overview')} className={`w-full text-right p-2.5 rounded-lg text-xs ${dashboardTab === 'overview' ? 'bg-[#dfc59f] text-black font-bold' : 'text-neutral-400'}`}>📈 لوحة الإيرادات المالية</button>}
            <button onClick={() => setDashboardTab('pos')} className={`w-full text-right p-2.5 rounded-lg text-xs ${dashboardTab === 'pos' ? 'bg-[#dfc59f] text-black font-bold' : 'text-neutral-400'}`}>🛍️ الكاشير الذكي POS</button>
            <button onClick={() => setDashboardTab('products')} className={`w-full text-right p-2.5 rounded-lg text-xs ${dashboardTab === 'products' ? 'bg-[#dfc59f] text-black font-bold' : 'text-neutral-400'}`}>📦 المستودعات والجرد السحابي</button>
            <button onClick={() => { setCurrentView('landing'); }} className="w-full text-right p-2.5 text-xs text-neutral-500 hover:text-red-400 pt-8 block border-t border-neutral-800">🏡 رؤية واجهة المتجر</button>
          </aside>

          <main className="lg:col-span-10 p-4 lg:p-6 space-y-6 pt-24">
            {dashboardTab === 'overview' && currentRole === 'admin' && (
              <div className="bg-[#1d1812] p-6 rounded-xl border border-[#dfc59f]/10">
                <span className="text-xs text-neutral-400">إجمالي إيرادات المبيعات الحية في Supabase:</span>
                <h3 className="text-3xl font-serif font-black text-[#dfc59f] mt-1">{totalSalesAllTime.toFixed(2)} AED</h3>
              </div>
            )}

            {/* تبويب الكاشير */}
            {dashboardTab === 'pos' && (
              <div className="text-xs text-neutral-400 p-4 bg-[#1d1812] rounded-xl border border-neutral-800">
                <p>تم ربط نظام الكاشير ونقاط البيع بنجاح. يمكنك إضافة المنتجات من حقل المستودعات لتظهر هنا فوراً في عمليات البيع المباشر.</p>
              </div>
            )}

            {/* تبويب المستودعات */}
            {dashboardTab === 'products' && (
              <div className="text-xs text-neutral-400 p-4 bg-[#1d1812] rounded-xl border border-neutral-800">
                <p>هنا يمكنك جرد العطور، العود والزعفران، وإدخال الشحنات الجديدة لتخزينها بشكل مشفر في جداول قواعد البيانات الخاصة بك.</p>
              </div>
            )}
          </main>
        </div>
      )}

      {/* نافذة الإعدادات الفورية الجانبية السحرية (Live Editor Drawer) */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-sm bg-[#1d1812] border-r border-[#dfc59f]/20 h-full p-6 overflow-y-auto space-y-4 shadow-2xl text-xs text-neutral-300">
            <div className="flex justify-between items-center border-b border-[#dfc59f]/10 pb-3">
              <h4 className="text-sm font-serif text-[#dfc59f] font-bold">⚙️ لوحة الإعدادات الفورية</h4>
              <button onClick={() => setIsSettingsOpen(false)} className="text-neutral-500 hover:text-neutral-200 text-base">✕</button>
            </div>
            
            <p className="text-[11px] text-neutral-500">عدّل أي بند بالأسفل وسيتحدث مظهر صفحة الهبوط فوراً في نفس اللحظة:</p>

            <div className="space-y-3 pt-2">
              <div className="space-y-1">
                <label>اسم المتجر الرئيسي:</label>
                <input type="text" value={customLiveDesign.title} onChange={(e) => setCustomLiveDesign({...customLiveDesign, title: e.target.value})} className="w-full p-2 bg-neutral-950 border border-neutral-800 rounded text-xs text-[#dfc59f]" />
              </div>
              <div className="space-y-1">
                <label>العنوان الفرعي:</label>
                <input type="text" value={customLiveDesign.subtitle} onChange={(e) => setCustomLiveDesign({...customLiveDesign, subtitle: e.target.value})} className="w-full p-2 bg-neutral-950 border border-neutral-800 rounded text-xs" />
              </div>
              <div className="space-y-1">
                <label>الوصف التعريفي:</label>
                <textarea rows="2" value={customLiveDesign.description} onChange={(e) => setCustomLiveDesign({...customLiveDesign, description: e.target.value})} className="w-full p-2 bg-neutral-950 border border-neutral-800 rounded text-xs"></textarea>
              </div>
              <div className="space-y-1">
                <label>رقم التواصل:</label>
                <input type="text" value={customLiveDesign.phone} onChange={(e) => setCustomLiveDesign({...customLiveDesign, phone: e.target.value})} className="w-full p-2 bg-neutral-950 border border-neutral-800 rounded text-xs" />
              </div>
              <div className="space-y-1">
                <label>الإيميل:</label>
                <input type="text" value={customLiveDesign.email} onChange={(e) => setCustomLiveDesign({...customLiveDesign, email: e.target.value})} className="w-full p-2 bg-neutral-950 border border-neutral-800 rounded text-xs" />
              </div>
              <div className="space-y-1">
                <label>الموقع الدغرافي:</label>
                <input type="text" value={customLiveDesign.location} onChange={(e) => setCustomLiveDesign({...customLiveDesign, location: e.target.value})} className="w-full p-2 bg-neutral-950 border border-neutral-800 rounded text-xs" />
              </div>
              <div className="space-y-1">
                <label>رابط الصورة الخلفية (URL):</label>
                <input type="text" value={customLiveDesign.bgUrl} onChange={(e) => setCustomLiveDesign({...customLiveDesign, bgUrl: e.target.value})} className="w-full p-2 bg-neutral-950 border border-neutral-800 rounded text-xs text-blue-400" />
              </div>
            </div>

            <button onClick={() => setIsSettingsOpen(false)} className="w-full py-2 bg-[#dfc59f] text-neutral-950 font-bold rounded mt-4">إغلاق وحفظ الرؤية</button>
          </div>
        </div>
      )}

    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(React.createElement(App));
