import {OPS, CB_OPS} from './cpu_ops.js';
import * as c from './common.js';
const toHex = c.toHex;

export class Registers {
  constructor() {
    this.a = 0;
    this.b = 0;
    this.c = 0;
    this.d = 0;
    this.e = 0;
    this.h = 0;
    this.l = 0;
    this.flags = {};
    this.flags.reset = (function() {
      this.z = false;
      this.n = false;
      this.h = false;
      this.c = false;
    }).bind(this.flags);
    this.flags.reset();
    this.pc = 0;
    this.sp = 0;
  }
  get f() {
    const f = this.flags;
    return f.z<<7 | f.n<<6 | f.h<<5 | f.c<<4;
  }
  set f(v) {
    let f = this.flags;
    f.z = (v & 0b10000000) !== 0;
    f.n = (v & 0b01000000) !== 0;
    f.h = (v & 0b00100000) !== 0;
    f.c = (v & 0b00010000) !== 0;
  }
  mget(a, b) {
    return this[a] << 8 | this[b];
  }
  mset(v, a, b) {
    this[a] = v >> 8; 
    this[b] = v & 0xff;
  }
  get af()  { return this.mget('a','f'); }
  get bc()  { return this.mget('b','c'); }
  get de()  { return this.mget('d','e'); }
  get hl()  { return this.mget('h','l'); }
  set af(v) { this.mset(v, 'a', 'f'); }
  set bc(v) { this.mset(v, 'b', 'c'); }
  set de(v) { this.mset(v, 'd', 'e'); }
  set hl(v) { this.mset(v, 'h', 'l'); }
}

export default class CPU {
  constructor(gb) {
    this.gb = gb;
    this.reg = new Registers();
  }
  postInit() {
    this.OPContext = {
      c: c,
      gb: this.gb,
      cpu: this,
      reg: this.reg,
      r: this.reg,
      f: this.reg.flags,
      ppu: this.gb.ppu,
      mmu: this.gb.mmu,
    };
    Object.assign(this.OPContext, c); //copy all Common functions
  }
  log() {
    const m = this.gb.mmu;
    const r = this.reg;
    this.gb.log(
      `A: ${ toHex(r.a) } F: ${ toHex(r.f) } `+
      `B: ${ toHex(r.b) } C: ${ toHex(r.c) } `+
      `D: ${ toHex(r.d) } E: ${ toHex(r.e) } `+
      `H: ${ toHex(r.h) } L: ${ toHex(r.l) } `+
      `SP: ${ toHex(r.sp, 16) } PC: 00:${ toHex(r.pc, 16) } `+
      `(${ toHex(m.read(r.pc)) } ${ toHex(m.read(r.pc+1)) } `+
      `${ toHex(m.read(r.pc+2)) } ${ toHex(m.read(r.pc+3)) })`+'\n'
    )
  }
  step() {
    if(!this.gb.state) { //If state isn't 0
      this.log();
      let op = this.gb.mmu.read(this.reg.pc);
      let OPC = OPS;
      let isCB = false;
      if(op === 0xCB) {
        isCB = true;
        OPC = CB_OPS;
        op = this.gb.mmu.read(++this.reg.pc);
      }
      if(op in OPC) {
        try {
          let [cycles, next] = OPC[op].call(this.OPContext, this.reg.pc);
          this.reg.pc = next & 0xFFFF;
          this.cycles += cycles;
          return cycles;
        } catch(e) {
          console.log(e.name + ': ' + e.message);
          console.log(e.stack);
          throw e;
        }
      } else {
        console.error(`Unimplemented instruction: ${isCB ? 'CB ' : ''}${toHex(op)}`);
        throw new Error("UnimplementedInstr");
        return;
      }
    }
  }
}