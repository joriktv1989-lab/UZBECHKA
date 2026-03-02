import React, { useState, useEffect } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { Truck, CheckCircle, LogOut, MapPin, Phone, Clock, Navigation, Package, ChevronDown, ChevronUp, Store, Users, Plus, Volume2, CreditCard, Banknote, Calendar, X, User } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { APIProvider, Map, Marker } from '@vis.gl/react-google-maps';
import { ConfirmDialog } from './ConfirmDialog';

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';
const STORE_LOCATION = { lat: 41.311081, lng: 69.240562 };

export const CourierApp: React.FC = () => {
  const { orders, updateOrder, users, updateUserLocation, updateUser, speak, addDebt, products } = useData();
  const { logout, user: authUser } = useAuth();
  const { t } = useLanguage();
  
  const user = users.find(u => u.id === authUser?.id) || authUser;
  const [activeTab, setActiveTab] = useState<'deliveries' | 'history' | 'profile' | 'warehouse'>('deliveries');
  const [expandedOrder, setExpandedOrder] = useState<number | null>(null);
  const [userPhotoPreview, setUserPhotoPreview] = useState<string | null>(user?.photo || null);
  const [confirmDialog, setConfirmDialog] = useState<{ isOpen: boolean; onConfirm: () => void; title?: string; message?: string }>({ isOpen: false, onConfirm: () => {} });
  const [showHandoverModal, setShowHandoverModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
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

  const myDeliveries = orders.filter(o => o.courierId === user?.id && (o.orderStatus === 'confirmed' || o.orderStatus === 'on_way'));
  const historyDeliveries = orders.filter(o => o.courierId === user?.id && o.orderStatus === 'delivered');

  const updateStatus = async (orderId: number, status: string) => {
    if (status === 'delivered') {
      const order = orders.find(o => o.id === orderId);
      setSelectedOrder(order);
      setShowHandoverModal(true);
      return;
    }
    await updateOrder(orderId, { orderStatus: status });
    if (status === 'on_way') {
      speak(`Вы начали доставку заказа номер ${orderId}. Пожалуйста, будьте осторожны на дороге.`);
    }
  };

  const handleHandover = async () => {
    if (!selectedOrder) return;

    const updates: any = { orderStatus: 'delivered' };
    
    if (handoverPayment === 'debt') {
      if (!dueDate) return alert('Пожалуйста, выберите срок оплаты');
      await addDebt({
        clientId: selectedOrder.clientId,
        orderId: selectedOrder.id,
        amount: selectedOrder.totalPrice,
        dueDate: dueDate,
        status: 'pending'
      });
      updates.paymentType = 'debt';
      updates.paymentStatus = 'pending';
    } else {
      updates.paymentType = handoverPayment;
      updates.paymentStatus = 'paid';
    }

    await updateOrder(selectedOrder.id, updates);
    speak(`Заказ номер ${selectedOrder.id} успешно доставлен. Оплата: ${handoverPayment === 'debt' ? 'В долг' : handoverPayment === 'cash' ? 'Наличными' : 'Картой'}.`);
    setShowHandoverModal(false);
    setSelectedOrder(null);
  };

  return (
    <div className="min-h-screen bg-[#f2f4f7] pb-20 font-sans">
      <header className="bg-white p-4 shadow-sm flex justify-between items-center sticky top-0 z-30 border-b border-[#e2e5eb]">
        <h1 className="text-2xl font-black text-uzum-primary tracking-tighter">UZBECHKA</h1>
        <div className="flex items-center gap-3">
          <div className="flex flex-col items-end">
            <span className="text-[10px] font-black text-uzum-muted uppercase tracking-widest">Courier</span>
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
        <div className="flex gap-2 mb-6 bg-white p-1 rounded-2xl border border-[#e2e5eb] overflow-x-auto no-scrollbar">
          <button 
            onClick={() => setActiveTab('deliveries')}
            className={`flex-1 min-w-[100px] py-3 rounded-xl font-bold text-sm transition-all ${activeTab === 'deliveries' ? 'bg-uzum-primary text-white shadow-lg shadow-uzum-primary/20' : 'text-uzum-muted hover:bg-uzum-bg'}`}
          >
            {t('deliveries')}
          </button>
          <button 
            onClick={() => setActiveTab('warehouse')}
            className={`flex-1 min-w-[100px] py-3 rounded-xl font-bold text-sm transition-all ${activeTab === 'warehouse' ? 'bg-uzum-primary text-white shadow-lg shadow-uzum-primary/20' : 'text-uzum-muted hover:bg-uzum-bg'}`}
          >
            {t('warehouse')}
          </button>
          <button 
            onClick={() => setActiveTab('history')}
            className={`flex-1 min-w-[100px] py-3 rounded-xl font-bold text-sm transition-all ${activeTab === 'history' ? 'bg-uzum-primary text-white shadow-lg shadow-uzum-primary/20' : 'text-uzum-muted hover:bg-uzum-bg'}`}
          >
            {t('history')}
          </button>
          <button 
            onClick={() => setActiveTab('profile')}
            className={`flex-1 min-w-[100px] py-3 rounded-xl font-bold text-sm transition-all ${activeTab === 'profile' ? 'bg-uzum-primary text-white shadow-lg shadow-uzum-primary/20' : 'text-uzum-muted hover:bg-uzum-bg'}`}
          >
            {t('profile')}
          </button>
        </div>

        <div className="space-y-4">
          {activeTab === 'warehouse' && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
              <div className="flex justify-between items-center px-2">
                <h2 className="text-xl font-black text-uzum-text">{t('warehouse')}</h2>
                <div className="bg-uzum-primary/10 px-3 py-1 rounded-full">
                  <span className="text-uzum-primary text-[10px] font-black uppercase">{products.length} {t('items')}</span>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3">
                {products.map(product => (
                  <div key={product.id} className="bg-white p-4 rounded-[2rem] border border-[#e2e5eb] shadow-sm flex gap-4 items-center">
                    <div className="w-16 h-16 bg-uzum-bg rounded-2xl overflow-hidden flex-shrink-0">
                      <img src={product.image} className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-bold text-uzum-text text-sm">{product.name}</h4>
                      <p className="text-[10px] text-uzum-muted font-medium uppercase tracking-widest">{product.categoryName}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-black text-uzum-muted uppercase tracking-widest mb-1">На складе</p>
                      <p className={`text-lg font-black ${product.stock && product.stock > 0 ? 'text-green-600' : 'text-red-500'}`}>
                        {product.stock || 0} шт
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {activeTab === 'profile' ? (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-[#e2e5eb] text-center space-y-6 relative group overflow-hidden">
              <div className="w-32 h-32 bg-uzum-bg rounded-full mx-auto flex items-center justify-center border-4 border-uzum-primary/10 overflow-hidden relative">
                {user?.photo ? (
                  <img src={user.photo} className="w-full h-full object-cover" />
                ) : (
                  <Truck size={48} className="text-uzum-primary" />
                )}
                <label className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer">
                  <Plus size={24} className="text-white" />
                  <input type="file" accept="image/*" onChange={handlePhotoChange} className="hidden" />
                </label>
              </div>
              <div>
                <h2 className="text-2xl font-bold text-uzum-text">{user?.name}</h2>
                <p className="text-uzum-muted font-bold uppercase tracking-widest text-xs mt-1">{user?.phone}</p>
              </div>
              
              <div className="bg-uzum-bg p-6 rounded-3xl space-y-4 text-left">
                <div>
                  <label className="text-[10px] font-black text-uzum-muted uppercase tracking-widest block mb-2">Транспорт</label>
                  <div className="flex items-center gap-3 p-4 bg-white rounded-2xl border border-[#e2e5eb]">
                    <div className="p-2 bg-uzum-primary/10 text-uzum-primary rounded-xl">
                      <Truck size={20} />
                    </div>
                    <span className="font-bold text-uzum-text">{user?.carType || 'Не указан'}</span>
                  </div>
                </div>
                {user?.carPhoto && (
                  <div>
                    <label className="text-[10px] font-black text-uzum-muted uppercase tracking-widest block mb-2">Фото машины</label>
                    <img src={user.carPhoto} className="w-full h-40 object-cover rounded-2xl border border-[#e2e5eb]" />
                  </div>
                )}
              </div>
            </motion.div>
          ) : (activeTab === 'deliveries' ? myDeliveries : historyDeliveries).map(order => (
            <motion.div 
              layout
              key={order.id} 
              className="bg-white rounded-[2rem] shadow-sm border border-[#e2e5eb] overflow-hidden"
            >
              <div className="p-6 space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-black text-uzum-muted uppercase tracking-widest">Заказ #{order.id}</span>
                  <div className="flex gap-2">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase ${
                      order.paymentStatus === 'paid' ? 'bg-green-100 text-green-600' : 'bg-yellow-100 text-yellow-600'
                    }`}>
                      {order.paymentStatus === 'paid' ? 'Оплачено' : 'Ожидает оплаты'}
                    </span>
                    <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase ${
                      order.collectionStatus === 'collected' ? 'bg-blue-100 text-blue-600' : 'bg-stone-100 text-stone-600'
                    }`}>
                      {order.collectionStatus === 'collected' ? 'Собрано' : 'В сборке'}
                    </span>
                  </div>
                </div>
                
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-uzum-text">{order.clientName}</h3>
                    <div className="flex items-center gap-2 text-uzum-muted text-sm mt-1">
                      <MapPin size={16} className="text-uzum-primary" /> 
                      <span className="font-medium">{order.location}</span>
                    </div>
                    <div className="flex items-center gap-2 text-uzum-muted text-xs mt-2 font-bold uppercase tracking-widest">
                      <Users size={14} />
                      <span>Агент: {order.agentName || 'Нет'}</span>
                    </div>
                  </div>
                  <a href={`tel:${order.clientPhone || '+998901234567'}`} className="p-4 bg-uzum-primary text-white rounded-2xl shadow-lg shadow-uzum-primary/20 hover:scale-105 transition-all">
                    <Phone size={24} />
                  </a>
                </div>

                <div className="bg-uzum-bg p-4 rounded-2xl space-y-3">
                  <h4 className="text-[10px] font-black text-uzum-muted uppercase tracking-widest border-b border-white/50 pb-2">Состав заказа</h4>
                  {order.items.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center text-sm">
                      <span className="text-uzum-muted font-medium">{item.quantity}x {item.productName}</span>
                      <span className="font-bold text-uzum-text">{item.price.toLocaleString()} сум</span>
                    </div>
                  ))}
                  <div className="pt-2 border-t border-white/50 flex justify-between items-center font-bold text-lg text-uzum-primary">
                    <span>{t('total')}</span>
                    <span>{order.totalPrice.toLocaleString()} сум</span>
                  </div>
                </div>

                {/* Map Section */}
                {activeTab === 'deliveries' && (
                  <div className="space-y-3">
                    <div className="flex justify-between items-center text-[10px] font-black text-uzum-muted uppercase tracking-widest">
                      <span>Маршрут доставки</span>
                      <div className="flex gap-4">
                        <span className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-red-500"></div> {t('store')}</span>
                        <span className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-blue-500"></div> {t('client')}</span>
                      </div>
                    </div>
                    <div className="h-60 rounded-3xl overflow-hidden border border-[#e2e5eb] relative shadow-inner flex items-center justify-center bg-stone-50">
                      {GOOGLE_MAPS_API_KEY ? (
                        <APIProvider apiKey={GOOGLE_MAPS_API_KEY}>
                          <Map 
                            defaultCenter={order.latitude && order.longitude ? { lat: (STORE_LOCATION.lat + order.latitude) / 2, lng: (STORE_LOCATION.lng + order.longitude) / 2 } : STORE_LOCATION} 
                            defaultZoom={12}
                            className="h-full w-full"
                          >
                            <Marker position={STORE_LOCATION} title={t('store')} />
                            {order.latitude && order.longitude && (
                              <Marker position={{ lat: order.latitude, lng: order.longitude }} title={t('client')} />
                            )}
                          </Map>
                        </APIProvider>
                      ) : (
                        <div className="text-center p-6">
                          <Navigation size={32} className="text-uzum-muted mx-auto mb-2" />
                          <p className="text-[10px] font-black text-uzum-muted uppercase tracking-widest">
                            Пожалуйста, настройте Google Maps API Key
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {activeTab === 'deliveries' && (
                  <div className="flex gap-3">
                    {order.orderStatus === 'confirmed' && (
                      <button 
                        onClick={() => handleConfirmAction(() => updateStatus(order.id, 'on_way'), t('startDelivery'), t('areYouSure'))}
                        className="flex-1 py-5 bg-uzum-primary text-white rounded-2xl font-bold text-sm shadow-xl shadow-uzum-primary/20 flex items-center justify-center gap-2 active:scale-95 transition-all"
                      >
                        <Navigation size={20} /> {t('startDelivery')}
                      </button>
                    )}
                    {order.orderStatus === 'on_way' && (
                      <button 
                        onClick={() => handleConfirmAction(() => updateStatus(order.id, 'delivered'), t('markDelivered'), t('areYouSure'))}
                        className="flex-1 py-5 bg-green-500 text-white rounded-2xl font-bold text-sm shadow-xl shadow-green-500/20 flex items-center justify-center gap-2 active:scale-95 transition-all"
                      >
                        <CheckCircle size={20} /> {t('markDelivered')}
                      </button>
                    )}
                  </div>
                )}

                {activeTab === 'history' && (
                  <div className="flex items-center justify-center gap-2 text-green-500 font-bold text-sm bg-green-50 py-5 rounded-2xl border border-green-100">
                    <CheckCircle size={20} /> {t('delivered')}: {new Date(order.createdAt).toLocaleDateString()}
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      </main>

      <ConfirmDialog 
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
        onConfirm={confirmDialog.onConfirm}
        title={confirmDialog.title}
        message={confirmDialog.message}
      />

      {/* Handover Modal */}
      <AnimatePresence>
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
                  <p className="text-[10px] font-black text-uzum-muted uppercase tracking-widest">Заказ #{selectedOrder?.id}</p>
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
                  <span className="text-xl font-black text-uzum-primary">{selectedOrder?.totalPrice.toLocaleString()} сум</span>
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
