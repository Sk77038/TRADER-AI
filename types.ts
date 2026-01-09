
export type TradeSignal = 'BUY' | 'SELL' | 'WAIT' | 'CANCEL';

export interface User {
  id: string;
  phone: string;
  name: string;
  isSubscribed: boolean;
  signupDate: number;
  isAdmin?: boolean;
}

export interface AppConfig {
  scanFrequency: number;
  alarmEnabled: boolean;
  minConfidence: number;
}

export interface GroundingChunk {
  web?: { uri: string; title: string };
  maps?: { uri: string; title: string };
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  thinking?: string;
  grounding?: GroundingChunk[];
}

export enum SessionStatus {
  IDLE = 'IDLE',
  CONNECTING = 'CONNECTING',
  ACTIVE = 'ACTIVE',
  ERROR = 'ERROR'
}

export interface TechnicalCheck {
  id: string;
  label: string;
  status: 'pending' | 'verified' | 'failed';
}

export interface TradingState {
  currentSignal: TradeSignal;
  confidence: number;
  lastAnalysis: string;
  isScanning: boolean;
  timeRemaining: number;
  totalDuration: number;
  detectedTrend: 'BULLISH' | 'BEARISH' | 'SIDEWAYS' | 'UNKNOWN';
  checklist: TechnicalCheck[];
  levels: { support: string; resistance: string };
  isAlarmActive: boolean;
  isLevelAlertActive: boolean;
  isVideoGenerating: boolean;
  generatedVideoUrl: string | null;
  generatedImageUrl: string | null;
}
