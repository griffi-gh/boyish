import CPU from './cpu.js';
import MMU from './mmu.js';
import PPU from './ppu.js';

const CYCLES_PER_FRAME = 70224;

function downloadString(text = '', fileName = 'download.txt', fileType = 'text/plain') {
  const blob = new Blob([text], { type: fileType });
  const a = document.createElement('a');
  a.download = fileName;
  a.href = URL.createObjectURL(blob);
  a.dataset.downloadurl = [fileType, a.download, a.href].join(':');
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(function() { URL.revokeObjectURL(a.href); }, 1500);
}

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
    this.paused = true;
    this.STATE_RUNNING = 0;
    this.STATE_HALT = 1;
    this.STATE_STOP = 2;
    this.state = this.STATE_RUNNING;
    this.logData = '';
    this.disableLog = false;
  }
  log(str) {
    if(!this.disableLog) {
      this.logData += str.toString();
    }
  }
  flushLog() {
    console.log(this.logData);
    this.logData = '';
  }
  downloadLog() {
    downloadString(this.logData, 'log.txt');
    this.logData = '';
  }
  stateChange(state) {
    this.state = state;
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
    const cpu = this.cpu;
    try {
      while(cpu.cycles < CYCLES_PER_FRAME) {
        const c = this.cpu.step();
        this.ppu.step(c);
      }
      cpu.cycles -= CYCLES_PER_FRAME;
    } catch(e) {
      this.pause();
      return;
    }
  }
}

/*const canvas = new PixelCanvas(id, 160, 144);
canvas.setPixel(10, 10, 255, 0, 0);
canvas.blit();*/