export function i8(v) {
  return v & 0x80 ? v-256 : v;
}

export function isArray(i) {
  return (Array.isArray(i) || i instanceof Array || ArrayBuffer.isView(i));
}

export function toHex(num, size = 8) {
  if(typeof num !== 'number') { return 'INVALID'; }
  const c = (size / 4);
  return ('0'.repeat(c-1) + num.toString(16)).slice(-c).toUpperCase();
}

export function downloadString(text = '', fileName = 'download.txt', fileType = 'text/plain') {
  const blob = new Blob([text], { type: fileType });
  const a = document.createElement('a');
  a.download = fileName;
  a.href = URL.createObjectURL(blob);
  a.dataset.downloadurl = [fileType, a.download, a.href].join(':');
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(function() { URL.revokeObjectURL(a.href); }, 1500);
}

export function hexToRgb(hex) {
  var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? [
    parseInt(result[1], 16),
    parseInt(result[2], 16),
    parseInt(result[3], 16)
  ] : null;
}

export function arrayToString(arr) {
  let str = '';
  arr.forEach((v) => {
    str += String.fromCharCode(0x20 + v);
  });
  return str;
}
export function stringToArray(str) {
  let arr = new Uint8Array(str.length).fill(0);
  let ai = 0;
  for(let i = 0; i < str.length; i++){
    let c = str.charCodeAt(i) - 0x20;
    arr[ai++] = c & 0xFF;
  }
  return arr;
}

export function isBrowser() {
  return !!(window && navigator);
}

export function isTouchDevice() {
  if(isBrowser()) {
    return (('ontouchstart' in window) ||
     (navigator.maxTouchPoints > 0) ||
     (navigator.msMaxTouchPoints > 0));
  }
  return false;
}

export function getKeyByValue(object, value) {
  return Object.keys(object).find(key => object[key] === value);
}