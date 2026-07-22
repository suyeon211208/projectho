import React, { useState, useRef } from 'react';
import { AudioSettings, MetronomeSettings } from '../types/piano';
import { Volume2, Sliders, Disc, Clock, Repeat, Flame, Activity } from 'lucide-react';

interface EffectsPanelProps {
  audioSettings: AudioSettings;
  onUpdateAudioSettings: (settings: Partial<AudioSettings>) => void;
  metronomeSettings: MetronomeSettings;
  onUpdateMetronomeSettings: (settings: Partial<MetronomeSettings>) => void;
  onToggleMetronome: () => void;
}

export const EffectsPanel: React.FC<EffectsPanelProps> = ({
  audioSettings,
  onUpdateAudioSettings,
  metronomeSettings,
  onUpdateMetronomeSettings,
  onToggleMetronome,
}) => {
  const tapTimesRef = useRef<number[]>([]);

  // Tap Tempo calculation
  const handleTapTempo = () => {
    const now = Date.now();
    const tapTimes = tapTimesRef.current;
    tapTimes.push(now);

    // Keep last 4 taps within 3 seconds
    const validTaps = tapTimes.filter(t => now - t < 3000).slice(-4);
    tapTimesRef.current = validTaps;

    if (validTaps.length >= 2) {
      let totalDiff = 0;
      for (let i = 1; i < validTaps.length; i++) {
        totalDiff += validTaps[i] - validTaps[i - 1];
      }
      const avgDiff = totalDiff / (validTaps.length - 1);
      const calculatedBpm = Math.min(240, Math.max(40, Math.round(60000 / avgDiff)));
      onUpdateMetronomeSettings({ bpm: calculatedBpm });
    }
  };

  return (
    <div className="bg-slate-900/80 backdrop-blur border border-slate-800 rounded-2xl p-4 shadow-xl">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-bold text-slate-200 flex items-center gap-2">
          <Sliders className="w-4 h-4 text-indigo-400" />
          오디오 이펙트 & 메트로놈 (FX & Metronome)
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Audio FX Sliders */}
        <div className="bg-slate-800/50 p-3.5 rounded-xl border border-slate-700/50 space-y-3">
          <h3 className="text-xs font-bold text-indigo-300 flex items-center justify-between">
            <span>마스터 오디오 컨트롤</span>
            <Volume2 className="w-3.5 h-3.5 text-indigo-400" />
          </h3>

          {/* Master Volume */}
          <div>
            <div className="flex justify-between text-[11px] text-slate-300 mb-1 font-medium">
              <span>볼륨 (Volume)</span>
              <span className="font-mono text-indigo-300">{Math.round(audioSettings.masterVolume * 100)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={audioSettings.masterVolume}
              onChange={(e) => onUpdateAudioSettings({ masterVolume: parseFloat(e.target.value) })}
              className="w-full accent-indigo-500 cursor-pointer h-1.5 bg-slate-700 rounded-lg"
            />
          </div>

          {/* Reverb Level */}
          <div>
            <div className="flex justify-between text-[11px] text-slate-300 mb-1 font-medium">
              <span>리버브 공간감 (Reverb)</span>
              <span className="font-mono text-indigo-300">{Math.round(audioSettings.reverbLevel * 100)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="0.8"
              step="0.01"
              value={audioSettings.reverbLevel}
              onChange={(e) => onUpdateAudioSettings({ reverbLevel: parseFloat(e.target.value) })}
              className="w-full accent-indigo-500 cursor-pointer h-1.5 bg-slate-700 rounded-lg"
            />
          </div>

          {/* Delay Level */}
          <div>
            <div className="flex justify-between text-[11px] text-slate-300 mb-1 font-medium">
              <span>디레이 딜레이 (Delay Echo)</span>
              <span className="font-mono text-indigo-300">{Math.round(audioSettings.delayLevel * 100)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="0.6"
              step="0.01"
              value={audioSettings.delayLevel}
              onChange={(e) => onUpdateAudioSettings({ delayLevel: parseFloat(e.target.value) })}
              className="w-full accent-indigo-500 cursor-pointer h-1.5 bg-slate-700 rounded-lg"
            />
          </div>

          {/* Sustain Pedal Toggle */}
          <div className="pt-2 border-t border-slate-700/50 flex items-center justify-between">
            <span className="text-xs text-slate-300 font-medium">서스테인 페달 (스페이스바)</span>
            <button
              onClick={() => onUpdateAudioSettings({ sustainPedal: !audioSettings.sustainPedal })}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                audioSettings.sustainPedal
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'bg-slate-700 text-slate-400 hover:text-slate-200'
              }`}
            >
              {audioSettings.sustainPedal ? '서스테인 ON' : '서스테인 OFF'}
            </button>
          </div>
        </div>

        {/* Metronome Controls */}
        <div className="bg-slate-800/50 p-3.5 rounded-xl border border-slate-700/50 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-emerald-300 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-emerald-400" />
              <span>메트로놈 (Metronome)</span>
            </h3>
            <button
              onClick={onToggleMetronome}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                metronomeSettings.enabled
                  ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                  : 'bg-slate-700 text-slate-400 hover:text-slate-200'
              }`}
            >
              {metronomeSettings.enabled ? '비트 동작 중' : '메트로놈 켜기'}
            </button>
          </div>

          {/* BPM Slider & Tap Tempo */}
          <div>
            <div className="flex items-center justify-between text-[11px] text-slate-300 mb-1 font-medium">
              <span>템포 (BPM)</span>
              <span className="font-mono text-emerald-400 font-bold text-sm">
                {metronomeSettings.bpm} <small className="text-[10px] text-slate-500 font-normal">BPM</small>
              </span>
            </div>
            <input
              type="range"
              min="40"
              max="240"
              step="1"
              value={metronomeSettings.bpm}
              onChange={(e) => onUpdateMetronomeSettings({ bpm: parseInt(e.target.value) })}
              className="w-full accent-emerald-500 cursor-pointer h-1.5 bg-slate-700 rounded-lg"
            />
          </div>

          <div className="flex items-center justify-between gap-2 pt-1">
            {/* Time Signature */}
            <div className="flex items-center gap-1 text-[11px] text-slate-400">
              <span>박자:</span>
              <select
                value={metronomeSettings.beatsPerMeasure}
                onChange={(e) => onUpdateMetronomeSettings({ beatsPerMeasure: parseInt(e.target.value) })}
                className="bg-slate-900 border border-slate-700 text-slate-200 rounded px-2 py-0.5 text-xs font-mono"
              >
                <option value={3}>3/4 박자</option>
                <option value={4}>4/4 박자</option>
                <option value={6}>6/8 박자</option>
              </select>
            </div>

            {/* Tap Tempo Button */}
            <button
              onClick={handleTapTempo}
              className="px-3 py-1 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-semibold transition-all active:scale-95 border border-slate-600"
            >
              탭 템포 (Tap BPM)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
