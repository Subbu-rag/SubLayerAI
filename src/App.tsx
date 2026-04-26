/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI } from '@google/genai';
import { motion, AnimatePresence } from 'motion/react';
import { Upload, FileVideo, Terminal, Cpu, ArrowRight, Download, RefreshCcw, Eye, EyeOff, LayoutGrid, Settings, Library, History, Globe, FileText, CheckCircle2, Clock } from 'lucide-react';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const INITIAL_LOGS = [
  "Engine initialized (SubLayer Core v2.4.1)",
  "Neural dialect adapter loaded",
  "Awaiting media stream...",
];

export default function App() {
  const [file, setFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [logs, setLogs] = useState<string[]>(INITIAL_LOGS);
  const [subtitles, setSubtitles] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [showVideo, setShowVideo] = useState(true);
  const [selectedLanguage, setSelectedLanguage] = useState("English (US)");
  const terminalEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const addLog = (msg: string) => {
    setLogs(prev => [...prev.slice(-5), `${msg}`]);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.type.startsWith('video/')) {
        setFile(selectedFile);
        setVideoUrl(URL.createObjectURL(selectedFile));
        addLog(`File loaded: ${selectedFile.name}`);
      } else {
        addLog("Error: Unsupported media type.");
      }
    }
  };

  const extractSubtitles = async () => {
    if (!file) return;

    setIsProcessing(true);
    setSubtitles("");
    addLog("Analyzing audio frequencies...");

    try {
      const base64Data = await fileToBase64(file);
      addLog("Generating timestamped transcription...");

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [
          {
            parts: [
              {
                text: `Extract all dialogue and subtitles from this video in ${selectedLanguage}. Output them in SRT (SubRip Subtitle) format with precise timestamps. Format with speaker identification if possible. Output ONLY the SRT content.`,
              },
              {
                inlineData: {
                  mimeType: file.type,
                  data: base64Data.split(',')[1],
                },
              },
            ],
          },
        ],
      });

      const text = response.text || "No speech detected.";
      
      let i = 0;
      const interval = setInterval(() => {
        setSubtitles(text.slice(0, i));
        i += 15;
        if (i >= text.length) {
          setSubtitles(text);
          clearInterval(interval);
          setIsProcessing(false);
          addLog("Extraction complete.");
        }
      }, 5);

    } catch (err) {
      console.error(err);
      addLog(`Extraction failed: ${err instanceof Error ? err.message : "Internal Error"}`);
      setIsProcessing(false);
    }
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  };

  const downloadSRT = () => {
    if (!subtitles) return;
    const blob = new Blob([subtitles], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${file?.name.split('.')[0] || 'sublayer'}_subtitles.srt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    addLog("Exported to local drive.");
  };

  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [subtitles, logs]);

  return (
    <div className="flex flex-col h-screen max-h-screen bg-bg-main text-slate-200 overflow-hidden font-sans">
      {/* Header */}
      <header className="h-16 flex-none bg-bg-secondary border-b border-white/5 flex items-center justify-between px-6 z-10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-indigo-600 rounded flex items-center justify-center">
            <Cpu className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-semibold tracking-tight">SubLayer <span className="text-indigo-400 font-light">AI</span></span>
        </div>
        
        <nav className="hidden md:flex gap-8 text-sm font-medium text-slate-400">
          <button className="text-white border-b-2 border-indigo-500 pb-5 pt-5 px-1 cursor-pointer">Extractor</button>
          <button className="hover:text-white pb-5 pt-5 transition-colors cursor-pointer">Batch Process</button>
          <button className="hover:text-white pb-5 pt-5 transition-colors cursor-pointer">Library</button>
          <button className="hover:text-white pb-5 pt-5 transition-colors cursor-pointer">Settings</button>
        </nav>

        <div className="flex items-center gap-4">
          <div className="text-right mr-2 hidden sm:block">
            <p className="text-[10px] text-slate-500 uppercase tracking-wider">Pro Account</p>
            <p className="text-sm font-medium">AIS User</p>
          </div>
          <div className="w-10 h-10 rounded-full bg-bg-tertiary border border-white/10 flex items-center justify-center overflow-hidden">
            <div className="w-full h-full bg-gradient-to-br from-indigo-500/20 to-purple-500/20" />
          </div>
        </div>
      </header>

      <main className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <aside className="w-72 hidden xl:flex flex-col bg-bg-tertiary border-r border-white/5 p-6 overflow-y-auto">
          <h3 className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-6">Recent Extractions</h3>
          <div className="space-y-4">
            {file && (
              <div className="p-3 rounded-lg glass-panel">
                <p className="text-sm font-medium truncate">{file.name}</p>
                <div className="flex justify-between mt-2 items-center">
                  <span className={`text-[10px] font-mono ${isProcessing ? 'text-indigo-400' : 'text-emerald-400'}`}>
                    {isProcessing ? 'PROCESSING' : 'READY'}
                  </span>
                  <span className="text-[10px] text-slate-500">{(file.size / (1024 * 1024)).toFixed(1)} MB</span>
                </div>
              </div>
            )}
            <div className="p-3 rounded-lg bg-transparent border border-white/5 opacity-60">
              <p className="text-sm font-medium truncate">Movie_Presentation.mp4</p>
              <div className="flex justify-between mt-2 items-center">
                <span className="text-[10px] text-slate-500 font-mono flex items-center gap-1"><Clock size={10} /> 2D AGO</span>
                <span className="text-[10px] text-slate-500">1.1 GB</span>
              </div>
            </div>
          </div>
          <button className="w-full mt-8 py-2 border border-dashed border-slate-700 rounded-lg text-slate-500 text-xs hover:text-slate-300 hover:border-slate-500 transition-all cursor-pointer">
            View Full History
          </button>
        </aside>

        {/* Workspace */}
        <section className="flex-1 flex flex-col p-6 lg:p-10 overflow-hidden bg-bg-main relative">
          {/* Uploader / Preview */}
          {!videoUrl ? (
            <div 
              className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-white/10 rounded-3xl bg-white/[0.02] mb-8 group hover:border-indigo-500/50 transition-all cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
            >
              <input type="file" ref={fileInputRef} className="hidden" accept="video/*" onChange={handleFileChange} />
              <div className="w-20 h-20 bg-indigo-500/10 rounded-full flex items-center justify-center mb-6 border border-indigo-500/20 group-hover:bg-indigo-500/20 transition-all">
                <Upload className="w-10 h-10 text-indigo-400" />
              </div>
              <h2 className="text-2xl font-semibold mb-2">Upload your movie file</h2>
              <p className="text-slate-400 text-center max-w-sm px-4 text-sm">
                Drag and drop MKV, MP4, or MOV. Our AI will analyze the audio track and generate perfectly timed subtitles.
              </p>
              <button className="mt-8 px-10 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-full font-medium transition-all shadow-lg shadow-indigo-500/20">
                Select Media File
              </button>
              <p className="mt-4 text-[10px] text-slate-600 uppercase tracking-widest font-bold">Max file size: 10GB • 80+ Languages</p>
            </div>
          ) : (
            <div className="flex-1 flex flex-col min-h-0 mb-8">
              <div className="flex-1 glass-panel rounded-2xl overflow-hidden relative flex flex-col">
                {/* Video Controls Header */}
                <div className="absolute top-0 inset-x-0 h-12 bg-gradient-to-b from-black/60 to-transparent z-10 flex items-center justify-between px-4 opacity-0 hover:opacity-100 transition-opacity">
                  <div className="text-[10px] font-bold text-white uppercase tracking-tighter truncate max-w-md">{file?.name}</div>
                  <button onClick={() => setShowVideo(!showVideo)} className="text-white/80 hover:text-white">
                    {showVideo ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>

                <div className="flex-1 bg-black min-h-0">
                  {showVideo ? (
                    <video src={videoUrl} controls className="w-full h-full object-contain" />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-slate-500 gap-2">
                      <EyeOff size={32} />
                      <span className="text-xs uppercase font-bold tracking-widest">Video preview restricted</span>
                    </div>
                  )}
                </div>

                {/* Subtitle Overlay Rendering while processing */}
                <AnimatePresence>
                  {isProcessing && (
                    <motion.div 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="absolute bottom-16 inset-x-0 flex justify-center px-8 text-center pointer-events-none"
                    >
                      <div className="bg-black/60 backdrop-blur-md px-6 py-2 rounded-full border border-white/10 text-sm font-medium animate-pulse">
                        Neural engine mapping dialogue streams...
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          )}

          {/* Active Status */}
          <div className="bg-bg-secondary border border-white/5 rounded-2xl p-6 flex-none">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-sm font-semibold flex items-center gap-2">
                <LayoutGrid size={16} className="text-indigo-400" />
                Current Processing
              </h4>
              {isProcessing && (
                <span className="px-2 py-1 bg-indigo-500/20 text-indigo-400 text-[10px] rounded uppercase font-bold animate-pulse">
                  1 Task Active
                </span>
              )}
            </div>
            
            <div className="flex items-center gap-6">
              <div className="w-12 h-12 bg-bg-tertiary rounded-lg border border-white/5 flex items-center justify-center">
                <FileVideo className="w-6 h-6 text-slate-500" />
              </div>
              <div className="flex-1">
                <div className="flex justify-between text-xs mb-2">
                  <span className="text-slate-300 truncate max-w-md">{file ? file.name : "Waiting for input..."}</span>
                  <span className="text-indigo-400 font-mono">{isProcessing ? "64%" : file ? "0%" : "-"}</span>
                </div>
                <div className="w-full h-1.5 bg-bg-tertiary rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: isProcessing ? '64%' : file ? '0%' : '0%' }}
                    className="h-full bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.5)]"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <button 
                  disabled={!file || isProcessing}
                  onClick={extractSubtitles}
                  className="p-2 glass-panel rounded-lg hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <RefreshCcw size={16} className={isProcessing ? "animate-spin" : ""} />
                </button>
                <button 
                  disabled={!file}
                  onClick={() => { setFile(null); setVideoUrl(null); }}
                  className="p-2 glass-panel rounded-lg hover:bg-red-500/20 hover:text-red-400 disabled:opacity-30 transition-colors"
                >
                  <ArrowRight size={16} />
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Right Panel */}
        <aside className="w-80 hidden lg:flex flex-col bg-bg-tertiary border-l border-white/5 p-6 overflow-y-auto">
          <h3 className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-6">Extraction Engine</h3>
          
          <div className="space-y-6 flex-1">
            <div>
              <label className="text-[11px] text-slate-500 block mb-2 font-medium">PRIMARY LANGUAGE</label>
              <div className="relative">
                <select 
                  value={selectedLanguage}
                  onChange={(e) => setSelectedLanguage(e.target.value)}
                  className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-sm appearance-none focus:outline-none focus:border-indigo-500 transition-colors"
                >
                  <option>English (US)</option>
                  <option>English (UK)</option>
                  <option>Spanish (ES)</option>
                  <option>French (FR)</option>
                  <option>Japanese (JP)</option>
                  <option>Korean (KR)</option>
                </select>
                <Globe className="absolute right-3 top-2.5 w-4 h-4 text-slate-600 pointer-events-none" />
              </div>
            </div>

            <div>
              <label className="text-[11px] text-slate-500 block mb-2 font-medium">EXPORT FORMAT</label>
              <div className="grid grid-cols-2 gap-2">
                <button className="p-2 border border-indigo-500 bg-indigo-500/10 rounded-lg text-xs font-semibold text-indigo-200">SRT</button>
                <button className="p-2 border border-white/10 hover:border-white/20 rounded-lg text-xs font-medium text-slate-400 transition-colors">VTT</button>
                <button className="p-2 border border-white/10 hover:border-white/20 rounded-lg text-xs font-medium text-slate-400 transition-colors">ASS</button>
                <button className="p-2 border border-white/10 hover:border-white/20 rounded-lg text-xs font-medium text-slate-400 transition-colors">JSON</button>
              </div>
            </div>

            <div className="pt-4 border-t border-white/5">
              <label className="text-[11px] text-slate-500 block mb-3 font-medium">AI ENHANCEMENTS</label>
              <div className="space-y-4">
                <div className="flex items-center justify-between group cursor-pointer">
                  <span className="text-xs text-slate-300 group-hover:text-white transition-colors">Speaker Identification</span>
                  <div className="w-8 h-4 bg-indigo-600 rounded-full relative">
                    <div className="w-3 h-3 bg-white rounded-full absolute right-0.5 top-0.5" />
                  </div>
                </div>
                <div className="flex items-center justify-between group cursor-pointer opacity-50">
                  <span className="text-xs text-slate-300">Noise Suppression</span>
                  <div className="w-8 h-4 bg-slate-700 rounded-full relative">
                    <div className="w-3 h-3 bg-slate-400 rounded-full absolute left-0.5 top-0.5" />
                  </div>
                </div>
              </div>
            </div>

            {/* Output Transcript */}
            <div className="pt-4 border-t border-white/5 flex flex-col min-h-0 flex-1">
              <label className="text-[11px] text-slate-500 block mb-3 font-medium">LIVE TRANSCRIPT</label>
              <div className="flex-1 bg-bg-main/50 rounded-xl p-3 border border-white/5 overflow-y-auto custom-scrollbar font-mono text-[10px] text-indigo-300/80 leading-relaxed min-h-[200px]">
                {subtitles ? (
                  <pre className="whitespace-pre-wrap">{subtitles}</pre>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center opacity-20 text-center gap-2">
                    <Terminal size={24} />
                    <span>Awaiting data stream</span>
                  </div>
                )}
                <div ref={terminalEndRef} />
              </div>
              {subtitles && !isProcessing && (
                <button 
                  onClick={downloadSRT}
                  className="mt-3 w-full flex items-center justify-center gap-2 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-medium transition-all"
                >
                  <Download size={14} /> Download Subtitles
                </button>
              )}
            </div>
          </div>

          <div className="mt-6 bg-indigo-900/20 p-4 rounded-xl border border-indigo-500/10">
            <p className="text-[10px] text-indigo-300 font-bold uppercase mb-1">PRO UPDATES</p>
            <p className="text-[11px] text-slate-400 leading-relaxed">Translate extracted subtitles to 40+ languages instantly with CloudSync.</p>
          </div>
        </aside>
      </main>

      {/* Footer */}
      <footer className="h-8 flex-none border-t border-white/5 bg-bg-secondary flex items-center justify-between px-6 text-[10px] text-slate-500">
        <div className="flex gap-6">
          <span className="flex items-center gap-1.5">
            <div className={`w-1.5 h-1.5 rounded-full ${isProcessing ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'}`} />
            Engine: {isProcessing ? 'Processing' : 'Stable'}
          </span>
          <span className="hidden sm:inline">Build v2.4.1 (Stable)</span>
        </div>
        <div className="flex gap-4">
          {logs.length > 0 && <span>Log: {logs[logs.length-1]}</span>}
        </div>
      </footer>
    </div>
  );
}
