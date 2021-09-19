export class Cartridge {
	constructor() {
		this.data = new Uint8Array(0x8000).fill(0);
	}
	load(arr) {
		this.data.fill(0x00);
	    const size = Math.max(d.length, 0x8000);
	    for(let i = 0; i <= size; i++) {
	      this.rom[i] = (d[i] | 0);
	    }
	}
	writeROM(a) {}
	readROM(a) { return data[a]; }
	writeERAM(a, v) {}
	readERAM(a, v) { return 0; }
}

export class MBC1 extends Cartridge {
	constructor() {
		super();
		this.romBank = 1;
		this.romBankAmount = 1;
	}
	writeROM(a) {
		if((a >= 0x2000) && (a <= 0x3FFF)) {

		}
	}
	readROM(a) {
		if(a >= 0x4000) {

		} else {
			return this.data[a];
		}
	}
}

export class MBC1Ram extends MBC1 {

}