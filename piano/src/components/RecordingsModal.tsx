import React from 'react';
import { RecordedTrack } from '../types/piano';
import { downloadBlob } from '../utils/wavEncoder';
import { exportToMidiFile } from '../utils/midiEncoder';
import {
  X,
  FileMusic,
  Play,
  Square,
  Download,
  Trash2,
  Clock,
  Music,
  FileAudio,
} from 'lucide-react';

interface RecordingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  recordedTracks: RecordedTrack[];
  onDeleteTrack: (id: string) => void;
  onPlayRecordedTrackNotes: (track: RecordedTrack) => void;
  isPlayingBackTrackId: string | null;
  onStopTrackPlayback: () => void;
}

export const RecordingsModal: React.FC<RecordingsModalProps> = ({
  isOpen,
  onClose,
  recordedTracks,
  onDeleteTrack,
  onPlayRecordedTrackNotes,
  isPlayingBackTrackId,
  onStopTrackPlayback,
}) => {
  if (!isOpen) return null;

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
      alert('저장된 오디오 데이터가 없습니다.');
    }
  };

  const handleDownloadMidi = (track: RecordedTrack) => {
    const midiBlob = exportToMidiFile(track.events, track.title);
    downloadBlob(midiBlob, `${track.title}.mid`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-5 shadow-2xl relative">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <FileMusic className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-slate-100">저장된 연주 목록</h3>
              <span className="px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-xs font-mono font-semibold">
                {recordedTracks.length}개
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              녹음된 가상 음원 연주를 다시 듣거나 WAV, MIDI 파일로 내보낼 수 있습니다.
            </p>
          </div>
        </div>

        {/* Tracks List */}
        <div className="space-y-2.5 max-h-[360px] overflow-y-auto pr-1 my-3">
          {recordedTracks.length === 0 ? (
            <div className="py-12 text-center border border-dashed border-slate-800 rounded-xl bg-slate-950/40">
              <Music className="w-10 h-10 text-slate-600 mx-auto mb-2" />
              <p className="text-xs text-slate-400 font-medium">아직 저장된 연주가 없습니다.</p>
              <p className="text-[11px] text-slate-500 mt-1">
                피아노 건반의 [녹음 시작] 버튼을 눌러 연주를 레코딩해 보세요!
              </p>
            </div>
          ) : (
            recordedTracks.map((track) => {
              const isPlaying = isPlayingBackTrackId === track.id;

              return (
                <div
                  key={track.id}
                  className={`p-3.5 rounded-xl border transition-all ${
                    isPlaying
                      ? 'bg-indigo-950/70 border-indigo-500 shadow-lg shadow-indigo-500/10'
                      : 'bg-slate-800/60 hover:bg-slate-800 border-slate-700/60'
                  }`}
                >
                  <div className="flex items-center justify-between gap-3 mb-2">
                    <div className="min-w-0 flex-1">
                      <h4 className="text-xs font-bold text-slate-100 truncate flex items-center gap-2">
                        {track.title}
                        <span className="text-[10px] text-indigo-300 font-normal px-1.5 py-0.2 rounded bg-indigo-500/10 border border-indigo-500/20 shrink-0">
                          {track.instrument}
                        </span>
                      </h4>
                      <div className="flex items-center gap-3 text-[11px] text-slate-400 font-mono mt-1">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-slate-500" />
                          {formatTime(track.durationMs)}
                        </span>
                        <span>•</span>
                        <span>{track.events.length} 노트</span>
                        <span>•</span>
                        <span>{new Date(track.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </div>

                    {/* Play / Stop Button */}
                    {isPlaying ? (
                      <button
                        type="button"
                        onClick={onStopTrackPlayback}
                        className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-md transition-all shrink-0"
                      >
                        <Square className="w-3.5 h-3.5 fill-current" />
                        <span>중지</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => onPlayRecordedTrackNotes(track)}
                        className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md transition-all shrink-0"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                        <span>재생</span>
                      </button>
                    )}
                  </div>

                  {/* Actions: Download & Delete */}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-700/50 text-[11px]">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleDownloadWav(track)}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-700 hover:bg-slate-600 text-slate-200 hover:text-white transition-colors"
                        title="WAV 오디오 다운로드"
                      >
                        <FileAudio className="w-3 h-3 text-indigo-400" />
                        <span>WAV</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDownloadMidi(track)}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-700 hover:bg-slate-600 text-slate-200 hover:text-white transition-colors"
                        title="MIDI 악보 파일 다운로드"
                      >
                        <Download className="w-3 h-3 text-indigo-400" />
                        <span>MIDI</span>
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => onDeleteTrack(track.id)}
                      className="p-1 rounded-md hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition-colors"
                      title="연주 삭제"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Modal Footer */}
        <div className="mt-4 pt-3 border-t border-slate-800 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-xs transition-colors"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
};
