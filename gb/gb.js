import './lib/setImmediate.js';
import {toHex, downloadString, isBrowser} from './common.js';

import CPU from './cpu.js';
import MMU from './mmu.js';
import PPU from './ppu.js';
import APU from './audio.js';
import Input from './input.js';
import Timer from './timer.js';

const CYCLES_PER_FRAME = 70224;

const PARTS = ['timer','input','mmu','cpu','ppu','apu'];

let focused = true;
if(window) {
  window.onfocus = function() {
    focused = true;
  };
  window.onblur = function() {
    focused = false;
  };
}

export class Gameboy {
  constructor(id) {
    this.mmu = new MMU(this);
    this.cpu = new CPU(this);
    this.ppu = new PPU(this, id);
    this.apu = new APU(this);
    this.input = new Input(this);
    this.timer = new Timer(this);
    //call postinit for all parts
    for (const v of PARTS) {
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

    this._enableSound = false;
  }
  set enableSound(v) {
    this._enableSound = v;
    if(!v) this.apu.gbPause();
    if(v && (!this.paused)) this.apu.gbResume();
  }
  get enableSound() { return this._enableSound; }
  destroy() {
    if(this.mmu.cart.saveEram){
      this.mmu.cart.saveEram();
    }
    this.pause();
    this.input.disable();
    this.apu.gbPause();
    this.apu.disable();
    let c = this.ppu.canvas;
    c.clear(255,255,255);
    c.blit();
    for(let i in this) delete this[i];
    Object.freeze(this);
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
      if(this._enableSound) {
        this.apu.gbResume();
      }
      this.step();
    }
  }
  pause() {
    if(!this.paused) {
      this.paused = true;
      if(this._t) { clearTimeout(this._t) };
      if(this._i) { clearImmediate(this._i) };
      if(this._a) { window.cancelAnimationFrame(this._a) }
      this.apu.gbPause();
    }
  }
  setBreakpoint(addr, val = true) {
    if(!val) { val = undefined; }
    this.breakpoints[addr] = val;
    this._brkSetP = true;
  }
  //Modes w,r,a,[undefined]
  setMMUbreakpoint(addr, mode = 'w') {
    if(!mode) { mode = undefined; }
    this.mmu.accessBreakpoints[addr] = mode;
    this._brkSetM = true;
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
  tickCompByCPU(cycles) {
    this.timer.step(cycles);
    this.ppu.step(cycles);
    this.mmu.step(cycles);
    this.apu.step(cycles);
    return cycles;
  }
  step() {
    let st = performance.now();
    const cpu = this.cpu;
    try {
      while(!this.frame || this.cycleCounter < CYCLES_PER_FRAME) {
        if(this._brkSetP) this.handleBreakpoints();
        let cycles = this.cpu.step();
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
    let diff = performance.now() - st;
    if(!this.paused) {
      switch(this.loopMode) {
        default:
        case 'vsync':
          if(focused) {
            this._a = window.requestAnimationFrame(this._step);
            break;
          }
          // fall through if isn't focused
        case 'real':
          this._t = setTimeout(this._step, 16 - diff);
          break;
        case 'fast':
          this._i = setImmediate(this._step);
          break;
      }
    }
    let tim = performance.now();
    this.perf = tim - this._ptime;
    this._ptime = tim;
  }
}