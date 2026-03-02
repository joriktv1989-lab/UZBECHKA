export interface User {
  id: number;
  name: string;
  phone: string;
  role: 'admin' | 'agent' | 'courier' | 'client';
  carType?: string;
  carPhoto?: string;
  photo?: string;
  lat?: number;
  lng?: number;
  lastSeen?: string;
}

export interface Category {
  id: number;
  name: string;
}

export interface Product {
  id: number;
  name: string;
  price: number;
  discountPrice?: number;
  categoryId: number;
  categoryName?: string;
  image: string;
  videoUrl?: string;
  description: string;
  stock?: number;
}

export interface Banner {
  id: number;
  title: string;
  imageUrl: string;
  videoUrl?: string;
  link?: string;
  isActive: number;
}

export interface OrderItem {
  id: number;
  orderId: number;
  productId: number;
  productName: string;
  quantity: number;
  price: number;
}

export interface Order {
  id: number;
  clientId: number;
  clientName: string;
  clientPhone?: string;
  agentId?: number;
  agentName?: string;
  courierId?: number;
  courierName?: string;
  courierCarType?: string;
  courierCarPhoto?: string;
  totalPrice: number;
  paymentType: 'payme' | 'click' | 'cash';
  paymentStatus: 'pending' | 'paid';
  collectionStatus: 'pending' | 'collected';
  orderStatus: 'new' | 'confirmed' | 'on_way' | 'delivered' | 'cancelled';
  location: string;
  latitude?: number;
  longitude?: number;
  createdAt: string;
  items: OrderItem[];
}

export interface Stats {
  revenue: number;
  orders: number;
  users: number;
  salesByCategory: { name: string; value: number }[];
}

export interface Debt {
  id: number;
  clientId: number;
  clientName: string;
  clientPhone: string;
  orderId?: number;
  amount: number;
  dueDate?: string;
  status: 'pending' | 'paid';
  createdAt: string;
}
