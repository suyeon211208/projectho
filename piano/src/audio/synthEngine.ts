import { InstrumentType, AudioSettings } from '../types/piano';
import { getMidiFrequency } from '../utils/noteUtils';

interface ActiveVoice {
  oscillators: OscillatorNode[];
  gainNodes: GainNode[];
  filterNode?: BiquadFilterNode;
  masterNoteGain: GainNode;
  midi: number;
  startTime: number;
  isSustained?: boolean;
}

export class SynthEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private compressor: DynamicsCompressorNode | null = null;
  private reverbNode: ConvolverNode | null = null;
  private reverbGain: GainNode | null = null;
  private dryGain: GainNode | null = null;
  private delayNode: DelayNode | null = null;
  private delayGain: GainNode | null = null;
  private delayFeedbackGain: GainNode | null = null;
  private streamDestination: MediaStreamAudioDestinationNode | null = null;

  private activeVoices: Map<number, ActiveVoice> = new Map();
  private sustainedNotes: Set<number> = new Set();

  private currentInstrument: InstrumentType = 'grand_piano';
  private settings: AudioSettings = {
    masterVolume: 0.8,
    reverbLevel: 0.25,
    delayLevel: 0.15,
    octaveOffset: 0,
    sustainPedal: false,
    touchSensitivity: 1.0,
  };

  constructor() {
    // Lazy init audio context on first user interaction
  }

  public async initAudio(): Promise<AudioContext> {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx({ latencyHint: 'interactive' });

      // Master Compressor
      this.compressor = this.ctx.createDynamicsCompressor();
      this.compressor.threshold.value = -12;
      this.compressor.knee.value = 10;
      this.compressor.ratio.value = 6;
      this.compressor.attack.value = 0.003;
      this.compressor.release.value = 0.15;

      // Master Gain
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this.settings.masterVolume;

      // Reverb Setup
      this.reverbNode = this.ctx.createConvolver();
      this.reverbNode.buffer = this.createImpulseResponse(2.2, 2.0); // 2.2s room impulse
      this.reverbGain = this.ctx.createGain();
      this.reverbGain.gain.value = this.settings.reverbLevel;

      this.dryGain = this.ctx.createGain();
      this.dryGain.gain.value = 1 - this.settings.reverbLevel * 0.5;

      // Delay Setup
      this.delayNode = this.ctx.createDelay();
      this.delayNode.delayTime.value = 0.35; // 350ms delay
      this.delayFeedbackGain = this.ctx.createGain();
      this.delayFeedbackGain.gain.value = 0.3; // 30% feedback
      this.delayGain = this.ctx.createGain();
      this.delayGain.gain.value = this.settings.delayLevel;

      // Delay loop
      this.delayNode.connect(this.delayFeedbackGain);
      this.delayFeedbackGain.connect(this.delayNode);

      // Stream destination for high quality recording
      this.streamDestination = this.ctx.createMediaStreamDestination();

      // Routing
      // Dry path: master -> dryGain -> compressor -> destination
      this.masterGain.connect(this.dryGain);
      this.dryGain.connect(this.compressor);

      // Reverb path: master -> reverbNode -> reverbGain -> compressor
      this.masterGain.connect(this.reverbNode);
      this.reverbNode.connect(this.reverbGain);
      this.reverbGain.connect(this.compressor);

      // Delay path: master -> delayNode -> delayGain -> compressor
      this.masterGain.connect(this.delayNode);
      this.delayNode.connect(this.delayGain);
      this.delayGain.connect(this.compressor);

      // Connect compressor to main speakers and recording stream
      this.compressor.connect(this.ctx.destination);
      this.compressor.connect(this.streamDestination);
    }

    if (this.ctx.state === 'suspended') {
      await this.ctx.resume();
    }

    return this.ctx;
  }

  public getStreamDestination(): MediaStreamAudioDestinationNode | null {
    return this.streamDestination;
  }

  public getAudioContext(): AudioContext | null {
    return this.ctx;
  }

  public setInstrument(instrument: InstrumentType) {
    this.currentInstrument = instrument;
  }

  public getInstrument(): InstrumentType {
    return this.currentInstrument;
  }

  public updateSettings(newSettings: Partial<AudioSettings>) {
    this.settings = { ...this.settings, ...newSettings };

    if (this.masterGain && this.ctx) {
      const now = this.ctx.currentTime;
      this.masterGain.gain.setTargetAtTime(this.settings.masterVolume, now, 0.05);
    }

    if (this.reverbGain && this.dryGain && this.ctx) {
      const now = this.ctx.currentTime;
      this.reverbGain.gain.setTargetAtTime(this.settings.reverbLevel, now, 0.05);
      this.dryGain.gain.setTargetAtTime(1 - this.settings.reverbLevel * 0.5, now, 0.05);
    }

    if (this.delayGain && this.ctx) {
      const now = this.ctx.currentTime;
      this.delayGain.gain.setTargetAtTime(this.settings.delayLevel, now, 0.05);
    }
  }

  public setSustainPedal(active: boolean) {
    this.settings.sustainPedal = active;
    if (!active) {
      // Release all sustained notes that were released by keyup
      const now = this.ctx ? this.ctx.currentTime : 0;
      this.sustainedNotes.forEach(midi => {
        const voice = this.activeVoices.get(midi);
        if (voice) {
          this.releaseVoice(voice, now);
          this.activeVoices.delete(midi);
        }
      });
      this.sustainedNotes.clear();
    }
  }

  public noteOn(midi: number, velocity = 0.8) {
    if (!this.ctx || !this.masterGain) {
      this.initAudio().then(() => this.noteOn(midi, velocity));
      return;
    }

    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }

    const actualMidi = midi + this.settings.octaveOffset * 12;
    const freq = getMidiFrequency(actualMidi);
    const now = this.ctx.currentTime;

    // If key re-pressed, stop existing voice immediately
    if (this.activeVoices.has(actualMidi)) {
      this.noteOff(midi, true);
    }

    const masterNoteGain = this.ctx.createGain();
    const velFactor = Math.pow(velocity, 1.5) * this.settings.touchSensitivity;
    masterNoteGain.gain.setValueAtTime(0, now);

    const oscillators: OscillatorNode[] = [];
    const gainNodes: GainNode[] = [];
    let filterNode: BiquadFilterNode | undefined;

    // Instrument Synthesizer Presets
    switch (this.currentInstrument) {
      case 'grand_piano': {
        // Acoustic Piano: Inharmonic overtones + fast attack + string resonance decay
        filterNode = this.ctx.createBiquadFilter();
        filterNode.type = 'lowpass';
        filterNode.frequency.setValueAtTime(Math.min(freq * 6, 12000), now);
        filterNode.frequency.exponentialRampToValueAtTime(Math.max(freq * 1.5, 400), now + 1.2);

        // Fundamental
        const osc1 = this.ctx.createOscillator();
        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(freq, now);

        const gain1 = this.ctx.createGain();
        gain1.gain.setValueAtTime(0.7 * velFactor, now);
        gain1.gain.exponentialRampToValueAtTime(0.001, now + 3.5);

        // 2nd Harmonic (Octave)
        const osc2 = this.ctx.createOscillator();
        osc2.type = 'triangle';
        osc2.frequency.setValueAtTime(freq * 2, now);

        const gain2 = this.ctx.createGain();
        gain2.gain.setValueAtTime(0.3 * velFactor, now);
        gain2.gain.exponentialRampToValueAtTime(0.001, now + 2.2);

        // 3rd Harmonic (Fifth)
        const osc3 = this.ctx.createOscillator();
        osc3.type = 'sine';
        osc3.frequency.setValueAtTime(freq * 3.01, now); // slight detune

        const gain3 = this.ctx.createGain();
        gain3.gain.setValueAtTime(0.15 * velFactor, now);
        gain3.gain.exponentialRampToValueAtTime(0.001, now + 1.5);

        // String Hammer Transient Click
        const noiseBuffer = this.createNoiseBuffer(0.02);
        const noiseSource = this.ctx.createBufferSource();
        noiseSource.buffer = noiseBuffer;
        const noiseFilter = this.ctx.createBiquadFilter();
        noiseFilter.type = 'bandpass';
        noiseFilter.frequency.value = 2500;
        const noiseGain = this.ctx.createGain();
        noiseGain.gain.setValueAtTime(0.08 * velFactor, now);
        noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.02);

        noiseSource.connect(noiseFilter);
        noiseFilter.connect(masterNoteGain);
        noiseSource.start(now);

        osc1.connect(gain1);
        osc2.connect(gain2);
        osc3.connect(gain3);

        gain1.connect(filterNode);
        gain2.connect(filterNode);
        gain3.connect(filterNode);

        filterNode.connect(masterNoteGain);

        oscillators.push(osc1, osc2, osc3);
        gainNodes.push(gain1, gain2, gain3);

        masterNoteGain.gain.setValueAtTime(0.001, now);
        masterNoteGain.gain.linearRampToValueAtTime(1.0, now + 0.005);
        break;
      }

      case 'electric_piano': {
        // E-Piano / Rhodes: Warm sine fundamental + bell tine harmonic + subtle tremolo
        filterNode = this.ctx.createBiquadFilter();
        filterNode.type = 'lowpass';
        filterNode.frequency.value = 4500;

        const osc1 = this.ctx.createOscillator();
        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(freq, now);

        const gain1 = this.ctx.createGain();
        gain1.gain.setValueAtTime(0.8 * velFactor, now);
        gain1.gain.exponentialRampToValueAtTime(0.15, now + 1.8);

        // Bell Tine (high overtone)
        const osc2 = this.ctx.createOscillator();
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(freq * 7, now);

        const gain2 = this.ctx.createGain();
        gain2.gain.setValueAtTime(0.2 * velFactor, now);
        gain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.25);

        osc1.connect(gain1);
        osc2.connect(gain2);
        gain1.connect(filterNode);
        gain2.connect(filterNode);
        filterNode.connect(masterNoteGain);

        oscillators.push(osc1, osc2);
        gainNodes.push(gain1, gain2);

        masterNoteGain.gain.setValueAtTime(0.001, now);
        masterNoteGain.gain.linearRampToValueAtTime(0.9, now + 0.01);
        break;
      }

      case 'synth_lead': {
        // Bright Sawtooth Synth Lead with resonant sweep
        filterNode = this.ctx.createBiquadFilter();
        filterNode.type = 'lowpass';
        filterNode.Q.value = 4.0;
        filterNode.frequency.setValueAtTime(freq * 0.8, now);
        filterNode.frequency.exponentialRampToValueAtTime(Math.min(freq * 8, 10000), now + 0.1);
        filterNode.frequency.exponentialRampToValueAtTime(freq * 2.5, now + 0.6);

        const osc1 = this.ctx.createOscillator();
        osc1.type = 'sawtooth';
        osc1.frequency.setValueAtTime(freq, now);

        const osc2 = this.ctx.createOscillator();
        osc2.type = 'sawtooth';
        osc2.frequency.setValueAtTime(freq * 1.003, now); // subtle detune

        const gain1 = this.ctx.createGain();
        gain1.gain.setValueAtTime(0.4 * velFactor, now);

        osc1.connect(gain1);
        osc2.connect(gain1);
        gain1.connect(filterNode);
        filterNode.connect(masterNoteGain);

        oscillators.push(osc1, osc2);
        gainNodes.push(gain1);

        masterNoteGain.gain.setValueAtTime(0.001, now);
        masterNoteGain.gain.linearRampToValueAtTime(0.8, now + 0.015);
        break;
      }

      case 'church_organ': {
        // Pipe Organ with 8', 4', 2', 16' pipe drawbars
        const harmonics = [0.5, 1, 2, 3, 4, 6];
        const ampMap = [0.4, 0.6, 0.4, 0.2, 0.15, 0.08];

        harmonics.forEach((h, idx) => {
          const osc = this.ctx!.createOscillator();
          osc.type = idx % 2 === 0 ? 'sine' : 'triangle';
          osc.frequency.setValueAtTime(freq * h, now);

          const g = this.ctx!.createGain();
          g.gain.setValueAtTime(ampMap[idx] * velFactor * 0.3, now);

          osc.connect(g);
          g.connect(masterNoteGain);

          oscillators.push(osc);
          gainNodes.push(g);
        });

        masterNoteGain.gain.setValueAtTime(0.001, now);
        masterNoteGain.gain.linearRampToValueAtTime(0.8, now + 0.04);
        break;
      }

      case 'marimba': {
        // Wooden Marimba: pure sine fundamental + 4x octave ring + fast attack
        filterNode = this.ctx.createBiquadFilter();
        filterNode.type = 'lowpass';
        filterNode.frequency.value = 3500;

        const osc1 = this.ctx.createOscillator();
        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(freq, now);

        const gain1 = this.ctx.createGain();
        gain1.gain.setValueAtTime(0.9 * velFactor, now);
        gain1.gain.exponentialRampToValueAtTime(0.001, now + 1.2);

        const osc2 = this.ctx.createOscillator();
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(freq * 4.0, now);

        const gain2 = this.ctx.createGain();
        gain2.gain.setValueAtTime(0.25 * velFactor, now);
        gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

        osc1.connect(gain1);
        osc2.connect(gain2);
        gain1.connect(filterNode);
        gain2.connect(filterNode);
        filterNode.connect(masterNoteGain);

        oscillators.push(osc1, osc2);
        gainNodes.push(gain1, gain2);

        masterNoteGain.gain.setValueAtTime(0.001, now);
        masterNoteGain.gain.linearRampToValueAtTime(1.0, now + 0.002);
        break;
      }

      case 'acoustic_guitar': {
        // Acoustic Guitar: triangle + square harmonics with fast body decay
        filterNode = this.ctx.createBiquadFilter();
        filterNode.type = 'lowpass';
        filterNode.frequency.setValueAtTime(4000, now);
        filterNode.frequency.exponentialRampToValueAtTime(600, now + 0.8);

        const osc1 = this.ctx.createOscillator();
        osc1.type = 'triangle';
        osc1.frequency.setValueAtTime(freq, now);

        const gain1 = this.ctx.createGain();
        gain1.gain.setValueAtTime(0.7 * velFactor, now);
        gain1.gain.exponentialRampToValueAtTime(0.001, now + 2.0);

        const osc2 = this.ctx.createOscillator();
        osc2.type = 'sawtooth';
        osc2.frequency.setValueAtTime(freq * 2, now);

        const gain2 = this.ctx.createGain();
        gain2.gain.setValueAtTime(0.2 * velFactor, now);
        gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

        osc1.connect(gain1);
        osc2.connect(gain2);
        gain1.connect(filterNode);
        gain2.connect(filterNode);
        filterNode.connect(masterNoteGain);

        oscillators.push(osc1, osc2);
        gainNodes.push(gain1, gain2);

        masterNoteGain.gain.setValueAtTime(0.001, now);
        masterNoteGain.gain.linearRampToValueAtTime(0.9, now + 0.005);
        break;
      }

      case 'string_pad': {
        // String Ensemble: Slow attack, smooth saw/triangle blend with vibrato
        filterNode = this.ctx.createBiquadFilter();
        filterNode.type = 'lowpass';
        filterNode.frequency.value = 2800;

        const osc1 = this.ctx.createOscillator();
        osc1.type = 'sawtooth';
        osc1.frequency.setValueAtTime(freq, now);

        const osc2 = this.ctx.createOscillator();
        osc2.type = 'triangle';
        osc2.frequency.setValueAtTime(freq * 1.002, now);

        const gain1 = this.ctx.createGain();
        gain1.gain.setValueAtTime(0.35 * velFactor, now);

        osc1.connect(gain1);
        osc2.connect(gain1);
        gain1.connect(filterNode);
        filterNode.connect(masterNoteGain);

        oscillators.push(osc1, osc2);
        gainNodes.push(gain1);

        masterNoteGain.gain.setValueAtTime(0.001, now);
        masterNoteGain.gain.linearRampToValueAtTime(0.7, now + 0.22); // soft attack
        break;
      }

      case 'music_box': {
        // Music Box / Chime: High fundamental sine + crystal overtones
        const osc1 = this.ctx.createOscillator();
        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(freq, now);

        const gain1 = this.ctx.createGain();
        gain1.gain.setValueAtTime(0.8 * velFactor, now);
        gain1.gain.exponentialRampToValueAtTime(0.001, now + 2.5);

        const osc2 = this.ctx.createOscillator();
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(freq * 3, now);

        const gain2 = this.ctx.createGain();
        gain2.gain.setValueAtTime(0.25 * velFactor, now);
        gain2.gain.exponentialRampToValueAtTime(0.001, now + 1.2);

        osc1.connect(gain1);
        osc2.connect(gain2);
        gain1.connect(masterNoteGain);
        gain2.connect(masterNoteGain);

        oscillators.push(osc1, osc2);
        gainNodes.push(gain1, gain2);

        masterNoteGain.gain.setValueAtTime(0.001, now);
        masterNoteGain.gain.linearRampToValueAtTime(0.8, now + 0.003);
        break;
      }
    }

    // Connect note output to master gain
    masterNoteGain.connect(this.masterGain);

    // Start all oscillators
    oscillators.forEach(osc => osc.start(now));

    this.activeVoices.set(actualMidi, {
      oscillators,
      gainNodes,
      filterNode,
      masterNoteGain,
      midi: actualMidi,
      startTime: now,
    });
  }

  public noteOff(midi: number, forceImmediate = false) {
    if (!this.ctx) return;

    const actualMidi = midi + this.settings.octaveOffset * 12;

    if (this.settings.sustainPedal && !forceImmediate) {
      this.sustainedNotes.add(actualMidi);
      return;
    }

    const voice = this.activeVoices.get(actualMidi);
    if (!voice) return;

    const now = this.ctx.currentTime;
    this.releaseVoice(voice, now, forceImmediate);
    this.activeVoices.delete(actualMidi);
  }

  private releaseVoice(voice: ActiveVoice, now: number, forceImmediate = false) {
    const releaseTime = forceImmediate ? 0.02 : this.getInstrumentReleaseTime();

    voice.masterNoteGain.gain.cancelScheduledValues(now);
    voice.masterNoteGain.gain.setValueAtTime(voice.masterNoteGain.gain.value, now);
    voice.masterNoteGain.gain.exponentialRampToValueAtTime(0.0001, now + releaseTime);

    setTimeout(() => {
      voice.oscillators.forEach(osc => {
        try {
          osc.stop();
          osc.disconnect();
        } catch {
          // already stopped
        }
      });
      voice.masterNoteGain.disconnect();
    }, releaseTime * 1000 + 50);
  }

  private getInstrumentReleaseTime(): number {
    switch (this.currentInstrument) {
      case 'grand_piano': return 0.25;
      case 'electric_piano': return 0.35;
      case 'synth_lead': return 0.15;
      case 'church_organ': return 0.1;
      case 'marimba': return 0.15;
      case 'acoustic_guitar': return 0.3;
      case 'string_pad': return 0.6;
      case 'music_box': return 0.4;
      default: return 0.25;
    }
  }

  /**
   * Synthesizes impulse response buffer for realistic room reverb
   */
  private createImpulseResponse(duration: number, decay: number): AudioBuffer {
    if (!this.ctx) throw new Error('AudioCtx not ready');
    const sampleRate = this.ctx.sampleRate;
    const length = sampleRate * duration;
    const impulse = this.ctx.createBuffer(2, length, sampleRate);
    const left = impulse.getChannelData(0);
    const right = impulse.getChannelData(1);

    for (let i = 0; i < length; i++) {
      const n = length - i;
      left[i] = (Math.random() * 2 - 1) * Math.pow(n / length, decay);
      right[i] = (Math.random() * 2 - 1) * Math.pow(n / length, decay);
    }

    return impulse;
  }

  private createNoiseBuffer(duration: number): AudioBuffer {
    if (!this.ctx) throw new Error('AudioCtx not ready');
    const sampleRate = this.ctx.sampleRate;
    const bufferSize = sampleRate * duration;
    const buffer = this.ctx.createBuffer(1, bufferSize, sampleRate);
    const output = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    return buffer;
  }
}

// Global Singleton Instance
export const synth = new SynthEngine();
