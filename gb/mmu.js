import newCartridge from './cartridge.js';
import {toHex} from './common.js';

export const bios = new Uint8Array([
  0x31, 0xFE, 0xFF, 0xAF, 0x21, 0xFF, 0x9F, 0x32, 0xCB, 0x7C, 0x20, 0xFB, 0x21, 0x26, 0xFF, 0x0E,
  0x11, 0x3E, 0x80, 0x32, 0xE2, 0x0C, 0x3E, 0xF3, 0xE2, 0x32, 0x3E, 0x77, 0x77, 0x3E, 0xFC, 0xE0,
  0x47, 0x11, 0x04, 0x01, 0x21, 0x10, 0x80, 0x1A, 0xCD, 0x95, 0x00, 0xCD, 0x96, 0x00, 0x13, 0x7B,
  0xFE, 0x34, 0x20, 0xF3, 0x11, 0xD8, 0x00, 0x06, 0x08, 0x1A, 0x13, 0x22, 0x23, 0x05, 0x20, 0xF9,
  0x3E, 0x19, 0xEA, 0x10, 0x99, 0x21, 0x2F, 0x99, 0x0E, 0x0C, 0x3D, 0x28, 0x08, 0x32, 0x0D, 0x20,
  0xF9, 0x2E, 0x0F, 0x18, 0xF3, 0x67, 0x3E, 0x64, 0x57, 0xE0, 0x42, 0x3E, 0x91, 0xE0, 0x40, 0x04,
  0x1E, 0x02, 0x0E, 0x0C, 0xF0, 0x44, 0xFE, 0x90, 0x20, 0xFA, 0x0D, 0x20, 0xF7, 0x1D, 0x20, 0xF2,
  0x0E, 0x13, 0x24, 0x7C, 0x1E, 0x83, 0xFE, 0x62, 0x28, 0x06, 0x1E, 0xC1, 0xFE, 0x64, 0x20, 0x06,
  0x7B, 0xE2, 0x0C, 0x3E, 0x87, 0xE2, 0xF0, 0x42, 0x90, 0xE0, 0x42, 0x15, 0x20, 0xD2, 0x05, 0x20,
  0x4F, 0x16, 0x20, 0x18, 0xCB, 0x4F, 0x06, 0x04, 0xC5, 0xCB, 0x11, 0x17, 0xC1, 0xCB, 0x11, 0x17,
  0x05, 0x20, 0xF5, 0x22, 0x23, 0x22, 0x23, 0xC9, 0xCE, 0xED, 0x66, 0x66, 0xCC, 0x0D, 0x00, 0x0B,
  0x03, 0x73, 0x00, 0x83, 0x00, 0x0C, 0x00, 0x0D, 0x00, 0x08, 0x11, 0x1F, 0x88, 0x89, 0x00, 0x0E,
  0xDC, 0xCC, 0x6E, 0xE6, 0xDD, 0xDD, 0xD9, 0x99, 0xBB, 0xBB, 0x67, 0x63, 0x6E, 0x0E, 0xEC, 0xCC,
  0xDD, 0xDC, 0x99, 0x9F, 0xBB, 0xB9, 0x33, 0x3E, 0x3C, 0x42, 0xB9, 0xA5, 0xB9, 0xA5, 0x42, 0x3C,
  0x21, 0x04, 0x01, 0x11, 0xA8, 0x00, 0x1A, 0x13, 0xBE, 0x20, 0xFE, 0x23, 0x7D, 0xFE, 0x34, 0x20,
  0xF5, 0x06, 0x19, 0x78, 0x86, 0x23, 0x05, 0x20, 0xFB, 0x86, 0x20, 0xFE, 0x3E, 0x01, 0xE0, 0x50
]);

export default class MMU {
  constructor(gb){
    this.gb = gb;
    this.init();
  }
  init() {
    this.cart = newCartridge(0, {logInfo: false});
    this.cart.parseHeader();
    this.wram = new Uint8Array(0x2000).fill(0x00);
    this.eram = new Uint8Array(0x2000).fill(0x00);
    this.hram = new Uint8Array(0x7F).fill(0x00);
    this.disableBios = false;
    this.accessBreakpoints = [];
    this._oamTransfer = false;
    this._oamValue = 0;
  }
  loadROM(d) {
    this.cart = newCartridge(d[0x147], {logInfo: true});
    this.cart.load(d);
  }
  handleBreakpoints(t,addr,val) {
    if(addr in this.accessBreakpoints) {
      const b = this.accessBreakpoints[addr];
      if(b === t || b === 'a') {
        console.log('Address 0x' + toHex(addr,16) + (t === 'r' ? 'read' : 'write = ') + (val ? toHex(val,8) : ''));
        let ctx = this.gb.cpu.OPContext; //import opcontext
        debugger;
      }
    }
  }
  read(addr, force) {
    addr &= 0xFFFF;
    if(this.gb._brkSetM) this.handleBreakpoints('r', addr);
    if((!force) && this._oamTransfer) {
      if(!((addr >= 0xFF80 && addr <= 0xFFFE) || (addr == 0xFF46))) {
        return 0xFF;
      }
    }
    switch (addr) {
      case 0xFF00:
        return this.gb.input.joyp;
      case 0xFF04:
        return this.gb.timer.div;
      case 0xFF05:
        return this.gb.timer.tima;
      case 0xFF06:
        return this.gb.timer.tma;
      case 0xFF07:
        return this.gb.timer.tac;
      case 0xFF0F:
        return this.gb.cpu.irq.if | 0;
      case 0xFF40:
        return this.gb.ppu.lcdc;
      case 0xFF41:
        return this.gb.ppu.stat;
      case 0xFF42:
        return this.gb.ppu.scy | 0;
      case 0xFF43:
        return this.gb.ppu.scx | 0;
      case 0xFF44:
        if(this.gb.stubLY) {
          return 0x90;
        } else {
          return this.gb.ppu.line | 0;
        }
      case 0xFF45:
        return this.gb.ppu.lyc | 0;
      case 0xFF46:
        return this._oamValue;
      case 0xFF47:
        return this.gb.ppu.bgp;
      case 0xFF48:
        return this.gb.ppu.obp0;
      case 0xFF49:
        return this.gb.ppu.obp1;
      case 0xFF4A:
        return this.gb.ppu.wy;
      case 0xFF4B:
        return this.gb.ppu.wx;
      case 0xFF4D:
        return 0xFF; //DMG Mode
      case 0xFF50:
        return ((this.disableBios | 0) & 0xFF);
      case 0xFFFF:
        return this.gb.cpu.irq.ie | 0;
      //AUDIO:
      case 0xFF10:
      case 0xFF11:
      case 0xFF12:
      case 0xFF13:
      case 0xFF14:
      case 0xFF26:
        return this.gb.apu.read(addr);
      default:
        if (addr <= 0xFF) {
          if (this.disableBios === false) {
            return bios[addr] | 0;
          } else {
            return this.cart.read(addr);
          }
        } else if (addr <= 0x7FFF) {
          return this.cart.read(addr);
        } else if (addr <= 0x9FFF) {
          return this.gb.ppu.readVRAM(addr - 0x8000, force);
        } else if (addr <= 0xBFFF) {
          return this.cart.read(addr); // External RAM
        } else if (addr <= 0xFDFF) {
          return this.wram[addr & 0x1FFF] | 0; // Work RAM and Echo RAM
        } else if (addr <= 0xFE9F) {
          return this.gb.ppu.readOAM(addr, force);
        } else if (addr >= 0xFF80 && addr <= 0xFFFE) {
          return this.hram[addr - 0xFF80] | 0; // High Ram
        }
    }
    this.gb.log(`[MMU] READ Addr 0x${toHex(addr,16)} isn't mapped to anything`+'\n');
    return 0;
  }
  write(addr, val, force) {
    addr &= 0xFFFF;
    val  &= 0xFF;
    if(this.gb._brkSetM) this.handleBreakpoints('w', addr, val);
    if((!force) && this._oamTransfer) {
      if(!( (addr >= 0xFF80 && addr <= 0xFFFE) || (addr === 0xFF46) )) {
        return;
      }
    }
    switch (addr) {
      case 0xFF00:
        this.gb.input.joyp = val;
        return;
      case 0xFF04:
        this.gb.timer.div = 0;
        return;
      case 0xFF05:
        this.gb.timer.tima = val;
        break;
      case 0xFF06:
        this.gb.timer.tma = val;
        break;
      case 0xFF07:
        this.gb.timer.tac = val;
        break;
      case 0xFF0F:
        this.gb.cpu.irq.if = val;
        return;
      case 0xFF40:
        this.gb.ppu.lcdc = val;
        return;
      case 0xFF41:
        this.gb.ppu.stat = val;
        return;
      case 0xFF42:
        this.gb.ppu.scy = val;
        return;
      case 0xFF43:
        this.gb.ppu.scx = val;
        return;
      case 0xFF45:
        this.gb.ppu.lyc = val;
        return;
      case 0xFF46:
        //OAM DMA TRANSFER
        this._oamValue = val;
        const source = val * 0x100;
        for(let i = 0; i <= 0x9F; i++) {
          let saddr = source + i;
          if(saddr > 0xC000) saddr = 0xC000 + (saddr & 0x1FFF);
          this.write(0xFE00 | i, this.read(saddr), true);
        }
        this._oamTransfer = 160;
        return;
      case 0xFF47:
        this.gb.ppu.bgp = val;
        return;
      case 0xFF48:
        this.gb.ppu.obp0 = val;
        return;
      case 0xFF49:
        this.gb.ppu.obp1 = val;
        return;
      case 0xFF4A:
        this.gb.ppu.wy = val;
        return;
      case 0xFF4B:
        this.gb.ppu.wx = val;
        return;
      case 0xFF50:
        this.disableBios = (val | 0);
        return;
      case 0xFFFF:
        this.gb.cpu.irq.ie = val;
        return;
      //AUDIO:
      case 0xFF10:
      case 0xFF11:
      case 0xFF12:
      case 0xFF13:
      case 0xFF14:
      case 0xFF26:
        this.gb.apu.write(addr, val);
        return;
      default:
        if(addr <= 0x7FFF) {
          if((addr <= 0xFF) && (this.disableBios === false)) {
            return;
          }
          this.cart.write(addr, val);
          return;
        } else if (addr <= 0x9FFF) {
          this.gb.ppu.writeVRAM(addr - 0x8000, val, force);
        } else if (addr <= 0xBFFF) {
          this.cart.write(addr, val); // ERAM
        } else if (addr <= 0xFDFF) {
          this.wram[addr & 0x1FFF] = val; // Echo and Work RAM
        } else if (addr <= 0xFE9F) {
          this.gb.ppu.writeOAM(addr,val); //OAM
        } else if (addr >= 0xFF80 && addr <= 0xFFFE) {
          this.hram[addr - 0xFF80] = val; // High Ram
        } else {
          //this.gb.log(`[MMU] WRITE Addr 0x${toHex(addr,16)} isn't mapped to anything`+'\n');
        }
    }
  }
  readWord(addr,force) {
    return (this.read(addr,force) | this.read(addr+1,force) << 8);
  }
  writeWord(addr, val, force) {
    val &= 0xFFFF;
    this.write(addr, val & 0xFF, force);
    this.write(addr + 1, val >> 8, force);
  }
  step(c) {
    if(this._oamTransfer !== false) {
      this._oamTransfer -= c;
      if(this._oamTransfer <= 0) {
        this._oamTransfer = false;
      }
    }
  }
}