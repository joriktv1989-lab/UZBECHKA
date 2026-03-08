import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { ShoppingBag, Globe, Chrome, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const Login: React.FC = () => {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [isRegister, setIsRegister] = useState(false);
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [showGooglePhoneModal, setShowGooglePhoneModal] = useState(false);
  const [googleData, setGoogleData] = useState<{ googleId: string, name: string, photo: string } | null>(null);
  const [googlePhone, setGooglePhone] = useState('');

  const { login, register, googleLogin, googleRegister } = useAuth();
  const { t, language, setLanguage } = useLanguage();

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'OAUTH_NEEDS_PHONE') {
        setGoogleData(event.data.googleData);
        setShowGooglePhoneModal(true);
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const handleGoogleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!googleData || !googlePhone) return;
    try {
      await googleRegister(googleData.name, googlePhone, googleData.googleId, googleData.photo);
      setShowGooglePhoneModal(false);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      if (isRegister) {
        await register(name, phone, password);
      } else {
        await login(phone, password);
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#f2f4f7] font-sans">
      <div className="absolute top-6 right-6 flex gap-2">
        <button 
          onClick={() => setLanguage('ru')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${language === 'ru' ? 'bg-uzum-primary text-white shadow-lg shadow-uzum-primary/20' : 'bg-white text-uzum-muted border border-[#e2e5eb]'}`}
        >
          RU
        </button>
        <button 
          onClick={() => setLanguage('uz')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${language === 'uz' ? 'bg-uzum-primary text-white shadow-lg shadow-uzum-primary/20' : 'bg-white text-uzum-muted border border-[#e2e5eb]'}`}
        >
          UZ
        </button>
      </div>

      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white p-10 rounded-[2.5rem] shadow-2xl w-full max-w-md border border-[#e2e5eb]"
      >
        <div className="flex flex-col items-center mb-10">
          <div className="w-20 h-20 bg-uzum-primary rounded-3xl flex items-center justify-center mb-6 shadow-xl shadow-uzum-primary/20 rotate-3">
            <ShoppingBag className="text-white w-10 h-10" />
          </div>
          <h1 className="text-4xl font-black text-uzum-primary tracking-tighter mb-1">UZBECHKA</h1>
          <p className="text-uzum-muted text-[10px] font-bold uppercase tracking-[0.2em] mb-2">DENAN bekary</p>
          <p className="text-uzum-muted text-sm font-medium">{t('premiumDelivery')}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {isRegister && (
            <div>
              <label className="block text-[10px] font-black text-uzum-muted uppercase tracking-widest mb-2 ml-1">{t('name')}</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full p-4 rounded-2xl bg-uzum-bg border-none outline-none focus:ring-2 focus:ring-uzum-primary/20 transition-all font-medium text-sm"
                placeholder={t('name')}
                required
              />
            </div>
          )}
          <div>
            <label className="block text-[10px] font-black text-uzum-muted uppercase tracking-widest mb-2 ml-1">{t('phone')}</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full p-4 rounded-2xl bg-uzum-bg border-none outline-none focus:ring-2 focus:ring-uzum-primary/20 transition-all font-medium text-sm"
              placeholder="+998 90 123 45 67"
              required
            />
          </div>
          <div>
            <label className="block text-[10px] font-black text-uzum-muted uppercase tracking-widest mb-2 ml-1">{t('password')}</label>
            <input
              type="password"
              name="password"
              autoComplete={isRegister ? "new-password" : "current-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-4 rounded-2xl bg-uzum-bg border-none outline-none focus:ring-2 focus:ring-uzum-primary/20 transition-all font-medium text-sm"
              placeholder="••••••••"
              required
            />
          </div>

          {error && <p className="text-red-500 text-xs text-center font-medium bg-red-50 py-2 rounded-lg">{error}</p>}

          <button
            type="submit"
            className="w-full bg-uzum-primary text-white font-bold py-5 rounded-2xl shadow-xl shadow-uzum-primary/20 hover:shadow-uzum-primary/30 transition-all active:scale-95 text-sm uppercase tracking-widest mt-4"
          >
            {isRegister ? t('createAccount') : t('signIn')}
          </button>
        </form>

        <div className="mt-6 flex items-center gap-4">
          <div className="flex-1 h-px bg-[#e2e5eb]" />
          <span className="text-[10px] font-black text-uzum-muted uppercase tracking-widest">or</span>
          <div className="flex-1 h-px bg-[#e2e5eb]" />
        </div>

        <button
          onClick={() => googleLogin()}
          className="w-full mt-6 bg-white border border-[#e2e5eb] text-uzum-text font-bold py-4 rounded-2xl hover:bg-uzum-bg transition-all flex items-center justify-center gap-3 active:scale-95 shadow-sm"
        >
          <Chrome className="w-5 h-5 text-uzum-primary" />
          <span className="text-sm">Google Account</span>
        </button>

        <div className="mt-8 text-center space-y-4">
          <button
            onClick={() => setIsRegister(!isRegister)}
            className="text-uzum-primary text-sm font-bold hover:opacity-80 transition-all block w-full"
          >
            {isRegister ? t('alreadyHaveAccount') : t('dontHaveAccount')}
          </button>
          
          {isRegister && (
            <p className="text-[10px] text-uzum-muted font-bold uppercase tracking-widest">
              {t('or')}
            </p>
          )}
        </div>
      </motion.div>

      <AnimatePresence>
        {showGooglePhoneModal && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
              className="bg-white rounded-[2.5rem] p-8 w-full max-w-sm shadow-2xl border border-[#e2e5eb]"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-black text-uzum-primary uppercase tracking-tighter">Phone Number</h3>
                <button onClick={() => setShowGooglePhoneModal(false)} className="p-2 bg-uzum-bg rounded-xl text-uzum-muted hover:text-uzum-text transition-all"><X size={20} /></button>
              </div>
              <p className="text-xs text-uzum-muted font-medium mb-6">
                Please enter your phone number to complete Google registration.
              </p>
              <form onSubmit={handleGoogleRegister} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-black text-uzum-muted uppercase tracking-widest mb-2 ml-1">{t('phone')}</label>
                  <input
                    type="tel"
                    value={googlePhone}
                    onChange={(e) => setGooglePhone(e.target.value)}
                    className="w-full p-4 rounded-2xl bg-uzum-bg border-none outline-none focus:ring-2 focus:ring-uzum-primary/20 transition-all font-medium text-sm"
                    placeholder="+998 90 123 45 67"
                    required
                    autoFocus
                  />
                </div>
                <button
                  type="submit"
                  className="w-full bg-uzum-primary text-white font-bold py-4 rounded-2xl shadow-xl shadow-uzum-primary/20 hover:shadow-uzum-primary/30 transition-all active:scale-95 text-sm uppercase tracking-widest mt-2"
                >
                  Complete Registration
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
