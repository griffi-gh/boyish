export let OPS = [];
export let CB_OPS = [];

OPS[0x00] = (pc) => {
  return [4, ++pc]; 
}