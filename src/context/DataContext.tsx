import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { Product, Category, Order, Stats, User, Banner, Debt } from '../types';
import { apiFetch } from '../utils/api';
import { useLanguage } from './LanguageContext';
import { useAuth } from './AuthContext';

interface DataContextType {
  products: Product[];
  categories: Category[];
  orders: Order[];
  banners: Banner[];
  stats: Stats | null;
  users: User[];
  settings: any;
  debts: Debt[];
  refreshData: () => Promise<void>;
  addProduct: (product: Partial<Product>) => Promise<void>;
  deleteProduct: (id: number) => Promise<void>;
  addCategory: (name: string) => Promise<void>;
  deleteCategory: (id: number) => Promise<void>;
  createOrder: (order: any) => Promise<void>;
  updateOrder: (id: number, updates: any) => Promise<void>;
  deleteOrder: (id: number) => Promise<void>;
  deleteUser: (id: number) => Promise<void>;
  updateUser: (id: number, updates: any) => Promise<void>;
  addBanner: (banner: Partial<Banner>) => Promise<void>;
  updateBanner: (id: number, updates: Partial<Banner>) => Promise<void>;
  deleteBanner: (id: number) => Promise<void>;
  updateSettings: (updates: any) => Promise<void>;
  addDebt: (debt: Partial<Debt>) => Promise<void>;
  updateDebt: (id: number, updates: Partial<Debt>) => Promise<void>;
  updateUserLocation: (lat: number, lng: number) => Promise<void>;
  speak: (text: string) => void;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [banners, setBanners] = useState<Banner[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [settings, setSettings] = useState<any>({});
  const [debts, setDebts] = useState<Debt[]>([]);

  const { t, language } = useLanguage();
  const { user } = useAuth();
  const prevOrdersRef = useRef<Order[]>([]);
  const prevDebtsRef = useRef<Debt[]>([]);

  const refreshData = async () => {
    try {
      const [pRes, cRes, oRes, sRes, uRes, bRes, stRes, dRes] = await Promise.all([
        apiFetch('/api/products'),
        apiFetch('/api/categories'),
        apiFetch('/api/orders'),
        apiFetch('/api/stats'),
        apiFetch('/api/users'),
        apiFetch('/api/banners'),
        apiFetch('/api/settings'),
        apiFetch('/api/debts')
      ]);
      
      if (pRes.ok) setProducts(await pRes.json());
      if (cRes.ok) setCategories(await cRes.json());
      if (oRes.ok) {
        const newOrders: Order[] = await oRes.json();
        
        // Voice Notifications Logic
        if (settings.voice_enabled === 'true' && prevOrdersRef.current.length > 0) {
          newOrders.forEach(order => {
            const prevOrder = prevOrdersRef.current.find(o => o.id === order.id);
            
            // New Order
            if (!prevOrder && newOrders.length > prevOrdersRef.current.length) {
              speak(t('newOrderVoice'));
            }
            
            // Status Changes
            if (prevOrder) {
              if (prevOrder.paymentStatus === 'pending' && order.paymentStatus === 'paid') {
                speak(t('paymentPaidVoice'));
              }
              if (prevOrder.collectionStatus === 'pending' && order.collectionStatus === 'collected') {
                speak(t('collectionCollectedVoice'));
              }
            }
          });
        }
        
        setOrders(newOrders);
        prevOrdersRef.current = newOrders;
      }
      if (sRes.ok) setStats(await sRes.json());
      if (uRes.ok) setUsers(await uRes.json());
      if (bRes.ok) setBanners(await bRes.json());
      if (stRes.ok) setSettings(await stRes.json());
      if (dRes.ok) {
        const newDebts: Debt[] = await dRes.json();
        if (settings.voice_enabled === 'true' && prevDebtsRef.current.length > 0) {
          newDebts.forEach(debt => {
            const prevDebt = prevDebtsRef.current.find(d => d.id === debt.id);
            if (prevDebt && prevDebt.status === 'pending' && debt.status === 'paid') {
              speak(t('debtRepaidVoice'));
            }
          });
        }
        setDebts(newDebts);
        prevDebtsRef.current = newDebts;
      }
    } catch (error) {
      console.error('Error refreshing data:', error);
    }
  };

  const speak = (text: string) => {
    if (settings.voice_enabled !== 'true') return;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = language === 'ru' ? 'ru-RU' : 'uz-UZ';
    window.speechSynthesis.speak(utterance);
  };

  useEffect(() => {
    refreshData();
  }, []);

  const addProduct = async (product: Partial<Product>) => {
    await apiFetch('/api/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(product),
    });
    await refreshData();
  };

  const deleteProduct = async (id: number) => {
    await apiFetch(`/api/products/${id}`, { method: 'DELETE' });
    await refreshData();
  };

  const addCategory = async (name: string) => {
    await apiFetch('/api/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
    await refreshData();
  };

  const deleteCategory = async (id: number) => {
    await apiFetch(`/api/categories/${id}`, { method: 'DELETE' });
    await refreshData();
  };

  const createOrder = async (order: any) => {
    await apiFetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(order),
    });
    await refreshData();
  };

  const updateOrder = async (id: number, updates: any) => {
    await apiFetch(`/api/orders/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    await refreshData();
  };

  const deleteOrder = async (id: number) => {
    await apiFetch(`/api/orders/${id}`, { method: 'DELETE' });
    await refreshData();
  };

  const deleteUser = async (id: number) => {
    await apiFetch(`/api/users/${id}`, { method: 'DELETE' });
    await refreshData();
  };

  const updateUser = async (id: number, updates: any) => {
    await apiFetch(`/api/users/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    await refreshData();
  };

  const addBanner = async (banner: Partial<Banner>) => {
    await apiFetch('/api/banners', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(banner),
    });
    await refreshData();
  };

  const updateBanner = async (id: number, updates: Partial<Banner>) => {
    await apiFetch(`/api/banners/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    await refreshData();
  };

  const deleteBanner = async (id: number) => {
    await apiFetch(`/api/banners/${id}`, { method: 'DELETE' });
    await refreshData();
  };

  const updateSettings = async (updates: any) => {
    await apiFetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    await refreshData();
  };

  const addDebt = async (debt: Partial<Debt>) => {
    await apiFetch('/api/debts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(debt),
    });
    await refreshData();
  };

  const updateDebt = async (id: number, updates: Partial<Debt>) => {
    await apiFetch(`/api/debts/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    await refreshData();
  };

  const updateUserLocation = async (lat: number, lng: number) => {
    if (!user) return;
    await apiFetch('/api/users/location', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: user.id, lat, lng }),
    });
    // Don't refresh data here to avoid infinite loops, we just send location
  };

  return (
    <DataContext.Provider value={{ 
      products, categories, orders, stats, users, banners, settings, debts,
      refreshData, addProduct, deleteProduct, addCategory, deleteCategory, createOrder, updateOrder, deleteOrder, deleteUser, updateUser,
      addBanner, updateBanner, deleteBanner, updateSettings, addDebt, updateDebt, updateUserLocation, speak
    }}>
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) throw new Error('useData must be used within DataProvider');
  return context;
};
