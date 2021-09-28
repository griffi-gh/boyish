//Vblank Lcdstat Timer Serial Joypad
const VEC = [0x40, 0x48, 0x50, 0x58, 0x60];

export class Interrupts {
  constructor(gb) {
    this.gb = gb;
    this.imePending = false;
    this.ime = false;
    this.ie = 0;
    this.if = 0;
  }

  //debug
  /*set if(v) { this._if = v; }
  get if() { return this._if; }*/

  enableIME(now) {
    if(now) {
      this.ime = true
    } else if(this.imePending === false) {
      this.imePending = 2;
    }
  }
  disableIME() {
    this.ime = false;
    this.imePending = false;
  }

  dispatchInterrupt(i) {
    const cpu = this.gb.cpu;
    const mmu = this.gb.mmu;
    const addr = VEC[i];
    //Unhalt
    this.gb.state = this.gb.STATE_RUNNING;
    //Call vec
    cpu.reg.sp -= 2;
    mmu.writeWord(cpu.reg.sp, cpu.reg.pc);
    cpu.reg.pc = addr;
    //flip IF bit and disable IME
    this.if &= (~(1 << i)) & 0xFF;
    this.disableIME();
    //log
    //console.log('INT 0x'+addr.toString(16)+' '+i)
  }

  tick() {
    if(this.imePending) {
      if((--this.imePending) <= 0) {
        this.imePending = false;
        this.ime = true;
      }
    }
    let t = (this.ie & this.if);
    if(t !== 0) {
      if(this.ime) {
        for(let i = 0; i < 5; i++) {
          if(t & (1 << i)) {
            this.dispatchInterrupt(i);
            return 20;
          }
        }
      } else {
        if(this.gb.state == this.gb.STATE_HALT) {
          this.gb.state = this.gb.STATE_RUNNING;
        }
      }
    }
    return 0;
  }
}