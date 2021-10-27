import {createAudioContext} from './common.js';
import './lib/Tone.js';

const SOUND_LENGTH_UNIT = 0x4000;
const SWEEP_STEP_LENGTH = 0x8000;
const ENVELOPE_STEP_LENGTH = 0x8000;
const FREQ_CLAMP = 22000;
const WAVE_WIDTHS = new Float64Array([0.75, 0.5, 0, -0.5]);

class Channel1 {
  constructor(apu, chan) {
    this.apu = apu;
    this.ctx = apu.ctx;
    this.chan = chan;
    // Tone.js objects
    this.panGain = new Tone.Gain().connect(apu.gain)
    this.pan = new Tone.Panner().connect(this.panGain);
    this.gain = new Tone.Gain().connect(this.pan);
    this.pulse = new Tone.PulseOscillator(0,0).connect(this.gain);
    //
    this._enabled = false;
    this._freq = 0;
    this._waveDuty = 0xb10;
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
    this.pulse.frequency.setValueAtTime(Math.min(Math.max(131072 / (2048 - v),-FREQ_CLAMP),FREQ_CLAMP));
  }
  set waveDuty(v) {
    this._waveDuty = v;
    this.pulse.width.setValueAtTime(WAVE_WIDTHS[v]);
  }
  get waveDuty() {
    return this._waveDuty;
  }
  setLength(v) {
    this.soundLength = 64 - (v & 0x3F);
  }
  calcSweepFreq() {
    let freq = this.frequency;
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
    this.gain.gain.setValueAtTime(vol * .01);
  }
  play() {
    if(!this.playing) {
      this.playing = true;
      this.pulse.connect(this.gain);
      this.clkLength = 0;
      this.clkEnvelope = 0;
      this.clkSweep = 0;
    }
  }
  stop() {
    if(this.playing) {
      this.playing = false;
      this.pulse.disconnect();
    }
  }
  update(c) {
    if(this.chan !== 2) {
      this.clkSweep += c;
      if((this.sweepCount || this.sweepTime) && (this.clkSweep >= (SWEEP_STEP_LENGTH * this.sweepTime))) {
        this.clkSweep -= SWEEP_STEP_LENGTH * this.sweepTime;
        this.sweepCount--;
        let freq = this.calcSweepFreq();
        this.frequency = freq;
        this.calcSweepFreq();
      }
    }
    this.clkEnvelope += c;
    if(this.envelopeCheck && (this.clkEnvelope > ENVELOPE_STEP_LENGTH)) {
      this.clkEnvelope -= ENVELOPE_STEP_LENGTH;
      this.setEnvelopeVolume(this.envelopeVolume + this.envelopeSign);
      //console.log(this.envelopeVolume)
      this.envelopeStep--;
      if(this.envelopeStep <= 0) this.envelopeCheck = false;
      if(!this.envelopeCheck) {
        this.envelopeStep = this.envelopeStepValue;
      }
    }
    this.clkLength += c;
    if(this.lengthCheck) {
      if(this.clkLength >= SOUND_LENGTH_UNIT) {
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
    this.pulse.stop();
  }
  enable() {
    if(this._enabled) return;
    this._enabled = true;
    this.pulse.start();
  }

  setOutputTerminals(so1,so2) {
    // << SO2 LEFT << >> SO1 RIGHT >>
    this.panGain.gain.setValueAtTime(Math.min(1,so1+so2));
    this.pan.pan.setValueAtTime((so1|0) - (so2|0));
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
    this.setLength(v);
    this.waveDuty = (v & 0xC0) >> 6;
  }
  get nr1() {
    return this.waveDuty << 6;
  }

  set nr2(v) {
    this.envelopeSign = (v & 0b1000) ? 1 : -1;
    this.setEnvelopeVolume((v & 0xF0) >> 4);
    this.envelopeStepValue = v & 0b111;
    this.envelopeStep = this.envelopeStepValue;
    this.envelopeCheck = this.envelopeStep > 0;
  }
  get nr2() {
    return (
      (this.envelopeVolume << 4) |
      (this.envelopeSign << 3) |
      this.envelopeStepValue
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
    this.lengthCheck = (v & 0x40) !== 0;
    if(v & 0b10000000) this.play();
  }
  get nr4() {
    return this.lengthCheck << 6;
  }
}

class Channel3 {
  constructor(apu) {
    
  }
}

export default class APU {
  constructor(gb) {
    this.gb = gb;
    this.panner = new Tone.Panner().toDestination();
    this.gain = new Tone.Gain().connect(this.panner);
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
    this.chan1.disable();
    this.chan2.disable();
    this.panner.disconnect();
  }
  enable() {
    this.chan1.enable();
    this.chan2.enable();
    this.panner.toDestination();
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