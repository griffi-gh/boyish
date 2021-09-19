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
    //Call vec
    cpu.reg.sp -= 2;
    mmu.writeWord(cpu.reg.sp, cpu.reg.pc);
    cpu.reg.pc = addr;
    //flip IF bit and disable IME
    this.if ^= (1 << i);
    this.disableIME();
    //log
    console.log('INT 0x'+addr.toString(16)+' '+i)
  }

  tick() {
    if(this.imePending) {
      if((--this.imePending) <= 0) {
        this.imePending = false;
        this.ime = true;
        console.log('ime on')
      }
    }
    const t = (this.ie & this.if);
    if(this.ime && (t !== 0)) {
      for(let i = 0; i <= 7; i++) {
        if(t & (1 << i)) {
          this.dispatchInterrupt(i);
          return 20;
        }
      }
    }
    return 0;
  }
}