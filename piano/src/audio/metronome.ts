import { MetronomeSettings } from '../types/piano';

export class Metronome {
  private ctx: AudioContext | null = null;
  private isRunning = false;
  private currentBeat = 0;
  private nextNoteTime = 0.0;
  private timerID: number | null = null;
  private settings: MetronomeSettings = {
    enabled: false,
    bpm: 120,
    beatsPerMeasure: 4,
    volume: 0.6,
  };

  private onBeatCallback?: (beat: number) => void;

  public setAudioContext(ctx: AudioContext) {
    this.ctx = ctx;
  }

  public setCallback(callback: (beat: number) => void) {
    this.onBeatCallback = callback;
  }

  public updateSettings(newSettings: Partial<MetronomeSettings>) {
    this.settings = { ...this.settings, ...newSettings };
    if (this.settings.enabled && !this.isRunning) {
      this.start();
    } else if (!this.settings.enabled && this.isRunning) {
      this.stop();
    }
  }

  public toggle(): boolean {
    if (this.isRunning) {
      this.stop();
      return false;
    } else {
      this.start();
      return true;
    }
  }

  public start() {
    if (!this.ctx) return;
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    this.isRunning = true;
    this.currentBeat = 0;
    this.nextNoteTime = this.ctx.currentTime + 0.05;
    this.scheduler();
  }

  public stop() {
    this.isRunning = false;
    if (this.timerID !== null) {
      window.clearTimeout(this.timerID);
      this.timerID = null;
    }
  }

  private scheduler = () => {
    if (!this.isRunning || !this.ctx) return;

    while (this.nextNoteTime < this.ctx.currentTime + 0.1) {
      this.scheduleNote(this.currentBeat, this.nextNoteTime);
      this.nextNote();
    }

    this.timerID = window.setTimeout(this.scheduler, 25);
  };

  private nextNote() {
    const secondsPerBeat = 60.0 / this.settings.bpm;
    this.nextNoteTime += secondsPerBeat;
    this.currentBeat = (this.currentBeat + 1) % this.settings.beatsPerMeasure;
  }

  private scheduleNote(beat: number, time: number) {
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    // Accent on first beat of measure
    const isAccent = beat === 0;
    osc.frequency.value = isAccent ? 1200 : 800;

    gain.gain.setValueAtTime(this.settings.volume * (isAccent ? 1.0 : 0.6), time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.04);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(time);
    osc.stop(time + 0.05);

    if (this.onBeatCallback) {
      const timeUntilBeat = Math.max(0, (time - this.ctx.currentTime) * 1000);
      setTimeout(() => {
        if (this.isRunning && this.onBeatCallback) {
          this.onBeatCallback(beat);
        }
      }, timeUntilBeat);
    }
  }
}

export const metronome = new Metronome();
