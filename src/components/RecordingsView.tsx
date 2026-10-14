import React, { useState, useMemo } from 'react';
import { 
  Disc, 
  Play, 
  Trash2, 
  Clock, 
  Calendar, 
  Search, 
  Plus, 
  CheckCircle2, 
  Radio, 
  Tv, 
  X, 
  Film,
  AlertCircle
} from 'lucide-react';
import { IPTVChannel, RecordingItem } from '../types/iptv';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface RecordingsViewProps {
  recordings: RecordingItem[];
  channels: IPTVChannel[];
  onPlayRecording: (item: RecordingItem) => void;
  onDeleteRecording: (id: string) => void;
  onStopRecording: (id: string) => void;
  onAddRecording: (data: Omit<RecordingItem, 'id' | 'createdAt'>) => void;
  onNavigateToGuide: () => void;
}

export function RecordingsView({
  recordings,
  channels,
  onPlayRecording,
  onDeleteRecording,
  onStopRecording,
  onAddRecording,
  onNavigateToGuide
}: RecordingsViewProps) {
  const [filter, setFilter] = useState<'all' | 'completed' | 'scheduled' | 'recording'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [isInstantRecordModalOpen, setIsInstantRecordModalOpen] = useState(false);

  // Form states for manual schedule modal
  const [selectedChannelId, setSelectedChannelId] = useState<string>(channels[0]?.id || '');
  const [programTitle, setProgramTitle] = useState('');
  const [startDate, setStartDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [startTimeStr, setStartTimeStr] = useState(() => {
    const d = new Date(Date.now() + 15 * 60 * 1000);
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  });
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [description, setDescription] = useState('');

  // Form states for instant record modal
  const [instantChannelId, setInstantChannelId] = useState<string>(channels[0]?.id || '');
  const [instantTitle, setInstantTitle] = useState('');
  const [instantDuration, setInstantDuration] = useState(60);

  // Statistics
  const completedCount = useMemo(() => recordings.filter(r => r.status === 'completed').length, [recordings]);
  const scheduledCount = useMemo(() => recordings.filter(r => r.status === 'scheduled').length, [recordings]);
  const recordingCount = useMemo(() => recordings.filter(r => r.status === 'recording').length, [recordings]);

  // Filtered recordings
  const filteredRecordings = useMemo(() => {
    return recordings.filter(rec => {
      if (filter !== 'all' && rec.status !== filter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        return (
          rec.programTitle.toLowerCase().includes(q) ||
          rec.channelName.toLowerCase().includes(q) ||
          (rec.description && rec.description.toLowerCase().includes(q))
        );
      }
      return true;
    }).sort((a, b) => {
      // Show active recordings first, then by date descending
      if (a.status === 'recording' && b.status !== 'recording') return -1;
      if (b.status === 'recording' && a.status !== 'recording') return 1;
      return b.startTime - a.startTime;
    });
  }, [recordings, filter, searchQuery]);

  // Handle schedule submit
  const handleScheduleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const ch = channels.find(c => c.id === selectedChannelId) || channels[0];
    if (!ch) return;

    const [hours, minutes] = startTimeStr.split(':').map(Number);
    const startObj = new Date(startDate);
    startObj.setHours(hours, minutes, 0, 0);
    const startTs = startObj.getTime();
    const endTs = startTs + durationMinutes * 60 * 1000;

    const isLiveNow = Date.now() >= startTs && Date.now() < endTs;

    onAddRecording({
      programTitle: programTitle.trim() || `Émission sur ${ch.name}`,
      channelId: ch.id,
      channelName: ch.name,
      channelLogo: ch.logo,
      streamUrl: ch.url,
      startTime: startTs,
      endTime: endTs,
      status: isLiveNow ? 'recording' : 'scheduled',
      recordedDurationMinutes: durationMinutes,
      fileSize: `${((durationMinutes * 25) / 1024).toFixed(1)} Go`,
      description: description.trim() || undefined,
      category: ch.group
    });

    setIsScheduleModalOpen(false);
    setProgramTitle('');
    setDescription('');
  };

  // Handle instant record submit
  const handleInstantSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const ch = channels.find(c => c.id === instantChannelId) || channels[0];
    if (!ch) return;

    const startTs = Date.now();
    const endTs = startTs + instantDuration * 60 * 1000;

    onAddRecording({
      programTitle: instantTitle.trim() || `Enregistrement direct - ${ch.name}`,
      channelId: ch.id,
      channelName: ch.name,
      channelLogo: ch.logo,
      streamUrl: ch.url,
      startTime: startTs,
      endTime: endTs,
      status: 'recording',
      recordedDurationMinutes: instantDuration,
      fileSize: `${((instantDuration * 25) / 1024).toFixed(1)} Go`,
      description: `Enregistrement en direct lancé le ${new Date().toLocaleDateString('fr-FR')} sur ${ch.name}`,
      category: ch.group
    });

    setIsInstantRecordModalOpen(false);
    setInstantTitle('');
  };

  const formatDateTime = (ts: number) => {
    const d = new Date(ts);
    return d.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDuration = (mins?: number) => {
    if (!mins) return 'Durée inconnue';
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    if (h > 0) {
      return `${h}h${m > 0 ? ` ${m}m` : ''}`;
    }
    return `${m} min`;
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#060a10] overflow-hidden select-none">
      {/* Top Header / Stats Bar */}
      <div className="bg-[#08101a] border-b border-white/10 px-4 sm:px-8 py-4 flex-shrink-0">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400 shadow-lg shadow-rose-500/10">
                <Disc className="w-5 h-5 animate-spin-slow" />
              </div>
              <div>
                <h1 className="text-lg sm:text-xl font-black text-white tracking-wide flex items-center gap-2">
                  <span>Enregistrements</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 font-mono border border-rose-500/30 font-bold">
                    PVR / DVR
                  </span>
                </h1>
                <p className="text-xs text-white/50">
                  Émissions enregistrées et programmations planifiées
                </p>
              </div>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              onClick={() => {
                if (channels.length > 0) {
                  setInstantChannelId(channels[0].id);
                }
                setIsInstantRecordModalOpen(true);
              }}
              data-tv-focusable="true"
              className="px-3.5 py-2 rounded-xl text-xs font-bold bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 transition-all flex items-center gap-2 cursor-pointer shadow-md"
            >
              <Radio className="w-3.5 h-3.5 text-rose-400 animate-pulse" />
              <span>Enregistrer le direct</span>
            </button>

            <button
              onClick={() => {
                if (channels.length > 0) {
                  setSelectedChannelId(channels[0].id);
                }
                setIsScheduleModalOpen(true);
              }}
              data-tv-focusable="true"
              className="px-3.5 py-2 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/15 text-white border border-white/15 transition-all flex items-center gap-2 cursor-pointer shadow-md"
            >
              <Plus className="w-3.5 h-3.5 text-emerald-400" />
              <span>Programmer</span>
            </button>

            <button
              onClick={onNavigateToGuide}
              data-tv-focusable="true"
              className="px-3.5 py-2 rounded-xl text-xs font-bold bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/30 transition-all flex items-center gap-2 cursor-pointer"
            >
              <Calendar className="w-3.5 h-3.5 text-cyan-400" />
              <span>Depuis le Guide TV</span>
            </button>
          </div>
        </div>

        {/* Filter Pills and Search */}
        <div className="mt-4 pt-3 border-t border-white/5 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 custom-scrollbar">
            <button
              onClick={() => setFilter('all')}
              data-tv-focusable="true"
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5",
                filter === 'all'
                  ? "bg-rose-500 text-black shadow-lg shadow-rose-500/25"
                  : "bg-white/5 text-white/60 hover:text-white hover:bg-white/10"
              )}
            >
              <Disc className="w-3.5 h-3.5" />
              <span>Tous ({recordings.length})</span>
            </button>

            <button
              onClick={() => setFilter('completed')}
              data-tv-focusable="true"
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5",
                filter === 'completed'
                  ? "bg-emerald-500 text-black shadow-lg shadow-emerald-500/25"
                  : "bg-white/5 text-white/60 hover:text-white hover:bg-white/10"
              )}
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Enregistrés ({completedCount})</span>
            </button>

            <button
              onClick={() => setFilter('scheduled')}
              data-tv-focusable="true"
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5",
                filter === 'scheduled'
                  ? "bg-cyan-500 text-black shadow-lg shadow-cyan-500/25"
                  : "bg-white/5 text-white/60 hover:text-white hover:bg-white/10"
              )}
            >
              <Clock className="w-3.5 h-3.5 text-cyan-400" />
              <span>En programmation ({scheduledCount})</span>
            </button>

            {recordingCount > 0 && (
              <button
                onClick={() => setFilter('recording')}
                data-tv-focusable="true"
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5",
                  filter === 'recording'
                    ? "bg-rose-600 text-white shadow-lg shadow-rose-600/30"
                    : "bg-rose-500/15 text-rose-300 hover:bg-rose-500/25 border border-rose-500/30"
                )}
              >
                <Radio className="w-3.5 h-3.5 text-rose-400 animate-pulse" />
                <span>En cours ({recordingCount})</span>
              </button>
            )}
          </div>

          {/* Search box */}
          <div className="relative min-w-[220px]">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
            <input
              type="text"
              placeholder="Rechercher une émission..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#111a28] text-xs text-white pl-8 pr-7 py-1.5 rounded-lg border border-white/10 focus:outline-none focus:border-rose-400 placeholder:text-white/30"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/40 hover:text-white"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-6 custom-scrollbar">
        {filteredRecordings.length === 0 ? (
          <div className="h-full min-h-[380px] flex flex-col items-center justify-center text-center p-8">
            <div className="w-20 h-20 bg-rose-500/10 rounded-3xl flex items-center justify-center mb-5 text-rose-400 border border-rose-500/20 shadow-xl shadow-rose-500/5">
              <Disc className="w-10 h-10 animate-pulse" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">
              {searchQuery
                ? `Aucun enregistrement trouvé pour "${searchQuery}"`
                : filter === 'completed'
                ? "Aucune émission enregistrée pour le moment"
                : filter === 'scheduled'
                ? "Aucune émission en programmation"
                : filter === 'recording'
                ? "Aucun enregistrement en cours d'exécution"
                : "Votre liste d'enregistrements est vide"}
            </h3>
            <p className="text-xs text-white/40 max-w-md mb-6 leading-relaxed">
              {filter === 'completed'
                ? "Programmez vos émissions favorites depuis le Guide TV ou lancez un enregistrement direct pour les retrouver ici."
                : filter === 'scheduled'
                ? "Consultez le Guide TV pour programmer vos émissions préférées à l'avance."
                : "Vous pouvez programmer un enregistrement directement depuis le Guide TV ou enregistrer le direct d'une chaîne."}
            </p>
            <div className="flex items-center gap-3">
              <button
                onClick={onNavigateToGuide}
                data-tv-focusable="true"
                className="px-6 py-2.5 bg-rose-500 hover:bg-rose-400 text-black font-extrabold rounded-xl text-xs shadow-lg shadow-rose-500/20 transition-all cursor-pointer flex items-center gap-2"
              >
                <Calendar className="w-4 h-4" />
                <span>Ouvrir le Guide TV</span>
              </button>
              <button
                onClick={() => setIsScheduleModalOpen(true)}
                data-tv-focusable="true"
                className="px-5 py-2.5 bg-white/10 hover:bg-white/15 text-white font-bold rounded-xl text-xs border border-white/10 transition-all cursor-pointer flex items-center gap-2"
              >
                <Plus className="w-4 h-4 text-emerald-400" />
                <span>Programmation manuelle</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredRecordings.map((rec) => {
              const isLive = rec.status === 'recording';
              const isScheduled = rec.status === 'scheduled';
              const isDone = rec.status === 'completed';

              return (
                <div
                  key={rec.id}
                  data-tv-focusable="true"
                  className={cn(
                    "group bg-[#0e1624] hover:bg-[#131f32] rounded-2xl border p-4 flex flex-col justify-between transition-all duration-200 outline-none relative overflow-hidden",
                    isLive 
                      ? "border-rose-500/60 shadow-xl shadow-rose-500/10 ring-1 ring-rose-500/30" 
                      : isScheduled
                      ? "border-cyan-500/30 hover:border-cyan-500/50"
                      : "border-white/10 hover:border-white/20",
                    "focus:ring-2 focus:ring-rose-400 focus:scale-[1.01]"
                  )}
                >
                  {/* Subtle top indicator bar */}
                  <div className={cn(
                    "absolute top-0 left-0 right-0 h-1",
                    isLive ? "bg-rose-500 animate-pulse" : isScheduled ? "bg-cyan-500" : "bg-emerald-500"
                  )} />

                  <div>
                    {/* Channel & Status Badge Header */}
                    <div className="flex items-start justify-between gap-2 mb-3 pt-1">
                      <div className="flex items-center gap-2 min-w-0">
                        {rec.channelLogo ? (
                          <img
                            src={rec.channelLogo}
                            alt=""
                            className="w-7 h-7 object-contain rounded-lg bg-black/40 p-0.5 border border-white/10 flex-shrink-0"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className="w-7 h-7 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-white/50 flex-shrink-0">
                            <Tv className="w-3.5 h-3.5" />
                          </div>
                        )}
                        <span className="text-xs font-bold text-white/80 truncate">
                          {rec.channelName}
                        </span>
                      </div>

                      {/* Status Badge */}
                      {isLive && (
                        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-500/20 text-rose-300 text-[10px] font-black uppercase tracking-wider border border-rose-500/40 animate-pulse">
                          <Radio className="w-3 h-3 text-rose-400" />
                          <span>En cours</span>
                        </div>
                      )}
                      {isScheduled && (
                        <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-cyan-500/15 text-cyan-300 text-[10px] font-bold uppercase tracking-wider border border-cyan-500/30">
                          <Clock className="w-3 h-3 text-cyan-400" />
                          <span>Programmé</span>
                        </div>
                      )}
                      {isDone && (
                        <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 text-[10px] font-bold uppercase tracking-wider border border-emerald-500/30">
                          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                          <span>Enregistré</span>
                        </div>
                      )}
                    </div>

                    {/* Program Title */}
                    <h3 className="text-sm font-extrabold text-white group-hover:text-rose-200 transition-colors line-clamp-2 mb-1.5">
                      {rec.programTitle}
                    </h3>

                    {/* Description if present */}
                    {rec.description && (
                      <p className="text-xs text-white/40 line-clamp-2 mb-3">
                        {rec.description}
                      </p>
                    )}

                    {/* Meta Info: Time, Duration, Size */}
                    <div className="space-y-1 text-[11px] text-white/50 mb-4 pt-1">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3 h-3 text-white/40" />
                        <span>{formatDateTime(rec.startTime)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-white/40" />
                          <span>{formatDuration(rec.recordedDurationMinutes)}</span>
                        </span>
                        {rec.fileSize && (
                          <>
                            <span className="text-white/20">•</span>
                            <span className="font-mono text-white/40">{rec.fileSize}</span>
                          </>
                        )}
                        {rec.category && (
                          <>
                            <span className="text-white/20">•</span>
                            <span className="text-white/40 truncate">{rec.category}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions Bar */}
                  <div className="pt-3 border-t border-white/10 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 flex-1">
                      {isDone && (
                        <button
                          onClick={() => onPlayRecording(rec)}
                          data-tv-focusable="true"
                          className="flex-1 px-3 py-2 bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold rounded-xl text-xs shadow-md shadow-emerald-500/20 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <Play className="w-3.5 h-3.5 fill-current" />
                          <span>Visionner</span>
                        </button>
                      )}

                      {isLive && (
                        <>
                          <button
                            onClick={() => onPlayRecording(rec)}
                            data-tv-focusable="true"
                            className="flex-1 px-2.5 py-2 bg-rose-500 hover:bg-rose-400 text-black font-black rounded-xl text-xs shadow-md shadow-rose-500/20 transition-all flex items-center justify-center gap-1 cursor-pointer"
                          >
                            <Play className="w-3.5 h-3.5 fill-current" />
                            <span>Voir le direct</span>
                          </button>
                          <button
                            onClick={() => onStopRecording(rec.id)}
                            data-tv-focusable="true"
                            title="Arrêter et finaliser l'enregistrement"
                            className="px-2.5 py-2 bg-white/10 hover:bg-white/20 text-rose-300 font-bold rounded-xl text-xs border border-white/10 transition-all cursor-pointer"
                          >
                            <span>Arrêter</span>
                          </button>
                        </>
                      )}

                      {isScheduled && (
                        <div className="flex-1 text-[11px] text-cyan-300/80 font-medium flex items-center gap-1">
                          <Clock className="w-3 h-3 text-cyan-400 animate-spin-slow" />
                          <span>Départ auto planifié</span>
                        </div>
                      )}
                    </div>

                    {/* Delete / Cancel button */}
                    <button
                      onClick={() => onDeleteRecording(rec.id)}
                      data-tv-focusable="true"
                      title={isScheduled ? "Annuler la programmation" : "Supprimer l'enregistrement"}
                      className="p-2 text-white/30 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition-all cursor-pointer flex-shrink-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Manual Schedule Modal */}
      {isScheduleModalOpen && (
        <div 
          className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
          onClick={() => setIsScheduleModalOpen(false)}
        >
          <div 
            className="w-full max-w-lg bg-[#0e1726] border border-white/15 rounded-3xl p-6 shadow-2xl space-y-4"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center">
                  <Calendar className="w-4 h-4" />
                </div>
                <h2 className="text-base font-black text-white">Programmer un enregistrement</h2>
              </div>
              <button
                onClick={() => setIsScheduleModalOpen(false)}
                className="p-1 rounded-lg text-white/50 hover:text-white hover:bg-white/10"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleScheduleSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-white/70 mb-1">Chaîne TV</label>
                <select
                  value={selectedChannelId}
                  onChange={(e) => setSelectedChannelId(e.target.value)}
                  className="w-full bg-[#162235] text-xs text-white px-3 py-2 rounded-xl border border-white/15 focus:outline-none focus:border-cyan-400"
                >
                  {channels.map(ch => (
                    <option key={ch.id} value={ch.id}>
                      {ch.name} {ch.group ? `(${ch.group})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-white/70 mb-1">Titre de l'émission</label>
                <input
                  type="text"
                  placeholder="Ex: Le Journal de 20h, Grand Prix F1, Film du Soir..."
                  value={programTitle}
                  onChange={(e) => setProgramTitle(e.target.value)}
                  required
                  className="w-full bg-[#162235] text-xs text-white px-3 py-2 rounded-xl border border-white/15 focus:outline-none focus:border-cyan-400 placeholder:text-white/30"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-white/70 mb-1">Date</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    required
                    className="w-full bg-[#162235] text-xs text-white px-3 py-2 rounded-xl border border-white/15 focus:outline-none focus:border-cyan-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-white/70 mb-1">Heure de début</label>
                  <input
                    type="time"
                    value={startTimeStr}
                    onChange={(e) => setStartTimeStr(e.target.value)}
                    required
                    className="w-full bg-[#162235] text-xs text-white px-3 py-2 rounded-xl border border-white/15 focus:outline-none focus:border-cyan-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-white/70 mb-1">Durée (minutes)</label>
                <div className="grid grid-cols-4 gap-2">
                  {[30, 60, 90, 120].map(mins => (
                    <button
                      key={mins}
                      type="button"
                      onClick={() => setDurationMinutes(mins)}
                      className={cn(
                        "py-2 rounded-xl text-xs font-bold transition-all border cursor-pointer",
                        durationMinutes === mins
                          ? "bg-cyan-500 text-black border-cyan-400"
                          : "bg-white/5 text-white/70 border-white/10 hover:bg-white/10"
                      )}
                    >
                      {mins} min
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-white/70 mb-1">Description (optionnelle)</label>
                <textarea
                  rows={2}
                  placeholder="Notes ou détails sur l'enregistrement..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-[#162235] text-xs text-white px-3 py-2 rounded-xl border border-white/15 focus:outline-none focus:border-cyan-400 placeholder:text-white/30 resize-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsScheduleModalOpen(false)}
                  className="px-4 py-2 bg-white/10 hover:bg-white/15 text-white text-xs font-bold rounded-xl transition-all cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-cyan-500 hover:bg-cyan-400 text-black text-xs font-black rounded-xl shadow-lg shadow-cyan-500/20 transition-all cursor-pointer"
                >
                  Confirmer la programmation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Instant Record Modal */}
      {isInstantRecordModalOpen && (
        <div 
          className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
          onClick={() => setIsInstantRecordModalOpen(false)}
        >
          <div 
            className="w-full max-w-md bg-[#0e1726] border border-rose-500/30 rounded-3xl p-6 shadow-2xl space-y-4"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center animate-pulse">
                  <Radio className="w-4 h-4" />
                </div>
                <h2 className="text-base font-black text-white">Enregistrer le direct maintenant</h2>
              </div>
              <button
                onClick={() => setIsInstantRecordModalOpen(false)}
                className="p-1 rounded-lg text-white/50 hover:text-white hover:bg-white/10"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleInstantSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-white/70 mb-1">Chaîne TV à enregistrer</label>
                <select
                  value={instantChannelId}
                  onChange={(e) => setInstantChannelId(e.target.value)}
                  className="w-full bg-[#162235] text-xs text-white px-3 py-2 rounded-xl border border-white/15 focus:outline-none focus:border-rose-400"
                >
                  {channels.map(ch => (
                    <option key={ch.id} value={ch.id}>
                      {ch.name} {ch.group ? `(${ch.group})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-white/70 mb-1">Nom du fichier / émission</label>
                <input
                  type="text"
                  placeholder="Ex: Direct Spécial, Match, Emission..."
                  value={instantTitle}
                  onChange={(e) => setInstantTitle(e.target.value)}
                  className="w-full bg-[#162235] text-xs text-white px-3 py-2 rounded-xl border border-white/15 focus:outline-none focus:border-rose-400 placeholder:text-white/30"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-white/70 mb-1">Durée d'enregistrement</label>
                <div className="grid grid-cols-4 gap-2">
                  {[30, 60, 90, 180].map(mins => (
                    <button
                      key={mins}
                      type="button"
                      onClick={() => setInstantDuration(mins)}
                      className={cn(
                        "py-2 rounded-xl text-xs font-bold transition-all border cursor-pointer",
                        instantDuration === mins
                          ? "bg-rose-500 text-black border-rose-400 font-black shadow-md shadow-rose-500/20"
                          : "bg-white/5 text-white/70 border-white/10 hover:bg-white/10"
                      )}
                    >
                      {mins} min
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>
                  L'enregistrement démarrera immédiatement en tâche de fond. Vous pourrez continuer à naviguer et regarder d'autres chaînes.
                </span>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsInstantRecordModalOpen(false)}
                  className="px-4 py-2 bg-white/10 hover:bg-white/15 text-white text-xs font-bold rounded-xl transition-all cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-rose-500 hover:bg-rose-400 text-black text-xs font-black rounded-xl shadow-lg shadow-rose-500/20 transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <Radio className="w-3.5 h-3.5" />
                  <span>Démarrer l'enregistrement</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
