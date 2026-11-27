import type { ScareMode } from '../types/game';

/**
 * 电影级中式民俗悬疑声景与空间混响拟音引擎（Cinematic Convolution Reverb & Acoustic Foley）
 * - 切后台 / 窗口失焦立即挂起静音，回前台平滑恢复
 * - 背景配乐：山间祠堂细雨檐声（滤除低频电流声）+ 稀疏古琴五声羽调泛音
 * - 恐怖画面/异象音效：采用双声道真实地下石室脉冲响应混响（ConvolverNode）+ 水琴非谐波擦弦簇（Waterphone）+ 沉重樟木门腔共振拟音 + 耳后共振峰湿冷吐息，彻底摒弃廉价电子锯齿波/方波合成音
 */
class FolkHorrorAudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private reverbNode: ConvolverNode | null = null;
  private reverbSendGain: GainNode | null = null;
  private rainGain: GainNode | null = null;
  private delayNode: DelayNode | null = null;
  private delayFeedback: GainNode | null = null;

  private muted: boolean = false;
  private isBackgrounded: boolean = false;
  private ambientStarted: boolean = false;
  private currentAct: number = 1;
  private phraseTimer: number | null = null;
  private phraseIndex: number = 0;

  private readonly earlyPhrases: Array<Array<{ freq: number; delay: number; vel: number }>> = [
    [
      { freq: 440.0, delay: 0, vel: 0.9 },
      { freq: 392.0, delay: 1.35, vel: 0.72 },
      { freq: 329.63, delay: 2.85, vel: 0.8 },
      { freq: 293.66, delay: 4.6, vel: 0.65 },
    ],
    [
      { freq: 293.66, delay: 0, vel: 0.78 },
      { freq: 329.63, delay: 1.25, vel: 0.75 },
      { freq: 440.0, delay: 2.7, vel: 0.85 },
      { freq: 523.25, delay: 4.4, vel: 0.58 },
    ],
    [
      { freq: 392.0, delay: 0, vel: 0.76 },
      { freq: 329.63, delay: 1.5, vel: 0.7 },
      { freq: 261.63, delay: 3.1, vel: 0.74 },
      { freq: 220.0, delay: 4.9, vel: 0.68 },
    ],
    [
      { freq: 523.25, delay: 0, vel: 0.62 },
      { freq: 440.0, delay: 1.4, vel: 0.76 },
      { freq: 329.63, delay: 3.0, vel: 0.72 },
    ],
  ];

  private readonly latePhrases: Array<Array<{ freq: number; delay: number; vel: number }>> = [
    [
      { freq: 440.0, delay: 0, vel: 0.85 },
      { freq: 349.23, delay: 1.45, vel: 0.74 },
      { freq: 329.63, delay: 2.95, vel: 0.82 },
      { freq: 220.0, delay: 4.8, vel: 0.68 },
    ],
    [
      { freq: 293.66, delay: 0, vel: 0.8 },
      { freq: 261.63, delay: 1.55, vel: 0.74 },
      { freq: 233.08, delay: 3.2, vel: 0.66 },
      { freq: 220.0, delay: 4.9, vel: 0.72 },
    ],
    [
      { freq: 587.33, delay: 0, vel: 0.56 },
      { freq: 440.0, delay: 1.6, vel: 0.72 },
      { freq: 392.0, delay: 3.1, vel: 0.66 },
      { freq: 329.63, delay: 4.8, vel: 0.62 },
    ],
  ];

  constructor() {
    if (typeof window !== 'undefined' && typeof document !== 'undefined') {
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
        this.masterGain.gain.setTargetAtTime(0.0001, this.ctx.currentTime, 0.06);
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

  /** 构建真实双声道地下石砌暗室/古祠堂脉冲响应（2.6 秒空间混响核） */
  private buildStoneHallImpulse(ctx: AudioContext): AudioBuffer {
    const duration = 2.6;
    const length = Math.floor(ctx.sampleRate * duration);
    const impulse = ctx.createBuffer(2, length, ctx.sampleRate);

    // 真实石墙离散早期反射（毫秒级声学空间定位感）
    const earlyReflections = [
      { ms: 17, gainL: 0.55, gainR: 0.32 },
      { ms: 31, gainL: 0.34, gainR: 0.58 },
      { ms: 53, gainL: 0.42, gainR: 0.28 },
      { ms: 79, gainL: 0.25, gainR: 0.44 },
      { ms: 112, gainL: 0.22, gainR: 0.20 },
    ];

    for (let ch = 0; ch < 2; ch++) {
      const data = impulse.getChannelData(ch);
      let lpState = 0;
      for (let i = 0; i < length; i++) {
        const t = i / ctx.sampleRate;
        const white = Math.random() * 2 - 1;
        // 潮湿古祠石壁吸收高频，尾音幽暗深邃
        const dampFactor = Math.max(0.08, 0.42 * Math.exp(-t * 1.6));
        lpState = lpState + dampFactor * (white - lpState);
        const decay = Math.pow(1 - t / duration, 2.8) * Math.exp(-t * 1.85);
        data[i] = lpState * decay * 0.65;
      }

      for (const er of earlyReflections) {
        const idx = Math.floor((er.ms / 1000) * ctx.sampleRate);
        if (idx < length) {
          data[idx] += ch === 0 ? er.gainL : er.gainR;
        }
      }
    }
    return impulse;
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

      // 1. 电影级双声道石室古祠脉冲混响总线
      this.reverbNode = this.ctx.createConvolver();
      this.reverbNode.buffer = this.buildStoneHallImpulse(this.ctx);

      this.reverbSendGain = this.ctx.createGain();
      this.reverbSendGain.gain.setValueAtTime(0.78, this.ctx.currentTime);
      this.reverbNode.connect(this.reverbSendGain);
      this.reverbSendGain.connect(this.masterGain);

      // 2. 古琴泛音空谷延迟线
      this.delayNode = this.ctx.createDelay(1.0);
      this.delayNode.delayTime.setValueAtTime(0.42, this.ctx.currentTime);

      const echoFilter = this.ctx.createBiquadFilter();
      echoFilter.type = 'lowpass';
      echoFilter.frequency.setValueAtTime(1500, this.ctx.currentTime);

      this.delayFeedback = this.ctx.createGain();
      this.delayFeedback.gain.setValueAtTime(0.24, this.ctx.currentTime);

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
          this.masterGain.gain.setTargetAtTime(0.0001, this.ctx.currentTime, 0.06);
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

  public startOrUpdateAmbient(act: number) {
    this.currentAct = act;
    this.ambientStarted = true;
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain) return;

    if (!this.rainGain) {
      const duration = 5.0;
      const len = Math.floor(ctx.sampleRate * duration);
      const rainBuf = ctx.createBuffer(1, len, ctx.sampleRate);
      const ch = rainBuf.getChannelData(0);
      let lastOut = 0;
      for (let i = 0; i < len; i++) {
        const white = Math.random() * 2 - 1;
        lastOut = (lastOut + 0.06 * white) / 1.06;
        const env = 0.82 + 0.18 * Math.sin((i / len) * Math.PI * 2);
        ch[i] = lastOut * env * 2.2;
      }

      const rainSource = ctx.createBufferSource();
      rainSource.buffer = rainBuf;
      rainSource.loop = true;

      const hp = ctx.createBiquadFilter();
      hp.type = 'highpass';
      hp.frequency.setValueAtTime(840, ctx.currentTime);

      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.setValueAtTime(2700, ctx.currentTime);

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
      const nextGap = 9000 + Math.floor(Math.random() * 3200);
      this.scheduleNextPhrase(nextGap);
    }, delayMs);
  }

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
    bodyFilter.frequency.setValueAtTime(freq * 3.4, startTime);
    bodyFilter.frequency.exponentialRampToValueAtTime(Math.max(360, freq * 1.3), startTime + 2.6);

    const noteGain = ctx.createGain();
    const peak = 0.025 * velocity;
    noteGain.gain.setValueAtTime(0.0001, startTime);
    noteGain.gain.linearRampToValueAtTime(peak, startTime + 0.035);
    noteGain.gain.exponentialRampToValueAtTime(peak * 0.35, startTime + 0.85);
    noteGain.gain.exponentialRampToValueAtTime(0.0001, startTime + 3.4);

    const osc1 = ctx.createOscillator();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(freq * 0.997, startTime);
    osc1.frequency.exponentialRampToValueAtTime(freq, startTime + 0.09);

    const osc2 = ctx.createOscillator();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(freq * 2, startTime);

    const harm2Gain = ctx.createGain();
    harm2Gain.gain.setValueAtTime(0.24, startTime);
    harm2Gain.gain.exponentialRampToValueAtTime(0.015, startTime + 1.4);

    osc1.connect(bodyFilter);
    osc2.connect(harm2Gain);
    harm2Gain.connect(bodyFilter);

    bodyFilter.connect(noteGain);
    noteGain.connect(this.masterGain);
    if (this.delayNode) noteGain.connect(this.delayNode);

    osc1.start(startTime);
    osc2.start(startTime);
    osc1.stop(startTime + 3.5);
    osc2.stop(startTime + 1.5);
  }

  /** 轻微机械与胶片齿轮卡嗒声 */
  public playClick(style: 'ui' | 'film' | 'unlock' = 'ui') {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain) return;
    const now = ctx.currentTime;

    if (style === 'unlock') {
      [440, 659.25].forEach((f, idx) => {
        const uOsc = ctx.createOscillator();
        const uGain = ctx.createGain();
        const t = now + idx * 0.08;
        uOsc.type = 'sine';
        uOsc.frequency.setValueAtTime(f, t);
        uGain.gain.setValueAtTime(0.048, t);
        uGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.38);
        uOsc.connect(uGain);
        uGain.connect(this.masterGain!);
        if (this.reverbNode) uGain.connect(this.reverbNode);
        uOsc.start(t);
        uOsc.stop(t + 0.4);
      });
      return;
    }

    // 真实机械微瞬态（短噪声经带通滤波，无塑料电子感）
    const dur = style === 'film' ? 0.032 : 0.018;
    const len = Math.floor(ctx.sampleRate * dur);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp((-i / len) * 6.5);
    }
    const src = ctx.createBufferSource();
    src.buffer = buf;

    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.setValueAtTime(style === 'film' ? 980 : 1650, now);
    bp.Q.setValueAtTime(style === 'film' ? 1.8 : 2.6, now);

    const g = ctx.createGain();
    g.gain.setValueAtTime(style === 'film' ? 0.09 : 0.045, now);

    src.connect(bp);
    bp.connect(g);
    g.connect(this.masterGain);
    src.start(now);
  }

  /** 祠堂青铜大锣（带石室混响残响） */
  public playBronzeGong(strikes: 1 | 3 = 1) {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain) return;

    for (let s = 0; s < strikes; s++) {
      const start = ctx.currentTime + s * 1.25;
      // 真实青铜大锣非整数泛音簇 + 槌头低频敲击瞬态
      const partials = [
        { f: 138.6, amp: 0.11, decay: 2.8 },
        { f: 179.4, amp: 0.075, decay: 2.5 },
        { f: 263.8, amp: 0.055, decay: 2.2 },
        { f: 389.2, amp: 0.038, decay: 1.9 },
        { f: 547.0, amp: 0.024, decay: 1.5 },
        { f: 781.5, amp: 0.015, decay: 1.1 },
      ];

      partials.forEach(({ f, amp, decay }) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(f * 1.028, start);
        osc.frequency.exponentialRampToValueAtTime(f * 0.982, start + decay * 0.75);

        gain.gain.setValueAtTime(0.0001, start);
        gain.gain.linearRampToValueAtTime(amp, start + 0.014);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + decay);

        osc.connect(gain);
        gain.connect(this.masterGain!);
        if (this.reverbNode) gain.connect(this.reverbNode);
        osc.start(start);
        osc.stop(start + decay + 0.05);
      });
    }
  }

  /** 真实枣木傩戏梆子（双腔木质共振滤波拟音 + 祠堂残响） */
  public playWoodenClapper() {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain) return;

    [0, 0.31, 0.63].forEach((offset, idx) => {
      const t = ctx.currentTime + offset;
      const len = Math.floor(ctx.sampleRate * 0.045);
      const buf = ctx.createBuffer(1, len, ctx.sampleRate);
      const ch = buf.getChannelData(0);
      for (let i = 0; i < len; i++) {
        ch[i] = (Math.random() * 2 - 1) * Math.exp((-i / len) * 9.0);
      }

      const src = ctx.createBufferSource();
      src.buffer = buf;

      // 枣木空腔共振峰
      const woodRes = ctx.createBiquadFilter();
      woodRes.type = 'bandpass';
      woodRes.frequency.setValueAtTime(idx === 2 ? 1120 : 1060, t);
      woodRes.Q.setValueAtTime(14, t);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.28, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);

      src.connect(woodRes);
      woodRes.connect(gain);
      gain.connect(this.masterGain!);
      if (this.reverbNode) gain.connect(this.reverbNode);
      src.start(t);
    });
  }

  /** 物理声学拟音：厚重老木门叩击与黄铜锁舌轻拧声（绝不用方波/锯齿波） */
  public playDoorKnocks(count: number = 3, withHandleRattle: boolean = true) {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain) return;

    for (let i = 0; i < count; i++) {
      const t = ctx.currentTime + i * 0.58;

      // 1) 门板低频胸腔闷震（116Hz -> 49Hz 阻尼膜振动）
      const sub = ctx.createOscillator();
      const subGain = ctx.createGain();
      sub.type = 'sine';
      sub.frequency.setValueAtTime(118, t);
      sub.frequency.exponentialRampToValueAtTime(48, t + 0.12);
      subGain.gain.setValueAtTime(0.18, t);
      subGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
      sub.connect(subGain);
      subGain.connect(this.masterGain);
      if (this.reverbNode) subGain.connect(this.reverbNode);
      sub.start(t);
      sub.stop(t + 0.17);

      // 2) 指骨叩击厚木门板的双共振峰冲击噪声（265Hz 木腔 + 680Hz 表皮瞬态）
      const hitLen = Math.floor(ctx.sampleRate * 0.038);
      const hitBuf = ctx.createBuffer(1, hitLen, ctx.sampleRate);
      const d = hitBuf.getChannelData(0);
      for (let k = 0; k < hitLen; k++) {
        d[k] = (Math.random() * 2 - 1) * Math.exp((-k / hitLen) * 7.5);
      }
      const hitSrc = ctx.createBufferSource();
      hitSrc.buffer = hitBuf;

      const cavity = ctx.createBiquadFilter();
      cavity.type = 'bandpass';
      cavity.frequency.setValueAtTime(275, t);
      cavity.Q.setValueAtTime(4.8, t);

      const hitGain = ctx.createGain();
      hitGain.gain.setValueAtTime(0.32, t);

      hitSrc.connect(cavity);
      cavity.connect(hitGain);
      hitGain.connect(this.masterGain);
      if (this.reverbNode) hitGain.connect(this.reverbNode);
      hitSrc.start(t);
    }

    if (withHandleRattle) {
      // 真实黄铜旧门锁从门外缓慢拧动三下的金属栓摩擦点击（高频谐振滤波脉冲）
      const base = ctx.currentTime + count * 0.58 + 0.28;
      [0, 0.13, 0.38, 0.51].forEach((off, idx) => {
        const t = base + off;
        const mLen = Math.floor(ctx.sampleRate * 0.025);
        const mBuf = ctx.createBuffer(1, mLen, ctx.sampleRate);
        const md = mBuf.getChannelData(0);
        for (let k = 0; k < mLen; k++) {
          md[k] = (Math.random() * 2 - 1) * Math.exp((-k / mLen) * 9.5);
        }
        const mSrc = ctx.createBufferSource();
        mSrc.buffer = mBuf;

        const latchFilter = ctx.createBiquadFilter();
        latchFilter.type = 'bandpass';
        latchFilter.frequency.setValueAtTime(idx % 2 === 0 ? 1840 : 2620, t);
        latchFilter.Q.setValueAtTime(11, t);

        const mGain = ctx.createGain();
        mGain.gain.setValueAtTime(0.16, t);

        mSrc.connect(latchFilter);
        latchFilter.connect(mGain);
        mGain.connect(this.masterGain!);
        if (this.reverbNode) mGain.connect(this.reverbNode);
        mSrc.start(t);
      });
    }
  }

  /** 镜片潜影 / 水银封镜异象：幽冷水琴擦音（Bowed Waterphone）+ 空间混响暗息 */
  public playMirrorChill(mode: ScareMode) {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain) return;
    const now = ctx.currentTime;
    const scale = mode === 'full' ? 1.0 : 0.58;

    // 1) 水琴弓弦擦奏非谐波金属泛音（慢起音 + 石室长混响，电影感极强且绝不刺耳）
    const rods = [311.13, 455.8, 682.4];
    rods.forEach((freq, idx) => {
      const carrier = ctx.createOscillator();
      const mod = ctx.createOscillator();
      const modGain = ctx.createGain();
      const env = ctx.createGain();

      carrier.type = 'sine';
      carrier.frequency.setValueAtTime(freq, now);

      mod.type = 'sine';
      mod.frequency.setValueAtTime(freq * 1.414 + idx * 1.7, now);
      modGain.gain.setValueAtTime(freq * 0.018, now);

      const amp = (0.022 / (idx + 1)) * scale;
      env.gain.setValueAtTime(0.0001, now);
      env.gain.linearRampToValueAtTime(amp, now + 0.32);
      env.gain.exponentialRampToValueAtTime(0.0001, now + 1.85);

      mod.connect(modGain);
      modGain.connect(carrier.frequency);
      carrier.connect(env);
      if (this.reverbNode) {
        env.connect(this.reverbNode);
      } else {
        env.connect(this.masterGain!);
      }

      carrier.start(now);
      mod.start(now);
      carrier.stop(now + 1.9);
      mod.stop(now + 1.9);
    });

    // 2) 极轻的耳后湿冷吐息（声道共振峰滤波粉噪）
    this.triggerGhostExhale(ctx, now + 0.08, 0.95, 0.045 * scale, 0.45);
  }

  /** 合成贴近耳畔的人体声道共振峰冷息声（Formant Filtered Breath） */
  private triggerGhostExhale(
    ctx: AudioContext,
    startTime: number,
    duration: number,
    peakGain: number,
    panValue: number
  ) {
    if (!this.masterGain) return;
    const len = Math.floor(ctx.sampleRate * duration);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const ch = buf.getChannelData(0);
    let b0 = 0;
    for (let i = 0; i < len; i++) {
      const w = Math.random() * 2 - 1;
      b0 = 0.94 * b0 + 0.06 * w;
      const pos = i / len;
      const env = Math.sin(Math.pow(pos, 0.65) * Math.PI);
      ch[i] = (b0 * 2.8 + w * 0.18) * env;
    }

    const src = ctx.createBufferSource();
    src.buffer = buf;

    const f1 = ctx.createBiquadFilter();
    f1.type = 'bandpass';
    f1.frequency.setValueAtTime(510, startTime);
    f1.frequency.linearRampToValueAtTime(420, startTime + duration);
    f1.Q.setValueAtTime(5.2, startTime);

    const f2 = ctx.createBiquadFilter();
    f2.type = 'bandpass';
    f2.frequency.setValueAtTime(1420, startTime);
    f2.Q.setValueAtTime(6.0, startTime);

    const mix = ctx.createGain();
    mix.gain.setValueAtTime(peakGain, startTime);

    src.connect(f1);
    src.connect(f2);
    f1.connect(mix);
    f2.connect(mix);

    if (typeof ctx.createStereoPanner === 'function') {
      const panner = ctx.createStereoPanner();
      panner.pan.setValueAtTime(panValue, startTime);
      mix.connect(panner);
      panner.connect(this.masterGain);
      if (this.reverbNode) panner.connect(this.reverbNode);
    } else {
      mix.connect(this.masterGain);
      if (this.reverbNode) mix.connect(this.reverbNode);
    }

    src.start(startTime);
  }

  /** 赵一鸣支线多轨取证音频合成（真呼吸顿挫换气 vs 零间隙水底伪声复读） */
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
        // 真实受惊活人：0~2.6s 断续呼救声（带音节起伏）-> 2.6~3.15s 明显停顿静音 -> 3.15~3.6s 急促倒抽气 -> 3.6~4.2s 压低余音
        let env = 0.015;
        if (sec < 2.6) {
          const syllable = Math.max(0, Math.sin(sec * Math.PI * 5.2));
          env = 0.08 + syllable * 0.56;
        } else if (sec >= 2.6 && sec < 3.12) {
          env = 0.012; // 清晰静音停顿间隙
        } else if (sec >= 3.12 && sec < 3.58) {
          const gaspPos = (sec - 3.12) / 0.46;
          env = Math.sin(gaspPos * Math.PI) * 0.88; // 急促换气吸气峰值
        } else {
          env = 0.24 * Math.max(0, Math.sin((sec - 3.58) * Math.PI * 4));
        }
        data[i] = (Math.random() * 2 - 1) * env;
      } else {
        // 伪声：全程 4.2s 无任何停顿与换气的等幅水底暗涌低语
        const flutter = 0.85 + 0.15 * Math.sin(sec * Math.PI * 2 * 7.5);
        data[i] = ((Math.random() * 2 - 1) * 0.44 + Math.sin(sec * Math.PI * 2 * 64) * 0.28) * flutter;
      }
    }

    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(hasHumanBreath ? 1280 : 690, now);
    filter.Q.setValueAtTime(hasHumanBreath ? 2.1 : 6.2, now);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.16, now);
    gain.gain.setValueAtTime(0.16, now + duration - 0.18);
    gain.gain.linearRampToValueAtTime(0.0001, now + duration);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    noise.start(now);
    noise.stop(now + duration);

    // 为真人音轨叠加一段清晰的共振峰急促吸气声（3.12s 处），耳听即可辨别
    if (hasHumanBreath) {
      this.triggerGhostExhale(ctx, now + 3.12, 0.48, 0.11, 0);
    }
  }

  /**
   * 电影级中式民俗恐怖高能音效（彻底重构，0 锯齿波 / 0 方波！）
   * 结构：祠堂棺木沉闷合拢低频瞬态 + 水琴（Waterphone）失谐青铜擦奏簇 + 左右声道交错耳畔湿冷叹息 + 远景石室混响木梆残音
   */
  public playScareStinger(mode: ScareMode) {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain) return;
    const now = ctx.currentTime;
    const isFull = mode === 'full';
    const intensity = isFull ? 1.0 : 0.52;

    // 1. 深沉木棺/石龛合拢胸腔低频冲击（纯声学膜阻尼 + 低通棕噪冲击，浑厚震撼不刺耳）
    const subOsc = ctx.createOscillator();
    const subGain = ctx.createGain();
    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(86, now);
    subOsc.frequency.exponentialRampToValueAtTime(31, now + 0.34);
    subGain.gain.setValueAtTime(0.0001, now);
    subGain.gain.linearRampToValueAtTime(0.28 * intensity, now + 0.012);
    subGain.gain.exponentialRampToValueAtTime(0.0001, now + 1.35);
    subOsc.connect(subGain);
    subGain.connect(this.masterGain);
    if (this.reverbNode) subGain.connect(this.reverbNode);
    subOsc.start(now);
    subOsc.stop(now + 1.4);

    // 木龛闷响噪声瞬态
    const thudLen = Math.floor(ctx.sampleRate * 0.09);
    const thudBuf = ctx.createBuffer(1, thudLen, ctx.sampleRate);
    const td = thudBuf.getChannelData(0);
    for (let i = 0; i < thudLen; i++) {
      td[i] = (Math.random() * 2 - 1) * Math.exp((-i / thudLen) * 5.2);
    }
    const thudSrc = ctx.createBufferSource();
    thudSrc.buffer = thudBuf;
    const thudLp = ctx.createBiquadFilter();
    thudLp.type = 'lowpass';
    thudLp.frequency.setValueAtTime(165, now);
    const thudG = ctx.createGain();
    thudG.gain.setValueAtTime(0.35 * intensity, now);
    thudSrc.connect(thudLp);
    thudLp.connect(thudG);
    thudG.connect(this.masterGain);
    if (this.reverbNode) thudG.connect(this.reverbNode);
    thudSrc.start(now);

    // 2. 恐怖电影标志性水琴（Bowed Waterphone）非谐波金属弓弦簇（注入 2.6 秒古祠脉冲混响）
    const waterphoneCluster = [
      { f: 196.0, ratio: 1.414, pan: -0.5, swell: 0.14 },
      { f: 277.18, ratio: 1.732, pan: 0.45, swell: 0.22 },
      { f: 415.3, ratio: 1.272, pan: -0.3, swell: 0.18 },
      { f: 598.4, ratio: 1.618, pan: 0.6, swell: 0.28 },
    ];

    waterphoneCluster.forEach(({ f, ratio, pan, swell }, idx) => {
      const car = ctx.createOscillator();
      const mod = ctx.createOscillator();
      const modG = ctx.createGain();
      const env = ctx.createGain();

      car.type = 'sine';
      car.frequency.setValueAtTime(f * 0.992, now);
      car.frequency.linearRampToValueAtTime(f * 1.015, now + 1.6);

      mod.type = 'sine';
      mod.frequency.setValueAtTime(f * ratio, now);
      modG.gain.setValueAtTime(f * 0.045, now);
      modG.gain.exponentialRampToValueAtTime(f * 0.008, now + 1.9);

      const peak = (0.042 / (idx * 0.6 + 1)) * intensity;
      env.gain.setValueAtTime(0.0001, now);
      env.gain.linearRampToValueAtTime(peak, now + swell);
      env.gain.exponentialRampToValueAtTime(0.0001, now + 2.25);

      mod.connect(modG);
      modG.connect(car.frequency);
      car.connect(env);

      if (typeof ctx.createStereoPanner === 'function') {
        const p = ctx.createStereoPanner();
        p.pan.setValueAtTime(pan, now);
        env.connect(p);
        if (this.reverbNode) p.connect(this.reverbNode);
        p.connect(this.masterGain!);
      } else {
        if (this.reverbNode) env.connect(this.reverbNode);
        env.connect(this.masterGain!);
      }

      car.start(now);
      mod.start(now);
      car.stop(now + 2.3);
      mod.stop(now + 2.3);
    });

    // 3. 耳后近场湿冷叹息声（极具真实临场寒意）
    this.triggerGhostExhale(ctx, now + 0.06, 1.25, 0.085 * intensity, -0.58);
    if (isFull) {
      // 远景祠堂深处回荡两声孤寂木梆残响
      window.setTimeout(() => {
        if (!this.muted && !this.isBackgrounded) {
          this.playDistantEchoClapper();
        }
      }, 240);
    }
  }

  private playDistantEchoClapper() {
    const ctx = this.ensureContext();
    if (!ctx || !this.reverbNode) return;
    [0, 0.36].forEach((off) => {
      const t = ctx.currentTime + off;
      const len = Math.floor(ctx.sampleRate * 0.04);
      const buf = ctx.createBuffer(1, len, ctx.sampleRate);
      const ch = buf.getChannelData(0);
      for (let i = 0; i < len; i++) {
        ch[i] = (Math.random() * 2 - 1) * Math.exp((-i / len) * 9.0);
      }
      const src = ctx.createBufferSource();
      src.buffer = buf;
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.setValueAtTime(980, t);
      bp.Q.setValueAtTime(12, t);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.18, t);
      src.connect(bp);
      bp.connect(g);
      // 100% 送入石室混响，听起来就像从地下走廊尽头传来的真木梆声
      g.connect(this.reverbNode!);
      src.start(t);
    });
  }
}

export const horrorAudio = new FolkHorrorAudioEngine();
