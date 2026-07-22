import React, { useEffect, useState, useRef, useCallback } from 'react';
import { NoteInfo, KeyLabelType, AudioSettings, MetronomeSettings } from '../types/piano';
import { formatNoteLabel, getMidiFromKeyboardKey } from '../utils/noteUtils';
import {
  ChevronLeft,
  ChevronRight,
  Layers,
  Smartphone,
  Mic,
  Square,
  FileMusic,
  Clock,
  Sliders,
  Volume2,
  Plus,
  Minus,
  Repeat,
  X
} from 'lucide-react';

interface PianoKeybedProps {
  visibleNotes: NoteInfo[];
  activeNotes: Set<number>;
  onNoteOn: (midi: number) => void;
  onNoteOff: (midi: number) => void;
  labelType?: KeyLabelType;
  onChangeLabelType?: (type: KeyLabelType) => void;
  baseOctave: number;
  onChangeBaseOctave: (delta: number) => void;
  isRecording?: boolean;
  recordingDurationMs?: number;
  onStartRecording?: () => void;
  onStopRecording?: () => void;
  onOpenRecordingsList?: () => void;
  audioSettings?: AudioSettings;
  onUpdateAudioSettings?: (settings: Partial<AudioSettings>) => void;
  metronomeSettings?: MetronomeSettings;
  onUpdateMetronomeSettings?: (settings: Partial<MetronomeSettings>) => void;
  onToggleMetronome?: () => void;
}

export const PianoKeybed: React.FC<PianoKeybedProps> = ({
  visibleNotes,
  activeNotes,
  onNoteOn,
  onNoteOff,
  labelType = 'keyboard',
  onChangeLabelType,
  baseOctave,
  onChangeBaseOctave,
  isRecording = false,
  recordingDurationMs = 0,
  onStartRecording,
  onStopRecording,
  onOpenRecordingsList,
  audioSettings,
  onUpdateAudioSettings,
  metronomeSettings,
  onUpdateMetronomeSettings,
  onToggleMetronome,
}) => {
  const [pressedKeys, setPressedKeys] = useState<Set<number>>(new Set());
  const [isFxPopoverOpen, setIsFxPopoverOpen] = useState(false);
  const fxPopoverRef = useRef<HTMLDivElement>(null);
  const activePointersRef = useRef<Map<number, number>>(new Map()); // pointerId -> midi

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (fxPopoverRef.current && !fxPopoverRef.current.contains(event.target as Node)) {
        setIsFxPopoverOpen(false);
      }
    };
    if (isFxPopoverOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isFxPopoverOpen]);
  const activeKeyboardKeysRef = useRef<Set<string>>(new Set());

  // Handle PC Keyboard press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing inside an input or textarea
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }

      if (e.repeat) return; // ignore key repeat

      const key = e.key;

      // Octave Shift Shortcuts (Z or X if shift held or Arrow Left/Right)
      if (e.key === 'ArrowLeft') {
        onChangeBaseOctave(-1);
        return;
      }
      if (e.key === 'ArrowRight') {
        onChangeBaseOctave(1);
        return;
      }

      const midi = getMidiFromKeyboardKey(key, baseOctave);
      if (midi !== null && !activeKeyboardKeysRef.current.has(key.toLowerCase())) {
        activeKeyboardKeysRef.current.add(key.toLowerCase());
        onNoteOn(midi);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (activeKeyboardKeysRef.current.has(key)) {
        activeKeyboardKeysRef.current.delete(key);
        const midi = getMidiFromKeyboardKey(key, baseOctave);
        if (midi !== null) {
          onNoteOff(midi);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [baseOctave, onNoteOn, onNoteOff, onChangeBaseOctave]);

  // Handle Pointer / Touch Events
  const handlePointerDown = (e: React.PointerEvent, midi: number) => {
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    activePointersRef.current.set(e.pointerId, midi);
    onNoteOn(midi);
  };

  const handlePointerUp = (e: React.PointerEvent, midi: number) => {
    if (activePointersRef.current.has(e.pointerId)) {
      activePointersRef.current.delete(e.pointerId);
      onNoteOff(midi);
    }
  };

  const handlePointerEnter = (e: React.PointerEvent, midi: number) => {
    // If dragging finger/mouse across keys
    if (e.buttons === 1 || e.pointerType === 'touch') {
      const prevMidi = activePointersRef.current.get(e.pointerId);
      if (prevMidi !== undefined && prevMidi !== midi) {
        onNoteOff(prevMidi);
      }
      activePointersRef.current.set(e.pointerId, midi);
      onNoteOn(midi);
    }
  };

  const handlePointerLeave = (e: React.PointerEvent, midi: number) => {
    if (activePointersRef.current.has(e.pointerId)) {
      const activeMidi = activePointersRef.current.get(e.pointerId);
      if (activeMidi === midi) {
        activePointersRef.current.delete(e.pointerId);
        onNoteOff(midi);
      }
    }
  };

  // Group notes into white keys and black key overlays
  const whiteNotes = visibleNotes.filter(n => !n.isBlack);

  return (
    <div className="w-full bg-slate-900 border border-slate-800 rounded-b-2xl p-3 sm:p-4 shadow-2xl select-none touch-none">
      {/* Octave & Label Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3 text-xs text-slate-300">
        {/* Recording Control Button & Saved Recordings File List Button */}
        <div className="flex items-center gap-2">
          {isRecording ? (
            <button
              type="button"
              onClick={onStopRecording}
              className="p-2 bg-red-600/90 hover:bg-red-500 active:bg-red-700 text-white rounded-xl transition-all shadow-lg shadow-red-600/30 cursor-pointer animate-pulse flex items-center justify-center"
              title={`녹음 중지 (${Math.floor(recordingDurationMs / 1000 / 60).toString().padStart(2, '0')}:{(Math.floor(recordingDurationMs / 1000) % 60).toString().padStart(2, '0')})`}
            >
              <Square className="w-4 h-4 fill-current" />
            </button>
          ) : (
            <button
              type="button"
              onClick={onStartRecording}
              className="p-2 bg-red-600 hover:bg-red-500 active:bg-red-700 text-white rounded-xl transition-all shadow-md shadow-red-600/20 cursor-pointer flex items-center justify-center"
              title="녹음 시작"
            >
              <Mic className="w-4 h-4 text-white" />
            </button>
          )}

          <button
            type="button"
            onClick={onOpenRecordingsList}
            className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 active:bg-slate-800 text-indigo-300 hover:text-white border border-slate-700/80 transition-all cursor-pointer shadow-sm flex items-center justify-center"
            title="저장된 연주 목록 보기"
          >
            <FileMusic className="w-4 h-4 text-indigo-400" />
          </button>
        </div>

        {/* Audio FX & Metronome Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Metronome Control Group */}
          <div className="flex items-center gap-1.5 bg-slate-800/80 px-2.5 py-1 rounded-xl border border-slate-700/80">
            <button
              type="button"
              onClick={onToggleMetronome}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                metronomeSettings?.enabled
                  ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                  : 'bg-slate-700 text-slate-300 hover:text-white'
              }`}
              title="메트로놈 켜기/끄기"
            >
              <Clock className={`w-3.5 h-3.5 ${metronomeSettings?.enabled ? 'animate-spin' : ''}`} />
              <span>{metronomeSettings?.enabled ? '메트로놈 ON' : '메트로놈 OFF'}</span>
            </button>

            <div className="flex items-center gap-0.5 ml-1 bg-slate-900/80 px-1 py-0.5 rounded-lg border border-slate-700/60">
              <button
                type="button"
                onClick={() => onUpdateMetronomeSettings?.({ bpm: Math.max(40, (metronomeSettings?.bpm || 120) - 5) })}
                className="p-0.5 rounded hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
                title="템포 감속 (-5 BPM)"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
              <span className="font-mono font-bold text-emerald-400 text-xs px-1 min-w-[3.4rem] text-center">
                {metronomeSettings?.bpm || 120} <span className="text-[10px] font-normal text-slate-400">BPM</span>
              </span>
              <button
                type="button"
                onClick={() => onUpdateMetronomeSettings?.({ bpm: Math.min(240, (metronomeSettings?.bpm || 120) + 5) })}
                className="p-0.5 rounded hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
                title="템포 가속 (+5 BPM)"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Sustain Pedal Toggle */}
          <button
            type="button"
            onClick={() => onUpdateAudioSettings?.({ sustainPedal: !audioSettings?.sustainPedal })}
            className={`px-2.5 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 cursor-pointer ${
              audioSettings?.sustainPedal
                ? 'bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-600/30'
                : 'bg-slate-800/80 text-slate-400 border-slate-700/80 hover:text-slate-200'
            }`}
            title="서스테인 페달 (스페이스바)"
          >
            <Repeat className="w-3.5 h-3.5" />
            <span>{audioSettings?.sustainPedal ? '서스테인 ON' : '서스테인 OFF'}</span>
          </button>

          {/* FX Sliders Popover */}
          <div className="relative" ref={fxPopoverRef}>
            <button
              type="button"
              onClick={() => setIsFxPopoverOpen(prev => !prev)}
              className={`px-2.5 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 cursor-pointer ${
                isFxPopoverOpen
                  ? 'bg-indigo-600 text-white border-indigo-500 shadow-md'
                  : 'bg-slate-800/80 text-indigo-300 border-slate-700/80 hover:bg-slate-700 hover:text-white'
              }`}
              title="오디오 이펙트 조절"
            >
              <Sliders className="w-3.5 h-3.5 text-indigo-400" />
              <span>이펙트 (FX)</span>
            </button>

            {/* Popover */}
            {isFxPopoverOpen && (
              <div className="absolute right-0 top-full mt-2 w-64 p-3.5 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl z-50 space-y-3 animate-in fade-in slide-in-from-top-2 duration-150">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                    <Volume2 className="w-3.5 h-3.5 text-indigo-400" />
                    오디오 이펙트 & 볼륨
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsFxPopoverOpen(false)}
                    className="p-1 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Master Volume */}
                <div>
                  <div className="flex justify-between text-[11px] text-slate-300 mb-1 font-medium">
                    <span>마스터 볼륨</span>
                    <span className="font-mono text-indigo-300">{Math.round((audioSettings?.masterVolume ?? 0.8) * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={audioSettings?.masterVolume ?? 0.8}
                    onChange={(e) => onUpdateAudioSettings?.({ masterVolume: parseFloat(e.target.value) })}
                    className="w-full accent-indigo-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
                  />
                </div>

                {/* Reverb Level */}
                <div>
                  <div className="flex justify-between text-[11px] text-slate-300 mb-1 font-medium">
                    <span>리버브 (Reverb)</span>
                    <span className="font-mono text-indigo-300">{Math.round((audioSettings?.reverbLevel ?? 0.3) * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="0.8"
                    step="0.01"
                    value={audioSettings?.reverbLevel ?? 0.3}
                    onChange={(e) => onUpdateAudioSettings?.({ reverbLevel: parseFloat(e.target.value) })}
                    className="w-full accent-indigo-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
                  />
                </div>

                {/* Delay Level */}
                <div>
                  <div className="flex justify-between text-[11px] text-slate-300 mb-1 font-medium">
                    <span>디레이 (Delay)</span>
                    <span className="font-mono text-indigo-300">{Math.round((audioSettings?.delayLevel ?? 0.15) * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="0.6"
                    step="0.01"
                    value={audioSettings?.delayLevel ?? 0.15}
                    onChange={(e) => onUpdateAudioSettings?.({ delayLevel: parseFloat(e.target.value) })}
                    className="w-full accent-indigo-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Piano Keyboard Container */}
      <div className="relative w-full h-[160px] sm:h-[190px] md:h-[210px] flex overflow-hidden rounded-xl border border-slate-800 shadow-inner bg-slate-950">
        {/* White Keys */}
        <div className="w-full h-full flex">
          {whiteNotes.map((note) => {
            const isActive = activeNotes.has(note.midi);
            const label = formatNoteLabel(note, (labelType ?? 'keyboard') as KeyLabelType);

            return (
              <div
                key={note.midi}
                onPointerDown={(e) => handlePointerDown(e, note.midi)}
                onPointerUp={(e) => handlePointerUp(e, note.midi)}
                onPointerEnter={(e) => handlePointerEnter(e, note.midi)}
                onPointerLeave={(e) => handlePointerLeave(e, note.midi)}
                onPointerCancel={(e) => handlePointerUp(e, note.midi)}
                className={`group relative flex-1 h-full rounded-b-lg border-r border-slate-300/40 cursor-pointer transition-all duration-75 flex flex-col justify-end items-center pb-2.5 ${
                  isActive
                    ? 'bg-gradient-to-b from-indigo-200 via-indigo-300 to-indigo-400 shadow-lg shadow-indigo-500/40 translate-y-1'
                    : 'bg-gradient-to-b from-slate-100 via-slate-50 to-slate-200 hover:bg-slate-100 active:bg-indigo-200'
                }`}
                style={{
                  touchAction: 'none',
                }}
              >
                {/* Active Key Indicator Ring */}
                {isActive && (
                  <div className="absolute bottom-8 w-2 h-2 rounded-full bg-indigo-600 animate-ping" />
                )}

                {/* Note/Keyboard Label */}
                {label && (
                  <span
                    className={`text-[10px] sm:text-[11px] font-bold font-mono transition-colors ${
                      isActive ? 'text-indigo-950 scale-110' : 'text-slate-600'
                    }`}
                  >
                    {label}
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {/* Black Keys Layer */}
        <div className="absolute top-0 left-0 w-full h-[58%] pointer-events-none flex">
          {visibleNotes.map((note, idx) => {
            if (!note.isBlack) return null;

            // Calculate precise position of black key between white keys
            const whiteBeforeCount = visibleNotes.slice(0, idx).filter(n => !n.isBlack).length;
            const leftPercent = (whiteBeforeCount / whiteNotes.length) * 100 - (100 / whiteNotes.length) * 0.3;
            const widthPercent = (100 / whiteNotes.length) * 0.6;

            const isActive = activeNotes.has(note.midi);
            const label = formatNoteLabel(note, (labelType ?? 'keyboard') as KeyLabelType);

            return (
              <div
                key={note.midi}
                onPointerDown={(e) => handlePointerDown(e, note.midi)}
                onPointerUp={(e) => handlePointerUp(e, note.midi)}
                onPointerEnter={(e) => handlePointerEnter(e, note.midi)}
                onPointerLeave={(e) => handlePointerLeave(e, note.midi)}
                onPointerCancel={(e) => handlePointerUp(e, note.midi)}
                className={`pointer-events-auto absolute top-0 h-full rounded-b-md border border-slate-900 cursor-pointer transition-all duration-75 z-10 flex flex-col justify-end items-center pb-2 ${
                  isActive
                    ? 'bg-gradient-to-b from-indigo-500 via-purple-600 to-indigo-700 shadow-xl shadow-purple-500/50 scale-x-95 translate-y-1'
                    : 'bg-gradient-to-b from-slate-900 via-slate-950 to-slate-900 hover:bg-slate-800'
                }`}
                style={{
                  left: `${leftPercent}%`,
                  width: `${widthPercent}%`,
                  touchAction: 'none',
                }}
              >
                {isActive && (
                  <div className="w-1.5 h-1.5 rounded-full bg-pink-400 animate-ping mb-1" />
                )}
                {label && (
                  <span className={`text-[9px] font-bold font-mono ${isActive ? 'text-white' : 'text-slate-400'}`}>
                    {label}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
