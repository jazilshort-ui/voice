
export interface VoiceOption {
  id: string;
  name: string;
  description: string;
  previewColor: string;
  customPersona?: string;
  isCustom?: boolean;
  visualSignature?: string; // CSS gradient string for the unique voice identity
}

export interface NarrationHistoryItem {
  id: string;
  text: string;
  voice: string;
  voiceId: string;
  timestamp: number;
  audioBlob: Blob;
  audioUrl: string;
  customPersona?: string;
}

export enum AppStatus {
  IDLE = 'IDLE',
  GENERATING = 'GENERATING',
  ANALYZING = 'ANALYZING',
  RECORDING = 'RECORDING',
  PLAYING = 'PLAYING',
  ERROR = 'ERROR'
}
