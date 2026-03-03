import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { Product, Category, Order, Stats, User, Banner, Debt } from '../types';
import { apiFetch, API_BASE_URL } from '../utils/api';
import { useLanguage } from './LanguageContext';
import { useAuth } from './AuthContext';
import { io, Socket } from 'socket.io-client';

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
  updateProduct: (id: number, product: Partial<Product>) => Promise<void>;
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
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    // Initialize Socket.io
    const socket = io(API_BASE_URL || window.location.origin);
    socketRef.current = socket;

    socket.on('location_updated', (data) => {
      setUsers(prev => prev.map(u => u.id === data.userId ? { ...u, lat: data.lat, lng: data.lng } : u));
    });

    socket.on('order_created', () => {
      refreshData();
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const refreshData = async () => {
    try {
      const endpoints = [
        { name: 'products', url: '/api/products' },
        { name: 'categories', url: '/api/categories' },
        { name: 'orders', url: '/api/orders' },
        { name: 'stats', url: '/api/stats' },
        { name: 'users', url: '/api/users' },
        { name: 'banners', url: '/api/banners' },
        { name: 'settings', url: '/api/settings' },
        { name: 'debts', url: '/api/debts' }
      ];

      const results = await Promise.all(
        endpoints.map(async (ep) => {
          try {
            const res = await apiFetch(ep.url);
            if (!res.ok) {
              console.warn(`API Error for ${ep.name}: ${res.status} ${res.statusText}`);
              return { name: ep.name, data: null };
            }
            return { name: ep.name, data: await res.json() };
          } catch (e) {
            console.error(`Fetch error for ${ep.name}:`, e);
            return { name: ep.name, data: null };
          }
        })
      );

      results.forEach(res => {
        if (res.data === null) return;
        
        switch (res.name) {
          case 'products': setProducts(res.data); break;
          case 'categories': setCategories(res.data); break;
          case 'orders': {
            const newOrders: Order[] = res.data;
            if (settings.voice_enabled === 'true' && prevOrdersRef.current.length > 0) {
              newOrders.forEach(order => {
                const prevOrder = prevOrdersRef.current.find(o => o.id === order.id);
                if (!prevOrder && newOrders.length > prevOrdersRef.current.length) {
                  speak(t('newOrderVoice'));
                }
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
            break;
          }
          case 'stats': setStats(res.data); break;
          case 'users': setUsers(res.data); break;
          case 'banners': setBanners(res.data); break;
          case 'settings': setSettings(res.data); break;
          case 'debts': {
            const newDebts: Debt[] = res.data;
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
            break;
          }
        }
      });
    } catch (error) {
      console.error('Critical error refreshing data:', error);
    }
  };

  const speak = (text: string) => {
    if (settings.voice_enabled !== 'true') return;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = language === 'ru' ? 'ru-RU' : 'uz-UZ';
    window.speechSynthesis.speak(utterance);
  };

  useEffect(() => {
    // Small delay to ensure server is ready
    const timer = setTimeout(() => {
      refreshData();
    }, 1500);
    
    const interval = setInterval(refreshData, 10000);
    return () => {
      clearTimeout(timer);
      clearInterval(interval);
    };
  }, [language, settings.voice_enabled]);

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

  const updateProduct = async (id: number, product: Partial<Product>) => {
    await apiFetch(`/api/products/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(product),
    });
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
    const res = await apiFetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(order),
    });
    if (res.ok && socketRef.current) {
      const newOrder = await res.json();
      socketRef.current.emit('new_order', newOrder);
    }
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
    if (!user || !socketRef.current) return;
    
    // Send via socket for real-time
    socketRef.current.emit('update_location', {
      userId: user.id,
      lat,
      lng,
      role: user.role
    });

    // Also update local state for immediate feedback
    setUsers(prev => prev.map(u => u.id === user.id ? { ...u, lat, lng } : u));
  };

  return (
    <DataContext.Provider value={{ 
      products, categories, orders, stats, users, banners, settings, debts,
      refreshData, addProduct, updateProduct, deleteProduct, addCategory, deleteCategory, createOrder, updateOrder, deleteOrder, deleteUser, updateUser,
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
