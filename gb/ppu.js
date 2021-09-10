import PixelCanvas from './pxcanvas.js';
import { toHex } from './common.js';

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
      [58,108,15], 
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
    this.lcdon        = (v >> 7) !== 0;
    this.winMapArea   = (v >> 6) !== 0;
    this.winEnable    = (v >> 5) !== 0;
    this.tileDataArea = (v >> 4) !== 0;
    this.bgMapArea    = (v >> 3) !== 0;
    this.objSize      = (v >> 2) !== 0;     
    this.objEnable    = (v >> 1) !== 0;   
    this.bgWinEnable  = (v >> 0) !== 0;
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

    addr &= 0xFFFE;
    const lower = this.vram[addr];
    const upper = this.vram[addr+1];

    if(!(index in this.tileCache)) {
      this.tileCache[index] = [];
    }
    const tci = this.tileCache[index];

    for(let x = 7; x >= 0; x--) {
      if(!(y in tci)) { tci[y] = []; }
      tci[y][7 - x] = ((lower >> x) & 1) + (((upper >> x) & 1) * 2);
    }
  }
  drawLine() {
    const l = this.line;
    const h = l + this.scy;

    const mapArea = (this.bgMapArea ? 0x1C00 : 0x1800);
    const mapOffs = mapArea + ((h & 0xFF) >> 3);
    let lineOffs = this.scx >> 3;

    let x = this.scx & 0x7;
    const y = h & 0x7;

    let tile;
    const updateTile = () => {
      tile = this.vram[mapOffs+lineOffs];
      if(this.tileDataArea && tile < 128) {
        tile = tile + 0x100;
      }
    }
    updateTile();

    for(let i=0; i < SCREEN_SIZE[0]; i++) {
      let color = 0;
      if(tile in this.tileCache) {
        const curTile = this.tileCache[tile];
        color = curTile[y][x];
      }
      this.canvas.setArr(i, l, this.pallete[color]);
      if(++x >= 8) {
        x = 0;
        lineOffs = (lineOffs + 1) & 0x1F;
        updateTile();
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
          this.line++;
          if(this.line >= SCREEN_SIZE[1]) {
            this.mode = MODE_VBLANK;
            this.canvas.blit();
          } else {
            this.mode = MODE_OAM;
          }
        }
        break;
      case MODE_VBLANK:
        if(this.cycles >= 456) {
          this.cycles -= 456;
          this.line++;
          if(this.line > 153) {
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
  }
}

/*for(let y=0; y <= 7; y++){
          let text = '';
          for(let x=0; x <= 7; x++){
            text += curTile[y][x] ? '1' : '0';
          }
          console.log(text);
        }
*/