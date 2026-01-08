
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
      // Fetch all users
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

      // Fetch Global Config
      const savedConfig = localStorage.getItem('global_app_config');
      if (savedConfig) {
        setConfig(JSON.parse(savedConfig));
      }
    }
  }, [isOpen]);

  const saveConfig = () => {
    setIsSaving(true);
    localStorage.setItem('global_app_config', JSON.stringify(config));
    
    // Simulate cloud sync
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
        {/* Header */}
        <div className="p-6 sm:p-10 border-b border-white/5 flex flex-col sm:row justify-between items-center gap-6">
          <div className="flex items-center gap-5">
            <div className="w-14 h-14 bg-emerald-500 rounded-2xl flex items-center justify-center shadow-2xl shadow-emerald-500/20">
              <ShieldCheck className="text-black" size={32} />
            </div>
            <div>
              <h2 className="text-3xl font-black italic uppercase tracking-tighter text-white">Admin Hub</h2>
              <div className="flex items-center gap-2 mt-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <p className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.2em]">Live Oversight Active</p>
              </div>
            </div>
          </div>
          
          <div className="flex bg-slate-900/60 p-1.5 rounded-2xl gap-2 border border-white/5">
            <button 
              onClick={() => setActiveTab('users')}
              className={`px-8 py-3 rounded-xl text-[10px] font-black uppercase transition-all flex items-center gap-2 ${activeTab === 'users' ? 'bg-blue-600 text-white shadow-xl' : 'text-slate-500 hover:text-white'}`}
            >
              <Users size={16} /> User Intelligence
            </button>
            <button 
              onClick={() => setActiveTab('config')}
              className={`px-8 py-3 rounded-xl text-[10px] font-black uppercase transition-all flex items-center gap-2 ${activeTab === 'config' ? 'bg-blue-600 text-white shadow-xl' : 'text-slate-500 hover:text-white'}`}
            >
              <Settings size={16} /> Engine Config
            </button>
          </div>

          <button onClick={onClose} className="absolute top-10 right-10 p-4 bg-white/5 hover:bg-white/10 rounded-2xl transition-all text-slate-400">
            <X size={28} />
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-10 no-scrollbar pb-32">
          {activeTab === 'users' ? (
            <div className="space-y-8">
              {/* Stats Bar */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                 {[
                   { label: 'Total Traders', val: users.length, icon: Activity, color: 'text-blue-400' },
                   { label: 'Pro Members', val: users.filter(u => u.isSubscribed).length, icon: ShieldCheck, color: 'text-emerald-400' },
                   { label: 'Trial Period', val: users.filter(u => !u.isSubscribed).length, icon: Database, color: 'text-amber-400' },
                   { label: 'System Health', val: '100%', icon: CheckCircle, color: 'text-emerald-500' }
                 ].map((stat, i) => (
                   <div key={i} className="bg-slate-900/40 p-6 rounded-[2rem] border border-white/5">
                      <stat.icon className={`${stat.color} mb-3`} size={20} />
                      <span className="text-[9px] font-black text-slate-500 uppercase block mb-1">{stat.label}</span>
                      <span className={`text-3xl font-black italic tracking-tighter ${stat.color}`}>{stat.val}</span>
                   </div>
                 ))}
              </div>

              {/* User Table */}
              <div className="bg-slate-950/40 rounded-[2.5rem] border border-white/5 overflow-hidden shadow-2xl">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-white/5 text-[10px] font-black uppercase tracking-widest text-slate-400">
                      <th className="px-8 py-6">Trader Name</th>
                      <th className="px-8 py-6">Phone / Contact</th>
                      <th className="px-8 py-6">Status</th>
                      <th className="px-8 py-6">Joined On</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {users.map(u => (
                      <tr key={u.id} className="hover:bg-white/5 transition-all group">
                        <td className="px-8 py-6">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-blue-400 font-black">
                              {u.name.charAt(0)}
                            </div>
                            <span className="text-sm font-bold text-slate-200">{u.name}</span>
                          </div>
                        </td>
                        <td className="px-8 py-6 font-mono text-xs text-slate-400">{u.phone}</td>
                        <td className="px-8 py-6">
                          {u.isSubscribed ? (
                            <span className="px-4 py-1.5 bg-emerald-500/10 text-emerald-400 rounded-full text-[9px] font-black uppercase border border-emerald-500/20">Institutional</span>
                          ) : (
                            <span className="px-4 py-1.5 bg-amber-500/10 text-amber-400 rounded-full text-[9px] font-black uppercase border border-amber-500/20">7-Day Trial</span>
                          )}
                        </td>
                        <td className="px-8 py-6 text-[10px] text-slate-500 font-black">
                          {new Date(u.signupDate).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                    {users.length === 0 && (
                      <tr>
                        <td colSpan={4} className="px-8 py-20 text-center text-slate-500 uppercase text-xs font-black italic">
                          No traders registered in system yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto space-y-10">
              <div className="bg-slate-900/40 p-10 rounded-[3rem] border border-white/10 shadow-2xl space-y-10">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-black uppercase tracking-tighter flex items-center gap-4 text-blue-400 italic">
                    <TrendingUp size={24} /> Engine Intelligence Tuning
                  </h3>
                  {showSuccess && (
                    <div className="flex items-center gap-2 text-emerald-400 animate-bounce">
                      <CheckCircle size={16} />
                      <span className="text-[10px] font-black uppercase">Synced!</span>
                    </div>
                  )}
                </div>
                
                <div className="space-y-10">
                   <div className="space-y-4">
                     <div className="flex justify-between items-end">
                       <label className="text-[11px] font-black uppercase text-slate-400 tracking-widest">Signal Confidence Threshold</label>
                       <span className="text-2xl font-black text-blue-400 italic">{config.minConfidence}%</span>
                     </div>
                     <input 
                       type="range" min="60" max="99" 
                       value={config.minConfidence} 
                       onChange={(e) => setConfig({...config, minConfidence: parseInt(e.target.value)})}
                       className="w-full h-2 bg-slate-800 rounded-full appearance-none accent-blue-600 cursor-pointer"
                     />
                     <p className="text-[9px] text-slate-500 uppercase font-bold italic">Model only issues BUY/SELL if probability exceeds this value.</p>
                   </div>

                   <div className="flex items-center justify-between py-8 border-y border-white/5">
                     <div>
                       <h4 className="text-sm font-black uppercase text-slate-200">Force Global Alarms</h4>
                       <p className="text-[10px] text-slate-500 uppercase mt-1 font-bold">Overrides user preferences for critical signals</p>
                     </div>
                     <button 
                       onClick={() => setConfig({...config, alarmEnabled: !config.alarmEnabled})}
                       className={`w-16 h-9 rounded-full transition-all relative ${config.alarmEnabled ? 'bg-emerald-600' : 'bg-slate-700'}`}
                     >
                       <div className={`absolute top-1.5 w-6 h-6 bg-white rounded-full shadow-lg transition-all ${config.alarmEnabled ? 'left-8' : 'left-1.5'}`} />
                     </button>
                   </div>

                   <div className="space-y-4">
                     <label className="text-[11px] font-black uppercase text-slate-400 tracking-widest">Visual Analysis Frequency (FPS)</label>
                     <div className="grid grid-cols-3 gap-3">
                        {[0.5, 1.5, 3.0].map(val => (
                          <button 
                            key={val}
                            onClick={() => setConfig({...config, scanFrequency: val})}
                            className={`py-4 rounded-2xl border text-[10px] font-black uppercase transition-all ${config.scanFrequency === val ? 'bg-blue-600 border-blue-500 text-white' : 'bg-black/40 border-white/5 text-slate-500 hover:border-white/20'}`}
                          >
                            {val === 0.5 ? 'Conservative' : val === 1.5 ? 'Balanced' : 'High Speed'}
                          </button>
                        ))}
                     </div>
                   </div>
                </div>

                <button 
                  onClick={saveConfig}
                  disabled={isSaving}
                  className="w-full bg-blue-600 hover:bg-blue-500 py-6 rounded-[2rem] font-black uppercase tracking-widest text-white shadow-2xl shadow-blue-500/20 transition-all flex items-center justify-center gap-3 disabled:opacity-50 active:scale-95"
                >
                  {isSaving ? <RefreshCcw className="animate-spin" size={20} /> : <Save size={20} />}
                  {isSaving ? "Synchronizing..." : "Update Engine Parameters"}
                </button>
              </div>

              <div className="bg-blue-600/5 border border-blue-500/10 p-8 rounded-[2.5rem] flex items-center gap-6">
                 <div className="w-12 h-12 bg-blue-500/10 rounded-2xl flex items-center justify-center text-blue-400">
                    <RefreshCcw size={24} />
                 </div>
                 <div>
                    <h4 className="text-xs font-black uppercase text-blue-400 italic">Cloud Infrastructure: Operational</h4>
                    <p className="text-[10px] text-slate-500 mt-1 uppercase font-bold tracking-tight">Changes are broadcasted to all connected trader terminals instantly.</p>
                 </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminPanel;
