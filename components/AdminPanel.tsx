
import React, { useState, useEffect } from 'react';
import { User, AppConfig } from '../types';
import { Users, Settings, Database, X, Search, ShieldCheck, TrendingUp, UserCheck, Clock } from 'lucide-react';

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

  useEffect(() => {
    if (isOpen) {
      // Fetch all users from localStorage
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
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[300] bg-black/95 backdrop-blur-2xl flex flex-col p-4 sm:p-8">
      <div className="w-full max-w-5xl mx-auto flex-1 bg-slate-900/40 border border-white/10 rounded-[3rem] overflow-hidden flex flex-col shadow-2xl">
        {/* Header */}
        <div className="p-8 border-b border-white/5 flex flex-col sm:flex-row justify-between items-center gap-4 bg-black/20">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-emerald-500 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <ShieldCheck className="text-black" size={28} />
            </div>
            <div>
              <h2 className="text-2xl font-black italic uppercase tracking-tighter">Admin Control Terminal</h2>
              <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest">Master Oversight System</p>
            </div>
          </div>
          <div className="flex bg-black/40 p-1.5 rounded-2xl gap-2">
            <button 
              onClick={() => setActiveTab('users')}
              className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all flex items-center gap-2 ${activeTab === 'users' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}
            >
              <Users size={14} /> User Database
            </button>
            <button 
              onClick={() => setActiveTab('config')}
              className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all flex items-center gap-2 ${activeTab === 'config' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}
            >
              <Settings size={14} /> App Config
            </button>
          </div>
          <button onClick={onClose} className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl transition-colors text-slate-500">
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8 no-scrollbar">
          {activeTab === 'users' ? (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                 <div className="bg-black/40 p-6 rounded-3xl border border-white/5">
                    <span className="text-[10px] font-black text-slate-500 uppercase block mb-2">Total Deployments</span>
                    <span className="text-4xl font-black italic tracking-tighter">{users.length}</span>
                 </div>
                 <div className="bg-black/40 p-6 rounded-3xl border border-white/5">
                    <span className="text-[10px] font-black text-emerald-500 uppercase block mb-2">Paid Subscriptions</span>
                    <span className="text-4xl font-black italic tracking-tighter text-emerald-400">{users.filter(u => u.isSubscribed).length}</span>
                 </div>
                 <div className="bg-black/40 p-6 rounded-3xl border border-white/5">
                    <span className="text-[10px] font-black text-amber-500 uppercase block mb-2">Active Trials</span>
                    <span className="text-4xl font-black italic tracking-tighter text-amber-400">{users.filter(u => !u.isSubscribed).length}</span>
                 </div>
              </div>

              <div className="bg-black/20 rounded-[2.5rem] border border-white/5 overflow-hidden">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-white/5 text-[10px] font-black uppercase tracking-widest text-slate-500">
                      <th className="px-6 py-5">Trader Identity</th>
                      <th className="px-6 py-5">Contact</th>
                      <th className="px-6 py-5">Status</th>
                      <th className="px-6 py-5">Signup Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {users.map(u => (
                      <tr key={u.id} className="hover:bg-white/5 transition-colors">
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-blue-600/20 flex items-center justify-center text-blue-400 font-bold">
                              {u.name.charAt(0)}
                            </div>
                            <span className="text-sm font-bold">{u.name}</span>
                          </div>
                        </td>
                        <td className="px-6 py-5 font-mono text-xs text-slate-400">{u.phone}</td>
                        <td className="px-6 py-5">
                          {u.isSubscribed ? (
                            <span className="px-3 py-1 bg-emerald-500/20 text-emerald-400 rounded-full text-[9px] font-black uppercase">Institutional</span>
                          ) : (
                            <span className="px-3 py-1 bg-amber-500/20 text-amber-400 rounded-full text-[9px] font-black uppercase">Trial</span>
                          )}
                        </td>
                        <td className="px-6 py-5 text-[10px] text-slate-500 font-bold">
                          {new Date(u.signupDate).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="max-w-2xl mx-auto space-y-8">
              <div className="bg-black/40 p-8 rounded-[2.5rem] border border-white/5 space-y-6">
                <h3 className="text-sm font-black uppercase tracking-widest flex items-center gap-3 text-blue-400">
                  <TrendingUp size={18} /> Engine Parameters
                </h3>
                
                <div className="space-y-4">
                   <div className="flex flex-col gap-2">
                     <label className="text-[10px] font-black uppercase text-slate-500">Signal Confidence Threshold (%)</label>
                     <input 
                       type="range" min="50" max="99" 
                       value={config.minConfidence} 
                       onChange={(e) => setConfig({...config, minConfidence: parseInt(e.target.value)})}
                       className="w-full accent-blue-600"
                     />
                     <div className="flex justify-between text-[10px] font-bold text-blue-400">
                        <span>Current: {config.minConfidence}%</span>
                        <span>Institutional Quality</span>
                     </div>
                   </div>

                   <div className="flex items-center justify-between py-4 border-t border-white/5">
                     <div>
                       <h4 className="text-xs font-black uppercase">System-wide Voice Alarms</h4>
                       <p className="text-[10px] text-slate-500 uppercase mt-1">Force enable audio for all terminals</p>
                     </div>
                     <button 
                       onClick={() => setConfig({...config, alarmEnabled: !config.alarmEnabled})}
                       className={`w-14 h-8 rounded-full transition-all relative ${config.alarmEnabled ? 'bg-blue-600' : 'bg-slate-700'}`}
                     >
                       <div className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-all ${config.alarmEnabled ? 'left-7' : 'left-1'}`} />
                     </button>
                   </div>
                </div>

                <button className="w-full bg-emerald-600 hover:bg-emerald-500 py-4 rounded-2xl font-black uppercase tracking-widest text-black shadow-xl transition-all">
                  Commit Changes to Cloud
                </button>
              </div>

              <div className="bg-blue-600/10 border border-blue-500/20 p-6 rounded-[2rem] flex items-center gap-4">
                 <Database className="text-blue-400" size={24} />
                 <div>
                    <h4 className="text-xs font-black uppercase text-blue-400 italic">Database Health: Operational</h4>
                    <p className="text-[10px] text-slate-400 mt-1 uppercase">All user activity logs synchronized with master node.</p>
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
