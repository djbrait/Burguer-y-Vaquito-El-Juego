// Motor Principal de "Burguer y Vaquito: El Juego"
// 5 Personajes Jugables: Vaquito, Burguer, Jack, Vaquita y Flex
// Nivel 1: La Playa -> Castillo de Arena -> Nivel 2: El Infierno y Jefe Final HATER (100/100) -> Cinemática y Playa Tranquila con Computadora Final

const GRAVITY = 0.54;
const JUMP_FORCE = -15.2;
const GROUND_Y = 440;
const MAX_HITS_PER_HEART = 5;
const POWER_DURATION_SEC = 15;
const VAQUITO_FLY_MAX_SEC = 5;

const CHARACTER_DEFS = {
  vaquito: {
    id: 'vaquito',
    name: 'Vaquito',
    icon: '🐄',
    food: 'lettuce', // Solo puede tocar la lechuga
    baseSprite: 'vaquito',
    superSprite: 'super_vaquito',
    superName: 'SUPER VAQUITO',
    weaponType: 'laser', // Rayo verde por los ojos
    weaponLabel: 'Rayo Verde Ojos',
    canFly: true,
    growsOnSuper: false,
    moveWithTorso: false,
    tagColor: '#ffffff',
    auraColor: '#58ff6e'
  },
  burguer: {
    id: 'burguer',
    name: 'Burguer',
    icon: '🐕',
    food: 'meat', // Solo puede tocar la carne
    baseSprite: 'burguer',
    superSprite: 'super_burguer',
    superName: 'SUPER BURGUER',
    weaponType: 'pellet', // Pelotitas verdes
    weaponLabel: 'Pelotitas Verdes',
    canFly: false,
    growsOnSuper: false,
    moveWithTorso: true,
    tagColor: '#ffae52',
    auraColor: '#ff5858'
  },
  jack: {
    id: 'jack',
    name: 'Jack',
    icon: '🥷',
    food: 'meat', // Solo puede tocar la carne
    baseSprite: 'jack',
    superSprite: 'super_jack',
    superName: 'SUPERJACK',
    weaponType: 'katana', // Lanza una katana
    weaponLabel: 'Katana Ninja',
    canFly: false,
    growsOnSuper: false,
    moveWithTorso: true,
    tagColor: '#ffe066',
    auraColor: '#ffdd00'
  },
  vaquita: {
    id: 'vaquita',
    name: 'Vaquita',
    icon: '🔮',
    food: 'lettuce', // Solo puede tocar la lechuga
    baseSprite: 'vaquita',
    superSprite: 'super_vaquita',
    superName: 'SUPERVAQUITA',
    weaponType: 'witch_spell', // Lanza un hechizo de bruja violeta
    weaponLabel: 'Hechizo Violeta',
    canFly: false,
    growsOnSuper: false,
    moveWithTorso: false,
    tagColor: '#e599ff',
    auraColor: '#b833ff'
  },
  flex: {
    id: 'flex',
    name: 'Flex',
    icon: '🐊',
    food: 'meat', // Solo puede tocar la carne
    baseSprite: 'flex',
    superSprite: 'super_flex',
    superName: 'SUPERFLEX',
    weaponType: 'fireball', // Lanza bola de fuego por la boca y crece de tamaño
    weaponLabel: 'Bola de Fuego + Gigante',
    canFly: false,
    growsOnSuper: true, // Crece de tamaño con solo tocar la carne
    moveWithTorso: false,
    tagColor: '#7dff8b',
    auraColor: '#ff5500'
  }
};

class Player {
  constructor(slotIndex, charId, startX) {
    this.slotIndex = slotIndex; // 1 = J1, 2 = J2
    this.startX = startX;
    this.baseW = 56;
    this.baseNormalH = 68;
    this.baseCrouchH = 44;
    this.setCharacter(charId);
    this.resetFull();
  }

  setCharacter(charId) {
    const def = CHARACTER_DEFS[charId] || CHARACTER_DEFS.vaquito;
    this.charId = def.id;
    this.def = def;
    this.name = def.name;
    this.food = def.food;
    this.baseSpriteKey = def.baseSprite;
    this.superSpriteKey = def.superSprite;
  }

  get normalH() {
    return this.isSuper && this.def.growsOnSuper ? 92 : this.baseNormalH;
  }

  get crouchH() {
    return this.isSuper && this.def.growsOnSuper ? 60 : this.baseCrouchH;
  }

  resetFull() {
    this.w = this.baseW;
    this.h = this.baseNormalH;
    this.x = this.startX;
    this.y = GROUND_Y - this.h;
    this.vx = 0;
    this.vy = 0;

    this.hearts = 3;
    this.hitsTaken = 0;
    this.permanentlyDead = false;
    this.respawnTimer = 0;
    this.dyingAnimTimer = 0;

    this.onGround = false;
    this.crouching = false;
    this.facingLeft = false;

    this.powerTimer = 0;
    this.infinitePower = false;
    this.flyFuel = VAQUITO_FLY_MAX_SEC;
    this.isFlying = false;
    this.shootCooldown = 0;

    this.invulnTimer = 0;
    this.hurtAnimTimer = 0;
    this.animState = 'idle';
    this.animFrame = 0;
    this.animTick = 0;
    this.torsoWave = 0;
    this.lastSafeX = this.startX;
    this.underBlockHintCooldown = 0;
  }

  get isSuper() {
    return this.infinitePower || this.powerTimer > 0;
  }

  get currentSpriteKey() {
    return this.isSuper ? this.superSpriteKey : this.baseSpriteKey;
  }

  syncSizeForSuper() {
    const oldH = this.h;
    const targetW = this.isSuper && this.def.growsOnSuper ? 76 : this.baseW;
    const targetH = this.crouching ? this.crouchH : this.normalH;
    this.w = targetW;
    if (this.h !== targetH) {
      this.y -= targetH - oldH;
      this.h = targetH;
    }
  }

  activatePower(unlimited = false) {
    if (unlimited) {
      this.infinitePower = true;
      this.powerTimer = 999999;
    } else {
      this.powerTimer = POWER_DURATION_SEC;
    }
    if (this.def.canFly) {
      this.flyFuel = VAQUITO_FLY_MAX_SEC;
    }
    this.syncSizeForSuper();
    window.retroAudio.powerUpTransform();
  }

  takeEnemyHit(game) {
    if (this.permanentlyDead || this.respawnTimer > 0 || this.dyingAnimTimer > 0 || this.invulnTimer > 0) {
      return;
    }
    const dmg = this.isSuper ? 0.5 : 1;
    this.hitsTaken = Math.min(MAX_HITS_PER_HEART, +(this.hitsTaken + dmg).toFixed(1));
    this.invulnTimer = 0.85;
    this.hurtAnimTimer = 0.45;
    this.vy = -5.5;
    this.vx = this.facingLeft ? 4.5 : -4.5;

    if (this.hitsTaken >= MAX_HITS_PER_HEART) {
      window.retroAudio.loseHeart();
      game.addFloatingText(this.x + this.w / 2, this.y - 12, `¡5 GOLPES! ${this.name.toUpperCase()} -1 ❤️`, '#ff3838');
      this.triggerDeathAndRespawn(game, false);
    } else {
      window.retroAudio.hurtHit();
      game.addFloatingText(
        this.x + this.w / 2,
        this.y - 10,
        `¡AUCH! (${this.hitsTaken}/${MAX_HITS_PER_HEART} golpes)`,
        '#ffae00'
      );
    }
  }

  triggerDeathAndRespawn(game, fellInPit = false) {
    this.hearts = Math.max(0, this.hearts - 1);
    this.hitsTaken = 0;
    if (!this.infinitePower) {
      this.powerTimer = 0;
    }
    this.isFlying = false;
    this.crouching = false;
    this.syncSizeForSuper();

    if (fellInPit) {
      window.retroAudio.loseHeart();
      const pitName = game.currentLevel === 2 && !game.peacefulBeachAfterBoss ? '¡LAVA!' : '¡POZO!';
      game.addFloatingText(this.x + this.w / 2, GROUND_Y - 60, `${pitName} ${this.name.toUpperCase()} -1 ❤️`, '#ff3838');
    }

    if (this.hearts <= 0) {
      this.dyingAnimTimer = 0.9;
      this.vy = -8;
      game.addFloatingText(
        this.x + this.w / 2,
        Math.min(this.y, GROUND_Y - 80),
        `¡${this.name.toUpperCase()} SIN CORAZONES! NO REAPARECE`,
        '#ff1e1e'
      );
    } else {
      this.dyingAnimTimer = 0.65;
      this.vy = -7.5;
    }
  }

  completeRespawn(game) {
    if (this.hearts <= 0) {
      this.permanentlyDead = true;
      return;
    }
    const partner = this.slotIndex === 1 ? game.p2 : game.p1;
    let spawnX = this.lastSafeX;
    if (partner && !partner.permanentlyDead && partner.respawnTimer <= 0 && partner.dyingAnimTimer <= 0) {
      spawnX = game.findNearestSafeGroundX(partner.x);
    } else {
      spawnX = game.findNearestSafeGroundX(this.lastSafeX);
    }

    this.syncSizeForSuper();
    this.x = spawnX;
    this.y = GROUND_Y - this.h - 90;
    this.vx = 0;
    this.vy = 0;
    this.hitsTaken = 0;
    this.invulnTimer = 2.0;
    this.flyFuel = VAQUITO_FLY_MAX_SEC;
    game.addFloatingText(this.x + this.w / 2, this.y, `¡${this.name.toUpperCase()} REAPARECIÓ! (${this.hearts} ❤️)`, '#58ff6e');
  }
}

class BurguerVaquitoGame {
  constructor() {
    this.canvas = document.getElementById('game-canvas');
    this.ctx = this.canvas.getContext('2d');
    this.ctx.imageSmoothingEnabled = false;

    this.mode = 'local'; // 'local' | 'single' | 'online_host' | 'online_guest'
    this.running = false;
    this.paused = false;
    this.gameOver = false;
    this.victory = false;

    this.currentLevel = 1;
    this.worldWidth = 8600;
    this.peacefulBeachAfterBoss = false;
    this.levelBannerTimer = 0;
    this.levelBannerText = '';

    this.cameraX = 0;
    this.worldTime = 0;
    this.score = 0;

    // Jugador 1 y Jugador 2 (pueden elegir cualquiera de los 5 personajes sin repetir)
    this.p1 = new Player(1, 'vaquito', 110);
    this.p2 = new Player(2, 'burguer', 185);

    this.pits = [];
    this.blocks = [];
    this.peanuts = [];
    this.pteros = [];
    this.items = [];
    this.projectiles = []; // Rayos verdes, Pelotitas, Katanas, Hechizos Violetas y Bolas de Fuego
    this.floatingTexts = [];
    this.particles = [];
    this.clouds = [];
    this.decorations = [];

    this.hater = null;
    this.computerGoal = null;

    this.keys = {};
    this.justPressed = {};
    this.remoteGuestInput = { left: false, right: false, up: false, down: false, action: false, jumpJustPressed: false };
    this.touchInput = { left: false, right: false, up: false, down: false, action: false, jumpJustPressed: false };
    this.luckyToggle = false;

    this.setupInputs();
    this.buildLevel1Beach();
  }

  setupInputs() {
    window.addEventListener('keydown', (e) => {
      // Tecla ESC durante la partida: mostrar pantallita "¿Seguro que quieres salir?"
      if (e.code === 'Escape' || e.key === 'Escape') {
        if (this.running && !this.gameOver && !this.victory) {
          e.preventDefault();
          this.toggleEscModal();
          return;
        }
      }

      if (
        ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', ' ', 'Tab'].includes(e.key) ||
        ['Space', 'Tab', 'KeyQ', 'Numpad1', 'End'].includes(e.code)
      ) {
        if (this.running && !this.paused && document.activeElement?.tagName !== 'INPUT') {
          e.preventDefault();
        }
      }
      if (!this.keys[e.code]) {
        this.justPressed[e.code] = true;
      }
      this.keys[e.code] = true;
    });

    window.addEventListener('keyup', (e) => {
      this.keys[e.code] = false;
    });

    const bindTouch = (btnId, prop) => {
      const btn = document.getElementById(btnId);
      if (!btn) return;
      const start = (e) => {
        e.preventDefault();
        window.retroAudio.init();
        if (prop === 'up' && !this.touchInput.up) {
          this.touchInput.jumpJustPressed = true;
        }
        this.touchInput[prop] = true;
        btn.classList.add('active');
      };
      const end = (e) => {
        e.preventDefault();
        this.touchInput[prop] = false;
        btn.classList.remove('active');
      };
      btn.addEventListener('touchstart', start, { passive: false });
      btn.addEventListener('touchend', end, { passive: false });
      btn.addEventListener('touchcancel', end, { passive: false });
      btn.addEventListener('mousedown', start);
      btn.addEventListener('mouseup', end);
      btn.addEventListener('mouseleave', end);
    };

    bindTouch('touch-left', 'left');
    bindTouch('touch-right', 'right');
    bindTouch('touch-jump', 'up');
    bindTouch('touch-crouch', 'down');
    bindTouch('touch-action', 'action');

    // Soporte para deslizar el pulgar en la cruceta derecha (Arriba, Abajo, Izquierda, Derecha)
    const dpadPad = document.getElementById('touch-dpad-pad');
    if (dpadPad) {
      const dpadButtons = [
        { id: 'touch-jump', prop: 'up' },
        { id: 'touch-crouch', prop: 'down' },
        { id: 'touch-left', prop: 'left' },
        { id: 'touch-right', prop: 'right' }
      ];
      const updateDpadFromTouches = (e) => {
        const hitProps = { up: false, down: false, left: false, right: false };
        for (let i = 0; i < e.touches.length; i++) {
          const t = e.touches[i];
          const el = document.elementFromPoint(t.clientX, t.clientY)?.closest('.dpad-btn');
          if (el && el.dataset.dir) {
            hitProps[el.dataset.dir] = true;
          }
        }
        for (const db of dpadButtons) {
          const btnEl = document.getElementById(db.id);
          if (hitProps[db.prop]) {
            if (db.prop === 'up' && !this.touchInput.up) {
              this.touchInput.jumpJustPressed = true;
            }
            this.touchInput[db.prop] = true;
            if (btnEl) btnEl.classList.add('active');
          } else {
            this.touchInput[db.prop] = false;
            if (btnEl) btnEl.classList.remove('active');
          }
        }
      };
      dpadPad.addEventListener('touchmove', (e) => {
        e.preventDefault();
        updateDpadFromTouches(e);
      }, { passive: false });
    }
  }

  toggleEscModal(forceState = null) {
    const escModal = document.getElementById('esc-modal');
    if (!escModal) return;
    const shouldShow = forceState !== null ? forceState : escModal.classList.contains('hidden');
    if (shouldShow) {
      this.paused = true;
      window.retroAudio.setPterodactylLoop(false);
      escModal.classList.remove('hidden');
    } else {
      this.paused = false;
      escModal.classList.add('hidden');
    }
  }

  // =========================================================================
  // NIVEL 1: LA PLAYA (Ruta larga 8600px, pocos LuckyBlocks, Pterodáctilos)
  // =========================================================================
  buildLevel1Beach() {
    this.currentLevel = 1;
    this.worldWidth = 8600;
    this.peacefulBeachAfterBoss = false;
    this.hater = null;
    this.computerGoal = null;
    this.levelBannerText = '🌴 NIVEL 1: LA PLAYA — ¡LLEGA AL CASTILLO DE ARENA!';
    this.levelBannerTimer = 3.5;

    this.pits = [
      { x: 750, w: 140 },
      { x: 1550, w: 165 },
      { x: 2380, w: 175 },
      { x: 3220, w: 185 },
      { x: 4050, w: 190 },
      { x: 4880, w: 195 },
      { x: 5720, w: 200 },
      { x: 6540, w: 205 },
      { x: 7320, w: 190 },
      { x: 7920, w: 175 }
    ];

    this.blocks = [];
    const B_SIZE = 44;
    const addBlockRow = (startX, y, types, fixedItem = null) => {
      types.forEach((t, idx) => {
        this.blocks.push({
          id: `b1_${this.blocks.length}`,
          x: startX + idx * B_SIZE,
          y,
          w: B_SIZE,
          h: B_SIZE,
          type: t,
          used: false,
          unlimitedPower: false,
          fixedItem,
          bumpOffset: 0
        });
      });
    };

    addBlockRow(420, 310, ['platform', 'lucky', 'platform']); // LuckyBlock #1
    addBlockRow(735, 325, ['platform', 'platform', 'platform', 'platform']);

    addBlockRow(1200, 310, ['platform', 'platform', 'platform']);
    addBlockRow(1535, 325, ['platform', 'platform', 'platform', 'platform']);

    addBlockRow(2020, 310, ['platform', 'lucky', 'platform']); // LuckyBlock #2
    addBlockRow(2365, 320, ['platform', 'platform']);
    addBlockRow(2475, 260, ['platform', 'platform']);

    addBlockRow(2850, 310, ['platform', 'platform', 'platform']);
    addBlockRow(3205, 325, ['platform', 'platform', 'platform', 'platform']);

    addBlockRow(3680, 310, ['platform', 'platform', 'platform']);
    addBlockRow(4035, 325, ['platform', 'platform']);
    addBlockRow(4145, 260, ['platform', 'platform']);

    addBlockRow(4520, 310, ['platform', 'lucky', 'platform']); // LuckyBlock #3
    addBlockRow(4865, 325, ['platform', 'platform', 'platform', 'platform']);

    addBlockRow(5340, 310, ['platform', 'platform', 'platform']);
    addBlockRow(5705, 325, ['platform', 'platform']);
    addBlockRow(5815, 260, ['platform', 'platform']);

    addBlockRow(6180, 310, ['platform', 'lucky', 'platform']); // LuckyBlock #4
    addBlockRow(6525, 325, ['platform', 'platform', 'platform', 'platform']);

    addBlockRow(6960, 310, ['platform', 'platform', 'platform']);
    addBlockRow(7305, 325, ['platform', 'platform', 'platform', 'platform']);
    addBlockRow(7905, 325, ['platform', 'platform', 'platform', 'platform']);

    const peanutSpawns = [
      { x: 560, minX: 320, maxX: 720 },
      { x: 1080, minX: 910, maxX: 1520 },
      { x: 1360, minX: 910, maxX: 1520 },
      { x: 1890, minX: 1740, maxX: 2350 },
      { x: 2210, minX: 1740, maxX: 2350 },
      { x: 2740, minX: 2580, maxX: 3190 },
      { x: 3040, minX: 2580, maxX: 3190 },
      { x: 3580, minX: 3430, maxX: 4020 },
      { x: 3890, minX: 3430, maxX: 4020 },
      { x: 4420, minX: 4260, maxX: 4850 },
      { x: 4720, minX: 4260, maxX: 4850 },
      { x: 5260, minX: 5100, maxX: 5690 },
      { x: 5560, minX: 5100, maxX: 5690 },
      { x: 6120, minX: 5950, maxX: 6510 },
      { x: 6400, minX: 5950, maxX: 6510 },
      { x: 6920, minX: 6770, maxX: 7290 },
      { x: 7180, minX: 6770, maxX: 7290 },
      { x: 7680, minX: 7530, maxX: 7890 },
      { x: 8220, minX: 8115, maxX: 8340 }
    ];

    this.peanuts = peanutSpawns.map((s, idx) => ({
      id: `p1_${idx}`,
      x: s.x,
      y: GROUND_Y - 46,
      w: 46,
      h: 46,
      vx: idx % 2 === 0 ? -1.75 : 1.75,
      minX: s.minX,
      maxX: s.maxX,
      alive: true,
      squashTimer: 0,
      animTick: 0
    }));

    const pteroSpawns = [
      { x: 820, y: 185, minX: 620, maxX: 1120 },
      { x: 1680, y: 170, minX: 1420, maxX: 1980 },
      { x: 2520, y: 160, minX: 2250, maxX: 2820 },
      { x: 3380, y: 180, minX: 3100, maxX: 3680 },
      { x: 4220, y: 165, minX: 3950, maxX: 4520 },
      { x: 5050, y: 175, minX: 4780, maxX: 5360 },
      { x: 5920, y: 160, minX: 5620, maxX: 6220 },
      { x: 6760, y: 175, minX: 6460, maxX: 7050 },
      { x: 7580, y: 170, minX: 7280, maxX: 7880 }
    ];

    this.pteros = pteroSpawns.map((s, idx) => ({
      id: `pt1_${idx}`,
      x: s.x,
      baseY: s.y,
      y: s.y,
      w: 64,
      h: 40,
      vx: idx % 2 === 0 ? -2.3 : 2.3,
      minX: s.minX,
      maxX: s.maxX,
      alive: true,
      animTick: idx * 0.7
    }));

    this.items = [];
    this.projectiles = [];
    this.floatingTexts = [];
    this.particles = [];

    this.clouds = [];
    for (let x = 80; x < this.worldWidth; x += 290) {
      this.clouds.push({
        x,
        y: 45 + (x % 3) * 32,
        scale: 1 + (x % 2) * 0.35
      });
    }

    this.decorations = [];
    for (let x = 140; x < this.worldWidth - 350; x += 380) {
      if (!this.isOverPit(x, 40)) {
        this.decorations.push({
          x,
          type: (x / 380) % 2 === 0 ? 'palm' : 'umbrella'
        });
      }
    }
  }

  // =========================================================================
  // NIVEL 2: EL INFIERNO Y JEFE FINAL HATER (100/100 DE VIDA)
  // =========================================================================
  buildLevel2Hell() {
    this.currentLevel = 2;
    this.worldWidth = 7400;
    this.peacefulBeachAfterBoss = false;
    this.cameraX = 0;
    this.computerGoal = null;
    this.levelBannerText = '🔥 NIVEL 2: EL INFIERNO — ¡DERROTA AL JEFE FINAL HATER!';
    this.levelBannerTimer = 4.0;

    [this.p1, this.p2].forEach((p, idx) => {
      if (!p.permanentlyDead) {
        p.powerTimer = 0;
        p.infinitePower = false;
        p.isFlying = false;
        p.crouching = false;
        p.syncSizeForSuper();
        p.x = 110 + idx * 75;
        p.y = GROUND_Y - p.h;
        p.vx = 0;
        p.vy = 0;
        p.lastSafeX = p.x;
      }
    });

    this.pits = [
      { x: 680, w: 145 },
      { x: 1420, w: 170 },
      { x: 2220, w: 180 },
      { x: 3040, w: 190 },
      { x: 3860, w: 195 },
      { x: 4680, w: 185 }
    ];

    this.blocks = [];
    const B_SIZE = 44;
    const addBlockRow = (startX, y, types, unlimited = false, fixedItems = []) => {
      types.forEach((t, idx) => {
        this.blocks.push({
          id: `b2_${this.blocks.length}`,
          x: startX + idx * B_SIZE,
          y,
          w: B_SIZE,
          h: B_SIZE,
          type: t,
          used: false,
          unlimitedPower: unlimited,
          fixedItem: fixedItems[idx] || null,
          bumpOffset: 0
        });
      });
    };

    addBlockRow(665, 325, ['platform', 'platform', 'platform', 'platform']);
    addBlockRow(1405, 325, ['platform', 'platform', 'platform', 'platform']);
    addBlockRow(2205, 320, ['platform', 'platform']);
    addBlockRow(2315, 260, ['platform', 'platform']);
    addBlockRow(3025, 325, ['platform', 'platform', 'platform', 'platform']);
    addBlockRow(3845, 320, ['platform', 'platform']);
    addBlockRow(3955, 260, ['platform', 'platform']);
    addBlockRow(4665, 325, ['platform', 'platform', 'platform', 'platform']);

    // ÚNICOS 2 LUCKYBLOCKS ANTES DEL HATER (dan el poder correspondiente a J1 y J2 por TIEMPO ILIMITADO)
    const itemForP1 = this.p1.food;
    const itemForP2 = this.mode === 'single' ? this.p1.food : this.p2.food;
    addBlockRow(
      5420,
      305,
      ['platform', 'lucky', 'platform', 'lucky', 'platform'],
      true,
      [null, itemForP1, null, itemForP2, null]
    );

    const peanutSpawns = [
      { x: 490, minX: 280, maxX: 650 },
      { x: 1050, minX: 850, maxX: 1390 },
      { x: 1290, minX: 850, maxX: 1390 },
      { x: 1820, minX: 1620, maxX: 2190 },
      { x: 2080, minX: 1620, maxX: 2190 },
      { x: 2640, minX: 2430, maxX: 3010 },
      { x: 2890, minX: 2430, maxX: 3010 },
      { x: 3480, minX: 3260, maxX: 3830 },
      { x: 3720, minX: 3260, maxX: 3830 },
      { x: 4280, minX: 4080, maxX: 4650 },
      { x: 4540, minX: 4080, maxX: 4650 },
      { x: 5120, minX: 4900, maxX: 5380 }
    ];

    this.peanuts = peanutSpawns.map((s, idx) => ({
      id: `p2_${idx}`,
      x: s.x,
      y: GROUND_Y - 46,
      w: 46,
      h: 46,
      vx: idx % 2 === 0 ? -1.95 : 1.95,
      minX: s.minX,
      maxX: s.maxX,
      alive: true,
      squashTimer: 0,
      animTick: 0
    }));

    const pteroSpawns = [
      { x: 760, y: 180, minX: 540, maxX: 1080 },
      { x: 1580, y: 165, minX: 1320, maxX: 1920 },
      { x: 2420, y: 170, minX: 2140, maxX: 2740 },
      { x: 3260, y: 175, minX: 2980, maxX: 3560 },
      { x: 4100, y: 165, minX: 3820, maxX: 4420 },
      { x: 4920, y: 175, minX: 4620, maxX: 5220 }
    ];

    this.pteros = pteroSpawns.map((s, idx) => ({
      id: `pt2_${idx}`,
      x: s.x,
      baseY: s.y,
      y: s.y,
      w: 64,
      h: 40,
      vx: idx % 2 === 0 ? -2.5 : 2.5,
      minX: s.minX,
      maxX: s.maxX,
      alive: true,
      animTick: idx * 0.5
    }));

    this.items = [];
    this.projectiles = [];

    this.hater = {
      x: 6480,
      y: GROUND_Y - 126,
      w: 108,
      h: 126,
      vx: -2.4,
      vy: 0,
      minX: 5900,
      maxX: 6950,
      hp: 100,
      maxHp: 100,
      alive: true,
      explodingTimer: 0,
      explosionBoomTick: 0,
      disappeared: false,
      onGround: true,
      facingLeft: true,
      animState: 'idle',
      animFrame: 0,
      animTick: 0,
      hurtTimer: 0,
      jumpTimer: 2.2,
      crouchTimer: 0
    };
  }

  isOverPit(x, w = 10) {
    const cx = x + w * 0.5;
    return this.pits.some((pit) => cx > pit.x + 10 && cx < pit.x + pit.w - 10);
  }

  findNearestSafeGroundX(targetX) {
    let x = Math.max(80, Math.min(this.worldWidth - 300, targetX));
    for (const pit of this.pits) {
      if (x + 60 > pit.x && x < pit.x + pit.w + 20) {
        x = Math.max(80, pit.x - 85);
      }
    }
    return x;
  }

  startGame(mode, p1CharId = 'vaquito', p2CharId = 'burguer') {
    this.mode = mode;
    this.score = 0;
    this.cameraX = 0;
    this.gameOver = false;
    this.victory = false;
    this.paused = false;
    this.luckyToggle = false;

    this.p1.setCharacter(p1CharId);
    this.p2.setCharacter(p2CharId);
    this.p1.resetFull();
    this.p2.resetFull();

    if (mode === 'single') {
      this.p2.permanentlyDead = true;
      this.p2.hearts = 0;
    }

    this.toggleEscModal(false);
    this.buildLevel1Beach();
    this.running = true;
    window.retroAudio.startMusic();
    this.updateHUD();
  }

  addFloatingText(x, y, text, color = '#ffffff') {
    this.floatingTexts.push({
      x,
      y,
      text,
      color,
      life: 1.4
    });
  }

  spawnSandParticles(x, y, color = '#f5d782', count = 4) {
    for (let i = 0; i < count; i++) {
      this.particles.push({
        x,
        y,
        vx: (Math.random() - 0.5) * 5,
        vy: -Math.random() * 4.5 - 0.5,
        size: 4 + Math.floor(Math.random() * 5),
        color,
        life: 0.4 + Math.random() * 0.3
      });
    }
  }

  triggerLuckyBlock(block, triggeringPlayer) {
    if (block.used) return;
    block.used = true;
    block.bumpOffset = -10;
    window.retroAudio.luckyBlock();

    let itemType = block.fixedItem;
    if (!itemType) {
      if (this.mode === 'single' || this.p2.permanentlyDead) {
        itemType = this.p1.food;
      } else if (this.p1.permanentlyDead) {
        itemType = this.p2.food;
      } else {
        itemType = this.luckyToggle ? this.p2.food : this.p1.food;
        this.luckyToggle = !this.luckyToggle;
      }
    }

    this.items.push({
      id: `item_${Date.now()}_${Math.random()}`,
      type: itemType, // 'lettuce' | 'meat'
      unlimitedPower: !!block.unlimitedPower,
      x: block.x + 2,
      y: block.y - 44,
      w: 42,
      h: 42,
      vy: -4.5,
      vx: triggeringPlayer && triggeringPlayer.facingLeft ? -1.1 : 1.1,
      bobTick: 0,
      exclusiveHintCooldown: 0
    });

    const infText = block.unlimitedPower ? ' ¡TIEMPO ILIMITADO!' : '';
    const label =
      itemType === 'lettuce'
        ? `¡LECHUGA (Vaquito/Vaquita)${infText}!`
        : `¡CARNE (Burguer/Jack/Flex)${infText}!`;
    const col = itemType === 'lettuce' ? '#68ff70' : '#ff9468';
    this.addFloatingText(block.x + block.w / 2, block.y - 24, label, col);
  }

  fireCharacterSuperWeapon(player) {
    if (!player.isSuper || player.shootCooldown > 0) return;
    const dir = player.facingLeft ? -1 : 1;
    const wType = player.def.weaponType;

    if (wType === 'laser') {
      // Super Vaquito: Rayo verde por los ojos
      player.shootCooldown = 0.25;
      window.retroAudio.shootLaser();
      this.projectiles.push({
        kind: 'laser',
        x: player.facingLeft ? player.x - 20 : player.x + player.w - 4,
        y: player.y + (player.crouching ? 16 : 22),
        w: 36,
        h: 8,
        vx: dir * 14.0,
        vy: 0,
        bounces: 0,
        life: 1.4
      });
    } else if (wType === 'pellet') {
      // Super Burguer: Pelotitas verdes
      player.shootCooldown = 0.25;
      window.retroAudio.shootPellet();
      this.projectiles.push({
        kind: 'pellet',
        x: player.facingLeft ? player.x - 14 : player.x + player.w + 2,
        y: player.y + player.h * 0.48,
        w: 16,
        h: 16,
        vx: dir * 9.8,
        vy: -1.2,
        bounces: 0,
        life: 2.2
      });
    } else if (wType === 'katana') {
      // SuperJack: Lanza una Katana
      player.shootCooldown = 0.28;
      window.retroAudio.shootKatana();
      this.projectiles.push({
        kind: 'katana',
        x: player.facingLeft ? player.x - 32 : player.x + player.w,
        y: player.y + player.h * 0.42,
        w: 52,
        h: 16,
        vx: dir * 12.5,
        vy: 0,
        facingLeft: player.facingLeft,
        bounces: 0,
        life: 1.5
      });
    } else if (wType === 'witch_spell') {
      // SuperVaquita: Lanza un hechizo de bruja violeta
      player.shootCooldown = 0.27;
      window.retroAudio.shootWitchSpell();
      this.projectiles.push({
        kind: 'witch_spell',
        x: player.facingLeft ? player.x - 24 : player.x + player.w,
        y: player.y + player.h * 0.38,
        w: 34,
        h: 34,
        vx: dir * 10.5,
        vy: 0,
        waveTick: 0,
        bounces: 0,
        life: 1.8
      });
    } else if (wType === 'fireball') {
      // SuperFlex: Lanza una bola de fuego por la boca
      player.shootCooldown = 0.28;
      window.retroAudio.shootFireball();
      this.projectiles.push({
        kind: 'fireball',
        x: player.facingLeft ? player.x - 28 : player.x + player.w,
        y: player.y + player.h * 0.34,
        w: 36,
        h: 24,
        vx: dir * 11.5,
        vy: 0.4,
        facingLeft: player.facingLeft,
        bounces: 0,
        life: 1.7
      });
    }
  }

  getControlsForPlayer(player) {
    const k = this.keys;
    const jp = this.justPressed;
    const t = this.touchInput;

    // Tecla Q (J1) y Tecla 1 derecha del teclado (J2)
    const keyQ = !!k['KeyQ'] || !!jp['KeyQ'] || !!k['Tab'] || !!jp['Tab'];
    const key1 = !!k['Numpad1'] || !!jp['Numpad1'] || !!k['End'] || !!jp['End'] || !!k['Digit1'] || !!jp['Digit1'];

    if (this.mode === 'local') {
      if (player.slotIndex === 1) {
        return {
          left: !!k['KeyA'] || t.left,
          right: !!k['KeyD'] || t.right,
          up: !!k['KeyW'] || !!k['Space'] || t.up,
          down: !!k['KeyS'] || t.down,
          action: keyQ || t.action,
          jumpJustPressed: !!jp['KeyW'] || !!jp['Space'] || t.jumpJustPressed
        };
      } else {
        return {
          left: !!k['ArrowLeft'],
          right: !!k['ArrowRight'],
          up: !!k['ArrowUp'],
          down: !!k['ArrowDown'],
          action: key1,
          jumpJustPressed: !!jp['ArrowUp']
        };
      }
    }

    if (this.mode === 'online_host') {
      if (player.slotIndex === 1) {
        return {
          left: !!k['KeyA'] || !!k['ArrowLeft'] || t.left,
          right: !!k['KeyD'] || !!k['ArrowRight'] || t.right,
          up: !!k['KeyW'] || !!k['ArrowUp'] || !!k['Space'] || t.up,
          down: !!k['KeyS'] || !!k['ArrowDown'] || t.down,
          action: keyQ || key1 || t.action,
          jumpJustPressed: !!jp['KeyW'] || !!jp['ArrowUp'] || !!jp['Space'] || t.jumpJustPressed
        };
      } else {
        return this.remoteGuestInput;
      }
    }

    // Modo 1 Jugador: acepta tanto Q como 1 para lanzar el poder
    return {
      left: !!k['KeyA'] || !!k['ArrowLeft'] || t.left,
      right: !!k['KeyD'] || !!k['ArrowRight'] || t.right,
      up: !!k['KeyW'] || !!k['ArrowUp'] || !!k['Space'] || t.up,
      down: !!k['KeyS'] || !!k['ArrowDown'] || t.down,
      action: keyQ || key1 || t.action,
      jumpJustPressed: !!jp['KeyW'] || !!jp['ArrowUp'] || !!jp['Space'] || t.jumpJustPressed
    };
  }

  captureLocalGuestInput() {
    const k = this.keys;
    const jp = this.justPressed;
    const t = this.touchInput;
    const keyQ = !!k['KeyQ'] || !!jp['KeyQ'] || !!k['Tab'] || !!jp['Tab'];
    const key1 = !!k['Numpad1'] || !!jp['Numpad1'] || !!k['End'] || !!jp['End'] || !!k['Digit1'] || !!jp['Digit1'];
    return {
      left: !!k['KeyA'] || !!k['ArrowLeft'] || t.left,
      right: !!k['KeyD'] || !!k['ArrowRight'] || t.right,
      up: !!k['KeyW'] || !!k['ArrowUp'] || !!k['Space'] || t.up,
      down: !!k['KeyS'] || !!k['ArrowDown'] || t.down,
      action: keyQ || key1 || t.action,
      jumpJustPressed: !!jp['KeyW'] || !!jp['ArrowUp'] || !!jp['Space'] || t.jumpJustPressed
    };
  }

  updatePlayerPhysics(player, dt) {
    if (player.permanentlyDead) return;
    if (player.underBlockHintCooldown > 0) player.underBlockHintCooldown -= dt;

    if (player.dyingAnimTimer > 0) {
      player.dyingAnimTimer -= dt;
      player.vy += GRAVITY * 0.85;
      player.y += player.vy;
      player.animState = 'hit';
      player.animFrame = 1;
      if (player.dyingAnimTimer <= 0) {
        if (player.hearts <= 0) {
          player.permanentlyDead = true;
          this.checkGameOverState();
        } else {
          player.respawnTimer = 1.1;
        }
      }
      return;
    }

    if (player.respawnTimer > 0) {
      player.respawnTimer -= dt;
      if (player.respawnTimer <= 0) {
        player.completeRespawn(this);
      }
      return;
    }

    if (player.invulnTimer > 0) player.invulnTimer = Math.max(0, player.invulnTimer - dt);
    if (player.hurtAnimTimer > 0) player.hurtAnimTimer = Math.max(0, player.hurtAnimTimer - dt);
    if (player.shootCooldown > 0) player.shootCooldown = Math.max(0, player.shootCooldown - dt);

    if (!player.infinitePower && player.powerTimer > 0) {
      player.powerTimer -= dt;
      if (player.powerTimer <= 0) {
        player.powerTimer = 0;
        player.isFlying = false;
        player.syncSizeForSuper();
        window.retroAudio.powerDown();
        this.addFloatingText(player.x + player.w / 2, player.y - 10, 'FIN DEL PODER (15s)', '#ffe066');
      }
    }

    player.syncSizeForSuper();
    const ctrl = this.getControlsForPlayer(player);

    // Agacharse
    const wantsCrouch = ctrl.down && player.onGround;
    if (wantsCrouch && !player.crouching) {
      player.crouching = true;
      player.syncSizeForSuper();
      window.retroAudio.crouch();
    } else if (!wantsCrouch && player.crouching) {
      player.crouching = false;
      player.syncSizeForSuper();
    }

    const maxSpeed = player.crouching ? 2.2 : player.isSuper ? 5.2 : 4.4;
    if (ctrl.left) {
      player.vx = -maxSpeed;
      player.facingLeft = true;
    } else if (ctrl.right) {
      player.vx = maxSpeed;
      player.facingLeft = false;
    } else {
      player.vx *= 0.76;
      if (Math.abs(player.vx) < 0.1) player.vx = 0;
    }

    if (player.def.moveWithTorso && Math.abs(player.vx) > 0.2 && player.onGround) {
      player.torsoWave += dt * 16;
      if (Math.random() < 0.25) {
        this.spawnSandParticles(
          player.facingLeft ? player.x + player.w - 6 : player.x + 6,
          player.y + player.h,
          this.currentLevel === 2 && !this.peacefulBeachAfterBoss ? '#ff5500' : '#e8c166',
          1
        );
      }
    } else {
      player.torsoWave = 0;
    }

    // Salto y Vuelo (Super Vaquito vuela hasta 5s)
    if (ctrl.jumpJustPressed && player.onGround) {
      player.vy = JUMP_FORCE;
      player.onGround = false;
      window.retroAudio.jump();
    } else if (
      player.def.canFly &&
      player.isSuper &&
      !player.onGround &&
      ctrl.up &&
      player.flyFuel > 0
    ) {
      player.isFlying = true;
      player.flyFuel = Math.max(0, player.flyFuel - dt);
      player.vy = Math.max(-5.2, player.vy - 1.2);
      if (Math.random() < 0.35) {
        this.spawnSandParticles(player.x + player.w / 2, player.y + player.h - 4, '#66ff66', 1);
      }
      if (Math.floor((player.flyFuel + dt) * 6) !== Math.floor(player.flyFuel * 6)) {
        window.retroAudio.flyBoost();
      }
    } else {
      player.isFlying = false;
    }

    // Disparar arma del Modo Super con Q o 1
    if (player.isSuper && ctrl.action) {
      this.fireCharacterSuperWeapon(player);
    }

    // Movimiento horizontal y colisión con bloques
    const prevX = player.x;
    player.x += player.vx;
    player.x = Math.max(16, Math.min(this.worldWidth - player.w - 16, player.x));

    for (const b of this.blocks) {
      // Cuando los jugadores se convierten en Super NO pueden pasar por debajo de los bloques
      const blockEffectiveH = player.isSuper && !this.isOverPit(b.x, b.w) ? GROUND_Y - b.y : b.h;

      if (this.rectsOverlap(player.x, player.y, player.w, player.h, b.x, b.y, b.w, blockEffectiveH)) {
        const wasAlreadyUnder = this.rectsOverlap(prevX, player.y, player.w, player.h, b.x, b.y + b.h, b.w, GROUND_Y - (b.y + b.h));
        if (!wasAlreadyUnder) {
          if (player.vx > 0) {
            player.x = b.x - player.w;
            player.vx = 0;
          } else if (player.vx < 0) {
            player.x = b.x + b.w;
            player.vx = 0;
          }
          if (player.isSuper && player.y >= b.y + b.h - 4 && player.underBlockHintCooldown <= 0) {
            player.underBlockHintCooldown = 1.4;
            this.addFloatingText(player.x + player.w / 2, player.y - 12, '¡MODO SUPER: SALTA POR ARRIBA DEL BLOQUE!', '#ffe066');
          }
        }
        if (b.type === 'lucky' && !b.used && this.rectsOverlap(player.x, player.y, player.w, player.h, b.x, b.y, b.w, b.h)) {
          this.triggerLuckyBlock(b, player);
        }
      }
    }

    // Gravedad y colisión vertical
    player.vy += GRAVITY;
    if (player.vy > 13.5) player.vy = 13.5;
    player.y += player.vy;
    player.onGround = false;

    for (const b of this.blocks) {
      if (this.rectsOverlap(player.x, player.y, player.w, player.h, b.x, b.y, b.w, b.h)) {
        if (player.vy > 0 && player.y + player.h - player.vy <= b.y + 16) {
          player.y = b.y - player.h;
          player.vy = 0;
          player.onGround = true;
          if (b.type === 'lucky' && !b.used) {
            this.triggerLuckyBlock(b, player);
          }
        } else if (player.vy < 0 && player.y - player.vy >= b.y + b.h - 16) {
          player.y = b.y + b.h;
          player.vy = 1.5;
          if (b.type === 'lucky' && !b.used) {
            this.triggerLuckyBlock(b, player);
          }
        }
      }
    }

    const overPit = this.isOverPit(player.x, player.w);
    if (!overPit && player.y + player.h >= GROUND_Y && player.y + player.h - player.vy <= GROUND_Y + 18) {
      player.y = GROUND_Y - player.h;
      player.vy = 0;
      player.onGround = true;
      player.lastSafeX = player.x;
    }

    if (player.onGround && player.def.canFly) {
      player.flyFuel = VAQUITO_FLY_MAX_SEC;
      player.isFlying = false;
    }

    if (player.y > this.canvas.height + 30) {
      player.triggerDeathAndRespawn(this, true);
      return;
    }

    if (this.currentLevel === 1 && player.x >= this.worldWidth - 235) {
      window.retroAudio.luckyBlock();
      this.buildLevel2Hell();
      return;
    }

    if (
      this.currentLevel === 2 &&
      this.peacefulBeachAfterBoss &&
      this.computerGoal &&
      this.rectsOverlap(
        player.x,
        player.y,
        player.w,
        player.h,
        this.computerGoal.x,
        this.computerGoal.y,
        this.computerGoal.w,
        this.computerGoal.h
      ) &&
      !this.victory
    ) {
      this.victory = true;
      window.retroAudio.stopMusic();
      window.retroAudio.victory();
      this.showEndModal(true);
    }

    player.animTick += dt;
    if (player.hurtAnimTimer > 0) {
      player.animState = 'hit';
      player.animFrame = 0;
    } else if (player.crouching) {
      player.animState = 'crouch';
      player.animFrame = Math.floor(player.animTick * 4) % 2;
    } else if (!player.onGround) {
      if (player.vy < 0 || player.isFlying) {
        player.animState = 'jump';
        player.animFrame = Math.floor(player.animTick * 8) % 2;
      } else {
        player.animState = 'fall';
        player.animFrame = Math.floor(player.animTick * 6) % 2;
      }
    } else if (Math.abs(player.vx) > 0.25) {
      player.animState = 'walk';
      player.animFrame = Math.floor(player.animTick * 10) % 3;
    } else {
      player.animState = 'idle';
      player.animFrame = Math.floor(player.animTick * 3.5) % 3;
    }
  }

  damageHater(amount, sourceLabel) {
    const h = this.hater;
    if (!h || !h.alive || h.explodingTimer > 0) return;

    h.hp = Math.max(0, h.hp - amount);
    h.hurtTimer = 0.35;
    window.retroAudio.bossHit();
    this.spawnSandParticles(h.x + h.w / 2, h.y + h.h / 2, '#ff3838', 8);
    this.addFloatingText(h.x + h.w / 2, h.y - 18, `${sourceLabel} (-${amount}) [HATER: ${h.hp}/100]`, '#ffdf4f');

    if (h.hp <= 0) {
      h.hp = 0;
      h.alive = false;
      h.explodingTimer = 3.6;
      h.explosionBoomTick = 0;
      this.peanuts.forEach((p) => (p.alive = false));
      this.pteros.forEach((pt) => (pt.alive = false));
      window.retroAudio.setPterodactylLoop(false);
      window.retroAudio.bossExplosionBoom();
      this.addFloatingText(h.x + h.w / 2, h.y - 35, '💥 ¡HATER DERROTADO! ¡EXPLOTANDO! 💥', '#ff3838');
    }
  }

  updateHaterBoss(dt, activePlayers) {
    const h = this.hater;
    if (!h || h.disappeared) return;

    if (h.explodingTimer > 0) {
      h.explodingTimer -= dt;
      h.explosionBoomTick += dt;
      h.animState = 'hit';
      h.animFrame = 1;

      if (h.explosionBoomTick >= 0.26) {
        h.explosionBoomTick = 0;
        window.retroAudio.bossExplosionBoom();
        const ex = h.x + Math.random() * h.w;
        const ey = h.y + Math.random() * h.h;
        this.spawnSandParticles(ex, ey, '#ff3818', 12);
        this.spawnSandParticles(ex, ey, '#ffea4f', 10);
        this.spawnSandParticles(ex, ey, '#ffffff', 6);
      }

      if (h.explodingTimer <= 0) {
        h.disappeared = true;
        this.peacefulBeachAfterBoss = true;
        this.pits = [];
        this.score += 2000;
        window.retroAudio.powerUpTransform();
        for (let i = 0; i < 45; i++) {
          this.spawnSandParticles(h.x + h.w / 2, h.y + h.h / 2, i % 2 === 0 ? '#ffea4f' : '#ff3838', 2);
        }
        this.computerGoal = {
          x: Math.min(this.worldWidth - 260, Math.max(6650, h.x + 120)),
          y: GROUND_Y - 72,
          w: 72,
          h: 72
        };
        this.levelBannerText = '🏖️ ¡EL INFIERNO TERMINÓ! TOCA LA COMPUTADORA PARA GANAR 💻';
        this.levelBannerTimer = 5.0;
      }
      return;
    }

    if (!h.alive) return;

    h.animTick += dt;
    if (h.hurtTimer > 0) h.hurtTimer -= dt;
    if (h.crouchTimer > 0) h.crouchTimer -= dt;

    const targetPlayer = activePlayers[0];
    if (targetPlayer && Math.abs(targetPlayer.x - h.x) < 680) {
      const speed = h.hp < 50 ? 3.3 : 2.5;
      if (targetPlayer.x < h.x - 20) {
        h.vx = -speed;
        h.facingLeft = true;
      } else if (targetPlayer.x > h.x + 20) {
        h.vx = speed;
        h.facingLeft = false;
      }
    }

    h.jumpTimer -= dt;
    if (h.jumpTimer <= 0 && h.onGround) {
      h.crouchTimer = 0.25;
      h.vy = -13.2;
      h.onGround = false;
      h.jumpTimer = h.hp < 50 ? 1.8 : 2.6;
    }

    h.x += h.vx;
    if (h.x < h.minX) {
      h.x = h.minX;
      h.vx = Math.abs(h.vx);
      h.facingLeft = false;
    } else if (h.x + h.w > h.maxX) {
      h.x = h.maxX - h.w;
      h.vx = -Math.abs(h.vx);
      h.facingLeft = true;
    }

    h.vy += GRAVITY;
    h.y += h.vy;
    if (h.y + h.h >= GROUND_Y) {
      h.y = GROUND_Y - h.h;
      h.vy = 0;
      h.onGround = true;
    }

    if (h.hurtTimer > 0) {
      h.animState = 'hit';
      h.animFrame = 0;
    } else if (h.crouchTimer > 0) {
      h.animState = 'crouch';
      h.animFrame = Math.floor(h.animTick * 6) % 2;
    } else if (!h.onGround) {
      h.animState = h.vy < 0 ? 'jump' : 'fall';
      h.animFrame = Math.floor(h.animTick * 6) % 2;
    } else if (Math.abs(h.vx) > 0.2) {
      h.animState = 'walk';
      h.animFrame = Math.floor(h.animTick * 8) % 3;
    } else {
      h.animState = 'idle';
      h.animFrame = Math.floor(h.animTick * 4) % 3;
    }

    for (const p of activePlayers) {
      if (this.rectsOverlap(p.x + 6, p.y + 4, p.w - 12, p.h - 4, h.x + 10, h.y + 8, h.w - 20, h.h - 8)) {
        const playerBottomPrev = p.y + p.h - p.vy;
        const isStomping = p.vy > 0 && playerBottomPrev <= h.y + 38;
        if (isStomping) {
          p.vy = -13.5;
          p.x += p.facingLeft ? -25 : 25;
          this.score += 200;
          this.damageHater(10, '¡PISOTÓN!');
        } else {
          p.takeEnemyHit(this);
        }
      }
    }
  }

  rectsOverlap(ax, ay, aw, ah, bx, by, bw, bh) {
    return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
  }

  checkGameOverState() {
    if (this.p1.permanentlyDead && this.p2.permanentlyDead && !this.gameOver) {
      this.gameOver = true;
      window.retroAudio.stopMusic();
      this.showEndModal(false);
    }
  }

  updateWorld(dt) {
    if (this.levelBannerTimer > 0) {
      this.levelBannerTimer = Math.max(0, this.levelBannerTimer - dt);
    }

    const activePlayers = [this.p1, this.p2].filter(
      (p) => !p.permanentlyDead && p.respawnTimer <= 0 && p.dyingAnimTimer <= 0
    );

    for (const b of this.blocks) {
      if (b.bumpOffset < 0) {
        b.bumpOffset = Math.min(0, b.bumpOffset + dt * 60);
      }
    }

    // Objetos de LuckyBlocks (Lechuga: solo Vaquito y Vaquita; Carne: solo Burguer, Jack y Flex)
    for (let i = this.items.length - 1; i >= 0; i--) {
      const it = this.items[i];
      it.bobTick += dt * 5;
      if (it.exclusiveHintCooldown > 0) it.exclusiveHintCooldown -= dt;

      it.vy += GRAVITY * 0.65;
      it.x += it.vx;
      it.y += it.vy;

      for (const b of this.blocks) {
        if (this.rectsOverlap(it.x, it.y, it.w, it.h, b.x, b.y, b.w, b.h)) {
          if (it.vy > 0) {
            it.y = b.y - it.h;
            it.vy = 0;
          }
        }
      }

      if (!this.isOverPit(it.x, it.w) && it.y + it.h >= GROUND_Y) {
        it.y = GROUND_Y - it.h;
        it.vy = 0;
        it.vx *= 0.9;
      }

      for (const p of activePlayers) {
        if (this.rectsOverlap(p.x, p.y, p.w, p.h, it.x, it.y, it.w, it.h)) {
          if (it.type === p.food) {
            p.activatePower(it.unlimitedPower);
            this.score += 250;
            const keyHint = p.slotIndex === 1 ? '[Q]' : '[TECLA 1]';
            const txt = `¡${p.def.superName}! ${p.def.weaponLabel.toUpperCase()} ${keyHint}`;
            this.addFloatingText(p.x + p.w / 2, p.y - 16, txt, '#58ff6e');
            this.items.splice(i, 1);
            break;
          } else if (it.exclusiveHintCooldown <= 0) {
            it.exclusiveHintCooldown = 1.2;
            const msg =
              it.type === 'lettuce'
                ? '¡Lechuga: Solo para Vaquito o Vaquita!'
                : '¡Carne: Solo para Burguer, Jack o Flex!';
            this.addFloatingText(it.x + it.w / 2, it.y - 10, msg, '#ffdf6b');
          }
        }
      }
    }

    // Actualizar todos los proyectiles (Rayo Verde, Pelotitas, Katana, Hechizo Violeta, Bola de Fuego)
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const pr = this.projectiles[i];
      pr.x += pr.vx;
      pr.y += pr.vy;
      pr.life -= dt;

      if (pr.kind === 'pellet') {
        pr.vy += GRAVITY * 0.42;
        if (!this.isOverPit(pr.x, 8) && pr.y + pr.h >= GROUND_Y) {
          pr.y = GROUND_Y - pr.h;
          pr.vy = -5.4;
          pr.bounces++;
        }
        for (const b of this.blocks) {
          if (this.rectsOverlap(pr.x, pr.y, pr.w, pr.h, b.x, b.y, b.w, b.h)) {
            pr.vy = -5;
            pr.bounces++;
          }
        }
      } else if (pr.kind === 'witch_spell') {
        pr.waveTick = (pr.waveTick || 0) + dt * 14;
        pr.y += Math.sin(pr.waveTick) * 2.2;
      }

      let hitEnemy = false;
      for (const peanut of this.peanuts) {
        if (peanut.alive && this.rectsOverlap(pr.x, pr.y, pr.w, pr.h, peanut.x, peanut.y, peanut.w, peanut.h)) {
          peanut.alive = false;
          peanut.squashTimer = 0.65;
          hitEnemy = true;
          this.score += 150;
          window.retroAudio.stompPeanut();
          this.spawnSandParticles(peanut.x + peanut.w / 2, peanut.y + peanut.h / 2, '#58ff6e', 9);
          this.addFloatingText(peanut.x + peanut.w / 2, peanut.y - 10, '¡ELIMINADO! +150', '#58ff6e');
          break;
        }
      }

      if (!hitEnemy) {
        for (const pt of this.pteros) {
          if (pt.alive && this.rectsOverlap(pr.x, pr.y, pr.w, pr.h, pt.x, pt.y, pt.w, pt.h)) {
            pt.alive = false;
            hitEnemy = true;
            this.score += 200;
            window.retroAudio.stompPeanut();
            this.spawnSandParticles(pt.x + pt.w / 2, pt.y + pt.h / 2, '#58ff6e', 10);
            this.addFloatingText(pt.x + pt.w / 2, pt.y - 10, '¡PTERODÁCTILO DERRIBADO! +200', '#58ff6e');
            break;
          }
        }
      }

      if (
        !hitEnemy &&
        this.hater &&
        this.hater.alive &&
        this.rectsOverlap(pr.x, pr.y, pr.w, pr.h, this.hater.x, this.hater.y, this.hater.w, this.hater.h)
      ) {
        hitEnemy = true;
        const labels = {
          laser: '⚡ RAYO VERDE',
          pellet: '🟢 PELOTITA',
          katana: '🗡️ KATANA',
          witch_spell: '🔮 HECHIZO VIOLETA',
          fireball: '🔥 BOLA DE FUEGO'
        };
        this.damageHater(5, labels[pr.kind] || '¡IMPACTO!');
      }

      if (hitEnemy || pr.life <= 0 || pr.bounces > 5) {
        this.projectiles.splice(i, 1);
      }
    }

    // Cacahuates Malvados
    for (const peanut of this.peanuts) {
      if (!peanut.alive) {
        if (peanut.squashTimer > 0) peanut.squashTimer -= dt;
        continue;
      }

      peanut.animTick += dt;
      peanut.x += peanut.vx;
      if (peanut.x <= peanut.minX) {
        peanut.x = peanut.minX;
        peanut.vx = Math.abs(peanut.vx);
      } else if (peanut.x + peanut.w >= peanut.maxX) {
        peanut.x = peanut.maxX - peanut.w;
        peanut.vx = -Math.abs(peanut.vx);
      }

      for (const p of activePlayers) {
        if (this.rectsOverlap(p.x + 6, p.y + 4, p.w - 12, p.h - 4, peanut.x + 4, peanut.y + 4, peanut.w - 8, peanut.h - 4)) {
          const playerBottomPrev = p.y + p.h - p.vy;
          const isStomping = p.vy > 0 && playerBottomPrev <= peanut.y + peanut.h * 0.55;

          if (isStomping) {
            peanut.alive = false;
            peanut.squashTimer = 0.65;
            p.vy = -11.5;
            this.score += 100;
            window.retroAudio.stompPeanut();
            this.spawnSandParticles(peanut.x + peanut.w / 2, peanut.y + peanut.h, '#d99b52', 7);
            this.addFloatingText(peanut.x + peanut.w / 2, peanut.y - 8, '¡APLASTADO! +100', '#ffe066');
            break;
          } else {
            p.takeEnemyHit(this);
          }
        }
      }
    }

    // Pterodáctilos Voladores + Grito en bucle cuando están visibles
    let anyPteroVisible = false;
    for (const pt of this.pteros) {
      if (!pt.alive) continue;

      pt.animTick += dt;
      pt.x += pt.vx;
      pt.y = pt.baseY + Math.sin(pt.animTick * 3.5) * 24;

      if (pt.x <= pt.minX) {
        pt.x = pt.minX;
        pt.vx = Math.abs(pt.vx);
      } else if (pt.x + pt.w >= pt.maxX) {
        pt.x = pt.maxX - pt.w;
        pt.vx = -Math.abs(pt.vx);
      }

      if (pt.x + pt.w >= this.cameraX && pt.x <= this.cameraX + this.canvas.width) {
        anyPteroVisible = true;
      }

      for (const p of activePlayers) {
        if (this.rectsOverlap(p.x + 6, p.y + 4, p.w - 12, p.h - 4, pt.x + 6, pt.y + 6, pt.w - 12, pt.h - 10)) {
          const playerBottomPrev = p.y + p.h - p.vy;
          const isStomping = p.vy > 0 && playerBottomPrev <= pt.y + pt.h * 0.55;
          if (isStomping) {
            pt.alive = false;
            p.vy = -11.5;
            this.score += 150;
            window.retroAudio.stompPeanut();
            this.spawnSandParticles(pt.x + pt.w / 2, pt.y + pt.h / 2, '#cf7d4a', 8);
            this.addFloatingText(pt.x + pt.w / 2, pt.y - 8, '¡PTERODÁCTILO APLASTADO! +150', '#ffe066');
            break;
          } else {
            p.takeEnemyHit(this);
          }
        }
      }
    }

    window.retroAudio.setPterodactylLoop(anyPteroVisible);

    if (this.currentLevel === 2 && this.hater) {
      this.updateHaterBoss(dt, activePlayers);
    }

    if (activePlayers.length > 0) {
      let targetX;
      if (activePlayers.length === 2) {
        const avgX = (activePlayers[0].x + activePlayers[1].x) * 0.5;
        targetX = avgX - this.canvas.width * 0.4;
      } else {
        targetX = activePlayers[0].x - this.canvas.width * 0.35;
      }
      targetX = Math.max(0, Math.min(this.worldWidth - this.canvas.width, targetX));
      this.cameraX += (targetX - this.cameraX) * 0.12;
    }

    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      this.floatingTexts[i].y -= 35 * dt;
      this.floatingTexts[i].life -= dt;
      if (this.floatingTexts[i].life <= 0) this.floatingTexts.splice(i, 1);
    }

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const pt = this.particles[i];
      pt.x += pt.vx;
      pt.y += pt.vy;
      pt.vy += 0.2;
      pt.life -= dt;
      if (pt.life <= 0) this.particles.splice(i, 1);
    }
  }

  serializeStateForGuest() {
    const packPlayer = (p) => ({
      charId: p.charId,
      x: Math.round(p.x),
      y: Math.round(p.y),
      w: p.w,
      h: p.h,
      vx: +p.vx.toFixed(2),
      vy: +p.vy.toFixed(2),
      hearts: p.hearts,
      hitsTaken: p.hitsTaken,
      permanentlyDead: p.permanentlyDead,
      respawnTimer: +p.respawnTimer.toFixed(2),
      dyingAnimTimer: +p.dyingAnimTimer.toFixed(2),
      crouching: p.crouching,
      facingLeft: p.facingLeft,
      powerTimer: +p.powerTimer.toFixed(2),
      infinitePower: p.infinitePower,
      flyFuel: +p.flyFuel.toFixed(2),
      isFlying: p.isFlying,
      invulnTimer: +p.invulnTimer.toFixed(2),
      animState: p.animState,
      animFrame: p.animFrame,
      torsoWave: +p.torsoWave.toFixed(2)
    });

    return {
      type: 'STATE_SYNC',
      currentLevel: this.currentLevel,
      peacefulBeachAfterBoss: this.peacefulBeachAfterBoss,
      score: this.score,
      gameOver: this.gameOver,
      victory: this.victory,
      p1: packPlayer(this.p1),
      p2: packPlayer(this.p2),
      blocks: this.blocks.filter((b) => b.type === 'lucky').map((b) => ({ id: b.id, used: b.used })),
      peanuts: this.peanuts.map((p) => ({
        x: Math.round(p.x),
        alive: p.alive,
        squashTimer: +p.squashTimer.toFixed(2),
        animTick: +p.animTick.toFixed(2)
      })),
      pteros: this.pteros.map((pt) => ({
        x: Math.round(pt.x),
        y: Math.round(pt.y),
        vx: pt.vx,
        alive: pt.alive,
        animTick: +pt.animTick.toFixed(2)
      })),
      hater: this.hater ? { ...this.hater } : null,
      computerGoal: this.computerGoal,
      items: this.items.map((it) => ({
        type: it.type,
        x: Math.round(it.x),
        y: Math.round(it.y),
        bobTick: +it.bobTick.toFixed(2)
      })),
      projectiles: this.projectiles.map((pr) => ({
        kind: pr.kind,
        x: Math.round(pr.x),
        y: Math.round(pr.y),
        w: pr.w,
        h: pr.h,
        facingLeft: pr.facingLeft
      }))
    };
  }

  applyStateFromHost(state) {
    if (state.currentLevel && state.currentLevel !== this.currentLevel) {
      if (state.currentLevel === 2) this.buildLevel2Hell();
      else this.buildLevel1Beach();
    }
    this.peacefulBeachAfterBoss = !!state.peacefulBeachAfterBoss;
    this.score = state.score;
    if (state.p1) {
      if (state.p1.charId && state.p1.charId !== this.p1.charId) this.p1.setCharacter(state.p1.charId);
      Object.assign(this.p1, state.p1);
    }
    if (state.p2) {
      if (state.p2.charId && state.p2.charId !== this.p2.charId) this.p2.setCharacter(state.p2.charId);
      Object.assign(this.p2, state.p2);
    }

    if (state.blocks) {
      const usedMap = new Map(state.blocks.map((b) => [b.id, b.used]));
      for (const b of this.blocks) {
        if (usedMap.has(b.id)) b.used = usedMap.get(b.id);
      }
    }
    if (state.peanuts && state.peanuts.length === this.peanuts.length) {
      state.peanuts.forEach((sp, idx) => Object.assign(this.peanuts[idx], sp));
    }
    if (state.pteros && state.pteros.length === this.pteros.length) {
      state.pteros.forEach((spt, idx) => Object.assign(this.pteros[idx], spt));
    }
    if (state.hater) this.hater = state.hater;
    if (state.computerGoal) this.computerGoal = state.computerGoal;
    if (state.items) this.items = state.items.map((it) => ({ ...it, w: 42, h: 42 }));
    if (state.projectiles) this.projectiles = state.projectiles;

    if (state.victory && !this.victory) {
      this.victory = true;
      window.retroAudio.stopMusic();
      window.retroAudio.victory();
      this.showEndModal(true);
    } else if (state.gameOver && !this.gameOver) {
      this.gameOver = true;
      window.retroAudio.stopMusic();
      this.showEndModal(false);
    }

    const active = [this.p2, this.p1].find((p) => !p.permanentlyDead);
    if (active) {
      const targetX = Math.max(0, Math.min(this.worldWidth - this.canvas.width, active.x - this.canvas.width * 0.38));
      this.cameraX += (targetX - this.cameraX) * 0.2;
    }
  }

  step(dt) {
    this.worldTime += dt;
    if (!this.running || this.paused || this.gameOver || this.victory) {
      this.justPressed = {};
      this.touchInput.jumpJustPressed = false;
      return;
    }

    if (this.mode === 'online_guest') {
      const input = this.captureLocalGuestInput();
      window.networkManager.send({ type: 'GUEST_INPUT', input });
    } else {
      this.updatePlayerPhysics(this.p1, dt);
      this.updatePlayerPhysics(this.p2, dt);
      this.updateWorld(dt);

      if (this.mode === 'online_host') {
        window.networkManager.send(this.serializeStateForGuest());
      }
    }

    this.justPressed = {};
    this.touchInput.jumpJustPressed = false;
    this.remoteGuestInput.jumpJustPressed = false;
    this.updateHUD();
  }

  updateHUD() {
    const renderPlayerCard = (player, prefix) => {
      const nameEl = document.getElementById(`${prefix}-name`);
      const hintEl = document.getElementById(`${prefix}-key-hint`);
      const heartsEl = document.getElementById(`${prefix}-hearts`);
      const hitsBarEl = document.getElementById(`${prefix}-hits-fill`);
      const hitsTextEl = document.getElementById(`${prefix}-hits-text`);
      const statusBadgeEl = document.getElementById(`${prefix}-power-badge`);
      const extraBarWrap = document.getElementById(`${prefix}-extra-wrap`);
      const extraBarFill = document.getElementById(`${prefix}-extra-fill`);
      const extraBarLabel = document.getElementById(`${prefix}-extra-label`);

      if (nameEl) {
        nameEl.textContent = `${player.def.icon} ${player.name.toUpperCase()} (J${player.slotIndex})`;
      }
      if (hintEl) {
        const keyStr = player.slotIndex === 1 ? 'Q' : '1 (derecha)';
        const foodStr = player.food === 'lettuce' ? '🥬 Lechuga' : '🥩 Carne';
        hintEl.innerHTML = `${foodStr} → Poder <strong>${player.def.weaponLabel}</strong>: Tecla <kbd>${keyStr}</kbd>`;
      }

      if (heartsEl) {
        let hStr = '';
        for (let i = 0; i < 3; i++) {
          hStr += i < player.hearts ? '❤️' : '🖤';
        }
        heartsEl.textContent = hStr;
      }

      const healthRemaining = Math.max(0, MAX_HITS_PER_HEART - player.hitsTaken);
      const pct = (healthRemaining / MAX_HITS_PER_HEART) * 100;
      if (hitsBarEl) {
        hitsBarEl.style.width = `${pct}%`;
        hitsBarEl.style.background = pct > 50 ? '#44e85b' : pct > 25 ? '#ffc42e' : '#ff3838';
      }
      if (hitsTextEl) {
        if (player.permanentlyDead) {
          hitsTextEl.textContent = 'ELIMINADO (0 ❤️)';
        } else {
          hitsTextEl.textContent = `Resistencia: ${healthRemaining}/${MAX_HITS_PER_HEART} golpes`;
        }
      }

      if (statusBadgeEl) {
        if (player.permanentlyDead) {
          statusBadgeEl.textContent = 'SIN VIDAS';
          statusBadgeEl.className = 'hud-badge badge-dead';
        } else if (player.isSuper) {
          const secs = player.infinitePower ? '∞' : `${Math.ceil(player.powerTimer)}s`;
          statusBadgeEl.textContent = `${player.def.superName} (${secs})`;
          statusBadgeEl.className = 'hud-badge badge-super';
        } else {
          statusBadgeEl.textContent = 'NORMAL';
          statusBadgeEl.className = 'hud-badge badge-normal';
        }
      }

      if (extraBarWrap && extraBarFill && extraBarLabel) {
        if (player.isSuper) {
          extraBarWrap.style.display = 'flex';
          const keyStr = player.slotIndex === 1 ? '[Q]' : '[TECLA 1]';
          if (player.def.canFly) {
            const flyPct = (player.flyFuel / VAQUITO_FLY_MAX_SEC) * 100;
            extraBarFill.style.width = `${flyPct}%`;
            extraBarLabel.textContent = `Vuelo: ${player.flyFuel.toFixed(1)}s/5s | ${player.def.weaponLabel}: ${keyStr}`;
          } else {
            const powPct = player.infinitePower ? 100 : (player.powerTimer / POWER_DURATION_SEC) * 100;
            extraBarFill.style.width = `${powPct}%`;
            const tLabel = player.infinitePower ? '∞' : `${Math.ceil(player.powerTimer)}s`;
            extraBarLabel.textContent = `${player.def.weaponLabel}: ${keyStr} (${tLabel})`;
          }
        } else {
          extraBarWrap.style.display = 'none';
        }
      }
    };

    renderPlayerCard(this.p1, 'vaquito');
    renderPlayerCard(this.p2, 'burguer');

    const scoreEl = document.getElementById('hud-score');
    if (scoreEl) {
      const lvlName =
        this.currentLevel === 1
          ? 'NIVEL 1: PLAYA'
          : this.peacefulBeachAfterBoss
          ? 'PLAYA TRANQUILA'
          : 'NIVEL 2: INFIERNO';
      scoreEl.textContent = `${lvlName} | PUNTOS: ${String(this.score).padStart(5, '0')}`;
    }
  }

  showEndModal(isVictory) {
    window.retroAudio.setPterodactylLoop(false);
    const modal = document.getElementById('end-modal');
    const title = document.getElementById('end-title');
    const desc = document.getElementById('end-desc');
    if (!modal || !title || !desc) return;

    modal.classList.remove('hidden');
    if (isVictory) {
      title.textContent = '¡VICTORIA DEFINITIVA!';
      title.style.color = '#58ff6e';
      desc.textContent = `¡Derrotaron al Hater, devolvieron la paz a la playa y tocaron la Computadora con ${this.score} puntos!`;
    } else {
      title.textContent = '¡FIN DEL JUEGO!';
      title.style.color = '#ff4b4b';
      desc.textContent = 'Se agotaron los 3 corazones. ¡Intenten de nuevo!';
    }
  }

  draw() {
    const ctx = this.ctx;
    const W = this.canvas.width;
    const H = this.canvas.height;
    const isHell = this.currentLevel === 2 && !this.peacefulBeachAfterBoss;

    if (isHell) {
      ctx.fillStyle = '#290509';
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = '#470a10';
      ctx.fillRect(0, 120, W, H - 120);
      ctx.fillStyle = '#ff1e1e';
      ctx.fillRect(W - 110, 36, 52, 52);
      ctx.fillStyle = '#ff7b00';
      ctx.fillRect(W - 102, 44, 36, 36);

      for (const c of this.clouds) {
        const sx = Math.round(c.x - this.cameraX * 0.35);
        if (sx > -140 && sx < W + 140) {
          ctx.fillStyle = '#3d191e';
          ctx.fillRect(sx, c.y, 64 * c.scale, 22 * c.scale);
          ctx.fillRect(sx + 14 * c.scale, c.y - 12 * c.scale, 36 * c.scale, 14 * c.scale);
        }
      }

      const seaTop = 275;
      ctx.fillStyle = '#751006';
      ctx.fillRect(0, seaTop, W, GROUND_Y - seaTop);
      ctx.fillStyle = '#a82008';
      ctx.fillRect(0, seaTop + 34, W, GROUND_Y - seaTop - 34);
      ctx.fillStyle = '#d93800';
      ctx.fillRect(0, seaTop + 78, W, GROUND_Y - seaTop - 78);

      const waveOffset = Math.floor(this.worldTime * 28) % 64;
      ctx.fillStyle = '#ffae00';
      for (let x = -64; x < W + 64; x += 64) {
        const wx = x - ((Math.floor(this.cameraX * 0.5) + waveOffset) % 64);
        ctx.fillRect(wx, seaTop + 12, 28, 4);
        ctx.fillRect(wx + 20, seaTop + 52, 32, 4);
        ctx.fillRect(wx + 6, seaTop + 98, 26, 4);
      }

      ctx.fillStyle = '#ff6600';
      ctx.fillRect(0, GROUND_Y - 10, W, 10);
    } else {
      ctx.fillStyle = '#5cd0ff';
      ctx.fillRect(0, 0, W, H);

      ctx.fillStyle = '#fff36b';
      ctx.fillRect(W - 110, 36, 52, 52);
      ctx.fillStyle = '#ffce2e';
      ctx.fillRect(W - 102, 44, 36, 36);

      for (const c of this.clouds) {
        const sx = Math.round(c.x - this.cameraX * 0.35);
        if (sx > -140 && sx < W + 140) {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(sx, c.y, 64 * c.scale, 22 * c.scale);
          ctx.fillRect(sx + 14 * c.scale, c.y - 12 * c.scale, 36 * c.scale, 14 * c.scale);
          ctx.fillStyle = '#d4f1ff';
          ctx.fillRect(sx, c.y + 16 * c.scale, 64 * c.scale, 6 * c.scale);
        }
      }

      const seaTop = 275;
      ctx.fillStyle = '#0078bf';
      ctx.fillRect(0, seaTop, W, GROUND_Y - seaTop);
      ctx.fillStyle = '#1898e0';
      ctx.fillRect(0, seaTop + 34, W, GROUND_Y - seaTop - 34);
      ctx.fillStyle = '#38b6ff';
      ctx.fillRect(0, seaTop + 78, W, GROUND_Y - seaTop - 78);

      const waveOffset = Math.floor(this.worldTime * 28) % 64;
      ctx.fillStyle = '#b8ecff';
      for (let x = -64; x < W + 64; x += 64) {
        const wx = x - ((Math.floor(this.cameraX * 0.5) + waveOffset) % 64);
        ctx.fillRect(wx, seaTop + 12, 28, 4);
        ctx.fillRect(wx + 20, seaTop + 52, 32, 4);
        ctx.fillRect(wx + 6, seaTop + 98, 26, 4);
      }

      ctx.fillStyle = '#e8fbff';
      ctx.fillRect(0, GROUND_Y - 10, W, 10);
    }

    ctx.save();
    ctx.translate(-Math.round(this.cameraX), 0);

    if (!isHell) {
      for (const dec of this.decorations) {
        if (dec.x > this.cameraX - 120 && dec.x < this.cameraX + W + 120) {
          if (dec.type === 'palm') {
            this.drawPalmTree(ctx, dec.x, GROUND_Y);
          } else {
            this.drawBeachUmbrella(ctx, dec.x, GROUND_Y);
          }
        }
      }
    }

    ctx.fillStyle = isHell ? '#301414' : '#f6dc86';
    ctx.fillRect(this.cameraX, GROUND_Y, W, H - GROUND_Y);

    ctx.fillStyle = isHell ? '#6b1d14' : '#ffea9f';
    ctx.fillRect(this.cameraX, GROUND_Y, W, 10);

    const startTile = Math.floor(this.cameraX / 48) * 48;
    for (let tx = startTile; tx < this.cameraX + W + 48; tx += 48) {
      ctx.fillStyle = isHell ? '#1c0a0a' : '#dec068';
      ctx.fillRect(tx + 8, GROUND_Y + 22, 6, 6);
      ctx.fillRect(tx + 30, GROUND_Y + 46, 8, 6);
      ctx.fillRect(tx + 16, GROUND_Y + 72, 6, 6);
      ctx.fillStyle = isHell ? '#ff4d00' : '#fff5cc';
      ctx.fillRect(tx + 22, GROUND_Y + 18, 6, 4);
    }

    for (const pit of this.pits) {
      ctx.fillStyle = isHell ? '#3b0500' : '#062b4c';
      ctx.fillRect(pit.x, GROUND_Y, pit.w, H - GROUND_Y);
      ctx.fillStyle = isHell ? '#ff3c00' : '#0c528a';
      ctx.fillRect(pit.x, GROUND_Y + 34, pit.w, H - GROUND_Y - 34);
      ctx.fillStyle = isHell ? '#1f0808' : '#c9a64e';
      ctx.fillRect(pit.x - 6, GROUND_Y, 6, H - GROUND_Y);
      ctx.fillRect(pit.x + pit.w, GROUND_Y, 6, H - GROUND_Y);
      ctx.fillStyle = isHell ? '#ffea00' : '#7cd6ff';
      for (let px = pit.x + 8; px < pit.x + pit.w - 14; px += 22) {
        ctx.fillRect(px, GROUND_Y + 34 + Math.sin(this.worldTime * 6 + px) * 3, 12, 4);
      }
    }

    if (this.currentLevel === 1) {
      this.drawSandCastleGoal(ctx, this.worldWidth - 230, GROUND_Y);
    }

    if (this.currentLevel === 2 && this.peacefulBeachAfterBoss && this.computerGoal) {
      const cg = this.computerGoal;
      const pcSprite = window.spriteManager.pixelCache.computer;
      if (pcSprite) {
        ctx.drawImage(pcSprite, cg.x, cg.y, cg.w, cg.h);
      }
      ctx.font = 'bold 13px "Courier New", monospace';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#000000';
      ctx.fillText('💻 TOCA LA COMPUTADORA', cg.x + cg.w / 2 + 1, cg.y - 11);
      ctx.fillStyle = '#58ff6e';
      ctx.fillText('💻 TOCA LA COMPUTADORA', cg.x + cg.w / 2, cg.y - 12);
    }

    for (const b of this.blocks) {
      if (b.x + b.w < this.cameraX - 20 || b.x > this.cameraX + W + 20) continue;
      const by = Math.round(b.y + b.bumpOffset);

      if (b.type === 'platform') {
        ctx.fillStyle = '#24180c';
        ctx.fillRect(b.x, by, b.w, b.h);
        ctx.fillStyle = isHell ? '#592525' : '#d48c46';
        ctx.fillRect(b.x + 3, by + 3, b.w - 6, b.h - 6);
        ctx.fillStyle = isHell ? '#873636' : '#f2b66d';
        ctx.fillRect(b.x + 3, by + 3, b.w - 6, 6);
        ctx.fillStyle = isHell ? '#361212' : '#9e5d21';
        ctx.fillRect(b.x + 3, by + 20, b.w - 6, 3);
      } else {
        ctx.fillStyle = '#24180c';
        ctx.fillRect(b.x, by, b.w, b.h);
        if (!b.used) {
          const pulse = Math.floor(this.worldTime * 5) % 2 === 0;
          ctx.fillStyle = pulse ? '#ffcc18' : '#ffdf4f';
          ctx.fillRect(b.x + 3, by + 3, b.w - 6, b.h - 6);
          ctx.fillStyle = '#fff59e';
          ctx.fillRect(b.x + 5, by + 5, b.w - 10, 4);
          ctx.fillStyle = '#6e3800';
          ctx.font = 'bold 24px "Courier New", monospace';
          ctx.textAlign = 'center';
          ctx.fillText('?', b.x + b.w / 2, by + 31);
        } else {
          ctx.fillStyle = '#8f7d65';
          ctx.fillRect(b.x + 3, by + 3, b.w - 6, b.h - 6);
        }
      }
    }

    for (const it of this.items) {
      const bobY = Math.round(it.y + Math.sin(it.bobTick) * 3);
      ctx.save();
      ctx.fillStyle = it.type === 'lettuce' ? 'rgba(72, 255, 92, 0.28)' : 'rgba(255, 110, 64, 0.28)';
      ctx.beginPath();
      ctx.arc(it.x + it.w / 2, bobY + it.h / 2, 25, 0, Math.PI * 2);
      ctx.fill();

      const spriteCanvas =
        it.type === 'lettuce'
          ? window.spriteManager.pixelCache.lettuce
          : window.spriteManager.pixelCache.meat;
      if (spriteCanvas) {
        ctx.drawImage(spriteCanvas, it.x - 3, bobY - 3, 48, 48);
      }

      ctx.font = 'bold 10px "Courier New", monospace';
      ctx.textAlign = 'center';
      const tag = it.type === 'lettuce' ? 'LECHUGA' : 'CARNE';
      ctx.fillStyle = '#000000';
      ctx.fillText(tag, it.x + it.w / 2 + 1, bobY - 5);
      ctx.fillStyle = it.type === 'lettuce' ? '#7dff8b' : '#ffae7d';
      ctx.fillText(tag, it.x + it.w / 2, bobY - 6);
      ctx.restore();
    }

    // Cacahuates Malvados
    for (const peanut of this.peanuts) {
      if (!peanut.alive && peanut.squashTimer <= 0) continue;
      if (peanut.x + peanut.w < this.cameraX - 40 || peanut.x > this.cameraX + W + 40) continue;

      if (!peanut.alive) {
        const sq = isHell
          ? window.spriteManager.pixelCache.peanutHellSquashed
          : window.spriteManager.pixelCache.peanutSquashed;
        if (sq) ctx.drawImage(sq, peanut.x, peanut.y + 18, peanut.w, 28);
      } else {
        const isFrame1 = Math.floor(peanut.animTick * 6) % 2 === 0;
        const frame = isHell
          ? isFrame1
            ? window.spriteManager.pixelCache.peanutHell1
            : window.spriteManager.pixelCache.peanutHell2
          : isFrame1
          ? window.spriteManager.pixelCache.peanut1
          : window.spriteManager.pixelCache.peanut2;
        if (frame) {
          ctx.drawImage(frame, Math.round(peanut.x), Math.round(peanut.y), peanut.w, peanut.h);
        }
      }
    }

    // Pterodáctilos
    for (const pt of this.pteros) {
      if (!pt.alive) continue;
      if (pt.x + pt.w < this.cameraX - 60 || pt.x > this.cameraX + W + 60) continue;

      const isWingUp = Math.floor(pt.animTick * 7) % 2 === 0;
      const sprite = isHell
        ? isWingUp
          ? window.spriteManager.pixelCache.pteroHell1
          : window.spriteManager.pixelCache.pteroHell2
        : isWingUp
        ? window.spriteManager.pixelCache.ptero1
        : window.spriteManager.pixelCache.ptero2;

      if (sprite) {
        ctx.save();
        if (pt.vx > 0) {
          ctx.translate(Math.round(pt.x + pt.w), Math.round(pt.y));
          ctx.scale(-1, 1);
          ctx.drawImage(sprite, 0, 0, pt.w, pt.h);
        } else {
          ctx.drawImage(sprite, Math.round(pt.x), Math.round(pt.y), pt.w, pt.h);
        }
        ctx.restore();
      }
    }

    // Jefe Final HATER
    if (this.currentLevel === 2 && this.hater && !this.hater.disappeared) {
      this.drawHaterBoss(ctx, this.hater);
    }

    // Dibujar Proyectiles (Rayo Verde, Pelotitas, Katana, Hechizo Violeta, Bola de Fuego)
    for (const pr of this.projectiles) {
      if (pr.kind === 'laser') {
        ctx.fillStyle = '#0b4214';
        ctx.fillRect(pr.x - 2, pr.y - 2, pr.w + 4, pr.h + 4);
        ctx.fillStyle = '#26ff4a';
        ctx.fillRect(pr.x, pr.y, pr.w, pr.h);
        ctx.fillStyle = '#d4ffda';
        ctx.fillRect(pr.x + 4, pr.y + 2, pr.w - 8, pr.h - 4);
      } else if (pr.kind === 'pellet') {
        ctx.fillStyle = '#0e3b14';
        ctx.fillRect(pr.x - 1, pr.y - 1, 18, 18);
        ctx.fillStyle = '#38d84e';
        ctx.fillRect(pr.x + 1, pr.y + 1, 14, 14);
        ctx.fillStyle = '#a8ff9e';
        ctx.fillRect(pr.x + 4, pr.y + 4, 6, 6);
      } else if (pr.kind === 'katana') {
        const kSprite = window.spriteManager.pixelCache.katana;
        if (kSprite) {
          ctx.save();
          if (pr.facingLeft) {
            ctx.translate(Math.round(pr.x + pr.w), Math.round(pr.y));
            ctx.scale(-1, 1);
            ctx.drawImage(kSprite, 0, 0, pr.w, pr.h);
          } else {
            ctx.drawImage(kSprite, Math.round(pr.x), Math.round(pr.y), pr.w, pr.h);
          }
          ctx.restore();
        }
      } else if (pr.kind === 'witch_spell') {
        const sSprite = window.spriteManager.pixelCache.witchSpell;
        if (sSprite) {
          ctx.drawImage(sSprite, Math.round(pr.x), Math.round(pr.y), pr.w, pr.h);
        }
      } else if (pr.kind === 'fireball') {
        const fSprite = window.spriteManager.pixelCache.fireball;
        if (fSprite) {
          ctx.save();
          if (pr.facingLeft) {
            ctx.translate(Math.round(pr.x + pr.w), Math.round(pr.y));
            ctx.scale(-1, 1);
            ctx.drawImage(fSprite, 0, 0, pr.w, pr.h);
          } else {
            ctx.drawImage(fSprite, Math.round(pr.x), Math.round(pr.y), pr.w, pr.h);
          }
          ctx.restore();
        }
      }
    }

    // Dibujar a los Jugadores
    this.drawPlayer(ctx, this.p1);
    this.drawPlayer(ctx, this.p2);

    for (const pt of this.particles) {
      ctx.fillStyle = pt.color;
      ctx.fillRect(pt.x, pt.y, pt.size, pt.size);
    }

    for (const ft of this.floatingTexts) {
      ctx.font = 'bold 14px "Courier New", monospace';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#000000';
      ctx.fillText(ft.text, ft.x + 2, ft.y + 2);
      ctx.fillStyle = ft.color;
      ctx.fillText(ft.text, ft.x, ft.y);
    }

    ctx.restore();

    if (this.levelBannerTimer > 0 && this.levelBannerText) {
      ctx.save();
      ctx.fillStyle = 'rgba(0, 0, 0, 0.78)';
      ctx.fillRect(W / 2 - 310, 18, 620, 38);
      ctx.strokeStyle = '#ffe066';
      ctx.lineWidth = 3;
      ctx.strokeRect(W / 2 - 310, 18, 620, 38);
      ctx.font = 'bold 16px "Courier New", monospace';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#ffe066';
      ctx.fillText(this.levelBannerText, W / 2, 42);
      ctx.restore();
    }
  }

  drawHaterBoss(ctx, h) {
    let shakeX = 0;
    let shakeY = 0;
    if (h.explodingTimer > 0) {
      shakeX = (Math.random() - 0.5) * 14;
      shakeY = (Math.random() - 0.5) * 14;
    }

    const drawW = 132;
    const drawH = 140;
    const drawX = h.x - (drawW - h.w) / 2 + shakeX;
    const drawY = h.y + h.h - drawH + 4 + shakeY;

    window.spriteManager.drawCharacter(
      ctx,
      'hater',
      h.animState,
      h.animFrame,
      drawX,
      drawY,
      drawW,
      drawH,
      h.facingLeft
    );

    const barW = 130;
    const barH = 14;
    const barX = h.x + (h.w - barW) / 2;
    const barY = h.y - 32;

    ctx.fillStyle = '#000000';
    ctx.fillRect(barX - 3, barY - 3, barW + 6, barH + 6);
    ctx.fillStyle = '#3b0d0d';
    ctx.fillRect(barX, barY, barW, barH);

    const hpPct = Math.max(0, h.hp / h.maxHp);
    ctx.fillStyle = hpPct > 0.5 ? '#ff2e2e' : hpPct > 0.25 ? '#ff8800' : '#ffee00';
    ctx.fillRect(barX, barY, barW * hpPct, barH);

    ctx.font = 'bold 12px "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#000000';
    ctx.fillText(`HATER: ${h.hp}/${h.maxHp} VIDA`, h.x + h.w / 2 + 1, barY - 5);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(`HATER: ${h.hp}/${h.maxHp} VIDA`, h.x + h.w / 2, barY - 6);
  }

  drawPlayer(ctx, player) {
    if (player.permanentlyDead || player.respawnTimer > 0) return;

    if (player.invulnTimer > 0 && Math.floor(this.worldTime * 18) % 2 === 0) {
      ctx.globalAlpha = 0.55;
    }

    // SuperFlex crece de tamaño cuando toca la carne
    const isGiantFlex = player.isSuper && player.def.growsOnSuper;
    const drawW = isGiantFlex ? 102 : 74;
    const drawH = isGiantFlex ? 108 : 76;
    const drawX = player.x - (drawW - player.w) / 2;
    let drawY = player.y + player.h - drawH + 2;

    if (player.def.moveWithTorso && player.torsoWave > 0) {
      drawY += Math.sin(player.torsoWave) * 2.2;
    }

    if (player.isSuper) {
      ctx.save();
      ctx.strokeStyle = player.def.auraColor;
      ctx.lineWidth = 2;
      ctx.strokeRect(player.x - 4, player.y - 4, player.w + 8, player.h + 8);
      ctx.restore();
    }

    window.spriteManager.drawCharacter(
      ctx,
      player.currentSpriteKey,
      player.animState,
      player.animFrame,
      drawX,
      drawY,
      drawW,
      drawH,
      player.facingLeft
    );

    ctx.globalAlpha = 1;

    const tagY = player.y - 14;
    ctx.font = 'bold 11px "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#000';
    ctx.fillText(player.name.toUpperCase(), player.x + player.w / 2 + 1, tagY + 1);
    ctx.fillStyle = player.def.tagColor;
    ctx.fillText(player.name.toUpperCase(), player.x + player.w / 2, tagY);

    if (player.def.canFly && player.isSuper) {
      const bw = 46;
      const bx = player.x + (player.w - bw) / 2;
      const by = player.y - 8;
      ctx.fillStyle = '#000';
      ctx.fillRect(bx - 1, by - 1, bw + 2, 6);
      ctx.fillStyle = '#38ff5c';
      ctx.fillRect(bx, by, (player.flyFuel / VAQUITO_FLY_MAX_SEC) * bw, 4);
    }
  }

  drawPalmTree(ctx, x, groundY) {
    ctx.fillStyle = '#8c5323';
    for (let i = 0; i < 6; i++) {
      ctx.fillRect(x + i * 2, groundY - (i + 1) * 18, 14, 17);
    }
    const topX = x + 10;
    const topY = groundY - 114;
    ctx.fillStyle = '#269e38';
    ctx.fillRect(topX - 38, topY, 84, 14);
    ctx.fillRect(topX - 26, topY - 12, 60, 12);
    ctx.fillRect(topX - 46, topY + 12, 24, 10);
    ctx.fillRect(topX + 30, topY + 12, 24, 10);
  }

  drawBeachUmbrella(ctx, x, groundY) {
    ctx.fillStyle = '#d9d9d9';
    ctx.fillRect(x + 24, groundY - 64, 5, 64);
    ctx.fillStyle = '#ff384b';
    ctx.fillRect(x - 6, groundY - 76, 66, 16);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(x + 14, groundY - 76, 24, 16);
    ctx.fillStyle = '#ff384b';
    ctx.fillRect(x + 6, groundY - 88, 42, 12);
  }

  drawSandCastleGoal(ctx, x, groundY) {
    ctx.fillStyle = '#d4ad50';
    ctx.fillRect(x, groundY - 110, 150, 110);
    ctx.fillStyle = '#ebd07c';
    ctx.fillRect(x + 6, groundY - 104, 138, 104);
    for (let i = 0; i < 5; i++) {
      ctx.fillStyle = '#ebd07c';
      ctx.fillRect(x + i * 32, groundY - 128, 22, 20);
    }
    ctx.fillStyle = '#1f0808';
    ctx.fillRect(x + 55, groundY - 56, 40, 56);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(x + 73, groundY - 190, 4, 65);
    ctx.fillStyle = '#ff2e4c';
    ctx.fillRect(x + 77, groundY - 190, 82, 30);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 11px "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('AL NIVEL 2', x + 118, groundY - 171);
  }
}

window.addEventListener('DOMContentLoaded', async () => {
  await window.spriteManager.loadAll();
  const game = new BurguerVaquitoGame();
  window.bvGame = game;

  let selectedP1Char = 'vaquito';
  let selectedP2Char = 'burguer';
  let pending2PMode = 'local'; // 'local' | 'online_host'

  const update2PSelectUI = () => {
    document.querySelectorAll('.p1-char-opt').forEach((btn) => {
      const cid = btn.dataset.char;
      btn.classList.toggle('selected', cid === selectedP1Char);
      btn.disabled = cid === selectedP2Char;
      const lockBadge = btn.querySelector('.lock-tag');
      if (lockBadge) lockBadge.textContent = cid === selectedP2Char ? 'ELEGIDO POR J2' : '';
    });
    document.querySelectorAll('.p2-char-opt').forEach((btn) => {
      const cid = btn.dataset.char;
      btn.classList.toggle('selected', cid === selectedP2Char);
      btn.disabled = cid === selectedP1Char;
      const lockBadge = btn.querySelector('.lock-tag');
      if (lockBadge) lockBadge.textContent = cid === selectedP1Char ? 'ELEGIDO POR J1' : '';
    });
  };

  document.querySelectorAll('.p1-char-opt').forEach((btn) => {
    btn.addEventListener('click', () => {
      const cid = btn.dataset.char;
      if (cid === selectedP2Char) return;
      selectedP1Char = cid;
      update2PSelectUI();
    });
  });

  document.querySelectorAll('.p2-char-opt').forEach((btn) => {
    btn.addEventListener('click', () => {
      const cid = btn.dataset.char;
      if (cid === selectedP1Char) return;
      selectedP2Char = cid;
      update2PSelectUI();
    });
  });

  // 5 opciones de personajes en la pantalla de inicio para jugar 1 Jugador
  document.querySelectorAll('.single-char-card').forEach((btn) => {
    btn.addEventListener('click', () => {
      const cid = btn.dataset.char;
      window.networkManager.cleanup();
      document.getElementById('menu-overlay').classList.add('hidden');
      document.getElementById('end-modal').classList.add('hidden');
      game.startGame('single', cid, 'burguer');
    });
  });

  // Cuando el usuario toca lo de 2 jugadores aparece la pantallita con las 5 opciones de personajes (sin repetir)
  document.getElementById('btn-play-local').addEventListener('click', () => {
    pending2PMode = 'local';
    update2PSelectUI();
    document.getElementById('char-select-modal').classList.remove('hidden');
  });

  document.getElementById('btn-confirm-2p').addEventListener('click', () => {
    document.getElementById('char-select-modal').classList.add('hidden');
    document.getElementById('menu-overlay').classList.add('hidden');
    document.getElementById('end-modal').classList.add('hidden');
    if (pending2PMode === 'online_host') {
      game.startGame('online_host', selectedP1Char, selectedP2Char);
      window.networkManager.send({ type: 'START_ONLINE_MATCH', p1Char: selectedP1Char, p2Char: selectedP2Char });
    } else {
      window.networkManager.cleanup();
      game.startGame('local', selectedP1Char, selectedP2Char);
    }
  });

  document.getElementById('btn-cancel-2p').addEventListener('click', () => {
    document.getElementById('char-select-modal').classList.add('hidden');
  });

  // Botones de la pantallita ESC ("¿Seguro que quieres salir? No / Si")
  document.getElementById('btn-esc-no').addEventListener('click', () => {
    game.toggleEscModal(false); // Devuelve al jugador a la pantalla del nivel
  });

  document.getElementById('btn-esc-yes').addEventListener('click', () => {
    game.toggleEscModal(false);
    game.running = false;
    window.retroAudio.stopMusic();
    document.getElementById('end-modal').classList.add('hidden');
    document.getElementById('menu-overlay').classList.remove('hidden'); // Vuelve a la pantalla de inicio
  });

  // Online callbacks
  window.networkManager.onMessageCallback = (data) => {
    if (!data) return;
    if (data.type === 'GUEST_INPUT' && game.mode === 'online_host') {
      if (data.input.jumpJustPressed) {
        game.remoteGuestInput.jumpJustPressed = true;
      }
      game.remoteGuestInput = { ...data.input, jumpJustPressed: game.remoteGuestInput.jumpJustPressed };
    } else if (data.type === 'STATE_SYNC' && game.mode === 'online_guest') {
      if (!game.running) {
        document.getElementById('menu-overlay').classList.add('hidden');
        game.startGame('online_guest', data.p1?.charId || 'vaquito', data.p2?.charId || 'burguer');
      }
      game.applyStateFromHost(data);
    } else if (data.type === 'START_ONLINE_MATCH' && game.mode === 'online_guest') {
      document.getElementById('menu-overlay').classList.add('hidden');
      document.getElementById('end-modal').classList.add('hidden');
      game.startGame('online_guest', data.p1Char || 'vaquito', data.p2Char || 'burguer');
    } else if (data.type === 'REQUEST_RESTART' && game.mode === 'online_host') {
      document.getElementById('end-modal').classList.add('hidden');
      game.startGame('online_host', game.p1.charId, game.p2.charId);
      window.networkManager.send({ type: 'START_ONLINE_MATCH', p1Char: game.p1.charId, p2Char: game.p2.charId });
    }
  };

  window.networkManager.onConnectedCallback = () => {
    const startOnlineBtn = document.getElementById('btn-start-online-match');
    if (startOnlineBtn && window.networkManager.mode === 'online_host') {
      startOnlineBtn.disabled = false;
      startOnlineBtn.classList.add('pulse-ready');
    }
  };

  document.getElementById('btn-host-room').addEventListener('click', () => {
    const inputCode = document.getElementById('room-code-input').value.trim();
    const code = window.networkManager.hostRoom(inputCode);
    document.getElementById('room-code-input').value = code;
    const startOnlineBtn = document.getElementById('btn-start-online-match');
    startOnlineBtn.style.display = 'inline-block';
    startOnlineBtn.disabled = false;
  });

  document.getElementById('btn-join-room').addEventListener('click', () => {
    const code = document.getElementById('room-code-input').value.trim();
    if (!code) {
      window.networkManager.setStatus('Por favor, escribe el código de la sala para unirte.', false);
      return;
    }
    window.networkManager.joinRoom(code);
  });

  document.getElementById('btn-start-online-match').addEventListener('click', () => {
    pending2PMode = 'online_host';
    update2PSelectUI();
    document.getElementById('char-select-modal').classList.remove('hidden');
  });

  document.getElementById('btn-mute').addEventListener('click', (e) => {
    const muted = window.retroAudio.toggleMute();
    e.currentTarget.textContent = muted ? '🔇 SONIDO: NO' : '🔊 SONIDO: SÍ';
  });

  // Detectar si es celular/tablet automáticamente y botón para activar/ocultar controles táctiles
  if ('ontouchstart' in window || navigator.maxTouchPoints > 0) {
    document.body.classList.add('force-touch-controls');
  }
  const btnToggleTouch = document.getElementById('btn-toggle-touch');
  if (btnToggleTouch) {
    btnToggleTouch.addEventListener('click', () => {
      document.body.classList.toggle('force-touch-controls');
    });
  }

  // Cargar Link Público y Link Wi-Fi para dispositivos externos
  const publicUrlText = document.getElementById('public-url-text');
  const lanUrlText = document.getElementById('lan-url-text');
  const btnCopyPublic = document.getElementById('btn-copy-public');

  const refreshServerUrls = () => {
    if (!location.protocol.startsWith('http')) return;
    fetch('/api/server-info')
      .then((r) => (r.ok ? r.json() : null))
      .then((info) => {
        if (!info) return;
        if (lanUrlText && info.primaryLanUrl) {
          lanUrlText.textContent = info.primaryLanUrl;
        }
        if (publicUrlText) {
          if (info.publicUrl) {
            publicUrlText.textContent = info.publicUrl;
          } else if (location.hostname !== 'localhost' && location.hostname !== '127.0.0.1') {
            publicUrlText.textContent = location.origin;
          }
        }
      })
      .catch(() => {});
  };
  refreshServerUrls();
  setInterval(refreshServerUrls, 4000);

  if (btnCopyPublic) {
    btnCopyPublic.addEventListener('click', () => {
      const urlToCopy =
        publicUrlText && publicUrlText.textContent.startsWith('http')
          ? publicUrlText.textContent
          : lanUrlText
          ? lanUrlText.textContent
          : location.origin;
      if (navigator.clipboard) {
        navigator.clipboard.writeText(urlToCopy).then(() => {
          btnCopyPublic.textContent = '✅ COPIADO';
          setTimeout(() => {
            btnCopyPublic.textContent = '📋 COPIAR';
          }, 2000);
        });
      }
    });
  }

  // Si entran con ?room=CODIGO en el link, rellenar automáticamente el código de sala
  const urlRoom = new URLSearchParams(location.search).get('room');
  if (urlRoom) {
    const roomInput = document.getElementById('room-code-input');
    if (roomInput) roomInput.value = urlRoom.toUpperCase().trim();
  }

  document.getElementById('btn-restart').addEventListener('click', () => {
    document.getElementById('end-modal').classList.add('hidden');
    game.startGame(game.mode, game.p1.charId, game.p2.charId);
  });

  document.getElementById('btn-menu').addEventListener('click', () => {
    game.toggleEscModal(true);
  });

  document.getElementById('btn-play-again').addEventListener('click', () => {
    document.getElementById('end-modal').classList.add('hidden');
    if (game.mode === 'online_guest') {
      window.networkManager.send({ type: 'REQUEST_RESTART' });
    } else {
      game.startGame(game.mode, game.p1.charId, game.p2.charId);
      if (game.mode === 'online_host') {
        window.networkManager.send({ type: 'START_ONLINE_MATCH', p1Char: game.p1.charId, p2Char: game.p2.charId });
      }
    }
  });

  let lastTime = performance.now();
  const loop = (now) => {
    const dt = Math.min(0.05, (now - lastTime) / 1000);
    lastTime = now;
    game.step(dt);
    game.draw();
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
});
