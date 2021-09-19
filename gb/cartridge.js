export class CartridgeNone {
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

export function Cartridge(i) {
	switch (i) {
		case 0x00:
			return CartridgeNone;
		case 0x01:
			return CartridgeMBC1;
		default:
			throw new Error("Invalid MBC type");
	}
}