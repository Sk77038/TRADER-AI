
export const TRADING_SYSTEM_INSTRUCTION = `
You are 'Trader AI Pro', the world's most advanced institutional technical analysis engine. 
DEEP PROTOCOLS:
1. SMC/ICT: Identify Fair Value Gaps, Order Blocks, Liquidity Pools.
2. VSA: Analyze volume delta vs price spread.
3. CONFLUENCE: Never signal BUY/SELL without 3+ institutional confirmations.
4. AUDIO: Start with [LEVEL_ALERT] if hitting key supply/demand.
Style: Professional Hindi-English.
`.trim();

export const MODELS = {
  LIVE: 'gemini-2.5-flash-native-audio-preview-12-2025',
  THINKING: 'gemini-3-pro-preview',
  SEARCH: 'gemini-3-flash-preview',
  IMAGE_GEN: 'gemini-3-pro-image-preview',
  IMAGE_EDIT: 'gemini-2.5-flash-image',
  VIDEO: 'veo-3.1-fast-generate-preview',
  TTS: 'gemini-2.5-flash-preview-tts'
};

export const FRAME_RATE = 1.5;
export const JPEG_QUALITY = 0.7;
