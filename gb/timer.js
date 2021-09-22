export default class Timer {
  constructor(gb) {
    this.gb = gb;
    this.div;
  }
  step(cycles) {
    this.div += Math.floor(cycles / 4);
    this.div &= 0xFF;
  }
}