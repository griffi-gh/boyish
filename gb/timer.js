export default class Timer {
  constructor(gb) {
    this.gb = gb;
    this.main = 0;
    this.clk = {
      div: 0
    }
  }
  get div() { return this.clk.div; }
  set div(v) { this.clk.div = 0; }
  step(cycles) {
    if(this.gb.state === this.gb.STATE_STOP) {
      this.clk.div = 0;
    } else {
      this.clk.div += Math.floor(cycles / 4);
      this.clk.div &= 0xFF;
    }
  }
}