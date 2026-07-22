import { NoteInfo } from '../types/piano';

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const SOLFEGE_NAMES: { [key: string]: string } = {
  'C': '도',
  'C#': '도#',
  'D': '레',
  'D#': '레#',
  'E': '미',
  'F': '파',
  'F#': '파#',
  'G': '솔',
  'G#': '솔#',
  'A': '라',
  'A#': '라#',
  'B': '시'
};

/**
 * Computer Keyboard Key -> Relative Semitone Offset mapping
 * Offset 0 corresponds to C of current baseOctave (e.g. C4 when baseOctave = 4)
 */
export const KEY_TO_OFFSET: Record<string, number> = {
  // Lower Octave (baseOctave - 1, e.g. C3 ~ B3 for baseOctave 4)
  'z': -12, // C
  '1': -11, // C#
  'x': -10, // D
  '2': -9,  // D#
  'c': -8,  // E
  'v': -7,  // F
  '5': -6,  // F#
  'b': -5,  // G
  '6': -4,  // G#
  'n': -3,  // A
  '7': -2,  // A#
  'm': -1,  // B

  // Middle Primary Octave (baseOctave, e.g. C4 ~ F5 for baseOctave 4)
  'a': 0,   // C4
  'w': 1,   // C#4
  's': 2,   // D4
  'e': 3,   // D#4
  'd': 4,   // E4
  'f': 5,   // F4
  't': 6,   // F#4
  'g': 7,   // G4
  'y': 8,   // G#4
  'h': 9,   // A4
  'u': 10,  // A#4
  'j': 11,  // B4
  'k': 12,  // C5
  'o': 13,  // C#5
  'l': 14,  // D5
  'p': 15,  // D#5
  ';': 16,  // E5
  "'": 17,  // F5

  // Common QWERTY shortcuts
  'q': 0,   // C4
  '3': 3,   // D#4
  'r': 5,   // F4
  'i': 12,  // C5
};

/**
 * Offset -> Primary Display Key Label
 */
export const OFFSET_TO_KEY: Record<number, string> = {
  [-12]: 'Z',
  [-11]: '1',
  [-10]: 'X',
  [-9]:  '2',
  [-8]:  'C',
  [-7]:  'V',
  [-6]:  '5',
  [-5]:  'B',
  [-4]:  '6',
  [-3]:  'N',
  [-2]:  '7',
  [-1]:  'M',
  0:   'A',
  1:   'W',
  2:   'S',
  3:   'E',
  4:   'D',
  5:   'F',
  6:   'T',
  7:   'G',
  8:   'Y',
  9:   'H',
  10:  'U',
  11:  'J',
  12:  'K',
  13:  'O',
  14:  'L',
  15:  'P',
  16:  ';',
  17:  "'",
};

/**
 * Get MIDI pitch frequency in Hz
 */
export function getMidiFrequency(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

/**
 * Generate Note Info object for a MIDI note number
 */
export function getNoteInfo(midi: number): NoteInfo {
  const pitchIndex = (midi % 12 + 12) % 12;
  const pitch = NOTE_NAMES[pitchIndex];
  const octave = Math.floor(midi / 12) - 1;
  const name = `${pitch}${octave}`;
  const isBlack = pitch.includes('#');
  const freq = getMidiFrequency(midi);

  return {
    midi,
    name,
    octave,
    pitch,
    isBlack,
    freq,
  };
}

/**
 * Generate array of notes for given octave range aligned with baseOctave
 */
export function generateNotesRange(startOctave = 3, numOctaves = 3, baseOctave = 4): NoteInfo[] {
  const startMidi = (startOctave + 1) * 12; // e.g. C3 is MIDI 48
  const endMidi = startMidi + numOctaves * 12;
  const baseMidi = (baseOctave + 1) * 12; // e.g. C4 is MIDI 60
  const notes: NoteInfo[] = [];

  for (let midi = startMidi; midi <= endMidi; midi++) {
    const note = getNoteInfo(midi);
    const offset = midi - baseMidi;
    note.keyBinding = OFFSET_TO_KEY[offset] || '';
    notes.push(note);
  }

  return notes;
}

/**
 * Maps a keyboard event key (e.g. 'a', 's', 'z') to MIDI note with current baseOctave
 */
export function getMidiFromKeyboardKey(key: string, baseOctave = 4): number | null {
  const lowerKey = key.toLowerCase();
  if (lowerKey in KEY_TO_OFFSET) {
    const baseMidi = (baseOctave + 1) * 12;
    return baseMidi + KEY_TO_OFFSET[lowerKey];
  }
  return null;
}

/**
 * Format note name to Korean Solfege or English Pitch
 */
export function formatNoteLabel(note: NoteInfo, labelType: 'keyboard' | 'notes' | 'solfege' | 'none'): string {
  if (labelType === 'none') return '';
  if (labelType === 'keyboard') return note.keyBinding || '';
  if (labelType === 'notes') return note.name;
  if (labelType === 'solfege') return `${SOLFEGE_NAMES[note.pitch] || note.pitch}${note.octave}`;
  return '';
}

/**
 * Convert note name string (e.g. 'C4', 'D#5', 'Eb4') to MIDI number
 */
export function noteNameToMidi(noteStr: string): number {
  const match = noteStr.match(/^([A-G][#b]?)(-?\d+)$/i);
  if (!match) return 60;
  const pitchRaw = match[1].toUpperCase();
  const octave = parseInt(match[2], 10);

  const pitchMap: Record<string, number> = {
    'C': 0, 'C#': 1, 'DB': 1, 'D': 2, 'D#': 3, 'EB': 3, 'E': 4,
    'F': 5, 'F#': 6, 'GB': 6, 'G': 7, 'G#': 8, 'AB': 8, 'A': 9,
    'A#': 10, 'BB': 10, 'B': 11
  };

  const semitone = pitchMap[pitchRaw] ?? 0;
  return (octave + 1) * 12 + semitone;
}

