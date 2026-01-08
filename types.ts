
export type TradeSignal = 'BUY' | 'SELL' | 'WAIT' | 'CANCEL';

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
}

export enum SessionStatus {
  IDLE = 'IDLE',
  CONNECTING = 'CONNECTING',
  ACTIVE = 'ACTIVE',
  ERROR = 'ERROR',
  SCANNING = 'SCANNING'
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
}
