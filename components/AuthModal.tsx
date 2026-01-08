
import React, { useState } from 'react';
import { User } from '../types';
import { ShieldCheck, Phone, Lock, User as UserIcon, ArrowRight, X, AlertCircle } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onAuthSuccess: (user: User) => void;
}

const AuthModal: React.FC<Props> = ({ isOpen, onClose, onAuthSuccess }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Admin Credentials Check
    if (phone === '7703862878' && password === '709102') {
      const adminUser: User = {
        id: 'admin-001',
        phone: '7703862878',
        name: 'Super Admin',
        isSubscribed: true,
        signupDate: Date.now(),
        isAdmin: true
      };
      onAuthSuccess(adminUser);
      onClose();
      return;
    }

    const saved = localStorage.getItem(`user_${phone}`);
    
    if (isLogin) {
      if (saved) {
        const user = JSON.parse(saved);
        // Simple password check (using phone as password for demo if PIN not saved)
        if (password === '1234' || password === user.phone.slice(-4)) {
          onAuthSuccess(user);
          onClose();
        } else {
          setError('Invalid Secure PIN. Try last 4 digits of phone.');
        }
      } else {
        setError('No account found with this phone number.');
      }
    } else {
      const newUser: User = {
        id: Math.random().toString(36).substr(2, 9),
        phone,
        name,
        isSubscribed: false,
        signupDate: Date.now(), // Trial starts now
        isAdmin: false
      };
      localStorage.setItem(`user_${phone}`, JSON.stringify(newUser));
      onAuthSuccess(newUser);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-[200] bg-black/95 backdrop-blur-3xl flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-slate-900/40 border border-white/10 rounded-[3rem] overflow-hidden shadow-2xl relative">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600/5 to-transparent pointer-events-none" />
        
        <div className="p-8 relative z-10">
          <button onClick={onClose} className="absolute top-6 right-6 text-slate-500 hover:text-white transition-colors">
            <X size={24} />
          </button>
          
          <div className="flex flex-col items-center mb-8">
            <div className="w-20 h-20 bg-blue-600 rounded-3xl flex items-center justify-center mb-6 shadow-2xl shadow-blue-500/40 animate-pulse">
              <ShieldCheck className="text-white" size={40} />
            </div>
            <h2 className="text-3xl font-black italic uppercase tracking-tighter text-white">
              {isLogin ? "Terminal Access" : "Join Collective"}
            </h2>
            <p className="text-slate-400 text-[10px] font-black mt-2 uppercase tracking-[0.3em] text-center">
              Institutional Grade AI Trading Hub
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/50 rounded-2xl flex items-center gap-3 text-red-400 text-xs font-bold">
              <AlertCircle size={18} />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div className="group relative">
                <UserIcon className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-500 transition-colors" size={18} />
                <input 
                  required
                  type="text" 
                  placeholder="Full Name" 
                  className="w-full bg-black/60 border border-white/5 rounded-2xl py-5 pl-14 pr-4 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all placeholder:text-slate-700"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
            )}
            <div className="group relative">
              <Phone className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-500 transition-colors" size={18} />
              <input 
                required
                type="tel" 
                placeholder="Phone Number" 
                className="w-full bg-black/60 border border-white/5 rounded-2xl py-5 pl-14 pr-4 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all placeholder:text-slate-700"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
            <div className="group relative">
              <Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-500 transition-colors" size={18} />
              <input 
                required
                type="password" 
                placeholder="Secure PIN" 
                className="w-full bg-black/60 border border-white/5 rounded-2xl py-5 pl-14 pr-4 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all placeholder:text-slate-700"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 py-5 rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-3 shadow-2xl transition-all active:scale-95 text-white">
              {isLogin ? "Authenticate" : "Register Now"} <ArrowRight size={20} />
            </button>
          </form>

          <div className="mt-8 text-center">
            <button 
              onClick={() => { setIsLogin(!isLogin); setError(''); }}
              className="text-slate-400 text-[10px] font-black uppercase tracking-widest hover:text-blue-400 transition-colors"
            >
              {isLogin ? "Don't have access? Create Account (7 Day Trial)" : "Existing Member? Authenticate"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthModal;
