export default class Timer {
  constructor(gb) {
    this.gb = gb;
    this.main = 0;
    this.clocks = [
      1 << 9,
      1 << 3,
      1 << 5,
      1 << 7,
    ];
    this.clk = {
      div: 0,
      tima: 0,
    };
    this.enable = false;
    this.rate = 0;
    this._timaInc = false;
    this.tma = 0x00;
    this.timaResetPending = false;
  }
  get div() { return (this.clk.div >> 8); }
  set div(v) { this.clk.div = 0; }
  get tima() { return this.clk.tima; }
  set tima(v) {
    this.clk.tima = v;
    this.timaResetPending = false;
  }
  get tac() {
    return this.rate | (this.enable << 2);
  }
  set tac(v) {
    this.enable = (v & 0b100) >> 2;
    this.rate = (v & 0b011);
  }
  step(cycles) {
    const m = (cycles / 4);
    for(let i = 0; i < m; i++) {
      this.tick();
    }
  }
  tick(cycles = 4) {
    if(this.gb.state === this.gb.STATE_STOP) {
      this.clk.div = 0;
    } else {
      if(this.timaResetPending) {
        this.timaResetPending = false;
        this.clk.tima = this.tma;
        this.gb.cpu.irq.if |= 0b100;
      }
      this.clk.div += cycles;
      this.clk.div &= 0xFFFF;
      let divBit = (!!(this.clk.div & this.clocks[this.rate])) | 0;
      let timaInc = !!(divBit & (this.enable | 0));
      if(this._timaInc && !timaInc) {
        this.clk.tima++;
        if(this.clk.tima > 0xFF) {
          this.clk.tima = 0;
          this.timaResetPending = true;
        }
      }
      this._timaInc = timaInc;
    }
  }
}