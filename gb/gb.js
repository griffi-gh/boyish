import { toHex, downloadString } from './common.js';

import CPU from './cpu.js';
import MMU from './mmu.js';
import PPU from './ppu.js';

const CYCLES_PER_FRAME = 70224;

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
    this.disableLog = true;
    this.breakpoints = [];
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
  setBreakpoint(addr) {
    this.breakpoints[addr] = true;
  }
  loadROM(data) {
    this.mmu.loadROM(data);
    console.log('Rom loaded');
  }
  step() {
    const cpu = this.cpu;
    try {
      while(cpu.cycles < CYCLES_PER_FRAME) {
        if(this.breakpoints[this.cpu.reg.pc]) {
          console.log("breakpoint " + toHex(this.cpu.reg.pc, 16) + " hit");
          delete this.breakpoints[this.cpu.reg.pc];
          this.pause();
          return;
        }
        const c = this.cpu.step();
        this.ppu.step(c);
      }
      cpu.cycles -= CYCLES_PER_FRAME;
    } catch(e) {
      console.log(e.name + ': ' + e.message);
      console.log(e.stack);
      this.pause();
      return;
    }
  }
}