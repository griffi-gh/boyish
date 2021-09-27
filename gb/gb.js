import './lib/setImmediate.js';

import { toHex, downloadString } from './common.js';

import CPU from './cpu.js';
import MMU from './mmu.js';
import PPU from './ppu.js';
import Input from './input.js';
import Timer from './timer.js';

const CYCLES_PER_FRAME = 70224;

export class Gameboy {
  constructor(id) {
    this.mmu = new MMU(this);
    this.cpu = new CPU(this);
    this.ppu = new PPU(this, id);
    this.input = new Input(this);
    this.timer = new Timer(this);
    //call postinit for all parts
    for (const v of ['timer','input','mmu','cpu','ppu']) {
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
    this.pause();
    setImmediate(() => {
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
    if(this._t) { clearTimeout(this._t) };
    if(this._i) { clearImmediate(this._i) };
    if(this._a) { window.cancelAnimationFrame(this._a) }
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
    this.cpu.reg.pc = 0x0100;
    this.cpu.irq.ie = 0x00;
    this.cpu.irq.if = 0xE1;
    this.ppu.lcdc = 0x91;
    this.ppu.stat = 0x85;
    this.ppu.bgp = 0xFC;
    this.ppu.line = 0;
    this.ppu.cycles = 0;
    this.timer.clk.div = 0xABCC;
    this.input.joyp = 0xCF;
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
        this.timer.step(cycles);
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
          this._a = window.requestAnimationFrame(this._step);
          return;
        case 'fast':
          this._i = setImmediate(this._step);
          return;
        default: // fall through
        case 'real':
          this._t = setTimeout(this._step, 16.6 - this.perf);
          return;
      }
    }
  }
}