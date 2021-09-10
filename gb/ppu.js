import PixelCanvas from './pxcanvas.js';

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
    this.cycles = 0;
    this.line = 0;
    this.mode = 2;
    this.lcdon = false;
    this.tileDataArea = false;
    this.bgMapArea = false;
    this.winMapArea = true;
    this.winEnable = false;
    this.objSize = false;
    this.objEnable = false;
    this.bgWinDisable
  }
  writeVRAM(addr, val) {
    this.vram[addr] = val;
  }
  readVRAM(addr) {
    return this.vram[addr];
  }
  set lcdc(v) {
    this.lcdon        = (v & 0x10000000) !== 0;
    this.winMapArea   = (v & 0x01000000) !== 0;
    this.winEnable    = (v & 0x00100000) !== 0;
    this.tileDataArea = (v & 0x00010000) !== 0;
    this.objSize      = (v & 0x00001000) !== 0;     
    this.objEnable    = (v & 0x00000100) !== 0;   
    this.bgWinEnable  = (v & 0x00000010) !== 0
  }
  get lcdc() {
    return (
      this.lcdon        << 7 |
      this.winMapArea   << 6 |
      this.winEnable    << 5 |
      this.tileDataArea << 4 |
      this.objSize      << 3 |
      this.objEnable    << 2 |
      this.bgWinEnable  << 1 
    )
  }
  step(c) {
    if(!this.lcdon) {
      this.cycles = 0;
      this.mode = 0;
      this.line = 0;
      return;
    }
    this.cycles += c;
    switch(mode){
      case MODE_HBLANK:
        if(this.cycles >= 204) {
          this.cycles -= 204;
          if(++this.line >= SCREEN_SIZE[1]) {
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
          if(++this.line > 153) {
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
        if(gpu.cycles >= 172) {
          this.cycles -= 172;
          this.mode = MODE_HBLANK;
          this.drawLine();
        }
        break;
      default:
        throw new Error("Invalid PPU mode");
    }
    console.log(this.line);
  }
}