import React, { useState, useEffect, useRef } from 'react';
import { RecordedTrack, PlayedNoteEvent, InstrumentType } from '../types/piano';
import { audioBufferToWav, downloadBlob } from '../utils/wavEncoder';
import { exportToMidiFile } from '../utils/midiEncoder';
import {
  Mic,
  Square,
  Play,
  Pause,
  Download,
  FileAudio,
  Music,
  Trash2,
  Clock,
  Sparkles,
  Volume2,
} from 'lucide-react';

interface RecorderPanelProps {
  isRecording: boolean;
  recordingDurationMs: number;
  onStartRecording: () => void;
  onStopRecording: () => void;
  recordedTracks: RecordedTrack[];
  onDeleteTrack: (id: string) => void;
  onPlayRecordedTrackNotes: (track: RecordedTrack) => void;
  isPlayingBackTrackId: string | null;
  onStopTrackPlayback: () => void;
}

export const RecorderPanel: React.FC<RecorderPanelProps> = ({
  isRecording,
  recordingDurationMs,
  onStartRecording,
  onStopRecording,
  recordedTracks,
  onDeleteTrack,
  onPlayRecordedTrackNotes,
  isPlayingBackTrackId,
  onStopTrackPlayback,
}) => {
  const [selectedTrack, setSelectedTrack] = useState<RecordedTrack | null>(null);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);

  useEffect(() => {
    if (recordedTracks.length > 0 && !selectedTrack) {
      setSelectedTrack(recordedTracks[0]);
    }
  }, [recordedTracks, selectedTrack]);

  const formatTime = (ms: number) => {
    const totalSec = Math.floor(ms / 1000);
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    const millis = Math.floor((ms % 1000) / 100);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${millis}`;
  };

  const handleDownloadWav = (track: RecordedTrack) => {
    if (track.audioBlob) {
      downloadBlob(track.audioBlob, `${track.title}.wav`);
    } else {
      alert('오디오 데이터가 유효하지 않습니다.');
    }
  };

  const handleDownloadMidi = (track: RecordedTrack) => {
    const midiBlob = exportToMidiFile(track.events, track.title);
    downloadBlob(midiBlob, `${track.title}.mid`);
  };

  const handlePlayAudio = (track: RecordedTrack) => {
    if (!track.audioUrl) return;

    if (audioPlayerRef.current) {
      if (isPlayingAudio) {
        audioPlayerRef.current.pause();
        setIsPlayingAudio(false);
      } else {
        audioPlayerRef.current.src = track.audioUrl;
        audioPlayerRef.current.play();
        setIsPlayingAudio(true);
      }
    }
  };

  return (
    <div className="bg-slate-900/80 backdrop-blur border border-slate-800 rounded-2xl p-4 shadow-xl">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-bold text-slate-200 flex items-center gap-2">
          <Mic className={`w-4 h-4 ${isRecording ? 'text-red-500 animate-pulse' : 'text-indigo-400'}`} />
          연주 녹음 및 저장 (Recording Studio)
        </h2>
        {isRecording && (
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-mono font-bold animate-pulse">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
            REC {formatTime(recordingDurationMs)}
          </div>
        )}
      </div>

      {/* Record Action Bar */}
      <div className="flex items-center gap-3 mb-5 p-3 rounded-xl bg-slate-800/60 border border-slate-700/60">
        {!isRecording ? (
          <button
            onClick={onStartRecording}
            className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-red-600/20 transition-all active:scale-95"
          >
            <Mic className="w-4 h-4" />
            <span>실시간 연주 녹음 시작</span>
          </button>
        ) : (
          <button
            onClick={onStopRecording}
            className="flex-1 py-2.5 px-4 rounded-xl bg-slate-700 hover:bg-slate-600 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg transition-all active:scale-95 border border-slate-600"
          >
            <Square className="w-4 h-4 text-red-400 fill-current" />
            <span>녹음 중지 및 저장</span>
          </button>
        )}
      </div>

      {/* Recorded Tracks List */}
      <div className="space-y-3">
        <div className="text-xs font-semibold text-slate-400 flex items-center justify-between">
          <span>저장된 연주 목록 ({recordedTracks.length})</span>
          <span className="text-[10px] text-slate-400 font-mono">WAV / MIDI 지원</span>
        </div>

        {recordedTracks.length === 0 ? (
          <div className="py-8 text-center border border-dashed border-slate-800 rounded-xl bg-slate-950/40">
            <Music className="w-8 h-8 text-slate-600 mx-auto mb-2" />
            <p className="text-xs text-slate-400 font-medium">아직 녹음된 연주가 없습니다.</p>
            <p className="text-[11px] text-slate-400 mt-0.5">녹음 시작 버튼을 누르고 건반을 연주해 보세요!</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
            {recordedTracks.map((track) => {
              const isSelected = selectedTrack?.id === track.id;
              const isSynthPlaying = isPlayingBackTrackId === track.id;

              return (
                <div
                  key={track.id}
                  onClick={() => setSelectedTrack(track)}
                  className={`p-3 rounded-xl border transition-all ${
                    isSelected
                      ? 'bg-slate-800 border-indigo-500/80 shadow-md'
                      : 'bg-slate-800/40 hover:bg-slate-800/80 border-slate-700/50'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                        <FileAudio className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-200">{track.title}</h4>
                        <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3 text-slate-500" />
                            {formatTime(track.durationMs)}
                          </span>
                          <span>• {track.events.length}개 노트</span>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteTrack(track.id);
                        if (selectedTrack?.id === track.id) setSelectedTrack(null);
                      }}
                      className="p-1.5 rounded-lg hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition-colors"
                      title="녹음 삭제"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Export / Download Buttons */}
                  <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-slate-700/40">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (isSynthPlaying) {
                          onStopTrackPlayback();
                        } else {
                          onPlayRecordedTrackNotes(track);
                        }
                      }}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold flex items-center gap-1 transition-all ${
                        isSynthPlaying
                          ? 'bg-amber-500 text-slate-950 font-bold'
                          : 'bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30'
                      }`}
                    >
                      {isSynthPlaying ? (
                        <>
                          <Pause className="w-3 h-3" />
                          <span>재생 중지</span>
                        </>
                      ) : (
                        <>
                          <Play className="w-3 h-3 fill-current" />
                          <span>건반으로 재생</span>
                        </>
                      )}
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDownloadWav(track);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 text-[11px] font-semibold flex items-center gap-1 transition-all"
                      title="고음질 WAV 오디오 다운로드"
                    >
                      <Download className="w-3 h-3" />
                      <span>WAV 오디오 다운로드</span>
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDownloadMidi(track);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/30 text-[11px] font-semibold flex items-center gap-1 transition-all"
                      title="MIDI 악보/시퀀스 다운로드"
                    >
                      <Music className="w-3 h-3" />
                      <span>MIDI 다운로드</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <audio ref={audioPlayerRef} onEnded={() => setIsPlayingAudio(false)} className="hidden" />
    </div>
  );
};
