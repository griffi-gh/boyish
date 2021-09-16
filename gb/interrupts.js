const VEC = [0x40, 0x48, 0x50, 0x58, 0x60];

export class Interrupts {
	constructor(gb) {
		this.gb = gb;
		this.imePending = false;
		this.ime = false;
		//Vblank Lcdstat Timer Serial Joypad
		this.ie = [false, false, false, false, false];
		this.if = [false, false, false, false, false];
		this.ieUpperBits = 0; //0xE0;
	}

	writeIF(v) {
		this.if[0] = (v & 0b00001) !== 0;
		this.if[1] = (v & 0b00010) !== 0;
		this.if[2] = (v & 0b00100) !== 0;
		this.if[3] = (v & 0b01000) !== 0;
		this.if[4] = (v & 0b10000) !== 0;
	}
	readIF() {
		return (
	      this.if[0] << 0 |
	      this.if[1] << 1 |
	      this.if[2] << 2 |
	      this.if[3] << 3 |
	      this.if[4] << 4 
	    );
	}

	writeIE(v) {
		this.ie[0] = (v & 0b00001) !== 0;
		this.ie[1] = (v & 0b00010) !== 0;
		this.ie[2] = (v & 0b00100) !== 0;
		this.ie[3] = (v & 0b01000) !== 0;
		this.ie[4] = (v & 0b10000) !== 0;
		this.ieUpperBits = (v & 0xE0);
	}
	readIE() {
		return (
	      this.ie[0] << 0 |
	      this.ie[1] << 1 |
	      this.ie[2] << 2 |
	      this.ie[3] << 3 |
	      this.ie[4] << 4 |
	      this.ieUpperBits
	    );
	}
	
	enableIME(now) {
		if(now) {
			this.ime = true
		} else if(this.imePending === false) {
			this.imePending = 2;	
		}
	}
	disableIME() {
		this.ime = false;
		this.imePending = false;
	}

	dispatchInterrupt(i) {
		const cpu = this.gb.cpu;
		const mmu = this.gb.mmu;
		const addr = VEC[i];
		cpu.reg.sp -= 2;
		mmu.write(cpu.reg.sp, cpu.reg.pc)
		cpu.pc = addr;
		this.if[i] = false;
	}

	tick() {
		if(this.imePending) {
			this.imePending--;
			if(this.imePending === 0) {
				this.imePending = false;
				this.ime = true;
			}
		}
		if(this.ime) {
			for(const [i, v] of this.ie.entries()) {
				if(this.if[i]) {
					dispatchInterrupt(i)
					return 20;
				}
			}
		}
		return 0;
	}
}