// Sistema de Audio Retro en 8 Bits:
// - Música de fondo en 8 bits (sin letra) con el ritmo y melodía de la canción
// - Efectos de sonido 8 bits (saltos, rayo láser Q, pelotitas 1, katana, hechizo violeta, bola de fuego, explosión de Hater, etc.)

class RetroAudio {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.musicPlaying = false;
    this.musicTimer = null;
    this.step = 0;
  }

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  toggleMute() {
    this.muted = !this.muted;
    if (this.muted) {
      this.stopMusic();
    } else {
      this.startMusic();
    }
    return this.muted;
  }

  setPterodactylLoop() {
    // Sonido del Pterodáctilo eliminado a pedido del usuario
  }

  playTone(freq, type, duration, vol = 0.12, slideTo = null, delay = 0) {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    if (slideTo) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), now + duration);
    }

    gain.gain.setValueAtTime(vol, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + duration);
  }

  jump() {
    this.playTone(190, 'square', 0.2, 0.12, 580);
  }

  flyBoost() {
    this.playTone(320, 'triangle', 0.09, 0.1, 480);
  }

  crouch() {
    this.playTone(220, 'square', 0.06, 0.08, 130);
  }

  shootLaser() {
    // Rayo verde de los ojos de Super Vaquito (Tecla Q)
    this.playTone(980, 'sawtooth', 0.13, 0.14, 300);
    this.playTone(1320, 'square', 0.09, 0.1, 460, 0.02);
  }

  shootPellet() {
    // Pelotita verde de Super Burguer
    this.playTone(680, 'square', 0.08, 0.12, 260);
    this.playTone(880, 'square', 0.06, 0.08, 420, 0.04);
  }

  shootKatana() {
    // Katana ninja de SuperJack
    this.playTone(1100, 'triangle', 0.07, 0.14, 340);
    this.playTone(1500, 'sawtooth', 0.09, 0.11, 520, 0.02);
  }

  shootWitchSpell() {
    // Hechizo de bruja violeta de SuperVaquita
    this.playTone(520, 'sine', 0.08, 0.14, 940);
    this.playTone(740, 'triangle', 0.12, 0.13, 1280, 0.04);
  }

  shootFireball() {
    // Bola de fuego por la boca de SuperFlex
    this.playTone(240, 'sawtooth', 0.15, 0.16, 75);
    this.playTone(180, 'square', 0.14, 0.14, 55, 0.03);
  }

  stompPeanut() {
    this.playTone(260, 'square', 0.08, 0.14, 120);
    this.playTone(520, 'square', 0.12, 0.14, 780, 0.06);
  }

  bossHit() {
    this.playTone(160, 'sawtooth', 0.14, 0.16, 70);
    this.playTone(420, 'square', 0.1, 0.14, 840, 0.04);
  }

  bossExplosionBoom() {
    this.playTone(120, 'sawtooth', 0.28, 0.2, 32);
    this.playTone(85, 'square', 0.32, 0.18, 25, 0.05);
  }

  luckyBlock() {
    this.playTone(440, 'square', 0.07, 0.12, 660);
    this.playTone(554, 'square', 0.07, 0.12, 880, 0.07);
    this.playTone(659, 'square', 0.11, 0.12, 987, 0.14);
  }

  powerUpTransform() {
    const notes = [330, 392, 659, 523, 587, 784, 659, 1046];
    notes.forEach((n, i) => {
      this.playTone(n, 'square', 0.08, 0.13, null, i * 0.055);
    });
  }

  powerDown() {
    const notes = [784, 659, 523, 392, 261];
    notes.forEach((n, i) => {
      this.playTone(n, 'square', 0.07, 0.1, null, i * 0.05);
    });
  }

  hurtHit() {
    this.playTone(190, 'sawtooth', 0.12, 0.14, 85);
    this.playTone(140, 'square', 0.12, 0.12, 65, 0.06);
  }

  loseHeart() {
    const notes = [493, 698, 698, 659, 587, 523, 330, 261];
    notes.forEach((n, i) => {
      this.playTone(n, 'square', 0.11, 0.14, null, i * 0.09);
    });
  }

  victory() {
    const notes = [392, 466, 587, 784, 698, 784, 932, 784, 1174];
    notes.forEach((n, i) => {
      this.playTone(n, 'square', i === notes.length - 1 ? 0.35 : 0.11, 0.14, null, i * 0.1);
    });
  }

  startMusic() {
    if (this.muted || this.musicPlaying) return;
    this.init();
    this.musicPlaying = true;
    this.startChiptuneMuchachos();
  }

  startChiptuneMuchachos() {
    if (this.musicTimer) clearInterval(this.musicTimer);
    // Canción de fondo en 8 bits (sin letra): versión chiptune completa del ritmo y melodía de "Muchachos"
    // Notas: D4=294, F4=349, F#4=370, G4=392, A4=440, Bb4=466, C5=523, D5=587, Eb5=622, F5=698, G5=784
    const melody = [
      // 1. Intro de trompetas (0:06 - 0:25 de la canción)
      349, 392, 440, 466, 0, 466, 440, 392, 349, 294, 0, 0,
      392, 440, 466, 523, 0, 523, 466, 440, 392, 349, 0, 0,
      349, 392, 440, 466, 523, 587, 0, 523, 466, 440, 392, 0,
      440, 466, 523, 587, 0, 466, 0, 349, 0, 0, 0, 0,

      // 2. Melodía de la estrofa en 8 bits
      587, 587, 587, 587, 523, 466, 587, 0,
      523, 523, 523, 523, 466, 440, 523, 0,
      466, 466, 466, 466, 440, 392, 466, 0,
      440, 440, 392, 370, 392, 440, 294, 0,
      622, 622, 587, 523, 587, 622, 587, 0,
      587, 523, 466, 440, 392, 440, 466, 0,
      523, 523, 523, 466, 440, 392, 440, 466, 523, 587, 440, 0,

      // 3. Melodía del estribillo en 8 bits
      587, 784, 0, 698, 0, 698, 622, 587, 523, 587, 622, 587, 523, 466, 0, 0,
      466, 622, 0, 587, 0, 587, 523, 466, 440, 466, 523, 466, 440, 392, 0, 0,
      392, 523, 0, 466, 0, 466, 440, 392, 370, 392, 440, 392, 370, 294, 0, 0,
      587, 622, 587, 523, 466, 440, 392, 0, 440, 466, 523, 466, 440, 392, 0, 0
    ];

    // Bajo ska/murga de 8 bits + contratiempo rítmico
    const bass = [
      233, 174, 233, 294, 233, 174, 233, 294,
      196, 147, 196, 233, 196, 147, 196, 233,
      155, 196, 233, 174, 155, 196, 233, 174,
      147, 185, 220, 147, 196, 147, 196, 0
    ];

    const chordStab = [
      0, 698, 0, 698, 0, 587, 0, 587,
      0, 622, 0, 622, 0, 554, 0, 587
    ];

    this.musicTimer = setInterval(() => {
      if (this.muted || !this.musicPlaying) return;
      const m = melody[this.step % melody.length];
      const b = bass[this.step % bass.length];
      const c = chordStab[this.step % chordStab.length];

      if (m > 0) this.playTone(m, 'square', 0.13, 0.065);
      if (b > 0) this.playTone(b, 'triangle', 0.14, 0.08);
      if (c > 0) this.playTone(c, 'square', 0.045, 0.025);
      this.step++;
    }, 150);
  }

  stopMusic() {
    this.musicPlaying = false;
    if (this.musicTimer) {
      clearInterval(this.musicTimer);
      this.musicTimer = null;
    }
    this.setPterodactylLoop(false);
  }
}

window.retroAudio = new RetroAudio();
