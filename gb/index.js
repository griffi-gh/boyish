import CPU from './cpu.js';
import MMU from './mmu.js';
import PPU from './ppu.js';

export class Gameboy {
  constructor(id) {
    this.mmu = new MMU(this);
    this.cpu = new CPU(this);
    this.ppu = new PPU(this, id);
    //call postinit for all parts
    for (const v of ['mmu','cpu','ppu']) {
      const init = this[v].postInit;
      if (typeof init === "function") { init.apply(this[v]); }
    }
  }
  step() {
    this.cpu.step();
  }
}

/*const canvas = new PixelCanvas(id, 160, 144);
canvas.setPixel(10, 10, 255, 0, 0);
canvas.blit();*/