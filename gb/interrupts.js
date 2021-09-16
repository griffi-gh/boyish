const VEC = [0x40, 0x48, 0x50, 0x58, 0x60];

export class Interrupts {
	constructor(gb) {
		this.gb = gb;
		this.imePending = false;
		this.ime = false;
		//Vblank Lcdstat Timer Serial Joypad
		this.ie = [false, false, false, false, false];
		this.if = [false, false, false, false, false];
		this.ieUpperBits = 0xE0;
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

	dispatchInterrupt(i) {
		const addr = VEC[i];
		this.gb.cpu.pc = addr;
		this.gb.cpu.cycles += 20;
	}
	
	enableIME() {
		this.imePending = true;	
	}
	disableIME() {
		this.ime = false;
		this.imePending = false;
	}
	tick() {
		if(this.imePending) {
			this.imePending = false;
			this.ime = true;
		}
		if(this.ime) {
			for(const [i, v] of this.ie.entries()) {

			}
		}
		return 0;
	}
}