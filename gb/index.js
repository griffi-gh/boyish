import CPU from './cpu.js';
import MMU from './mmu.js';
import PPU from './ppu.js';

export class Gameboy {
  constructor(id) {
    this.stop = true;
    this.mmu = new MMU(this);
    this.cpu = new CPU(this);
    this.ppu = new PPU(this, id);
    //call postinit for all parts
    for (const v of ['mmu','cpu','ppu']) {
      const init = this[v].postInit;
      if (typeof init === "function") { init.apply(this[v]); }
    }
    this.paused = true;
  }
  resume() {
    if(this.paused === true) {
      this.paused = false;
      this.interval = setInterval(() => { this.step(); }, 0);
    }
  }
  pause() {
    if(this.paused === false) {
      clearTimeout(this.interval);
      this.interval = null;
      this.paused = true;
    }
  }
  step() {
    try {
      this.cpu.step();
    } catch(e) {
      this.pause();
      return;
    }
  }
}

/*const canvas = new PixelCanvas(id, 160, 144);
canvas.setPixel(10, 10, 255, 0, 0);
canvas.blit();*/