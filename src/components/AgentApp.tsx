import React, { useState, useEffect } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { 
  ShoppingBag, CheckCircle, User, LogOut, Plus, Search, 
  Clock, MapPin, Package, Users, ChevronRight, X, Minus, Trash2, Truck, CreditCard, Navigation, Volume2, TrendingUp, Banknote, Calendar
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ConfirmDialog } from './ConfirmDialog';

export const AgentApp: React.FC = () => {
  const { orders, updateOrder, users, products, categories, createOrder, refreshData, updateUserLocation, debts, updateDebt, updateUser, speak, addDebt } = useData();
  const { logout, user: authUser, register } = useAuth();
  const { t } = useLanguage();
  
  const user = users.find(u => u.id === authUser?.id) || authUser;
  const [activeTab, setActiveTab] = useState<'orders' | 'products' | 'clients' | 'reports' | 'profile'>('orders');
  const [showCreateOrder, setShowCreateOrder] = useState(false);
  const [selectedClient, setSelectedClient] = useState<any>(null);
  const [agentCart, setAgentCart] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [assigningCourier, setAssigningCourier] = useState<number | null>(null);
  const [userPhotoPreview, setUserPhotoPreview] = useState<string | null>(user?.photo || null);
  const [confirmDialog, setConfirmDialog] = useState<{ isOpen: boolean; onConfirm: () => void; title?: string; message?: string }>({ isOpen: false, onConfirm: () => {} });
  const [showHandoverModal, setShowHandoverModal] = useState(false);
  const [selectedOrderForHandover, setSelectedOrderForHandover] = useState<any>(null);
  const [handoverPayment, setHandoverPayment] = useState<'cash' | 'card' | 'debt'>('cash');
  const [dueDate, setDueDate] = useState('');

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result as string;
        setUserPhotoPreview(base64);
        handleConfirmAction(async () => {
          await updateUser(user.id, { photo: base64 });
        }, t('save'), t('areYouSure'));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleConfirmAction = (onConfirm: () => void, title?: string, message?: string) => {
    setConfirmDialog({ isOpen: true, onConfirm, title, message });
  };

  useEffect(() => {
    if (navigator.geolocation) {
      const watchId = navigator.geolocation.watchPosition(
        (pos) => {
          updateUserLocation(pos.coords.latitude, pos.coords.longitude);
        },
        (err) => console.error('Geolocation error:', err),
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
      );
      return () => navigator.geolocation.clearWatch(watchId);
    }
  }, []);

  const activeOrders = orders.filter(o => o.orderStatus === 'new' || o.orderStatus === 'confirmed');
  const historyOrders = orders.filter(o => o.orderStatus === 'delivered' || o.orderStatus === 'cancelled');
  const clients = users.filter(u => u.role === 'client');
  const couriers = users.filter(u => u.role === 'courier');

  const handleConfirm = async (orderId: number) => {
    await updateOrder(orderId, { orderStatus: 'confirmed', agentId: user?.id });
    speak(`Заказ номер ${orderId} подтвержден`);
  };

  const handleAssignCourier = async (orderId: number, courierId: number) => {
    const courier = couriers.find(c => c.id === courierId);
    await updateOrder(orderId, { 
      courierId, 
      courierName: courier?.name,
      orderStatus: 'on_way' 
    });
    speak(`Курьер ${courier?.name || ''} назначен на заказ ${orderId}. Статус изменен на в пути.`);
    setAssigningCourier(null);
  };

  const handleHandover = async () => {
    if (!selectedOrderForHandover) return;

    const updates: any = { orderStatus: 'delivered' };
    
    if (handoverPayment === 'debt') {
      if (!dueDate) return alert('Пожалуйста, выберите срок оплаты');
      await addDebt({
        clientId: selectedOrderForHandover.clientId,
        orderId: selectedOrderForHandover.id,
        amount: selectedOrderForHandover.totalPrice,
        dueDate: dueDate,
        status: 'pending'
      });
      updates.paymentType = 'debt';
      updates.paymentStatus = 'pending';
    } else {
      updates.paymentType = handoverPayment;
      updates.paymentStatus = 'paid';
    }

    await updateOrder(selectedOrderForHandover.id, updates);
    speak(`Заказ номер ${selectedOrderForHandover.id} успешно передан. Оплата: ${handoverPayment === 'debt' ? 'В долг' : handoverPayment === 'cash' ? 'Наличными' : 'Картой'}.`);
    setShowHandoverModal(false);
    setSelectedOrderForHandover(null);
  };

  const handleCreateOrder = async () => {
    if (!selectedClient || agentCart.length === 0) return;
    
    const totalPrice = agentCart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    
    await createOrder({
      clientId: selectedClient.id,
      clientName: selectedClient.name,
      clientPhone: selectedClient.phone,
      agentId: user?.id,
      agentName: user?.name,
      items: agentCart.map(item => ({
        id: item.id,
        productName: item.name,
        quantity: item.quantity,
        price: item.price
      })),
      totalPrice,
      orderStatus: 'confirmed',
      location: 'Store Pickup / Agent Order',
      paymentType: 'cash'
    });

    speak(`Новый заказ для клиента ${selectedClient.name} успешно создан на сумму ${totalPrice} сум`);
    setShowCreateOrder(false);
    setSelectedClient(null);
    setAgentCart([]);
    setActiveTab('orders');
  };

  const addToAgentCart = (product: any) => {
    const price = product.discountPrice || product.price;
    const existing = agentCart.find(item => item.id === product.id);
    if (existing) {
      setAgentCart(agentCart.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item));
    } else {
      setAgentCart([...agentCart, { ...product, quantity: 1, price }]);
    }
  };

  const removeFromAgentCart = (productId: number) => {
    const existing = agentCart.find(item => item.id === productId);
    if (existing?.quantity === 1) {
      setAgentCart(agentCart.filter(item => item.id !== productId));
    } else {
      setAgentCart(agentCart.map(item => item.id === productId ? { ...item, quantity: item.quantity - 1 } : item));
    }
  };

  return (
    <div className="min-h-screen bg-[#f2f4f7] pb-24 font-sans">
      <header className="bg-white p-4 shadow-sm flex justify-between items-center sticky top-0 z-30 border-b border-[#e2e5eb]">
        <h1 className="text-2xl font-black text-uzum-primary tracking-tighter">UZBECHKA</h1>
        <div className="flex items-center gap-3">
          <div className="flex flex-col items-end">
            <span className="text-[10px] font-black text-uzum-muted uppercase tracking-widest">Agent</span>
            <span className="text-xs font-bold text-uzum-text">{user?.name}</span>
          </div>
          <div className="w-10 h-10 rounded-full bg-uzum-bg overflow-hidden border-2 border-white shadow-sm">
            {user?.photo ? (
              <img src={user.photo} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-uzum-muted">
                <User size={20} />
              </div>
            )}
          </div>
          <button onClick={logout} className="p-2 text-red-500 hover:bg-red-50 rounded-xl transition-all">
            <LogOut size={20} />
          </button>
        </div>
      </header>

      <main className="p-4 max-w-2xl mx-auto">
        {/* Tabs */}
        <div className="flex gap-2 mb-6 bg-white p-1 rounded-2xl border border-[#e2e5eb] overflow-x-auto no-scrollbar">
          {[
            { id: 'orders', label: 'Заявки', icon: ShoppingBag },
            { id: 'products', label: 'Каталог', icon: Package },
            { id: 'clients', label: 'Клиенты и Долги', icon: Users },
            { id: 'reports', label: 'Отчет', icon: TrendingUp },
            { id: 'profile', label: t('profile'), icon: User }
          ].map(tab => (
            <button 
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex-1 py-3 px-4 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2 whitespace-nowrap ${activeTab === tab.id ? 'bg-uzum-primary text-white shadow-lg shadow-uzum-primary/20' : 'text-uzum-muted hover:bg-uzum-bg'}`}
            >
              <tab.icon size={16} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Orders Tab */}
        {activeTab === 'orders' && (
          <div className="space-y-4">
            <button 
              onClick={() => setShowCreateOrder(true)}
              className="w-full py-4 bg-uzum-primary text-white rounded-2xl font-bold shadow-lg shadow-uzum-primary/20 flex items-center justify-center gap-2 mb-4"
            >
              <Plus size={20} /> {t('createOrderForClient')}
            </button>

            {activeOrders.map(order => (
              <div key={order.id} className="bg-white p-6 rounded-[2rem] shadow-sm border border-[#e2e5eb] space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-black text-uzum-muted uppercase tracking-widest">Заказ #{order.id}</span>
                  <span className="text-sm font-bold text-uzum-text">{new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                
                <div>
                  <h3 className="text-xl font-bold text-uzum-text">{order.clientName}</h3>
                  <div className="flex items-center gap-2 text-uzum-muted text-sm mt-1">
                    <MapPin size={16} className="text-uzum-primary" /> 
                    <span className="font-medium">{order.location}</span>
                  </div>
                </div>

                <div className="bg-uzum-bg p-4 rounded-2xl space-y-2">
                  {order.items.map(item => (
                    <div key={item.id} className="flex justify-between text-sm font-medium">
                      <span className="text-uzum-muted">{item.quantity}x {item.productName}</span>
                      <span className="text-uzum-text">{(item.price * item.quantity).toLocaleString()} сум</span>
                    </div>
                  ))}
                  <div className="border-t border-white/50 pt-2 mt-2 flex justify-between font-bold text-lg">
                    <span className="text-uzum-primary">{t('total')}</span>
                    <span className="text-uzum-text">{order.totalPrice.toLocaleString()} сум</span>
                  </div>
                </div>

                {/* Status Toggles */}
                <div className="grid grid-cols-2 gap-3">
                  <button 
                    onClick={() => {
                      updateOrder(order.id, { paymentStatus: order.paymentStatus === 'paid' ? 'pending' : 'paid' });
                      speak(`Статус оплаты заказа ${order.id} изменен на ${order.paymentStatus === 'paid' ? 'ожидание' : 'оплачено'}`);
                    }}
                    className={`py-3 rounded-xl font-bold text-xs uppercase tracking-widest transition-all flex flex-col items-center gap-1 ${
                      order.paymentStatus === 'paid' ? 'bg-green-100 text-green-600 border border-green-200' : 'bg-yellow-50 text-yellow-600 border border-yellow-100'
                    }`}
                  >
                    <CreditCard size={18} />
                    {order.paymentStatus === 'paid' ? 'Оплачено' : 'Ожидает оплаты'}
                  </button>
                  <button 
                    onClick={() => {
                      updateOrder(order.id, { collectionStatus: order.collectionStatus === 'collected' ? 'pending' : 'collected' });
                      speak(`Статус сборки заказа ${order.id} изменен на ${order.collectionStatus === 'collected' ? 'в процессе' : 'собрано'}`);
                    }}
                    className={`py-3 rounded-xl font-bold text-xs uppercase tracking-widest transition-all flex flex-col items-center gap-1 ${
                      order.collectionStatus === 'collected' ? 'bg-blue-100 text-blue-600 border border-blue-200' : 'bg-stone-50 text-stone-600 border border-stone-100'
                    }`}
                  >
                    <Package size={18} />
                    {order.collectionStatus === 'collected' ? 'Собрано' : 'Сбор товара'}
                  </button>
                </div>

                <div className="flex gap-3">
                  {order.orderStatus === 'new' && (
                    <button 
                      onClick={() => handleConfirm(order.id)}
                      className="flex-1 py-4 bg-uzum-primary text-white rounded-2xl font-bold text-sm shadow-xl shadow-uzum-primary/20 flex items-center justify-center gap-2 active:scale-95 transition-all"
                    >
                      <CheckCircle size={20} /> {t('confirm')}
                    </button>
                  )}

                  {order.orderStatus === 'confirmed' && !order.courierId && (
                    <button 
                      onClick={() => setAssigningCourier(order.id)}
                      className="flex-1 py-4 bg-blue-500 text-white rounded-2xl font-bold text-sm shadow-xl shadow-blue-500/20 flex items-center justify-center gap-2 active:scale-95 transition-all"
                    >
                      <Truck size={20} /> {t('assignCourier')}
                    </button>
                  )}

                  {(order.orderStatus === 'confirmed' || order.orderStatus === 'on_way') && (
                    <button 
                      onClick={() => {
                        setSelectedOrderForHandover(order);
                        setShowHandoverModal(true);
                      }}
                      className="flex-1 py-4 bg-green-500 text-white rounded-2xl font-bold text-sm shadow-xl shadow-green-500/20 flex items-center justify-center gap-2 active:scale-95 transition-all"
                    >
                      <CheckCircle size={20} /> Передать товар
                    </button>
                  )}

                  {order.courierId && (
                    <div className="flex-1 flex items-center justify-center gap-2 text-blue-500 font-bold text-sm bg-blue-50 py-4 rounded-2xl border border-blue-100">
                      <Truck size={20} /> {order.courierName}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Products Tab */}
        {activeTab === 'products' && (
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-uzum-muted" size={20} />
              <input 
                type="text"
                placeholder={t('all')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full p-4 pl-12 rounded-2xl bg-white border border-[#e2e5eb] outline-none focus:ring-2 focus:ring-uzum-primary/20 transition-all"
              />
            </div>

            <div className="grid grid-cols-1 gap-4">
              {products.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase())).map(product => (
                <div key={product.id} className="bg-white p-4 rounded-2xl border border-[#e2e5eb] flex gap-4">
                  <img src={product.image} className="w-24 h-24 rounded-xl object-cover" />
                  <div className="flex-1 flex flex-col justify-between">
                    <div>
                      <h4 className="font-bold text-uzum-text">{product.name}</h4>
                      <p className="text-xs text-uzum-muted line-clamp-1">{product.description}</p>
                    </div>
                    <div className="flex justify-between items-center mt-2">
                      <span className="font-bold text-uzum-primary">{(product.discountPrice || product.price).toLocaleString()} сум</span>
                      <button 
                        onClick={() => addToAgentCart(product)}
                        className="p-2 bg-uzum-primary/10 text-uzum-primary rounded-lg hover:bg-uzum-primary hover:text-white transition-all"
                      >
                        <Plus size={18} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Clients Tab */}
        {activeTab === 'clients' && (
          <div className="space-y-4">
            <div className="relative mb-4">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-uzum-muted" size={20} />
              <input 
                type="text"
                placeholder="Поиск клиента..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full p-4 pl-12 rounded-2xl bg-white border border-[#e2e5eb] outline-none focus:ring-2 focus:ring-uzum-primary/20 transition-all"
              />
            </div>

            <div className="space-y-3">
              {clients.filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()) || c.phone.includes(searchQuery)).map(client => {
                const clientDebts = debts.filter(d => d.clientId === client.id && d.status === 'pending');
                const totalDebt = clientDebts.reduce((sum, d) => sum + d.amount, 0);
                
                return (
                  <div key={client.id} className="bg-white p-5 rounded-[2rem] border border-[#e2e5eb] shadow-sm space-y-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-bold text-lg text-uzum-text">{client.name}</h4>
                        <p className="text-xs text-uzum-muted font-medium">{client.phone}</p>
                      </div>
                      <button 
                        onClick={() => { setSelectedClient(client); setShowCreateOrder(true); }}
                        className="p-3 bg-uzum-primary text-white rounded-2xl shadow-lg shadow-uzum-primary/20 flex items-center gap-2 text-xs font-bold uppercase tracking-widest"
                      >
                        <Plus size={16} /> Создать заявку
                      </button>
                    </div>

                    {totalDebt > 0 && (
                      <div className="p-3 bg-red-50 rounded-xl border border-red-100 flex justify-between items-center">
                        <div className="flex items-center gap-2 text-red-600">
                          <CreditCard size={16} />
                          <span className="text-[10px] font-black uppercase tracking-widest">Долг</span>
                        </div>
                        <span className="font-black text-red-600">{totalDebt.toLocaleString()} UZS</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Reports Tab */}
        {activeTab === 'reports' && (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-[#e2e5eb] space-y-6">
              <h2 className="text-xl font-bold text-uzum-text">Полный отчет</h2>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-uzum-bg p-4 rounded-3xl border border-white">
                  <p className="text-[10px] font-black text-uzum-muted uppercase tracking-widest mb-1">Мои заказы</p>
                  <p className="text-2xl font-black text-uzum-primary">{orders.filter(o => o.agentId === user?.id).length}</p>
                </div>
                <div className="bg-uzum-bg p-4 rounded-3xl border border-white">
                  <p className="text-[10px] font-black text-uzum-muted uppercase tracking-widest mb-1">Выручка</p>
                  <p className="text-2xl font-black text-uzum-primary">
                    {orders.filter(o => o.agentId === user?.id && o.paymentStatus === 'paid')
                      .reduce((sum, o) => sum + o.totalPrice, 0).toLocaleString()}
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-sm font-bold text-uzum-text uppercase tracking-widest">Последние действия</h3>
                <div className="space-y-3">
                  {orders.filter(o => o.agentId === user?.id).slice(0, 5).map(order => (
                    <div key={order.id} className="flex justify-between items-center p-3 bg-stone-50 rounded-xl border border-stone-100">
                      <div>
                        <p className="text-xs font-bold text-stone-800">{order.clientName}</p>
                        <p className="text-[10px] text-stone-400">{new Date(order.createdAt).toLocaleDateString()}</p>
                      </div>
                      <span className={`text-[9px] font-black uppercase px-2 py-1 rounded-lg ${
                        order.orderStatus === 'delivered' ? 'bg-green-100 text-green-600' : 'bg-gold/10 text-gold-dark'
                      }`}>
                        {order.orderStatus}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Profile Tab */}
        {activeTab === 'profile' && (
          <div className="space-y-6">
            <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-[#e2e5eb] text-center space-y-4 relative group overflow-hidden">
              <div className="w-24 h-24 bg-uzum-bg rounded-[2rem] flex items-center justify-center mx-auto text-uzum-primary overflow-hidden border-4 border-white shadow-sm relative">
                {user?.photo ? (
                  <img src={user.photo} className="w-full h-full object-cover" />
                ) : (
                  <User size={48} />
                )}
                <label className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer">
                  <Plus size={24} className="text-white" />
                  <input type="file" accept="image/*" onChange={handlePhotoChange} className="hidden" />
                </label>
              </div>
              <div>
                <h3 className="text-2xl font-bold text-uzum-text">{user?.name}</h3>
                <p className="text-uzum-muted font-medium">{user?.phone}</p>
              </div>
              <div className="pt-4">
                <span className="px-4 py-2 bg-uzum-primary/10 text-uzum-primary rounded-full text-xs font-black uppercase tracking-widest">
                  {user?.role}
                </span>
              </div>
            </div>

            <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-[#e2e5eb] space-y-4">
              <h4 className="text-xs font-black text-uzum-muted uppercase tracking-widest px-2">{t('settings')}</h4>
              <button 
                onClick={logout}
                className="w-full p-4 bg-red-50 text-red-500 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-red-100 transition-all"
              >
                <LogOut size={20} /> {t('signOut')}
              </button>
            </div>
          </div>
        )}
      </main>

      <ConfirmDialog 
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
        onConfirm={confirmDialog.onConfirm}
        title={confirmDialog.title}
        message={confirmDialog.message}
      />

      {/* Modals */}
      <AnimatePresence>
        {/* Create Order Modal */}
        {showCreateOrder && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
            <motion.div 
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              className="bg-white w-full max-w-md rounded-t-[2.5rem] sm:rounded-[2.5rem] p-8 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-black text-uzum-text">{t('createOrderForClient')}</h2>
                <button onClick={() => setShowCreateOrder(false)} className="p-2 bg-uzum-bg rounded-full"><X size={20} /></button>
              </div>

              {!selectedClient ? (
                <div className="space-y-3">
                  <p className="text-xs font-bold text-uzum-muted uppercase tracking-widest mb-2">{t('selectClient')}</p>
                  {clients.map(client => (
                    <button 
                      key={client.id}
                      onClick={() => setSelectedClient(client)}
                      className="w-full p-4 rounded-2xl border border-[#e2e5eb] flex justify-between items-center hover:bg-uzum-bg transition-all"
                    >
                      <div className="text-left">
                        <h4 className="font-bold text-uzum-text">{client.name}</h4>
                        <p className="text-xs text-uzum-muted">{client.phone}</p>
                      </div>
                      <ChevronRight size={18} />
                    </button>
                  ))}
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="flex justify-between items-center p-4 bg-uzum-bg rounded-2xl">
                    <div>
                      <p className="text-[10px] font-black text-uzum-muted uppercase tracking-widest">{t('client')}</p>
                      <h4 className="font-bold text-uzum-text">{selectedClient.name}</h4>
                    </div>
                    <button onClick={() => setSelectedClient(null)} className="text-xs font-bold text-uzum-primary">{t('edit')}</button>
                  </div>

                  <div className="space-y-4">
                    <p className="text-xs font-bold text-uzum-muted uppercase tracking-widest">{t('cart')}</p>
                    {agentCart.length === 0 ? (
                      <p className="text-center py-8 text-uzum-muted text-sm font-medium">Savat bo'sh</p>
                    ) : (
                      <div className="space-y-3">
                        {agentCart.map(item => (
                          <div key={item.id} className="flex justify-between items-center">
                            <div className="flex-1">
                              <h5 className="text-sm font-bold text-uzum-text">{item.name}</h5>
                              <p className="text-xs text-uzum-muted">{item.price.toLocaleString()} сум</p>
                            </div>
                            <div className="flex items-center gap-3 bg-uzum-bg p-1 rounded-xl">
                              <button onClick={() => removeFromAgentCart(item.id)} className="p-1.5 bg-white rounded-lg text-uzum-primary"><Minus size={14} /></button>
                              <span className="text-sm font-bold w-4 text-center">{item.quantity}</span>
                              <button onClick={() => addToAgentCart(item)} className="p-1.5 bg-white rounded-lg text-uzum-primary"><Plus size={14} /></button>
                            </div>
                          </div>
                        ))}
                        <div className="pt-4 border-t border-[#e2e5eb] flex justify-between items-center">
                          <span className="text-sm font-bold text-uzum-muted">{t('total')}</span>
                          <span className="text-lg font-black text-uzum-primary">
                            {agentCart.reduce((sum, item) => sum + (item.price * item.quantity), 0).toLocaleString()} сум
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  <button 
                    onClick={handleCreateOrder}
                    disabled={agentCart.length === 0}
                    className="w-full bg-uzum-primary text-white font-bold py-5 rounded-2xl shadow-xl shadow-uzum-primary/20 uppercase tracking-widest text-sm disabled:opacity-50 disabled:shadow-none"
                  >
                    {t('confirmOrder')}
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        )}

        {/* Assign Courier Modal */}
        {assigningCourier !== null && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
            <motion.div 
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              className="bg-white w-full max-w-md rounded-t-[2.5rem] sm:rounded-[2.5rem] p-8"
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-black text-uzum-text">{t('selectCourier')}</h2>
                <button onClick={() => setAssigningCourier(null)} className="p-2 bg-uzum-bg rounded-full"><X size={20} /></button>
              </div>
              <div className="space-y-3">
                {couriers.map(courier => (
                  <button 
                    key={courier.id}
                    onClick={() => handleAssignCourier(assigningCourier, courier.id)}
                    className="w-full p-4 rounded-2xl border border-[#e2e5eb] flex justify-between items-center hover:bg-uzum-bg transition-all"
                  >
                    <div className="text-left">
                      <h4 className="font-bold text-uzum-text">{courier.name}</h4>
                      <p className="text-xs text-uzum-muted">{courier.phone}</p>
                    </div>
                    <Truck size={18} className="text-uzum-primary" />
                  </button>
                ))}
              </div>
            </motion.div>
          </div>
        )}

        {/* Handover Modal */}
        {showHandoverModal && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4 backdrop-blur-sm">
            <motion.div 
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              className="bg-white w-full max-w-md rounded-t-[2.5rem] sm:rounded-[2.5rem] p-8 shadow-2xl"
            >
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-xl font-black text-uzum-text">Передача товара</h2>
                  <p className="text-[10px] font-black text-uzum-muted uppercase tracking-widest">Заказ #{selectedOrderForHandover?.id}</p>
                </div>
                <button onClick={() => setShowHandoverModal(false)} className="p-2 bg-uzum-bg rounded-full text-uzum-muted"><X size={20} /></button>
              </div>

              <div className="space-y-6">
                <div className="space-y-3">
                  <label className="block text-[10px] font-black text-uzum-muted uppercase tracking-widest ml-1">Способ оплаты</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'cash', label: 'Наличные', icon: Banknote },
                      { id: 'card', label: 'Картой', icon: CreditCard },
                      { id: 'debt', label: 'В долг', icon: Clock }
                    ].map(method => (
                      <button 
                        key={method.id}
                        onClick={() => setHandoverPayment(method.id as any)}
                        className={`py-4 rounded-2xl border-2 flex flex-col items-center gap-2 transition-all ${
                          handoverPayment === method.id 
                            ? 'border-uzum-primary bg-uzum-primary/5 text-uzum-primary' 
                            : 'border-stone-100 text-stone-400 bg-stone-50'
                        }`}
                      >
                        <method.icon size={24} />
                        <span className="text-[10px] font-bold uppercase tracking-widest">{method.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {handoverPayment === 'debt' && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="space-y-3"
                  >
                    <label className="block text-[10px] font-black text-uzum-muted uppercase tracking-widest ml-1">Срок оплаты (Долг)</label>
                    <div className="relative">
                      <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-uzum-muted" size={20} />
                      <input 
                        type="date" 
                        value={dueDate}
                        onChange={(e) => setDueDate(e.target.value)}
                        className="w-full p-4 pl-12 rounded-2xl bg-stone-50 border-none outline-none focus:ring-2 focus:ring-uzum-primary/20 transition-all font-bold text-sm"
                      />
                    </div>
                  </motion.div>
                )}

                <div className="p-4 bg-stone-50 rounded-2xl border border-stone-100 flex justify-between items-center">
                  <span className="text-xs font-bold text-stone-500 uppercase tracking-widest">К оплате:</span>
                  <span className="text-xl font-black text-uzum-primary">{selectedOrderForHandover?.totalPrice.toLocaleString()} сум</span>
                </div>

                <button 
                  onClick={handleHandover}
                  className="w-full py-5 bg-uzum-primary text-white rounded-2xl font-bold text-sm shadow-xl shadow-uzum-primary/20 uppercase tracking-widest active:scale-95 transition-all"
                >
                  Завершить передачу
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
