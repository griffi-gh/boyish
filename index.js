import {Gameboy} from './gb/gb.js';

const $ = (i) => { return document.querySelector(i) };
const $id = (i) => { return document.getElementById(i) };
const $class = (i) => { return document.getElementsByClassName(i); }

// https://stackoverflow.com/questions/10420352/converting-file-size-in-bytes-to-human-readable-string/10420404
function humanFileSize(B,i){var e=i?1e3:1024;if(Math.abs(B)<e)return B+" B";var a=i?["kB","MB","GB","TB","PB","EB","ZB","YB"]:["KiB","MiB","GiB","TiB","PiB","EiB","ZiB","YiB"],t=-1;do B/=e,++t;while(Math.abs(B)>=e&&t<a.length-1);return B.toFixed(1)+" "+a[t]}

function arrayToString(arr) {
  let str = '';
  arr.forEach((v) => {
    str += String.fromCharCode(0x20 + v);
  });
  return str;
}
function stringToArray(str) {
  let arr = new Uint8Array(str.length).fill(0);
  let ai = 0;
  for(let i = 0; i < str.length; i++){
    let c = str.charCodeAt(i) - 0x20;
    arr[ai++] = c & 0xFF;
  }
  return arr;
}

function button(id, fn) {
  const btn = document.getElementById(id);
  //btn.onclick = () => { fn(btn); };
  btn.addEventListener("click", (ev) => {
    ev.stopPropagation();
    fn(btn, ev);
  });
  //btn.style.cssText += `width: ${(btn.getBoundingClientRect().width + 10).toString()}px;`;
  return btn;
}

window.addEventListener("load", function() {
  $id("input-popup").classList.remove("hide");
});

let gb;
function newGameboy() {
  const newGb = new Gameboy("gb-canvas");
  newGb.stubLY = $id("stubLY").checked;
  if($id("skipBR").checked) { newGb.skipBoot(); }
  if(gb) {
    if(gb.input.enabled) {
      gb.input.disable();
      newGb.input.enable();
    }
    gb.destroy();
  }
  window.GB = newGb; // for debugging
  gb = newGb;
}

window.addEventListener("DOMContentLoaded", function() {
  newGameboy();

  let btn_pause = button("btn-pause", (btn) => {
    if(gb.paused) { gb.resume(); } else { gb.pause(); }
    loop();
  });

  let btn_log = button("btn-swlog", (btn) => {
    gb.disableLog ^= true;
    if(gb.disableLog) { gb.logData = ''; }
    loop();
  });

  button("btn-step", (btn) => {
    gb.step();
    loop();
  });

  button("btn-reset", (btn) => {
    gb.pause();
    console.clear();
    newGameboy();
    const OK = 'OK!';
    let orig = btn.textContent;
    if(orig!==OK) {
      btn.textContent = OK;
      btn.classList.add("disabled");
      setTimeout(() => {
        btn.classList.remove("disabled");
        btn.innerHTML = orig;
      }, 1000)
    }
    loop();
  });

  button("btn-log", (btn) => {
    gb.flushLog();
  });

  button("btn-dwn", (btn) => {
    gb.downloadLog();
  });

  function loop() {
    $id("gb-canvas-wrapper").classList.toggle("scaled", $id("scale2x").checked);
    //gb.vsync = $id("vsync").checked;
    gb.loopMode = $('input[name="flimit"]:checked').value;
    btn_log.innerHTML = gb.disableLog ? 'Enable logging' : 'Disable logging';
    btn_pause.innerHTML = gb.paused ? 'Play' : 'Pause';
    
    const emp = (gb.logData.length === 0);
    if(!gb.disableLog) {
      const log = gb.logData;
      $id('log-size').innerHTML = humanFileSize(log.length, true);
      $id('log-line').innerHTML = log.split(/\r?\n/).at(-2);
    }
    $id('log-info').style.display = (gb.disableLog || emp) ? 'none' : 'unset';
    $id('log-empty').style.display = (emp & (!gb.disableLog)) ? 'unset' : 'none';

    $id('log-disabled').style.display = gb.disableLog ? 'unset' : 'none';
    if($id('cdebug-toggle').checked) {
      gb.ppu.debugTileset("cdebug");
    }
    //_input = gb.input.enabled;
    $id("input-popup").classList.toggle("hide", gb.input.enabled);
  }
  setInterval(loop, 1000);
  loop();

  //Tileset dubugger
  const cc = $id("cdebug");
  const cw = $id("cdebug-wrapper");
  new ResizeObserver(() => {
    cc.width = Math.floor(cw.offsetWidth);
    cc.height = Math.floor(cw.offsetHeight);
    loop();
  }).observe(cw);

  //File upload
  function handleFile(file) {
    const fr = new FileReader();
    fr.onload = () => {
      $id("btn-reset").click();
      const arr = new Uint8Array(fr.result);
      gb.loadROM(arr);
      localStorage.setItem('lastrom', arrayToString(arr));
      localStorage.getItem('lastrom');
    }
    fr.readAsArrayBuffer(file);
  }

  //Drag and drop
  function drag_in(event) {
    // Allow drop
    event.preventDefault();
    $id("drop-wrapper").style.background = 'var(--drop-bg)';
    $id("drop-form").style.opacity = 0;
    $id("drop-hint").style.display = 'flex';
    event.dataTransfer.dropEffect = "copy";
  }
  function drag_out(event) {
    $id("drop-wrapper").style.background = 'var(--default-bg)';
    $id("drop-form").style.opacity = 1;
    $id("drop-hint").style.display = 'none';
  }
  $id("drop-wrapper").addEventListener('dragover', drag_in);
  $id("drop-wrapper").addEventListener('dragleave', drag_out);
  $id("drop-wrapper").addEventListener('drop', (event) => {
    drag_out(event);
    event.preventDefault();
    event.stopPropagation();
    handleFile(event.dataTransfer.files[0]);
  });

  //Manual Upload
  $id("drop-manual").addEventListener('change', (event) => {
    handleFile(event.target.files[0]);
  });

  //Handle last rom
  if(localStorage.getItem('lastrom')) {
    $id("last-rom").style.setProperty('display', 'inline-block');
  }
  button("last-rom", (btn) => {
    const arr = stringToArray(localStorage.getItem('lastrom'));
    $id("btn-reset").click();
    gb.loadROM(arr);
  });

  //Breakpoint buttons
  function inputHex(id) {
    return parseInt($id(id).value, 16)
  }

  //PC Breakpoints
  button("brk-add", (btn) => {
    console.log('Breakpoint set');
    gb.setBreakpoint(inputHex("brk-input"), true);
  });
  button("brk-rem", (btn) => {
    console.log('Breakpoint unset');
    gb.setBreakpoint(inputHex("brk-input"), undefined);
  });

  //MMU Breakpoints
  button("mbrk-r", (btn) => {
    console.log('MMUBreakpoint set');
    gb.setMMUbreakpoint(inputHex("mbrk-input"), 'r');
  });
  button("mbrk-w", (btn) => {
    console.log('MMUBreakpoint set');
    gb.setMMUbreakpoint(inputHex("mbrk-input"), 'w');
  });
  button("mbrk-a", (btn) => {
    console.log('MMUBreakpoint set');
    gb.setMMUbreakpoint(inputHex("mbrk-input"), 'a');
  });
  button("mbrk-rem", (btn) => {
    console.log('MMUBreakpoint unset');
    gb.setMMUbreakpoint(inputHex("mbrk-input"), undefined);
  });

  //skip br toggle
  $id("skipBR").addEventListener('change', () => {
    $id("btn-reset").click();
  });

  //Stub LY toggle
  const sly = $id("stubLY")
  sly.addEventListener('change', () => {
    gb.stubLY = sly.checked;
  });

  //scale toggle
  $id("scale2x").addEventListener('change', loop);
  let cflimit = $class("flimit");
  for(let i = 0; i < cflimit.length; i++) {
    cflimit.item(i).addEventListener('change', loop);
  };

  //Enable input on click
  $id("gb-canvas-wrapper").addEventListener('click', (ev) => {
    ev.stopPropagation();
    gb.input.enable();
    loop();
  });
  document.addEventListener('click', (ev) => {
    let et = event.target;
    let tn = event.target.tagName;
    let dis = (tn=="MAIN" || tn=="BODY" || tn=="HTML" || et.classList.contains("pass"));
    if(dis) {
      gb.input.disable();
      loop();
    }
  });

  //Remove deferred and noscript
  const deferred = $class("defer");
  for (let i = 0; i < deferred.length; i++) {
    deferred[i].classList.remove("defer");
  }
  $id("noscript").remove();
});
