import {createAudioContext} from './common.js';

const SOUND_LENGTH_UNIT = 0x4000;
const SWEEP_STEP_LENGTH = 0x8000;
const ENVELOPE_STEP_LENGTH = 0x8000;

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
    this._enabled = false;
    this._freq = 0;
    // LENGTH
    this.clkLength = 0;
    this.lengthCheck = false;
    this.soundLength = 64;
    // ENVELOPE
    this.clkEnvelop = 0;
    this.envelopeCheck = false;
    this.envelopeSign = 1;
    this.envelopeStep = 0;
    // SWEEP (CH1)
    this.clkSweep = 0;
    this.sweepTime = 0;
    this.sweepCount = 0;
    this.sweepShifts = 0;
    this.sweepSign = 0;
  }
  get frequency() { return _freq; }
  set frequency(v) {
    this._freq = v;
    this.oscillator.frequency.value = 131072 / (2048 - v);
  }
  setLength(v) {
    this.soundLength = 64 - (v & 0x3F);
  }
  calcSweepFreq() {
    let freq = this.frequency;
    if(this.chan === 2) return freq;
    freq += this.sweepSign * (freq >> this.sweepShifts);
    if(freq > 0x7FF) {
      this.stop();
      return 0;
    }
    return freq;
  }
  setEnvelopeVolume(vol) {
    this.envelopeCheck = (vol > 0) && (vol < 16);
    this.envelopeVolume = vol;
    this.gainNode.gain.value = vol * .01;
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
    this.clkEnvelop += c;
    this.clkSweep += c;
    if(this.chan === 1) {
      if((this.sweepCount || this.sweepTime) && (this.clockSweep > (SWEEP_STEP_LENGTH * this.sweepTime))) {
        this.clkSweep -= SWEEP_STEP_LENGTH * this.sweepTime;
        this.sweepCount--;
        let freq = this.calcFreqSweep();
        this.frequency = freq;
        this.calcFreqSweep();
      }
    }
    if(this.envelopeCheck && (this.clockEnvelop > ENVELOPE_STEP_LENGTH)) {
      this.clkEnvelop -= this.envelopeStepLength;
      this.envelopeStep--;
      this.setEnvelopeVolume(this.envelopeVolume + this.envelopeSign);
      if (this.envelopeStep <= 0) {
        this.envelopeCheck = false;
      }
    }
    if (this.lengthCheck) {
      this.clkLength += c;
      if (this.clockLength > SOUND_LENGTH_UNIT) {
        this.soundLength--;
        this.clkLength -= SOUND_LENGTH_UNIT;
        if(this.soundLength <= 0) {
          this.soundLength = 64;
          this.stop();
        }
      }
    }
  }
  disable() {
    if(!this._enabled) return;
    this._enabled = false;
    this.oscillator.disconnect();
  }
  enable() {
    if(this._enabled) return;
    this._enabled = true;
    this.oscillator.connect(this.gainNode);
  }
  set nr13(v) {
    this.frequency = (this.frequency & 0x700) | v;
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
  write(a,v) {
    if(this.enable || (a === 0xFF26)) {
      switch(a) {
        case 0xFF13:
          this.chan1.nr13 = v;
          return;
        case 0xFF26:
          this.enable = (v & 0xb10000000) !== 0;
          return;
      }
    }
  }
  read(a,v) {
    if(this.enable || (a === 0xFF26)) {
      switch(a) {
        case 0xFF26:
          return (
            (this.enable << 7) |
            // (this.chan4.playing << 2) | // NYI
            // (this.chan3.playing << 2) | // NYI
            (this.chan2.playing << 1) |
            (this.chan1.playing | 0)
          );
      }
    }
    return 0xFF;
  }
}