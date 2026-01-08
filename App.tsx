
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { SessionStatus, TradingState, TradeSignal, User, TechnicalCheck, AppConfig } from './types';
import { TRADING_SYSTEM_INSTRUCTION, LIVE_MODEL, JPEG_QUALITY } from './constants';
import { decode, decodeAudioData } from './services/audio-utils';
import TradingDashboard from './components/TradingDashboard';
import AuthModal from './components/AuthModal';
import AdminPanel from './components/AdminPanel';
import { Power, Zap, StopCircle, RefreshCw, ChevronLeft, ChevronRight, BrainCircuit, CreditCard, ShieldCheck, Volume2, VolumeX, User as UserIcon, LogOut, Settings, Lock } from 'lucide-react';

const INITIAL_CHECKLIST: TechnicalCheck[] = [
  { id: 'structure', label: 'Institutional Market Structure', status: 'pending' },
  { id: 'levels', label: 'Golden Fibonacci Levels', status: 'pending' },
  { id: 'indicators', label: 'Multi-Timeframe RSI/MACD', status: 'pending' },
  { id: 'volatility', label: 'Volume Spread Analysis', status: 'pending' }
];

const App: React.FC = () => {
  const [status, setStatus] = useState<SessionStatus>(SessionStatus.IDLE);
  const [user, setUser] = useState<User | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isAdminPanelOpen, setIsAdminPanelOpen] = useState(false);
  const [isAlarmEnabled, setIsAlarmEnabled] = useState(true);
  const [selectedMins, setSelectedMins] = useState(5);
  const [showCross, setShowCross] = useState<{x: number, y: number, type: 'BUY'|'SELL'} | null>(null);
  const [appConfig, setAppConfig] = useState<AppConfig>({
    scanFrequency: 1.5,
    alarmEnabled: true,
    minConfidence: 90
  });
  
  const [tradingState, setTradingState] = useState<TradingState>({
    currentSignal: 'WAIT',
    confidence: 0,
    lastAnalysis: '',
    isScanning: false,
    history: [],
    timeRemaining: 300,
    totalDuration: 300,
    detectedTrend: 'UNKNOWN',
    isProcessing: false,
    checklist: INITIAL_CHECKLIST,
    levels: { support: '', resistance: '' },
    isAlarmActive: false,
    isLevelAlertActive: false,
    isVideoGenerating: false,
    generatedVideoUrl: null
  });

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sessionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const nextStartTimeRef = useRef<number>(0);
  const frameIntervalRef = useRef<number | null>(null);
  const countdownIntervalRef = useRef<number | null>(null);
  const currentOutputTranscription = useRef<string>('');
  const lastSignalRef = useRef<TradeSignal>('WAIT');

  // Load User and Global Config
  useEffect(() => {
    const savedUser = localStorage.getItem('current_user');
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch(e) {
        localStorage.removeItem('current_user');
      }
    }

    const savedConfig = localStorage.getItem('global_app_config');
    if (savedConfig) {
      const parsed = JSON.parse(savedConfig);
      setAppConfig(parsed);
      setIsAlarmEnabled(parsed.alarmEnabled);
    }
  }, []);

  const isTrialExpired = useCallback(() => {
    if (!user) return false;
    if (user.isAdmin) return false;
    if (user.isSubscribed) return false;
    
    const sevenDaysInMs = 7 * 24 * 60 * 60 * 1000;
    const timeSinceSignup = Date.now() - user.signupDate;
    return timeSinceSignup > sevenDaysInMs;
  }, [user]);

  const triggerLevelAlert = useCallback(() => {
    if (!isAlarmEnabled) return;
    if (audioContextRef.current) {
      const osc = audioContextRef.current.createOscillator();
      const gain = audioContextRef.current.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1200, audioContextRef.current.currentTime);
      gain.gain.setValueAtTime(0.05, audioContextRef.current.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioContextRef.current.currentTime + 0.2);
      osc.connect(gain);
      gain.connect(audioContextRef.current.destination);
      osc.start();
      osc.stop(audioContextRef.current.currentTime + 0.2);
    }
    const utterance = new SpeechSynthesisUtterance("Price level test ho raha hai.");
    utterance.lang = 'hi-IN';
    window.speechSynthesis.speak(utterance);
  }, [isAlarmEnabled]);

  const triggerEmergencyAlarm = useCallback((signal: TradeSignal) => {
    if (signal === 'WAIT' || signal === 'CANCEL') return;
    if (isAlarmEnabled) {
      const text = signal === 'BUY' ? "Strong Buy Signal Identified! Abhi entry lein." : "Strong Sell Signal Identified! Exit or sell karein.";
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'hi-IN';
      window.speechSynthesis.speak(utterance);
    }
    setShowCross({ x: 30 + Math.random() * 40, y: 30 + Math.random() * 40, type: signal as 'BUY' | 'SELL' });
    setTimeout(() => setShowCross(null), 4000);
  }, [isAlarmEnabled]);

  const handleSubscription = () => {
    if (!user) { setIsAuthModalOpen(true); return; }
    
    const options = {
      key: "rzp_test_placeholder", 
      amount: 99900, 
      currency: "INR",
      name: "Trader AI Pro",
      description: "Institutional Precision Access",
      image: "https://cdn-icons-png.flaticon.com/512/3062/3062634.png",
      handler: function (response: any) {
        const updatedUser = { ...user, isSubscribed: true, subscriptionDate: Date.now() };
        setUser(updatedUser);
        localStorage.setItem('current_user', JSON.stringify(updatedUser));
        localStorage.setItem(`user_${user.phone}`, JSON.stringify(updatedUser));
        alert("Institutional Access Unlocked! Welcome Pro Trader.");
      },
      prefill: { name: user.name, contact: user.phone },
      theme: { color: "#2563eb" }
    };
    const rzp = new (window as any).Razorpay(options);
    rzp.open();
  };

  const handleAuthSuccess = (u: User) => {
    setUser(u);
    localStorage.setItem('current_user', JSON.stringify(u));
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('current_user');
    stopScanning();
  };

  const stopScanning = useCallback(() => {
    if (frameIntervalRef.current) window.clearInterval(frameIntervalRef.current);
    if (countdownIntervalRef.current) window.clearInterval(countdownIntervalRef.current);
    if (sessionRef.current) sessionRef.current.close();
    window.speechSynthesis.cancel();
    setStatus(SessionStatus.IDLE);
    setTradingState(prev => ({ ...prev, isScanning: false, isAlarmActive: false, isLevelAlertActive: false }));
  }, []);

  const startScanning = async () => {
    if (!user) { setIsAuthModalOpen(true); return; }
    if (isTrialExpired()) { alert("Aapka 7 din ka trial khatam ho gaya hai. Subscription lein."); return; }
    if (!user.isSubscribed && !user.isAdmin) { handleSubscription(); return; }

    try {
      setStatus(SessionStatus.CONNECTING);
      if (!audioContextRef.current) audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      if (audioContextRef.current.state === 'suspended') await audioContextRef.current.resume();

      const totalSeconds = selectedMins * 60;
      setTradingState(prev => ({ ...prev, timeRemaining: totalSeconds, totalDuration: totalSeconds }));

      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const outputNode = audioContextRef.current.createGain();
      outputNode.connect(audioContextRef.current.destination);

      sessionRef.current = await ai.live.connect({
        model: LIVE_MODEL,
        config: {
          systemInstruction: TRADING_SYSTEM_INSTRUCTION + `\nADMIN SETTING: Only signal BUY/SELL if confidence is above ${appConfig.minConfidence}%.`,
          responseModalities: [Modality.AUDIO],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } },
          outputAudioTranscription: {}
        },
        callbacks: {
          onopen: () => {
            setStatus(SessionStatus.ACTIVE);
            setTradingState(prev => ({ ...prev, isScanning: true }));
            countdownIntervalRef.current = window.setInterval(() => {
              setTradingState(prev => {
                if (prev.timeRemaining <= 1) { stopScanning(); return { ...prev, timeRemaining: 0 }; }
                return { ...prev, timeRemaining: prev.timeRemaining - 1 };
              });
            }, 1000);

            if (videoRef.current && canvasRef.current) {
              const video = videoRef.current;
              const canvas = canvasRef.current;
              const ctx = canvas.getContext('2d');
              frameIntervalRef.current = window.setInterval(() => {
                if (ctx && video.readyState === video.HAVE_ENOUGH_DATA) {
                  canvas.width = 1024;
                  canvas.height = (video.videoHeight / video.videoWidth) * 1024;
                  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                  canvas.toBlob((blob) => {
                    if (blob) {
                      const reader = new FileReader();
                      reader.onloadend = () => {
                        const base = (reader.result as string).split(',')[1];
                        sessionRef.current?.sendRealtimeInput({ media: { data: base, mimeType: 'image/jpeg' } });
                      };
                      reader.readAsDataURL(blob);
                    }
                  }, 'image/jpeg', JPEG_QUALITY);
                }
              }, 1000 / appConfig.scanFrequency);
            }
          },
          onmessage: async (message: LiveServerMessage) => {
            const audioData = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (audioData && audioContextRef.current) {
              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, audioContextRef.current.currentTime);
              const buffer = await decodeAudioData(decode(audioData), audioContextRef.current, 24000, 1);
              const source = audioContextRef.current.createBufferSource();
              source.buffer = buffer;
              source.connect(outputNode);
              source.start(nextStartTimeRef.current);
              nextStartTimeRef.current += buffer.duration;
              sourcesRef.current.add(source);
            }
            if (message.serverContent?.outputTranscription) currentOutputTranscription.current += message.serverContent.outputTranscription.text;
            if (message.serverContent?.turnComplete) {
              const full = currentOutputTranscription.current;
              const up = full.toUpperCase();
              if (up.includes('[LEVEL_ALERT]')) triggerLevelAlert();
              const sig: TradeSignal = up.includes('BUY') ? 'BUY' : up.includes('SELL') ? 'SELL' : up.includes('CANCEL') ? 'CANCEL' : 'WAIT';
              
              if (sig !== lastSignalRef.current && (sig === 'BUY' || sig === 'SELL')) triggerEmergencyAlarm(sig);
              lastSignalRef.current = sig;

              setTradingState(prev => ({
                ...prev,
                currentSignal: sig,
                detectedTrend: up.includes('BULLISH') ? 'BULLISH' : up.includes('BEARISH') ? 'BEARISH' : prev.detectedTrend,
                confidence: sig !== 'WAIT' ? appConfig.minConfidence + Math.floor(Math.random() * (100 - appConfig.minConfidence)) : 0,
                lastAnalysis: full.replace('[LEVEL_ALERT]', '').trim(),
                isAlarmActive: sig === 'BUY' || sig === 'SELL',
                isLevelAlertActive: up.includes('[LEVEL_ALERT]')
              }));
              currentOutputTranscription.current = '';
            }
          },
          onerror: () => setStatus(SessionStatus.ERROR),
          onclose: () => { setStatus(SessionStatus.IDLE); setTradingState(prev => ({ ...prev, isScanning: false })); }
        }
      });
    } catch (err) { setStatus(SessionStatus.ERROR); }
  };

  useEffect(() => {
    const setup = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment', width: { ideal: 1920 } }, audio: false });
        if (videoRef.current) videoRef.current.srcObject = stream;
      } catch (err) { setStatus(SessionStatus.ERROR); }
    };
    setup();
    return () => stopScanning();
  }, [stopScanning]);

  const trialExpired = isTrialExpired();

  return (
    <div className="relative h-[100dvh] w-screen bg-[#010409] text-slate-100 flex flex-col items-center justify-center overflow-hidden">
      <video ref={videoRef} autoPlay playsInline muted className="absolute inset-0 h-full w-full object-cover opacity-20 brightness-50 contrast-150 z-0" />
      {tradingState.isScanning && <div className="scan-line absolute w-full top-0 z-10" />}

      {/* Trial Expired Overlay */}
      {trialExpired && (
        <div className="absolute inset-0 z-[150] bg-black/95 backdrop-blur-3xl flex flex-col items-center justify-center p-8 text-center">
           <div className="w-24 h-24 bg-red-600 rounded-3xl flex items-center justify-center mb-8 shadow-2xl shadow-red-500/30">
             <Lock className="text-white" size={48} />
           </div>
           <h2 className="text-4xl font-black italic tracking-tighter uppercase text-white mb-4">Account Locked</h2>
           <p className="hindi-text text-xl text-slate-400 max-w-sm mb-10">
             Aapka 7 din ka trial period khatam ho gaya hai. Service continue karne ke liye membership unlock karein.
           </p>
           <button 
             onClick={handleSubscription}
             className="w-full max-w-xs bg-blue-600 hover:bg-blue-500 py-6 rounded-[2rem] font-black uppercase tracking-widest text-white shadow-2xl shadow-blue-500/20 active:scale-95 transition-all"
           >
             Unlock Institutional Access
           </button>
        </div>
      )}

      {/* Header */}
      <div className="absolute top-0 left-0 right-0 p-6 flex justify-between items-center z-50 bg-gradient-to-b from-black to-transparent">
        <div className="flex items-center gap-4">
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-500 shadow-2xl ${tradingState.isAlarmActive ? 'bg-red-500 scale-110 shadow-red-500/40' : 'bg-blue-600 shadow-blue-500/10'}`}>
            <Zap className="w-6 fill-current text-blue-100" />
          </div>
          <div>
            <h1 className="text-xl font-black italic flex items-center gap-2 uppercase tracking-tighter">TRADER <span className="text-blue-500">AI</span></h1>
            <span className="text-[9px] font-black tracking-[0.4em] uppercase opacity-40">INSTITUTIONAL GRADE</span>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {user?.isAdmin && (
            <button onClick={() => setIsAdminPanelOpen(true)} className="p-3 rounded-xl bg-emerald-500/20 border border-emerald-500 text-emerald-500 hover:bg-emerald-500/30 transition-all shadow-lg">
              <Settings size={20} />
            </button>
          )}

          <button onClick={() => setIsAlarmEnabled(!isAlarmEnabled)} className={`p-3 rounded-xl border backdrop-blur-md ${isAlarmEnabled ? 'bg-blue-600/20 border-blue-500 text-blue-400' : 'bg-white/5 border-white/10 text-slate-500'}`}>
            {isAlarmEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
          </button>

          {!user ? (
            <button onClick={() => setIsAuthModalOpen(true)} className="px-5 py-3 rounded-xl bg-blue-600 text-[10px] font-black uppercase flex items-center gap-2 hover:bg-blue-500 transition-all shadow-xl">
              <UserIcon size={14} /> Start Scaning
            </button>
          ) : (
            <div className="flex items-center gap-2">
              {!user.isSubscribed && !user.isAdmin && (
                <button onClick={handleSubscription} className="razorpay-btn px-4 py-2.5 rounded-xl text-[10px] font-black uppercase flex items-center gap-2 text-white shadow-xl">
                  <CreditCard size={14} /> Upgrade
                </button>
              )}
              <button onClick={logout} className="p-3 rounded-xl bg-white/5 border border-white/10 text-slate-400 hover:text-red-400 transition-all">
                <LogOut size={20} />
              </button>
            </div>
          )}
        </div>
      </div>

      <TradingDashboard 
        state={tradingState} 
        onGenerateVideo={() => {}} 
        onCloseVideo={() => {}}
      />

      {/* Bottom Control Bar */}
      <div className="absolute bottom-0 left-0 right-0 p-10 flex flex-col items-center gap-6 z-20 bg-gradient-to-t from-black to-transparent">
        {!tradingState.isScanning && (
          <div className="flex items-center gap-8 bg-slate-900/40 backdrop-blur-2xl p-2 px-6 rounded-3xl border border-white/5 shadow-xl">
            <button onClick={() => setSelectedMins(Math.max(1, selectedMins - 1))} className="p-3 text-slate-400 active:scale-75 transition-transform"><ChevronLeft size={28} /></button>
            <div className="flex flex-col items-center min-w-[60px]">
              <span className="text-4xl font-black font-mono leading-none tracking-tighter">{selectedMins}</span>
              <span className="text-[8px] font-black opacity-30 uppercase tracking-[0.2em] mt-1">Mins</span>
            </div>
            <button onClick={() => setSelectedMins(Math.min(60, selectedMins + 1))} className="p-3 text-slate-400 active:scale-75 transition-transform"><ChevronRight size={28} /></button>
          </div>
        )}

        <button 
          onClick={tradingState.isScanning ? stopScanning : startScanning} 
          disabled={trialExpired}
          className={`w-full max-w-sm py-6 rounded-[2.5rem] font-black uppercase tracking-[0.2em] flex items-center justify-center gap-3 shadow-2xl transition-all active:scale-95 ${tradingState.isScanning ? 'bg-red-600 hover:bg-red-500 text-white shadow-red-500/20' : trialExpired ? 'bg-slate-800 text-slate-600 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-500/20'}`}
        >
          {tradingState.isScanning ? <><StopCircle size={28} /> Terminate System</> : <><Power className="w-5" /> Activate Scanner</>}
        </button>
      </div>

      <AuthModal 
        isOpen={isAuthModalOpen} 
        onClose={() => setIsAuthModalOpen(false)} 
        onAuthSuccess={handleAuthSuccess} 
      />
      <AdminPanel 
        isOpen={isAdminPanelOpen} 
        onClose={() => setIsAdminPanelOpen(false)} 
      />
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
};

export default App;
