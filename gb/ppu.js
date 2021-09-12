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
    const mapArea = (this.bgMapArea ? 0x1C00 : 0x1800);
    let y = (this.line + this.scy) & 7;
    let x = this.scx & 7;
    let t = (this.scx >> 3) & 31;
    let tile = this.tileCache[this.vram[mapArea+t]][y];
    for(let i=0; i < SCREEN_SIZE[0]; i++) {
      let pix = this.pallete[tile[x]];
      this.canvas.setArr(i, this.line, pix);
      x++;
      if(x >= 8) {
        t = (t + 1) & 31;
        x = 0;
        tile = this.tileCache[this.vram[mapArea+t]][y]; 
        //console.log(toHex(mapArea+t, 16));
        //tile = this.tileCache[t][y]; 
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
          if(this.line == 143) {
            this.mode = MODE_VBLANK;
            this.canvas.blit();
          } else {
            this.mode = MODE_OAM;
          }
          this.line++;
          this.cycles = 0;
        }
        break;
      case MODE_VBLANK:
        if(this.cycles >= 456) {
          this.cycles = 0;
          this.line++;
          if(this.line > 154) {
            this.mode = MODE_OAM;
            this.line = 0;
          }
        }
        break;
      case MODE_OAM:
        if(this.cycles >= 80) {
          this.cycles = 0;
          this.mode = MODE_VRAM;
        }
        break;
      case MODE_VRAM:
        if(this.cycles >= 172) {
          this.cycles = 0;
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
    for(const [i,v] of this.tileCache.entries()) {
      for(let y=0;y<8;y++){
        for(let x=0;x<8;x++){
          pc.setArr(dx+x, dy+y, this.pallete[v[y][x]]);
        }
      }
      dx += 9;
      if(dx>=el.width) {
        dy += 9;
        dx = 0;
      }
    }
    pc.blit();
    console.log('done');
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
  /*const index = Math.floor(addr / 16);
    const y = Math.floor((addr & 0xF) / 2);

    addr &= 0xFFFE;
    const lower = this.vram[addr];
    const upper = this.vram[addr+1];

    if(!(index in this.tileCache)) {
      this.tileCache[index] = [];
    }
    const tci = this.tileCache[index];

    let sx;
    for(let x = 7; x >= 0; x--) {
      if(!(y in tci)) { tci[y] = []; }
      sx = 1 << x;
      tci[y][7 - x] = ((lower & sx) ? 1 : 0) | ((upper & sx) ? 2 : 0);
    }*/

    /*let saddr = addr;
    if(addr & 1) { saddr--; addr--; }
    let tile = (addr >> 4) & 511;
    let y = (addr >> 1) & 7;
    let sx;
    if(!(tile in this.tileCache)){ this.tileCache[tile] = []; }
    if(!(y in this.tileCache[tile])){ this.tileCache[tile][y] = []; }
    for(let x = 0; x < 8; x++) {
      sx = 1 << (7 - x);
      this.tileCache[tile][y][x] = ((this.vram[saddr] & sx) ? 1 : 0) | ((this.vram[saddr+1] & sx) ? 2 :0);
    }*/
