export type InstrumentType = 
  | 'grand_piano'
  | 'electric_piano'
  | 'synth_lead'
  | 'church_organ'
  | 'marimba'
  | 'acoustic_guitar'
  | 'string_pad'
  | 'music_box';

export interface InstrumentPreset {
  id: InstrumentType;
  name: string;
  nameKo: string;
  category: 'Acoustic' | 'Electric' | 'Synth' | 'Percussion';
  iconName: string;
  description: string;
  attack: number;
  decay: number;
  sustain: number;
  release: number;
  waveform?: OscillatorType;
}

export interface NoteInfo {
  midi: number;
  name: string;
  octave: number;
  pitch: string;
  isBlack: boolean;
  freq: number;
  keyBinding?: string;
  keyBindingRow2?: string;
}

export interface PlayedNoteEvent {
  midi: number;
  noteName: string;
  timestamp: number; // relative to recording start in ms
  duration?: number; // duration in ms
  velocity: number; // 0 to 1
}

export interface RecordedTrack {
  id: string;
  title: string;
  createdAt: Date;
  durationMs: number;
  events: PlayedNoteEvent[];
  instrument: InstrumentType;
  audioBlob?: Blob;
  audioUrl?: string;
}

export type KeyLabelType = 'keyboard' | 'notes' | 'solfege' | 'none';

export interface AudioSettings {
  masterVolume: number; // 0 to 1
  reverbLevel: number; // 0 to 1
  delayLevel: number; // 0 to 1
  octaveOffset: number; // -2 to +2
  sustainPedal: boolean;
  touchSensitivity: number; // 0.5 to 1.5
}

export interface MetronomeSettings {
  enabled: boolean;
  bpm: number;
  beatsPerMeasure: number; // 3, 4, 6
  volume: number;
}

export interface DemoSong {
  id: string;
  title: string;
  composer: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  bpm: number;
  notes: { note: string; time: number; duration: number }[];
}
