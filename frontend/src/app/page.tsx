"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { Search, Loader2, AlertCircle, CheckCircle2, DownloadCloud, Music, Video, ArrowRight, Sparkles } from "lucide-react";
import clsx from "clsx";

// --- Types ---
interface Format {
  format_id: string;
  height: number;
  ext: string;
  note?: string;
  delivery?: 'direct' | 'server';
  direct_url?: string | null;
}

interface VideoInfo {
  title: string;
  thumbnail: string;
  duration: number;
  formats: Format[];
}

type DownloadType = 'video' | 'audio';
type PhaseStatus = 'pending' | 'downloading' | 'processing' | 'completed' | 'failed';

interface PhasePayload {
  label: string;
  status: PhaseStatus;
  progress: number;
}

interface PhaseState extends PhasePayload {
  key: string;
}


// --- Regex for Validation ---
const YOUTUBE_REGEX = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.?be)\/.+$/;

export default function Home() {
  // --- State ---
  const [url, setUrl] = useState("");
  const [downloadType, setDownloadType] = useState<DownloadType>('video');
  const [isValidUrl, setIsValidUrl] = useState(true);
  
  const [loadingInfo, setLoadingInfo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [videoInfo, setVideoInfo] = useState<VideoInfo | null>(null);
  
  const [processingJob, setProcessingJob] = useState<string | null>(null);
  const [jobStatus, setJobStatus] = useState<string>("");
  const [progress, setProgress] = useState<number>(0);
  const [phaseStates, setPhaseStates] = useState<PhaseState[]>([]);

  const phaseStatusCopy: Record<PhaseStatus, string> = {
    pending: "Waiting",
    downloading: "Downloading",
    processing: "Processing",
    completed: "Completed",
    failed: "Failed",
  };

  const phaseAccent: Record<PhaseStatus, string> = {
    pending: "text-gray-400",
    downloading: "text-blue-300",
    processing: "text-purple-300",
    completed: "text-emerald-300",
    failed: "text-red-400",
  };

  // --- Effects ---
  useEffect(() => {
    if (url.trim() === "") {
        setIsValidUrl(true);
        setError(null);
    } else {
        const valid = YOUTUBE_REGEX.test(url);
        setIsValidUrl(valid);
        if (!valid) setError("Please enter a valid YouTube URL");
        else setError(null);
    }
  }, [url]);

  // --- Functions (Fetch/Poll/Download) ---
  // NOTE: These functions remain the same as before, just the UI changes below.
  const fetchInfo = async () => {
    if (!url || !isValidUrl) return;
    setLoadingInfo(true);
    setError(null);
    setVideoInfo(null);
    setProcessingJob(null);

    try {
      const res = await fetch("http://localhost:8000/info", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, type: downloadType }),
      });

      const payload = await res.json();
      if (!res.ok) {
        const detail = (payload as { detail?: string }).detail;
        throw new Error(detail || "Failed to fetch video info.");
      }

      setVideoInfo(payload as VideoInfo);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Something went wrong. Is the backend running?";
      setError(message);
    } finally {
      setLoadingInfo(false);
    }
  };

  const pollStatus = async (jobId: string) => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`http://localhost:8000/status/${jobId}`);
        if (!res.ok) throw new Error("Lost connection");
        
        const data = await res.json();
        setJobStatus(data.status);
        setProgress(typeof data.progress === 'number' ? data.progress : 0);
        if (data.phases) {
          const mappedPhases: PhaseState[] = Object.entries(data.phases).map(([key, value]) => {
            const phase = value as PhasePayload;
            return {
              key,
              label: phase.label,
              status: phase.status,
              progress: phase.progress,
            };
          });
          setPhaseStates(mappedPhases);
        }

        if (data.status === 'completed') {
          clearInterval(interval);
          setProgress(100);
          setTimeout(() => {
              window.location.href = `http://localhost:8000/file/${jobId}`;
              setProcessingJob(null);
              setProgress(0);
              setPhaseStates([]);
          }, 1000);
        } else if (data.status === 'failed') {
          clearInterval(interval);
          setProcessingJob(null);
          setError(`Download failed: ${data.error}`);
          setPhaseStates([]);
        }
      } catch {
        clearInterval(interval);
        setProcessingJob(null);
        setError("Lost connection to server.");
      }
    }, 1000);
  };

  const handleDownload = async (height?: number) => {
    if (!url || !videoInfo) return;
    setProcessingJob("starting");
    setJobStatus("queued");
    setProgress(0);
    setPhaseStates([]);
    setError(null);

    try {
      const res = await fetch("http://localhost:8000/download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, height, type: downloadType }),
      });

      if (!res.ok) throw new Error("Failed to start download");

      const data = await res.json();
      setProcessingJob(data.job_id);
      pollStatus(data.job_id);

    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to start download";
      setProcessingJob(null);
      setError(message);
    }
  };

  // --- Dynamic New Render ---
  return (
    // NEW: Dark Gradient Background with overflow hidden for background blobs
    <main className="flex min-h-screen flex-col items-center font-sans bg-gradient-to-br from-gray-900 via-indigo-950 to-slate-900 relative overflow-hidden">
      
      {/* NEW: Background Ambient Blobs for dynamism */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-blue-600/20 blur-[120px] z-0 pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-purple-600/20 blur-[120px] z-0 pointer-events-none"></div>

      {/* Header */}
      <header className="w-full py-6 z-50">
        <div className="max-w-5xl mx-auto px-6 flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl text-white shadow-lg shadow-blue-500/25">
                <DownloadCloud size={24} />
            </div>
            <h1 className="text-2xl font-extrabold text-white tracking-tight">ProDownloader</h1>
        </div>
      </header>

      <div className="w-full max-w-4xl px-4 flex flex-col items-center mt-10 mb-24 z-10 space-y-10">

        {/* Hero Text with Gradient */}
        <div className="text-center space-y-4">
          <h2 className="text-4xl sm:text-6xl font-extrabold text-white tracking-tight text-balance drop-shadow-sm">
            Download YouTube <br className="hidden sm:block"/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400">
              in Professional Quality.
            </span>
          </h2>
          <p className="text-gray-300 text-lg sm:text-xl max-w-2xl mx-auto leading-relaxed font-medium">
            Save 4K videos or extract crystal clear audio instantly. 
            <span className="text-gray-100"> Fast, free, and unlimited.</span>
          </p>
        </div>

        {/* Main Input Card - The "Command Center" */}
        <div className="w-full bg-white/10 backdrop-blur-md border border-white/20 p-8 rounded-3xl shadow-2xl relative z-20 space-y-8">
            
            {/* NEW: Modern Pill-shaped Toggles */}
            <div className="flex justify-center">
                <div className="bg-gray-900/50 p-1.5 rounded-full inline-flex border border-white/10 backdrop-blur-sm">
                    <button
                        onClick={() => { setDownloadType('video'); setVideoInfo(null); }}
                        className={clsx("px-6 py-2.5 rounded-full text-sm font-bold flex items-center gap-2 transition-all duration-300 ease-out", 
                            downloadType === 'video' ? "bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-md" : "text-gray-400 hover:text-white hover:bg-white/5"
                        )}
                        disabled={loadingInfo || !!processingJob}
                    >
                        <Video size={18}/> Video Mode
                    </button>
                    <button
                        onClick={() => { setDownloadType('audio'); setVideoInfo(null); }}
                        className={clsx("px-6 py-2.5 rounded-full text-sm font-bold flex items-center gap-2 transition-all duration-300 ease-out", 
                            downloadType === 'audio' ? "bg-gradient-to-r from-purple-500 to-pink-600 text-white shadow-md" : "text-gray-400 hover:text-white hover:bg-white/5"
                        )}
                        disabled={loadingInfo || !!processingJob}
                    >
                        <Music size={18}/> Audio Only
                    </button>
                </div>
            </div>

            {/* Search Input Area */}
            <div className="relative group">
                <div className={clsx("flex items-center bg-gray-900/60 border-2 rounded-2xl transition-all duration-300 overflow-hidden focus-within:ring-4 focus-within:ring-blue-500/20 focus-within:border-blue-500/50 shadow-inner",
                    !isValidUrl ? "border-red-500/50" : "border-white/10 group-hover:border-white/30"
                )}>
                    <div className="pl-5 text-gray-400 group-focus-within:text-blue-400 transition-colors">
                        <Search size={22} />
                    </div>
                    <input
                        type="text"
                        placeholder="Paste your amazing YouTube link here..."
                        className="w-full p-5 outline-none text-white placeholder-gray-500 bg-transparent text-lg font-medium"
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && isValidUrl && fetchInfo()}
                        disabled={loadingInfo || !!processingJob}
                    />
                    
                    {/* NEW: Gradient Analyze Button */}
                    <button
                        onClick={fetchInfo}
                        disabled={loadingInfo || !!processingJob || !url || !isValidUrl}
                        className={clsx("m-2 px-6 py-3.5 rounded-xl font-bold text-white transition-all duration-300 flex items-center gap-2 shrink-0 text-base shadow-lg active:scale-95",
                          (loadingInfo || !!processingJob || !url || !isValidUrl) 
                            ? "bg-gray-700/50 cursor-not-allowed opacity-70" 
                            : "bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:shadow-blue-500/30 hover:scale-[1.02]"
                        )}
                    >
                        {loadingInfo ? <Loader2 className="animate-spin" size={22} /> : <><Sparkles size={20}/> Analyze Link</>}
                    </button>
                </div>
                {/* Error Message */}
                {error && (
                <div className="absolute -bottom-10 left-0 text-red-400 text-sm font-medium flex items-center gap-1.5 animate-in slide-in-from-top-2 bg-red-950/30 px-3 py-1 rounded-full border border-red-900/50">
                    <AlertCircle size={14} /> {error}
                </div>
                )}
            </div>
        </div>

        {/* Processing State Card (Dark Mode) */}
        {processingJob && (
          <div className="w-full bg-white/10 backdrop-blur-md border border-white/20 p-8 rounded-3xl shadow-2xl flex flex-col gap-6 animate-in fade-in zoom-in-95">
            <div className="flex flex-col md:flex-row items-start gap-4 w-full">
              <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-500/30 to-indigo-500/10 border border-white/10">
                {jobStatus === 'completed' ? (
                  <CheckCircle2 size={48} className="text-green-400" />
                ) : (
                  <Loader2 size={48} className="animate-spin text-blue-300" />
                )}
              </div>
              <div className="flex-1 w-full space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div>
                    <p className="text-xs uppercase font-semibold tracking-[0.2em] text-gray-400">Live build log</p>
                    <h3 className="text-white text-2xl font-bold">{jobStatus === 'completed' ? 'Package ready!' : 'Crunching every byte'}</h3>
                  </div>
                  <span className="text-white text-2xl font-black">{progress.toFixed(0)}%</span>
                </div>
                <div className="w-full bg-gray-800/60 rounded-full h-3 overflow-hidden border border-white/10 shadow-inner">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 transition-all duration-500"
                    style={{ width: `${progress}%` }}
                  ></div>
                </div>
              </div>
            </div>

            <div className="space-y-4 w-full">
              {phaseStates.length > 0 ? phaseStates.map((phase) => (
                <div key={phase.key} className="bg-black/20 border border-white/10 rounded-2xl p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="w-2.5 h-2.5 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 inline-flex"></span>
                      <p className="text-white font-semibold text-base">{phase.label}</p>
                    </div>
                    <span className={`${phaseAccent[phase.status]} text-xs font-bold tracking-wide uppercase`}>
                      {phaseStatusCopy[phase.status]}
                    </span>
                  </div>
                  <div className="mt-3 h-2 bg-gray-800/60 rounded-full overflow-hidden">
                    <div
                      className={clsx(
                        "h-full rounded-full transition-all duration-500",
                        phase.status === 'completed' ? 'bg-emerald-400' : 'bg-gradient-to-r from-blue-500 to-indigo-500'
                      )}
                      style={{ width: `${phase.progress}%` }}
                    ></div>
                  </div>
                  <p className="mt-2 text-xs text-gray-400 font-medium">
                    {phase.progress.toFixed(0)}% ready
                  </p>
                </div>
              )) : (
                <div className="text-center text-gray-400 text-sm font-medium py-6">
                  Preparing download steps...
                </div>
              )}
            </div>
          </div>
        )}

        {/* Results Section (Dark Mode) */}
        {videoInfo && !processingJob && (
          <div className="w-full bg-white rounded-3xl overflow-hidden shadow-2xl animate-in fade-in slide-in-from-bottom-8 duration-500 border border-gray-200">
            {/* Preview Header */}
            <div className="flex flex-col md:flex-row gap-6 p-6 bg-gray-50 border-b border-gray-200">
              <div className="w-full md:w-72 aspect-video relative rounded-2xl shadow-md overflow-hidden">
                <Image
                  src={videoInfo.thumbnail}
                  alt={videoInfo.title}
                  fill
                  sizes="(max-width: 768px) 100vw, 288px"
                  className="object-cover"
                  priority
                />
              </div>
              <div className="flex-1 min-w-0 py-2 space-y-3">
                <h2 className="text-2xl font-extrabold text-gray-900 line-clamp-2">{videoInfo.title}</h2>
                <div className="flex items-center gap-4 text-sm text-gray-600 font-bold">
                  <span className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-red-100 text-red-600"><Music size={14}/> YouTube</span>
                  <span className="text-gray-300">•</span>
                  <span>{new Date(videoInfo.duration * 1000).toISOString().substr(11, 8).replace(/^00:/, '')} duration</span>
                </div>
              </div>
            </div>

            {/* Formats List */}
            <div className="bg-white">
              {downloadType === 'video' && (
                <div className="px-6 py-3 text-sm font-semibold text-gray-700 bg-gray-50 border-b border-gray-200">
                  ≤ 720p: Instant direct download (when available). &nbsp;|&nbsp; &gt; 720p: High quality needs processing (you’ll see progress).
                </div>
              )}
              <div className="grid grid-cols-12 gap-4 px-6 py-4 bg-gray-100 border-b border-gray-200 text-xs font-extrabold text-gray-500 uppercase tracking-wider">
                <div className="col-span-4 md:col-span-3">Quality</div>
                <div className="col-span-3 md:col-span-3 hidden md:block">Details</div>
                <div className="col-span-8 md:col-span-6 text-right">Download Action</div>
              </div>

              <div className="divide-y divide-gray-100">
                {videoInfo.formats.map((fmt) => (
                  <div key={fmt.format_id} className="grid grid-cols-12 gap-4 px-6 py-5 items-center hover:bg-blue-50 transition-colors group">
                    <div className="col-span-4 md:col-span-3 flex items-center gap-3">
                      {downloadType === 'video' ? (
                        <>
                          <span className={clsx("font-extrabold text-lg", fmt.height >= 1080 ? "text-indigo-700" : "text-gray-800")}>
                            {fmt.height}p
                          </span>
                          {fmt.height >= 720 && (
                            <span className={clsx("px-2 py-0.5 rounded-md text-[10px] font-extrabold tracking-wider shadow-sm",
                                fmt.height >= 2160 ? "bg-purple-100 text-purple-700 ring-1 ring-purple-200" : 
                                fmt.height >= 1080 ? "bg-blue-100 text-blue-700 ring-1 ring-blue-200" : "bg-gray-100 text-gray-700 ring-1 ring-gray-200"
                            )}>
                                {fmt.height >= 2160 ? '4K ULTRA HD' : fmt.height >= 1080 ? 'FULL HD' : 'HD'}
                            </span>
                          )}
                          {/* Delivery badge */}
                          {fmt.height > 0 && fmt.height <= 720 ? (
                            fmt.direct_url ? (
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold tracking-wider bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200">
                                DIRECT
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold tracking-wider bg-amber-100 text-amber-800 ring-1 ring-amber-200">
                                PROCESSING
                              </span>
                            )
                          ) : (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold tracking-wider bg-slate-100 text-slate-700 ring-1 ring-slate-200">
                              WAIT
                            </span>
                          )}
                        </>
                      ) : (
                        <span className="font-extrabold text-gray-800 flex items-center gap-2"><Music size={20} className="text-purple-600"/> MP3 Audio</span>
                      )}
                    </div>
                    <div className="col-span-3 hidden md:block text-sm text-gray-500 font-medium">
                      {downloadType === 'video' ? (
                        (fmt.height > 0 && fmt.height <= 720)
                          ? (fmt.direct_url ? 'Direct download (fastest)' : 'Needs processing (no direct file)')
                          : 'High quality (server merge required)'
                      ) : (
                        (fmt.note || 'Standard Quality')
                      )}
                    </div>
                    <div className="col-span-8 md:col-span-6 text-right">
                      {downloadType === 'video' && fmt.height > 0 && fmt.height <= 720 && fmt.direct_url ? (
                        <button
                          onClick={() => window.open(String(fmt.direct_url), "_blank", "noopener,noreferrer")}
                          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-emerald-700 hover:bg-emerald-800 focus:ring-4 focus:ring-emerald-200 transition-all duration-300 shadow-md hover:shadow-lg hover:-translate-y-0.5"
                        >
                          Direct Download <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform"/>
                        </button>
                      ) : (
                        <button
                          onClick={() => handleDownload(downloadType === 'video' ? fmt.height : undefined)}
                          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-gray-900 hover:bg-gradient-to-r hover:from-blue-600 hover:to-indigo-600 focus:ring-4 focus:ring-blue-200 transition-all duration-300 shadow-md hover:shadow-lg hover:-translate-y-0.5"
                        >
                          {downloadType === 'video' && (fmt.height || 0) > 720
                            ? 'High Quality (Wait)'
                            : (downloadType === 'video' && (fmt.height || 0) > 0 && (fmt.height || 0) <= 720 && !fmt.direct_url)
                              ? 'Download (Processing)'
                              : 'Download'}
                          <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform"/>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}