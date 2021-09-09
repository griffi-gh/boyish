export let OPS = [];
export let CB_OPS = [];

// macro thingy
function construct(body) {
  return new Function('pc', body);
}



//NOP
function NOP() { 
  return construct(`
    return [4, pc+1]; 
  `);
}

//HALT
function HALT() {
  return construct(`
    this.gb.stateChange(this.gb.STATE_HALT);
    return [4, pc+1]
  `);
}

//STOP
function STOP() {
  return construct(`
    this.gb.stateChange(this.gb.STATE_STOP);
    return [4, pc+2]
  `);
}

function _INCDEC_FLAGS(n) { 
  return `
    const f = this.f;
    f.z = (result === 0);
    f.h = ((result & 0xF) === 0);
    f.n = ${(!n).toString()};
  `;
}

//INC R
function INC_R(r) {
  return construct(`
    const result = this.r.${r} + 1;
    ${_INCDEC_FLAGS(true)}
    this.r.${r} = this.u8(result);
    return [4, pc+1];
  `) 
}
//DEC R
function DEC_R(r) {
  return construct(`
    const result = this.r.${r} - 1;
    ${_INCDEC_FLAGS(false)}
    this.r.${r} = this.u8(result);
    return [4, pc+1];
  `) 
}

//INC (HL)
function INC_AHL() {
  return construct(`
    const hl = this.r.hl;
    const result = this.mmu.read(hl) + 1;
    ${_INCDEC_FLAGS(true)}
    this.mmu.write(hl, this.u8(result));
    return [12, pc+1];
  `) 
}
//DEC (HL)
function DEC_AHL() {
  return construct(`
    const hl = this.r.hl;
    const result = this.mmu.read(hl) + 1;
    ${_INCDEC_FLAGS(false)}
    this.mmu.write(hl, this.u8(result));
    return [12, pc+1];
  `) 
}

//

//INC RR
function INC_RR(r) {
  return construct(`
    this.r.${r} = this.r.${r}+1;
    return [8, pc+1];
  `)
}

//DEC RR
function DEC_RR(r) {
  return construct(`
    this.r.${r} = this.r.${r}-1;
    return [8, pc+1];
  `)
}

//LD A,(RR)
function LD_A_ARR(r) { 
  return construct(`
    this.r.a = this.mmu.read(this.r.${r});
    return [8, pc+1]; 
  `);
}

//LD (RR),A
function LD_ARR_A(r) { 
  return construct(`
    this.mmu.write(this.r.${r}, this.r.a);
    return [8, pc+1]; 
  `);
}

//LD (HL),u8
function LD_AHL_U8() { 
  return construct(`
    this.mmu.write(this.r.hl, this.mmu.read(this.u16(pc+1)));
    return [12, pc+2]; 
  `);
}

//LD R,u8
function LD_R_U8(r) { 
  return construct(`
    this.r.${r} = this.mmu.read(this.u16(pc+1));
    return [8, pc+2]; 
  `);
}

//LD R,R
function LD_R_R(a, b) { 
  return construct(`
    this.r.${a} = this.r.${b};
    return [4, pc+1]; 
  `);
}

//LD R,(HL)
function LD_R_AHL(r) { 
  return construct(`
    this.r.${r} = this.mmu.read(this.r.hl);
    return [8, pc+1]; 
  `);
}

//LD (HL),R
function LD_AHL_R(r) { 
  return construct(`
    this.mmu.write(this.r.hl, this.r.${r});
    return [8, pc+1]; 
  `);
}

//LD RR,u16
function LD_RR_U16(r) { 
  return construct(`
    this.r.${r} = this.mmu.readWord(pc+1);
    return [12, pc+3];
  `) 
}

//PUSH RR
function PUSH_RR(r) { 
  return construct(`
    this.r.sp = this.u16(this.r.sp - 2);
    this.mmu.writeWord(this.r.sp, this.r.${r});
    return [16, pc+1]; 
  `);
}

//POP RR
function POP_RR(r) {  
  return construct(`
    this.r.${r} = this.mmu.readWord(this.r.sp);
    this.r.sp = this.u16(this.r.sp + 2);
    return [12, pc+1]; 
  `);
}


function _ADDSUB(isAdd) {
  return `
    const a = this.r.a;
    const result = a ${isAdd ? '+' : '-'} b;
    const f = this.f;
    f.z = (result === 0);
    f.h = ((a & 0xF) + (b & 0xF)) > 0xF;
    f.n = ${(!isAdd).toString()};
    f.c = ${isAdd ? '(result > 0xFF)' : '(result < 0x00)'};
    this.r.a = this.u8(result);
  `;
}

//ADD A,R
function ADD_A_R(r) {
  return construct(`
    const b = this.r.${r};
    ${ _ADDSUB(true) }
    return [4, pc+1];
  `);
}
//ADD A,(HL)
function ADD_A_AHL() {
  return construct(`
    const b = this.mmu.read(this.r.hl);
    ${ _ADDSUB(true) }
    return [4, pc+1];
  `);
}

//SUB A,R
function SUB_A_R(r) {
  return construct(`
    const b = this.r.${r};
    ${ _ADDSUB(false) }
    return [4, pc+1];
  `);
}
//SUB A,(HL)
function SUB_A_AHL() {
  return construct(`
    const b = this.mmu.read(this.r.hl);
    ${ _ADDSUB(false) }
    return [4, pc+1];
  `);
}

/*this.f.h = (a & 0xF) + (val & 0xF) > 0xF
    this.f.c = sum > 0xFF;
    this.f.z = this.u8(sum) === 0;
    this.f.n = false;*/

//AND A,R
function AND_A_R(r) {
  return construct(`
    this.r.a &= this.r.${r};
    this.f.reset();
    this.f.z = (this.r.a === 0);
    this.f.h = true;
    return [4, pc+1]; 
  `);
}

//AND A,(HL) 
function AND_A_AHL() {
  return construct(`
    this.r.a &= this.mmu.read(this.r.hl);
    this.f.reset();
    this.f.z = (this.r.a === 0);
    this.f.h = true;
    return [8, pc+1]; 
  `);
}

//OR A,R
function OR_A_R(r) {
  return construct(`
    this.r.a |= this.r.${r};
    this.f.reset();
    this.f.z = (this.r.a === 0);
    return [4, pc+1]; 
  `);
}

//OR A,(HL) 
function OR_A_AHL(r) {
  return construct(`
    this.r.a |= this.mmu.read(this.r.hl);
    this.f.reset();
    this.f.z = (this.r.a === 0);
    return [8, pc+1]; 
  `);
}

//XOR A,R
function XOR_A_R(r) {
  return construct(`
    this.r.a ^= this.r.${r};
    this.f.reset();
    this.f.z = (this.r.a === 0);
    return [4, pc+1]; 
  `);
}

//XOR A,(HL) 
function XOR_A_AHL(r) {
  return construct(`
    this.r.a ^= this.mmu.read(this.r.hl);
    this.f.reset();
    this.f.z = (this.r.a === 0);
    return [8, pc+1]; 
  `);
}

// +2 makes is work? *todo* investigate
function _JR() { //console.log(\`\${pc} + \${offset} (\${this.mmu.read(pc+1)}) = \${pc+offset}\`)
  return (`
    const offset = this.i8(this.mmu.read(pc+1)) + 2;
    return [12, pc+offset];
  `)
}
function _JR_COND(isN, flag) {
  return (`
    if(${isN ? '!' : ''}this.f.${flag}) {
      ${_JR()}
    }
    return [8, pc+2]; 
  `)
}

//JR i8
function JR_I8() {
  return construct(_JR());
}

//JR NZ,i8
function JR_NZ_I8() {
  return construct(_JR_COND(true, 'z'));
}

//JR NC,i8
function JR_NC_I8() {
  return construct(_JR_COND(true, 'c'));
}

//JR Z,i8
function JR_Z_I8() {
  return construct(_JR_COND(false,'z'));
}

//JR C,i8
function JR_C_I8() {
  return construct(_JR_COND(false,'c'));
}

function _JP_COND(isN, flag) {
  return (`
    if(${isN ? '!' : ''}this.f.${flag}) {
      return [16, this.mmu.readWord(pc+1)]; 
    }
    return [12, pc+3]; 
  `)
}

//JP u16
function JP_U16() {
  return construct(`
    return [16, this.mmu.readWord(pc+1)];
  `);
}

//JP HL
function JP_HL() {
  return construct(`
    return [4, this.r.hl];
  `);
}

//JP NZ,U16
function JP_NZ_U16() {
  return construct(_JP_COND(true, 'z'));
}

//JP NC,U16
function JP_NC_U16() {
  return construct(_JP_COND(true, 'c'));
}

//JP Z,U16
function JP_Z_U16() {
  return construct(_JP_COND(false,'z'));
}

//JP C,U16
function JP_C_U16() {
  return construct(_JP_COND(false,'c'));
}

//CALL
function _CALL() {
  return (`
    const dest = this.mmu.readWord(pc+1);
    this.r.sp = this.u16(this.r.sp - 2);
    this.mmu.writeWord(this.r.sp, this.r.pc + 3);
    return [24, dest];
  `);
}
function _CALL_COND(isN, flag) {
  return (`
    if(${isN ? '!' : ''}this.f.${flag}) {
      ${ _CALL() }
    }
    return [12, pc+3]; 
  `);
}

//CALL u16
function CALL_U16() {
  return construct(_CALL());
}

//CALL NZ,U16
function CALL_NZ_U16() {
  return construct(_CALL_COND(true, 'z'));
}

//CALL NC,U16
function CALL_NC_U16() {
  return construct(_CALL_COND(true, 'c'));
}

//CALL Z,U16
function CALL_Z_U16() {
  return construct(_CALL_COND(false,'z'));
}

//CALL C,U16
function CALL_C_U16() {
  return construct(_CALL_COND(false,'c'));
}

function RLA() {
  return construct(`
    const result = (this.r.a << 1) | (this.f.c | 0);
    this.f.c = (result & 0x100) !== 0;
    this.r.a = (result & 0xFF);
    return [4, pc+1];
  `);
}

function RLCA() {
  return construct(`
    const result = (this.r.a << 1) | (this.r.a >> 7);
    this.f.c = (result & 0x100) !== 0;
    this.r.a = (result & 0xFF);
    return [4, pc+1];
  `);
}

function CPL() {
  return construct(`
    const result = (this.r.a << 1) | (this.r.a >> 7);
    this.r.a = (~this.r.a & 0xff);
    this.f.n = true;
    this.f.h = true;
    return [4, pc+1];
  `);
}

function DAA() {
  return construct(`
    let a = this.r.a;
    if(this.f.n) {
      // Sub
      if(this.f.h) { a = this.u8(a - 0x6); }
      if(this.f.c) { a -= 0x60; }
    } else {
      // Add
      if ((a & 0xF) > 0x9 || flags.h) { a += 0x6; }
      if (a > 0x9 || flags.c) { a += 0x60; }
    }
    this.r.a = this.u8(a);
    this.f.h = false;
    if((a & 0x100) == 0x100) { 
      // Real hardware doesn't reset the Carry flag
      this.f.c = true;
    } 
    this.f.z = (this.r.a === 0);
    return [4, pc+1];
  `);
}

function LD_ffC_A() {
  return construct(`
    this.mmu.write(0xFF00 | this.r.c, this.r.a);
    return [8, pc+1];
  `);
}

function LD_A_ffC() {
  return construct(`
    this.r.a = this.mmu.read(0xFF00 | this.r.c);
    return [8, pc+1];
  `);
}

function LD_ffU8_A() {
  return construct(`
    this.mmu.write(0xFF00 | this.mmu.read(pc+1), this.r.a);
    return [12, pc+2];
  `);
}

function LD_A_ffU8() {
  return construct(`
    this.r.a = this.mmu.read(0xFF00 | this.mmu.read(pc+1));
    return [12, pc+2];
  `);
}

OPS[0x00] = NOP();              // NOP

OPS[0x10] = STOP();             // STOP
OPS[0x76] = HALT();             // HALT

OPS[0x01] = LD_RR_U16('bc');    // LD BC,u16
OPS[0x11] = LD_RR_U16('de');    // LD DE,u16
OPS[0x21] = LD_RR_U16('hl');    // LD HL,u16
OPS[0x31] = LD_RR_U16('sp');    // LD SP,u16

OPS[0x0A] = LD_A_ARR('bc');     // LD A,(BC)
OPS[0x1A] = LD_A_ARR('de');     // LD A,(DE)
OPS[0x2A] = LD_A_ARR('hl++');   // LD A,(HL+)
OPS[0x3A] = LD_A_ARR('hl--');   // LD A,(HL-)

OPS[0x02] = LD_ARR_A('bc');     // LD (BC),A
OPS[0x12] = LD_ARR_A('de');     // LD (DE),A
OPS[0x22] = LD_ARR_A('hl++');   // LD (HL+),A
OPS[0x32] = LD_ARR_A('hl--');   // LD (HL-),A

OPS[0x06] = LD_R_U8('b');       // LD B,u8
OPS[0x0E] = LD_R_U8('c');       // LD C,u8
OPS[0x16] = LD_R_U8('d');       // LD D,u8
OPS[0x1E] = LD_R_U8('e');       // LD E,u8
OPS[0x26] = LD_R_U8('h');       // LD H,u8
OPS[0x2E] = LD_R_U8('l');       // LD L,u8
OPS[0x36] = LD_AHL_U8();        // LD (HL),u8
OPS[0x3E] = LD_R_U8('a');       // LD A,u8

OPS[0x40] = LD_R_R('b','b');    // LD B,B
OPS[0x41] = LD_R_R('b','c');    // LD B,C
OPS[0x42] = LD_R_R('b','d');    // LD B,D
OPS[0x43] = LD_R_R('b','e');    // LD B,E
OPS[0x44] = LD_R_R('b','h');    // LD B,H
OPS[0x45] = LD_R_R('b','l');    // LD B,L
OPS[0x46] = LD_R_AHL('b');      // LD B,(HL)
OPS[0x47] = LD_R_R('b','a');    // LD B,A

OPS[0x48] = LD_R_R('с','b');    // LD C,B
OPS[0x49] = LD_R_R('с','c');    // LD C,C
OPS[0x4B] = LD_R_R('с','d');    // CD C,D
OPS[0x4A] = LD_R_R('с','e');    // LD C,E
OPS[0x4C] = LD_R_R('с','h');    // LD C,H
OPS[0x4D] = LD_R_R('с','l');    // LD C,L
OPS[0x4E] = LD_R_AHL('c');      // LD C,(HL)
OPS[0x4F] = LD_R_R('с','a');    // LD C,A

OPS[0x50] = LD_R_R('d','b');    // LD D,B
OPS[0x51] = LD_R_R('d','c');    // LD D,C
OPS[0x52] = LD_R_R('d','d');    // LD D,D
OPS[0x53] = LD_R_R('d','e');    // LD D,E
OPS[0x54] = LD_R_R('d','h');    // LD D,H
OPS[0x55] = LD_R_R('d','l');    // LD D,L
OPS[0x56] = LD_R_AHL('d');      // LD D,(HL)
OPS[0x57] = LD_R_R('d','a');    // LD D,A

OPS[0x58] = LD_R_R('e','b');    // LD E,B
OPS[0x59] = LD_R_R('e','c');    // LD E,C
OPS[0x5A] = LD_R_R('e','d');    // LD E,D
OPS[0x5B] = LD_R_R('e','e');    // LD E,E
OPS[0x5C] = LD_R_R('e','h');    // LD E,H
OPS[0x5D] = LD_R_R('e','l');    // LD E,L
OPS[0x5E] = LD_R_AHL('e');      // LD E,(HL)
OPS[0x5F] = LD_R_R('e','a');    // LD E,A

OPS[0x60] = LD_R_R('h','b');    // LD H,B
OPS[0x61] = LD_R_R('h','c');    // LD H,C
OPS[0x62] = LD_R_R('h','d');    // LD H,D
OPS[0x63] = LD_R_R('h','e');    // LD H,E
OPS[0x64] = LD_R_R('h','h');    // LD H,H
OPS[0x65] = LD_R_R('h','l');    // LD H,L
OPS[0x66] = LD_R_AHL('h');      // LD H,(HL)
OPS[0x67] = LD_R_R('h','a');    // LD H,A

OPS[0x68] = LD_R_R('l','b');    // LD L,B 
OPS[0x69] = LD_R_R('l','c');    // LD L,C
OPS[0x6A] = LD_R_R('l','d');    // LD L,D
OPS[0x6B] = LD_R_R('l','e');    // LD L,E
OPS[0x6C] = LD_R_R('l','h');    // LD L,H
OPS[0x6D] = LD_R_R('l','l');    // LD L,L
OPS[0x6E] = LD_R_AHL('l');      // LD L,(HL)
OPS[0x6F] = LD_R_R('l','a');    // LD L,A

OPS[0x78] = LD_R_R('a','b');    // LD A,B
OPS[0x79] = LD_R_R('a','c');    // LD A,C
OPS[0x7A] = LD_R_R('a','d');    // LD A,D
OPS[0x7B] = LD_R_R('a','e');    // LD A,E
OPS[0x7C] = LD_R_R('a','h');    // LD A,H
OPS[0x7D] = LD_R_R('a','l');    // LD A,L
OPS[0x7E] = LD_R_AHL('a');      // LD A,(HL)
OPS[0x7F] = LD_R_R('a','a');    // LD A,A

OPS[0x70] = LD_AHL_R('b');      // LD (HL),B
OPS[0x71] = LD_AHL_R('c');      // LD (HL),C
OPS[0x72] = LD_AHL_R('d');      // LD (HL),D
OPS[0x73] = LD_AHL_R('e');      // LD (HL),E
OPS[0x74] = LD_AHL_R('h');      // LD (HL),H
OPS[0x75] = LD_AHL_R('l');      // LD (HL),L
OPS[0x77] = LD_AHL_R('a');      // LD (HL),A
 
OPS[0xC5] = PUSH_RR('bc');      // PUSH BC
OPS[0xD5] = PUSH_RR('de');      // PUSH DE
OPS[0xE5] = PUSH_RR('hl');      // PUSH HL
OPS[0xF5] = PUSH_RR('af');      // PUSH AF

OPS[0xC1] = POP_RR('bc');       // POP BC
OPS[0xD1] = POP_RR('de');       // POP DE
OPS[0xE1] = POP_RR('hl');       // POP HL
OPS[0xF1] = POP_RR('af');       // POP AF

OPS[0x04] = INC_R('b');         // INC B
OPS[0x0C] = INC_R('c');         // INC C
OPS[0x14] = INC_R('d');         // INC D
OPS[0x1C] = INC_R('e');         // INC E
OPS[0x24] = INC_R('h');         // INC H
OPS[0x2C] = INC_R('l');         // INC L
OPS[0x3C] = INC_R('a');         // INC A

OPS[0x05] = DEC_R('b');         // DEC B
OPS[0x0D] = DEC_R('c');         // DEC C
OPS[0x15] = DEC_R('d');         // DEC D
OPS[0x1D] = DEC_R('e');         // DEC E
OPS[0x25] = DEC_R('h');         // DEC H
OPS[0x2D] = DEC_R('l');         // DEC L
OPS[0x3D] = DEC_R('a');         // DEC A

OPS[0x03] = INC_RR('bc');       // INC BC
OPS[0x13] = INC_RR('de');       // INC DE
OPS[0x23] = INC_RR('hl');       // INC HL
OPS[0x33] = INC_RR('sp');       // INC SP

OPS[0x0B] = DEC_RR('bc');       // DEC BC
OPS[0x1B] = DEC_RR('de');       // DEC DE
OPS[0x2B] = DEC_RR('hl');       // DEC HL
OPS[0x3B] = DEC_RR('sp');       // DEC SP

OPS[0x80] = ADD_A_R('b');       // ADD A,B
OPS[0x81] = ADD_A_R('c');       // ADD A,C
OPS[0x82] = ADD_A_R('d');       // ADD A,D
OPS[0x83] = ADD_A_R('e');       // ADD A,E
OPS[0x84] = ADD_A_R('h');       // ADD A,H
OPS[0x85] = ADD_A_R('l');       // ADD A,L
OPS[0x86] = ADD_A_AHL();        // ADD A,(HL)
OPS[0x87] = ADD_A_R('a');       // ADD A,L

OPS[0x90] = SUB_A_R('b');       // SUB A,B
OPS[0x91] = SUB_A_R('c');       // SUB A,C
OPS[0x92] = SUB_A_R('d');       // SUB A,D
OPS[0x93] = SUB_A_R('e');       // SUB A,E
OPS[0x94] = SUB_A_R('h');       // SUB A,H
OPS[0x95] = SUB_A_R('l');       // SUB A,L
OPS[0x96] = SUB_A_AHL();        // SUB A,(HL)
OPS[0x97] = SUB_A_R('a');       // SUB A,L

OPS[0xA0] = AND_A_R('b');       // AND A,B
OPS[0xA1] = AND_A_R('c');       // AND A,C
OPS[0xA2] = AND_A_R('d');       // AND A,D
OPS[0xA3] = AND_A_R('e');       // AND A,E
OPS[0xA4] = AND_A_R('h');       // AND A,H
OPS[0xA5] = AND_A_R('l');       // AND A,L
OPS[0xA6] = AND_A_AHL();        // AND A,(HL)
OPS[0xA7] = AND_A_R('a');       // AND A,A

OPS[0xA8] = XOR_A_R('b');       // XOR A,B
OPS[0xA9] = XOR_A_R('c');       // XOR A,C
OPS[0xAA] = XOR_A_R('d');       // XOR A,D
OPS[0xAB] = XOR_A_R('e');       // XOR A,E
OPS[0xAC] = XOR_A_R('h');       // XOR A,H
OPS[0xAD] = XOR_A_R('l');       // XOR A,L
OPS[0xAE] = XOR_A_AHL();        // XOR A,(HL)
OPS[0xAF] = XOR_A_R('a');       // XOR A,A

OPS[0xB0] = OR_A_R('b');        // OR A,B
OPS[0xB1] = OR_A_R('c');        // OR A,C
OPS[0xB2] = OR_A_R('d');        // OR A,D
OPS[0xB3] = OR_A_R('e');        // OR A,E
OPS[0xB4] = OR_A_R('h');        // OR A,H
OPS[0xB5] = OR_A_R('l');        // OR A,L
OPS[0xB6] = OR_A_AHL();         // OR A,(HL)
OPS[0xB7] = OR_A_R('a');        // OR A,A

OPS[0x18] = JR_I8();            // JR i8
OPS[0x28] = JR_Z_I8();          // JR Z,i8
OPS[0x38] = JR_C_I8();          // JR C,i8
OPS[0x20] = JR_NZ_I8();         // JR NZ,i8
OPS[0x30] = JR_NC_I8();         // JR NC,i8

OPS[0xE9] = JP_HL();            // JP HL
OPS[0xC3] = JP_U16();           // JP u16
OPS[0xCA] = JP_Z_U16();         // JP Z,u16
OPS[0xDA] = JP_C_U16();         // JP C,u16
OPS[0xC2] = JP_NZ_U16();        // JP NZ,u16
OPS[0xD2] = JP_NC_U16();        // JP NC,u16

OPS[0xCD] = CALL_U16();         // CALL u16
OPS[0xCC] = CALL_Z_U16();       // CALL Z,u16
OPS[0xDC] = CALL_C_U16();       // CALL C,u16
OPS[0xC4] = CALL_NZ_U16();      // CALL NZ,u16
OPS[0xD4] = CALL_NC_U16();      // CALL NC,u16

OPS[0x07] = RLCA();             // RLCA
OPS[0x17] = RLA();              // RLA

OPS[0x2F] = CPL();              // CPL

OPS[0x27] = DAA();              // DAA

OPS[0xE0] = LD_ffU8_A();        // LD (FF00+u8),A
OPS[0xF0] = LD_A_ffU8();        // LD A,(FF00+u8)
OPS[0xE2] = LD_ffC_A();         // LD (FF00+C),A
OPS[0xF2] = LD_A_ffC();         // LD A,(FF00+C)

// CB_OPS

function BIT_R(bit, r) {
  return construct(`
    this.f.z = (this.r.${r} & ${1 << bit}) === 0;
    this.f.n = false;
    this.f.h = true;
    return [8, pc+1]
  `);
}
function BIT_AHL(bit) {
  return construct(`
    this.f.z = (this.mmu.read(this.r.hl) & ${1 << bit}) === 0;
    this.f.n = false;
    this.f.h = true;
    return [16, pc+1];
  `);
}

function SWAP_R(r) {
  return construct(`
    let a = this.r.${r};
    a = ((a & 0x0F) << 4 | (a & 0xF0) >> 4);
    this.f.reset();
    this.f.z = (a === 0);
    this.r.${r} = a;
    return [8, pc+1];
  `);
}
function SWAP_AHL() {
  return construct(`
    const hl = this.r.hl;
    let a = this.mmu.read(hl);
    a = ((a & 0x0F) << 4 | (a & 0xF0) >> 4);
    this.f.reset();
    this.f.z = (a === 0);
    this.mmu.write(hl, a);
    return [16, pc+1];
  `);
}

CB_OPS[0x30] = SWAP_R('b');
CB_OPS[0x31] = SWAP_R('c');
CB_OPS[0x32] = SWAP_R('d');
CB_OPS[0x33] = SWAP_R('e');
CB_OPS[0x34] = SWAP_R('h');
CB_OPS[0x35] = SWAP_R('l');
CB_OPS[0x36] = SWAP_AHL();
CB_OPS[0x37] = SWAP_R('a');

CB_OPS[0x40] = BIT_R(0,'b');
CB_OPS[0x41] = BIT_R(0,'c');
CB_OPS[0x42] = BIT_R(0,'d');
CB_OPS[0x43] = BIT_R(0,'e');
CB_OPS[0x44] = BIT_R(0,'h');
CB_OPS[0x45] = BIT_R(0,'l');
CB_OPS[0x46] = BIT_AHL(0);
CB_OPS[0x47] = BIT_R(0,'a');

CB_OPS[0x48] = BIT_R(1,'b');
CB_OPS[0x49] = BIT_R(1,'c');
CB_OPS[0x4A] = BIT_R(1,'d');
CB_OPS[0x4B] = BIT_R(1,'e');
CB_OPS[0x4C] = BIT_R(1,'h');
CB_OPS[0x4D] = BIT_R(1,'l');
CB_OPS[0x4E] = BIT_AHL(1);
CB_OPS[0x4F] = BIT_R(1,'a');

CB_OPS[0x50] = BIT_R(2,'b');
CB_OPS[0x51] = BIT_R(2,'c');
CB_OPS[0x52] = BIT_R(2,'d');
CB_OPS[0x53] = BIT_R(2,'e');
CB_OPS[0x54] = BIT_R(2,'h');
CB_OPS[0x55] = BIT_R(2,'l');
CB_OPS[0x56] = BIT_AHL(2);
CB_OPS[0x57] = BIT_R(2,'a');

CB_OPS[0x58] = BIT_R(3,'b');
CB_OPS[0x59] = BIT_R(3,'c');
CB_OPS[0x5A] = BIT_R(3,'d');
CB_OPS[0x5B] = BIT_R(3,'e');
CB_OPS[0x5C] = BIT_R(3,'h');
CB_OPS[0x5D] = BIT_R(3,'l');
CB_OPS[0x5E] = BIT_AHL(3);
CB_OPS[0x5F] = BIT_R(3,'a');

CB_OPS[0x60] = BIT_R(4,'b');
CB_OPS[0x61] = BIT_R(4,'c');
CB_OPS[0x62] = BIT_R(4,'d');
CB_OPS[0x63] = BIT_R(4,'e');
CB_OPS[0x64] = BIT_R(4,'h');
CB_OPS[0x65] = BIT_R(4,'l');
CB_OPS[0x66] = BIT_AHL(4);
CB_OPS[0x67] = BIT_R(4,'a');

CB_OPS[0x68] = BIT_R(5,'b');
CB_OPS[0x69] = BIT_R(5,'c');
CB_OPS[0x6A] = BIT_R(5,'d');
CB_OPS[0x6B] = BIT_R(5,'e');
CB_OPS[0x6C] = BIT_R(5,'h');
CB_OPS[0x6D] = BIT_R(5,'l');
CB_OPS[0x6E] = BIT_AHL(5);
CB_OPS[0x6F] = BIT_R(5,'a');

CB_OPS[0x70] = BIT_R(6,'b');
CB_OPS[0x71] = BIT_R(6,'c');
CB_OPS[0x72] = BIT_R(6,'d');
CB_OPS[0x73] = BIT_R(6,'e');
CB_OPS[0x74] = BIT_R(6,'h');
CB_OPS[0x75] = BIT_R(6,'l');
CB_OPS[0x76] = BIT_AHL(6);
CB_OPS[0x77] = BIT_R(6,'a');

CB_OPS[0x78] = BIT_R(7,'b');
CB_OPS[0x79] = BIT_R(7,'c');
CB_OPS[0x7A] = BIT_R(7,'d');
CB_OPS[0x7B] = BIT_R(7,'e');
CB_OPS[0x7C] = BIT_R(7,'h');
CB_OPS[0x7D] = BIT_R(7,'l');
CB_OPS[0x7E] = BIT_AHL(7);
CB_OPS[0x7F] = BIT_R(7,'a');
