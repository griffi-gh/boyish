import {toHex, isBrowser, isArray, stringToArray, arrayToString} from './common.js';

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
  // Note: Rom/Ram sizes are measured in kb
  h._romSize = rom[0x148]
  h.romSize  = 32 << h._romSize;
  h._ramSize = rom[0x149];
  switch (h._ramSize) {
    default:
    case 0x00:
      h.ramSize = 0;
      break;
    case 0x01:
      //> Listed in various unofficial docs as 2KB.
      //> However, a 2KB RAM chip was never used in a cartridge.
      //> The source for this value is unknown.
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
  return h;
}

export class CartridgeNone {
  constructor(options) {
    this.name = "No MBC";
    this.options = options;
    this.rom = new Uint8Array(0x8000).fill(0);
    this.header = {}
    //copy valid header (make bootrom work)
    for(let i = 0; i <= 80; i++) {
      this.rom[0x100 + i] = validHeader[i];
    }
  }
  parseHeader() {
    this.header = parseHeader(this.rom);
    if(this.options.logInfo){
      console.log(`${this.name} (0x${toHex(this.header.type, 8)})`);
      console.log(JSON.stringify(this.header, null, 2));
    }
  }
  load(d) {
    this.rom = d.slice();
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

class CartridgeMBCBase extends CartridgeNone {
  constructor(options) {
    super(options);
    this.eram = new Uint8Array(1024).fill(0);
    this.ramBank = 0;
    this.ramEnable = false;
    this.romBank = 1;
  }
  load(d) {
    super.load(d);
    this.eram = new Uint8Array(128 * 1024).fill(0);
    this.loadEram();
    this._mask = (this.header.romSize >> 4) - 1;
  }
  readROMBank(bank, a) {
    return (this.rom[(bank * 0x4000) + (a - 0x4000)] | 0);
  }
  readRAMBank(ramBank, a) {
    return (this.eram[(a - 0xA000) + (ramBank * 0x2000)] | 0);
  }
  writeRAMBank(ramBank, a, v) {
    this.eram[(a - 0xA000) + (ramBank * 0x2000)] = v;
  }
  getSaveName(slot) {
    if(slot == null) slot = 'DEFAULT';
    const name = `SAVE_${slot}_${this.header.name.replace(' ','_')}`;
    return name;
  }
  saveEram(slot, force) {
    if(!isBrowser()) {
      console.log('Not a browser');
      return;
    }
    if(force || (this.options.battery && this.eramUnsaved)) {
      const saveSlot = this.getSaveName(slot);
      localStorage.setItem(saveSlot, arrayToString(this.eram));
      this.eramUnsaved = false;
      console.log('Saved: ' + saveSlot);
    }
  }
  loadEram(slot, force) {
    if(!isBrowser()) {
      console.log('Not a browser');
      return;
    }
    if(force || this.options.battery) {
      const saveSlot = this.getSaveName(slot);
      let data = localStorage.getItem(saveSlot);
      if(data) {
        this.eram = stringToArray(data);
        console.log('Loaded: ' + saveSlot);
      } else {
        console.warn('No save file found: ' + saveSlot);
      }
    }
  }
}

export class CartridgeMBC1 extends CartridgeMBCBase {
  constructor(options) {
    super(options);
    this.name = "MBC1";
    this.mode = 1;
  }

  read(a) {
    if(a <= 0x7FFF) {
      if(a >= 0x4000) {
        let bank = this.romBank;
        if(this.mode == 0) {
          bank += (this.ramBank << 5);
        }
        bank &= this._mask;
        return this.readROMBank(bank,a);
      } else {
        return (this.rom[a] | 0);
      }
    } else {
      if(this.ramEnable) {
        let ramBank = 0;
        if(this.mode) ramBank = this.ramBank;
        return this.readRAMBank(ramBank, a);
      } else {
        return 0;
      }
    }
    return 0;
  }
  write(a, v) {
    if(a <= 0x7FFF) {
      if(a <= 0x1FFF) {
        this.ramEnable = ((v & 0x0A) === 0x0A);
        this.saveEram()
        return;
      } else if(a <= 0x3FFF) {
        let newBank = v & 0x1F;
        newBank = ((newBank === 0) ? 1 : v);
        this.romBank = newBank;
        return;
      } else if(a <= 0x5FFF) {
        this.ramBank = v & 3;
        return;
      } else {
        this.mode = v & 1;
        return;
      }
    } else if((a >= 0xA000) && (a <= 0xBFFF)) {
      if(this.ramEnable) {
        let ramBank = 0;
        if(this.mode === 1) ramBank = this.ramBank;
        this.writeRAMBank(ramBank, a, v);
        if(this.options.battery) {
          this.eramUnsaved = true;
        }
      }
      return;
    }
  }
}

export class CartridgeMBC3 extends CartridgeMBCBase {
  constructor(options) {
    super(options);
    this.name = "MBC3";
    this.romBank = 1;
    //this.rtcSelect = 8;
  }
  read(a) {
    if(a <= 0x3FFF) {
      return this.rom[a];
    } else if(a <= 0x7FFF) {
      return this.readROMBank(this.romBank, a);
    } else {
      if(this.ramEnable) {
        return this.readRAMBank(this.ramBank, a);
      }
      return 0xff;
    }
  }
  write(a,v) {
    if(a <= 0x1FFF) {
      this.ramEnable = ((v & 0x0A) === 0x0A);
      this.saveEram();
      return;
    } else if(a <= 0x3FFF) {
      let bank = v & this._mask;
      bank = (bank === 0) ? 1 : bank;
      this.romBank = bank;
      return;
    } else if(a <= 0x5FFF) {
      if((v >= 0x08) && (v <= 0x0C)) {
        //this.rtcSelect = v;
        throw new Error("RTC not done yet");
      } else {
        this.ramBank = v & 3;
      }
      return;
    } else if (a >= 0xA000) {
      if(this.ramEnable) {
        this.writeRAMBank(this.ramBank, a, v);
        if(this.options.battery) {
          this.eramUnsaved = true;
        }
      }
      return;
    }
  }
}

export default function newCartridge(i,o) {
  if(i == null)  i = 0;
  if(isArray(i)) i = i[0x147];
  let options = o || {};
  switch (i) {
    case 0x13: //MBC3+RAM+BATTERY
      options.battery = true;
    case 0x12: //MBC3+RAM
    case 0x11: //MBC3
      return new CartridgeMBC3(options);
    default:
      console.error('Invalid MBC type: ' + i.toString(16));
      console.warn('Falling back to MBC1+RAM+BATTERY');
    case 0x03: //MBC1+RAM+BATTERY
      options.battery = true;
    case 0x02: //MBC1+RAM
    case 0x01: //MBC1
      return new CartridgeMBC1(options);
    case 0x00: //No MBC
      return new CartridgeNone(options);
  }
}