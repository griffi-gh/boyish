export function i8(v) {
  return v & 0x80 ? v-256 : v;
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