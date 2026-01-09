
import React, { useState, useRef, useEffect } from 'react';
import { VOICES } from './constants';
import { AppStatus, VoiceOption, NarrationHistoryItem } from './types';
import { generateSpeech, analyzeVoiceSample } from './services/geminiService';
import VoiceCard from './components/VoiceCard';
import Header from './components/Header';

const App: React.FC = () => {
  const [text, setText] = useState<string>('');
  const [selectedVoice, setSelectedVoice] = useState<VoiceOption>(VOICES[0]);
  const [customVoices, setCustomVoices] = useState<VoiceOption[]>([]);
  const [status, setStatus] = useState<AppStatus>(AppStatus.IDLE);
  const [history, setHistory] = useState<NarrationHistoryItem[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [currentAudioUrl, setCurrentAudioUrl] = useState<string | null>(null);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number>(0);
  const analyzerRef = useRef<AnalyserNode | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem('voxmystic_clones_v2');
    if (saved) {
      try {
        setCustomVoices(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse saved voices");
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('voxmystic_clones_v2', JSON.stringify(customVoices));
  }, [customVoices]);

  // Waveform Visualizer Logic
  const startVisualizer = (stream: MediaStream) => {
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const source = audioCtx.createMediaStreamSource(stream);
    const analyzer = audioCtx.createAnalyser();
    analyzer.fftSize = 256;
    source.connect(analyzer);
    analyzerRef.current = analyzer;

    const bufferLength = analyzer.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const draw = () => {
      if (status !== AppStatus.RECORDING) return;
      animationFrameRef.current = requestAnimationFrame(draw);
      analyzer.getByteFrequencyData(dataArray);

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const barWidth = (canvas.width / bufferLength) * 2.5;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const barHeight = (dataArray[i] / 255) * canvas.height;
        ctx.fillStyle = `rgba(99, 102, 241, ${dataArray[i] / 255 + 0.2})`;
        ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
        x += barWidth + 1;
      }
    };
    draw();
  };

  const handleGenerate = async () => {
    if (!text.trim()) return;
    setStatus(AppStatus.GENERATING);
    setErrorMessage(null);

    try {
      const { audioUrl, blob } = await generateSpeech({
        text,
        voiceName: selectedVoice.id,
        customPersona: selectedVoice.customPersona
      });

      const newItem: NarrationHistoryItem = {
        id: Math.random().toString(36).substring(2, 9),
        text: text,
        voice: selectedVoice.name,
        voiceId: selectedVoice.id,
        timestamp: Date.now(),
        audioBlob: blob,
        audioUrl: audioUrl,
        customPersona: selectedVoice.customPersona
      };

      setHistory(prev => [newItem, ...prev]);
      setCurrentAudioUrl(audioUrl);
      setStatus(AppStatus.IDLE);
      
      if (audioRef.current) {
        audioRef.current.src = audioUrl;
        audioRef.current.play();
      }
    } catch (err: any) {
      setStatus(AppStatus.ERROR);
      setErrorMessage(err.message || "Synthesizer encountered a rift. Please try again.");
    }
  };

  const processAudioFile = async (blob: Blob) => {
    setStatus(AppStatus.ANALYZING);
    setErrorMessage(null);

    try {
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve) => {
        reader.onload = () => {
          const base64 = (reader.result as string).split(',')[1];
          resolve(base64);
        };
      });
      reader.readAsDataURL(blob);
      const base64 = await base64Promise;

      const analysis = await analyzeVoiceSample(base64, blob.type);
      
      const cloneName = prompt("Name your custom voice clone:", `Neural Clone ${customVoices.length + 1}`) || `Neural Clone ${customVoices.length + 1}`;
      
      const newCustomVoice: VoiceOption = {
        id: 'Kore', 
        name: cloneName,
        description: analysis.persona.replace('Speak in a ', '').replace(':', ''),
        previewColor: '',
        visualSignature: analysis.signature,
        customPersona: analysis.persona,
        isCustom: true
      };

      setCustomVoices(prev => [newCustomVoice, ...prev]);
      setSelectedVoice(newCustomVoice);
      setStatus(AppStatus.IDLE);
    } catch (err: any) {
      setStatus(AppStatus.ERROR);
      setErrorMessage(err.message || "Failed to decode the sonic fingerprint.");
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processAudioFile(file);
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => chunksRef.current.push(e.data);
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        processAudioFile(blob);
        stream.getTracks().forEach(track => track.stop());
        cancelAnimationFrame(animationFrameRef.current);
      };

      recorder.start();
      setStatus(AppStatus.RECORDING);
      startVisualizer(stream);
    } catch (err) {
      setErrorMessage("Microphone access is required for real-time cloning.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
  };

  const deleteCustomVoice = (voice: VoiceOption) => {
    setCustomVoices(prev => prev.filter(v => v.customPersona !== voice.customPersona));
    if (selectedVoice.customPersona === voice.customPersona) {
      setSelectedVoice(VOICES[0]);
    }
  };

  const playHistoryItem = (item: NarrationHistoryItem) => {
    setCurrentAudioUrl(item.audioUrl);
    if (audioRef.current) {
      audioRef.current.src = item.audioUrl;
      audioRef.current.play();
    }
  };

  const handleCloneHistory = (item: NarrationHistoryItem) => {
    setText(item.text);
    if (item.customPersona) {
      const existing = customVoices.find(v => v.customPersona === item.customPersona);
      if (existing) {
        setSelectedVoice(existing);
      } else {
        const cloned: VoiceOption = {
          id: item.voiceId,
          name: 'Restored Persona',
          description: item.customPersona.replace('Speak in a ', '').replace(':', ''),
          previewColor: 'bg-indigo-500',
          customPersona: item.customPersona,
          isCustom: true
        };
        setCustomVoices(prev => [cloned, ...prev]);
        setSelectedVoice(cloned);
      }
    } else {
      const voice = VOICES.find(v => v.id === item.voiceId) || VOICES[0];
      setSelectedVoice(voice);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 selection:bg-indigo-500/30 font-sans">
      <div className="max-w-5xl mx-auto px-6 pb-24">
        <Header />

        <main className="space-y-8 mt-12 animate-in fade-in slide-in-from-bottom-8 duration-1000">
          
          {/* Neural Cloning Lab */}
          <section className="bg-slate-900/60 backdrop-blur-md border border-slate-800 rounded-3xl p-8 shadow-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <svg className="w-24 h-24" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m12.728 0l-.707-.707M6.343 6.343l-.707-.707M12 8a4 4 0 100 8 4 4 0 000-8z" />
              </svg>
            </div>
            
            <div className="flex flex-col lg:flex-row items-center gap-8 relative z-10">
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></div>
                  <h2 className="text-xl font-black text-slate-50 tracking-tight uppercase">Neural Cloning Lab</h2>
                </div>
                <p className="text-slate-400 text-sm leading-relaxed max-w-md">
                  Upload an audio file or record your voice to extract a unique sonic blueprint. Our AI will analyze the frequency and cadence to mirror the identity.
                </p>
              </div>

              <div className="w-full lg:w-auto flex flex-col items-center gap-4">
                <div className="flex items-center gap-4 w-full justify-center">
                  <button
                    onClick={() => status === AppStatus.RECORDING ? stopRecording() : startRecording()}
                    className={`h-14 px-8 rounded-2xl font-black text-sm tracking-widest uppercase transition-all duration-300 flex items-center justify-center gap-3 group shadow-lg ${
                      status === AppStatus.RECORDING 
                      ? 'bg-rose-600 text-white animate-pulse' 
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-100'
                    }`}
                  >
                    {status === AppStatus.RECORDING ? (
                      <div className="w-3 h-3 bg-white rounded-sm"></div>
                    ) : (
                      <div className="w-3 h-3 bg-rose-500 rounded-full group-hover:scale-125 transition-transform"></div>
                    )}
                    {status === AppStatus.RECORDING ? 'End Capture' : 'Live Capture'}
                  </button>
                  
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={status === AppStatus.ANALYZING}
                    className="h-14 px-8 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-sm tracking-widest uppercase transition-all shadow-lg shadow-indigo-600/20 active:scale-95 disabled:opacity-50"
                  >
                    Upload File
                  </button>
                  <input type="file" ref={fileInputRef} className="hidden" accept="audio/*" onChange={handleFileUpload} />
                </div>

                {/* Waveform Canvas */}
                <div className={`h-12 w-full max-w-sm bg-slate-950/50 rounded-xl overflow-hidden border border-slate-800/50 transition-opacity duration-500 ${status === AppStatus.RECORDING ? 'opacity-100' : 'opacity-0 h-0 pointer-events-none'}`}>
                  <canvas ref={canvasRef} width={400} height={48} className="w-full h-full" />
                </div>
              </div>
            </div>
            
            {status === AppStatus.ANALYZING && (
              <div className="mt-8 p-6 bg-indigo-600/10 border border-indigo-500/20 rounded-2xl flex flex-col gap-4 animate-in fade-in slide-in-from-top-4 duration-500">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div className="h-6 w-6 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin"></div>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-1 h-1 bg-indigo-400 rounded-full animate-ping"></div>
                      </div>
                    </div>
                    <span className="text-sm font-black text-indigo-300 tracking-wider uppercase">Decoding Sonic Fingerprint...</span>
                  </div>
                  <span className="text-xs text-indigo-400/60 font-mono">STEP 02/03: HARMONIC MAPPING</span>
                </div>
                <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-500 animate-[shimmer_2s_infinite] w-3/4"></div>
                </div>
              </div>
            )}
          </section>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
            {/* Control Panel */}
            <div className="xl:col-span-2 space-y-8">
              <section className="bg-slate-900/40 border border-slate-800 rounded-3xl p-8 shadow-xl">
                <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-4 ml-1">
                  Narration Script
                </label>
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Envision a world where silence speaks..."
                  className="w-full h-48 bg-slate-950/50 border border-slate-800/60 rounded-2xl p-6 text-slate-100 placeholder:text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500/50 transition-all resize-none font-serif text-2xl leading-relaxed shadow-inner"
                />
                
                <div className="mt-8 flex items-center gap-4">
                  <button
                    onClick={handleGenerate}
                    disabled={status === AppStatus.GENERATING || status === AppStatus.ANALYZING || !text.trim()}
                    className={`flex-1 h-16 rounded-2xl font-black text-lg tracking-tight transition-all duration-300 flex items-center justify-center gap-4 group ${
                      status === AppStatus.GENERATING
                        ? 'bg-slate-800 text-slate-600 cursor-not-allowed'
                        : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-2xl shadow-indigo-600/40 active:scale-[0.98]'
                    }`}
                  >
                    {status === AppStatus.GENERATING ? (
                      <>
                        <div className="h-5 w-5 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin"></div>
                        Synthesizing...
                      </>
                    ) : (
                      <>
                        <svg className="w-6 h-6 transition-transform group-hover:scale-110" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z" />
                        </svg>
                        Render Narration
                      </>
                    )}
                  </button>
                </div>

                {errorMessage && (
                  <div className="mt-6 p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-sm flex items-center gap-3 animate-in slide-in-from-top-2">
                    <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {errorMessage}
                  </div>
                )}
              </section>

              {/* Active Audio Player */}
              {currentAudioUrl && (
                <section className="animate-in fade-in slide-in-from-bottom-8 duration-700">
                  <div className="bg-gradient-to-br from-indigo-950/30 to-slate-900 border border-indigo-500/20 rounded-3xl p-8 flex flex-col md:flex-row items-center gap-8 shadow-2xl backdrop-blur-xl group">
                    <div className="relative">
                      <div className="bg-indigo-600 rounded-2xl p-6 text-white shadow-2xl shadow-indigo-500/40 group-hover:rotate-3 transition-transform duration-500">
                        <svg className="w-10 h-10" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" />
                        </svg>
                      </div>
                      <div className="absolute -inset-2 bg-indigo-500/20 rounded-3xl blur-xl -z-10 animate-pulse"></div>
                    </div>
                    <div className="flex-1 text-center md:text-left min-w-0">
                      <h3 className="font-black text-slate-100 text-xl mb-1 tracking-tight">Active Stream</h3>
                      <p className="text-sm text-slate-500 italic truncate max-w-sm">"{history[0]?.text || 'Synthetic Output'}"</p>
                    </div>
                    <audio 
                      ref={audioRef} 
                      controls 
                      className="h-12 w-full md:w-[320px] filter saturate-50 hover:saturate-100 transition-all"
                      src={currentAudioUrl || ''}
                    />
                  </div>
                </section>
              )}
            </div>

            {/* Voice Library Sidebar */}
            <div className="space-y-6">
              <div className="px-1 flex items-center justify-between">
                <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest">Identities</h3>
                <span className="text-[10px] text-indigo-400 font-mono">{customVoices.length + VOICES.length} LOADED</span>
              </div>
              
              <div className="grid grid-cols-1 gap-3 max-h-[800px] overflow-y-auto pr-2 custom-scrollbar">
                {customVoices.map((voice, idx) => (
                  <VoiceCard
                    key={`custom-${idx}`}
                    voice={voice}
                    isSelected={selectedVoice.customPersona === voice.customPersona}
                    onSelect={setSelectedVoice}
                    onDelete={deleteCustomVoice}
                  />
                ))}
                {VOICES.map((voice) => (
                  <VoiceCard
                    key={voice.id}
                    voice={voice}
                    isSelected={!selectedVoice.isCustom && selectedVoice.id === voice.id}
                    onSelect={setSelectedVoice}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* History Archive */}
          {history.length > 0 && (
            <section className="space-y-8 pt-12 border-t border-slate-900">
              <div className="flex items-center justify-between px-2">
                <h2 className="text-2xl font-black text-slate-50 tracking-tight flex items-center gap-4">
                  <div className="w-1.5 h-8 bg-indigo-600 rounded-full"></div>
                  Narration Archive
                </h2>
                <button 
                  onClick={() => setHistory([])}
                  className="text-[10px] font-black text-slate-500 hover:text-rose-400 transition-colors uppercase tracking-[0.2em]"
                >
                  Purge Archive
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {history.map((item) => (
                  <div 
                    key={item.id}
                    className="group bg-slate-900/40 hover:bg-slate-900/80 border border-slate-800 hover:border-indigo-500/30 p-6 rounded-3xl flex flex-col gap-5 transition-all duration-500 relative overflow-hidden"
                  >
                    <div className="flex items-start justify-between relative z-10">
                      <button 
                        onClick={() => playHistoryItem(item)}
                        className="w-14 h-14 rounded-2xl bg-slate-800 group-hover:bg-indigo-600 flex items-center justify-center text-slate-500 group-hover:text-white transition-all shadow-xl"
                      >
                        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                        </svg>
                      </button>
                      
                      <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => handleCloneHistory(item)}
                          className="p-3 text-slate-400 hover:text-indigo-400 bg-slate-950/50 rounded-xl transition-all"
                          title="Mirror Settings"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
                          </svg>
                        </button>
                        <a 
                          href={item.audioUrl} 
                          download={`voxmystic-${item.id}.wav`}
                          className="p-3 text-slate-400 hover:text-emerald-400 bg-slate-950/50 rounded-xl transition-all"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                          </svg>
                        </a>
                      </div>
                    </div>

                    <div className="space-y-2 relative z-10">
                      <div className="flex items-center gap-3">
                        <span className={`text-[9px] font-black px-2 py-0.5 rounded-full border ${item.customPersona ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' : 'bg-slate-800 text-slate-400 border-slate-700'}`}>
                          {item.customPersona ? 'NEURAL CLONE' : item.voice}
                        </span>
                        <span className="text-[10px] text-slate-600 font-mono">
                          {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-sm text-slate-300 line-clamp-3 leading-relaxed font-serif italic">"{item.text}"</p>
                    </div>

                    {/* Background ID Visualizer */}
                    <div className="absolute inset-x-0 bottom-0 h-1 bg-slate-800 overflow-hidden">
                       <div className="h-full bg-indigo-500 opacity-20 group-hover:opacity-100 transition-opacity duration-700" style={{ width: `${Math.min(100, item.text.length / 2)}%` }}></div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </main>
      </div>

      <footer className="py-24 border-t border-slate-900 text-center relative overflow-hidden">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-slate-800 to-transparent"></div>
        <p className="text-[10px] text-slate-600 tracking-[0.5em] uppercase mb-2">Architected with Precision &bull; 2025</p>
        <p className="text-[10px] text-slate-800 font-mono tracking-widest uppercase">Engine: Gemini 2.5 Flash / Gemini 3 Pro Inference</p>
      </footer>

      <style>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(200%); }
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #1e293b;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #334155;
        }
      `}</style>
    </div>
  );
};

export default App;
