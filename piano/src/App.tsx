import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  InstrumentType,
  AudioSettings,
  MetronomeSettings,
  KeyLabelType,
  NoteInfo,
  RecordedTrack,
  PlayedNoteEvent,
  DemoSong,
} from './types/piano';
import { generateNotesRange, getNoteInfo } from './utils/noteUtils';
import { INSTRUMENT_PRESETS } from './components/InstrumentSelector';
import { synth } from './audio/synthEngine';
import { metronome } from './audio/metronome';

import { Header } from './components/Header';
import { PianoRollVisualizer } from './components/PianoRollVisualizer';
import { PianoKeybed } from './components/PianoKeybed';
import { DemoSongsModal } from './components/DemoSongsModal';
import { SettingsModal } from './components/SettingsModal';
import { RecordingsModal } from './components/RecordingsModal';

export default function App() {
  const [isAudioUnlocked, setIsAudioUnlocked] = useState(false);
  const [currentInstrument, setCurrentInstrument] = useState<InstrumentType>('grand_piano');
  const [baseOctave, setBaseOctave] = useState<number>(4); // Default C4 octave
  const [labelType, setLabelType] = useState<KeyLabelType>('keyboard');

  const [activeNotes, setActiveNotes] = useState<Set<number>>(new Set());

  // Audio & Metronome Settings
  const [audioSettings, setAudioSettings] = useState<AudioSettings>({
    masterVolume: 0.8,
    reverbLevel: 0.25,
    delayLevel: 0.15,
    octaveOffset: 0,
    sustainPedal: false,
    touchSensitivity: 1.0,
  });

  const [metronomeSettings, setMetronomeSettings] = useState<MetronomeSettings>({
    enabled: false,
    bpm: 120,
    beatsPerMeasure: 4,
    volume: 0.6,
  });

  // Recording State
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDurationMs, setRecordingDurationMs] = useState(0);
  const [recordedTracks, setRecordedTracks] = useState<RecordedTrack[]>([]);
  const recordingTimerRef = useRef<number | null>(null);
  const recordingStartTimeRef = useRef<number>(0);
  const recordedEventsRef = useRef<PlayedNoteEvent[]>([]);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedAudioChunksRef = useRef<Blob[]>([]);

  // Playback State
  const [isPlayingBackTrackId, setIsPlayingBackTrackId] = useState<string | null>(null);
  const playbackTimersRef = useRef<number[]>([]);

  // Demo Song State
  const [isPlayingSongId, setIsPlayingSongId] = useState<string | null>(null);
  const songTimersRef = useRef<number[]>([]);
  const [isDemoModalOpen, setIsDemoModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isRecordingsModalOpen, setIsRecordingsModalOpen] = useState(false);
  const [isInstrumentDropdownOpen, setIsInstrumentDropdownOpen] = useState(false);

  // Generate 3 Octaves of keys based on baseOctave (e.g. C3 to C6)
  const visibleNotes: NoteInfo[] = generateNotesRange(baseOctave - 1, 3, baseOctave);

  // Unlock AudioContext on user action
  const handleUnlockAudio = useCallback(async () => {
    try {
      const ctx = await synth.initAudio();
      metronome.setAudioContext(ctx);
      setIsAudioUnlocked(true);
    } catch (err) {
      console.error('AudioContext unlock failed:', err);
    }
  }, []);

  // Note On Trigger
  const handleNoteOn = useCallback((midi: number, velocity = 0.8) => {
    if (!isAudioUnlocked) {
      handleUnlockAudio();
    }

    synth.noteOn(midi, velocity);

    setActiveNotes(prev => {
      const next = new Set(prev);
      next.add(midi);
      return next;
    });

    // If recording, log event
    if (isRecording) {
      const timestamp = Date.now() - recordingStartTimeRef.current;
      const noteName = getNoteInfo(midi).name;
      recordedEventsRef.current.push({
        midi,
        noteName,
        timestamp,
        velocity,
      });
    }
  }, [isAudioUnlocked, isRecording, handleUnlockAudio]);

  // Note Off Trigger
  const handleNoteOff = useCallback((midi: number) => {
    synth.noteOff(midi);

    setActiveNotes(prev => {
      const next = new Set(prev);
      next.delete(midi);
      return next;
    });

    // If recording, update event duration
    if (isRecording) {
      const timestamp = Date.now() - recordingStartTimeRef.current;
      const lastEvent = [...recordedEventsRef.current].reverse().find(e => e.midi === midi && e.duration === undefined);
      if (lastEvent) {
        lastEvent.duration = Math.max(50, timestamp - lastEvent.timestamp);
      }
    }
  }, [isRecording]);

  // Select Instrument
  const handleSelectInstrument = (instrument: InstrumentType) => {
    setCurrentInstrument(instrument);
    synth.setInstrument(instrument);
  };

  // Preview Instrument Sound
  const handlePreviewSound = (instrument: InstrumentType) => {
    synth.setInstrument(instrument);
    synth.noteOn(60, 0.8); // C4
    setTimeout(() => synth.noteOn(64, 0.8), 120); // E4
    setTimeout(() => synth.noteOn(67, 0.8), 240); // G4
    setTimeout(() => {
      synth.noteOff(60);
      synth.noteOff(64);
      synth.noteOff(67);
      synth.setInstrument(currentInstrument);
    }, 800);
  };

  // Update Audio Settings
  const handleUpdateAudioSettings = (newSettings: Partial<AudioSettings>) => {
    const updated = { ...audioSettings, ...newSettings };
    setAudioSettings(updated);
    synth.updateSettings(updated);
  };

  // Update Metronome Settings
  const handleUpdateMetronomeSettings = (newSettings: Partial<MetronomeSettings>) => {
    const updated = { ...metronomeSettings, ...newSettings };
    setMetronomeSettings(updated);
    metronome.updateSettings(updated);
  };

  const handleToggleMetronome = () => {
    if (!isAudioUnlocked) {
      handleUnlockAudio();
    }
    const enabled = metronome.toggle();
    setMetronomeSettings(prev => ({ ...prev, enabled }));
  };

  // Start Recording
  const handleStartRecording = async () => {
    if (!isAudioUnlocked) {
      await handleUnlockAudio();
    }

    recordedEventsRef.current = [];
    recordedAudioChunksRef.current = [];
    recordingStartTimeRef.current = Date.now();
    setIsRecording(true);
    setRecordingDurationMs(0);

    // Live timer
    recordingTimerRef.current = window.setInterval(() => {
      setRecordingDurationMs(Date.now() - recordingStartTimeRef.current);
    }, 100);

    // Stream MediaRecorder setup
    const streamDest = synth.getStreamDestination();
    if (streamDest) {
      try {
        const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
          ? 'audio/webm;codecs=opus'
          : 'audio/webm';
        const recorder = new MediaRecorder(streamDest.stream, { mimeType });

        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) {
            recordedAudioChunksRef.current.push(e.data);
          }
        };

        recorder.start(100);
        mediaRecorderRef.current = recorder;
      } catch (e) {
        console.warn('MediaRecorder init fallback:', e);
      }
    }
  };

  // Stop Recording
  const handleStopRecording = () => {
    setIsRecording(false);
    if (recordingTimerRef.current !== null) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }

    const duration = Date.now() - recordingStartTimeRef.current;

    // Finish recorder
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }

    setTimeout(() => {
      const audioBlob = new Blob(recordedAudioChunksRef.current, { type: 'audio/webm' });
      const audioUrl = URL.createObjectURL(audioBlob);

      const newTrack: RecordedTrack = {
        id: `track-${Date.now()}`,
        title: `연주 녹음 #${recordedTracks.length + 1}`,
        createdAt: new Date(),
        durationMs: Math.max(1000, duration),
        events: [...recordedEventsRef.current],
        instrument: currentInstrument,
        audioBlob,
        audioUrl,
      };

      setRecordedTracks(prev => [newTrack, ...prev]);
    }, 200);
  };

  // Delete Recorded Track
  const handleDeleteTrack = (id: string) => {
    setRecordedTracks(prev => prev.filter(t => t.id !== id));
    if (isPlayingBackTrackId === id) {
      handleStopTrackPlayback();
    }
  };

  // Play Recorded Track via Keyboard Synth
  const handlePlayRecordedTrackNotes = (track: RecordedTrack) => {
    handleStopTrackPlayback();
    setIsPlayingBackTrackId(track.id);

    track.events.forEach(evt => {
      const onTimer = window.setTimeout(() => {
        handleNoteOn(evt.midi, evt.velocity || 0.8);
      }, evt.timestamp);

      const offTimer = window.setTimeout(() => {
        handleNoteOff(evt.midi);
      }, evt.timestamp + (evt.duration || 300));

      playbackTimersRef.current.push(onTimer, offTimer);
    });

    const endTimer = window.setTimeout(() => {
      setIsPlayingBackTrackId(null);
    }, track.durationMs + 500);

    playbackTimersRef.current.push(endTimer);
  };

  // Stop Track Playback
  const handleStopTrackPlayback = () => {
    playbackTimersRef.current.forEach(t => clearTimeout(t));
    playbackTimersRef.current = [];
    setIsPlayingBackTrackId(null);
    setActiveNotes(new Set());
  };

  // Play Demo Song
  const handlePlayDemoSong = (song: DemoSong) => {
    handleStopDemoSong();
    setIsPlayingSongId(song.id);

    song.notes.forEach(item => {
      // Convert note name (e.g. C4) to MIDI
      const midi = getMidiFromName(item.note);
      if (midi === null) return;

      const onTimer = window.setTimeout(() => {
        handleNoteOn(midi, 0.85);
      }, item.time);

      const offTimer = window.setTimeout(() => {
        handleNoteOff(midi);
      }, item.time + item.duration);

      songTimersRef.current.push(onTimer, offTimer);
    });

    const totalDuration = song.notes[song.notes.length - 1]?.time + 1000 || 5000;
    const endTimer = window.setTimeout(() => {
      setIsPlayingSongId(null);
    }, totalDuration);

    songTimersRef.current.push(endTimer);
  };

  const handleStopDemoSong = () => {
    songTimersRef.current.forEach(t => clearTimeout(t));
    songTimersRef.current = [];
    setIsPlayingSongId(null);
    setActiveNotes(new Set());
  };

  // Helper function to map note name to MIDI
  const getMidiFromName = (noteStr: string): number | null => {
    const match = noteStr.match(/^([A-G]#?)(-?\d+)$/);
    if (!match) return null;
    const pitchNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const pitchIndex = pitchNames.indexOf(match[1]);
    const octave = parseInt(match[2]);
    if (pitchIndex === -1) return null;
    return (octave + 1) * 12 + pitchIndex;
  };

  const currentPreset = INSTRUMENT_PRESETS.find(p => p.id === currentInstrument) || INSTRUMENT_PRESETS[0];

  return (
    <div
      onClick={() => {
        if (!isAudioUnlocked) handleUnlockAudio();
      }}
      className="min-h-screen bg-slate-950 text-slate-100 font-sans flex flex-col justify-between selection:bg-indigo-500 selection:text-white"
    >
      {/* Top Navigation Header */}
      <Header
        currentInstrument={currentInstrument}
        currentInstrumentName={currentPreset.nameKo}
        isAudioUnlocked={isAudioUnlocked}
        onUnlockAudio={handleUnlockAudio}
        onOpenDemoModal={() => setIsDemoModalOpen(true)}
        onOpenSettingsModal={() => setIsSettingsModalOpen(true)}
        onSelectInstrument={handleSelectInstrument}
        onPreviewSound={handlePreviewSound}
        isInstrumentDropdownOpen={isInstrumentDropdownOpen}
        onToggleInstrumentDropdown={() => setIsInstrumentDropdownOpen(prev => !prev)}
        onCloseInstrumentDropdown={() => setIsInstrumentDropdownOpen(false)}
        baseOctave={baseOctave}
        activeOctave={baseOctave - 4}
        onChangeBaseOctave={(delta) => setBaseOctave(prev => Math.min(6, Math.max(1, prev + delta)))}
      />

      {/* Main Content Area */}
      <main className="max-w-7xl w-full mx-auto px-3 sm:px-4 py-4 flex-1 flex flex-col gap-4">
        {/* Piano Section with Roll Visualizer & Keybed */}
        <section className="w-full shadow-2xl">
          <PianoRollVisualizer activeNotes={activeNotes} visibleNotes={visibleNotes} />
          <PianoKeybed
            visibleNotes={visibleNotes}
            activeNotes={activeNotes}
            onNoteOn={handleNoteOn}
            onNoteOff={handleNoteOff}
            labelType={labelType}
            onChangeLabelType={setLabelType}
            baseOctave={baseOctave}
            onChangeBaseOctave={(delta) => setBaseOctave(prev => Math.min(6, Math.max(1, prev + delta)))}
            isRecording={isRecording}
            recordingDurationMs={recordingDurationMs}
            onStartRecording={handleStartRecording}
            onStopRecording={handleStopRecording}
            onOpenRecordingsList={() => setIsRecordingsModalOpen(true)}
            audioSettings={audioSettings}
            onUpdateAudioSettings={handleUpdateAudioSettings}
            metronomeSettings={metronomeSettings}
            onUpdateMetronomeSettings={handleUpdateMetronomeSettings}
            onToggleMetronome={handleToggleMetronome}
          />
        </section>
      </main>



      {/* Modals */}
      <DemoSongsModal
        isOpen={isDemoModalOpen}
        onClose={() => setIsDemoModalOpen(false)}
        onPlaySong={handlePlayDemoSong}
        onStopSong={handleStopStopDemoSong => handleStopDemoSong()}
        isPlayingSongId={isPlayingSongId}
      />

      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
      />

      <RecordingsModal
        isOpen={isRecordingsModalOpen}
        onClose={() => setIsRecordingsModalOpen(false)}
        recordedTracks={recordedTracks}
        onDeleteTrack={handleDeleteTrack}
        onPlayRecordedTrackNotes={handlePlayRecordedTrackNotes}
        isPlayingBackTrackId={isPlayingBackTrackId}
        onStopTrackPlayback={handleStopTrackPlayback}
      />
    </div>
  );
}
