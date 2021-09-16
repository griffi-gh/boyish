import PixelCanvas from './pxcanvas.js';
import { toHex, i8 } from './common.js';

const SCREEN_SIZE = [160, 144];

const MODE_HBLANK = 0;
const MODE_VBLANK = 1;
const MODE_OAM = 2;
const MODE_VRAM = 3;

const DATA_AREA_8800 = false;
const DATA_AREA_8000 = true;

const MAP_AREA_9800 = false;
const MAP_AREA_9C00 = true;

const OBJ_SIZE_8 = false;
const OBJ_SIZE_16 = true;

export default class PPU {
  constructor(gb, id) {
    this.gb = gb;
    this.vram = new Uint8Array(0x2000).fill(0);
    this.canvas = new PixelCanvas(id, SCREEN_SIZE);

    this.pallete = [
      [202,220,159],
      [155,185,15],
      [109,142,15],
      [58,108,15]
    ];

    this.cycles = 0;
    this.line = 0;
    this.mode = 2;

    this.tileCache = [];

    //LCDC REGISTERS
    this.lcdon = false;
    this.tileDataArea = false;
    this.bgMapArea = false;
    this.winMapArea = false;
    this.winEnable = false;
    this.objSize = false;
    this.objEnable = false;
    this.bgWinEnable = false;
  }
  writeVRAM(addr, val) {
    this.vram[addr] = val;
    if(addr <= 0x17FF) {
      this.updateTile(addr)
    }
  }
  readVRAM(addr) {
    return this.vram[addr];
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
      this.lcdon        << 7 |
      this.winMapArea   << 6 |
      this.winEnable    << 5 |
      this.tileDataArea << 4 |
      this.bgMapArea    << 3 |
      this.objSize      << 2 |
      this.objEnable    << 1 |
      this.bgWinEnable  << 0
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
    const h = (this.line + this.scy);
    const mapAreaRaw = (this.bgMapArea ? 0x1C00 : 0x1800);
    const mapArea = mapAreaRaw + (((h & 0xFF)>>3)<<5);
    const y = (h & 7);
    let x = (this.scx & 7);
    let lineStart = (this.scx >> 3);
    let tileIndex = this.vram[mapArea+lineStart];

    //Draw
    let drawOffset = this.canvas.getLineOffset(this.line, 0);
    const img = this.canvas.img.data;

    if(!(this.tileDataArea) && tileIndex < 128){ tileIndex += 0x100 };
    let tile = this.tileCache[tileIndex][y];
    for(let i=0; i < SCREEN_SIZE[0]; i++) {
      let pix = this.pallete[tile[x]];
      // DRAW
      img[drawOffset] = pix[0];
      img[drawOffset + 1] = pix[1];
      img[drawOffset + 2] = pix[2];
      drawOffset += 4;
      // DRAW
      x += 1;
      if(x >= 8) {
        lineStart = (lineStart + 1) & 31;
        x = 0;
        tileIndex = this.vram[mapArea+lineStart];
        if(!(this.tileDataArea) && tileIndex < 128){ tileIndex += 0x100 };
        tile = this.tileCache[tileIndex][y]; 
      }
    }
  }
  step(c) {
    if(!this.lcdon) {
      this.cycles = 0;
      this.mode = 0;
      this.line = 0;
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
            this.gb.cpu.irq.if |= 1;
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
    for(let i=0;i<=0x7F;i++) {
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