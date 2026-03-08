import React, { useState, useEffect } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { 
  LayoutDashboard, Package, ShoppingBag, Users, LogOut, 
  TrendingUp, CheckCircle, Truck, Plus, Trash2, Edit, X, Search, Image as ImageIcon, Play, User, MapPin, Sparkles, Upload, Settings as SettingsIcon, Volume2, List, CreditCard, Navigation, Bot, Chrome
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';
import { YMaps, Map, Placemark, Polyline } from '@pbe/react-yandex-maps';
import { AdminAI } from './AdminAI';
import { ConfirmDialog } from './ConfirmDialog';
import { Map3D } from './Map3D';

import { apiFetch } from '../utils/api';

const YANDEX_MAPS_API_KEY = (import.meta.env.VITE_YANDEX_MAPS_API_KEY || '').trim();

export const AdminApp: React.FC = () => {
  const { products, categories, orders, stats, users, banners, settings, debts, addProduct, updateProduct, deleteProduct, addCategory, deleteCategory, updateOrder, deleteOrder, deleteUser, updateUser, addBanner, updateBanner, deleteBanner, updateSettings, updateDebt, speak } = useData();
  const { logout, user: currentUser } = useAuth();
  const { register } = useAuth();
  const { refreshData } = useData();
  const { t, language, setLanguage } = useLanguage();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'products' | 'orders' | 'users' | 'banners' | 'ai' | 'settings' | 'debts' | 'tracker' | 'finance' | 'logs' | 'salaries' | 'kpi' | 'security'>('dashboard');
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [showAI, setShowAI] = useState(false);
  const [showAddUser, setShowAddUser] = useState(false);
  const [showAddBanner, setShowAddBanner] = useState(false);
  const [showAIBannerModal, setShowAIBannerModal] = useState(false);
  const [aiBannerPrompt, setAiBannerPrompt] = useState('');
  const [isGeneratingBanner, setIsGeneratingBanner] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [selectedOrderForMap, setSelectedOrderForMap] = useState<any>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [userPhotoPreview, setUserPhotoPreview] = useState<string | null>(null);
  const [selectedUserForTrack, setSelectedUserForTrack] = useState<number | null>(null);
  const [userTrack, setUserTrack] = useState<[number, number][]>([]);
  const [financeReport, setFinanceReport] = useState<any>(null);
  const [salaries, setSalaries] = useState<any[]>([]);
  const [salaryReport, setSalaryReport] = useState<any[]>([]);
  const [kpis, setKpis] = useState<any[]>([]);
  const [securityAlerts, setSecurityAlerts] = useState<any[]>([]);
  const [aiDirectorInsights, setAiDirectorInsights] = useState<any[]>([]);
  const [commissions, setCommissions] = useState<any[]>([]);

  const [aiReports, setAiReports] = useState<any[]>([]);
  const [systemLogs, setSystemLogs] = useState<any[]>([]);

  const fetchAiData = async () => {
    try {
      const reportsRes = await apiFetch('/api/ai/reports');
      setAiReports(await reportsRes.json());
      
      const logsRes = await apiFetch('/api/system/logs');
      setSystemLogs(await logsRes.json());
    } catch (e) {
      console.error('Error fetching AI/Logs data:', e);
    }
  };

  const fetchFinanceData = async () => {
    try {
      const reportRes = await apiFetch('/api/finance/report');
      const reportData = await reportRes.json();
      setFinanceReport(reportData);

      const salariesRes = await apiFetch('/api/salaries');
      const salariesData = await salariesRes.json();
      setSalaries(salariesData);

      const salaryReportRes = await apiFetch('/api/admin/salaries/report');
      const salaryReportData = await salaryReportRes.json();
      setSalaryReport(salaryReportData);
      
      const commissionsRes = await apiFetch('/api/admin/commissions');
      const commissionsData = await commissionsRes.json();
      setCommissions(commissionsData);
    } catch (e) {
      console.error('Error fetching finance data:', e);
    }
  };

  const fetchKpiData = async () => {
    try {
      const res = await apiFetch('/api/admin/kpi');
      setKpis(await res.json());
    } catch (e) {
      console.error('Error fetching KPI data:', e);
    }
  };

  const fetchSecurityData = async () => {
    try {
      const res = await apiFetch('/api/admin/security');
      setSecurityAlerts(await res.json());
    } catch (e) {
      console.error('Error fetching security data:', e);
    }
  };

  const fetchAiDirectorInsights = async () => {
    try {
      const res = await apiFetch('/api/admin/ai/director', { method: 'POST' });
      setAiDirectorInsights(await res.json());
    } catch (e) {
      console.error('Error fetching AI Director insights:', e);
    }
  };

  useEffect(() => {
    if (activeTab === 'ai' || activeTab === 'logs') {
      fetchAiData();
    }
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === 'finance' || activeTab === 'salaries') {
      fetchFinanceData();
    }
    if (activeTab === 'kpi') {
      fetchKpiData();
    }
    if (activeTab === 'security') {
      fetchSecurityData();
    }
  }, [activeTab]);

  const fetchUserTrack = async (userId: number) => {
    try {
      const response = await apiFetch(`/api/users/${userId}/history`);
      const data = await response.json();
      // Yandex Maps expects [lat, lng]
      setUserTrack(data.map((h: any) => [h.lat, h.lng]));
      setSelectedUserForTrack(userId);
    } catch (e) {
      console.error('Error fetching track:', e);
    }
  };
  const [lastOrderCount, setLastOrderCount] = useState(orders.length);
  const [confirmDialog, setConfirmDialog] = useState<{ isOpen: boolean; onConfirm: () => void; title?: string; message?: string }>({ isOpen: false, onConfirm: () => {} });

  const handleConfirm = (onConfirm: () => void, title?: string, message?: string) => {
    setConfirmDialog({ isOpen: true, onConfirm, title, message });
  };

  const handleGenerateAIBanner = async () => {
    if (!aiBannerPrompt) return;
    setIsGeneratingBanner(true);
    try {
      const res = await apiFetch('/api/ai/generate-banner', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: aiBannerPrompt })
      });
      const data = await res.json();
      
      // Automatically add the generated banner
      await addBanner({
        title: data.title,
        imageUrl: data.imageUrl,
        link: data.link,
        isActive: 1
      });
      
      setShowAIBannerModal(false);
      setAiBannerPrompt('');
      speak("Рекламный баннер успешно создан с помощью ИИ");
    } catch (e) {
      console.error('Error generating AI banner:', e);
      alert('Failed to generate banner');
    } finally {
      setIsGeneratingBanner(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'product' | 'user' = 'product') => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (type === 'product') {
          setImagePreview(reader.result as string);
        } else {
          setUserPhotoPreview(reader.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const COLORS = ['#D4AF37', '#8B0000', '#F4D03F', '#9A7D0A'];

  const agents = users.filter(u => u.role === 'agent');
  const couriers = users.filter(u => u.role === 'courier');

  interface ProductSale {
    name: string;
    count: number;
    revenue: number;
  }

  // Calculate Top Products
  const productSales = orders.reduce((acc: { [key: string]: ProductSale }, order) => {
    order.items.forEach(item => {
      if (!acc[item.productId]) {
        acc[item.productId] = { name: item.productName, count: 0, revenue: 0 };
      }
      acc[item.productId].count += item.quantity;
      acc[item.productId].revenue += item.quantity * item.price;
    });
    return acc;
  }, {});

  const topProducts: ProductSale[] = (Object.values(productSales) as ProductSale[])
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);

  return (
    <div className="min-h-screen bg-[#f2f4f7] flex flex-col font-sans">
      {/* Top Header */}
      <header className="bg-white border-b border-[#e2e5eb] p-4 flex justify-between items-center sticky top-0 z-30">
        <div>
          <h1 className="text-2xl font-black text-uzum-primary tracking-tighter">UZBECHKA</h1>
          <p className="text-[10px] font-black text-uzum-muted uppercase tracking-widest leading-none mt-1">{t('adminPanel')}</p>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3 pr-4 border-r border-stone-100">
            <div className="flex flex-col items-end">
              <span className="text-[10px] font-black text-uzum-muted uppercase tracking-widest">Admin</span>
              <span className="text-xs font-bold text-stone-800">{currentUser?.name}</span>
            </div>
            <div className="w-10 h-10 rounded-full bg-stone-100 overflow-hidden border-2 border-white shadow-sm">
              {currentUser?.photo ? (
                <img src={currentUser.photo} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-stone-400">
                  <User size={20} />
                </div>
              )}
            </div>
          </div>
          
          <div className="flex gap-1 bg-uzum-bg p-1 rounded-xl">
            <button onClick={() => setLanguage('ru')} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${language === 'ru' ? 'bg-uzum-primary text-white shadow-md' : 'text-uzum-muted'}`}>RU</button>
            <button onClick={() => setLanguage('uz')} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${language === 'uz' ? 'bg-uzum-primary text-white shadow-md' : 'text-uzum-muted'}`}>UZ</button>
          </div>
          <button 
            onClick={logout}
            className="p-2 text-red-500 hover:bg-red-50 rounded-xl transition-all"
            title={t('signOut')}
          >
            <LogOut size={22} />
          </button>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 p-4 pb-24 overflow-y-auto">
        {activeTab === 'dashboard' && stats && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            {/* Miniature Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
              <div className="bg-white p-3 rounded-2xl shadow-sm border border-[#e2e5eb] flex items-center gap-3">
                <div className="p-2 bg-uzum-primary/10 rounded-xl text-uzum-primary"><TrendingUp size={18} /></div>
                <div>
                  <p className="text-uzum-muted text-[10px] font-bold uppercase leading-none mb-1">{t('revenue')}</p>
                  <h3 className="text-sm font-bold truncate">{stats.revenue.toLocaleString()}</h3>
                </div>
              </div>
              <div className="bg-white p-3 rounded-2xl shadow-sm border border-[#e2e5eb] flex items-center gap-3">
                <div className="p-2 bg-blue-50 rounded-xl text-blue-500"><ShoppingBag size={18} /></div>
                <div>
                  <p className="text-uzum-muted text-[10px] font-bold uppercase leading-none mb-1">{t('orders')}</p>
                  <h3 className="text-sm font-bold">{stats.orders}</h3>
                </div>
              </div>
              <div className="bg-white p-3 rounded-2xl shadow-sm border border-[#e2e5eb] flex items-center gap-3">
                <div className="p-2 bg-purple-50 rounded-xl text-purple-500"><Users size={18} /></div>
                <div>
                  <p className="text-uzum-muted text-[10px] font-bold uppercase leading-none mb-1">{t('users')}</p>
                  <h3 className="text-sm font-bold">{stats.users}</h3>
                </div>
              </div>
              <div className="bg-white p-3 rounded-2xl shadow-sm border border-[#e2e5eb] flex items-center gap-3">
                <div className="p-2 bg-orange-50 rounded-xl text-orange-500"><Package size={18} /></div>
                <div>
                  <p className="text-uzum-muted text-[10px] font-bold uppercase leading-none mb-1">{t('products')}</p>
                  <h3 className="text-sm font-bold">{products.length}</h3>
                </div>
              </div>
              <div className="bg-white p-3 rounded-2xl shadow-sm border border-[#e2e5eb] flex items-center gap-3">
                <div className="p-2 bg-red-50 rounded-xl text-red-500"><CreditCard size={18} /></div>
                <div>
                  <p className="text-uzum-muted text-[10px] font-bold uppercase leading-none mb-1">{t('debts')}</p>
                  <h3 className="text-sm font-bold">{debts.filter(d => d.status === 'pending').length}</h3>
                </div>
              </div>
              <div className="bg-white p-3 rounded-2xl shadow-sm border border-[#e2e5eb] flex items-center gap-3 cursor-pointer hover:border-uzum-primary transition-all" onClick={() => setActiveTab('ai')}>
                <div className="p-2 bg-gold/10 rounded-xl text-gold"><Sparkles size={18} /></div>
                <div>
                  <p className="text-uzum-muted text-[10px] font-bold uppercase leading-none mb-1">AI Insights</p>
                  <h3 className="text-sm font-bold text-gold">Check Now</h3>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Compact Chart */}
              <div className="bg-white p-4 rounded-2xl shadow-sm border border-stone-100 lg:col-span-1">
                <h4 className="text-xs font-bold text-stone-400 uppercase mb-4">Sales by Category</h4>
                <div className="h-40">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={stats.salesByCategory}
                        innerRadius={35}
                        outerRadius={50}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {stats.salesByCategory.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Compact Activity List */}
              <div className="bg-white p-4 rounded-2xl shadow-sm border border-stone-100 lg:col-span-2">
                <h4 className="text-xs font-bold text-stone-400 uppercase mb-4">Recent Activity</h4>
                <div className="space-y-3">
                  {orders.slice(0, 4).map(order => (
                    <div key={order.id} className="flex items-center gap-3 pb-2 border-b border-stone-50 last:border-0">
                      <div className="w-8 h-8 bg-stone-50 rounded-lg flex items-center justify-center text-stone-400">
                        <ShoppingBag size={14} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold truncate">#{order.id} - {order.clientName}</p>
                        <p className="text-[10px] text-stone-400">{new Date(order.createdAt).toLocaleTimeString()}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-bold text-gold-dark">{order.totalPrice.toLocaleString()} UZS</p>
                        <span className={`text-[8px] font-bold uppercase px-1 rounded ${
                          order.orderStatus === 'delivered' ? 'bg-green-100 text-green-600' : 'bg-gold/10 text-gold-dark'
                        }`}>
                          {order.orderStatus}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* AI Director Section */}
            <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-stone-100">
              <div className="flex justify-between items-center mb-6">
                <h4 className="text-xs font-black text-stone-400 uppercase tracking-widest">{t('aiDirector')}</h4>
                <button 
                  onClick={fetchAiDirectorInsights}
                  className="p-2 bg-gold/10 text-gold rounded-xl hover:bg-gold/20 transition-all"
                >
                  <Sparkles size={16} />
                </button>
              </div>
              <div className="space-y-4">
                {aiDirectorInsights.length > 0 ? aiDirectorInsights.map((insight, idx) => (
                  <div key={idx} className="p-4 bg-stone-50 rounded-2xl border border-stone-100">
                    <div className="flex justify-between items-start mb-2">
                      <h5 className="text-xs font-bold text-stone-800">{insight.title}</h5>
                      <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full ${
                        insight.risk_level === 'high' ? 'bg-red-100 text-red-600' : 
                        insight.risk_level === 'medium' ? 'bg-orange-100 text-orange-600' : 
                        'bg-green-100 text-green-600'
                      }`}>
                        {insight.risk_level}
                      </span>
                    </div>
                    <p className="text-[10px] text-stone-500 leading-relaxed">{insight.recommendation}</p>
                  </div>
                )) : (
                  <div className="text-center py-8">
                    <p className="text-[10px] text-stone-400 font-bold uppercase tracking-widest">Нажмите на искру для анализа</p>
                  </div>
                )}
              </div>
            </div>

            {/* Top Stats Section */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white p-4 rounded-2xl shadow-sm border border-stone-100">
                <h4 className="text-[10px] font-black text-stone-400 uppercase tracking-widest mb-3">{t('topAgent')}</h4>
                {users.filter(u => u.role === 'agent').slice(0, 1).map(u => (
                  <div key={u.id} className="flex items-center gap-3">
                    <img src={u.photo || 'https://picsum.photos/seed/agent/100'} className="w-10 h-10 rounded-full object-cover" />
                    <div>
                      <p className="text-xs font-bold">{u.name}</p>
                      <p className="text-[10px] text-stone-400">{u.phone}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="bg-white p-4 rounded-2xl shadow-sm border border-stone-100">
                <h4 className="text-[10px] font-black text-stone-400 uppercase tracking-widest mb-3">{t('topCourier')}</h4>
                {users.filter(u => u.role === 'courier').slice(0, 1).map(u => (
                  <div key={u.id} className="flex items-center gap-3">
                    <img src={u.photo || 'https://picsum.photos/seed/courier/100'} className="w-10 h-10 rounded-full object-cover" />
                    <div>
                      <p className="text-xs font-bold">{u.name}</p>
                      <p className="text-[10px] text-stone-400">{u.phone}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="bg-white p-4 rounded-2xl shadow-sm border border-stone-100">
                <h4 className="text-[10px] font-black text-stone-400 uppercase tracking-widest mb-3">{t('topClient')}</h4>
                {users.filter(u => u.role === 'client').slice(0, 1).map(u => (
                  <div key={u.id} className="flex items-center gap-3">
                    <img src={u.photo || 'https://picsum.photos/seed/client/100'} className="w-10 h-10 rounded-full object-cover" />
                    <div>
                      <p className="text-xs font-bold">{u.name}</p>
                      <p className="text-[10px] text-stone-400">{u.phone}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Top Products Report */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-stone-100">
                <div className="flex justify-between items-center mb-6">
                  <h4 className="text-xs font-black text-stone-400 uppercase tracking-widest">Топ товары по продажам</h4>
                  <div className="p-2 bg-gold/10 text-gold rounded-xl">
                    <TrendingUp size={16} />
                  </div>
                </div>
                <div className="space-y-4">
                  {topProducts.map((p, index) => {
                    const productData = products.find(prod => prod.name === p.name);
                    return (
                      <div key={index} className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-stone-50 border border-stone-100 overflow-hidden flex-shrink-0">
                          <img src={productData?.image || `https://picsum.photos/seed/${p.name}/100`} className="w-full h-full object-cover" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-bold text-stone-800">{p.name}</p>
                          <p className="text-[10px] text-stone-400 font-bold uppercase tracking-widest">{p.count} шт. продано</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-black text-gold-dark">{p.revenue.toLocaleString()} UZS</p>
                          <div className="w-24 h-1.5 bg-stone-100 rounded-full mt-1 overflow-hidden">
                            <motion.div 
                              initial={{ width: 0 }}
                              animate={{ width: `${(p.revenue / topProducts[0].revenue) * 100}%` }}
                              className="h-full bg-gold"
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {topProducts.length === 0 && (
                    <div className="text-center py-8 text-stone-400 italic text-sm">Нет данных о продажах</div>
                  )}
                </div>
              </div>

              <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-stone-100">
                <div className="flex justify-between items-center mb-6">
                  <h4 className="text-xs font-black text-stone-400 uppercase tracking-widest">Продажи по категориям</h4>
                  <div className="p-2 bg-blue-50 text-blue-500 rounded-xl">
                    <List size={16} />
                  </div>
                </div>
                <div className="h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stats.salesByCategory}>
                      <XAxis dataKey="name" fontSize={10} axisLine={false} tickLine={false} />
                      <YAxis fontSize={10} axisLine={false} tickLine={false} />
                      <Tooltip 
                        contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                        cursor={{ fill: '#f9fafb' }}
                      />
                      <Bar dataKey="value" fill="#D4AF37" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'products' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold tracking-tight">{t('products')}</h2>
              <div className="flex gap-2">
                <button 
                  onClick={() => setShowAddCategory(true)}
                  className="bg-white border border-stone-200 text-stone-600 px-4 py-2.5 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-2 shadow-sm hover:bg-stone-50 transition-all active:scale-95"
                >
                  <List size={18} /> {t('category')}
                </button>
                <button 
                  onClick={() => setShowAddProduct(true)}
                  className="gold-gradient text-white px-6 py-2.5 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-2 shadow-lg hover:shadow-gold/20 transition-all active:scale-95"
                >
                  <Plus size={18} /> {t('addProduct')}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {products.map(product => (
                <div key={product.id} className="bg-white rounded-[2rem] overflow-hidden shadow-sm border border-stone-100 relative group transition-all hover:shadow-xl hover:-translate-y-1">
                  {product.discountPrice && (
                    <div className="absolute top-4 left-4 bg-oriental-red text-white text-[9px] font-black px-3 py-1 rounded-full z-10 shadow-lg uppercase tracking-widest">
                      {t('discount')}
                    </div>
                  )}
                  
                  <div className="absolute top-4 right-4 flex gap-1 opacity-0 group-hover:opacity-100 transition-all z-10">
                    <button 
                      onClick={() => {
                        deleteProduct(product.id);
                        speak(`Товар ${product.name} удален`);
                      }}
                      className="p-2.5 bg-red-50 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all shadow-sm"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>

                  <div className="h-48 overflow-hidden">
                    <img src={product.image} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                  </div>

                  <div className="p-6">
                    <div className="flex justify-between items-start mb-1">
                      <h4 className="font-bold text-stone-800 text-lg tracking-tight truncate flex-1">{product.name}</h4>
                    </div>
                    <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest mb-4">{product.categoryName}</p>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex flex-col">
                        {product.discountPrice ? (
                          <>
                            <span className="text-stone-300 text-[10px] font-bold line-through uppercase">{product.price.toLocaleString()}</span>
                            <span className="text-oriental-red font-black text-lg">{product.discountPrice.toLocaleString()} <span className="text-[10px]">UZS</span></span>
                          </>
                        ) : (
                          <span className="text-gold-dark font-black text-lg">{product.price.toLocaleString()} <span className="text-[10px]">UZS</span></span>
                        )}
                        <div className="flex items-center gap-1 mt-1">
                          <span className="text-[9px] font-black text-stone-400 uppercase tracking-widest">Склад:</span>
                          <span className={`text-[10px] font-black ${product.stock && product.stock > 0 ? 'text-green-600' : 'text-red-500'}`}>
                            {product.stock || 0} шт
                          </span>
                        </div>
                      </div>
                      
                      <button 
                        onClick={() => {
                          setImagePreview(product.image);
                          setEditingProduct(product);
                        }}
                        className="p-2 bg-stone-50 text-stone-400 rounded-xl hover:bg-gold/10 hover:text-gold transition-all"
                      >
                        <Edit size={18} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {activeTab === 'orders' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">{t('orders')}</h2>
              <div className="flex gap-2">
                <span className="px-3 py-1 bg-white border border-stone-200 rounded-xl text-xs font-bold text-stone-500 flex items-center gap-2">
                  Total: {orders.length}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {orders.map(order => (
                <motion.div 
                  layout
                  key={order.id} 
                  className="bg-white rounded-[2.5rem] shadow-sm border border-stone-100 overflow-hidden hover:shadow-xl transition-all group"
                >
                  <div className="p-6 space-y-4">
                    <div className="flex justify-between items-start">
                      <div className="flex gap-3">
                        <div className="w-12 h-12 bg-stone-100 rounded-2xl overflow-hidden border-2 border-stone-50 flex-shrink-0">
                          {users.find(u => u.id === order.clientId)?.photo ? (
                            <img src={users.find(u => u.id === order.clientId)?.photo} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-stone-300">
                              <User size={20} />
                            </div>
                          )}
                        </div>
                        <div>
                          <span className="text-[10px] font-black text-stone-400 uppercase tracking-widest block mb-0.5">Заказ #{order.id}</span>
                          <h3 className="text-base font-bold text-stone-800 leading-tight">{order.clientName}</h3>
                          <p className="text-[10px] text-stone-400 font-medium flex items-center gap-1 mt-0.5">
                            <MapPin size={10} className="text-gold" /> {order.location}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <button 
                          onClick={() => handleConfirm(() => {
                            deleteOrder(order.id);
                            speak(`Заказ номер ${order.id} удален`);
                          }, t('confirmDeleteOrder'), t('areYouSure'))}
                          className="p-2 bg-red-50 text-red-500 rounded-xl opacity-0 group-hover:opacity-100 transition-all hover:bg-red-500 hover:text-white"
                        >
                          <Trash2 size={16} />
                        </button>
                        <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${
                          order.orderStatus === 'delivered' ? 'bg-green-100 text-green-600' :
                          order.orderStatus === 'cancelled' ? 'bg-red-100 text-red-600' :
                          'bg-gold/10 text-gold-dark'
                        }`}>
                          {order.orderStatus}
                        </span>
                      </div>
                    </div>

                    <div className="bg-stone-50 rounded-2xl p-4 space-y-2">
                      {order.items.map((item, idx) => (
                        <div key={idx} className="flex justify-between items-center text-xs">
                          <span className="text-stone-500 font-medium">{item.quantity}x {item.productName}</span>
                          <span className="font-bold text-stone-800">{(item.price * item.quantity).toLocaleString()} UZS</span>
                        </div>
                      ))}
                      <div className="pt-2 border-t border-stone-200 flex justify-between items-center font-black text-gold-dark">
                        <span className="text-[10px] uppercase tracking-widest">Итого</span>
                        <span>{order.totalPrice.toLocaleString()} UZS</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[9px] font-black text-stone-400 uppercase tracking-widest block">Статус оплаты</label>
                        <select 
                          className={`w-full text-[10px] font-bold uppercase px-3 py-2 rounded-xl outline-none border border-stone-100 cursor-pointer ${
                            order.paymentStatus === 'paid' ? 'bg-green-50 text-green-600' : 'bg-yellow-50 text-yellow-600'
                          }`}
                          value={order.paymentStatus}
                          onChange={(e) => {
                            updateOrder(order.id, { paymentStatus: e.target.value });
                            speak(`Статус оплаты заказа ${order.id} изменен на ${e.target.value === 'paid' ? 'оплачено' : 'ожидание'}`);
                          }}
                        >
                          <option value="pending">Pending</option>
                          <option value="paid">Paid</option>
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-black text-stone-400 uppercase tracking-widest block">Сборка</label>
                        <select 
                          className={`w-full text-[10px] font-bold uppercase px-3 py-2 rounded-xl outline-none border border-stone-100 cursor-pointer ${
                            order.collectionStatus === 'collected' ? 'bg-blue-50 text-blue-600' : 'bg-stone-50 text-stone-600'
                          }`}
                          value={order.collectionStatus}
                          onChange={(e) => {
                            updateOrder(order.id, { collectionStatus: e.target.value });
                            speak(`Статус сборки заказа ${order.id} изменен на ${e.target.value === 'collected' ? 'собрано' : 'в процессе'}`);
                          }}
                        >
                          <option value="pending">Pending</option>
                          <option value="collected">Collected</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[9px] font-black text-stone-400 uppercase tracking-widest block">Агент</label>
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-stone-100 overflow-hidden flex-shrink-0 border border-stone-200">
                            {order.agentId && users.find(u => u.id === order.agentId)?.photo ? (
                              <img src={users.find(u => u.id === order.agentId)?.photo} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-stone-300">
                                <User size={14} />
                              </div>
                            )}
                          </div>
                          <select 
                            className="flex-1 text-[10px] font-bold p-2 rounded-xl border border-stone-100 outline-none bg-stone-50"
                            value={order.agentId || ''}
                            onChange={(e) => {
                            updateOrder(order.id, { agentId: e.target.value });
                            const agent = agents.find(a => a.id === Number(e.target.value));
                            speak(`Агент ${agent?.name || ''} назначен на заказ ${order.id}`);
                          }}
                          >
                            <option value="">Assign Agent</option>
                            {agents.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                          </select>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-black text-stone-400 uppercase tracking-widest block">Курьер</label>
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-stone-100 overflow-hidden flex-shrink-0 border border-stone-200">
                            {order.courierId && users.find(u => u.id === order.courierId)?.photo ? (
                              <img src={users.find(u => u.id === order.courierId)?.photo} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-stone-300">
                                <Truck size={14} />
                              </div>
                            )}
                          </div>
                          <select 
                            className="flex-1 text-[10px] font-bold p-2 rounded-xl border border-stone-100 outline-none bg-stone-50"
                            value={order.courierId || ''}
                            onChange={(e) => {
                            updateOrder(order.id, { courierId: e.target.value });
                            const courier = couriers.find(c => c.id === Number(e.target.value));
                            speak(`Курьер ${courier?.name || ''} назначен на заказ ${order.id}`);
                          }}
                          >
                            <option value="">Assign Courier</option>
                            {couriers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                          </select>
                        </div>
                      </div>
                    </div>

                    {order.deliveryPhoto && (
                      <div className="space-y-1">
                        <label className="text-[9px] font-black text-stone-400 uppercase tracking-widest block">Фото доставки</label>
                        <div className="w-full h-32 rounded-2xl overflow-hidden border border-stone-100">
                          <img src={order.deliveryPhoto} className="w-full h-full object-cover" alt="Proof of delivery" />
                        </div>
                      </div>
                    )}

                    <div className="pt-2 flex justify-between items-center">
                      <span className="text-[10px] text-stone-400 font-medium">{new Date(order.createdAt).toLocaleString()}</span>
                      <div className="flex gap-2">
                        {order.latitude && order.longitude && (
                          <button 
                            onClick={() => setSelectedOrderForMap(order)}
                            className="p-2 bg-gold/10 text-gold rounded-xl hover:bg-gold hover:text-white transition-all"
                            title="View on Map"
                          >
                            <MapPin size={16} />
                          </button>
                        )}
                        <select 
                          className={`text-[10px] font-bold uppercase px-3 py-1 rounded-xl outline-none border border-stone-100 cursor-pointer ${
                            order.orderStatus === 'delivered' ? 'bg-green-50 text-green-600' :
                            order.orderStatus === 'cancelled' ? 'bg-red-50 text-red-600' :
                            'bg-gold/10 text-gold-dark'
                          }`}
                          value={order.orderStatus}
                          onChange={(e) => {
                            updateOrder(order.id, { orderStatus: e.target.value });
                            speak(`Статус заказа ${order.id} изменен на ${e.target.value}`);
                          }}
                        >
                          <option value="new">New</option>
                          <option value="confirmed">Confirmed</option>
                          <option value="on_way">On Way</option>
                          <option value="delivered">Delivered</option>
                          <option value="cancelled">Cancelled</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {activeTab === 'users' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">{t('users')}</h2>
              <button 
                onClick={() => setShowAddUser(true)}
                className="gold-gradient text-white px-4 py-2 rounded-xl font-bold flex items-center gap-2 shadow-md"
              >
                <Plus size={20} /> {t('addUser')}
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {users.map(u => (
                <div key={u.id} className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-stone-100 flex flex-col items-center text-center relative group hover:shadow-xl transition-all overflow-hidden">
                  <div className="absolute top-4 right-4 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-all z-10">
                    <button 
                      onClick={() => {
                        setUserPhotoPreview(u.photo || null);
                        setEditingUser(u);
                      }}
                      className="p-3 bg-white text-blue-500 rounded-2xl hover:bg-blue-500 hover:text-white transition-all shadow-lg border border-stone-100"
                    >
                      <Edit size={16} />
                    </button>
                    <button 
                      disabled={u.id === currentUser?.id}
                      onClick={() => handleConfirm(() => {
                        deleteUser(u.id);
                        speak(`Пользователь ${u.name} удален`);
                      }, t('confirmDeleteUser'), t('areYouSure'))}
                      className="p-3 bg-white text-red-500 rounded-2xl hover:bg-red-500 hover:text-white transition-all shadow-lg border border-stone-100 disabled:opacity-30"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                  
                  <div className="w-28 h-28 bg-stone-50 rounded-[2.5rem] flex items-center justify-center mb-5 text-stone-300 overflow-hidden border-4 border-white shadow-inner relative group/photo">
                    {u.photo ? (
                      <img src={u.photo} className="w-full h-full object-cover" />
                    ) : (
                      <User size={48} />
                    )}
                    <div className="absolute inset-0 bg-gold/20 opacity-0 group-hover/photo:opacity-100 transition-opacity" />
                  </div>
                  
                  <h3 className="font-black text-stone-800 text-lg truncate w-full px-2 mb-1">{u.name}</h3>
                  <div className="flex items-center justify-center gap-2 mb-5">
                    <p className="text-[10px] font-black text-stone-400 uppercase tracking-[0.2em]">{u.phone}</p>
                    {u.isGoogleUser === 1 && (
                      <div className="p-1 bg-white border border-stone-100 rounded-lg shadow-sm" title="Google User">
                        <Chrome size={10} className="text-uzum-primary" />
                      </div>
                    )}
                  </div>
                  
                  <div className="flex flex-wrap justify-center gap-2 w-full">
                    <span className={`flex-1 py-2 rounded-2xl text-[9px] font-black uppercase tracking-widest shadow-sm border ${
                      u.role === 'admin' ? 'bg-purple-50 text-purple-600 border-purple-100' :
                      u.role === 'agent' ? 'bg-blue-50 text-blue-600 border-blue-100' :
                      u.role === 'courier' ? 'bg-orange-50 text-orange-600 border-orange-100' :
                      'bg-stone-50 text-stone-500 border-stone-100'
                    }`}>
                      {u.role}
                    </span>
                    {u.carType && (
                      <span className="flex-1 py-2 bg-stone-50 text-stone-500 border border-stone-100 rounded-2xl text-[9px] font-black uppercase tracking-widest shadow-sm flex items-center justify-center gap-1">
                        <Truck size={12} /> {u.carType}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {activeTab === 'banners' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">{t('banners')}</h2>
              <button 
                onClick={() => setShowAddBanner(true)}
                className="gold-gradient text-white px-4 py-2 rounded-xl font-bold flex items-center gap-2 shadow-md"
              >
                <Plus size={20} /> {t('addBanner')}
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {banners.map(banner => (
                <div key={banner.id} className="bg-white rounded-3xl overflow-hidden shadow-sm border border-stone-100">
                  <div className="relative h-40">
                    <img src={banner.imageUrl} className="w-full h-full object-cover" />
                    {banner.videoUrl && (
                      <div className="absolute top-2 right-2 bg-black/50 p-2 rounded-full text-white">
                        <Play size={16} fill="white" />
                      </div>
                    )}
                  </div>
                  <div className="p-4 flex justify-between items-center">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-bold">{banner.title}</h4>
                        <button 
                          onClick={() => updateBanner(banner.id, { isActive: banner.isActive ? 0 : 1 })}
                          className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest transition-all ${
                            banner.isActive ? 'bg-green-100 text-green-600' : 'bg-stone-100 text-stone-400'
                          }`}
                        >
                          {banner.isActive ? 'Active' : 'Inactive'}
                        </button>
                      </div>
                      <p className="text-xs text-stone-400">{banner.link || 'No link'}</p>
                    </div>
                    <button onClick={() => {
                      deleteBanner(banner.id);
                      speak(`Баннер ${banner.title} удален`);
                    }} className="text-red-400 hover:text-red-600 ml-4">
                      <Trash2 size={20} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
        {activeTab === 'ai' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-black text-uzum-text uppercase tracking-tighter">AI Operations Center</h2>
              <button 
                onClick={async () => {
                  await apiFetch('/api/ai/sync', { method: 'POST' });
                  fetchAiData();
                  speak("AI агенты синхронизированы");
                }}
                className="px-6 py-3 bg-gold text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-gold/20 flex items-center gap-2"
              >
                <Sparkles size={18} /> Sync AI Agents
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-stone-100">
                  <h3 className="text-lg font-black text-uzum-text mb-4">AI Insights & Reports</h3>
                  <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
                    {aiReports.map(report => (
                      <div key={report.id} className="p-5 bg-stone-50 rounded-3xl border border-stone-100 hover:border-gold/30 transition-all">
                        <div className="flex justify-between items-center mb-3">
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase ${
                              report.agent === 'jarvis' ? 'bg-blue-100 text-blue-600' : 'bg-gold/10 text-gold'
                            }`}>
                              {report.agent}
                            </span>
                            <span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">{report.type}</span>
                          </div>
                          <span className="text-[10px] text-stone-400">{new Date(report.createdAt).toLocaleString()}</span>
                        </div>
                        <p className="text-sm text-uzum-text leading-relaxed font-medium">{report.content}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div className="bg-uzum-text p-8 rounded-[2.5rem] text-white shadow-xl relative overflow-hidden">
                  <div className="relative z-10">
                    <Bot size={48} className="text-gold mb-4" />
                    <h3 className="text-xl font-black mb-2">AI Assistant</h3>
                    <p className="text-stone-400 text-xs font-bold uppercase tracking-widest mb-6 leading-relaxed">
                      Управляйте бизнесом с помощью голоса и текстовых команд.
                    </p>
                    <button 
                      onClick={() => setShowAI(true)}
                      className="w-full py-4 bg-gold text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-lg shadow-gold/20 hover:scale-105 transition-all"
                    >
                      Открыть Чат
                    </button>
                  </div>
                  <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-gold/10 rounded-full blur-3xl" />
                </div>

                <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-stone-100">
                  <h3 className="text-sm font-black text-uzum-text uppercase tracking-widest mb-4">System Health</h3>
                  <div className="space-y-4">
                    {systemLogs.slice(0, 3).map(log => (
                      <div key={log.id} className="flex items-start gap-3">
                        <div className={`w-2 h-2 rounded-full mt-1.5 ${log.level === 'error' ? 'bg-red-500' : 'bg-green-500'}`} />
                        <div>
                          <p className="text-xs font-bold text-stone-600">{log.message}</p>
                          <p className="text-[9px] text-stone-400 uppercase font-black tracking-widest mt-1">{log.module} • {new Date(log.createdAt).toLocaleTimeString()}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'logs' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            <h2 className="text-2xl font-black text-uzum-text uppercase tracking-tighter">System Logs</h2>
            <div className="bg-white rounded-[2.5rem] shadow-sm border border-stone-100 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-stone-50 border-b border-stone-100">
                      <th className="p-4 text-[10px] font-black text-uzum-muted uppercase tracking-widest">Time</th>
                      <th className="p-4 text-[10px] font-black text-uzum-muted uppercase tracking-widest">Level</th>
                      <th className="p-4 text-[10px] font-black text-uzum-muted uppercase tracking-widest">Module</th>
                      <th className="p-4 text-[10px] font-black text-uzum-muted uppercase tracking-widest">Message</th>
                    </tr>
                  </thead>
                  <tbody>
                    {systemLogs.map(log => (
                      <tr key={log.id} className="border-b border-stone-50 hover:bg-stone-50 transition-all">
                        <td className="p-4 text-[10px] font-medium text-stone-400">{new Date(log.createdAt).toLocaleString()}</td>
                        <td className="p-4">
                          <span className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase ${
                            log.level === 'error' ? 'bg-red-100 text-red-600' : 
                            log.level === 'warn' ? 'bg-yellow-100 text-yellow-600' : 
                            'bg-blue-100 text-blue-600'
                          }`}>
                            {log.level}
                          </span>
                        </td>
                        <td className="p-4 text-xs font-bold text-stone-600">{log.module}</td>
                        <td className="p-4 text-xs text-uzum-text">{log.message}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'debts' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-black text-uzum-text uppercase tracking-tighter">{t('debts')}</h2>
              <button 
                onClick={() => handleConfirm(async () => {
                  const clientId = prompt("Enter Client ID:");
                  const amount = prompt("Enter Amount:");
                  if (clientId && amount) {
                    await apiFetch('/api/debts', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ clientId: Number(clientId), amount: Number(amount) })
                    });
                    refreshData();
                  }
                }, "Add Debt", "Manually add a debt for a client?")}
                className="px-6 py-3 bg-gold text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-gold/20 flex items-center gap-2"
              >
                <Plus size={18} /> {t('addDebt')}
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {debts.map(debt => (
                <div key={debt.id} className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-stone-100 relative overflow-hidden group">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-14 h-14 rounded-2xl bg-stone-50 overflow-hidden border border-stone-100 shadow-inner">
                      {debt.clientPhoto ? (
                        <img src={debt.clientPhoto} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-stone-300">
                          <User size={24} />
                        </div>
                      )}
                    </div>
                    <div>
                      <h3 className="font-black text-stone-800 text-lg leading-tight">{debt.clientName}</h3>
                      <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest">{debt.clientPhone}</p>
                    </div>
                  </div>

                  <div className="space-y-3 mb-6">
                    <div className="flex justify-between items-center p-3 bg-stone-50 rounded-2xl">
                      <span className="text-[10px] font-black text-stone-400 uppercase tracking-widest">Amount</span>
                      <span className="text-lg font-black text-red-600">{debt.amount.toLocaleString()} UZS</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-stone-50 rounded-2xl">
                      <span className="text-[10px] font-black text-stone-400 uppercase tracking-widest">Status</span>
                      <span className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase ${
                        debt.status === 'paid' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
                      }`}>
                        {debt.status}
                      </span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-stone-50 rounded-2xl">
                      <span className="text-[10px] font-black text-stone-400 uppercase tracking-widest">Created</span>
                      <span className="text-[10px] font-bold text-stone-500">{new Date(debt.createdAt).toLocaleString()}</span>
                    </div>
                  </div>

                  {debt.status === 'pending' && (
                    <button 
                      onClick={() => handleConfirm(async () => {
                        await apiFetch(`/api/debts/${debt.id}`, {
                          method: 'PATCH',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ status: 'paid' })
                        });
                        refreshData();
                        speak(`Долг клиента ${debt.clientName} погашен`);
                      }, "Confirm Payment", `Mark debt of ${debt.amount.toLocaleString()} UZS as paid?`)}
                      className="w-full py-4 bg-green-500 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-lg shadow-green-500/20 hover:scale-105 transition-all"
                    >
                      Mark as Paid
                    </button>
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {activeTab === 'banners' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-black text-uzum-text uppercase tracking-tighter">{t('banners')}</h2>
              <div className="flex gap-3">
                <button 
                  onClick={() => setShowAIBannerModal(true)}
                  className="px-6 py-3 bg-uzum-primary/10 text-uzum-primary rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-2 border border-uzum-primary/20"
                >
                  <Sparkles size={18} /> AI Banner
                </button>
                <button 
                  onClick={() => setShowAddBanner(true)}
                  className="px-6 py-3 bg-gold text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-gold/20 flex items-center gap-2"
                >
                  <Plus size={18} /> {t('addBanner')}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {banners.map(banner => (
                <div key={banner.id} className="bg-white rounded-[2.5rem] overflow-hidden shadow-sm border border-stone-100 group">
                  <div className="relative h-48">
                    <img src={banner.imageUrl} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    {banner.videoUrl && (
                      <div className="absolute top-4 right-4 bg-black/50 backdrop-blur-md p-2 rounded-xl text-white">
                        <Play size={16} fill="white" />
                      </div>
                    )}
                  </div>
                  <div className="p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h4 className="font-black text-stone-800 text-lg leading-tight">{banner.title}</h4>
                        <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest mt-1">{banner.link || 'No link'}</p>
                      </div>
                      <button 
                        onClick={() => updateBanner(banner.id, { isActive: banner.isActive ? 0 : 1 })}
                        className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${
                          banner.isActive ? 'bg-green-100 text-green-600' : 'bg-stone-100 text-stone-400'
                        }`}
                      >
                        {banner.isActive ? 'Active' : 'Inactive'}
                      </button>
                    </div>
                    <button 
                      onClick={() => handleConfirm(async () => {
                        await deleteBanner(banner.id);
                        speak(`Баннер ${banner.title} удален`);
                      }, "Delete Banner", `Are you sure you want to delete banner "${banner.title}"?`)}
                      className="w-full py-3 bg-red-50 text-red-500 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-red-100 transition-all flex items-center justify-center gap-2"
                    >
                      <Trash2 size={14} /> Delete Banner
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {activeTab === 'salaries' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-black text-uzum-text uppercase tracking-tighter">{t('salaries')}</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {salaryReport.map((s, i) => (
                <div key={i} className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-stone-100 flex flex-col items-center text-center relative overflow-hidden group">
                  <div className="absolute top-4 right-4">
                    <span className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase ${
                      s.role === 'agent' ? 'bg-blue-100 text-blue-600' : 'bg-orange-100 text-orange-600'
                    }`}>
                      {s.role}
                    </span>
                  </div>
                  
                  <div className="w-20 h-20 bg-stone-50 rounded-[2rem] flex items-center justify-center mb-4 text-stone-300 overflow-hidden border-4 border-white shadow-inner relative">
                    {users.find(u => u.id === s.userId)?.photo ? (
                      <img src={users.find(u => u.id === s.userId)?.photo} className="w-full h-full object-cover" />
                    ) : (
                      <User size={32} />
                    )}
                  </div>

                  <h3 className="font-black text-stone-800 text-lg mb-1">{s.userName}</h3>
                  <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest mb-6">ID: {s.userId}</p>

                  <div className="w-full space-y-3 mb-6">
                    <div className="flex justify-between items-center p-3 bg-stone-50 rounded-2xl">
                      <span className="text-[10px] font-black text-stone-400 uppercase tracking-widest">Sales/Deliv</span>
                      <span className="text-sm font-black text-stone-800">{s.totalSales.toLocaleString()} UZS</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-stone-50 rounded-2xl">
                      <span className="text-[10px] font-black text-stone-400 uppercase tracking-widest">Commission</span>
                      <span className="text-sm font-black text-gold">{s.percent}%</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-stone-50 rounded-2xl">
                      <span className="text-[10px] font-black text-stone-400 uppercase tracking-widest">Fixed</span>
                      <span className="text-sm font-black text-stone-800">{s.fixedSalary.toLocaleString()} UZS</span>
                    </div>
                  </div>

                  <div className="w-full p-4 bg-gold/10 rounded-2xl border border-gold/20">
                    <p className="text-[10px] font-black text-gold uppercase tracking-widest mb-1">Total Salary</p>
                    <p className="text-xl font-black text-gold">{s.salary.toLocaleString()} UZS</p>
                  </div>

                  <button 
                    onClick={() => {
                      const user = users.find(u => u.id === s.userId);
                      setEditingUser({ ...user, commissionPercent: s.percent, fixedSalary: s.fixedSalary });
                    }}
                    className="mt-4 w-full py-3 bg-stone-100 text-stone-600 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-stone-200 transition-all"
                  >
                    Edit Details
                  </button>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {activeTab === 'kpi' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            <h2 className="text-2xl font-black tracking-tight">{t('kpi')} Leaderboard</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {kpis.map((kpi, idx) => (
                <div key={idx} className="bg-white p-6 rounded-[2rem] shadow-sm border border-stone-100 flex items-center gap-4">
                  <div className="relative">
                    <img src={kpi.userPhoto || `https://picsum.photos/seed/${kpi.userId}/100`} className="w-16 h-16 rounded-2xl object-cover" />
                    <div className={`absolute -top-2 -right-2 w-8 h-8 rounded-full flex items-center justify-center text-white font-black text-xs shadow-lg ${
                      idx === 0 ? 'bg-gold' : idx === 1 ? 'bg-stone-300' : idx === 2 ? 'bg-orange-400' : 'bg-stone-100 text-stone-400'
                    }`}>
                      {idx + 1}
                    </div>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold">{kpi.userName}</h3>
                    <p className="text-xs text-stone-400 font-bold uppercase tracking-widest">{kpi.role}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <div className="flex-1 h-1.5 bg-stone-100 rounded-full overflow-hidden w-24">
                        <div className="h-full bg-gold" style={{ width: `${Math.min(kpi.score, 100)}%` }} />
                      </div>
                      <span className="text-xs font-black text-gold">{kpi.score.toFixed(1)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {activeTab === 'security' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            <h2 className="text-2xl font-black tracking-tight">{t('security')} Alerts</h2>
            <div className="bg-white rounded-[2rem] shadow-sm border border-stone-100 overflow-hidden">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-stone-50 border-b border-stone-100">
                    <th className="p-4 text-[10px] font-black text-stone-400 uppercase tracking-widest">Тип</th>
                    <th className="p-4 text-[10px] font-black text-stone-400 uppercase tracking-widest">Пользователь</th>
                    <th className="p-4 text-[10px] font-black text-stone-400 uppercase tracking-widest">Риск</th>
                    <th className="p-4 text-[10px] font-black text-stone-400 uppercase tracking-widest">Детали</th>
                    <th className="p-4 text-[10px] font-black text-stone-400 uppercase tracking-widest">Дата</th>
                  </tr>
                </thead>
                <tbody>
                  {securityAlerts.map((alert, idx) => (
                    <tr key={idx} className="border-b border-stone-50 last:border-0 hover:bg-stone-50/50 transition-all">
                      <td className="p-4">
                        <span className="text-xs font-bold text-stone-800">{alert.type}</span>
                      </td>
                      <td className="p-4">
                        <span className="text-xs text-stone-500">{alert.userName || 'Система'}</span>
                      </td>
                      <td className="p-4">
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                          alert.riskScore > 70 ? 'bg-red-100 text-red-600' : 'bg-orange-100 text-orange-600'
                        }`}>
                          {alert.riskScore}%
                        </span>
                      </td>
                      <td className="p-4">
                        <p className="text-[10px] text-stone-400 max-w-xs truncate">{alert.details}</p>
                      </td>
                      <td className="p-4">
                        <span className="text-[10px] text-stone-400">{new Date(alert.createdAt).toLocaleString()}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}

        {activeTab === 'settings' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            <h2 className="text-2xl font-bold">{t('settings')}</h2>
            <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-stone-100 max-w-2xl">
              <form onSubmit={async (e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                const updates: any = Object.fromEntries(formData.entries());
                // Handle checkbox
                updates.voice_enabled = formData.get('voice_enabled') === 'on' ? 'true' : 'false';
                handleConfirm(async () => {
                  await updateSettings(updates);
                  speak("Настройки успешно сохранены");
                  alert('Settings saved!');
                });
              }} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-[10px] font-black text-stone-400 uppercase tracking-widest mb-2">{t('appName')}</label>
                    <input name="app_name" defaultValue={settings.app_name} className="w-full p-4 rounded-2xl bg-stone-50 border border-stone-100 outline-none focus:border-gold transition-all font-medium" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-stone-400 uppercase tracking-widest mb-2">{t('contactPhone')}</label>
                    <input name="contact_phone" defaultValue={settings.contact_phone} className="w-full p-4 rounded-2xl bg-stone-50 border border-stone-100 outline-none focus:border-gold transition-all font-medium" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-stone-400 uppercase tracking-widest mb-2">Telegram Bot Token</label>
                    <input name="telegram_bot_token" defaultValue={settings.telegram_bot_token} className="w-full p-4 rounded-2xl bg-stone-50 border border-stone-100 outline-none focus:border-gold transition-all font-medium" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-stone-400 uppercase tracking-widest mb-2">Telegram Channel ID</label>
                    <input name="telegram_channel_id" defaultValue={settings.telegram_channel_id} className="w-full p-4 rounded-2xl bg-stone-50 border border-stone-100 outline-none focus:border-gold transition-all font-medium" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-stone-400 uppercase tracking-widest mb-2">{t('deliveryFee')}</label>
                    <input name="delivery_fee" type="number" defaultValue={settings.delivery_fee} className="w-full p-4 rounded-2xl bg-stone-50 border border-stone-100 outline-none focus:border-gold transition-all font-medium" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-stone-400 uppercase tracking-widest mb-2">{t('minOrderAmount')}</label>
                    <input name="min_order" type="number" defaultValue={settings.min_order} className="w-full p-4 rounded-2xl bg-stone-50 border border-stone-100 outline-none focus:border-gold transition-all font-medium" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-stone-400 uppercase tracking-widest mb-2">Click Card</label>
                    <input name="click_card" defaultValue={settings.click_card} className="w-full p-4 rounded-2xl bg-stone-50 border border-stone-100 outline-none focus:border-gold transition-all font-medium" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-stone-400 uppercase tracking-widest mb-2">Payme Card</label>
                    <input name="payme_card" defaultValue={settings.payme_card} className="w-full p-4 rounded-2xl bg-stone-50 border border-stone-100 outline-none focus:border-gold transition-all font-medium" />
                  </div>
                </div>
                  <div>
                    <label className="block text-[10px] font-black text-stone-400 uppercase tracking-widest mb-2">{t('address')}</label>
                    <input name="address" defaultValue={settings.address} className="w-full p-4 rounded-2xl bg-stone-50 border border-stone-100 outline-none focus:border-gold transition-all font-medium" />
                  </div>

                <div className="flex items-center gap-3 p-4 bg-stone-50 rounded-2xl border border-stone-100">
                  <div className="p-2 bg-gold/10 text-gold rounded-xl">
                    <Volume2 size={20} />
                  </div>
                  <div className="flex-1">
                    <h4 className="text-sm font-bold text-stone-800">{t('voiceNotifications')}</h4>
                    <p className="text-[10px] text-stone-400 uppercase font-black tracking-widest">Озвучка новых заказов</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      name="voice_enabled" 
                      defaultChecked={settings.voice_enabled === 'true'} 
                      className="sr-only peer" 
                    />
                    <div className="w-11 h-6 bg-stone-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gold"></div>
                  </label>
                </div>
                
                <div className="pt-4">
                  <button type="submit" className="w-full gold-gradient text-white font-black text-xs uppercase tracking-[0.2em] py-5 rounded-[1.5rem] shadow-xl hover:shadow-gold/30 transition-all active:scale-95">
                    {t('saveSettings')}
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        )}

        {activeTab === 'debts' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            <h2 className="text-2xl font-bold">{t('debts')}</h2>
            <div className="bg-white rounded-3xl shadow-sm border border-stone-100 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-stone-50 border-b">
                    <tr>
                      <th className="p-4 text-xs font-bold text-stone-400 uppercase">{t('client')}</th>
                      <th className="p-4 text-xs font-bold text-stone-400 uppercase">Ответственный</th>
                      <th className="p-4 text-xs font-bold text-stone-400 uppercase">{t('debtAmount')}</th>
                      <th className="p-4 text-xs font-bold text-stone-400 uppercase">{t('dueDate')}</th>
                      <th className="p-4 text-xs font-bold text-stone-400 uppercase">{t('status')}</th>
                      <th className="p-4 text-xs font-bold text-stone-400 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                      {debts.map(debt => (
                        <tr key={debt.id} className="hover:bg-stone-50 transition-colors">
                          <td className="p-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-stone-100 overflow-hidden border border-stone-200 flex-shrink-0">
                                {debt.clientPhoto ? (
                                  <img src={debt.clientPhoto} className="w-full h-full object-cover" />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-stone-400">
                                    <User size={16} />
                                  </div>
                                )}
                              </div>
                              <div>
                                <p className="text-sm font-bold">{debt.clientName}</p>
                                <p className="text-xs text-stone-400">{debt.clientPhone}</p>
                              </div>
                            </div>
                          </td>
                        <td className="p-4">
                          {debt.courierName ? (
                            <div className="flex items-center gap-2">
                              <span className="px-2 py-0.5 bg-orange-50 text-orange-600 text-[9px] font-black uppercase rounded-md border border-orange-100">Курьер</span>
                              <span className="text-xs font-bold text-stone-600">{debt.courierName}</span>
                            </div>
                          ) : debt.agentName ? (
                            <div className="flex items-center gap-2">
                              <span className="px-2 py-0.5 bg-blue-50 text-blue-600 text-[9px] font-black uppercase rounded-md border border-blue-100">Агент</span>
                              <span className="text-xs font-bold text-stone-600">{debt.agentName}</span>
                            </div>
                          ) : (
                            <span className="text-xs text-stone-400">-</span>
                          )}
                        </td>
                        <td className="p-4 font-bold text-red-500">{debt.amount.toLocaleString()} UZS</td>
                        <td className="p-4 text-xs font-medium">{debt.dueDate ? new Date(debt.dueDate).toLocaleDateString() : '-'}</td>
                        <td className="p-4">
                          <span className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase ${
                            debt.status === 'paid' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
                          }`}>
                            {debt.status}
                          </span>
                        </td>
                        <td className="p-4">
                          {debt.status === 'pending' && (
                            <button 
                              onClick={() => handleConfirm(() => updateDebt(debt.id, { status: 'paid' }), t('repay'), t('repayConfirm'))}
                              className="px-4 py-2 bg-green-500 text-white rounded-xl text-xs font-bold shadow-md hover:bg-green-600 transition-all"
                            >
                              {t('repay')}
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'tracker' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6 h-full flex flex-col">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">Real-time GPS Tracker</h2>
              <div className="flex gap-2">
                <span className="px-3 py-1 bg-white border border-stone-200 rounded-xl text-xs font-bold text-stone-500 flex items-center gap-2">
                  Live View: Bukhara
                </span>
              </div>
            </div>
            <Map3D height="600px" />
          </motion.div>
        )}

        {activeTab === 'finance' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            <h2 className="text-2xl font-bold">Финансовый отчет</h2>
            
            {financeReport && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-6 rounded-3xl shadow-sm border border-stone-100">
                  <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest mb-1">Общий доход</p>
                  <h3 className="text-2xl font-black text-green-600">{financeReport.totalIncome.toLocaleString()} UZS</h3>
                </div>
                <div className="bg-white p-6 rounded-3xl shadow-sm border border-stone-100">
                  <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest mb-1">Общие расходы</p>
                  <h3 className="text-2xl font-black text-red-600">{financeReport.totalExpenses.toLocaleString()} UZS</h3>
                </div>
                <div className="bg-white p-6 rounded-3xl shadow-sm border border-stone-100">
                  <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest mb-1">Чистая прибыль</p>
                  <h3 className="text-2xl font-black text-uzum-primary">{financeReport.profit.toLocaleString()} UZS</h3>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Salaries */}
              <div className="bg-white p-6 rounded-3xl shadow-sm border border-stone-100">
                <div className="flex justify-between items-center mb-6">
                  <h4 className="text-xs font-black text-stone-400 uppercase tracking-widest">Зарплаты сотрудников</h4>
                  <button onClick={() => {
                    const userId = prompt("User ID:");
                    const amount = prompt("Amount:");
                    const type = prompt("Type (fixed/commission):");
                    const period = prompt("Period (YYYY-MM):");
                    if (userId && amount && type && period) {
                      apiFetch('/api/salaries', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ userId, amount, type, period })
                      }).then(() => fetchFinanceData());
                    }
                  }} className="p-2 bg-gold/10 text-gold rounded-xl"><Plus size={16} /></button>
                </div>
                <div className="space-y-4">
                  {salaries.map(s => (
                    <div key={s.id} className="flex items-center justify-between p-3 bg-stone-50 rounded-2xl">
                      <div>
                        <p className="text-sm font-bold">{s.userName}</p>
                        <p className="text-[10px] text-stone-400 uppercase">{s.userRole} • {s.period}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-black text-gold-dark">{s.amount.toLocaleString()} UZS</p>
                        <span className="text-[8px] font-black uppercase bg-white px-2 py-0.5 rounded-full border border-stone-100">{s.status}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Expenses */}
              <div className="bg-white p-6 rounded-3xl shadow-sm border border-stone-100">
                <div className="flex justify-between items-center mb-6">
                  <h4 className="text-xs font-black text-stone-400 uppercase tracking-widest">Расходы</h4>
                  <button onClick={() => {
                    const title = prompt("Title:");
                    const amount = prompt("Amount:");
                    const category = prompt("Category:");
                    if (title && amount && category) {
                      apiFetch('/api/finance/expenses', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ title, amount, category })
                      }).then(() => fetchFinanceData());
                    }
                  }} className="p-2 bg-red-50 text-red-500 rounded-xl"><Plus size={16} /></button>
                </div>
                <div className="space-y-4">
                  {financeReport?.categoryExpenses.map((ce: any, i: number) => (
                    <div key={i} className="flex items-center justify-between p-3 bg-stone-50 rounded-2xl">
                      <p className="text-sm font-bold">{ce.category}</p>
                      <p className="text-sm font-black text-red-600">{ce.total.toLocaleString()} UZS</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#e2e5eb] px-2 py-3 flex justify-around items-center z-40 shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
        {[
          { id: 'dashboard', icon: LayoutDashboard, label: t('dashboard') },
          { id: 'products', icon: Package, label: t('products') },
          { id: 'orders', icon: ShoppingBag, label: t('orders') },
          { id: 'debts', icon: List, label: t('debts') },
          { id: 'banners', icon: ImageIcon, label: t('banners') },
          { id: 'ai', icon: Bot, label: 'AI' },
          { id: 'finance', icon: CreditCard, label: t('finance') },
          { id: 'salaries', icon: Users, label: t('salaries') },
          { id: 'kpi', icon: TrendingUp, label: t('kpi') },
          { id: 'security', icon: CheckCircle, label: t('security') },
          { id: 'users', icon: User, label: t('users') },
          { id: 'settings', icon: SettingsIcon, label: t('settings') },
        ].map(item => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id as any)}
            className={`flex flex-col items-center gap-1 transition-all relative ${
              activeTab === item.id ? 'text-uzum-primary' : 'text-uzum-muted'
            }`}
          >
            {activeTab === item.id && (
              <motion.div 
                layoutId="nav-active"
                className="absolute -top-1 w-1 h-1 bg-uzum-primary rounded-full"
              />
            )}
            <div className={`p-2 rounded-xl transition-all ${activeTab === item.id ? 'bg-uzum-primary/10' : ''}`}>
              <item.icon size={22} />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-tighter">{item.label}</span>
          </button>
        ))}
      </nav>

      {/* User Edit Modal */}
      <AnimatePresence>
        {editingUser && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
              className="bg-white rounded-[2.5rem] p-8 w-full max-w-lg shadow-2xl border border-stone-100 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex justify-between items-center mb-8">
                <div>
                  <h3 className="text-2xl font-bold tracking-tight text-stone-800">Редактировать пользователя</h3>
                  <p className="text-xs text-stone-400 font-bold uppercase tracking-widest mt-1">ID: {editingUser.id}</p>
                </div>
                <button onClick={() => { setEditingUser(null); setUserPhotoPreview(null); }} className="p-2 bg-stone-50 rounded-xl text-stone-400 hover:text-stone-800 transition-all"><X size={20} /></button>
              </div>
              <form onSubmit={async (e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                await updateUser(editingUser.id, {
                  name: formData.get('name') as string,
                  phone: formData.get('phone') as string,
                  password: formData.get('password') as string,
                  role: formData.get('role') as string,
                  carType: formData.get('carType') as string,
                  photo: userPhotoPreview || editingUser.photo,
                  commissionPercent: Number(formData.get('commissionPercent')),
                  fixedSalary: Number(formData.get('fixedSalary'))
                });
                speak(`Данные пользователя ${formData.get('name')} обновлены`);
                setEditingUser(null);
                setUserPhotoPreview(null);
                fetchFinanceData();
              }} className="space-y-5">
                <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-stone-200 rounded-[2rem] bg-stone-50 hover:bg-stone-100 transition-all cursor-pointer relative overflow-hidden group h-48">
                  {userPhotoPreview || editingUser.photo ? (
                    <img src={userPhotoPreview || editingUser.photo} className="absolute inset-0 w-full h-full object-cover" />
                  ) : (
                    <div className="flex flex-col items-center">
                      <User className="text-stone-300 mb-2" size={40} />
                      <p className="text-xs font-bold text-stone-400 uppercase tracking-widest">Загрузить фото</p>
                    </div>
                  )}
                  <input 
                    type="file" 
                    accept="image/*" 
                    onChange={(e) => handleFileChange(e, 'user')}
                    className="absolute inset-0 opacity-0 cursor-pointer" 
                  />
                </div>
                <div className="grid grid-cols-1 gap-5">
                  <div>
                    <label className="block text-[10px] font-black text-stone-400 uppercase tracking-widest mb-2">{t('name')}</label>
                    <input name="name" defaultValue={editingUser.name} required className="w-full p-4 rounded-2xl bg-stone-50 border border-stone-100 outline-none focus:border-gold transition-all font-medium" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-stone-400 uppercase tracking-widest mb-2">{t('phone')}</label>
                    <input name="phone" defaultValue={editingUser.phone} required className="w-full p-4 rounded-2xl bg-stone-50 border border-stone-100 outline-none focus:border-gold transition-all font-medium" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-stone-400 uppercase tracking-widest mb-2">{t('password')}</label>
                    <input name="password" type="password" defaultValue={editingUser.password} required className="w-full p-4 rounded-2xl bg-stone-50 border border-stone-100 outline-none focus:border-gold transition-all font-medium" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-stone-400 uppercase tracking-widest mb-2">{t('role')}</label>
                    <select name="role" defaultValue={editingUser.role} className="w-full p-4 rounded-2xl bg-stone-50 border border-stone-100 outline-none focus:border-gold transition-all font-medium appearance-none">
                      <option value="client">Client</option>
                      <option value="agent">Agent</option>
                      <option value="courier">Courier</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                  
                  {(editingUser.role === 'agent' || editingUser.role === 'courier') && (
                    <div className="grid grid-cols-2 gap-4 p-4 bg-gold/5 rounded-2xl border border-gold/10">
                      <div>
                        <label className="block text-[10px] font-black text-gold-dark uppercase tracking-widest mb-2">Комиссия %</label>
                        <input name="commissionPercent" type="number" defaultValue={editingUser.commissionPercent || 10} className="w-full p-3 rounded-xl bg-white border border-gold/20 outline-none focus:border-gold transition-all font-bold" />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-gold-dark uppercase tracking-widest mb-2">Фикс. Зарплата</label>
                        <input name="fixedSalary" type="number" defaultValue={editingUser.fixedSalary || 0} className="w-full p-3 rounded-xl bg-white border border-gold/20 outline-none focus:border-gold transition-all font-bold" />
                      </div>
                    </div>
                  )}

                  {editingUser.role === 'courier' && (
                    <div>
                      <label className="block text-[10px] font-black text-stone-400 uppercase tracking-widest mb-2">Тип транспорта</label>
                      <input name="carType" defaultValue={editingUser.carType} className="w-full p-4 rounded-2xl bg-stone-50 border border-stone-100 outline-none focus:border-gold transition-all font-medium" placeholder="Nexia 3, Spark..." />
                    </div>
                  )}
                </div>
                <div className="pt-4">
                  <button type="submit" className="w-full gold-gradient text-white font-black text-xs uppercase tracking-[0.2em] py-5 rounded-[1.5rem] shadow-xl hover:shadow-gold/30 transition-all active:scale-95">
                    {t('save')}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <ConfirmDialog 
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
        onConfirm={confirmDialog.onConfirm}
        title={confirmDialog.title}
        message={confirmDialog.message}
      />

      {/* Add Category Modal */}
      <AnimatePresence>
        {showAddCategory && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
              className="bg-white rounded-[2.5rem] p-8 w-full max-w-md shadow-2xl border border-stone-100"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold">{t('category')}</h3>
                <button onClick={() => setShowAddCategory(false)} className="text-stone-400"><X /></button>
              </div>
              
              <form onSubmit={async (e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                const name = formData.get('name') as string;
                await addCategory(name);
                speak(`Категория ${name} добавлена`);
                (e.target as HTMLFormElement).reset();
              }} className="flex gap-2 mb-6">
                <input name="name" required className="flex-1 p-3 rounded-xl border border-stone-200 outline-none focus:border-gold" placeholder="Название категории" />
                <button type="submit" className="p-3 bg-gold text-white rounded-xl shadow-md"><Plus size={20} /></button>
              </form>

              <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                {categories.map(cat => (
                  <div key={cat.id} className="flex justify-between items-center p-3 bg-stone-50 rounded-xl border border-stone-100">
                    <span className="font-bold text-stone-700">{cat.name}</span>
                    <button 
                      onClick={() => {
                        deleteCategory(cat.id);
                        speak(`Категория ${cat.name} удалена`);
                      }}
                      className="p-1.5 text-red-400 hover:text-red-600 transition-all"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add Product Modal */}
      <AnimatePresence>
        {showAddProduct && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
              className="bg-white rounded-[2.5rem] p-8 w-full max-w-lg shadow-2xl border border-stone-100 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex justify-between items-center mb-8">
                <div>
                  <h3 className="text-2xl font-bold tracking-tight text-stone-800">{t('addProduct')}</h3>
                  <p className="text-xs text-stone-400 font-bold uppercase tracking-widest mt-1">Новая позиция в меню</p>
                </div>
                <button onClick={() => { setShowAddProduct(false); setImagePreview(null); }} className="p-2 bg-stone-50 rounded-xl text-stone-400 hover:text-stone-800 transition-all"><X size={20} /></button>
              </div>
              <form onSubmit={async (e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                const name = formData.get('name') as string;
                await addProduct({
                  name,
                  price: Number(formData.get('price')),
                  discountPrice: formData.get('discountPrice') ? Number(formData.get('discountPrice')) : undefined,
                  categoryId: Number(formData.get('categoryId')),
                  description: formData.get('description') as string,
                  image: imagePreview || formData.get('imageUrl') as string || `https://picsum.photos/seed/${Math.random()}/400/300`,
                  videoUrl: formData.get('videoUrl') as string,
                  stock: Number(formData.get('stock'))
                });
                speak(`Товар ${name} успешно добавлен`);
                setShowAddProduct(false);
                setImagePreview(null);
              }} className="space-y-5">
                <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-stone-200 rounded-[2rem] bg-stone-50 hover:bg-stone-100 transition-all cursor-pointer relative overflow-hidden group h-48">
                  {imagePreview ? (
                    <img src={imagePreview} className="absolute inset-0 w-full h-full object-cover" />
                  ) : (
                    <div className="flex flex-col items-center">
                      <Upload className="text-stone-300 mb-2" size={40} />
                      <p className="text-xs font-bold text-stone-400 uppercase tracking-widest">Загрузить фото блюда</p>
                    </div>
                  )}
                  <input 
                    type="file" 
                    accept="image/*" 
                    onChange={handleFileChange}
                    className="absolute inset-0 opacity-0 cursor-pointer" 
                  />
                  {imagePreview && (
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <p className="text-white text-xs font-bold uppercase tracking-widest">Сменить фото</p>
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-1 gap-5">
                  <div>
                    <label className="block text-[10px] font-black text-stone-400 uppercase tracking-widest mb-2">Image URL (Optional)</label>
                    <input name="imageUrl" placeholder="https://..." className="w-full p-4 rounded-2xl bg-stone-50 border border-stone-100 outline-none focus:border-gold transition-all font-medium" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-stone-400 uppercase tracking-widest mb-2">{t('name')}</label>
                    <input name="name" required className="w-full p-4 rounded-2xl bg-stone-50 border border-stone-100 outline-none focus:border-gold transition-all font-medium" placeholder="Название блюда" />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-black text-stone-400 uppercase tracking-widest mb-2">{t('price')}</label>
                      <input name="price" type="number" required className="w-full p-4 rounded-2xl bg-stone-50 border border-stone-100 outline-none focus:border-gold transition-all font-medium" placeholder="0" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-stone-400 uppercase tracking-widest mb-2">{t('discount')}</label>
                      <input name="discountPrice" type="number" className="w-full p-4 rounded-2xl bg-stone-50 border border-stone-100 outline-none focus:border-gold transition-all font-medium" placeholder="0" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-stone-400 uppercase tracking-widest mb-2">Количество на складе</label>
                    <input name="stock" type="number" required className="w-full p-4 rounded-2xl bg-stone-50 border border-stone-100 outline-none focus:border-gold transition-all font-medium" placeholder="0" defaultValue={0} />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-stone-400 uppercase tracking-widest mb-2">{t('category')}</label>
                    {categories.length > 0 ? (
                      <select name="categoryId" required className="w-full p-4 rounded-2xl bg-stone-50 border border-stone-100 outline-none focus:border-gold transition-all font-medium appearance-none">
                        {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    ) : (
                      <div className="p-4 bg-red-50 text-red-500 rounded-2xl text-xs font-bold">
                        Сначала добавьте категории!
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-stone-400 uppercase tracking-widest mb-2">{t('video')} URL</label>
                    <input name="videoUrl" placeholder="https://youtube.com/..." className="w-full p-4 rounded-2xl bg-stone-50 border border-stone-100 outline-none focus:border-gold transition-all font-medium" />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-stone-400 uppercase tracking-widest mb-2">{t('description')}</label>
                    <textarea name="description" className="w-full p-4 rounded-2xl bg-stone-50 border border-stone-100 outline-none focus:border-gold transition-all font-medium h-24 resize-none" placeholder="Описание блюда..." />
                  </div>
                </div>

                <button type="submit" className="w-full gold-gradient text-white font-black text-xs uppercase tracking-[0.2em] py-5 rounded-[1.5rem] shadow-xl hover:shadow-gold/30 transition-all active:scale-95 mt-4">
                  {t('save')}
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Edit Product Modal */}
      <AnimatePresence>
        {editingProduct && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
              className="bg-white rounded-[2.5rem] p-8 w-full max-w-lg shadow-2xl border border-stone-100 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex justify-between items-center mb-8">
                <div>
                  <h3 className="text-2xl font-bold tracking-tight text-stone-800">{t('edit')}</h3>
                  <p className="text-xs text-stone-400 font-bold uppercase tracking-widest mt-1">{editingProduct.name}</p>
                </div>
                <button onClick={() => { setEditingProduct(null); setImagePreview(null); }} className="p-2 bg-stone-50 rounded-xl text-stone-400 hover:text-stone-800 transition-all"><X size={20} /></button>
              </div>
              <form onSubmit={async (e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                const name = formData.get('name') as string;
                await updateProduct(editingProduct.id, {
                  name,
                  price: Number(formData.get('price')),
                  discountPrice: formData.get('discountPrice') ? Number(formData.get('discountPrice')) : undefined,
                  categoryId: Number(formData.get('categoryId')),
                  description: formData.get('description') as string,
                  image: imagePreview || formData.get('imageUrl') as string || editingProduct.image,
                  videoUrl: formData.get('videoUrl') as string,
                  stock: Number(formData.get('stock'))
                });
                speak(`Товар ${name} успешно обновлен`);
                setEditingProduct(null);
                setImagePreview(null);
              }} className="space-y-5">
                <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-stone-200 rounded-[2rem] bg-stone-50 hover:bg-stone-100 transition-all cursor-pointer relative overflow-hidden group h-48">
                  {imagePreview ? (
                    <img src={imagePreview} className="absolute inset-0 w-full h-full object-cover" />
                  ) : (
                    <div className="flex flex-col items-center">
                      <Upload className="text-stone-300 mb-2" size={40} />
                      <p className="text-xs font-bold text-stone-400 uppercase tracking-widest">Загрузить фото блюда</p>
                    </div>
                  )}
                  <input 
                    type="file" 
                    accept="image/*" 
                    onChange={handleFileChange}
                    className="absolute inset-0 opacity-0 cursor-pointer" 
                  />
                  {imagePreview && (
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <p className="text-white text-xs font-bold uppercase tracking-widest">Сменить фото</p>
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-1 gap-5">
                  <div>
                    <label className="block text-[10px] font-black text-stone-400 uppercase tracking-widest mb-2">Image URL (Optional)</label>
                    <input name="imageUrl" defaultValue={editingProduct.image} placeholder="https://..." className="w-full p-4 rounded-2xl bg-stone-50 border border-stone-100 outline-none focus:border-gold transition-all font-medium" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-stone-400 uppercase tracking-widest mb-2">{t('name')}</label>
                    <input name="name" defaultValue={editingProduct.name} required className="w-full p-4 rounded-2xl bg-stone-50 border border-stone-100 outline-none focus:border-gold transition-all font-medium" placeholder="Название блюда" />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-black text-stone-400 uppercase tracking-widest mb-2">{t('price')}</label>
                      <input name="price" type="number" defaultValue={editingProduct.price} required className="w-full p-4 rounded-2xl bg-stone-50 border border-stone-100 outline-none focus:border-gold transition-all font-medium" placeholder="0" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-stone-400 uppercase tracking-widest mb-2">{t('discount')}</label>
                      <input name="discountPrice" type="number" defaultValue={editingProduct.discountPrice} className="w-full p-4 rounded-2xl bg-stone-50 border border-stone-100 outline-none focus:border-gold transition-all font-medium" placeholder="0" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-stone-400 uppercase tracking-widest mb-2">Количество на складе</label>
                    <input name="stock" type="number" required className="w-full p-4 rounded-2xl bg-stone-50 border border-stone-100 outline-none focus:border-gold transition-all font-medium" placeholder="0" defaultValue={editingProduct.stock || 0} />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-stone-400 uppercase tracking-widest mb-2">{t('category')}</label>
                    <select name="categoryId" defaultValue={editingProduct.categoryId} className="w-full p-4 rounded-2xl bg-stone-50 border border-stone-100 outline-none focus:border-gold transition-all font-medium appearance-none">
                      {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-stone-400 uppercase tracking-widest mb-2">{t('description')}</label>
                    <textarea name="description" defaultValue={editingProduct.description} className="w-full p-4 rounded-2xl bg-stone-50 border border-stone-100 outline-none focus:border-gold transition-all font-medium h-24 resize-none" placeholder="Описание блюда..."></textarea>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-stone-400 uppercase tracking-widest mb-2">Video URL (Optional)</label>
                    <input name="videoUrl" defaultValue={editingProduct.videoUrl} placeholder="https://youtube.com/..." className="w-full p-4 rounded-2xl bg-stone-50 border border-stone-100 outline-none focus:border-gold transition-all font-medium" />
                  </div>
                </div>
                <div className="pt-4">
                  <button type="submit" className="w-full gold-gradient text-white font-black text-xs uppercase tracking-[0.2em] py-5 rounded-[1.5rem] shadow-xl hover:shadow-gold/30 transition-all active:scale-95">
                    {t('save')}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add Banner Modal */}
      <AnimatePresence>
        {showAddBanner && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
              className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold">{t('addBanner')}</h3>
                <button onClick={() => { setShowAddBanner(false); setImagePreview(null); }} className="text-stone-400"><X /></button>
              </div>
              <form onSubmit={async (e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                const title = formData.get('title') as string;
                await addBanner({
                  title,
                  imageUrl: imagePreview || formData.get('imageUrl') as string || `https://picsum.photos/seed/${Math.random()}/800/400`,
                  videoUrl: formData.get('videoUrl') as string,
                  link: formData.get('link') as string,
                  isActive: formData.get('isActive') === 'on' ? 1 : 0
                });
                speak(`Баннер ${title} добавлен`);
                setShowAddBanner(false);
                setImagePreview(null);
              }} className="space-y-4">
                <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-stone-200 rounded-3xl bg-stone-50 hover:bg-stone-100 transition-all cursor-pointer relative overflow-hidden group h-32">
                  {imagePreview ? (
                    <img src={imagePreview} className="absolute inset-0 w-full h-full object-cover" />
                  ) : (
                    <div className="flex flex-col items-center">
                      <Upload className="text-stone-300 mb-2" size={32} />
                      <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">Загрузить баннер</p>
                    </div>
                  )}
                  <input 
                    type="file" 
                    accept="image/*" 
                    onChange={handleFileChange}
                    className="absolute inset-0 opacity-0 cursor-pointer" 
                  />
                  {imagePreview && (
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <p className="text-white text-[10px] font-bold uppercase tracking-widest">Сменить фото</p>
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-400 uppercase mb-1">Title</label>
                  <input name="title" required className="w-full p-3 rounded-xl border border-stone-200 outline-none focus:border-gold" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-400 uppercase mb-1">Image URL (Optional)</label>
                  <input name="imageUrl" placeholder="https://..." className="w-full p-3 rounded-xl border border-stone-200 outline-none focus:border-gold" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-400 uppercase mb-1">Video URL (Optional)</label>
                  <input name="videoUrl" placeholder="https://..." className="w-full p-3 rounded-xl border border-stone-200 outline-none focus:border-gold" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-400 uppercase mb-1">Link (Optional)</label>
                  <input name="link" placeholder="/promo/1" className="w-full p-3 rounded-xl border border-stone-200 outline-none focus:border-gold" />
                </div>
                <div className="flex items-center gap-2">
                  <input type="checkbox" name="isActive" id="isActive" defaultChecked className="w-4 h-4 accent-gold" />
                  <label htmlFor="isActive" className="text-xs font-bold text-stone-400 uppercase">Active by default</label>
                </div>
                <button type="submit" className="w-full gold-gradient text-white font-bold py-3 rounded-xl shadow-md">
                  {t('save')}
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Order Map Modal */}
      <AnimatePresence>
        {selectedOrderForMap && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
              className="bg-white rounded-[2.5rem] p-8 w-full max-w-2xl shadow-2xl border border-stone-100"
            >
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="text-2xl font-bold tracking-tight text-stone-800">Локация заказа #{selectedOrderForMap.id}</h3>
                  <p className="text-xs text-stone-400 font-bold uppercase tracking-widest mt-1">{selectedOrderForMap.clientName} • {selectedOrderForMap.location}</p>
                </div>
                <button onClick={() => setSelectedOrderForMap(null)} className="p-2 bg-stone-50 rounded-xl text-stone-400 hover:text-stone-800 transition-all"><X size={20} /></button>
              </div>
              
              <div className="rounded-3xl overflow-hidden border border-stone-100 h-[400px] relative shadow-inner flex items-center justify-center bg-stone-50">
                <YMaps query={{ apikey: YANDEX_MAPS_API_KEY }}>
                  <Map 
                    defaultState={{ center: [selectedOrderForMap.latitude, selectedOrderForMap.longitude], zoom: 15 }} 
                    className="h-full w-full"
                  >
                    <Placemark geometry={[selectedOrderForMap.latitude, selectedOrderForMap.longitude]} />
                  </Map>
                </YMaps>
              </div>

              <div className="mt-6 flex justify-end">
                <button 
                  onClick={() => setSelectedOrderForMap(null)}
                  className="px-8 py-3 bg-stone-100 text-stone-600 rounded-2xl font-bold text-xs uppercase tracking-widest hover:bg-stone-200 transition-all"
                >
                  Закрыть
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add/Edit User Modal */}
      <AnimatePresence>
        {(showAddUser || editingUser) && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
              className="bg-white rounded-[2.5rem] p-8 w-full max-w-md shadow-2xl border border-stone-100 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex justify-between items-center mb-8">
                <div>
                  <h3 className="text-2xl font-bold tracking-tight text-stone-800">{editingUser ? t('edit') : t('createAccount')}</h3>
                  <p className="text-xs text-stone-400 font-bold uppercase tracking-widest mt-1">Управление доступом</p>
                </div>
                <button onClick={() => { setShowAddUser(false); setEditingUser(null); setUserPhotoPreview(null); }} className="p-2 bg-stone-50 rounded-xl text-stone-400 hover:text-stone-800 transition-all"><X size={20} /></button>
              </div>

              <form onSubmit={async (e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                const data = {
                  name: formData.get('name') as string,
                  phone: formData.get('phone') as string,
                  password: (formData.get('password') as string) || '123456',
                  role: formData.get('role') as string,
                  carType: formData.get('carType') as string,
                  carPhoto: formData.get('carPhoto') as string,
                  photo: userPhotoPreview || undefined,
                  commissionPercent: Number(formData.get('commissionPercent')),
                  fixedSalary: Number(formData.get('fixedSalary'))
                };
                
                handleConfirm(async () => {
                  if (editingUser) {
                    await updateUser(editingUser.id, data);
                    if (activeTab === 'salaries' || activeTab === 'finance') {
                      fetchFinanceData();
                    }
                  } else {
                    await apiFetch('/api/auth/register', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify(data),
                    });
                    await refreshData();
                  }
                  setShowAddUser(false);
                  setEditingUser(null);
                  setUserPhotoPreview(null);
                }, editingUser ? t('save') : t('createAccount'), t('areYouSure'));
              }} className="space-y-6">
                
                <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-stone-200 rounded-[2rem] bg-stone-50 hover:bg-stone-100 transition-all cursor-pointer relative overflow-hidden group h-32">
                  {userPhotoPreview ? (
                    <img src={userPhotoPreview} className="absolute inset-0 w-full h-full object-cover" />
                  ) : (
                    <div className="flex flex-col items-center">
                      <Upload className="text-stone-300 mb-2" size={32} />
                      <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">Фото профиля</p>
                    </div>
                  )}
                  <input 
                    type="file" 
                    accept="image/*" 
                    onChange={(e) => handleFileChange(e, 'user')}
                    className="absolute inset-0 opacity-0 cursor-pointer" 
                  />
                  {userPhotoPreview && (
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <p className="text-white text-[10px] font-bold uppercase tracking-widest">Сменить фото</p>
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-black text-stone-400 uppercase tracking-widest mb-2">{t('name')}</label>
                    <input name="name" defaultValue={editingUser?.name} required className="w-full p-4 rounded-2xl bg-stone-50 border border-stone-100 outline-none focus:border-gold transition-all font-medium" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-stone-400 uppercase tracking-widest mb-2">{t('phone')}</label>
                    <input name="phone" defaultValue={editingUser?.phone} required className="w-full p-4 rounded-2xl bg-stone-50 border border-stone-100 outline-none focus:border-gold transition-all font-medium" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-stone-400 uppercase tracking-widest mb-2">{t('password')}</label>
                    <input name="password" type="password" className="w-full p-4 rounded-2xl bg-stone-50 border border-stone-100 outline-none focus:border-gold transition-all font-medium" placeholder={editingUser ? "Оставьте пустым для сохранения" : "Default: 123456"} />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-stone-400 uppercase tracking-widest mb-2">{t('role')}</label>
                    <select name="role" defaultValue={editingUser?.role || 'client'} className="w-full p-4 rounded-2xl bg-stone-50 border border-stone-100 outline-none focus:border-gold transition-all font-medium appearance-none">
                      <option value="client">{t('client')}</option>
                      <option value="agent">{t('agent')}</option>
                      <option value="courier">{t('courier')}</option>
                      <option value="admin">{t('admin')}</option>
                    </select>
                  </div>
                  
                  {/* Car Details for Courier */}
                  <div className="space-y-4 pt-4 border-t border-stone-100">
                    <h4 className="text-[10px] font-black text-stone-400 uppercase tracking-widest">Транспорт (для курьеров)</h4>
                    <select name="carType" defaultValue={editingUser?.carType || ''} className="w-full p-4 rounded-2xl bg-stone-50 border border-stone-100 outline-none focus:border-gold transition-all font-medium appearance-none">
                      <option value="">Нет транспорта</option>
                      <option value="Damas Van">Damas Van</option>
                      <option value="Damas Labo">Damas Labo</option>
                      <option value="Other">Другое</option>
                    </select>
                    <input name="carPhoto" defaultValue={editingUser?.carPhoto || ''} placeholder="URL фото машины" className="w-full p-4 rounded-2xl bg-stone-50 border border-stone-100 outline-none focus:border-gold transition-all font-medium" />
                  </div>

                  {/* Salary Details for Agents/Couriers */}
                  {(editingUser?.role === 'agent' || editingUser?.role === 'courier') && (
                    <div className="space-y-4 pt-4 border-t border-stone-100">
                      <h4 className="text-[10px] font-black text-stone-400 uppercase tracking-widest">Зарплата и Комиссия</h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[10px] font-black text-stone-400 uppercase tracking-widest mb-2">Комиссия (%)</label>
                          <input 
                            name="commissionPercent" 
                            type="number" 
                            defaultValue={commissions.find(c => c.agentId === editingUser?.id)?.percent || 10} 
                            className="w-full p-4 rounded-2xl bg-stone-50 border border-stone-100 outline-none focus:border-gold transition-all font-medium" 
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-black text-stone-400 uppercase tracking-widest mb-2">Оклад (UZS)</label>
                          <input 
                            name="fixedSalary" 
                            type="number" 
                            defaultValue={commissions.find(c => c.agentId === editingUser?.id)?.fixedSalary || 0} 
                            className="w-full p-4 rounded-2xl bg-stone-50 border border-stone-100 outline-none focus:border-gold transition-all font-medium" 
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <button type="submit" className="w-full gold-gradient text-white font-black text-xs uppercase tracking-[0.2em] py-5 rounded-[1.5rem] shadow-xl hover:shadow-gold/30 transition-all active:scale-95">
                  {editingUser ? t('save') : t('createAccount')}
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      
      <AnimatePresence>
        {/* AI Banner Generation Modal */}
        {showAIBannerModal && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
              className="bg-white rounded-[2.5rem] p-8 w-full max-w-md shadow-2xl border border-stone-100"
            >
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-uzum-primary/10 rounded-xl flex items-center justify-center text-uzum-primary">
                    <Sparkles size={24} />
                  </div>
                  <h3 className="text-xl font-black text-uzum-text uppercase tracking-tighter">AI Banner Generator</h3>
                </div>
                <button onClick={() => setShowAIBannerModal(false)} className="p-2 bg-stone-50 rounded-xl text-stone-400 hover:text-stone-800 transition-all"><X size={20} /></button>
              </div>
              
              <p className="text-xs text-stone-500 font-medium mb-6 leading-relaxed">
                Describe what kind of advertising banner you want. Our AI will generate the title, description, and find a matching high-quality image.
              </p>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-black text-stone-400 uppercase tracking-widest mb-2 ml-1">Banner Theme / Prompt</label>
                  <textarea
                    value={aiBannerPrompt}
                    onChange={(e) => setAiBannerPrompt(e.target.value)}
                    className="w-full p-4 rounded-2xl bg-stone-50 border border-stone-100 outline-none focus:border-uzum-primary transition-all font-medium text-sm h-32 resize-none"
                    placeholder="e.g., Fresh hot samosas for breakfast, 20% discount on all cakes today..."
                  />
                </div>
                
                <button
                  onClick={handleGenerateAIBanner}
                  disabled={isGeneratingBanner || !aiBannerPrompt}
                  className="w-full bg-uzum-primary text-white font-black text-xs uppercase tracking-[0.2em] py-5 rounded-[1.5rem] shadow-xl shadow-uzum-primary/20 hover:shadow-uzum-primary/30 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
                >
                  {isGeneratingBanner ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles size={18} /> Generate & Add Banner
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* AI Assistant Modal */}
      <AnimatePresence>
        {showAI && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
              className="bg-white rounded-[2.5rem] w-full max-w-4xl h-[80vh] shadow-2xl border border-stone-100 overflow-hidden flex flex-col"
            >
              <div className="p-6 border-b border-stone-100 flex justify-between items-center bg-stone-50/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gold/10 rounded-xl flex items-center justify-center text-gold">
                    <Bot size={24} />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-uzum-text">AI Assistant</h3>
                    <p className="text-[10px] font-black text-uzum-muted uppercase tracking-widest">Interactive Chat</p>
                  </div>
                </div>
                <button onClick={() => setShowAI(false)} className="p-2 bg-white rounded-xl text-stone-400 hover:text-stone-800 shadow-sm transition-all">
                  <X size={20} />
                </button>
              </div>
              <div className="flex-1 overflow-hidden">
                <AdminAI 
                  stats={stats} 
                  orders={orders} 
                  products={products} 
                  users={users} 
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
