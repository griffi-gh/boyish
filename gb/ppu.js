import PixelCanvas from './pxcanvas.js';

export default class PPU {
  constructor(gb, id) {
    this.gb = gb;
    this.screenSize = [160, 144];
    this.vram = new Array(0x2000).fill(0);
    this.canvas = new PixelCanvas(id, this.screenSize);
  }
}