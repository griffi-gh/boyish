import {toHex} from './common.js';

export const bios = [
  0x31, 0xFE, 0xFF, 0xAF, 0x21, 0xFF, 0x9F, 0x32, 0xCB, 0x7C, 0x20, 0xFB, 0x21, 0x26, 0xFF, 0x0E,
  0x11, 0x3E, 0x80, 0x32, 0xE2, 0x0C, 0x3E, 0xF3, 0xE2, 0x32, 0x3E, 0x77, 0x77, 0x3E, 0xFC, 0xE0,
  0x47, 0x11, 0x04, 0x01, 0x21, 0x10, 0x80, 0x1A, 0xCD, 0x95, 0x00, 0xCD, 0x96, 0x00, 0x13, 0x7B,
  0xFE, 0x34, 0x20, 0xF3, 0x11, 0xD8, 0x00, 0x06, 0x08, 0x1A, 0x13, 0x22, 0x23, 0x05, 0x20, 0xF9,
  0x3E, 0x19, 0xEA, 0x10, 0x99, 0x21, 0x2F, 0x99, 0x0E, 0x0C, 0x3D, 0x28, 0x08, 0x32, 0x0D, 0x20,
  0xF9, 0x2E, 0x0F, 0x18, 0xF3, 0x67, 0x3E, 0x64, 0x57, 0xE0, 0x42, 0x3E, 0x91, 0xE0, 0x40, 0x04,
  0x1E, 0x02, 0x0E, 0x0C, 0xF0, 0x44, 0xFE, 0x90, 0x20, 0xFA, 0x0D, 0x20, 0xF7, 0x1D, 0x20, 0xF2,
  0x0E, 0x13, 0x24, 0x7C, 0x1E, 0x83, 0xFE, 0x62, 0x28, 0x06, 0x1E, 0xC1, 0xFE, 0x64, 0x20, 0x06,
  0x7B, 0xE2, 0x0C, 0x3E, 0x87, 0xF2, 0xF0, 0x42, 0x90, 0xE0, 0x42, 0x15, 0x20, 0xD2, 0x05, 0x20,
  0x4F, 0x16, 0x20, 0x18, 0xCB, 0x4F, 0x06, 0x04, 0xC5, 0xCB, 0x11, 0x17, 0xC1, 0xCB, 0x11, 0x17,
  0x05, 0x20, 0xF5, 0x22, 0x23, 0x22, 0x23, 0xC9, 0xCE, 0xED, 0x66, 0x66, 0xCC, 0x0D, 0x00, 0x0B,
  0x03, 0x73, 0x00, 0x83, 0x00, 0x0C, 0x00, 0x0D, 0x00, 0x08, 0x11, 0x1F, 0x88, 0x89, 0x00, 0x0E,
  0xDC, 0xCC, 0x6E, 0xE6, 0xDD, 0xDD, 0xD9, 0x99, 0xBB, 0xBB, 0x67, 0x63, 0x6E, 0x0E, 0xEC, 0xCC,
  0xDD, 0xDC, 0x99, 0x9F, 0xBB, 0xB9, 0x33, 0x3E, 0x3c, 0x42, 0xB9, 0xA5, 0xB9, 0xA5, 0x42, 0x4C,
  0x21, 0x04, 0x01, 0x11, 0xA8, 0x00, 0x1A, 0x13, 0xBE, 0x20, 0xFE, 0x23, 0x7D, 0xFE, 0x34, 0x20,
  0xF5, 0x06, 0x19, 0x78, 0x86, 0x23, 0x05, 0x20, 0xFB, 0x86, 0x20, 0xFE, 0x3E, 0x01, 0xE0, 0x50
];

export default class MMU {
  constructor(gb){
    this.gb = gb;
    this.init();
  }
  init() {
    this.rom  = new Uint8Array(0x8000).fill(0x00);
    this.wram = new Uint8Array(0x2000).fill(0x00);
    this.eram = new Uint8Array(0x2000).fill(0x00);
    this.hram = new Uint8Array(0x7F).fill(0x00);
    this.disableBios = false;
    //load logo into ROM for testing
    for(let i=0;i<=0x30;i++) {
      this.rom[0x0104 + i] = bios[0x00a8 + i];
    }
  }
  read(addr) {
    addr &= 0xFFFF;
    switch (addr) {
      case 0xFF50:
        return ((this.disableBios | 0) & 0xFF);
      case 0xFF44:
        return this.gb.ppu.line;
      default:
        if (addr <= 0xFF) {
          if (this.disableBios === false) {
            return bios[addr];
          } else {
            return this.rom[addr];
          }
        } else if (addr <= 0x7FFF) {
          return this.rom[addr];
        } else if (addr <= 0x9FFF) {
          return this.gb.ppu.readVRAM(addr - 0x8000);
        } else if (addr <= 0xBFFF) {
          return this.eram[addr - 0xA000]; // External RAM
        } else if (addr <= 0xDFFF) {
          return this.wram[addr - 0xD000]; // Work RAM
        } else if (addr <= 0xFDFF) {
          return this.wram[addr - 0xE000]; // Echo
        } else if (addr >= 0xFF80 && addr <= 0xFFFE) {
          return this.hram[addr - 0xFF80]; // High Ram
        }
    }
    this.gb.log(`[MMU] READ Addr 0x${toHex(addr,16)} isn't mapped to anything`+'\n');
    return 0;
  }
  write(addr, val) {
    addr &= 0xFFFF;
    val  &= 0xFF;
    switch (addr) {
      case 0xFF50:
        console.log('BIOS Reg written')
        this.disableBios = (val | 0);
        break;
      default:
        if (addr <= 0xFF) {
          if (this.disableBios !== false) {
            this.rom[addr] = val;
          }
        } else if (addr <= 0x7FFF) {
          this.rom[addr] = val;
        } else if (addr <= 0x9FFF) {
          this.gb.ppu.writeVRAM(addr - 0x8000, val);
        } else if (addr <= 0xBFFF) {
          this.eram[addr - 0xA000] = val; // External RAM
        } else if (addr <= 0xDFFF) {
          this.wram[addr - 0xD000] = val; // Work RAM
        } else if (addr <= 0xFDFF) {
          this.wram[addr - 0xE000] = val; // Echo
        } else if (addr >= 0xFF80 && addr <= 0xFFFE) {
          this.hram[addr - 0xFF80] = val; // High Ram
        } else {
          this.gb.log(`[MMU] WRITE Addr 0x${toHex(addr,16)} isn't mapped to anything`+'\n');
        }
    }
    
  }
  readWord(addr) {
    return (this.read(addr) | this.read(addr+1) << 8);
  }
  writeWord(addr, val) {
    val &= 0xFFFF;
    this.write(addr, val & 0xFF);
    this.write(addr + 1, val >> 8);
  }
}