import React, { useState, useEffect } from 'react';
import { User, AppConfig } from '../types';
import { Users, Settings, Database, X, ShieldCheck, TrendingUp, Save, CheckCircle, RefreshCcw, Activity } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

const AdminPanel: React.FC<Props> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'users' | 'config'>('users');
  const [users, setUsers] = useState<User[]>([]);
  const [config, setConfig] = useState<AppConfig>({
    scanFrequency: 1.5,
    alarmEnabled: true,
    minConfidence: 90
  });
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const allUsers: User[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith('user_')) {
          try {
            const userData = JSON.parse(localStorage.getItem(key) || '');
            allUsers.push(userData);
          } catch (e) {}
        }
      }
      setUsers(allUsers.sort((a, b) => b.signupDate - a.signupDate));

      const savedConfig = localStorage.getItem('global_app_config');
      if (savedConfig) {
        setConfig(JSON.parse(savedConfig));
      }
    }
  }, [isOpen]);

  const saveConfig = () => {
    setIsSaving(true);
    localStorage.setItem('global_app_config', JSON.stringify(config));
    setTimeout(() => {
      setIsSaving(false);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    }, 1000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[300] bg-black/98 backdrop-blur-3xl flex flex-col">
      <div className="w-full max-w-6xl mx-auto flex-1 flex flex-col overflow-hidden">
        <div className="p-10 border-b border-white/5 flex justify-between items-center">
          <div className="flex items-center gap-5">
            <div className="w-14 h-14 bg-emerald-500 rounded-2xl flex items-center justify-center">
              <ShieldCheck className="text-black" size={32} />
            </div>
            <div>
              <h2 className="text-3xl font-black italic uppercase tracking-tighter text-white">Admin Hub</h2>
              <p className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.2em]">Oversight Active</p>
            </div>
          </div>
          
          <div className="flex bg-slate-900/60 p-1.5 rounded-2xl gap-2">
            <button onClick={() => setActiveTab('users')} className={`px-8 py-3 rounded-xl text-[10px] font-black uppercase transition-all ${activeTab === 'users' ? 'bg-blue-600 text-white' : 'text-slate-500'}`}>
              Traders
            </button>
            <button onClick={() => setActiveTab('config')} className={`px-8 py-3 rounded-xl text-[10px] font-black uppercase transition-all ${activeTab === 'config' ? 'bg-blue-600 text-white' : 'text-slate-500'}`}>
              Engine
            </button>
          </div>

          <button onClick={onClose} className="p-4 bg-white/5 hover:bg-white/10 rounded-2xl text-slate-400">
            <X size={28} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-10 no-scrollbar">
          {activeTab === 'users' ? (
            <div className="space-y-8">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                 {[
                   { label: 'Total Traders', val: users.length, icon: Activity, color: 'text-blue-400' },
                   { label: 'Pro Status', val: 'UNLIMITED', icon: ShieldCheck, color: 'text-emerald-400' },
                   { label: 'System Health', val: 'OPTIMAL', icon: CheckCircle, color: 'text-emerald-500' }
                 ].map((stat, i) => (
                   <div key={i} className="bg-slate-900/40 p-6 rounded-[2rem] border border-white/5">
                      <stat.icon className={`${stat.color} mb-3`} size={20} />
                      <span className="text-[9px] font-black text-slate-500 uppercase block mb-1">{stat.label}</span>
                      <span className={`text-3xl font-black italic tracking-tighter ${stat.color}`}>{stat.val}</span>
                   </div>
                 ))}
              </div>

              <div className="bg-slate-950/40 rounded-[2.5rem] border border-white/5 overflow-hidden">
                <table className="w-full text-left">
                  <thead className="bg-white/5 text-[10px] font-black uppercase text-slate-400">
                    <tr>
                      <th className="px-8 py-6">Trader</th>
                      <th className="px-8 py-6">Contact</th>
                      <th className="px-8 py-6">Tier</th>
                      <th className="px-8 py-6">Registered</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {users.map(u => (
                      <tr key={u.id} className="hover:bg-white/5 transition-all">
                        <td className="px-8 py-6 flex items-center gap-4 text-sm font-bold text-slate-200">
                          <div className="w-8 h-8 rounded-lg bg-blue-600/20 flex items-center justify-center text-blue-400 text-xs">{u.name.charAt(0)}</div>
                          {u.name}
                        </td>
                        <td className="px-8 py-6 font-mono text-xs text-slate-400">{u.phone}</td>
                        <td className="px-8 py-6">
                          <span className="px-4 py-1.5 bg-emerald-500/10 text-emerald-400 rounded-full text-[9px] font-black uppercase border border-emerald-500/20">Institutional</span>
                        </td>
                        <td className="px-8 py-6 text-[10px] text-slate-500 font-black">{new Date(u.signupDate).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="max-w-2xl mx-auto bg-slate-900/40 p-10 rounded-[3rem] border border-white/10 space-y-10">
                <h3 className="text-xl font-black uppercase tracking-tighter flex items-center gap-4 text-blue-400 italic">
                  <TrendingUp size={24} /> Neural Tuning
                </h3>
                
                <div className="space-y-10">
                   <div className="space-y-4">
                     <div className="flex justify-between items-end">
                       <label className="text-[11px] font-black uppercase text-slate-400 tracking-widest">Confidence Floor</label>
                       <span className="text-2xl font-black text-blue-400 italic">{config.minConfidence}%</span>
                     </div>
                     <input type="range" min="60" max="99" value={config.minConfidence} onChange={(e) => setConfig({...config, minConfidence: parseInt(e.target.value)})} className="w-full h-2 bg-slate-800 rounded-full appearance-none accent-blue-600 cursor-pointer" />
                   </div>

                   <div className="flex items-center justify-between py-8 border-y border-white/5">
                     <div>
                       <h4 className="text-sm font-black uppercase text-slate-200">Global Signal Alarms</h4>
                       <p className="text-[10px] text-slate-500 uppercase mt-1 font-bold italic">Force audible rings for every signal</p>
                     </div>
                     <button onClick={() => setConfig({...config, alarmEnabled: !config.alarmEnabled})} className={`w-16 h-9 rounded-full relative transition-all ${config.alarmEnabled ? 'bg-emerald-600' : 'bg-slate-700'}`}>
                       <div className={`absolute top-1.5 w-6 h-6 bg-white rounded-full transition-all ${config.alarmEnabled ? 'left-8' : 'left-1.5'}`} />
                     </button>
                   </div>
                </div>

                <button onClick={saveConfig} disabled={isSaving} className="w-full bg-blue-600 hover:bg-blue-500 py-6 rounded-[2rem] font-black uppercase tracking-widest text-white transition-all flex items-center justify-center gap-3 active:scale-95">
                  {isSaving ? <RefreshCcw className="animate-spin" size={20} /> : <Save size={20} />}
                  Save Neural Config
                </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminPanel;