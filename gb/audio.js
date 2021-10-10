import {createAudioContext, isBrowser, toHex} from './common.js';

export default class APU {
  constructor(gb) {
    this.gb = gb;
    try {
      this.ctx = createAudioContext();
      this.ctx.suspend();
    } catch(e) {
      console.error("Failed to create AudioContext\nDetails:");
      console.dir(e);
      return;
    }
    this.enable = true;
  }
}