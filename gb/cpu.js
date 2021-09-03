import {OPS, CB_OPS} from './cpu_ops.js';
import * as c from './common.js';

export class Registers {
  constructor() {
    this.a = 0;
    this.b = 0;
    this.c = 0;
    this.d = 0;
    this.e = 0;
    this.h = 0;
    this.l = 0;
    this.flags = {
      z: false,
      n: false,
      h: false,
      c: false,
    };
    this.pc = 0;
    this.sp = 0;
  }
  get f() {
    const f = this.flags;
    return f.z<<7 | f.n<<6 | f.h<<5 | f.c<<4;
  }
  set f(v) {
    let f = this.flags;
    f.z = !!(v & 0b10000000 >> 7);
    f.n = !!(v & 0b01000000 >> 6);
    f.h = !!(v & 0b00100000 >> 5);
    f.c = !!(v & 0b00010000 >> 4);
  }
  mget(a, b) {
    return this[a] << 8 | this[b];
  }
  mset(v, a, b) {
    this[a] = v << 8; 
    this.f = v & 0xff;
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
    this.halt = false;
  }
  postInit() {
    this.OPContext = {
      c: c,
      gb: this.gb,
      cpu: this,
      reg: this.reg,
      ppu: this.gb.ppu,
      mmu: this.gb.mmu,
    };
    Object.assign(this.OPContext, c); //copy all Common functions
  }
  step() {
    const op = this.gb.mmu.read(this.reg.pc);
    console.log(`op 0x${op.toString(16)} at 0x${this.reg.pc.toString(16)}`);
    if(op in OPS) {
      let [cycles, next] = OPS[op].call(this.OPContext, this.reg.pc);
      this.reg.pc = c.u16(next);
    } else {
      console.error("Unimplemented instruction!");
      throw new Error("Unimplemented instruction!");
      //this.gb.stop = true;
      return;
    }
  }
}