import React, { useEffect, useRef, useState, useCallback } from 'react';
import { NoteInfo, DemoSong } from '../types/piano';
import { DEMO_SONGS } from '../utils/demoSongs';
import { noteNameToMidi, formatNoteLabel } from '../utils/noteUtils';
import {
  Music,
  Sparkles,
  RotateCcw,
  CheckCircle2,
  Award,
  BookOpen,
  Sliders,
  ChevronRight,
  Eye,
  EyeOff,
  Activity,
} from 'lucide-react';

interface PianoRollVisualizerProps {
  activeNotes: Set<number>;
  visibleNotes: NoteInfo[];
}

type Mode = 'sheet_practice' | 'live_staff' | 'visualizer';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
  decay: number;
}

export const PianoRollVisualizer: React.FC<PianoRollVisualizerProps> = ({
  activeNotes,
  visibleNotes,
}) => {
  const [mode, setMode] = useState<Mode>('sheet_practice');
  const [selectedSongIndex, setSelectedSongIndex] = useState<number>(0); // Default to first song (School Bell / Twinkle Star)
  const [targetIndex, setTargetIndex] = useState<number>(0);
  const [showHints, setShowHints] = useState<boolean>(true);
  const [isCompleted, setIsCompleted] = useState<boolean>(false);
  const [hitFeedback, setHitFeedback] = useState<string | null>(null);

  // Live staff sequential notes history
  const [liveNotesHistory, setLiveNotesHistory] = useState<{ id: string; midi: number }[]>([]);
  const prevActiveNotesRef = useRef<Set<number>>(new Set());

  // Track key presses sequentially for live staff mode
  useEffect(() => {
    activeNotes.forEach((midi) => {
      if (!prevActiveNotesRef.current.has(midi)) {
        setLiveNotesHistory((prev) => [
          ...prev,
          { id: `${midi}-${Date.now()}-${Math.random()}`, midi },
        ]);
      }
    });

    prevActiveNotesRef.current = new Set(activeNotes);
  }, [activeNotes]);

  const handleClearLiveStaff = () => {
    setLiveNotesHistory([]);
  };

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const particlesRef = useRef<Particle[]>([]);
  const currentSong = DEMO_SONGS[selectedSongIndex] || DEMO_SONGS[0];

  // Reset practice state when song changes
  const handleSelectSong = (index: number) => {
    setSelectedSongIndex(index);
    setTargetIndex(0);
    setIsCompleted(false);
    setHitFeedback(null);
  };

  const handleResetPractice = () => {
    setTargetIndex(0);
    setIsCompleted(false);
    setHitFeedback(null);
  };

  // Check key hit against target note in practice mode
  useEffect(() => {
    if (mode !== 'sheet_practice' || isCompleted || !currentSong || !currentSong.notes[targetIndex]) {
      return;
    }

    const currentTargetNoteStr = currentSong.notes[targetIndex].note;
    const targetMidi = noteNameToMidi(currentTargetNoteStr);

    if (activeNotes.has(targetMidi)) {
      // Correct note hit!
      setHitFeedback('SUCCESS!');

      const nextIdx = targetIndex + 1;
      if (nextIdx >= currentSong.notes.length) {
        setIsCompleted(true);
      } else {
        setTargetIndex(nextIdx);
      }

      // Clear feedback after short delay
      const timer = setTimeout(() => setHitFeedback(null), 400);
      return () => clearTimeout(timer);
    }
  }, [activeNotes, mode, targetIndex, isCompleted, currentSong]);

  // Main Canvas Render Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;

    const handleResize = () => {
      if (!canvas.parentElement) return;
      canvas.width = canvas.parentElement.clientWidth;
      canvas.height = 150; // Visualizer height
    };

    handleResize();
    window.addEventListener('resize', handleResize);

    // Diatonic Step Calculator for treble staff
    // C4 (Middle C) = step 0
    // D4 = 1, E4 = 2 (bottom line), F4 = 3, G4 = 4 (line 2), B4 = 6 (line 3), D5 = 8 (line 4), F5 = 10 (top line)
    const getDiatonicStep = (midi: number): { step: number; pitch: string; isSharp: boolean; isFlat: boolean; octave: number } => {
      const NOTE_STEPS: Record<number, { step: number; isSharp: boolean }> = {
        0: { step: 0, isSharp: false },  // C
        1: { step: 0, isSharp: true },   // C#
        2: { step: 1, isSharp: false },  // D
        3: { step: 1, isSharp: true },   // D#
        4: { step: 2, isSharp: false },  // E
        5: { step: 3, isSharp: false },  // F
        6: { step: 3, isSharp: true },   // F#
        7: { step: 4, isSharp: false },  // G
        8: { step: 4, isSharp: true },   // G#
        9: { step: 5, isSharp: false },  // A
        10: { step: 5, isSharp: true },  // A#
        11: { step: 6, isSharp: false }, // B
      };

      const semitone = (midi % 12 + 12) % 12;
      const octave = Math.floor(midi / 12) - 1;
      const info = NOTE_STEPS[semitone] || { step: 0, isSharp: false };

      // Total diatonic steps from C4 (MIDI 60)
      const diatonicFromC4 = (octave - 4) * 7 + info.step;
      const pitchNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

      return {
        step: diatonicFromC4,
        pitch: pitchNames[semitone],
        isSharp: info.isSharp,
        isFlat: false,
        octave,
      };
    };

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (mode === 'visualizer') {
        // --- MODE 1: PARTICLE BEAM VISUALIZER ---
        ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        const totalWhiteKeys = visibleNotes.filter((n) => !n.isBlack).length;
        if (totalWhiteKeys > 0) {
          const keyWidth = canvas.width / totalWhiteKeys;
          let whiteKeyIdx = 0;

          visibleNotes.forEach((note) => {
            if (!note.isBlack) {
              const keyX = whiteKeyIdx * keyWidth;

              if (activeNotes.has(note.midi)) {
                const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
                gradient.addColorStop(0, 'rgba(99, 102, 241, 0)');
                gradient.addColorStop(1, 'rgba(129, 140, 248, 0.4)');
                ctx.fillStyle = gradient;
                ctx.fillRect(keyX, 0, keyWidth, canvas.height);

                if (Math.random() < 0.6) {
                  particlesRef.current.push({
                    x: keyX + keyWidth / 2 + (Math.random() - 0.5) * keyWidth * 0.8,
                    y: canvas.height - 5,
                    vx: (Math.random() - 0.5) * 2.5,
                    vy: -(Math.random() * 3 + 1.5),
                    size: Math.random() * 4 + 2,
                    color: Math.random() > 0.5 ? '#818cf8' : '#f472b6',
                    alpha: 1.0,
                    decay: 0.03 + Math.random() * 0.02,
                  });
                }
              }
              whiteKeyIdx++;
            }
          });

          particlesRef.current.forEach((p, idx) => {
            p.x += p.vx;
            p.y += p.vy;
            p.alpha -= p.decay;

            if (p.alpha <= 0) {
              particlesRef.current.splice(idx, 1);
              return;
            }

            ctx.save();
            ctx.globalAlpha = Math.max(0, p.alpha);
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
          });
        }
      } else {
        // --- MODE 2 & 3: SHEET MUSIC STAFF (오선보) ---
        ctx.fillStyle = '#0b0f19';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Staff Line Setup (5 lines)
        const lineSpacing = 10;
        const staffBottomY = canvas.height / 2 + 20; // Bottom line (E4)
        const lineStartX = 50;
        const lineEndX = canvas.width - 20;

        // Draw 5 horizontal staff lines
        ctx.strokeStyle = 'rgba(148, 163, 184, 0.35)';
        ctx.lineWidth = 1.2;

        for (let i = 0; i < 5; i++) {
          const lineY = staffBottomY - i * lineSpacing;
          ctx.beginPath();
          ctx.moveTo(lineStartX, lineY);
          ctx.lineTo(lineEndX, lineY);
          ctx.stroke();
        }

        // Treble Clef icon 🎼 text & Time Signature
        ctx.fillStyle = '#818cf8';
        ctx.font = '22px serif';
        ctx.fillText('🎼', 16, staffBottomY - 12);

        ctx.fillStyle = 'rgba(148, 163, 184, 0.6)';
        ctx.font = 'bold 11px sans-serif';
        ctx.fillText('4', 40, staffBottomY - 24);
        ctx.fillText('4', 40, staffBottomY - 10);

        if (mode === 'sheet_practice' && currentSong) {
          // --- PRACTICE SHEET MUSIC RENDER ---
          const songNotes = currentSong.notes;
          const noteSpacing = 42;
          const viewWidth = canvas.width - 120;
          const maxVisibleNotes = Math.floor(viewWidth / noteSpacing);

          // Center the active target note
          const startIdx = Math.max(0, targetIndex - Math.floor(maxVisibleNotes / 3));
          const endIdx = Math.min(songNotes.length, startIdx + maxVisibleNotes);

          for (let i = startIdx; i < endIdx; i++) {
            const item = songNotes[i];
            const midi = noteNameToMidi(item.note);
            const { step, isSharp } = getDiatonicStep(midi);

            // Note position calculation
            // E4 (step 2) = staffBottomY
            // Each diatonic step is half a lineSpacing = 5px
            const noteY = staffBottomY - (step - 2) * (lineSpacing / 2);
            const noteX = lineStartX + 35 + (i - startIdx) * noteSpacing;

            const isPassed = i < targetIndex;
            const isCurrent = i === targetIndex;

            // Ledger Lines (for C4 below staff, or high notes above staff)
            if (step <= 0) {
              // C4 or lower
              for (let l = 0; l >= step; l -= 2) {
                const ledgerY = staffBottomY - (l - 2) * (lineSpacing / 2);
                ctx.strokeStyle = isCurrent ? '#f59e0b' : 'rgba(148, 163, 184, 0.5)';
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                ctx.moveTo(noteX - 10, ledgerY);
                ctx.lineTo(noteX + 10, ledgerY);
                ctx.stroke();
              }
            } else if (step >= 12) {
              // High A5 or higher
              for (let l = 12; l <= step; l += 2) {
                const ledgerY = staffBottomY - (l - 2) * (lineSpacing / 2);
                ctx.strokeStyle = isCurrent ? '#f59e0b' : 'rgba(148, 163, 184, 0.5)';
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                ctx.moveTo(noteX - 10, ledgerY);
                ctx.lineTo(noteX + 10, ledgerY);
                ctx.stroke();
              }
            }

            // Draw Accidental Sharp '♯'
            if (isSharp) {
              ctx.fillStyle = isCurrent ? '#fbbf24' : '#a5b4fc';
              ctx.font = 'bold 12px sans-serif';
              ctx.fillText('♯', noteX - 14, noteY + 4);
            }

            // Draw Note Head
            ctx.save();
            ctx.translate(noteX, noteY);

            if (isCurrent) {
              // Target Note Pulse Glow
              ctx.shadowColor = '#f59e0b';
              ctx.shadowBlur = 12;

              // Golden Ring
              ctx.strokeStyle = '#f59e0b';
              ctx.lineWidth = 2.5;
              ctx.beginPath();
              ctx.arc(0, 0, 8.5, 0, Math.PI * 2);
              ctx.stroke();

              ctx.fillStyle = '#fbbf24';
              ctx.beginPath();
              ctx.ellipse(0, 0, 6, 4.5, -Math.PI / 6, 0, Math.PI * 2);
              ctx.fill();

              // Top Indicator Arrow
              ctx.shadowBlur = 0;
              ctx.fillStyle = '#f59e0b';
              ctx.beginPath();
              ctx.moveTo(0, -18);
              ctx.lineTo(-4, -24);
              ctx.lineTo(4, -24);
              ctx.closePath();
              ctx.fill();
            } else if (isPassed) {
              // Passed Note (Emerald Green)
              ctx.fillStyle = '#10b981';
              ctx.beginPath();
              ctx.ellipse(0, 0, 5.5, 4, -Math.PI / 6, 0, Math.PI * 2);
              ctx.fill();
            } else {
              // Upcoming Note (Slate/Indigo)
              ctx.fillStyle = '#6366f1';
              ctx.beginPath();
              ctx.ellipse(0, 0, 5.5, 4, -Math.PI / 6, 0, Math.PI * 2);
              ctx.fill();
            }
            ctx.restore();

            // Note Stem Line
            ctx.strokeStyle = isCurrent ? '#fbbf24' : isPassed ? '#10b981' : '#6366f1';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(noteX + 4.5, noteY);
            ctx.lineTo(noteX + 4.5, noteY - 18);
            ctx.stroke();

            // Hints (Korean Solfege & Pitch)
            if (showHints) {
              const solfegeMap: Record<string, string> = {
                C: '도', D: '레', E: '미', F: '파', G: '솔', A: '라', B: '시',
              };
              const rawPitch = item.note.replace(/[^A-G]/g, '');
              const solfege = solfegeMap[rawPitch] || rawPitch;

              ctx.fillStyle = isCurrent
                ? '#fef08a'
                : isPassed
                ? 'rgba(52, 211, 153, 0.8)'
                : 'rgba(203, 213, 225, 0.7)';
              ctx.font = isCurrent ? 'bold 11px sans-serif' : '10px sans-serif';
              ctx.textAlign = 'center';
              ctx.fillText(solfege, noteX, noteY + 18);
            }
          }
        } else if (mode === 'live_staff') {
          // --- LIVE STAFF RENDER (Chronological Played Note Sequence) ---
          if (liveNotesHistory.length === 0) {
            ctx.fillStyle = 'rgba(148, 163, 184, 0.5)';
            ctx.font = '12px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('건반을 누르면 연주한 순서대로 실시간 오선보 악보가 차례대로 완성됩니다 🎹', canvas.width / 2, canvas.height / 2);
          } else {
            const noteSpacing = 42;
            const viewWidth = canvas.width - 120;
            const maxVisibleNotes = Math.max(1, Math.floor(viewWidth / noteSpacing));

            const startIdx = Math.max(0, liveNotesHistory.length - maxVisibleNotes);
            const endIdx = liveNotesHistory.length;

            for (let i = startIdx; i < endIdx; i++) {
              const item = liveNotesHistory[i];
              const midi = item.midi;
              const { step, isSharp, pitch, octave } = getDiatonicStep(midi);

              const noteY = staffBottomY - (step - 2) * (lineSpacing / 2);
              const noteX = lineStartX + 50 + (i - startIdx) * noteSpacing;

              const isCurrentlyActive = activeNotes.has(midi);
              const isLatestPlayed = i === liveNotesHistory.length - 1;

              // Ledger lines
              if (step <= 0) {
                for (let l = 0; l >= step; l -= 2) {
                  const ledgerY = staffBottomY - (l - 2) * (lineSpacing / 2);
                  ctx.strokeStyle = isCurrentlyActive ? '#f59e0b' : 'rgba(129, 140, 248, 0.6)';
                  ctx.lineWidth = 1.5;
                  ctx.beginPath();
                  ctx.moveTo(noteX - 10, ledgerY);
                  ctx.lineTo(noteX + 10, ledgerY);
                  ctx.stroke();
                }
              } else if (step >= 12) {
                for (let l = 12; l <= step; l += 2) {
                  const ledgerY = staffBottomY - (l - 2) * (lineSpacing / 2);
                  ctx.strokeStyle = isCurrentlyActive ? '#f59e0b' : 'rgba(129, 140, 248, 0.6)';
                  ctx.lineWidth = 1.5;
                  ctx.beginPath();
                  ctx.moveTo(noteX - 10, ledgerY);
                  ctx.lineTo(noteX + 10, ledgerY);
                  ctx.stroke();
                }
              }

              // Sharp
              if (isSharp) {
                ctx.fillStyle = isCurrentlyActive ? '#fbbf24' : '#f472b6';
                ctx.font = 'bold 12px sans-serif';
                ctx.fillText('♯', noteX - 14, noteY + 4);
              }

              // Note Head
              ctx.save();
              ctx.translate(noteX, noteY);

              if (isCurrentlyActive) {
                ctx.shadowColor = '#f59e0b';
                ctx.shadowBlur = 12;
                ctx.fillStyle = '#fbbf24';
                ctx.beginPath();
                ctx.ellipse(0, 0, 6.5, 5, -Math.PI / 6, 0, Math.PI * 2);
                ctx.fill();
              } else if (isLatestPlayed) {
                ctx.shadowColor = '#818cf8';
                ctx.shadowBlur = 8;
                ctx.fillStyle = '#a5b4fc';
                ctx.beginPath();
                ctx.ellipse(0, 0, 6, 4.5, -Math.PI / 6, 0, Math.PI * 2);
                ctx.fill();
              } else {
                ctx.fillStyle = '#818cf8';
                ctx.beginPath();
                ctx.ellipse(0, 0, 5.5, 4, -Math.PI / 6, 0, Math.PI * 2);
                ctx.fill();
              }
              ctx.restore();

              // Stem
              ctx.strokeStyle = isCurrentlyActive ? '#fbbf24' : '#818cf8';
              ctx.lineWidth = 1.5;
              ctx.beginPath();
              ctx.moveTo(noteX + 4.5, noteY);
              ctx.lineTo(noteX + 4.5, noteY - 18);
              ctx.stroke();

              // Pitch & Solfege label
              const solfegeMap: Record<string, string> = {
                'C': '도', 'C#': '도#', 'D': '레', 'D#': '레#', 'E': '미',
                'F': '파', 'F#': '파#', 'G': '솔', 'G#': '솔#', 'A': '라',
                'A#': '라#', 'B': '시'
              };
              const label = `${solfegeMap[pitch] || pitch}${octave}`;

              ctx.fillStyle = isCurrentlyActive ? '#fef08a' : '#cbd5e1';
              ctx.font = isCurrentlyActive ? 'bold 11px sans-serif' : '10px sans-serif';
              ctx.textAlign = 'center';
              ctx.fillText(label, noteX, noteY + 18);
            }
          }
        }
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, [activeNotes, visibleNotes, mode, selectedSongIndex, targetIndex, showHints, currentSong, liveNotesHistory]);

  return (
    <div className="w-full relative bg-slate-950/90 rounded-t-2xl overflow-hidden border-t border-x border-slate-800 shadow-xl">
      {/* Top Header & Mode Toggle Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 px-3.5 bg-slate-900/90 border-b border-slate-800 text-xs">
        {/* Mode Tabs */}
        <div className="flex items-center gap-1 bg-slate-950/80 p-1 rounded-xl border border-slate-800">
          <button
            type="button"
            onClick={() => setMode('sheet_practice')}
            title="악보 연주 연습"
            className={`p-2 rounded-lg font-bold transition-all cursor-pointer ${
              mode === 'sheet_practice'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <BookOpen className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => setMode('live_staff')}
            title="실시간 오선보"
            className={`p-2 rounded-lg font-bold transition-all cursor-pointer ${
              mode === 'live_staff'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Activity className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => setMode('visualizer')}
            title="비주얼라이저"
            className={`p-2 rounded-lg font-bold transition-all cursor-pointer ${
              mode === 'visualizer'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Sparkles className="w-4 h-4" />
          </button>
        </div>

        {/* Practice Controls (When in Practice Mode) */}
        {mode === 'sheet_practice' && (
          <div className="flex items-center gap-2 flex-wrap">
            {/* Song Select Dropdown */}
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400 font-medium hidden sm:inline">연습곡:</span>
              <select
                value={selectedSongIndex}
                onChange={(e) => handleSelectSong(Number(e.target.value))}
                className="bg-slate-800 hover:bg-slate-700 text-slate-100 font-medium px-2.5 py-1 rounded-xl border border-slate-700 text-xs cursor-pointer focus:outline-none focus:border-indigo-500"
              >
                {DEMO_SONGS.map((song, idx) => (
                  <option key={song.id} value={idx}>
                    {song.title} ({song.difficulty})
                  </option>
                ))}
              </select>
            </div>

            {/* Hint Toggle */}
            <button
              type="button"
              onClick={() => setShowHints((prev) => !prev)}
              className={`p-1.5 rounded-xl border transition-all flex items-center gap-1 cursor-pointer ${
                showHints
                  ? 'bg-indigo-950/80 text-indigo-300 border-indigo-500/50'
                  : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
              }`}
              title="계이름 가이드 힌트 켜기/끄기"
            >
              {showHints ? <Eye className="w-3.5 h-3.5 text-indigo-400" /> : <EyeOff className="w-3.5 h-3.5" />}
              <span className="hidden md:inline font-medium">힌트</span>
            </button>

            {/* Restart Button */}
            <button
              type="button"
              onClick={handleResetPractice}
              className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-all cursor-pointer flex items-center gap-1"
              title="곡 다시 연습하기"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden md:inline font-medium">다시 시작</span>
            </button>
          </div>
        )}

        {/* Live Staff Controls */}
        {mode === 'live_staff' && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-slate-400 font-mono text-[11px]">
              입력된 노트: <strong className="text-indigo-300">{liveNotesHistory.length}</strong>개
            </span>
            <button
              type="button"
              onClick={handleClearLiveStaff}
              className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-all cursor-pointer flex items-center gap-1 text-xs"
              title="오선보 악보 초기화"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden md:inline font-medium">악보 초기화</span>
            </button>
          </div>
        )}
      </div>


      {/* Interactive Sheet Canvas */}
      <div className="relative h-[130px] sm:h-[150px]">
        <canvas ref={canvasRef} className="w-full h-full block cursor-pointer" />

        {/* Completion Celebration Overlay */}
        {isCompleted && (
          <div className="absolute inset-0 z-20 bg-slate-950/90 backdrop-blur-sm flex flex-col items-center justify-center p-4 animate-fade-in text-center">
            <div className="p-2.5 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 mb-2">
              <Award className="w-8 h-8 animate-bounce" />
            </div>
            <h4 className="text-base font-bold text-slate-100 flex items-center gap-1.5">
              <span>🎉 축하합니다!</span>
              <span className="text-amber-400 font-mono">{currentSong.title}</span>
              <span>완곡 성공!</span>
            </h4>
            <p className="text-xs text-slate-400 mt-1">
              모든 노트를 정확히 연습하셨습니다.
            </p>

            <div className="flex items-center gap-3 mt-3">
              <button
                type="button"
                onClick={handleResetPractice}
                className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>다시 연습하기</span>
              </button>

              <button
                type="button"
                onClick={() => handleSelectSong((selectedSongIndex + 1) % DEMO_SONGS.length)}
                className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md transition-colors cursor-pointer"
              >
                <span>다음 곡 연습</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
