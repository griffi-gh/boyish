import {isArray} from './common.js';

const validHeader = new Uint8Array([0x00, 0xC3, 0x37, 0x06, 0xCE, 0xED, 0x66, 0x66, 0xCC, 0x0D, 0x00, 0x0B, 0x03, 0x73, 0x00, 0x83, 0x00, 0x0C, 0x00, 0x0D, 0x00, 0x08, 0x11, 0x1F, 0x88, 0x89, 0x00, 0x0E, 0xDC, 0xCC, 0x6E, 0xE6, 0xDD, 0xDD, 0xD9, 0x99, 0xBB, 0xBB, 0x67, 0x63, 0x6E, 0x0E, 0xEC, 0xCC, 0xDD, 0xDC, 0x99, 0x9F, 0xBB, 0xB9, 0x33, 0x3E, 0x43, 0x50, 0x55, 0x5F, 0x49, 0x4E, 0x53, 0x54, 0x52, 0x53, 0x00, 0x00, 0x00, 0x00, 0x00, 0x80, 0x00, 0x00, 0x00, 0x01, 0x01, 0x00, 0x00, 0x00, 0x00, 0x3B, 0xF5, 0x30]);

export function parseHeader(rom) {
  let h = {};
  h.name = '';
  for(let i = 0x0134; i <= 0x0143; i++) {
    const v = rom[i];
    if(v) {
      h.name += String.fromCharCode(v)
    } else {
      break;
    }
  }
  h.type = rom[0x147];
  h._romSize = rom[0x148]
  h.romSize  = 32 << h._romSize;
  h._ramSize = rom[0x149];
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
    this.rom = new Uint8Array(0x8000).fill(0);
    this.header = {}
    this.parseHeader();
    //copy valid header (make bootrom work)
    for(let i = 0; i <= 80; i++) {
      this.rom[0x100 + i] = validHeader[i];
    }
  }
  parseHeader() {
    this.header = parseHeader(this.rom);
    console.log(JSON.stringify(this.header, null, 2));
  }
  load(d) {
    this.rom.fill(0x00);
    const size = Math.max(d.length, 0x8000);
    for(let i = 0; i <= size; i++) {
      this.rom[i] = (d[i] | 0);
    }
    this.parseHeader();
  }
  read(a) {
    if(a <= 0x7FFF) {
      return this.rom[a];
    }
    return 0;
  }
  write(a, v) {}
}

export class CartridgeMBC1 extends CartridgeNone {
  constructor() {
    super();
    
    this.ramBank = 0;
    this.ramEnable = false;

    this.romBank = 1;
    this.romBankAmount = Math.ceil(this.rom / 0x4000);

    this.mode = 0;
  }
  write(a, v) {
    if((a >= 0x2000) && (a <= 0x3FFF)) {
      v &= 0x1F;
      v = ((v == 0) ? 1 : v);
      this.romBank = v;
      return;
    } else if((a >= 0x6000) && (a <= 0x7FFF)) {
      this.mode = v & 1;
      return;
    }
  }
  read(a) {
    if(a <= 0x7FFF) {
      if(a >= 0x4000) {
        const ra = (this.romBank * 0x4000) + (a % 0x4000);
        return (this.rom[ra] | 0);
      } else {
        return (this.rom[a] | 0);
      }
    }
    return 0;
  }
}

export default function Cartridge(i,...args) {
  if(i == null)  i = 0;
  if(isArray(i)) i = i[0x147];
  switch (i) {
    case 0x00:
      console.log(i+'No MBC');
      return new CartridgeNone(args);
    case 0x01:
    case 0x02:
    case 0x03:
      console.log(i+'MBC1');
      return new CartridgeMBC1(args);
    default:
      throw new Error('Invalid MBC type: ' + i.toString(16));
  }
}