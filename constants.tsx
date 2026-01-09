
import { VoiceOption } from './types';

export const VOICES: VoiceOption[] = [
  { 
    id: 'Kore', 
    name: 'Julian', 
    description: 'Warm, clear, and professional male voice.', 
    previewColor: 'bg-blue-500', 
    customPersona: 'Speak in a warm, clear, and professional male voice:' 
  },
  { 
    id: 'Kore', 
    name: 'Orion', 
    description: 'Heroic, resonant, and cinematic male voice.', 
    previewColor: 'bg-orange-500', 
    customPersona: 'Speak in a heroic, resonant, and cinematic male voice with high confidence:' 
  },
  { id: 'Kore', name: 'Kore', description: 'Deep, gravelly, and mysterious.', previewColor: 'bg-indigo-600' },
  { id: 'Aoede', name: 'Aoede', description: 'Graceful, melodic, and bright.', previewColor: 'bg-rose-500' },
  { id: 'Puck', name: 'Puck', description: 'Playful, energetic, and whimsical.', previewColor: 'bg-emerald-500' },
  { id: 'Charon', name: 'Charon', description: 'Ancient, slow, and weighty.', previewColor: 'bg-slate-700' },
  { id: 'Zephyr', name: 'Zephyr', description: 'Soft, airy, and calming.', previewColor: 'bg-sky-400' },
  { id: 'Fenrir', name: 'Fenrir', description: 'Strong, commanding, and rough.', previewColor: 'bg-amber-600' }
];

export const MODEL_NAME = 'gemini-2.5-flash-preview-tts';
