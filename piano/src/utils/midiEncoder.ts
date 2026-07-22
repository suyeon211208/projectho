import { PlayedNoteEvent } from '../types/piano';

/**
 * Encodes recorded piano note events into a Standard MIDI File (.mid)
 */
export function exportToMidiFile(events: PlayedNoteEvent[], songTitle = 'Piano Recording'): Blob {
  // Simple Standard MIDI File Header (Format 0, 1 Track)
  const header = [
    0x4d, 0x54, 0x68, 0x64, // 'MThd'
    0x00, 0x00, 0x00, 0x06, // Chunk length (6 bytes)
    0x00, 0x00,             // Format 0
    0x00, 0x01,             // 1 track
    0x01, 0xe0              // 480 ticks per quarter note
  ];

  const trackEvents: number[] = [];

  // Add Track Name meta event
  trackEvents.push(0x00, 0xff, 0x03, songTitle.length, ...Array.from(songTitle).map(c => c.charCodeAt(0)));

  // Add Tempo meta event (120 BPM = 500,000 microseconds per quarter note)
  trackEvents.push(0x00, 0xff, 0x51, 0x03, 0x07, 0xa1, 0x20);

  // Convert note events to delta time MIDI messages
  let lastTicks = 0;
  const sortedEvents: { timeMs: number; type: 'on' | 'off'; midi: number; velocity: number }[] = [];

  events.forEach(e => {
    sortedEvents.push({
      timeMs: e.timestamp,
      type: 'on',
      midi: e.midi,
      velocity: Math.floor((e.velocity || 0.8) * 127),
    });
    sortedEvents.push({
      timeMs: e.timestamp + (e.duration || 300),
      type: 'off',
      midi: e.midi,
      velocity: 0,
    });
  });

  sortedEvents.sort((a, b) => a.timeMs - b.timeMs);

  sortedEvents.forEach(evt => {
    // 120 BPM = 2 ticks per millisecond with 480 TPQN
    const currentTicks = Math.round(evt.timeMs * 0.96);
    const deltaTicks = Math.max(0, currentTicks - lastTicks);
    lastTicks = currentTicks;

    // Write delta time variable length quantity
    writeVarLen(trackEvents, deltaTicks);

    if (evt.type === 'on') {
      trackEvents.push(0x90, evt.midi, evt.velocity); // Note On channel 0
    } else {
      trackEvents.push(0x80, evt.midi, 0x00); // Note Off channel 0
    }
  });

  // End of track meta event
  trackEvents.push(0x00, 0xff, 0x2f, 0x00);

  const trackHeader = [
    0x4d, 0x54, 0x72, 0x6b, // 'MTrk'
    (trackEvents.length >> 24) & 0xff,
    (trackEvents.length >> 16) & 0xff,
    (trackEvents.length >> 8) & 0xff,
    trackEvents.length & 0xff,
  ];

  const fullMidi = new Uint8Array([...header, ...trackHeader, ...trackEvents]);
  return new Blob([fullMidi], { type: 'audio/midi' });
}

function writeVarLen(arr: number[], value: number) {
  let buffer = value & 0x7f;
  while ((value >>= 7)) {
    buffer <<= 8;
    buffer |= (value & 0x7f) | 0x80;
  }

  while (true) {
    arr.push(buffer & 0xff);
    if (buffer & 0x80) {
      buffer >>= 8;
    } else {
      break;
    }
  }
}
