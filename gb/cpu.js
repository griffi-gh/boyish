import { Registers } from './reg.js'
import { Interrupts } from './interrupts.js';
import { OPS, CB_OPS } from './cpu_ops.js';
import * as c from './common.js';
const toHex = c.toHex;

export default class CPU {
  constructor(gb) {
    this.gb = gb;
    this.reg = new Registers();
    this.irq = new Interrupts(gb);
    //this.cycles = 0;
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
      irq: this.irq,
    };
    Object.assign(this.OPContext, c); //copy all Common functions
  }
  log() {
    if(this.gb.disableLog) { return; }
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
    let cycles = 0;
    if(!this.gb.state) { //If state is 0
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
        let [icycles, next] = OPC[op].call(this.OPContext, this.reg.pc);
        this.reg.pc = next & 0xFFFF;
        cycles += icycles;
      } else {
        console.error(`Unimplemented instruction: ${isCB ? 'CB ' : ''}${toHex(op)}`);
        throw new Error("UnimplementedInstr");
        return;
      }
    } else {
      cycles += 4;
    }
    cycles += this.irq.tick();
    return cycles;
  }
}