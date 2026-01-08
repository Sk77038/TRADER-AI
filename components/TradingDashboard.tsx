import React from 'react';
import { TradeSignal, TradingState } from '../types';
import { 
  TrendingUp, TrendingDown, Clock, AlertTriangle, 
  ShieldCheck, Activity, Target, BrainCircuit, CheckCircle2, Circle, Eye,
  Video, Loader2, X, Download, Zap
} from 'lucide-react';

interface Props {
  state: TradingState;
  onGenerateVideo: () => void;
  onCloseVideo: () => void;
}

const TradingDashboard: React.FC<Props> = ({ state, onGenerateVideo, onCloseVideo }) => {
  const isEmergency = state.currentSignal === 'BUY' || state.currentSignal === 'SELL';
  const isLevelHit = state.isLevelAlertActive;

  const getSignalUI = (signal: TradeSignal) => {
    switch (signal) {
      case 'BUY': return { color: 'text-emerald-400', border: 'border-emerald-500/40', bg: 'bg-emerald-500/10', glow: 'glow-alert-green' };
      case 'SELL': return { color: 'text-red-400', border: 'border-red-500/40', bg: 'bg-red-500/10', glow: 'glow-alert-red' };
      case 'WAIT': return { color: 'text-amber-400', border: 'border-amber-500/40', bg: 'bg-amber-500/5', glow: '' };
      default: return { color: 'text-slate-400', border: 'border-slate-500/40', bg: 'bg-slate-500/5', glow: '' };
    }
  };

  const ui = getSignalUI(state.currentSignal);

  return (
    <div className="flex flex-col gap-4 w-full max-w-md mx-auto p-4 z-10 font-sans max-h-[80vh] overflow-y-auto no-scrollbar pb-32">
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-black/60 backdrop-blur-xl border border-white/5 p-4 rounded-2xl flex justify-between items-center shadow-lg">
          <Activity className="w-4 h-4 text-blue-400" />
          <span className={`text-[11px] font-black uppercase ${state.detectedTrend === 'BULLISH' ? 'text-emerald-400' : state.detectedTrend === 'BEARISH' ? 'text-red-400' : 'text-slate-500'}`}>
            {state.detectedTrend}
          </span>
        </div>
        <div className="bg-black/60 backdrop-blur-xl border border-white/5 p-4 rounded-2xl flex justify-between items-center shadow-lg">
          <Eye className="w-4 h-4 text-emerald-400" />
          <span className="text-[11px] font-black text-white uppercase tracking-widest">Deep Scan</span>
        </div>
      </div>

      <div className={`relative p-8 rounded-[3rem] border-2 transition-all duration-700 backdrop-blur-3xl overflow-hidden ${isLevelHit ? 'border-amber-500 shadow-[0_0_30px_rgba(245,158,11,0.5)] animate-pulse' : ui.border} ${ui.bg} ${ui.glow}`}>
        
        {isLevelHit && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 bg-amber-500 text-black px-4 py-1 rounded-full text-[10px] font-black uppercase flex items-center gap-2 shadow-xl animate-bounce">
            <Zap size={12} fill="currentColor" /> Institutional Level Hit
          </div>
        )}

        <div className="flex justify-between items-start mb-6 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className={`w-2 h-2 rounded-full ${isEmergency ? 'bg-red-500 animate-ping' : 'bg-slate-500'}`} />
              <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-80">Market Intent</span>
            </div>
            <h2 className={`text-7xl font-black italic tracking-tighter leading-none ${ui.color}`}>{state.currentSignal}</h2>
            <div className="flex items-center gap-3 mt-4">
               <div className="h-1.5 w-32 bg-white/10 rounded-full overflow-hidden">
                  <div className={`h-full transition-all duration-1000 ${ui.color.replace('text', 'bg')}`} 
                       style={{ width: `${state.confidence}%` }} />
               </div>
               <span className={`text-[10px] font-mono font-black ${ui.color}`}>{state.confidence}% CONFIDENCE</span>
            </div>
          </div>
          <div className={`p-5 rounded-[2rem] border transition-colors bg-black/40 ${ui.border}`}>
            {state.currentSignal === 'BUY' ? <TrendingUp size={48} className="text-emerald-400" /> : state.currentSignal === 'SELL' ? <TrendingDown size={48} className="text-red-400" /> : <Clock size={48} className="text-amber-400" />}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-6 relative z-10">
           <div className={`bg-black/80 p-4 rounded-3xl border transition-all ${isLevelHit ? 'border-amber-500' : 'border-white/5'}`}>
              <span className="text-[9px] font-black text-emerald-400/60 uppercase block mb-1">Target Zone</span>
              <span className="text-xs font-mono font-black text-white">{state.levels.resistance || "SCANNING..."}</span>
           </div>
           <div className={`bg-black/80 p-4 rounded-3xl border transition-all ${isLevelHit ? 'border-amber-500' : 'border-white/5'}`}>
              <span className="text-[9px] font-black text-red-400/60 uppercase block mb-1">Stop Area</span>
              <span className="text-xs font-mono font-black text-white">{state.levels.support || "SCANNING..."}</span>
           </div>
        </div>

        {(isEmergency || state.lastAnalysis) && (
          <button 
            onClick={onGenerateVideo}
            disabled={state.isVideoGenerating}
            className="w-full mb-6 py-4 rounded-3xl bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 transition-all flex items-center justify-center gap-3 relative z-10 group shadow-xl active:scale-95"
          >
            {state.isVideoGenerating ? (
              <Loader2 className="w-5 h-5 animate-spin text-white" />
            ) : (
              <Video className="w-5 h-5 text-white" />
            )}
            <span className="text-xs font-black uppercase tracking-widest text-white">
              {state.isVideoGenerating ? "Synthesizing Report..." : "Deep Video Analysis"}
            </span>
          </button>
        )}

        <div className="bg-black/40 rounded-3xl p-6 border border-white/5 mb-6 relative z-10">
           <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-4 flex items-center gap-2">
             <Target size={14} className="text-blue-500" />
             Institutional Verifications
           </h3>
           <div className="space-y-3">
              {state.checklist.map(item => (
                <div key={item.id} className="flex items-center justify-between border-b border-white/5 pb-2">
                   <span className="text-[10px] font-bold text-slate-300">{item.label}</span>
                   {item.status === 'verified' ? (
                     <CheckCircle2 size={16} className="text-emerald-400" />
                   ) : (
                     <Circle size={16} className="text-slate-700 animate-pulse" />
                   )}
                </div>
              ))}
           </div>
        </div>

        <div className="p-6 rounded-[2.5rem] bg-black/90 border border-white/10 shadow-2xl relative z-10">
           <div className="flex items-center gap-2 mb-3">
             <BrainCircuit size={14} className="text-blue-400" />
             <span className="text-[10px] font-black uppercase text-blue-400 tracking-tighter">AI Deep Summary</span>
           </div>
           <p className="hindi-text text-[16px] leading-relaxed text-slate-100 font-bold italic">
             {state.lastAnalysis || "Scanning chart for institutional footprints... Deep analysis in progress."}
           </p>
        </div>
      </div>

      {state.generatedVideoUrl && (
        <div className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-xl flex flex-col items-center justify-center p-6">
          <div className="w-full max-w-sm bg-slate-900 rounded-[2.5rem] border border-white/10 overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-white/5 flex justify-between items-center bg-slate-900/50">
               <h3 className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                 <ShieldCheck className="text-blue-400" size={18} />
                 Pro Intelligence Report
               </h3>
               <button onClick={onCloseVideo} className="p-2 hover:bg-white/10 rounded-full transition-colors text-slate-400">
                 <X size={20} />
               </button>
            </div>
            <div className="relative aspect-[9/16] bg-black">
               <video src={state.generatedVideoUrl} controls autoPlay className="w-full h-full object-cover" />
            </div>
            <div className="p-6">
               <a href={state.generatedVideoUrl} download="trader-ai-pro.mp4"
                 className="w-full bg-emerald-600 hover:bg-emerald-500 py-4 rounded-2xl flex items-center justify-center gap-2 font-black uppercase text-[10px] tracking-widest transition-all text-white"
               >
                 <Download size={14} /> Download Report
               </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TradingDashboard;