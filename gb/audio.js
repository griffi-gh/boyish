import {isBrowser, toHex} from './common.js';

export default class APU {
  constructor(gb) {
    this.gb = gb;
    if(!isBrowser) {
      console.warn('Not a browser. Sound disabled.')
      return;
    }
    this.enable = true;
  }
}