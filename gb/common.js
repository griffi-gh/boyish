/*export function u8(a) {
  return (a & 0xFF);
}
export function u16(a){
  return (a & 0xFFFF);
}*/

export function i8(v) {
  return v & 0x80 ? v-256 : v;
}

export function toHex(num = 0, size = 8) {
  const c = (size / 4);
  return ('0'.repeat(c-1) + num.toString(16)).slice(-c).toUpperCase();
}
