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
    this.clkEnvelope = 0;
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
  get frequency() {
    return this._freq;
  }
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
  stop() {
    if(this.playing) {
      this.playing = false;
      this.gainNode.disconnect();
    }
  }
  update(c) {
    if(this.chan === 1) {
      this.clkSweep += c;
      if((this.sweepCount || this.sweepTime) && (this.clockSweep > (SWEEP_STEP_LENGTH * this.sweepTime))) {
        this.clkSweep -= SWEEP_STEP_LENGTH * this.sweepTime;
        this.sweepCount--;
        let freq = this.calcFreqSweep();
        this.frequency = freq;
        this.calcFreqSweep();
      }
    }
    this.clkEnvelope += c;
    if(this.envelopeCheck && (this.clockEnvelop > ENVELOPE_STEP_LENGTH)) {
      this.clkEnvelope -= this.envelopeStepLength;
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

  set nr0(v) {
    this.sweepTime = (v & 0b1110000) >> 4;
    this.sweepSign = (v & 0b1000) ? -1 : 1;
    this.sweepShifts = v & 0b111;
    this.sweepCount = this.sweepShifts;
    this.clkSweep = 0;
  }
  get nr0() {
    return (
      (this.sweepTime << 4) |
      ((this.sweepSign === -1) << 3) |
      this.sweepShifts
    );
  }

  set nr1(v) {
    this.setLength(v & 0b111111);
    // todo Wave Pattern Duty
  }
  get nr1() {
    return 0b10000000;
  }

  set nr2(v) {
    this.envelopeSign = (v & 0b1000) ? 1 : -1;
    this.setEnvelopeVolume((v & 0xF0) >> 4);
    this.envelopeStep = v & 0b111;
  }
  get nr2() {
    return (
      (this.envelopeVolume << 4) |
      (this.envelopeSign << 3) |
      this.envelopeStep
    )
  }

  set nr3(v) {
    this.frequency = (this.frequency & 0x700) | v;
  }
  get nr3() {
    return 0xFF; // Write-only
  }

  set nr4(v) {
    this.frequency = (this.frequency & 0xff) | ((v & 0b111) << 8);
    this.lengthCheck = (v & 0b01000000) !== 0;
    if(v & 0b10000000) this.play();
  }
  get nr4() {
    return this.lengthCheck << 6;
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
    this.chan1 = new Channel1(this, 1);
    this.chan2 = new Channel1(this, 2);
    this.enabled = true;
    this.gbDisable = true;
  }
  gbPause() {
    this.gbDisable = true;
    this.disable();
  }
  gbResume() {
    this.gbDisable = false;
    this.enable();
  }

  disable() {
    this.ctx.suspend();
    this.chan1.disable();
    this.chan2.disable();
  }
  enable() {
    this.ctx.resume();
    this.chan1.enable();
    this.chan2.enable();
  }

  set enabled(v) {
    this._enabled = !!v;
    v ? this.enable() : this.disable();
  }
  get enabled() {
    return this._enabled;
  }

  step(c) {
    if((!this.enabled) || this.gbDisable) return;
    this.chan1.update(c);
    this.chan2.update(c);
  }
  write(a,v) {
    if(this.gbDisable) return;
    if(this.enabled || (a === 0xFF26)) {
      switch(a) {
        case 0xFF10:
          this.chan1.nr0 = v;
          return;
        case 0xFF11:
          this.chan1.nr1 = v;
          return;
        case 0xFF12:
          this.chan1.nr2 = v;
          return;
        case 0xFF13:
          this.chan1.nr3 = v;
          return;
        case 0xFF14:
          this.chan1.nr4 = v;
          return;
        case 0xFF16:
          this.chan2.nr1 = v;
          return;
        case 0xFF17:
          this.chan2.nr2 = v;
          return;
        case 0xFF18:
          this.chan2.nr3 = v;
          return;
        case 0xFF19:
          this.chan2.nr4 = v;
          return;
        case 0xFF26:
          this.enabled = (v & 0b10000000) !== 0;
          return;
      }
    }
  }
  read(a,v) {
    if(this.gbDisable) return 0;
    if(this.enabled || (a === 0xFF26)) {
      switch(a) {
        case 0xFF10:
          return this.chan1.nr0;
        case 0xFF11:
          return this.chan1.nr1;
        case 0xFF12:
          return this.chan1.nr2;
        case 0xFF13:
          return this.chan1.nr3;
        case 0xFF14:
          return this.chan1.nr4;
        case 0xFF16:
          return this.chan2.nr1;
        case 0xFF17:
          return this.chan2.nr2;
        case 0xFF18:
          return this.chan2.nr3;
        case 0xFF19:
          return this.chan2.nr4;
        case 0xFF26:
          if(!this.enabled) return 0;
          return (
            (this.enabled << 7) |
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