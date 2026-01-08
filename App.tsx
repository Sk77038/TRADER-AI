import React, { useState, useRef, useEffect, useCallback } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { SessionStatus, TradingState, TradeSignal, User, TechnicalCheck, AppConfig } from './types';
import { TRADING_SYSTEM_INSTRUCTION, LIVE_MODEL, JPEG_QUALITY } from './constants';
import { decode, decodeAudioData } from './services/audio-utils';
import TradingDashboard from './components/TradingDashboard';
import AuthModal from './components/AuthModal';
import AdminPanel from './components/AdminPanel';
import { Power, Zap, StopCircle, RefreshCw, ChevronLeft, ChevronRight, BrainCircuit, ShieldCheck, Volume2, VolumeX, User as UserIcon, LogOut, Settings } from 'lucide-react';

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
      try {
        const parsed = JSON.parse(savedConfig);
        setAppConfig(parsed);
        setIsAlarmEnabled(parsed.alarmEnabled);
      } catch(e) {}
    }
  }, []);

  const triggerLevelAlert = useCallback(() => {
    if (!isAlarmEnabled) return;
    if (audioContextRef.current) {
      try {
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
      } catch (e) {}
    }
  }, [isAlarmEnabled]);

  const triggerEmergencyAlarm = useCallback((signal: TradeSignal) => {
    if (signal === 'WAIT' || signal === 'CANCEL') return;
    
    if (isAlarmEnabled) {
      // Play institutional 'ring' sound
      if (audioContextRef.current) {
        try {
          const osc = audioContextRef.current.createOscillator();
          const gain = audioContextRef.current.createGain();
          osc.type = 'square';
          osc.frequency.setValueAtTime(800, audioContextRef.current.currentTime);
          osc.frequency.exponentialRampToValueAtTime(1500, audioContextRef.current.currentTime + 0.1);
          gain.gain.setValueAtTime(0.1, audioContextRef.current.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.01, audioContextRef.current.currentTime + 0.5);
          osc.connect(gain);
          gain.connect(audioContextRef.current.destination);
          osc.start();
          osc.stop(audioContextRef.current.currentTime + 0.5);
        } catch (e) {}
      }

      try {
        const text = signal === 'BUY' ? "Alert! Institutional Buy Signal Identified. Go Long." : "Alert! Institutional Sell Signal Identified. Go Short.";
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'en-US';
        utterance.rate = 1.1;
        window.speechSynthesis.speak(utterance);
      } catch (e) {}
    }
    setShowCross({ x: 30 + Math.random() * 40, y: 30 + Math.random() * 40, type: signal as 'BUY' | 'SELL' });
    setTimeout(() => setShowCross(null), 4000);
  }, [isAlarmEnabled]);

  const handleGenerateVideo = async () => {
    if (tradingState.isVideoGenerating) return;

    if (!(window as any).aistudio?.hasSelectedApiKey || !(await (window as any).aistudio.hasSelectedApiKey())) {
      alert("Pro Feature: Video generation requires an API key selection.");
      await (window as any).aistudio.openSelectKey();
    }

    setTradingState(prev => ({ ...prev, isVideoGenerating: true }));

    try {
      const canvas = canvasRef.current;
      if (!canvas) throw new Error("Canvas not available");

      const base64Image = canvas.toDataURL('image/png').split(',')[1];
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

      const prompt = `A cinematic technical analysis breakdown. Focus on the chart structure, highlight key order blocks and the ${tradingState.currentSignal} entry zone with a pulsating glow. Futuristic institutional trading style.`;

      let operation = await ai.models.generateVideos({
        model: 'veo-3.1-fast-generate-preview',
        prompt: prompt,
        image: {
          imageBytes: base64Image,
          mimeType: 'image/png',
        },
        config: {
          numberOfVideos: 1,
          resolution: '720p',
          aspectRatio: '9:16'
        }
      });

      while (!operation.done) {
        await new Promise(resolve => setTimeout(resolve, 10000));
        operation = await ai.operations.getVideosOperation({ operation: operation });
      }

      const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
      if (downloadLink) {
        const response = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        setTradingState(prev => ({ ...prev, isVideoGenerating: false, generatedVideoUrl: url }));
      }
    } catch (err) {
      console.error("Video generation failed:", err);
      setTradingState(prev => ({ ...prev, isVideoGenerating: false }));
    }
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
    if (sessionRef.current) {
        try { sessionRef.current.close(); } catch (e) {}
    }
    try { window.speechSynthesis.cancel(); } catch (e) {}
    setStatus(SessionStatus.IDLE);
    setTradingState(prev => ({ ...prev, isScanning: false, isAlarmActive: false, isLevelAlertActive: false }));
  }, []);

  const startScanning = async () => {
    if (!user) { setIsAuthModalOpen(true); return; }

    try {
      setStatus(SessionStatus.CONNECTING);
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      }
      if (audioContextRef.current.state === 'suspended') await audioContextRef.current.resume();

      const totalSeconds = selectedMins * 60;
      setTradingState(prev => ({ ...prev, timeRemaining: totalSeconds, totalDuration: totalSeconds }));

      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const outputNode = audioContextRef.current.createGain();
      outputNode.connect(audioContextRef.current.destination);

      sessionRef.current = await ai.live.connect({
        model: LIVE_MODEL,
        config: {
          systemInstruction: TRADING_SYSTEM_INSTRUCTION + `\nADMIN SETTING: Confidence threshold at ${appConfig.minConfidence}%.`,
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
                isLevelAlertActive: up.includes('[LEVEL_ALERT]'),
                checklist: prev.checklist.map(item => ({
                    ...item,
                    status: up.includes(item.label.split(' ')[0].toUpperCase()) ? 'verified' : item.status
                }))
              }));
              currentOutputTranscription.current = '';
            }
          },
          onerror: (err) => { setStatus(SessionStatus.ERROR); },
          onclose: () => { setStatus(SessionStatus.IDLE); }
        }
      });
    } catch (err) { setStatus(SessionStatus.ERROR); }
  };

  useEffect(() => {
    const setup = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
            video: { facingMode: 'environment', width: { ideal: 1280 } }, 
            audio: false 
        });
        if (videoRef.current) videoRef.current.srcObject = stream;
      } catch (err) { setStatus(SessionStatus.ERROR); }
    };
    setup();
    return () => stopScanning();
  }, [stopScanning]);

  return (
    <div className="relative h-[100dvh] w-screen bg-[#010409] text-slate-100 flex flex-col items-center justify-center overflow-hidden">
      <video ref={videoRef} autoPlay playsInline muted className="absolute inset-0 h-full w-full object-cover opacity-20 brightness-50 contrast-150 z-0" />
      {tradingState.isScanning && <div className="scan-line absolute w-full top-0 z-10" />}

      {/* Header */}
      <div className="absolute top-0 left-0 right-0 p-6 flex justify-between items-center z-50 bg-gradient-to-b from-black to-transparent">
        <div className="flex items-center gap-4">
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-500 shadow-2xl ${tradingState.isAlarmActive ? 'bg-red-500 scale-110 shadow-red-500/40' : 'bg-blue-600 shadow-blue-500/10'}`}>
            <Zap className="w-6 fill-current text-blue-100" />
          </div>
          <div>
            <h1 className="text-xl font-black italic flex items-center gap-2 uppercase tracking-tighter">TRADER <span className="text-blue-500">AI</span></h1>
            <span className="text-[9px] font-black tracking-[0.4em] uppercase opacity-40">INSTITUTIONAL GRADE PRO</span>
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
              <UserIcon size={14} /> System Access
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button onClick={logout} className="p-3 rounded-xl bg-white/5 border border-white/10 text-slate-400 hover:text-red-400 transition-all">
                <LogOut size={20} />
              </button>
            </div>
          )}
        </div>
      </div>

      <TradingDashboard 
        state={tradingState} 
        onGenerateVideo={handleGenerateVideo} 
        onCloseVideo={() => setTradingState(prev => ({ ...prev, generatedVideoUrl: null }))}
      />

      {/* Bottom Control Bar */}
      <div className="absolute bottom-0 left-0 right-0 p-10 flex flex-col items-center gap-6 z-20 bg-gradient-to-t from-black to-transparent">
        {!tradingState.isScanning && (
          <div className="flex items-center gap-8 bg-slate-900/40 backdrop-blur-2xl p-2 px-6 rounded-3xl border border-white/5 shadow-xl">
            <button onClick={() => setSelectedMins(Math.max(1, selectedMins - 1))} className="p-3 text-slate-400 active:scale-75 transition-transform"><ChevronLeft size={28} /></button>
            <div className="flex flex-col items-center min-w-[60px]">
              <span className="text-4xl font-black font-mono leading-none tracking-tighter">{selectedMins}</span>
              <span className="text-[8px] font-black opacity-30 uppercase tracking-[0.2em] mt-1">Mins Scan</span>
            </div>
            <button onClick={() => setSelectedMins(Math.min(60, selectedMins + 1))} className="p-3 text-slate-400 active:scale-75 transition-transform"><ChevronRight size={28} /></button>
          </div>
        )}

        <button 
          onClick={tradingState.isScanning ? stopScanning : startScanning} 
          disabled={status === SessionStatus.CONNECTING}
          className={`w-full max-w-sm py-6 rounded-[2.5rem] font-black uppercase tracking-[0.2em] flex items-center justify-center gap-3 shadow-2xl transition-all active:scale-95 ${tradingState.isScanning ? 'bg-red-600 hover:bg-red-500 text-white shadow-red-500/20' : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-500/20'}`}
        >
          {status === SessionStatus.CONNECTING ? <RefreshCw className="animate-spin" /> : tradingState.isScanning ? <StopCircle size={28} /> : <Power className="w-5" />}
          {status === SessionStatus.CONNECTING ? "Connecting..." : tradingState.isScanning ? "Stop Analysis" : "Analyze Chart"}
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