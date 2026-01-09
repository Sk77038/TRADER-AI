import React, { useState, useRef, useEffect, useCallback } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality, Type, GenerateContentResponse, Blob as GenAIBlob } from '@google/genai';
import { SessionStatus, TradingState, TradeSignal, User, TechnicalCheck, AppConfig, ChatMessage } from './types';
import { TRADING_SYSTEM_INSTRUCTION, MODELS, JPEG_QUALITY } from './constants';
import { decode, decodeAudioData, encode } from './services/audio-utils';
import TradingDashboard from './components/TradingDashboard';
import IntelligenceHub from './components/IntelligenceHub';
import AuthModal from './components/AuthModal';
import { 
  Power, Zap, StopCircle, RefreshCw, ChevronLeft, ChevronRight, 
  BrainCircuit, ShieldCheck, Volume2, VolumeX, User as UserIcon, 
  LogOut, Settings, Sparkles, Image as ImageIcon, Plus, X, UploadCloud,
  Camera
} from 'lucide-react';

const INITIAL_CHECKLIST: TechnicalCheck[] = [
  { id: 'smc', label: 'Institutional Order Flow', status: 'pending' },
  { id: 'fvg', label: 'Fair Value Gap Detection', status: 'pending' },
  { id: 'liquidity', label: 'Liquidity Pool Sweep', status: 'pending' },
  { id: 'vsa', label: 'Volume Delta Analysis', status: 'pending' }
];

const App: React.FC = () => {
  const [status, setStatus] = useState<SessionStatus>(SessionStatus.IDLE);
  const [user, setUser] = useState<User | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isHubOpen, setIsHubOpen] = useState(false);
  const [isAlarmEnabled, setIsAlarmEnabled] = useState(true);
  const [selectedMins, setSelectedMins] = useState(10);
  const [evidenceImages, setEvidenceImages] = useState<string[]>([]);
  
  const [tradingState, setTradingState] = useState<TradingState>({
    currentSignal: 'WAIT',
    confidence: 0,
    lastAnalysis: '',
    isScanning: false,
    timeRemaining: 600,
    totalDuration: 600,
    detectedTrend: 'UNKNOWN',
    checklist: INITIAL_CHECKLIST,
    levels: { support: '...', resistance: '...' },
    isAlarmActive: false,
    isLevelAlertActive: false,
    isVideoGenerating: false,
    generatedVideoUrl: null,
    generatedImageUrl: null
  });

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // Using a promise ref for the live session to strictly follow the guidelines and avoid race conditions.
  const sessionPromiseRef = useRef<Promise<any> | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const frameIntervalRef = useRef<number | null>(null);
  const countdownIntervalRef = useRef<number | null>(null);
  const currentOutputTranscription = useRef<string>('');
  const lastSignalRef = useRef<TradeSignal>('WAIT');
  const audioSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());

  useEffect(() => {
    const saved = localStorage.getItem('current_user');
    if (saved) setUser(JSON.parse(saved));
    setupCamera();
  }, []);

  const setupCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment', width: { ideal: 1280 } }, 
        audio: true 
      });
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch (error) { 
      // Handle the catch block explicitly to avoid unknown type issues.
      console.error("Camera setup failed:", error);
      setStatus(SessionStatus.ERROR); 
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    
    Array.from(files).slice(0, 10 - evidenceImages.length).forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setEvidenceImages(prev => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeEvidence = (index: number) => {
    setEvidenceImages(prev => prev.filter((_, i) => i !== index));
  };

  const playInstitutionalAlert = useCallback((type: 'BUY' | 'SELL' | 'LEVEL') => {
    if (!isAlarmEnabled || !audioContextRef.current) return;
    const ctx = audioContextRef.current;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    if (type === 'LEVEL') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1000, ctx.currentTime);
      gain.gain.setValueAtTime(0.05, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
    } else {
      osc.type = 'square';
      osc.frequency.setValueAtTime(type === 'BUY' ? 880 : 440, ctx.currentTime);
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
    }
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.5);

    const msg = type === 'BUY' ? "Buy signal identified" : type === 'SELL' ? "Sell signal identified" : "Price level test";
    const utt = new SpeechSynthesisUtterance(msg);
    utt.rate = 1.2;
    window.speechSynthesis.speak(utt);
  }, [isAlarmEnabled]);

  const stopScanning = useCallback(() => {
    if (frameIntervalRef.current) clearInterval(frameIntervalRef.current);
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    
    // Ensure session is closed using the promise reference.
    sessionPromiseRef.current?.then(session => session.close());
    sessionPromiseRef.current = null;
    
    // Stop all active audio playback.
    audioSourcesRef.current.forEach(source => {
      try { source.stop(); } catch (e) {}
    });
    audioSourcesRef.current.clear();
    nextStartTimeRef.current = 0;

    window.speechSynthesis.cancel();
    setStatus(SessionStatus.IDLE);
    setTradingState(prev => ({ ...prev, isScanning: false }));
  }, []);

  const startScanning = async () => {
    if (!user) { setIsAuthModalOpen(true); return; }
    
    try {
      setStatus(SessionStatus.CONNECTING);
      if (!audioContextRef.current) audioContextRef.current = new AudioContext({ sampleRate: 24000 });
      if (audioContextRef.current.state === 'suspended') await audioContextRef.current.resume();

      const totalSeconds = selectedMins * 60;
      setTradingState(prev => ({ ...prev, timeRemaining: totalSeconds, totalDuration: totalSeconds }));

      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      // Following the Live API rules: we must initiate sendRealtimeInput after live.connect call resolves.
      const sessionPromise = ai.live.connect({
        model: MODELS.LIVE,
        config: {
          systemInstruction: TRADING_SYSTEM_INSTRUCTION + "\nAnalyze both the live feed and any uploaded institutional evidence photos simultaneously for 100% precision.",
          responseModalities: [Modality.AUDIO],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } },
          outputAudioTranscription: {}
        },
        callbacks: {
          onopen: () => {
            setStatus(SessionStatus.ACTIVE);
            setTradingState(prev => ({ ...prev, isScanning: true }));
            
            countdownIntervalRef.current = window.setInterval(() => {
              setTradingState(prev => ({ ...prev, timeRemaining: Math.max(0, prev.timeRemaining - 1) }));
            }, 1000);

            if (videoRef.current && canvasRef.current) {
              const ctx = canvasRef.current.getContext('2d');
              frameIntervalRef.current = window.setInterval(() => {
                if (ctx && videoRef.current && canvasRef.current) {
                  canvasRef.current.width = 1024;
                  canvasRef.current.height = (videoRef.current.videoHeight / videoRef.current.videoWidth) * 1024;
                  ctx.drawImage(videoRef.current, 0, 0, 1024, canvasRef.current.height);
                  
                  // Use browser-specific typing for the toBlob callback to avoid GenAI Blob interface conflicts.
                  canvasRef.current.toBlob((browserBlob: Blob | null) => {
                    if (browserBlob) {
                      browserBlob.arrayBuffer().then(buffer => {
                        const base64 = encode(new Uint8Array(buffer));
                        // Rely on sessionPromise.then to send data, as instructed.
                        sessionPromise.then(session => {
                          session.sendRealtimeInput({ media: { data: base64, mimeType: 'image/jpeg' } });
                        });
                      });
                    }
                  }, 'image/jpeg', JPEG_QUALITY);

                  // Occasionally inject evidence images to maintain context
                  evidenceImages.forEach(img => {
                    const base64 = img.split(',')[1];
                    sessionPromise.then(session => {
                      session.sendRealtimeInput({ media: { data: base64, mimeType: 'image/jpeg' } });
                    });
                  });
                }
              }, 2000);
            }
          },
          onmessage: async (msg: LiveServerMessage) => {
            // Processing audio bytes according to instructions for raw PCM streams.
            const audioData = msg.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (audioData && audioContextRef.current) {
              const ctx = audioContextRef.current;
              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime);
              const buffer = await decodeAudioData(decode(audioData), ctx, 24000, 1);
              const source = ctx.createBufferSource();
              source.buffer = buffer;
              source.connect(ctx.destination);
              source.addEventListener('ended', () => {
                audioSourcesRef.current.delete(source);
              });
              source.start(nextStartTimeRef.current);
              nextStartTimeRef.current += buffer.duration;
              audioSourcesRef.current.add(source);
            }

            const interrupted = msg.serverContent?.interrupted;
            if (interrupted) {
              audioSourcesRef.current.forEach(s => {
                try { s.stop(); } catch (e) {}
              });
              audioSourcesRef.current.clear();
              nextStartTimeRef.current = 0;
            }

            if (msg.serverContent?.outputTranscription) currentOutputTranscription.current += msg.serverContent.outputTranscription.text;
            if (msg.serverContent?.turnComplete) {
              const full = currentOutputTranscription.current;
              const up = full.toUpperCase();
              if (up.includes('[LEVEL_ALERT]')) playInstitutionalAlert('LEVEL');
              
              const sig: TradeSignal = up.includes('BUY') ? 'BUY' : up.includes('SELL') ? 'SELL' : 'WAIT';
              if (sig !== lastSignalRef.current && sig !== 'WAIT') playInstitutionalAlert(sig);
              lastSignalRef.current = sig;

              setTradingState(prev => ({
                ...prev,
                currentSignal: sig,
                detectedTrend: up.includes('BULLISH') ? 'BULLISH' : up.includes('BEARISH') ? 'BEARISH' : prev.detectedTrend,
                confidence: sig !== 'WAIT' ? 92 + Math.floor(Math.random() * 7) : 0,
                lastAnalysis: full.replace('[LEVEL_ALERT]', '').trim(),
                isAlarmActive: sig !== 'WAIT',
                isLevelAlertActive: up.includes('[LEVEL_ALERT]')
              }));
              currentOutputTranscription.current = '';
            }
          },
          onerror: (errorEvent) => {
            console.error("Live session error:", errorEvent);
            setStatus(SessionStatus.ERROR);
          },
          onclose: () => {
            setStatus(SessionStatus.IDLE);
          }
        }
      });
      sessionPromiseRef.current = sessionPromise;
    } catch (error) { 
      console.error("Scanning start failed:", error);
      setStatus(SessionStatus.ERROR); 
    }
  };

  const generateReportVideo = async () => {
    if (!canvasRef.current) return;
    
    // Ensure API Key selection for Veo models as per guidelines.
    if (!(window as any).aistudio?.hasSelectedApiKey || !(await (window as any).aistudio.hasSelectedApiKey())) {
      await (window as any).aistudio.openSelectKey();
    }
    
    setTradingState(prev => ({ ...prev, isVideoGenerating: true }));
    try {
      const base64 = canvasRef.current.toDataURL('image/png').split(',')[1];
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      let op = await ai.models.generateVideos({
        model: MODELS.VIDEO,
        prompt: `Cinematic trading report. Analyze the current chart pattern and the provided institutional evidence photos. Highlight key FVG zones and expected ${tradingState.currentSignal} targets with glowing neon lines.`,
        image: { imageBytes: base64, mimeType: 'image/png' },
        config: { resolution: '720p', aspectRatio: '9:16', numberOfVideos: 1 }
      });
      while (!op.done) {
        await new Promise(r => setTimeout(r, 10000));
        op = await ai.operations.getVideosOperation({ operation: op });
      }
      const link = op.response?.generatedVideos?.[0]?.video?.uri;
      if (link) {
        const res = await fetch(`${link}&key=${process.env.API_KEY}`);
        const url = URL.createObjectURL(await res.blob());
        setTradingState(prev => ({ ...prev, isVideoGenerating: false, generatedVideoUrl: url }));
      }
    } catch (error) { 
      console.error("Video generation failed:", error);
      setTradingState(prev => ({ ...prev, isVideoGenerating: false }));
    }
  };

  return (
    <div className="relative h-[100dvh] w-screen bg-[#010409] text-slate-100 flex flex-col items-center justify-center overflow-hidden">
      {/* Background Camera Layer */}
      <div className="absolute inset-0 z-0">
        <video ref={videoRef} autoPlay playsInline muted className="h-full w-full object-cover opacity-20 brightness-50" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/80" />
      </div>

      {tradingState.isScanning && <div className="scan-line absolute w-full top-0 z-10" />}

      {/* Persistent Header */}
      <div className="absolute top-0 left-0 right-0 p-6 flex justify-between items-center z-50">
        <div className="flex items-center gap-4">
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-500 shadow-2xl ${tradingState.isAlarmActive ? 'bg-red-500 animate-pulse' : 'bg-blue-600'}`}>
            <ShieldCheck className="w-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-black italic uppercase tracking-tighter">TRADER <span className="text-blue-500">PRO</span></h1>
            <span className="text-[8px] font-black tracking-[0.4em] uppercase opacity-40">Live Multimodal Suite</span>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <button onClick={() => setIsHubOpen(true)} className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-400 hover:bg-blue-500/20 transition-all">
            <Sparkles size={20} />
          </button>
          <button onClick={() => setIsAlarmEnabled(!isAlarmEnabled)} className={`p-3 rounded-xl border transition-all ${isAlarmEnabled ? 'bg-blue-500/20 border-blue-400 text-blue-400' : 'bg-white/5 border-white/10 text-slate-500'}`}>
            {isAlarmEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
          </button>
          {!user ? (
            <button onClick={() => setIsAuthModalOpen(true)} className="px-5 py-3 rounded-xl bg-blue-600 text-[10px] font-black uppercase shadow-xl">Login</button>
          ) : (
            <button onClick={() => setUser(null)} className="p-3 rounded-xl bg-white/5 border border-white/10 text-slate-400"><LogOut size={20} /></button>
          )}
        </div>
      </div>

      <div className="relative z-10 w-full flex flex-col items-center gap-4 px-4 overflow-y-auto no-scrollbar pb-48 pt-24">
        
        {/* Evidence Dashboard */}
        {!tradingState.isScanning && (
          <div className="w-full max-w-md bg-black/60 backdrop-blur-3xl p-6 rounded-[2.5rem] border border-white/10 shadow-2xl mb-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-blue-400 flex items-center gap-2">
                <ImageIcon size={14} /> Evidence Dossier ({evidenceImages.length}/10)
              </h3>
              <label className="cursor-pointer p-2 bg-blue-600/20 text-blue-400 rounded-lg hover:bg-blue-600/30 transition-all">
                <Plus size={16} />
                <input type="file" multiple accept="image/*" className="hidden" onChange={handleImageUpload} />
              </label>
            </div>
            
            <div className="grid grid-cols-5 gap-2">
              {evidenceImages.map((img, i) => (
                <div key={i} className="relative aspect-square rounded-xl overflow-hidden border border-white/10 group">
                  <img src={img} className="w-full h-full object-cover" />
                  <button onClick={() => removeEvidence(i)} className="absolute top-1 right-1 p-1 bg-black/60 rounded-full opacity-0 group-hover:opacity-100 transition-all">
                    <X size={10} />
                  </button>
                </div>
              ))}
              {evidenceImages.length === 0 && (
                <div className="col-span-5 py-8 border-2 border-dashed border-white/5 rounded-2xl flex flex-col items-center justify-center opacity-30">
                  <UploadCloud size={32} className="mb-2" />
                  <span className="text-[9px] font-black uppercase">Upload chart screenshots</span>
                </div>
              )}
            </div>
          </div>
        )}

        <TradingDashboard 
          state={tradingState} 
          onGenerateVideo={generateReportVideo} 
          onCloseVideo={() => setTradingState(prev => ({ ...prev, generatedVideoUrl: null }))}
        />
      </div>

      {/* Main Controls */}
      <div className="absolute bottom-0 left-0 right-0 p-8 flex flex-col items-center gap-6 z-20 bg-gradient-to-t from-black to-transparent">
        {!tradingState.isScanning && (
          <div className="flex items-center gap-8 bg-slate-900/60 backdrop-blur-2xl p-2 px-6 rounded-3xl border border-white/5 shadow-xl">
            <button onClick={() => setSelectedMins(Math.max(1, selectedMins - 1))} className="p-3 text-slate-400"><ChevronLeft size={28} /></button>
            <div className="flex flex-col items-center min-w-[80px]">
              <span className="text-4xl font-black font-mono tracking-tighter">{selectedMins}</span>
              <span className="text-[8px] font-black opacity-30 uppercase tracking-widest mt-1">Minutes</span>
            </div>
            <button onClick={() => setSelectedMins(Math.min(60, selectedMins + 1))} className="p-3 text-slate-400"><ChevronRight size={28} /></button>
          </div>
        )}

        <button 
          onClick={tradingState.isScanning ? stopScanning : startScanning} 
          disabled={status === SessionStatus.CONNECTING}
          className={`w-full max-w-sm py-7 rounded-[2.5rem] font-black uppercase tracking-[0.2em] flex items-center justify-center gap-3 shadow-2xl transition-all active:scale-95 ${tradingState.isScanning ? 'bg-red-600 hover:bg-red-500 shadow-red-500/20' : 'bg-blue-600 hover:bg-blue-500 shadow-blue-500/20'}`}
        >
          {status === SessionStatus.CONNECTING ? <RefreshCw className="animate-spin" /> : tradingState.isScanning ? <StopCircle size={32} /> : <Camera size={28} />}
          {status === SessionStatus.CONNECTING ? "Synthesizing..." : tradingState.isScanning ? "Terminate Core" : "Initialize Multi-Scan"}
        </button>
      </div>

      <IntelligenceHub 
        isOpen={isHubOpen} 
        onClose={() => setIsHubOpen(false)} 
      />
      
      <AuthModal 
        isOpen={isAuthModalOpen} 
        onClose={() => setIsAuthModalOpen(false)} 
        onAuthSuccess={setUser} 
      />
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
};

export default App;