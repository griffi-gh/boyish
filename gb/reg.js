import { toHex } from './common.js';

export class Registers {
  constructor() {
    this.r = new Uint8Array(7).fill(0);
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

  get b() { return this.r[0]; }
  get c() { return this.r[1]; }
  get d() { return this.r[2]; }
  get e() { return this.r[3]; }
  get h() { return this.r[4]; }
  get l() { return this.r[5]; }
  get a() { return this.r[6]; }

  set b(v) { this.r[0] = v; }
  set c(v) { this.r[1] = v; }
  set d(v) { this.r[2] = v; }
  set e(v) { this.r[3] = v; }
  set h(v) { this.r[4] = v; }
  set l(v) { this.r[5] = v; }
  set a(v) { this.r[6] = v; }

  get f() {
    const f = this.flags;
    return (((f.z | 0) << 7) | ((f.n | 0) << 6) | ((f.h | 0) << 5) | ((f.c | 0) << 4));
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
