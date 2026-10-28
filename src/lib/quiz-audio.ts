/**
 * Sound synthesis for Quiz Arcade using standard Web Audio API.
 * Follows strict JuanderQuest audio resilience rules:
 * - Sound is OFF by default.
 * - Safely handles suspended AudioContext, rejecting promises, and SSR.
 * - Synthesizes retro PC game-show arcade chimes (8-bit square / sine tones).
 */

class QuizSoundEffects {
  private ctx: AudioContext | null = null;
  private enabled: boolean = false;

  public isEnabled(): boolean {
    return this.enabled;
  }

  public setEnabled(enable: boolean): void {
    this.enabled = enable;
    if (enable && !this.ctx && typeof window !== 'undefined') {
      try {
        const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (AudioCtx) {
          this.ctx = new AudioCtx();
        }
      } catch {
        // AudioContext disabled or unsupported
      }
    }
    if (enable && this.ctx && this.ctx.state === 'suspended') {
      try {
        const res = this.ctx.resume();
        if (res && typeof res.catch === 'function') {
          res.catch(() => {});
        }
      } catch {
        // Resume failed
      }
    }
  }

  private playTone(freq: number, type: OscillatorType, durationMs: number, delayMs = 0): void {
    if (!this.enabled || !this.ctx) return;
    try {
      if (this.ctx.state === 'suspended') {
        const p = this.ctx.resume();
        if (p && typeof p.catch === 'function') p.catch(() => {});
      }

      const now = this.ctx.currentTime + (delayMs / 1000);
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, now);

      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + (durationMs / 1000));

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + (durationMs / 1000));
    } catch {
      // Audio playback resilience
    }
  }

  public playSelect(): void {
    this.playTone(523.25, 'triangle', 80); // C5
  }

  public playCheckpointAdvance(): void {
    this.playTone(587.33, 'triangle', 70, 0);   // D5
    this.playTone(880.00, 'triangle', 120, 80); // A5
  }

  public playPassFanfare(): void {
    this.playTone(523.25, 'square', 100, 0);   // C5
    this.playTone(659.25, 'square', 100, 110); // E5
    this.playTone(783.99, 'square', 100, 220); // G5
    this.playTone(1046.50, 'square', 280, 330); // C6
  }

  public playFailChime(): void {
    this.playTone(440.00, 'sawtooth', 120, 0);   // A4
    this.playTone(392.00, 'sawtooth', 120, 130); // G4
    this.playTone(329.63, 'sawtooth', 250, 260); // E4
  }
}

export const quizAudio = new QuizSoundEffects();
