
import React from 'react';

const Header: React.FC = () => {
  return (
    <header className="py-8 text-center">
      <div className="inline-block px-3 py-1 mb-4 text-xs font-semibold tracking-wider text-indigo-400 uppercase bg-indigo-500/10 rounded-full border border-indigo-500/20">
        AI Narrator Studio
      </div>
      <h1 className="text-5xl font-serif font-bold text-slate-50 mb-3 tracking-tight">
        VoxMystic
      </h1>
      <p className="text-slate-400 max-w-xl mx-auto leading-relaxed">
        Transform your words into cinematic soundscapes. Choose a voice, set the scene, and let Gemini breathe life into your stories.
      </p>
    </header>
  );
};

export default Header;
