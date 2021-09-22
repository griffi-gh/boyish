import './lib/setImmediate.js';

import { toHex, downloadString } from './common.js';

import CPU from './cpu.js';
import MMU from './mmu.js';
import PPU from './ppu.js';
import Input from './input.js';

const CYCLES_PER_FRAME = 70224;

export class Gameboy {
  constructor(id) {
    this.mmu = new MMU(this);
    this.cpu = new CPU(this);
    this.ppu = new PPU(this, id);
    this.input = new Input(this);
    //call postinit for all parts
    for (const v of ['input','mmu','cpu','ppu']) {
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
    this.cycleCounter = 0;
    this._step = () => { this.step(); };

    this.frame = false;
    this.loopMode = 'vsync';

    this.pause();
  }
  destroy() {
    setImmediate(() => {
      this.pause();
      this.input.disable();
      let c = this.ppu.canvas;
      c.clear(255,255,255);
      c.blit();
    });
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
    if(this.paused) {
      this.paused = false;
      this.step();
    }
  }
  pause() {
    this.paused = true;
  }
  setBreakpoint(addr, val = true) {
    if(!val) { val = undefined; }
    this.breakpoints[addr] = val;
  }
  //Modes w,r,a,[undefined]
  setMMUbreakpoint(addr, mode = 'w') {
    if(!mode) { mode = undefined; }
    this.mmu.accessBreakpoints[addr] = mode;
  }
  loadROM(data) {
    this.mmu.loadROM(data);
    console.log('Rom loaded');
  }
  skipBoot() {
    this.cpu.reg.af = 0x01B0;
    this.cpu.reg.bc = 0x0013;
    this.cpu.reg.de = 0x00D8;
    this.cpu.reg.hl = 0x014D;
    this.cpu.reg.sp = 0xFFFE;
    this.cpu.reg.pc = 0x0101;
    this.ppu.lcdc = 0x91;
    this.ppu.line = 0;
    this.ppu.cycles = 0;
    this.mmu.write(0xFF50, 1); //disable bootrom
    for(let i = 0; i < 0x2000; i++) {
      this.ppu.writeVRAM(i, 0)
    }
  }
  handleBreakpoints() {
    if(this.breakpoints[this.cpu.reg.pc]) {
      console.log(`Breakpoint at ${toHex(this.cpu.reg.pc, 16)} hit`);
      this.pause();
      debugger;
      return;
    }
  }
  step() {
    this.perf = performance.now();
    const cpu = this.cpu;
    try {
      while(!this.frame || this.cycleCounter < CYCLES_PER_FRAME) {
        this.handleBreakpoints();
        let cycles = this.cpu.step();
        this.ppu.step(cycles);
        this.cycleCounter += cycles;
      }
      this.cycleCounter -= CYCLES_PER_FRAME;
    } catch(e) {
      console.log(e.name + ': ' + e.message);
      console.log(e.stack);
      this.pause();
      return;
    }
    this.frame = false;
    this.perf = performance.now() - this.perf;
    if(!this.paused) {
      switch(this.loopMode) {
        case 'vsync':
          window.requestAnimationFrame(this._step);
          return;
        case 'fast':
          setImmediate(this._step);
          return;
        default: // fall through
        case 'real':
          setTimeout(this._step, 16.6 - this.perf);
          return;
      }
    }
  }
}