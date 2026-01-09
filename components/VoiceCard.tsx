
import React from 'react';
import { VoiceOption } from '../types';

interface VoiceCardProps {
  voice: VoiceOption;
  isSelected: boolean;
  onSelect: (voice: VoiceOption) => void;
  onDelete?: (voice: VoiceOption) => void;
}

const VoiceCard: React.FC<VoiceCardProps> = ({ voice, isSelected, onSelect, onDelete }) => {
  const bgStyle = voice.visualSignature ? { background: voice.visualSignature } : undefined;

  return (
    <div className="relative group animate-in fade-in zoom-in-95 duration-300">
      <button
        onClick={() => onSelect(voice)}
        className={`w-full flex flex-col items-start p-4 rounded-xl border-2 transition-all duration-500 text-left h-full ${
          isSelected
            ? 'border-indigo-500 bg-slate-800/80 shadow-lg shadow-indigo-500/20 translate-y-[-2px]'
            : 'border-slate-800 bg-slate-800/40 hover:border-slate-700 hover:bg-slate-800/60'
        }`}
      >
        <div className="flex items-center gap-3 mb-2 w-full">
          <div 
            className={`w-3.5 h-3.5 rounded-full shadow-sm transition-transform duration-500 group-hover:scale-125 ${voice.previewColor || ''} ${voice.isCustom ? 'animate-pulse' : ''}`}
            style={bgStyle}
          ></div>
          <span className="font-bold text-slate-100 truncate flex-1">{voice.name}</span>
          {voice.isCustom && (
            <span className="text-[9px] font-black tracking-widest bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full border border-amber-500/30">CLONE</span>
          )}
        </div>
        <p className="text-[11px] text-slate-400 leading-snug line-clamp-2 italic">
          {voice.description}
        </p>
      </button>
      
      {voice.isCustom && onDelete && (
        <button 
          onClick={(e) => {
            e.stopPropagation();
            onDelete(voice);
          }}
          className="absolute -top-2 -right-2 p-1.5 bg-slate-900 border border-slate-700 rounded-full text-slate-500 hover:text-red-400 hover:border-red-500/50 opacity-0 group-hover:opacity-100 transition-all z-10 scale-90 hover:scale-100"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}

      {isSelected && (
        <div className="absolute top-2 right-2">
          <div className="bg-indigo-500 rounded-full p-0.5 animate-in zoom-in-50 duration-300 shadow-md shadow-indigo-500/40">
            <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
            </svg>
          </div>
        </div>
      )}
    </div>
  );
};

export default VoiceCard;
