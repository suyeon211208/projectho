import React, { useRef, useEffect } from 'react';
import {
  Piano,
  VolumeX,
  Sparkles,
  Music,
  Settings,
  Zap,
  Disc,
  Church,
  Guitar,
  Bell,
  Play,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { InstrumentType } from '../types/piano';
import { INSTRUMENT_PRESETS } from './InstrumentSelector';

interface HeaderProps {
  currentInstrument: InstrumentType;
  currentInstrumentName: string;
  isAudioUnlocked: boolean;
  onUnlockAudio: () => void;
  onOpenDemoModal: () => void;
  onOpenSettingsModal: () => void;
  onSelectInstrument: (instrument: InstrumentType) => void;
  onPreviewSound: (instrument: InstrumentType) => void;
  isInstrumentDropdownOpen: boolean;
  onToggleInstrumentDropdown: () => void;
  onCloseInstrumentDropdown: () => void;
  baseOctave: number;
  activeOctave: number;
  onChangeBaseOctave: (delta: number) => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentInstrument,
  currentInstrumentName,
  isAudioUnlocked,
  onUnlockAudio,
  onOpenDemoModal,
  onOpenSettingsModal,
  onSelectInstrument,
  onPreviewSound,
  isInstrumentDropdownOpen,
  onToggleInstrumentDropdown,
  onCloseInstrumentDropdown,
  baseOctave,
  activeOctave,
  onChangeBaseOctave,
}) => {
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        onCloseInstrumentDropdown();
      }
    };
    if (isInstrumentDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isInstrumentDropdownOpen, onCloseInstrumentDropdown]);

  const getIcon = (id: string, className = "w-4 h-4") => {
    switch (id) {
      case 'grand_piano': return <Piano className={`${className} text-indigo-400`} />;
      case 'electric_piano': return <Zap className={`${className} text-cyan-400`} />;
      case 'synth_lead': return <Sparkles className={`${className} text-pink-400`} />;
      case 'church_organ': return <Church className={`${className} text-amber-400`} />;
      case 'marimba': return <Disc className={`${className} text-emerald-400`} />;
      case 'acoustic_guitar': return <Guitar className={`${className} text-orange-400`} />;
      case 'string_pad': return <Music className={`${className} text-purple-400`} />;
      case 'music_box': return <Bell className={`${className} text-teal-400`} />;
      default: return <Piano className={`${className} text-indigo-400`} />;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'Acoustic': return 'bg-amber-500/20 text-amber-300 border-amber-500/30';
      case 'Electric': return 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30';
      case 'Synth': return 'bg-purple-500/20 text-purple-300 border-purple-500/30';
      case 'Percussion': return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
      default: return 'bg-slate-700 text-slate-300 border-slate-600';
    }
  };

  return (
    <header className="bg-slate-900/90 backdrop-blur-md border-b border-slate-800 text-slate-100 px-4 py-3 sticky top-0 z-40 shadow-lg">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-2">
        {/* Logo & Title */}
        <div className="flex items-center gap-3">
          <div className="w-[34px] h-[34px] rounded-xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-pink-500 flex items-center justify-center shadow-md shadow-indigo-500/20">
            <Piano className="w-4 h-4 text-white" />
          </div>
          <div>
            <h1 className="text-xs font-bold tracking-tight bg-gradient-to-r from-white via-indigo-100 to-purple-200 bg-clip-text text-transparent flex items-center gap-2">
              웹 피아노 스튜디오
              <span className="text-[10px] font-semibold tracking-wide uppercase px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                PRO
              </span>
            </h1>
          </div>
        </div>

        {/* Center Active Status pill with Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <div className="flex items-center gap-2.5 bg-slate-800/80 px-3.5 py-1.5 rounded-full border border-slate-700/60 text-xs shadow-inner">
            <button
              type="button"
              onClick={onToggleInstrumentDropdown}
              className="flex items-center gap-1.5 text-indigo-300 hover:text-indigo-200 font-medium cursor-pointer transition-colors group focus:outline-none"
              title="악기 음색 선택 드롭다운 열기"
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-400 group-hover:scale-110 transition-transform animate-pulse" />
              <span>음색: <strong className="text-white group-hover:text-indigo-200 underline decoration-indigo-400/50 underline-offset-2">{currentInstrumentName}</strong></span>
              <ChevronDown className={`w-3.5 h-3.5 text-indigo-400 transition-transform duration-200 ${isInstrumentDropdownOpen ? 'rotate-180' : ''}`} />
            </button>
            <span className="text-slate-600">|</span>
            <div className="flex items-center gap-1 text-slate-300">
              <span className="text-slate-400 font-medium">옥타브:</span>
              <div className="flex items-center gap-0.5 bg-slate-900/80 px-1 py-0.5 rounded-lg border border-slate-700/80">
                <button
                  type="button"
                  onClick={() => onChangeBaseOctave(-1)}
                  disabled={baseOctave <= 1}
                  className="p-0.5 rounded hover:bg-slate-700 text-slate-300 hover:text-white disabled:opacity-30 disabled:hover:bg-transparent transition-colors focus:outline-none cursor-pointer disabled:cursor-not-allowed"
                  title="옥타브 내리기 (← 방향키)"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <span className="text-indigo-300 font-mono font-bold px-1 text-center min-w-[2rem]">
                  {activeOctave > 0 ? `+${activeOctave}` : activeOctave}
                </span>
                <button
                  type="button"
                  onClick={() => onChangeBaseOctave(1)}
                  disabled={baseOctave >= 6}
                  className="p-0.5 rounded hover:bg-slate-700 text-slate-300 hover:text-white disabled:opacity-30 disabled:hover:bg-transparent transition-colors focus:outline-none cursor-pointer disabled:cursor-not-allowed"
                  title="옥타브 올리기 (→ 방향키)"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Expanded Drop-down List Menu */}
          {isInstrumentDropdownOpen && (
            <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-80 sm:w-96 z-50 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden max-h-80 overflow-y-auto divide-y divide-slate-800 animate-in fade-in slide-in-from-top-2 duration-150">
              {INSTRUMENT_PRESETS.map((preset) => {
                const isSelected = preset.id === currentInstrument;
                return (
                  <div
                    key={preset.id}
                    onClick={() => {
                      onSelectInstrument(preset.id);
                      onCloseInstrumentDropdown();
                    }}
                    className={`p-3 flex items-center justify-between gap-3 cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-indigo-950 border-l-4 border-indigo-500 text-indigo-100'
                        : 'bg-slate-900 hover:bg-slate-800 text-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="p-2 rounded-xl bg-slate-950 border border-slate-800 shrink-0">
                        {getIcon(preset.id, "w-4 h-4")}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-bold truncate ${isSelected ? 'text-indigo-200' : 'text-slate-200'}`}>
                            {preset.nameKo}
                          </span>
                          <span className={`text-[9px] px-1.5 py-0.5 rounded border font-mono ${getCategoryColor(preset.category)}`}>
                            {preset.category}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">
                          {preset.description}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectInstrument(preset.id);
                          onPreviewSound(preset.id);
                        }}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-indigo-600 text-slate-300 hover:text-white transition-colors"
                        title="미리듣기"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                      </button>
                      {isSelected && (
                        <Check className="w-4 h-4 text-indigo-400" />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>


      </div>
    </header>
  );
};
