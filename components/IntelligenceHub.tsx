import React, { useState, useRef } from 'react';
import { GoogleGenAI, Type } from '@google/genai';
import { MODELS } from '../constants';
import { ChatMessage, GroundingChunk } from '../types';
import { 
  X, Send, BrainCircuit, Globe, Image as ImageIcon, 
  Sparkles, Loader2, Search, MessageSquare, Download,
  Video as VideoIcon, Wand2
} from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

const IntelligenceHub: React.FC<Props> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'chat' | 'news' | 'visual'>('chat');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [generatedImg, setGeneratedImg] = useState<string | null>(null);
  const [imgSize, setImgSize] = useState<'1K' | '2K' | '4K'>('1K');

  const sendMessage = async (grounded: boolean = false, thinking: boolean = false) => {
    if (!input.trim() || loading) return;
    const userMsg: ChatMessage = { role: 'user', text: input };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const model = grounded ? MODELS.SEARCH : MODELS.THINKING;
      
      const config: any = {
        systemInstruction: grounded 
          ? "Provide up-to-date market news and economic impact analysis using Google Search."
          : "You are a senior institutional trading analyst. Use deep logic and thinking to explain market mechanics.",
      };

      if (grounded) config.tools = [{ googleSearch: {} }];
      if (thinking) config.thinkingConfig = { thinkingBudget: 32768 };

      const response = await ai.models.generateContent({
        model,
        contents: input,
        config
      });

      const modelMsg: ChatMessage = {
        role: 'model',
        text: response.text || "No response generated.",
        grounding: response.candidates?.[0]?.groundingMetadata?.groundingChunks as any
      };
      setMessages(prev => [...prev, modelMsg]);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const generateImage = async () => {
    if (!input.trim() || loading) return;
    setLoading(true);
    try {
      if (!(window as any).aistudio?.hasSelectedApiKey || !(await (window as any).aistudio.hasSelectedApiKey())) {
        await (window as any).aistudio.openSelectKey();
      }
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: MODELS.IMAGE_GEN,
        contents: input,
        config: { imageConfig: { aspectRatio: "16:9", imageSize: imgSize } }
      });
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          setGeneratedImg(`data:image/png;base64,${part.inlineData.data}`);
        }
      }
    } catch (e) {
      alert("Image generation failed. Ensure your API key is properly set.");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-2xl flex flex-col items-center p-6 sm:p-10 animate-in fade-in slide-in-from-right duration-300">
      <div className="w-full max-w-5xl bg-[#0d1117] border border-white/10 rounded-[3rem] overflow-hidden flex flex-col h-full shadow-2xl">
        <div className="p-8 border-b border-white/5 flex justify-between items-center bg-black/40">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-600 rounded-2xl shadow-lg shadow-blue-500/20">
              <Sparkles size={24} className="text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-black italic uppercase tracking-tighter">Intelligence Hub</h2>
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Multi-Modal Core v4.0</p>
            </div>
          </div>
          <button onClick={onClose} className="p-4 bg-white/5 hover:bg-white/10 rounded-2xl transition-all text-slate-400"><X size={28} /></button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar Tabs */}
          <div className="w-20 sm:w-64 border-r border-white/5 flex flex-col p-4 gap-2 bg-black/20">
            {[
              { id: 'chat', label: 'Pro Thinking', icon: MessageSquare },
              { id: 'news', label: 'Live Grounding', icon: Globe },
              { id: 'visual', label: 'Image Lab', icon: ImageIcon },
            ].map(tab => (
              <button 
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`p-4 rounded-2xl flex items-center gap-3 transition-all ${activeTab === tab.id ? 'bg-blue-600 text-white shadow-xl shadow-blue-600/20' : 'text-slate-500 hover:text-white hover:bg-white/5'}`}
              >
                <tab.icon size={20} />
                <span className="hidden sm:block text-[11px] font-black uppercase tracking-widest">{tab.label}</span>
              </button>
            ))}
          </div>

          {/* Content Area */}
          <div className="flex-1 flex flex-col bg-black/10 overflow-hidden">
            <div className="flex-1 overflow-y-auto p-8 space-y-6 no-scrollbar">
              {activeTab !== 'visual' ? (
                messages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center opacity-30">
                    <BrainCircuit size={80} className="mb-4 text-blue-400" />
                    <h3 className="text-xl font-black uppercase tracking-tighter">Ready for Analysis</h3>
                    <p className="text-sm font-bold italic mt-2">Ask about SMC, Order Blocks, or Global Trends</p>
                  </div>
                ) : (
                  messages.map((m, i) => (
                    <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[85%] p-6 rounded-[2rem] text-sm leading-relaxed ${m.role === 'user' ? 'bg-blue-600 text-white shadow-xl' : 'bg-[#161b22] border border-white/5 text-slate-200'}`}>
                        {m.text}
                        {m.grounding && (
                          <div className="mt-4 pt-4 border-t border-white/5 flex flex-wrap gap-2">
                            {m.grounding.map((g, idx) => g.web && (
                              <a key={idx} href={g.web.uri} target="_blank" className="text-[10px] font-bold text-blue-400 bg-blue-400/10 px-3 py-1.5 rounded-full hover:bg-blue-400/20 transition-all">
                                {g.web.title}
                              </a>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )
              ) : (
                <div className="h-full flex flex-col items-center justify-center gap-8">
                  {generatedImg ? (
                    <div className="relative rounded-[3rem] overflow-hidden border-4 border-white/5 shadow-2xl animate-in zoom-in-95 duration-500">
                      <img src={generatedImg} className="max-h-[50vh] object-contain" />
                      <button onClick={() => setGeneratedImg(null)} className="absolute top-6 right-6 p-3 bg-black/60 backdrop-blur-md rounded-full text-white"><X size={20} /></button>
                      <a href={generatedImg} download="trader-ai-pro.png" className="absolute bottom-6 right-6 p-4 bg-blue-600 rounded-2xl text-white shadow-xl"><Download size={20} /></a>
                    </div>
                  ) : (
                    <div className="text-center opacity-30">
                      <ImageIcon size={80} className="mx-auto mb-4 text-emerald-400" />
                      <h3 className="text-xl font-black uppercase tracking-tighter">Nano Banana Pro</h3>
                      <p className="text-sm font-bold italic mt-2">Enter prompt to generate high-fidelity assets</p>
                    </div>
                  )}
                </div>
              )}
              {loading && <div className="flex justify-start"><div className="p-6 bg-slate-900/50 rounded-[2rem] animate-pulse text-xs font-black uppercase tracking-widest text-blue-400">Processing Core Intelligence...</div></div>}
            </div>

            {/* Input Bar */}
            <div className="p-8 bg-black/40 border-t border-white/5">
              <div className="flex flex-col gap-4">
                {activeTab === 'visual' && !generatedImg && (
                  <div className="flex gap-2">
                    {['1K', '2K', '4K'].map(s => (
                      <button key={s} onClick={() => setImgSize(s as any)} className={`px-6 py-2 rounded-xl text-[10px] font-black border transition-all ${imgSize === s ? 'bg-emerald-600 border-emerald-500' : 'bg-white/5 border-white/10 text-slate-500'}`}>
                        {s} RESOLUTION
                      </button>
                    ))}
                  </div>
                )}
                <div className="flex gap-4">
                  <div className="flex-1 relative">
                    <input 
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && (activeTab === 'visual' ? generateImage() : sendMessage(activeTab === 'news', activeTab === 'chat'))}
                      placeholder={activeTab === 'visual' ? "Visualize: Cyberpunk trading terminal, 8k, cinematic..." : "Command the AI Intelligence Hub..."}
                      className="w-full bg-black/60 border border-white/10 rounded-2xl py-6 pl-14 pr-4 text-sm focus:border-blue-500 outline-none text-white shadow-inner"
                    />
                    <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500">
                      {activeTab === 'chat' ? <BrainCircuit size={20} /> : activeTab === 'news' ? <Search size={20} /> : <Wand2 size={20} />}
                    </div>
                  </div>
                  <button 
                    onClick={() => activeTab === 'visual' ? generateImage() : sendMessage(activeTab === 'news', activeTab === 'chat')}
                    disabled={loading || !input.trim()}
                    className="p-6 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 rounded-2xl transition-all shadow-xl active:scale-95 text-white"
                  >
                    {loading ? <Loader2 size={24} className="animate-spin" /> : <Send size={24} />}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default IntelligenceHub;
