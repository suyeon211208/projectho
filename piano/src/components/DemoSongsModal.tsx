import React from 'react';
import { DemoSong } from '../types/piano';
import { DEMO_SONGS } from '../utils/demoSongs';
import { Music, Play, Square, X, Sparkles, Award } from 'lucide-react';

interface DemoSongsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPlaySong: (song: DemoSong) => void;
  onStopSong: () => void;
  isPlayingSongId: string | null;
}

export const DemoSongsModal: React.FC<DemoSongsModalProps> = ({
  isOpen,
  onClose,
  onPlaySong,
  onStopSong,
  isPlayingSongId,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-5 shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-2.5 mb-4">
          <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <Music className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-100">데모 연주곡 라이브러리</h3>
            <p className="text-xs text-slate-400">자동 연주를 감상하거나 건반 가이드에 맞춰 연습해보세요.</p>
          </div>
        </div>

        <div className="space-y-2.5 max-h-[320px] overflow-y-auto pr-1 my-2">
          {DEMO_SONGS.map((song) => {
            const isPlaying = isPlayingSongId === song.id;

            return (
              <div
                key={song.id}
                className={`p-3.5 rounded-xl border transition-all ${
                  isPlaying
                    ? 'bg-indigo-950/60 border-indigo-500 shadow-lg shadow-indigo-500/10'
                    : 'bg-slate-800/50 hover:bg-slate-800 border-slate-700/60'
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h4 className="text-xs font-bold text-slate-100 flex items-center gap-2">
                      {song.title}
                      <span className={`text-[9px] font-mono font-semibold px-1.5 py-0.5 rounded border ${
                        song.difficulty === 'Easy'
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                          : song.difficulty === 'Medium'
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                          : 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                      }`}>
                        {song.difficulty}
                      </span>
                    </h4>
                    <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                      {song.composer} • {song.bpm} BPM
                    </p>
                  </div>

                  {isPlaying ? (
                    <button
                      onClick={onStopSong}
                      className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-md transition-all"
                    >
                      <Square className="w-3.5 h-3.5 fill-current" />
                      <span>중지</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => onPlaySong(song)}
                      className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md transition-all"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>자동 연주</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-4 pt-3 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
};
