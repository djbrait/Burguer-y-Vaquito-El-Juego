// Cargador de Sprites de los 5 Personajes Jugables (Vaquito, Burguer, Jack, Vaquita, Flex), sus modos Super y HATER
// + Generador Pixel-Art 8-bit de Enemigos, Objetos y Proyectiles (Rayo Verde, Pelotita, Katana, Hechizo Violeta, Bola de Fuego)

class SpriteManager {
  constructor() {
    this.atlas = null;
    this.sheets = {};
    this.loaded = false;
    this.pixelCache = {};
  }

  async loadAll() {
    const res = await fetch('assets/sprites/atlas.json?v=4');
    this.atlas = await res.json();

    const names = [
      'vaquito',
      'super_vaquito',
      'burguer',
      'super_burguer',
      'jack',
      'super_jack',
      'vaquita',
      'super_vaquita',
      'flex',
      'super_flex',
      'hater'
    ];
    await Promise.all(
      names.map(
        (name) =>
          new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
              this.sheets[name] = img;
              resolve();
            };
            img.onerror = reject;
            img.src = `assets/sprites/${name}.png?v=4`;
          })
      )
    );

    this.generatePixelSprites();
    this.loaded = true;
  }

  createPixelCanvas(matrix, palette, scale = 3) {
    const h = matrix.length;
    const w = matrix[0].length;
    const c = document.createElement('canvas');
    c.width = w * scale;
    c.height = h * scale;
    const ctx = c.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    for (let y = 0; y < h; y++) {
      const row = matrix[y];
      for (let x = 0; x < w; x++) {
        const ch = row[x];
        if (ch !== '.' && palette[ch]) {
          ctx.fillStyle = palette[ch];
          ctx.fillRect(x * scale, y * scale, scale, scale);
        }
      }
    }
    return c;
  }

  generatePixelSprites() {
    // 1. Cacahuates Malvados (Playa vs Infierno)
    const peanutPalette = {
      K: '#14100c',
      P: '#d99b52',
      L: '#f2be79',
      D: '#a86e2a',
      W: '#ffffff',
      R: '#e62e2e',
      F: '#5c3614'
    };

    const peanutHellPalette = {
      K: '#050505',
      P: '#1e1e24',
      L: '#343440',
      D: '#101014',
      W: '#ff1e1e',
      R: '#ff9900',
      F: '#0d0d10'
    };

    const peanut1 = [
      '....KKKKKKKK....',
      '...KLLLLPPPPK...',
      '..KLLPPDPPPDPK..',
      '..KLPPKKKKKKPK..',
      '..KLPKWRKKRWKPK.',
      '...KPKWKKKKWKPK.',
      '....KPPPPDPPPK..',
      '...KLPDPPPPDPK..',
      '..KLLPPPPPPPPPK.',
      '..KLPPDPPPPDPPK.',
      '..KLPPPPDPPPPPK.',
      '...KPPPPPPPPPK..',
      '....KKKKKKKKK...',
      '...KFFK....KFK..',
      '..KFFFK....KFFK.',
      '..KKKK.....KKKK.'
    ];

    const peanut2 = [
      '....KKKKKKKK....',
      '...KLLLLPPPPK...',
      '..KLLPPDPPPDPK..',
      '..KLPPKKKKKKPK..',
      '..KLPKWRKKRWKPK.',
      '...KPKWKKKKWKPK.',
      '....KPPPPDPPPK..',
      '...KLPDPPPPDPK..',
      '..KLLPPPPPPPPPK.',
      '..KLPPDPPPPDPPK.',
      '..KLPPPPDPPPPPK.',
      '...KPPPPPPPPPK..',
      '....KKKKKKKKK...',
      '....KFK...KFFK..',
      '...KFFK...KFFFK.',
      '...KKKK...KKKK..'
    ];

    const peanutSquashed = [
      '................',
      '................',
      '................',
      '................',
      '..KKKKKKKKKKKK..',
      '.KLLPPPPDPPPDPK.',
      'KLPKRKWRKKRWKRPK',
      'KLPPPPDPPPPDPPPK',
      '.KKKKKKKKKKKKKK.',
      '..KFFK.....KFFK.'
    ];

    this.pixelCache.peanut1 = this.createPixelCanvas(peanut1, peanutPalette, 3);
    this.pixelCache.peanut2 = this.createPixelCanvas(peanut2, peanutPalette, 3);
    this.pixelCache.peanutSquashed = this.createPixelCanvas(peanutSquashed, peanutPalette, 3);

    this.pixelCache.peanutHell1 = this.createPixelCanvas(peanut1, peanutHellPalette, 3);
    this.pixelCache.peanutHell2 = this.createPixelCanvas(peanut2, peanutHellPalette, 3);
    this.pixelCache.peanutHellSquashed = this.createPixelCanvas(peanutSquashed, peanutHellPalette, 3);

    // 2. Pterodáctilos Voladores (Playa vs Infierno)
    const pteroPalette = {
      K: '#14100c',
      B: '#9e582f',
      L: '#cf7d4a',
      Y: '#f5b841',
      W: '#ffffff',
      R: '#d92121'
    };

    const pteroHellPalette = {
      K: '#000000',
      B: '#18181f',
      L: '#2b2b36',
      Y: '#3d1414',
      W: '#ff1a1a',
      R: '#ff6600'
    };

    const pteroUp = [
      '.......KKKK....KKKKK..',
      '......KLLLLK..KLLLLK..',
      '...KKKKLLLLKKKKLLLLK..',
      '.KKYYYYBBBBLLLLLLLK...',
      'KYYYYYYKWWRBBBBLLK....',
      '.KKKKKKBBBBBBBBBK.....',
      '......KBBBBBBBBBK.....',
      '.......KKKKKKKKKKK....',
      '..........KBBK..KKK...',
      '..........KKKK........',
      '......................',
      '......................',
      '......................',
      '......................'
    ];

    const pteroDown = [
      '.......KKKK...........',
      '......KLLLLK..........',
      '...KKKKBBBBKKKK.......',
      '.KKYYYYBBBBBBBBKK.....',
      'KYYYYYYKWWRBBBBBBK....',
      '.KKKKKKBBBBLLLLLLK....',
      '......KBBBLLLLLLLLK...',
      '.......KKKLLLLKLLLLK..',
      '.........KLLLK..KLLK..',
      '.........KKKK....KKK..',
      '......................',
      '......................',
      '......................',
      '......................'
    ];

    this.pixelCache.ptero1 = this.createPixelCanvas(pteroUp, pteroPalette, 3);
    this.pixelCache.ptero2 = this.createPixelCanvas(pteroDown, pteroPalette, 3);
    this.pixelCache.pteroHell1 = this.createPixelCanvas(pteroUp, pteroHellPalette, 3);
    this.pixelCache.pteroHell2 = this.createPixelCanvas(pteroDown, pteroHellPalette, 3);

    // 3. Lechuga (Para Vaquito y Vaquita)
    const lettucePalette = {
      K: '#102810',
      G: '#38c848',
      L: '#88f878',
      D: '#1e882c',
      W: '#d8ffd0'
    };
    const lettuceMat = [
      '....KKKKKKKK....',
      '..KKLLLLGGGGKK..',
      '.KLLGGGGGGGGGGLK',
      '.KLGGLLLGGGGDDGK',
      'KLGGLWWWLLGGDDGK',
      'KLGLWWGGWLLGDDGK',
      'KGGLLGGGWWLGDDGK',
      'KGGGGGGWWLLGDDDK',
      '.KDGGGGWLLGGDDK.',
      '.KDDGGWWLGGDDDK.',
      '..KDDGWWWGDDDK..',
      '...KKGWWWGDDK...',
      '....KWWWWWDK....',
      '....KWWWWWK.....',
      '.....KKKKK......',
      '................'
    ];
    this.pixelCache.lettuce = this.createPixelCanvas(lettuceMat, lettucePalette, 3);

    // 4. Carne Cocinada (Para Burguer, Jack y Flex)
    const meatPalette = {
      K: '#1c0e08',
      M: '#a84224',
      L: '#d66844',
      D: '#6e2410',
      B: '#f7efe2',
      S: '#d8c8b0'
    };
    const meatMat = [
      '..........KKKK..',
      '.........KBBBBK.',
      '...KKKKKK.KBBBK.',
      '..KLLLLMMKKBBK..',
      '.KLLMMMDMMMBK...',
      'KLLMMMDMMMMMMK..',
      'KLMMMDMMMDMMBBK.',
      'KMMMDMMMDMMBSBK.',
      'KMMDMMMDMMMBBBK.',
      'KMMMMMDMMMMMMK..',
      '.KDDDDDDDDMMK...',
      '.KBBBBKKKKKK....',
      'KBBBBK..........',
      'KBBBK...........',
      '.KKK............',
      '................'
    ];
    this.pixelCache.meat = this.createPixelCanvas(meatMat, meatPalette, 3);

    // 5. Katana de SuperJack (18x8)
    const katanaPalette = {
      K: '#111116',
      H: '#8c3b14', // Mango
      G: '#ffcc22', // Guarda dorada
      S: '#dce6f2', // Hoja de acero
      W: '#ffffff'  // Filo brillante
    };
    const katanaMat = [
      '....KK............',
      'KKKKGKSSSSSSSSSSK.',
      'KHHHGKWWWWWWWWWWSK',
      'KKKKGKSSSSSSSSSSK.',
      '....KK............'
    ];
    this.pixelCache.katana = this.createPixelCanvas(katanaMat, katanaPalette, 3);

    // 6. Hechizo de Bruja Violeta de SuperVaquita (12x12)
    const spellPalette = {
      K: '#24053b',
      P: '#9922ff',
      L: '#d97aff',
      W: '#ffffff'
    };
    const spellMat = [
      '...KKKKKK...',
      '.KKPPPPPPKK.',
      'KPPPLLLLPPPK',
      'KPPLWWWWLPPK',
      'KPLWWWWWWLPK',
      'KPLWWWWWWLPK',
      'KPPLWWWWLPPK',
      'KPPPLLLLPPPK',
      '.KKPPPPPPKK.',
      '...KKKKKK...'
    ];
    this.pixelCache.witchSpell = this.createPixelCanvas(spellMat, spellPalette, 3);

    // 7. Bola de Fuego de SuperFlex (12x10)
    const firePalette = {
      R: '#e61900',
      O: '#ff7700',
      Y: '#ffdd00',
      W: '#ffffff'
    };
    const fireMat = [
      '....RRRRRR..',
      '..RROOOOOORR',
      '.ROOOYYYYOOR',
      'ROOYYWWWWYYO',
      'ROOYYWWWWYYO',
      '.ROOOYYYYOOR',
      '..RROOOOOORR',
      '....RRRRRR..'
    ];
    this.pixelCache.fireball = this.createPixelCanvas(fireMat, firePalette, 3);

    // 8. Computadora Retro Final (18x18)
    const pcPalette = {
      K: '#111118',
      G: '#d4d0c8',
      D: '#9c988e',
      S: '#102840',
      C: '#48ff7a',
      R: '#ff3838',
      W: '#8c5323'
    };
    const pcMat = [
      '..KKKKKKKKKKKK....',
      '.KGGGGGGGGGGGGK...',
      '.KGSSSSSSSSSSGK...',
      '.KGSCCCCSSSSSGK...',
      '.KGSSSSSCCCSSGK...',
      '.KGSCCCCCCSSSGK...',
      '.KGSSSSSSSSSSGK...',
      '.KGGGGGGGGGRGGK...',
      '..KKKKDDDDKKKK....',
      '.....KDDDDK.......',
      '.KKKKKKKKKKKKKKK..',
      'KGGGGGGGGGGGGGGGK.',
      'KGKKKKKKKKKKKKKGK.',
      'KKKKKKKKKKKKKKKKK.',
      'WWWWWWWWWWWWWWWWWW',
      'WWDDDDDDDDDDDDDDWW',
      'WW..............WW',
      'WW..............WW'
    ];
    this.pixelCache.computer = this.createPixelCanvas(pcMat, pcPalette, 4);
  }

  drawCharacter(ctx, charKey, animName, frameIdx, x, y, drawW, drawH, facingLeft) {
    if (!this.loaded || !this.sheets[charKey]) return;
    const sheet = this.sheets[charKey];
    const animList = this.atlas.characters[charKey][animName] || this.atlas.characters[charKey].idle;
    const frame = animList[frameIdx % animList.length];

    ctx.save();
    const flip = charKey === 'hater' ? !facingLeft : facingLeft;
    if (flip) {
      ctx.translate(Math.round(x + drawW), Math.round(y));
      ctx.scale(-1, 1);
      ctx.drawImage(sheet, frame.x, frame.y, frame.w, frame.h, 0, 0, drawW, drawH);
    } else {
      ctx.drawImage(sheet, frame.x, frame.y, frame.w, frame.h, Math.round(x), Math.round(y), drawW, drawH);
    }
    ctx.restore();
  }
}

window.spriteManager = new SpriteManager();
