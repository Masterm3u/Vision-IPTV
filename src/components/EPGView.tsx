import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Tv, Play, Heart, Info, Settings, ChevronRight, Clock, Star, Search, X, Filter, ChevronDown } from 'lucide-react';
import { IPTVChannel, EPGProgram } from '../types/iptv';
import { fixUtf8 } from '../utils/utf8';
import Hls from 'hls.js';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface EPGViewProps {
  channels: IPTVChannel[];
  onChannelSelect: (channel: IPTVChannel) => void;
  selectedGroup: string | null;
}

export default function EPGView({ channels, onChannelSelect, selectedGroup: initialGroup }: EPGViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(initialGroup);
  const [previewChannel, setPreviewChannel] = useState<IPTVChannel | null>(channels[0] || null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const gridRef = useRef<HTMLDivElement>(null);

  const categories = useMemo(() => {
    const map = new Map<string, number>();
    channels.forEach(ch => {
      const g = ch.group?.trim() || 'Uncategorized';
      map.set(g, (map.get(g) || 0) + 1);
    });
    return Array.from(map.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
  }, [channels]);

  const filteredChannels = useMemo(() => {
    let result = channels;
    if (selectedCategory) {
      result = result.filter(channel => (channel.group?.trim() || 'Uncategorized') === selectedCategory);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(channel => 
        (channel.name && channel.name.toLowerCase().includes(q)) ||
        (channel.group && channel.group.toLowerCase().includes(q))
      );
    }
    return result;
  }, [channels, selectedCategory, searchQuery]);

  // Update current time every minute
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  // Mock EPG data for the grid starting 1 hour before current time
  const mockEPG = useMemo(() => {
    const programs: Record<string, EPGProgram[]> = {};
    const now = currentTime.getTime();
    const startTime = now - (now % (30 * 60 * 1000)) - (1 * 60 * 60 * 1000); // Start 1 hour ago

    channels.forEach(channel => {
      const channelPrograms: EPGProgram[] = [];
      let lastStop = startTime;

      // Generate 12 hours of programs
      for (let i = 0; i < 24; i++) {
        const duration = (Math.floor(Math.random() * 3) + 1) * 30 * 60 * 1000; // 30, 60, or 90 mins
        const stop = lastStop + duration;
        channelPrograms.push({
          start: lastStop,
          stop: stop,
          title: i === 0 ? "Morning News" : i === 1 ? "Daily Talk" : `Program ${i + 1} on ${channel.name}`,
          description: "This is a detailed description of the program. It contains information about the plot, cast, and more.",
          channelId: channel.id
        });
        lastStop = stop;
      }
      programs[channel.id] = channelPrograms;
    });
    return programs;
  }, [channels]);

  const timeSlots = useMemo(() => {
    const slots = [];
    const now = currentTime.getTime();
    const startTime = now - (now % (30 * 60 * 1000)) - (1 * 60 * 60 * 1000); // Start 1 hour ago
    for (let i = 0; i < 24; i++) {
      slots.push(new Date(startTime + i * 30 * 60 * 1000));
    }
    return slots;
  }, [currentTime]);

  const currentProgram = useMemo(() => {
    if (!previewChannel) return null;
    const now = currentTime.getTime();
    return mockEPG[previewChannel.id]?.find(p => now >= p.start && now < p.stop) || null;
  }, [previewChannel, mockEPG, currentTime]);

  const timeIndicatorPosition = useMemo(() => {
    const startTime = timeSlots[0].getTime();
    return ((currentTime.getTime() - startTime) / (30 * 60 * 1000)) * 256;
  }, [currentTime, timeSlots]);

  return (
    <div className="flex-1 flex flex-col bg-[#050505] overflow-hidden">
      {/* Top Section: Preview + Info */}
      <div className="h-[45vh] min-h-[350px] flex border-b border-white/5 bg-[#080808]">
        {/* Mini Player */}
        <div className="w-[40%] h-full relative group bg-black">
          {previewChannel ? (
            <MiniPlayer channel={previewChannel} />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-black/40">
              <Tv className="w-16 h-16 text-white/10" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />
          <div className="absolute bottom-4 left-4 flex items-center gap-2">
            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            <span className="text-[10px] font-bold tracking-widest text-white/80 uppercase">Live Preview</span>
          </div>
        </div>

        {/* Program Info */}
        <div className="flex-1 p-10 flex flex-col justify-center gap-6 bg-gradient-to-r from-black/40 to-transparent">
          {previewChannel && currentProgram ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              key={previewChannel.id}
              className="space-y-6"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-3 text-emerald-500 font-bold text-xs tracking-widest uppercase">
                  <span>{fixUtf8(previewChannel.group)}</span>
                  <span className="w-1 h-1 bg-white/20 rounded-full" />
                  <span className="text-white/40">Channel {channels.indexOf(previewChannel) + 100}</span>
                </div>
                <h2 className="text-4xl font-black tracking-tight text-white">{fixUtf8(currentProgram.title)}</h2>
              </div>
              
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2 text-white/90 font-mono text-xl">
                  <Clock className="w-5 h-5 text-emerald-500" />
                  <span>
                    {new Date(currentProgram.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - 
                    {new Date(currentProgram.stop).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <div className="flex items-center gap-3 flex-1 max-w-xs">
                  <div className="h-1.5 flex-1 bg-white/10 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${((currentTime.getTime() - currentProgram.start) / (currentProgram.stop - currentProgram.start)) * 100}%` }}
                      className="h-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" 
                    />
                  </div>
                  <span className="text-white/40 text-xs font-bold">
                    {Math.round((currentProgram.stop - currentTime.getTime()) / (60 * 1000))} min left
                  </span>
                </div>
              </div>

              <p className="text-white/50 text-lg leading-relaxed max-w-4xl line-clamp-3 font-medium">
                {fixUtf8(currentProgram.description)}
              </p>

              <div className="flex items-center gap-4 pt-4">
                <button 
                  onClick={() => onChannelSelect(previewChannel)}
                  className="px-10 py-4 bg-emerald-500 text-black font-black rounded-2xl hover:bg-emerald-400 transition-all hover:scale-105 active:scale-95 flex items-center gap-3 shadow-xl shadow-emerald-500/20"
                >
                  <Play className="w-6 h-6 fill-current" />
                  WATCH NOW
                </button>
                <button className="p-4 bg-white/5 hover:bg-white/10 rounded-2xl transition-all hover:scale-105 text-white/60 hover:text-white">
                  <Star className="w-6 h-6" />
                </button>
                <button className="p-4 bg-white/5 hover:bg-white/10 rounded-2xl transition-all hover:scale-105 text-white/60 hover:text-white">
                  <Info className="w-6 h-6" />
                </button>
              </div>
            </motion.div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full opacity-10">
              <Tv className="w-32 h-32 mb-6" />
              <p className="text-2xl font-black tracking-tighter uppercase">Select a channel</p>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Section: EPG Grid */}
      <div className="flex-1 flex flex-col overflow-hidden relative">
        {/* Category Chips Bar */}
        {categories.length > 1 && (
          <div className="bg-[#0A0A0A] border-b border-white/5 px-4 py-2 overflow-x-auto custom-scrollbar flex items-center gap-2 flex-shrink-0 z-20">
            <button
              onClick={() => setSelectedCategory(null)}
              className={cn(
                "px-3 py-1 rounded-lg text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 flex-shrink-0",
                !selectedCategory
                  ? "bg-emerald-500 text-black shadow-lg shadow-emerald-500/20"
                  : "bg-white/5 hover:bg-white/10 text-white/60 hover:text-white border border-white/5"
              )}
            >
              <span>Toutes</span>
              <span className={cn(
                "px-1.5 py-0.2 text-[10px] rounded-full",
                !selectedCategory ? "bg-black/20 text-black font-extrabold" : "bg-white/10 text-white/40"
              )}>
                {channels.length}
              </span>
            </button>
            {categories.map((cat) => {
              const isSelected = selectedCategory === cat.name;
              return (
                <button
                  key={cat.name}
                  onClick={() => setSelectedCategory(isSelected ? null : cat.name)}
                  className={cn(
                    "px-3 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-all flex items-center gap-1.5 flex-shrink-0",
                    isSelected
                      ? "bg-emerald-500 text-black font-bold shadow-lg shadow-emerald-500/20"
                      : "bg-white/5 hover:bg-white/10 text-white/60 hover:text-white border border-white/5"
                  )}
                >
                  <span className="truncate max-w-[150px]">{cat.name}</span>
                  <span className={cn(
                    "px-1.5 py-0.2 text-[10px] rounded-full",
                    isSelected ? "bg-black/20 text-black font-extrabold" : "bg-white/10 text-white/40"
                  )}>
                    {cat.count}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* Timeline Header */}
        <div className="flex bg-[#0D0D0D] border-b border-white/5 z-20">
          <div className="w-72 flex-shrink-0 border-r border-white/5 p-3.5 flex flex-col justify-center gap-2 bg-[#0D0D0D]">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em]">
                {currentTime.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}
              </span>
              <span className="text-[10px] font-bold text-white/40">
                {filteredChannels.length} ch.
              </span>
            </div>
            <div className="relative group">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/40 group-focus-within:text-emerald-500 transition-colors" />
              <input
                type="text"
                placeholder="Filter channels..."
                value={searchQuery ?? ''}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-lg py-1 pl-8 pr-7 text-xs text-white placeholder-white/40 focus:outline-none focus:border-emerald-500/50 transition-colors"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 text-white/40 hover:text-white rounded transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
          <div className="flex-1 flex overflow-hidden">
            <div className="flex relative">
              {timeSlots.map((time, i) => (
                <div key={i} className="w-64 flex-shrink-0 p-5 text-center border-r border-white/5 text-xs font-black text-white/40 uppercase tracking-widest">
                  {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              ))}
              {/* Current Time Indicator in Header */}
              <div 
                className="absolute top-0 bottom-0 w-0.5 bg-emerald-500 z-30 shadow-[0_0_10px_rgba(16,185,129,0.8)]"
                style={{ left: timeIndicatorPosition }}
              />
            </div>
          </div>
        </div>

        {/* Channels + Programs Grid */}
        <div className="flex-1 max-h-[calc(100vh-140px)] overflow-y-auto custom-scrollbar relative" ref={gridRef}>
          {/* Vertical Time Indicator Line */}
          <div 
            className="absolute top-0 bottom-0 w-0.5 bg-emerald-500/30 z-10 pointer-events-none"
            style={{ left: `calc(18rem + ${timeIndicatorPosition}px)` }}
          />

          {filteredChannels.length === 0 ? (
            <div className="h-48 flex flex-col items-center justify-center text-center p-6 text-white/40">
              <Search className="w-8 h-8 mb-2 opacity-30" />
              <p className="text-sm font-medium">No channels found</p>
            </div>
          ) : (
            filteredChannels.map((channel) => (
              <div key={channel.id} className="flex border-b border-white/5 hover:bg-white/5 transition-colors group/row h-20">
                {/* Channel Info */}
                <button 
                  onClick={() => setPreviewChannel(channel)}
                  className={cn(
                    "w-72 flex-shrink-0 p-4 border-r border-white/5 flex items-center gap-4 text-left transition-all sticky left-0 z-20",
                    previewChannel?.id === channel.id ? "bg-emerald-500/20 border-r-emerald-500/50" : "bg-[#050505]"
                  )}
                >
                  <span className="text-xs font-bold text-white/20 w-6">{channels.indexOf(channel) + 100}</span>
                  <div className="w-14 h-10 bg-black/60 rounded-lg flex items-center justify-center overflow-hidden flex-shrink-0 border border-white/5 group-hover/row:border-white/20 transition-colors">
                    {channel.logo ? (
                      <img src={channel.logo} alt="" className="w-full h-full object-contain p-1.5" referrerPolicy="no-referrer" />
                    ) : (
                      <Tv className="w-5 h-5 text-white/10" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className={cn(
                      "font-bold text-sm truncate",
                      previewChannel?.id === channel.id ? "text-emerald-500" : "text-white/80"
                    )}>
                      {fixUtf8(channel.name)}
                    </h4>
                    <p className="text-[10px] text-white/30 uppercase tracking-widest truncate font-bold">{fixUtf8(channel.group)}</p>
                  </div>
                  {previewChannel?.id === channel.id && (
                    <div className="w-2 h-2 bg-emerald-500 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
                  )}
                </button>

                {/* Programs Timeline */}
                <div className="flex-1 flex overflow-x-auto no-scrollbar">
                  <div className="flex relative h-full">
                    {mockEPG[channel.id]?.map((program, i) => {
                      const startX = (program.start - timeSlots[0].getTime()) / (30 * 60 * 1000) * 256;
                      const width = (program.stop - program.start) / (30 * 60 * 1000) * 256;
                      const isCurrent = currentTime.getTime() >= program.start && currentTime.getTime() < program.stop;

                      return (
                        <div 
                          key={i}
                          className={cn(
                            "absolute top-1.5 bottom-1.5 rounded-xl border px-3 py-1.5 flex flex-col justify-center transition-all cursor-pointer overflow-hidden",
                            isCurrent && previewChannel?.id === channel.id 
                              ? "bg-emerald-950/80 border-emerald-500/50 shadow-md shadow-emerald-950/50 z-10" 
                              : "bg-[#141414] hover:bg-[#202020] border-white/5 hover:border-white/15"
                          )}
                          style={{ left: startX, width: Math.max(16, width) }}
                          onClick={() => setPreviewChannel(channel)}
                          title={`${program.title} (${new Date(program.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${new Date(program.stop).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})`}
                        >
                          <div className="w-full min-w-0 overflow-hidden flex flex-col justify-center">
                            <h5 className={cn(
                              "text-xs font-bold truncate mb-0.5 w-full block text-left",
                              isCurrent ? "text-emerald-400 font-extrabold" : "text-white/90 group-hover:text-white"
                            )}>
                              {program.title}
                            </h5>
                            {width >= 60 && (
                              <div className="flex items-center gap-1.5 min-w-0 w-full">
                                {isCurrent && <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full flex-shrink-0 animate-pulse" />}
                                <p className="text-[9px] text-white/40 font-mono truncate">
                                  {new Date(program.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - 
                                  {new Date(program.stop).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function MiniPlayer({ channel }: { channel: IPTVChannel }) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    let hlsInstance: Hls | null = null;
    let isCancelled = false;

    const safePlay = () => {
      if (isCancelled || !video) return;
      const playPromise = video.play();
      if (playPromise !== undefined) {
        playPromise.catch((err: any) => {
          if (err.name === 'AbortError' || err.name === 'NotAllowedError') {
            return;
          }
          console.warn("Mini-play prevented:", err?.message || err);
        });
      }
    };

    if (Hls.isSupported()) {
      hlsInstance = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
      });
      hlsInstance.loadSource(channel.url);
      hlsInstance.attachMedia(video);
      hlsInstance.on(Hls.Events.MANIFEST_PARSED, () => {
        safePlay();
      });
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = channel.url;
      const handleLoadedMetadata = () => safePlay();
      video.addEventListener('loadedmetadata', handleLoadedMetadata);
      return () => {
        isCancelled = true;
        video.removeEventListener('loadedmetadata', handleLoadedMetadata);
        try {
          video.pause();
          video.removeAttribute('src');
          video.load();
        } catch {
          // ignore
        }
      };
    }

    return () => {
      isCancelled = true;
      if (hlsInstance) {
        try {
          hlsInstance.stopLoad();
          hlsInstance.detachMedia();
          hlsInstance.destroy();
        } catch {
          // ignore
        }
      }
      if (video) {
        try {
          video.pause();
          video.removeAttribute('src');
          video.load();
        } catch {
          // ignore
        }
      }
    };
  }, [channel.url]);

  return (
    <div className="w-full h-full bg-black flex items-center justify-center overflow-hidden">
      <video 
        ref={videoRef}
        muted
        playsInline
        className="w-full h-full object-cover"
      />
    </div>
  );
}
