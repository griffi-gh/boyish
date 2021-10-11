import {createAudioContext} from './common.js';

export class Channel1 {
  constructor(apu, chan) {
    this.apu = apu;
    this.ctx = apu.ctx;
    this.chan = chan;
    //
    this.gainNode = this.ctx.createGain();
    this.gainNode.gain.value = 0;
    this.oscillator = this.ctx.createOscillator();
    this.oscillator.type = 'square';
    this.oscillator.frequency.value = 1000;
    this.oscillator.connect(this.gainNode);
    this.oscillator.start(0);
    //
    this.clkLength = 0;
    this.clockEnvelop = 0;
    this.clkSweep = 0;
  }
  play() {
    if(!this.playing) {
      this.playing = true;
      this.gainNode.connect(this.ctx.destination);
      this.clkLength = 0;
      this.clockEnvelop = 0;
      this.clkSweep = 0;
    }
  }
  update(c) {
    this.clockEnvelop += c;
    this.clockSweep += c;
  }
}

export default class APU {
  constructor(gb) {
    this.gb = gb;
    try {
      this.ctx = createAudioContext();
    } catch(e) {
      console.error("Failed to create AudioContext\nDetails:");
      console.dir(e);
      throw new Error("AudioCtxFailure");
      return;
    }
    this.gbPause();
    this.chan1 = new Channel1(this, 1);
    this.chan2 = new Channel1(this, 2);
    this.enable = true;
  }
  gbPause() {
    this.ctx.suspend();
  }
  gbResume() {
    this.ctx.resume();
  }
  update(c) {
    this.chan1.update(c);
    this.chan2.update(c);
  }
  //Sound On/Off
  get NR52() {
    return (
      (this.enable << 7) |
      // (this.chan4.playing << 2) |
      // (this.chan3.playing << 2) |
      (this.chan2.playing << 1) |
      (this.chan1.playing | 0)
    )
  }
}