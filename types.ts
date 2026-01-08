
export type TradeSignal = 'BUY' | 'SELL' | 'WAIT' | 'CANCEL';

export interface User {
  id: string;
  phone: string;
  name: string;
  isSubscribed: boolean;
  signupDate: number;
  subscriptionDate?: number;
  isAdmin?: boolean;
}

export interface AppConfig {
  scanFrequency: number;
  alarmEnabled: boolean;
  minConfidence: number;
}

export interface AnalysisTurn {
  timestamp: number;
  inputTranscription?: string;
  outputTranscription?: string;
  signal?: TradeSignal;
  reasoning?: string;
  detectedIndicators?: string[];
  entry?: string;
  target?: string;
  stopLoss?: string;
  groundingUrls?: { title: string; uri: string }[];
}

export enum SessionStatus {
  IDLE = 'IDLE',
  CONNECTING = 'CONNECTING',
  ACTIVE = 'ACTIVE',
  ERROR = 'ERROR',
  SCANNING = 'SCANNING'
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
  history: AnalysisTurn[];
  timeRemaining: number;
  totalDuration: number;
  detectedTrend: 'BULLISH' | 'BEARISH' | 'SIDEWAYS' | 'UNKNOWN';
  isProcessing: boolean;
  checklist: TechnicalCheck[];
  levels: { support: string; resistance: string };
  isAlarmActive: boolean;
  isLevelAlertActive: boolean;
  isVideoGenerating: boolean;
  generatedVideoUrl: string | null;
}
