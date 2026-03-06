import React, { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import { useAuth } from '../context/AuthContext';
import { io, Socket } from 'socket.io-client';

interface UserLocation {
  userId: number;
  lat: number;
  lng: number;
  role: string;
  name: string;
}

export const Map3D: React.FC<{ height?: string }> = ({ height = '500px' }) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const markers = useRef<{ [key: number]: maplibregl.Marker }>({});
  const socket = useRef<Socket | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    if (!mapContainer.current) return;

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: 'https://demotiles.maplibre.org/style.json', // Free style
      center: [64.4217, 39.7747], // Bukhara
      zoom: 13,
      pitch: 45,
      bearing: -17.6,
    });

    map.current.on('load', () => {
      if (!map.current) return;
      
      // Add Warehouse Marker
      const warehouseEl = document.createElement('div');
      warehouseEl.className = 'warehouse-marker';
      warehouseEl.style.width = '50px';
      warehouseEl.style.height = '50px';
      warehouseEl.style.borderRadius = '15px';
      warehouseEl.style.backgroundColor = '#1a1a1a';
      warehouseEl.style.border = '3px solid #f27d26';
      warehouseEl.style.display = 'flex';
      warehouseEl.style.alignItems = 'center';
      warehouseEl.style.justifyContent = 'center';
      warehouseEl.style.fontSize = '24px';
      warehouseEl.style.boxShadow = '0 0 20px rgba(242,125,38,0.4)';
      warehouseEl.innerHTML = '🏠';
      warehouseEl.title = 'Warehouse / Склад';

      new maplibregl.Marker(warehouseEl)
        .setLngLat([64.4217, 39.7747]) // Bukhara Warehouse
        .setPopup(new maplibregl.Popup({ offset: 25 }).setHTML('<b>Warehouse / Склад</b>'))
        .addTo(map.current);
    });

    // Socket.io for real-time tracking
    socket.current = io(window.location.origin);

    socket.current.on('location_updated', (data: UserLocation & { photo?: string }) => {
      if (!map.current) return;

      const { userId, lat, lng, role, name, photo } = data;
      
      if (markers.current[userId]) {
        markers.current[userId].setLngLat([lng, lat]);
      } else {
        const el = document.createElement('div');
        el.className = 'marker group';
        el.style.width = '40px';
        el.style.height = '40px';
        el.style.borderRadius = '12px';
        el.style.border = '2px solid white';
        el.style.backgroundColor = 'white';
        el.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
        el.style.display = 'flex';
        el.style.alignItems = 'center';
        el.style.justifyContent = 'center';
        el.style.overflow = 'hidden';
        el.style.cursor = 'pointer';
        el.style.transition = 'all 0.3s ease';

        if (photo) {
          el.innerHTML = `<img src="${photo}" style="width: 100%; height: 100%; object-fit: cover;" />`;
        } else {
          el.style.backgroundColor = role === 'courier' ? '#ef4444' : '#3b82f6';
          el.style.color = 'white';
          el.innerHTML = role === 'courier' ? '🚚' : '👤';
        }
        
        el.title = name;

        const marker = new maplibregl.Marker(el)
          .setLngLat([lng, lat])
          .setPopup(new maplibregl.Popup({ offset: 25 }).setHTML(`
            <div style="padding: 10px; font-family: sans-serif;">
              <h3 style="margin: 0; font-size: 14px; font-weight: bold;">${name}</h3>
              <p style="margin: 4px 0 0; font-size: 10px; color: #666; text-transform: uppercase; font-weight: 800;">${role}</p>
            </div>
          `))
          .addTo(map.current);
        
        markers.current[userId] = marker;
      }
    });

    return () => {
      map.current?.remove();
      socket.current?.disconnect();
    };
  }, []);

  return (
    <div className="relative w-full rounded-2xl overflow-hidden shadow-xl border border-gold/20" style={{ height }}>
      <div ref={mapContainer} className="w-full h-full" />
      <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-md p-3 rounded-xl shadow-lg border border-gold/30 z-10">
        <h3 className="text-xs font-bold text-gold-dark uppercase tracking-wider">Live Tracking: Bukhara</h3>
        <div className="flex items-center gap-4 mt-2">
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <span className="text-[10px] font-medium">Couriers</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
            <span className="text-[10px] font-medium">Agents</span>
          </div>
        </div>
      </div>
    </div>
  );
};
