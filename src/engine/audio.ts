import type { ScareMode } from '../types/game';

class FolkHorrorAudioEngine {
  private ctx: AudioContext | null = null;
  private droneGain: GainNode | null = null;
  private droneOsc1: OscillatorNode | null = null;
  private droneOsc2: OscillatorNode | null = null;
  private muted: boolean = false;
  private currentAct: number = 1;

  private ensureContext(): AudioContext | null {
    if (this.muted) return null;
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public setMuted(muted: boolean) {
    this.muted = muted;
    if (this.droneGain && this.ctx) {
      this.droneGain.gain.setTargetAtTime(muted ? 0 : this.getTargetDroneVolume(), this.ctx.currentTime, 0.25);
    }
  }

  private getTargetDroneVolume(): number {
    if (this.muted) return 0;
    if (this.currentAct <= 1) return 0.012;
    if (this.currentAct === 2) return 0.022;
    if (this.currentAct === 3) return 0.035;
    return 0.048;
  }

  public startOrUpdateAmbient(act: number) {
    this.currentAct = act;
    const ctx = this.ensureContext();
    if (!ctx) return;

    if (!this.droneGain) {
      this.droneGain = ctx.createGain();
      this.droneGain.gain.setValueAtTime(0.001, ctx.currentTime);

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(140, ctx.currentTime);

      this.droneOsc1 = ctx.createOscillator();
      this.droneOsc1.type = 'sine';
      this.droneOsc1.frequency.setValueAtTime(54, ctx.currentTime); // 水底沉闷共鸣

      this.droneOsc2 = ctx.createOscillator();
      this.droneOsc2.type = 'triangle';
      this.droneOsc2.frequency.setValueAtTime(81.5, ctx.currentTime); // 不谐和五度泛音

      this.droneOsc1.connect(filter);
      this.droneOsc2.connect(filter);
      filter.connect(this.droneGain);
      this.droneGain.connect(ctx.destination);

      this.droneOsc1.start();
      this.droneOsc2.start();
    }

    this.droneGain.gain.setTargetAtTime(this.getTargetDroneVolume(), ctx.currentTime, 0.8);
    if (this.droneOsc2) {
      // 随幕数加深产生细微失谐压迫感
      this.droneOsc2.frequency.setTargetAtTime(81.5 - (act - 1) * 1.4, ctx.currentTime, 1.2);
    }
  }

  /** 轻微机械按键与胶片齿轮卡嗒声 */
  public playClick(style: 'ui' | 'film' | 'unlock' = 'ui') {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    if (style === 'film') {
      osc.type = 'square';
      osc.frequency.setValueAtTime(190, now);
      osc.frequency.exponentialRampToValueAtTime(65, now + 0.045);
      gain.gain.setValueAtTime(0.06, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.05);
    } else if (style === 'unlock') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(330, now);
      osc.frequency.setValueAtTime(495, now + 0.08);
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.25);
    } else {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(520, now);
      osc.frequency.exponentialRampToValueAtTime(220, now + 0.025);
      gain.gain.setValueAtTime(0.03, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.03);
    }

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.26);
  }

  /** 民俗核心音效：祠堂铜锣声（可单响或“锣响三声”） */
  public playBronzeGong(strikes: 1 | 3 = 1) {
    const ctx = this.ensureContext();
    if (!ctx) return;

    for (let s = 0; s < strikes; s++) {
      const start = ctx.currentTime + s * 1.15;
      const partials = [164, 211, 298, 437, 612];
      partials.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = idx % 2 === 0 ? 'sine' : 'triangle';
        // 铜锣特有的击打后音高微降滑音（pitch glide）
        osc.frequency.setValueAtTime(freq * 1.04, start);
        osc.frequency.exponentialRampToValueAtTime(freq * 0.96, start + 1.8);

        const amp = (0.09 / (idx + 1));
        gain.gain.setValueAtTime(amp, start);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + 2.1);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(start);
        osc.stop(start + 2.15);
      });
    }
  }

  /** 傩戏木梆子声（笃、笃、笃） */
  public playWoodenClapper() {
    const ctx = this.ensureContext();
    if (!ctx) return;
    [0, 0.28, 0.56].forEach((offset) => {
      const t = ctx.currentTime + offset;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(920, t);
      osc.frequency.exponentialRampToValueAtTime(410, t + 0.055);
      gain.gain.setValueAtTime(0.08, t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.065);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.07);
    });
  }

  /** 赵一鸣支线多轨取证音频合成：模拟“有呼吸换气活人声” vs “无换气连续龛中伪声” */
  public playForensicVoiceSample(hasHumanBreath: boolean) {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const duration = 4.2;

    // 基础带通噪声模拟老旧门禁对讲机底噪与人声共振峰
    const bufferSize = Math.floor(ctx.sampleRate * duration);
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      const sec = i / ctx.sampleRate;
      if (hasHumanBreath) {
        // 活人：每 1.3 秒有明显的断句停顿与急促吸气声包络
        const cycle = sec % 1.4;
        const speaking = cycle < 0.92 ? 0.55 : cycle > 1.12 ? 0.28 : 0.02;
        data[i] = (Math.random() * 2 - 1) * speaking;
      } else {
        // 龛中影：全程 4.2 秒毫无换气停顿、振幅诡异恒定的机械低语 + 水底咕嘟低频
        data[i] = (Math.random() * 2 - 1) * 0.42 + Math.sin(sec * Math.PI * 2 * 62) * 0.25;
      }
    }

    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(hasHumanBreath ? 1150 : 760, now);
    filter.Q.setValueAtTime(hasHumanBreath ? 2.4 : 6.5, now);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.14, now);
    gain.gain.setValueAtTime(0.14, now + duration - 0.2);
    gain.gain.linearRampToValueAtTime(0.0001, now + duration);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    noise.start(now);
    noise.stop(now + duration);
  }

  /** 规则违背或高能剧情节点惊吓音（自动适配双模式惊吓开关） */
  public playScareStinger(mode: ScareMode) {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    if (mode === 'psychological') {
      // 心理压迫模式：深沉低频暗涌 + 轻微木鱼余音，绝不炸耳
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(92, now);
      osc.frequency.exponentialRampToValueAtTime(38, now + 1.4);
      gain.gain.setValueAtTime(0.11, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.5);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 1.55);
      return;
    }

    // 完整惊悚模式：失真铜锣裂响 + CRT 高频啸叫故障音
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    osc1.type = 'sawtooth';
    osc1.frequency.setValueAtTime(145, now);
    osc1.frequency.linearRampToValueAtTime(58, now + 0.65);

    osc2.type = 'square';
    osc2.frequency.setValueAtTime(1860, now);
    osc2.frequency.exponentialRampToValueAtTime(310, now + 0.45);

    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.72);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.75);
    osc2.stop(now + 0.75);
  }
}

export const horrorAudio = new FolkHorrorAudioEngine();
