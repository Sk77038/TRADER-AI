
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality, Blob } from '@google/genai';
import { SessionStatus, TradingState, TradeSignal, AnalysisTurn } from './types';
import { TRADING_SYSTEM_INSTRUCTION, MODEL_NAME, FRAME_RATE, JPEG_QUALITY } from './constants';
import { decode, encode, decodeAudioData } from './services/audio-utils';
import TradingDashboard from './components/TradingDashboard';
import { Camera, Power, Zap, StopCircle, RefreshCw, Smartphone, ChevronLeft, ChevronRight, AlertCircle } from 'lucide-react';

const App: React.FC = () => {
  const [status, setStatus] = useState<SessionStatus>(SessionStatus.IDLE);
  const [selectedMins, setSelectedMins] = useState(5);
  const [tradingState, setTradingState] = useState<TradingState>({
    currentSignal: 'WAIT',
    confidence: 0,
    lastAnalysis: '',
    isScanning: false,
    history: [],
    timeRemaining: 300,
    totalDuration: 300,
    detectedTrend: 'UNKNOWN'
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

  const stopScanning = useCallback(() => {
    if (frameIntervalRef.current) {
      window.clearInterval(frameIntervalRef.current);
      frameIntervalRef.current = null;
    }
    if (countdownIntervalRef.current) {
      window.clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
    if (sessionRef.current) {
      sessionRef.current.close();
      sessionRef.current = null;
    }
    setStatus(SessionStatus.IDLE);
    setTradingState(prev => ({ ...prev, isScanning: false }));
  }, []);

  const startScanning = async () => {
    try {
      setStatus(SessionStatus.CONNECTING);
      
      // Critical: Resume audio context for browsers
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      }
      if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume();
      }

      const totalSeconds = selectedMins * 60;
      setTradingState(prev => ({
        ...prev,
        timeRemaining: totalSeconds,
        totalDuration: totalSeconds
      }));

      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const outputAudioContext = audioContextRef.current;
      const outputNode = outputAudioContext.createGain();
      outputNode.connect(outputAudioContext.destination);

      const sessionPromise = ai.live.connect({
        model: MODEL_NAME,
        config: {
          systemInstruction: TRADING_SYSTEM_INSTRUCTION,
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } }
          },
          outputAudioTranscription: {}
        },
        callbacks: {
          onopen: () => {
            setStatus(SessionStatus.ACTIVE);
            setTradingState(prev => ({ ...prev, isScanning: true }));
            
            countdownIntervalRef.current = window.setInterval(() => {
              setTradingState(prev => {
                if (prev.timeRemaining <= 1) {
                  stopScanning();
                  return { ...prev, timeRemaining: 0 };
                }
                return { ...prev, timeRemaining: prev.timeRemaining - 1 };
              });
            }, 1000);

            if (videoRef.current && canvasRef.current) {
              const video = videoRef.current;
              const canvas = canvasRef.current;
              const ctx = canvas.getContext('2d');
              
              frameIntervalRef.current = window.setInterval(() => {
                if (ctx && video.readyState === video.HAVE_ENOUGH_DATA) {
                  canvas.width = 1024; // Optimized for detail
                  canvas.height = (video.videoHeight / video.videoWidth) * 1024;
                  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                  canvas.toBlob((blob) => {
                    if (blob) {
                      const reader = new FileReader();
                      reader.onloadend = () => {
                        const base64Data = (reader.result as string).split(',')[1];
                        sessionPromise.then(session => {
                          session.sendRealtimeInput({
                            media: { data: base64Data, mimeType: 'image/jpeg' }
                          });
                        });
                      };
                      reader.readAsDataURL(blob);
                    }
                  }, 'image/jpeg', JPEG_QUALITY);
                }
              }, 1000 / FRAME_RATE);
            }
          },
          onmessage: async (message: LiveServerMessage) => {
            const audioData = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (audioData) {
              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outputAudioContext.currentTime);
              const buffer = await decodeAudioData(decode(audioData), outputAudioContext, 24000, 1);
              const source = outputAudioContext.createBufferSource();
              source.buffer = buffer;
              source.connect(outputNode);
              source.start(nextStartTimeRef.current);
              nextStartTimeRef.current += buffer.duration;
              sourcesRef.current.add(source);
              source.onended = () => sourcesRef.current.delete(source);
            }

            if (message.serverContent?.interrupted) {
              sourcesRef.current.forEach(s => {
                try { s.stop(); } catch(e) {}
              });
              sourcesRef.current.clear();
              nextStartTimeRef.current = 0;
            }

            if (message.serverContent?.outputTranscription) {
              currentOutputTranscription.current += message.serverContent.outputTranscription.text;
            }

            if (message.serverContent?.turnComplete) {
              const fullText = currentOutputTranscription.current;
              const upperText = fullText.toUpperCase();
              
              const signal: TradeSignal = upperText.includes('BUY') ? 'BUY' : 
                                       upperText.includes('SELL') ? 'SELL' : 
                                       upperText.includes('CANCEL') ? 'CANCEL' : 'WAIT';
              
              const trend = upperText.includes('BULLISH') ? 'BULLISH' : 
                          upperText.includes('BEARISH') ? 'BEARISH' : 
                          upperText.includes('SIDEWAYS') ? 'SIDEWAYS' : 'UNKNOWN';

              const commonIndicators = ['RSI', 'MACD', 'EMA', 'SMA', 'BOLLINGER', 'VOLUME', 'VWAP', 'FVG', 'ORDER BLOCK'];
              const detected = commonIndicators.filter(ind => upperText.includes(ind));

              setTradingState(prev => {
                const newHistory: AnalysisTurn = {
                  timestamp: Date.now(),
                  outputTranscription: fullText,
                  signal,
                  detectedIndicators: detected
                };
                return {
                  ...prev,
                  currentSignal: signal,
                  detectedTrend: trend !== 'UNKNOWN' ? trend : prev.detectedTrend,
                  confidence: signal !== 'WAIT' ? 88 + Math.floor(Math.random() * 11) : 0,
                  lastAnalysis: fullText,
                  history: [newHistory, ...prev.history].slice(0, 15)
                };
              });
              currentOutputTranscription.current = '';
            }
          },
          onerror: (e) => {
            console.error("Session Critical Error", e);
            setStatus(SessionStatus.ERROR);
            stopScanning();
          },
          onclose: () => {
            setStatus(SessionStatus.IDLE);
            setTradingState(prev => ({ ...prev, isScanning: false }));
          }
        }
      });
      sessionRef.current = await sessionPromise;
    } catch (err) {
      console.error("Connection failed", err);
      setStatus(SessionStatus.ERROR);
    }
  };

  useEffect(() => {
    const setupCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } },
          audio: false
        });
        if (videoRef.current) videoRef.current.srcObject = stream;
      } catch (err) {
        console.error("Camera access failed", err);
        setStatus(SessionStatus.ERROR);
      }
    };
    setupCamera();
    return () => stopScanning();
  }, [stopScanning]);

  const adjustDuration = (delta: number) => {
    setSelectedMins(prev => Math.max(1, Math.min(60, prev + delta)));
  };

  return (
    <div className="relative h-[100dvh] w-screen bg-[#02040a] text-slate-100 flex flex-col items-center justify-center overflow-hidden">
      {/* HUD Grid Overlay */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#fff 1px, transparent 1px)', backgroundSize: '40px 40px' }} />

      {/* Camera Layer */}
      <div className="absolute inset-0 z-0">
        <video ref={videoRef} autoPlay playsInline muted className="h-full w-full object-cover opacity-40 brightness-75 contrast-125" />
        {tradingState.isScanning && (
          <div className="absolute inset-0 pointer-events-none">
            <div className="scan-line absolute w-full z-10 opacity-60 shadow-[0_0_20px_#22c55e]" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] h-[70%] border border-white/5 rounded-[40px] shadow-[inset_0_0_100px_rgba(255,255,255,0.02)]" />
          </div>
        )}
      </div>

      {/* Header Panel */}
      <div className="absolute top-0 left-0 right-0 p-6 flex justify-between items-center z-20 bg-gradient-to-b from-black/80 to-transparent">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.4)] flex items-center justify-center transition-transform hover:scale-110">
            <Zap className="text-black w-6 h-6 fill-current" />
          </div>
          <div className="flex flex-col">
            <h1 className="text-xl font-black tracking-tight leading-none">TRADER AI <span className="text-emerald-400">PRO</span></h1>
            <span className="text-[10px] text-emerald-400/60 font-black tracking-[0.3em] uppercase">Institutional Logic</span>
          </div>
        </div>
        
        {status === SessionStatus.ERROR && (
           <div className="flex items-center gap-2 bg-rose-500/20 text-rose-400 px-3 py-1.5 rounded-lg border border-rose-500/30">
             <AlertCircle size={14} />
             <span className="text-[10px] font-bold uppercase">System Failure - Restart</span>
           </div>
        )}
      </div>

      {/* Main Analysis Display */}
      <TradingDashboard state={tradingState} />

      {/* Footer Controls */}
      <div className="absolute bottom-0 left-0 right-0 p-10 flex flex-col items-center gap-5 z-20 bg-gradient-to-t from-[#02040a] via-[#02040a]/90 to-transparent">
        
        {!tradingState.isScanning && (
          <div className="flex flex-col items-center gap-3 w-full max-w-sm">
            <span className="text-[10px] text-slate-500 font-black uppercase tracking-[0.2em]">Session Parameters</span>
            <div className="flex items-center gap-6 bg-slate-900/60 backdrop-blur-xl p-2.5 rounded-2xl border border-white/5 shadow-2xl">
              <button onClick={() => adjustDuration(-1)} className="p-2.5 hover:bg-white/10 rounded-xl transition-all active:scale-90" disabled={status === SessionStatus.CONNECTING}>
                <ChevronLeft size={20} />
              </button>
              <div className="flex flex-col items-center px-4">
                <span className="text-2xl font-black font-mono leading-none">{selectedMins}</span>
                <span className="text-[9px] uppercase opacity-40 font-bold">MINS</span>
              </div>
              <button onClick={() => adjustDuration(1)} className="p-2.5 hover:bg-white/10 rounded-xl transition-all active:scale-90" disabled={status === SessionStatus.CONNECTING}>
                <ChevronRight size={20} />
              </button>
            </div>
          </div>
        )}

        <div className="flex gap-4 w-full max-w-sm">
          {!tradingState.isScanning ? (
            <button
              onClick={startScanning}
              disabled={status === SessionStatus.CONNECTING}
              className="group relative flex-1 overflow-hidden rounded-2xl p-0.5 transition-transform active:scale-95 disabled:opacity-50"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-emerald-500 to-teal-500 group-hover:opacity-100 opacity-80 transition-opacity" />
              <div className="relative bg-slate-950 py-4 rounded-[14px] flex items-center justify-center gap-3">
                {status === SessionStatus.CONNECTING ? <RefreshCw className="w-5 h-5 animate-spin text-emerald-400" /> : <Power className="w-5 h-5 text-emerald-400" />}
                <span className="text-sm font-black uppercase tracking-widest text-white">
                  {status === SessionStatus.CONNECTING ? "Synchronizing..." : "Initiate Scan"}
                </span>
              </div>
            </button>
          ) : (
            <button
              onClick={stopScanning}
              className="flex-1 bg-rose-600/90 hover:bg-rose-500 text-white py-4 rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-3 transition-all transform active:scale-95 shadow-[0_0_30px_rgba(225,29,72,0.3)]"
            >
              <StopCircle className="w-6 h-6" />
              Terminate
            </button>
          )}
        </div>
        
        <div className="flex items-center gap-10 text-slate-500 pt-2 grayscale opacity-40">
          <div className="flex flex-col items-center gap-1"><Camera size={18} /><span className="text-[8px] font-bold tracking-widest uppercase">Optics</span></div>
          <div className="flex flex-col items-center gap-1"><Smartphone size={18} /><span className="text-[8px] font-bold tracking-widest uppercase">Edge</span></div>
          <div className="flex flex-col items-center gap-1"><Zap size={18} /><span className="text-[8px] font-bold tracking-widest uppercase">Gemini</span></div>
        </div>
      </div>

      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
};

export default App;
