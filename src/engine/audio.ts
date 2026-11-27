import type { ScareMode } from '../types/game';

/**
 * 中式民俗悬疑声景引擎（无低频嗡鸣版）
 * - 切后台 / 窗口失焦自动挂起静音，回前台平滑恢复
 * - 配乐采用「山间细雨檐声 + 稀疏古琴五声泛音（羽调式）」程序化演奏，彻底移除低频电流嗡鸣
 * - 内置祠堂铜锣、傩戏木梆、门外叩门拧把手、镜面寒息等民俗实景音效
 */
class FolkHorrorAudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private rainGain: GainNode | null = null;
  private delayNode: DelayNode | null = null;
  private delayFeedback: GainNode | null = null;

  private muted: boolean = false;
  private isBackgrounded: boolean = false;
  private ambientStarted: boolean = false;
  private currentAct: number = 1;
  private phraseTimer: number | null = null;
  private phraseIndex: number = 0;

  // 古琴五声羽调式（A羽: A3 C4 D4 E4 G4 A4 C5 D5 E5）清冷空灵乐句，零低频轰鸣
  private readonly earlyPhrases: Array<Array<{ freq: number; delay: number; vel: number }>> = [
    [
      { freq: 440.0, delay: 0, vel: 0.9 },     // A4
      { freq: 392.0, delay: 1.35, vel: 0.72 }, // G4
      { freq: 329.63, delay: 2.85, vel: 0.8 }, // E4
      { freq: 293.66, delay: 4.6, vel: 0.65 }, // D4
    ],
    [
      { freq: 293.66, delay: 0, vel: 0.78 },   // D4
      { freq: 329.63, delay: 1.25, vel: 0.75 },// E4
      { freq: 440.0, delay: 2.7, vel: 0.85 },  // A4
      { freq: 523.25, delay: 4.4, vel: 0.58 }, // C5 泛音
    ],
    [
      { freq: 392.0, delay: 0, vel: 0.76 },    // G4
      { freq: 329.63, delay: 1.5, vel: 0.7 },  // E4
      { freq: 261.63, delay: 3.1, vel: 0.74 }, // C4
      { freq: 220.0, delay: 4.9, vel: 0.68 },  // A3
    ],
    [
      { freq: 523.25, delay: 0, vel: 0.62 },   // C5
      { freq: 440.0, delay: 1.4, vel: 0.76 },  // A4
      { freq: 329.63, delay: 3.0, vel: 0.72 }, // E4
    ],
  ];

  // 第三、四幕略带清角/变宫幽咽色彩的深夜古调
  private readonly latePhrases: Array<Array<{ freq: number; delay: number; vel: number }>> = [
    [
      { freq: 440.0, delay: 0, vel: 0.85 },     // A4
      { freq: 349.23, delay: 1.45, vel: 0.74 }, // F4（幽微偏音）
      { freq: 329.63, delay: 2.95, vel: 0.82 }, // E4
      { freq: 220.0, delay: 4.8, vel: 0.68 },   // A3
    ],
    [
      { freq: 293.66, delay: 0, vel: 0.8 },     // D4
      { freq: 261.63, delay: 1.55, vel: 0.74 }, // C4
      { freq: 233.08, delay: 3.2, vel: 0.66 },  // Bb3
      { freq: 220.0, delay: 4.9, vel: 0.72 },   // A3
    ],
    [
      { freq: 587.33, delay: 0, vel: 0.56 },    // D5 高音泛音
      { freq: 440.0, delay: 1.6, vel: 0.72 },   // A4
      { freq: 392.0, delay: 3.1, vel: 0.66 },   // G4
      { freq: 329.63, delay: 4.8, vel: 0.62 },  // E4
    ],
  ];

  constructor() {
    if (typeof window !== 'undefined' && typeof document !== 'undefined') {
      const syncVisibility = () => {
        const hiddenNow = document.hidden || !document.hasFocus();
        if (hiddenNow) {
          this.enterBackground();
        } else {
          this.leaveBackground();
        }
      };

      document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
          this.enterBackground();
        } else {
          this.leaveBackground();
        }
      });
      window.addEventListener('blur', () => this.enterBackground());
      window.addEventListener('pagehide', () => this.enterBackground());
      window.addEventListener('focus', () => {
        if (!document.hidden) {
          this.leaveBackground();
        }
      });
      // 初始化时检查一次焦点
      setTimeout(syncVisibility, 0);
    }
  }

  private enterBackground() {
    this.isBackgrounded = true;
    if (this.phraseTimer !== null && typeof window !== 'undefined') {
      window.clearTimeout(this.phraseTimer);
      this.phraseTimer = null;
    }
    if (this.ctx && this.ctx.state === 'running') {
      if (this.masterGain) {
        this.masterGain.gain.setTargetAtTime(0.0001, this.ctx.currentTime, 0.08);
      }
      this.ctx.suspend().catch(() => {});
    }
  }

  private leaveBackground() {
    this.isBackgrounded = false;
    if (this.muted || !this.ambientStarted) return;
    if (this.ctx) {
      if (this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
      if (this.masterGain) {
        this.masterGain.gain.setTargetAtTime(1.0, this.ctx.currentTime, 0.35);
      }
      this.scheduleNextPhrase(1400);
    }
  }

  private ensureContext(): AudioContext | null {
    if (this.muted || this.isBackgrounded) return null;
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (!this.ctx) return null;

    if (!this.masterGain) {
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(1.0, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);

      // 空谷余音延迟线（用于古琴泛音，营造幽静院落空间感）
      this.delayNode = this.ctx.createDelay(1.0);
      this.delayNode.delayTime.setValueAtTime(0.42, this.ctx.currentTime);

      const echoFilter = this.ctx.createBiquadFilter();
      echoFilter.type = 'lowpass';
      echoFilter.frequency.setValueAtTime(1500, this.ctx.currentTime);

      this.delayFeedback = this.ctx.createGain();
      this.delayFeedback.gain.setValueAtTime(0.26, this.ctx.currentTime);

      this.delayNode.connect(echoFilter);
      echoFilter.connect(this.delayFeedback);
      this.delayFeedback.connect(this.delayNode);
      echoFilter.connect(this.masterGain);
    }

    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public setMuted(muted: boolean) {
    this.muted = muted;
    if (muted) {
      if (this.phraseTimer !== null && typeof window !== 'undefined') {
        window.clearTimeout(this.phraseTimer);
        this.phraseTimer = null;
      }
      if (this.ctx && this.ctx.state === 'running') {
        if (this.masterGain) {
          this.masterGain.gain.setTargetAtTime(0.0001, this.ctx.currentTime, 0.08);
        }
        this.ctx.suspend().catch(() => {});
      }
    } else if (!this.isBackgrounded && this.ambientStarted) {
      const ctx = this.ensureContext();
      if (ctx && this.masterGain) {
        this.masterGain.gain.setTargetAtTime(1.0, ctx.currentTime, 0.25);
      }
      this.scheduleNextPhrase(900);
    }
  }

  private getTargetRainVolume(): number {
    if (this.muted || this.isBackgrounded) return 0;
    return this.currentAct >= 3 ? 0.011 : 0.008;
  }

  /** 启动或更新「山间檐雨 + 古琴泛音」背景配乐 */
  public startOrUpdateAmbient(act: number) {
    this.currentAct = act;
    this.ambientStarted = true;
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain) return;

    if (!this.rainGain) {
      // 生成 5 秒无缝柔和夜雨声（严格滤除 750Hz 以下全部低频，绝无电流嗡嗡声）
      const duration = 5.0;
      const len = Math.floor(ctx.sampleRate * duration);
      const rainBuf = ctx.createBuffer(1, len, ctx.sampleRate);
      const ch = rainBuf.getChannelData(0);
      let lastOut = 0;
      for (let i = 0; i < len; i++) {
        const white = Math.random() * 2 - 1;
        lastOut = (lastOut + 0.06 * white) / 1.06;
        // 细微呼吸包络模拟山风拂檐
        const env = 0.82 + 0.18 * Math.sin((i / len) * Math.PI * 2);
        ch[i] = lastOut * env * 2.2;
      }

      const rainSource = ctx.createBufferSource();
      rainSource.buffer = rainBuf;
      rainSource.loop = true;

      const hp = ctx.createBiquadFilter();
      hp.type = 'highpass';
      hp.frequency.setValueAtTime(820, ctx.currentTime);

      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.setValueAtTime(2750, ctx.currentTime);

      this.rainGain = ctx.createGain();
      this.rainGain.gain.setValueAtTime(0.0001, ctx.currentTime);

      rainSource.connect(hp);
      hp.connect(lp);
      lp.connect(this.rainGain);
      this.rainGain.connect(this.masterGain);
      rainSource.start();
    }

    this.rainGain.gain.setTargetAtTime(this.getTargetRainVolume(), ctx.currentTime, 1.2);
    if (this.phraseTimer === null) {
      this.scheduleNextPhrase(700);
    }
  }

  private scheduleNextPhrase(delayMs: number) {
    if (typeof window === 'undefined') return;
    if (this.phraseTimer !== null) {
      window.clearTimeout(this.phraseTimer);
      this.phraseTimer = null;
    }
    if (this.muted || this.isBackgrounded || !this.ambientStarted) return;

    this.phraseTimer = window.setTimeout(() => {
      this.phraseTimer = null;
      if (this.muted || this.isBackgrounded || !this.ambientStarted) return;
      this.playGuqinPhrase();
      // 留白呼吸：每段古琴泛音之间留出 8.5~11.5 秒静谧雨声，耐听不吵闹
      const nextGap = 8800 + Math.floor(Math.random() * 3000);
      this.scheduleNextPhrase(nextGap);
    }, delayMs);
  }

  /** 拨奏一段清润柔和的古琴泛音列 */
  private playGuqinPhrase() {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain) return;

    const bank = this.currentAct >= 3 ? this.latePhrases : this.earlyPhrases;
    const phrase = bank[this.phraseIndex % bank.length];
    this.phraseIndex++;

    phrase.forEach((note) => {
      this.pluckGuqinNote(ctx, ctx.currentTime + note.delay, note.freq, note.vel);
    });
  }

  private pluckGuqinNote(ctx: AudioContext, startTime: number, freq: number, velocity: number) {
    if (!this.masterGain) return;

    const bodyFilter = ctx.createBiquadFilter();
    bodyFilter.type = 'lowpass';
    bodyFilter.frequency.setValueAtTime(freq * 3.6, startTime);
    bodyFilter.frequency.exponentialRampToValueAtTime(Math.max(360, freq * 1.35), startTime + 2.6);

    const noteGain = ctx.createGain();
    const peak = 0.026 * velocity; // 温润背景音量，绝不喧宾夺主
    noteGain.gain.setValueAtTime(0.0001, startTime);
    noteGain.gain.linearRampToValueAtTime(peak, startTime + 0.032);
    noteGain.gain.exponentialRampToValueAtTime(peak * 0.35, startTime + 0.85);
    noteGain.gain.exponentialRampToValueAtTime(0.0001, startTime + 3.4);

    // 基频 + 二倍泛音 + 微弱三倍丝弦擦音
    const osc1 = ctx.createOscillator();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(freq * 0.997, startTime);
    osc1.frequency.exponentialRampToValueAtTime(freq, startTime + 0.09); // 古琴微吟揉音头

    const osc2 = ctx.createOscillator();
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(freq * 2, startTime);

    const harm2Gain = ctx.createGain();
    harm2Gain.gain.setValueAtTime(0.28, startTime);
    harm2Gain.gain.exponentialRampToValueAtTime(0.02, startTime + 1.4);

    osc1.connect(bodyFilter);
    osc2.connect(harm2Gain);
    harm2Gain.connect(bodyFilter);

    bodyFilter.connect(noteGain);
    noteGain.connect(this.masterGain);
    if (this.delayNode) {
      noteGain.connect(this.delayNode);
    }

    osc1.start(startTime);
    osc2.start(startTime);
    osc1.stop(startTime + 3.5);
    osc2.stop(startTime + 1.6);
  }

  /** 轻微机械按键与胶片齿轮卡嗒声 */
  public playClick(style: 'ui' | 'film' | 'unlock' = 'ui') {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain) return;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    if (style === 'film') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(210, now);
      osc.frequency.exponentialRampToValueAtTime(75, now + 0.045);
      gain.gain.setValueAtTime(0.05, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.05);
    } else if (style === 'unlock') {
      // 清越双音泛音解锁提示
      [440, 659.25].forEach((f, idx) => {
        const uOsc = ctx.createOscillator();
        const uGain = ctx.createGain();
        const t = now + idx * 0.08;
        uOsc.type = 'sine';
        uOsc.frequency.setValueAtTime(f, t);
        uGain.gain.setValueAtTime(0.055, t);
        uGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);
        uOsc.connect(uGain);
        uGain.connect(this.masterGain!);
        uOsc.start(t);
        uOsc.stop(t + 0.38);
      });
      return;
    } else {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(520, now);
      osc.frequency.exponentialRampToValueAtTime(240, now + 0.024);
      gain.gain.setValueAtTime(0.025, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.028);
    }

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.08);
  }

  /** 民俗核心音效：祠堂铜锣声（可单响或“锣响三声”） */
  public playBronzeGong(strikes: 1 | 3 = 1) {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain) return;

    for (let s = 0; s < strikes; s++) {
      const start = ctx.currentTime + s * 1.15;
      const partials = [164, 211, 298, 437, 612];
      partials.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = idx % 2 === 0 ? 'sine' : 'triangle';
        osc.frequency.setValueAtTime(freq * 1.04, start);
        osc.frequency.exponentialRampToValueAtTime(freq * 0.96, start + 1.8);

        const amp = 0.08 / (idx + 1);
        gain.gain.setValueAtTime(amp, start);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + 2.1);

        osc.connect(gain);
        gain.connect(this.masterGain!);
        osc.start(start);
        osc.stop(start + 2.15);
      });
    }
  }

  /** 傩戏木梆子声（笃、笃、笃） */
  public playWoodenClapper() {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain) return;
    [0, 0.28, 0.56].forEach((offset) => {
      const t = ctx.currentTime + offset;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(920, t);
      osc.frequency.exponentialRampToValueAtTime(410, t + 0.055);
      gain.gain.setValueAtTime(0.075, t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.065);
      osc.connect(gain);
      gain.connect(this.masterGain!);
      osc.start(t);
      osc.stop(t + 0.07);
    });
  }

  /** 实景民俗惊悚音效：门外指节叩击木门框 / 拧动门锁把手 */
  public playDoorKnocks(count: number = 3, withHandleRattle: boolean = true) {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain) return;

    for (let i = 0; i < count; i++) {
      const t = ctx.currentTime + i * 0.52;
      // 沉闷实木门板共鸣“咚”
      const thud = ctx.createOscillator();
      const thudGain = ctx.createGain();
      thud.type = 'sine';
      thud.frequency.setValueAtTime(148, t);
      thud.frequency.exponentialRampToValueAtTime(58, t + 0.11);
      thudGain.gain.setValueAtTime(0.14, t);
      thudGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.14);
      thud.connect(thudGain);
      thudGain.connect(this.masterGain);
      thud.start(t);
      thud.stop(t + 0.15);

      // 指关节骨响瞬态
      const knock = ctx.createOscillator();
      const knockGain = ctx.createGain();
      knock.type = 'triangle';
      knock.frequency.setValueAtTime(460, t);
      knock.frequency.exponentialRampToValueAtTime(180, t + 0.035);
      knockGain.gain.setValueAtTime(0.07, t);
      knockGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.04);
      knock.connect(knockGain);
      knockGain.connect(this.masterGain);
      knock.start(t);
      knock.stop(t + 0.045);
    }

    if (withHandleRattle) {
      const base = ctx.currentTime + count * 0.52 + 0.25;
      [0, 0.14, 0.31].forEach((off) => {
        const t = base + off;
        const metal = ctx.createOscillator();
        const mGain = ctx.createGain();
        metal.type = 'square';
        metal.frequency.setValueAtTime(1180, t);
        metal.frequency.exponentialRampToValueAtTime(520, t + 0.03);
        mGain.gain.setValueAtTime(0.035, t);
        mGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.038);
        metal.connect(mGain);
        mGain.connect(this.masterGain!);
        metal.start(t);
        metal.stop(t + 0.042);
      });
    }
  }

  /** 镜片 / 水银镜窥视异变时的细微寒息与玻璃泛音 */
  public playMirrorChill(mode: ScareMode) {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain) return;
    const now = ctx.currentTime;

    // 冰冷玻璃边缘擦音泛音
    const glass = ctx.createOscillator();
    const gGain = ctx.createGain();
    glass.type = 'sine';
    glass.frequency.setValueAtTime(mode === 'full' ? 1318.5 : 880, now);
    glass.frequency.exponentialRampToValueAtTime(mode === 'full' ? 1244.5 : 830, now + 0.9);
    gGain.gain.setValueAtTime(0.0001, now);
    gGain.gain.linearRampToValueAtTime(mode === 'full' ? 0.055 : 0.03, now + 0.12);
    gGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.95);

    glass.connect(gGain);
    gGain.connect(this.masterGain);
    if (this.delayNode) gGain.connect(this.delayNode);
    glass.start(now);
    glass.stop(now + 1.0);
  }

  /** 赵一鸣支线多轨取证音频合成：模拟“有呼吸换气活人声” vs “无换气连续龛中伪声” */
  public playForensicVoiceSample(hasHumanBreath: boolean) {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain) return;
    const now = ctx.currentTime;
    const duration = 4.2;

    const bufferSize = Math.floor(ctx.sampleRate * duration);
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      const sec = i / ctx.sampleRate;
      if (hasHumanBreath) {
        const cycle = sec % 1.4;
        const speaking = cycle < 0.92 ? 0.55 : cycle > 1.12 ? 0.28 : 0.02;
        data[i] = (Math.random() * 2 - 1) * speaking;
      } else {
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
    gain.connect(this.masterGain);
    noise.start(now);
    noise.stop(now + duration);
  }

  /** 规则违背或高能剧情节点惊吓音（自动适配双模式惊吓开关） */
  public playScareStinger(mode: ScareMode) {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain) return;
    const now = ctx.currentTime;

    if (mode === 'psychological') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(110, now);
      osc.frequency.exponentialRampToValueAtTime(48, now + 1.3);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.4);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(now);
      osc.stop(now + 1.45);
      return;
    }

    // 完整惊悚模式：失谐裂锣 + 急促木梆惊响
    const partials = [152, 219, 311, 587];
    partials.forEach((f, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = idx % 2 === 0 ? 'sawtooth' : 'triangle';
      osc.frequency.setValueAtTime(f * 1.08, now);
      osc.frequency.exponentialRampToValueAtTime(f * 0.72, now + 0.75);
      gain.gain.setValueAtTime(0.11 / (idx + 1), now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.8);
      osc.connect(gain);
      gain.connect(this.masterGain!);
      osc.start(now);
      osc.stop(now + 0.82);
    });
  }
}

export const horrorAudio = new FolkHorrorAudioEngine();
