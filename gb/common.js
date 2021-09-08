export function u8(a) {
  return (a & 0xFF);
}
export function u16(a){
  return (a & 0xFFFF);
}
/*export function i8(a) {
  if(a > 127) { a -= 0x100; }
  return (a & 0xFF);
  //wtf was i thinking
}*/
export function i8(v) {
  return v & 0x80 ? v-256 : v;
}