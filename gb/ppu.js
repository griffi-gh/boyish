import PixelCanvas from './pxcanvas.js';
import { toHex, hexToRgb } from './common.js';

export const SCREEN_SIZE = [160, 144];

export const MODE_HBLANK = 0;
export const MODE_VBLANK = 1;
export const MODE_OAM = 2;
export const MODE_VRAM = 3;

export const DATA_AREA_8800 = false;
export const DATA_AREA_8000 = true;

export const MAP_AREA_9800 = false;
export const MAP_AREA_9C00 = true;

export const OBJ_SIZE_8 = false;
export const OBJ_SIZE_16 = true;

export class OAMObject {
  constructor() {
    this.x = -8;
    this.y = -16;
    this.tile = 0;
    this.pal = 0;
    this.flipX = false;
    this.flipY = false;
    this.priority = false;
  }
  getOAMdata(i) {
    switch(i) {
      case 0:
        return this.y + 16;
      case 1:
        return this.x + 8;
      case 2:
        return this.tile;
      case 3:
        return (
          (this.priority  << 7) |
          (this.flipY     << 6) |
          (this.flipX     << 5) |
          (this.pal       << 4)
        );
    }
    throw new Error("Invalid OAMdata index");
  }
  setOAMdata(i,v) {
    switch(i) {
      case 0:
        this.y = v - 16;
        return;
      case 1:
        this.x = v - 8;
        return;
      case 2:
        this.tile = v;
        return;
      case 3:
        this.priority = (v & 0b10000000) !== 0;
        this.flipY    = (v & 0b01000000) !== 0;
        this.flipX    = (v & 0b00100000) !== 0;
        this.pal      = (v & 0b00010000) !== 0;
        return;
    }
    throw new Error("Invalid OAMdata index");
  }
  isVisible() {
    return (this.x >= 0) && (this.y >= 0) &&
           (this.x <= SCREEN_SIZE[0]) && (this.y <= SCREEN_SIZE[1]);
  }
  isEmpty() {
    let oami = 0;
    let acc = 0;
    for(let i = 0; i<=3; i++) {
      this.acc += this.getOAMdata(i++);
    }
    return (acc === 0);
  }
}

export default class PPU {
  constructor(gb, id) {
    this.gb = gb;
    this.canvas = new PixelCanvas(id, SCREEN_SIZE);

    //init vram and oam
    this.vram = new Uint8Array(0x2000).fill(0);
    this.oam = new Uint8Array(0xA0).fill(0);

    //from light to dark
    this.pallete = [
      hexToRgb('#fafbf6'),
      hexToRgb('#c6b7be'),
      hexToRgb('#565a75'),
      hexToRgb('#0f0f1b'),
      hexToRgb('#ff0000') //used for debugging
    ];

    //ppu state machine counters
    this.cycles = 0;
    this.line = 0;
    this.mode = 2;

    // SPRITES
    this.oamCache = [];
    for(let i = 0; i < 40; i++) {
      this.oamCache.push(new OAMObject());
    }
    this.lineSprites = [];

    // BG
    this.tileCache = [];
    this.bgpal = [0,1,2,3];
    this.scx = 0;
    this.scy = 0;

    // WINDOW
    this.wx = 8;
    this.wy = 0;
    this.wly = 0;
    this._window = false;

    // LCDC REGISTERS
    this.lcdon = false;
    this.tileDataArea = false;
    this.bgMapArea = false;
    this.winMapArea = false;
    this.winEnable = false;
    this.objSize = false;
    this.objEnable = false;
    this.bgWinEnable = false;

    this.lyc = 0;
    this.lcdstat = false;

    // STAT
    this.intLYC = false;
    this.intOAM = false;
    this.intVBlank = false;
    this.intHBlank = false;
    this.lycEq = false;
  }

  handleSTATirq() {
    const lcdstat = (this.intLYC && this.lycEq) || (this.intOAM && (this.mode === MODE_OAM)) || (this.intVBlank && (this.mode === MODE_VBLANK)) || (this.intHBlank && (this.mode === MODE_HBLANK));
    if(lcdstat && !(this.lcdstat)) {
      this.gb.cpu.irq.if |= 0x02; //raise lcdstat
    }
    this.lcdstat = lcdstat;
  }

  writeVRAM(addr, val) {
    if((this.mode !== MODE_VRAM) || this.gb.stubLY) {
      this.vram[addr] = val;
      if(addr <= 0x17FF) {
        this.updateTile(addr)
      }
    }
  }
  readVRAM(addr) {
    if((this.mode !== MODE_VRAM) || this.gb.stubLY) {
      return (this.vram[addr] | 0);
    } else {
      return 0xFF;
    }
  }

  writeOAM(addr, val) {
    addr -= 0xFE00;
    this.oam[addr] = val;
    this.oamCache[addr >> 2].setOAMdata(addr & 3, val);
  }
  readOAM(addr) {
    return this.oam[addr - 0xFE00];
    /*return this.oam[addr >> 2].getOAMdata(addr & 3, val);*/
  }

  set bgp(v) {
    this.bgpal[0] = (v & 0b00000011);
    this.bgpal[1] = (v & 0b00001100) >> 2;
    this.bgpal[2] = (v & 0b00110000) >> 4;
    this.bgpal[3] = (v & 0b11000000) >> 6;
  }
  get bgp() {
    return (
      this.bgpal[0] |
      (this.bgpal[1] << 2) |
      (this.bgpal[2] << 4) |
      (this.bgpal[3] << 6)
    )
  }

  set stat(v) {
    this.intLYC    = (v & 0b01000000) !== 0;
    this.intOAM    = (v & 0b00100000) !== 0;
    this.intVBlank = (v & 0b00010000) !== 0;
    this.intHBlank = (v & 0b00001000) !== 0;
  }
  get stat() {
    return (
      (this.intLYC    << 6) |
      (this.intOAM    << 5) |
      (this.intVBlank << 4) |
      (this.intHBlank << 3) |
      (this.lycEq     << 2) |
      this.mode
    );
  }

  set lcdc(v) {
    this.lcdon        = (v & 0b10000000) !== 0;
    this.winMapArea   = (v & 0b01000000) !== 0;
    this.winEnable    = (v & 0b00100000) !== 0;
    this.tileDataArea = (v & 0b00010000) !== 0;
    this.bgMapArea    = (v & 0b00001000) !== 0;
    this.objSize      = (v & 0b00000100) !== 0;
    this.objEnable    = (v & 0b00000010) !== 0;
    this.bgWinEnable  = (v & 0b00000001) !== 0;
  }
  get lcdc() {
    return (
      (this.lcdon        << 7) |
      (this.winMapArea   << 6) |
      (this.winEnable    << 5) |
      (this.tileDataArea << 4) |
      (this.bgMapArea    << 3) |
      (this.objSize      << 2) |
      (this.objEnable    << 1) |
      (this.bgWinEnable  << 0)
    )
  }

  updateTile(addr) {
    const index = Math.floor(addr / 16);
    const y = Math.floor((addr & 0xF) / 2);

    addr &= 0xFFFE; //each line is 2 bytes
    const lower = this.vram[addr];
    const upper = this.vram[addr+1];

    let arr = this.tileCache;
    if(!arr[index]) { arr[index] = []; }
    if(!arr[index][y]) { arr[index][y] = []; }

    let sx;
    //let _t = '';
    for(let x = 0; x < 8; x++) {
      sx = 1 << (7 - x);
      arr[index][y][x] = ((lower & sx) ? 1 : 0) | ((upper & sx) ? 2 : 0);
      //_t += arr[index][y][x] ? '⬜' : '⬛';
    }
    //console.log(index+' '+_t)
  }
  drawLine() {
    //Bg
    const h = (this.line + this.scy);
    const mapAreaRaw = (this.bgMapArea ? 0x1C00 : 0x1800);
    const mapArea = mapAreaRaw + (((h & 0xFF) >> 3) << 5);
    const y = (h & 7);
    let x = (this.scx & 7);
    let lineStart = (this.scx >> 3);
    let tileIndex = this.vram[mapArea+lineStart];
    if(!(this.tileDataArea) && tileIndex < 128){ tileIndex += 0x100 };
    let tile = this.tileCache[tileIndex][y];

    //Win
    if(this.line == this.wy) {
      this._window = true;
    }
    const winCondY = (this.winEnable && this._window && (this.wx < (SCREEN_SIZE[0] + 7)));
    let windowX = false;
    const wY = (this.wly & 7);
    let wX = 0;
    let wLineStart = 0;
    const wMapAreaRaw = (this.winMapArea ? 0x1C00 : 0x1800);
    const wMapArea = wMapAreaRaw + (((this.wly & 0xFF) >> 3) << 5);
    let wTileIndex = this.vram[wMapArea+wLineStart];
    if(!(this.tileDataArea) && wTileIndex < 128){ wTileIndex += 0x100 };
    let wTile = this.tileCache[wTileIndex][wY];
    if(winCondY) {
      this.wly++;
    }

    //Sprites
    let csprites;
    if(this.objEnable) {
      csprites = new Array(SCREEN_SIZE[0]).fill(0);
      for(const obj of this.lineSprites) {
        let tile = this.tileCache[obj.tile][Math.min(this.line - obj.y, 7)];
        if(!tile){let DEBUG = obj.tile;debugger;}
        for(let i = 0; i < 8; i++) {
          if(tile[i]){
            csprites[obj.x+i] = (tile[i] << 1) | obj.priority;
          }
        }
      }
    }

    //Draw
    let cl = this.canvas.lineStart(this.line);
    for(let i=0; i < SCREEN_SIZE[0]; i++) {
      let color;
      if(((i + 7) == this.wx) || (this.wx == 166)){
        windowX = true;
      }
      let isWin = windowX && winCondY;
      if(isWin) {
        color = this.bgWinEnable ? wTile[wX] : 0;
        wX++;
        if(wX >= 8) {
          wLineStart = (wLineStart + 1) & 31;
          wX = 0;
          wTileIndex = this.vram[wMapArea+wLineStart];
          if(!(this.tileDataArea) && wTileIndex < 128){ wTileIndex += 0x100 };
          wTile = this.tileCache[wTileIndex][wY];
        }
        //color = 4
      } else {
        let data = this.bgWinEnable ? tile[x] : 0;
        color = this.bgpal[data];
        x += 1;
        if(x >= 8) {
          lineStart = (lineStart + 1) & 31;
          x = 0;
          tileIndex = this.vram[mapArea+lineStart];
          if(!(this.tileDataArea) && tileIndex < 128){ tileIndex += 0x100 };
          tile = this.tileCache[tileIndex][y];
        }
      }
      let pix = this.pallete[color];
      if(this.objEnable) {
        if(csprites[i] >> 1) {
          if(!((csprites[i] & 1) && (color !== 0))) {
            pix = csprites[i] >> 1;
          }
        }
      }
      cl.linePut(pix[0],pix[1],pix[2]);
    }
  }
  scanOAM() {
    if(this.objEnable) {
      const s = this.lineSprites;
      s.length = 0;
      for(const [i,v] of Object.entries(this.oamCache)) {
        const ydiff = (this.line - v.y);
        if((ydiff >= 0) && (ydiff < 8)) {
          s.push(v);
        }
      }
      s.sort((a,b) => {
        return b.x - a.x;
      });
      s.length = Math.min(s.length, 10);
      /*this.lineSprites.length = 0;
      for(const [i,v] of Object.entries(s)) {
        for(let p = 0; p < 8; p++) {
          this.lineSprites[v.x + p] = v;
        }
      }*/
    }
  }
  step(c) {
    this.lycEq = (this.lyc === this.line);
    this.handleSTATirq();
    if(!this.lcdon) {
      this.cycles = 0;
      this.mode = 0;
      this.line = 0;
      this.wly = 0;
      return;
    }
    this.cycles += c;
    switch(this.mode){
      case MODE_HBLANK:
        if(this.cycles >= 204) {
          this.cycles -= 204;
          if(this.line == 143) {
            this.mode = MODE_VBLANK;
            this.canvas.blit();
            this.gb.frame = true;
            this.gb.cpu.irq.if |= 0x01;
          } else {
            this.mode = MODE_OAM;
          }
          this.line++;
        }
        break;
      case MODE_VBLANK:
        if(this.cycles >= 456) {
          this.cycles -= 456;
          this.line++;
          if(this.line > 154) {
            this.mode = MODE_OAM;
            this.line = 0;
            this.wly = 0;
            this._window = false;
            this.scanOAM();
          }
        }
        break;
      case MODE_OAM:
        if(this.cycles >= 80) {
          this.cycles -= 80;
          this.mode = MODE_VRAM;
        }
        break;
      case MODE_VRAM:
        if(this.cycles >= 172) {
          this.cycles -= 172;
          this.mode = MODE_HBLANK;
          this.drawLine();
        }
        break;
      default:
        throw new Error("Invalid PPU mode");
    }
    //console.log(this.line)
  }
  debugTileset(id) {
    const el = document.getElementById(id);
    const pc = new PixelCanvas(id, el.width, el.height);
    let dx = 0;
    let dy = 0;
    let w = 17;
    //const [i,v] of this.tileCache.entries()
    for(let i=0;i<=0x17E;i++) {
      let v = this.tileCache[i];
      for(let y = 0; y < 8; y++){
        for(let x = 0; x < 8; x++){
          let c = (v ? this.pallete[v[y][x]] : this.pallete[0]);
          pc.setArr(dx+x*2+0, dy+y*2+0, c);
          pc.setArr(dx+x*2+0, dy+y*2+1, c);
          pc.setArr(dx+x*2+1, dy+y*2+0, c);
          pc.setArr(dx+x*2+1, dy+y*2+1, c);
        }
      }
      dx += w;
      if((dx + w) >= el.width) {
        dy += w;
        dx = 0;
      }
    }
    pc.blit();
    //console.log('done');
  }
}