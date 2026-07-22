import React, { useState, useRef, useEffect } from 'react';
import { InstrumentType, InstrumentPreset } from '../types/piano';
import {
  Piano,
  Zap,
  Disc,
  Church,
  Sparkles,
  Guitar,
  Music,
  Bell,
  Play,
  ChevronDown,
  Check,
  Volume2
} from 'lucide-react';

interface InstrumentSelectorProps {
  currentInstrument: InstrumentType;
  onSelectInstrument: (instrument: InstrumentType) => void;
  onPreviewSound: (instrument: InstrumentType) => void;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export const INSTRUMENT_PRESETS: InstrumentPreset[] = [
  {
    id: 'grand_piano',
    name: 'Grand Piano',
    nameKo: '그랜드 피아노',
    category: 'Acoustic',
    iconName: 'Piano',
    description: '풍부하고 깊은 현의 울림과 맑은 배음을 지닌 정통 클래식 피아노',
    attack: 0.005,
    decay: 3.5,
    sustain: 0.1,
    release: 0.25,
  },
  {
    id: 'electric_piano',
    name: 'Electric Piano',
    nameKo: '일렉트릭 피아노 (Rhodes)',
    category: 'Electric',
    iconName: 'Zap',
    description: '따뜻한 종소리 감성의 차임과 감성적인 재즈/재즈팝 톤',
    attack: 0.01,
    decay: 2.0,
    sustain: 0.2,
    release: 0.35,
  },
  {
    id: 'synth_lead',
    name: 'Synth Lead',
    nameKo: '신디사이저 리드',
    category: 'Synth',
    iconName: 'Sparkles',
    description: '화려하고 날카로운 필터 스윕의 현대적 팝/전자음악 사운드',
    attack: 0.015,
    decay: 1.0,
    sustain: 0.6,
    release: 0.15,
  },
  {
    id: 'church_organ',
    name: 'Church Organ',
    nameKo: '파이프 오르간',
    category: 'Acoustic',
    iconName: 'Church',
    description: '웅장한 성당 공간을 채우는 다중 공명 파이프 관악기 음색',
    attack: 0.04,
    decay: 0.1,
    sustain: 1.0,
    release: 0.1,
  },
  {
    id: 'marimba',
    name: 'Marimba',
    nameKo: '마림바',
    category: 'Percussion',
    iconName: 'Disc',
    description: '따뜻하고 유기적인 나무 울림통의 아프리칸 타악기 음색',
    attack: 0.002,
    decay: 1.2,
    sustain: 0.01,
    release: 0.15,
  },
  {
    id: 'acoustic_guitar',
    name: 'Acoustic Guitar',
    nameKo: '어쿠스틱 기타',
    category: 'Acoustic',
    iconName: 'Guitar',
    description: '핑거스타일과 통기타의 현을 튕기는 듯한 맑은 아르페지오 톤',
    attack: 0.005,
    decay: 2.0,
    sustain: 0.1,
    release: 0.3,
  },
  {
    id: 'string_pad',
    name: 'String Pad',
    nameKo: '스트링 패드',
    category: 'Synth',
    iconName: 'Music',
    description: '부드러운 서스테인과 웅장한 아티큘레이션의 앙상블 현악기',
    attack: 0.22,
    decay: 1.5,
    sustain: 0.8,
    release: 0.6,
  },
  {
    id: 'music_box',
    name: 'Music Box',
    nameKo: '오르골',
    category: 'Percussion',
    iconName: 'Bell',
    description: '신비롭고 영롱하게 울려 퍼지는 맑은 수정 구슬 멜로디',
    attack: 0.003,
    decay: 2.5,
    sustain: 0.05,
    release: 0.4,
  },
];

export const InstrumentSelector: React.FC<InstrumentSelectorProps> = ({
  currentInstrument,
  onSelectInstrument,
  onPreviewSound,
  isOpen: controlledIsOpen,
  onOpenChange: controlledOnOpenChange,
}) => {
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const isOpen = controlledIsOpen !== undefined ? controlledIsOpen : internalIsOpen;
  const setIsOpen = (open: boolean | ((prev: boolean) => boolean)) => {
    const nextValue = typeof open === 'function' ? open(isOpen) : open;
    if (controlledOnOpenChange) {
      controlledOnOpenChange(nextValue);
    }
    setInternalIsOpen(nextValue);
  };

  const selectedPreset = INSTRUMENT_PRESETS.find(p => p.id === currentInstrument) || INSTRUMENT_PRESETS[0];

  const getIcon = (id: string, className = "w-5 h-5") => {
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

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative z-50" ref={dropdownRef}>
      {/* Custom Dropdown Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full bg-slate-900 hover:bg-slate-800 border border-slate-700 hover:border-indigo-500/60 rounded-2xl px-4 py-3 flex items-center justify-between transition-all duration-200 shadow-xl group text-left"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="p-2 rounded-xl bg-slate-950 border border-slate-800 shrink-0">
            {getIcon(selectedPreset.id)}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-slate-100 truncate">
                {selectedPreset.nameKo}
              </span>
              <span className={`text-[10px] px-2 py-0.5 rounded-full border font-mono shrink-0 ${getCategoryColor(selectedPreset.category)}`}>
                {selectedPreset.category}
              </span>
            </div>
            <p className="text-xs text-slate-400 font-mono truncate">
              {selectedPreset.name}
            </p>
          </div>
        </div>

        <ChevronDown className={`w-5 h-5 text-slate-400 group-hover:text-indigo-400 transition-transform duration-200 ml-2 shrink-0 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Expanded Drop-down List Menu (Opaque 100%, z-50 to overlay real-time visualizer) */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 z-50 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden max-h-80 overflow-y-auto divide-y divide-slate-800 animate-in fade-in slide-in-from-top-2 duration-150">
          {INSTRUMENT_PRESETS.map((preset) => {
            const isSelected = preset.id === currentInstrument;
            return (
              <div
                key={preset.id}
                onClick={() => {
                  onSelectInstrument(preset.id);
                  setIsOpen(false);
                }}
                className={`p-3.5 flex items-center justify-between gap-3 cursor-pointer transition-colors ${
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
  );
};

