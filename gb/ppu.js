import PixelCanvas from './pxcanvas.js';

export default class PPU {
  constructor(gb, id) {
    this.gb = gb;
    this.screenSize = [160, 144];
    this.vram = new Array(0x2000).fill(0);
    this.canvas = new PixelCanvas(id, this.screenSize);
    this.scx = 0;
    this.scy = 0;
    this.lcdOn = true;
    this.clk = 0;
  }
  writeVRAM(addr, val) {
    this.vram[addr] = val;
  }
  readVRAM(addr, val) {
    return this.vram[addr];
  }
  tick() {

  }
}