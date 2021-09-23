import {isArray} from './common.js';

function parseHeader(data) {
  let h = {};
  h.name = '';
  for(let i = 0x0134; i <= 0x0143; i++) {
    h.name += String.fromCharCode(data[i])
  }
  h.type = data[0x147];
  h._romSize = data[0x148]
  h.romSize  = 32 << h._romSize;
  h._ramSize = data[0x149];
  switch (h._ramSize) {
    default:
    case 0x00:
      h.ramSize = 0;
      break;
    case 0x01:
      // Listed in various unofficial docs as 2KB.
      // However, a 2KB RAM chip was never used in a cartridge.
      // The source for this value is unknown.
      h.ramSize = 2;
      break;
    case 0x02:
      h.ramSize = 8;
      break;
    case 0x03:
      h.ramSize = 32;
      break;
    case 0x04:
      h.ramSize = 128;
      break;
    case 0x05:
      h.ramSize = 64;
      break;
  }
  h.ramSize *= 1024
  return h;
}

export class CartridgeNone {
  constructor() {
    this.data = new Uint8Array(0x8000).fill(0);
    this.header = {}
  }
  parseHeader() {
    this.header = parseHeader();
  }
  load(arr) {
    this.data.fill(0x00);
    const size = Math.max(d.length, 0x8000);
    for(let i = 0; i <= size; i++) {
      this.rom[i] = (d[i] | 0);
    }
    this.parseHeader();
  }
  read(a) {
    if(a <= 0x7FFF) {
      return this.data[a];
    }
    return 0;
  }
  write(a, v) {}
}

export class CartridgeMBC1 extends Cartridge {
  constructor() {
    super();
    
    this.ramBank = 0;
    this.ramEnable = false;

    this.romBank = 1;
    this.romBankAmount = Math.ceil(this.data / 0x4000);
  }
  write(a, v) {
    if((a >= 0x2000) && (a <= 0x3FFF)) {
      v &= 0x1F;
      v = ((v == 0) ? 1 : v);
      this.romBank = v;
      return;
    }
  }
  read(a) {
    if(a <= 0x7FFF) {
      if(a >= 0x4000) {
        const ra = (this.romBank * 0x4000) + (a % 0x4000);
        return this.data[ra]
      } else {
        return this.data[a];
      }
    }
    return 0;
  }
}

export default function Cartridge(i) {
  if(isArray(i)) {
    i = i[0x147];
  }
  switch (i) {
    case 0x00:
      return CartridgeNone;
    case 0x01:
    case 0x02:
    case 0x03:
      return CartridgeMBC1;
    default:
      throw new Error('Invalid MBC type: ' + i.toString(16));
  }
}