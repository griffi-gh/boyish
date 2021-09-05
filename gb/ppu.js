import PixelCanvas from './pxcanvas.js';
import {u8, u16} from './common.js';

export default class PPU {
  constructor(gb, id) {
    this.gb = gb;
    this.screenSize = [160, 144];
    this.vram = new Array(0x2000).fill(0);
    this.canvas = new PixelCanvas(id, this.screenSize);
  }
  writeVRAM(addr, val) {
    this.vram[addr] = val;
  }
  readVRAM(addr, val) {
    return this.vram[addr];
  }
}