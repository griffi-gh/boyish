export let OPS = [];
export let CB_OPS = [];

//macro thingy
function construct(body) {
  return new Function('pc', body);
}

function NOP() {
  return construct(`
    return [4, this.u16(pc+1)]; 
  `);
}

function LD_AHL_U8() {
  return construct(`
    this.mmu.write(this.reg.hl, this.mmu.read(this.u16(pc+1)));
    return [12, this.u16(pc+2)]; 
  `);
}

function LD_R_U8(r) {
  return construct(`
    this.reg.${r} = this.mmu.read(this.u16(pc+1));
    return [8, this.u16(pc+2)]; 
  `);
}

function LD_R_R(a, b) {
  if(a === b) {
    return NOP();
  }
  return construct(`
    this.reg.${a} = this.reg.${b};
    return [4, this.u16(pc+1)]; 
  `);
}

function LD_R_AHL(r) {
  return construct(`
    this.reg.${r} = this.mmu.read(this.reg.hl);
    return [8, this.u16(pc+1)]; 
  `);
}

function LD_AHL_R(r) {
  return construct(`
    this.mmu.write(this.reg.hl, this.reg.${r});
    return [8, this.u16(pc+1)]; 
  `);
}

function LD_RR_U16(r) {
  return construct(`
    this.reg.${r} = this.mmu.readWord(pc+1);
    return [12, this.u16(pc+3)];
  `) 
}

OPS[0x00] = NOP();

OPS[0x01] = LD_RR_U16('bc');
OPS[0x11] = LD_RR_U16('de');
OPS[0x21] = LD_RR_U16('hl');
OPS[0x31] = LD_RR_U16('sp');

OPS[0x06] = LD_R_U8('b');
OPS[0x0E] = LD_R_U8('c');
OPS[0x16] = LD_R_U8('d');
OPS[0x1E] = LD_R_U8('e');
OPS[0x26] = LD_R_U8('h');
OPS[0x2E] = LD_R_U8('l');
OPS[0x36] = LD_AHL_U8();
OPS[0x3E] = LD_R_U8('a');

OPS[0x40] = LD_R_R('b','b');
OPS[0x41] = LD_R_R('b','c');
OPS[0x42] = LD_R_R('b','d');
OPS[0x43] = LD_R_R('b','e');
OPS[0x44] = LD_R_R('b','h');
OPS[0x45] = LD_R_R('b','l');
OPS[0x46] = LD_R_AHL('b');
OPS[0x47] = LD_R_R('b','a');

OPS[0x48] = LD_R_R('с','b');
OPS[0x49] = LD_R_R('с','c');
OPS[0x4B] = LD_R_R('с','d');
OPS[0x4A] = LD_R_R('с','e');
OPS[0x4C] = LD_R_R('с','h');
OPS[0x4D] = LD_R_R('с','l');
OPS[0x4E] = LD_R_AHL('c');
OPS[0x4F] = LD_R_R('с','a');

OPS[0x50] = LD_R_R('d','b');
OPS[0x51] = LD_R_R('d','c');
OPS[0x52] = LD_R_R('d','d');
OPS[0x53] = LD_R_R('d','e');
OPS[0x54] = LD_R_R('d','h');
OPS[0x55] = LD_R_R('d','l');
OPS[0x56] = LD_R_AHL('d');
OPS[0x57] = LD_R_R('d','a');

OPS[0x58] = LD_R_R('e','b');
OPS[0x59] = LD_R_R('e','c');
OPS[0x5A] = LD_R_R('e','d');
OPS[0x5B] = LD_R_R('e','e');
OPS[0x5C] = LD_R_R('e','h');
OPS[0x5D] = LD_R_R('e','l');
OPS[0x5E] = LD_R_AHL('e');
OPS[0x5F] = LD_R_R('e','a');

OPS[0x60] = LD_R_R('h','b');
OPS[0x61] = LD_R_R('h','c');
OPS[0x62] = LD_R_R('h','d');
OPS[0x63] = LD_R_R('h','e');
OPS[0x64] = LD_R_R('h','h');
OPS[0x65] = LD_R_R('h','l');
OPS[0x66] = LD_R_AHL('h');
OPS[0x67] = LD_R_R('h','a');

OPS[0x68] = LD_R_R('l','b');
OPS[0x69] = LD_R_R('l','c');
OPS[0x6A] = LD_R_R('l','d');
OPS[0x6B] = LD_R_R('l','e');
OPS[0x6C] = LD_R_R('l','h');
OPS[0x6D] = LD_R_R('l','l');
OPS[0x6E] = LD_R_AHL('l');
OPS[0x6F] = LD_R_R('l','a');

OPS[0x78] = LD_R_R('a','b');
OPS[0x79] = LD_R_R('a','c');
OPS[0x7A] = LD_R_R('a','d');
OPS[0x7B] = LD_R_R('a','e');
OPS[0x7C] = LD_R_R('a','h');
OPS[0x7D] = LD_R_R('a','l');
OPS[0x7E] = LD_R_AHL('a');
OPS[0x7F] = LD_R_R('a','a');

OPS[0x70] = LD_AHL_R('b');
OPS[0x71] = LD_AHL_R('c');
OPS[0x72] = LD_AHL_R('d');
OPS[0x73] = LD_AHL_R('e');
OPS[0x74] = LD_AHL_R('h');
OPS[0x75] = LD_AHL_R('l');
OPS[0x77] = LD_AHL_R('a');
