
import React from 'react';
import { TradeSignal, TradingState } from '../types';
import { 
  TrendingUp, TrendingDown, Clock, AlertTriangle, 
  ShieldCheck, Tag, Timer, Target, BarChart3, Activity
} from 'lucide-react';

interface Props {
  state: TradingState;
}

const TradingDashboard: React.FC<Props> = ({ state }) => {
  const getSignalColor = (signal: TradeSignal) => {
    switch (signal) {
      case 'BUY': return 'text-emerald-400 border-emerald-500/40 bg-emerald-500/5';
      case 'SELL': return 'text-rose-400 border-rose-500/40 bg-rose-500/5';
      case 'WAIT': return 'text-amber-400 border-amber-500/40 bg-amber-500/5';
      default: return 'text-slate-400 border-slate-500/40 bg-slate-500/5';
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const currentTurn = state.history[0];

  return (
    <div className="flex flex-col gap-3 w-full max-w-lg mx-auto p-4 z-10 font-sans">
      {/* Top HUD */}
      <div className="grid grid-cols-3 gap-2 mb-2">
        <div className="bg-slate-900/80 backdrop-blur-md border border-slate-800 p-2 rounded-xl flex items-center gap-2">
          <Activity className="w-3.5 h-3.5 text-blue-400" />
          <div className="flex flex-col">
            <span className="text-[9px] text-slate-500 uppercase font-bold tracking-tighter">Trend</span>
            <span className={`text-[10px] font-black ${state.detectedTrend === 'BULLISH' ? 'text-emerald-400' : state.detectedTrend === 'BEARISH' ? 'text-rose-400' : 'text-slate-300'}`}>
              {state.detectedTrend}
            </span>
          </div>
        </div>
        <div className="bg-slate-900/80 backdrop-blur-md border border-slate-800 p-2 rounded-xl flex items-center gap-2">
          <Timer className="w-3.5 h-3.5 text-amber-400" />
          <div className="flex flex-col">
            <span className="text-[9px] text-slate-500 uppercase font-bold tracking-tighter">Session</span>
            <span className="text-[10px] font-mono font-bold text-white">{formatTime(state.timeRemaining)}</span>
          </div>
        </div>
        <div className="bg-slate-900/80 backdrop-blur-md border border-slate-800 p-2 rounded-xl flex items-center gap-2">
          <BarChart3 className="w-3.5 h-3.5 text-purple-400" />
          <div className="flex flex-col">
            <span className="text-[9px] text-slate-500 uppercase font-bold tracking-tighter">Confidence</span>
            <span className="text-[10px] font-mono font-bold text-white">{state.confidence}%</span>
          </div>
        </div>
      </div>

      {/* Main Signal Area */}
      <div className={`relative p-6 rounded-3xl border-2 transition-all duration-700 backdrop-blur-xl ${getSignalColor(state.currentSignal)} shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden`}>
        {/* Glow effect */}
        <div className={`absolute -top-24 -right-24 w-48 h-48 rounded-full blur-[80px] opacity-20 ${state.currentSignal === 'BUY' ? 'bg-emerald-400' : state.currentSignal === 'SELL' ? 'bg-rose-400' : 'bg-amber-400'}`} />
        
        <div className="flex justify-between items-start mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2 h-2 rounded-full bg-current animate-pulse" />
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-60">Trading Intelligence</span>
            </div>
            <h2 className="text-6xl font-black italic tracking-tighter leading-none">{state.currentSignal}</h2>
          </div>
          <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
            {state.currentSignal === 'BUY' ? <TrendingUp size={40} /> : state.currentSignal === 'SELL' ? <TrendingDown size={40} /> : <Clock size={40} />}
          </div>
        </div>

        {/* Levels Panel */}
        {state.currentSignal !== 'WAIT' && (
          <div className="grid grid-cols-2 gap-3 mb-6">
            <div className="bg-black/30 p-3 rounded-2xl border border-white/5">
              <div className="flex items-center gap-2 mb-1">
                <Target className="w-3 h-3 text-emerald-400" />
                <span className="text-[10px] uppercase font-bold opacity-50">Target Zone</span>
              </div>
              <span className="text-sm font-mono font-bold">Estimated Take Profit</span>
            </div>
            <div className="bg-black/30 p-3 rounded-2xl border border-white/5">
              <div className="flex items-center gap-2 mb-1">
                <ShieldCheck className="w-3 h-3 text-rose-400" />
                <span className="text-[10px] uppercase font-bold opacity-50">Risk Management</span>
              </div>
              <span className="text-sm font-mono font-bold">Stop Loss Logic</span>
            </div>
          </div>
        )}

        <div className="space-y-3">
          {currentTurn?.detectedIndicators && currentTurn.detectedIndicators.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {currentTurn.detectedIndicators.map(ind => (
                <span key={ind} className="px-2 py-0.5 rounded-md bg-white/10 text-[9px] font-bold uppercase tracking-tight border border-white/10 flex items-center gap-1">
                  <div className="w-1 h-1 rounded-full bg-current" />
                  {ind}
                </span>
              ))}
            </div>
          )}
          
          <div className="p-4 rounded-2xl bg-black/40 border border-white/5 min-h-[80px]">
             <p className="hindi-text text-sm leading-relaxed text-slate-200">
               {state.lastAnalysis || "चार्ट को पोजीशन करें। एआई रीयल-टाइम डेटा विश्लेषण शुरू करने के लिए तैयार है।"}
             </p>
          </div>
        </div>
      </div>

      {/* Terminal History */}
      <div className="mt-2">
        <div className="flex items-center gap-2 px-1 mb-2 opacity-40">
           <BarChart3 size={12} />
           <span className="text-[10px] font-bold uppercase tracking-widest">Analysis Logs</span>
        </div>
        <div className="space-y-1.5 max-h-32 overflow-y-auto no-scrollbar mask-fade">
          {state.history.map((turn, idx) => (
            <div key={turn.timestamp} className={`flex items-start gap-3 p-2.5 rounded-xl border border-white/5 bg-slate-900/40 text-[10px] ${idx === 0 ? 'opacity-100' : 'opacity-40'}`}>
              <span className="font-mono text-slate-500 whitespace-nowrap">{new Date(turn.timestamp).toLocaleTimeString([], {hour12: false, minute:'2-digit', second:'2-digit'})}</span>
              <span className="hindi-text line-clamp-2">{turn.outputTranscription}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default TradingDashboard;
