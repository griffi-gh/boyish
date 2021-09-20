import {Gameboy} from './gb/gb.js';

const $id = (i) => { return document.getElementById(i) };
const $class = (i) => { return document.getElementsByClassName(i);}

// https://stackoverflow.com/questions/10420352/converting-file-size-in-bytes-to-human-readable-string/10420404
function humanFileSize(B,i){var e=i?1e3:1024;if(Math.abs(B)<e)return B+" B";var a=i?["kB","MB","GB","TB","PB","EB","ZB","YB"]:["KiB","MiB","GiB","TiB","PiB","EiB","ZiB","YiB"],t=-1;do B/=e,++t;while(Math.abs(B)>=e&&t<a.length-1);return B.toFixed(1)+" "+a[t]}

function button(id, fn) {
	const btn = document.getElementById(id);
	//btn.onclick = () => { fn(btn); };
	btn.addEventListener("click", () => { fn(btn); });
	btn.style.cssText += `width: ${(btn.getBoundingClientRect().width + 10).toString()}px;`;
	return btn;
}
function newGameboy() {
	const gb = new Gameboy("gb-canvas");
	//gb.setBreakpoint(0xFA);
	gb.stubLY = $id("stubLY").checked;
	if($id("skipBR").checked) {
		gb.skipBoot();
	}
	return gb;
}

window.addEventListener("load", function() {
	let gb = newGameboy();

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
		gb = newGameboy();
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

	window.GB = gb

	function loop() {
		$id("gb-canvas").classList.toggle("scaled", $id("scale2x").checked);
		btn_log.innerHTML = gb.disableLog ? 'Enable logging' : 'Disable logging';
		btn_pause.innerHTML = gb.paused ? 'Play' : 'Pause';
		const log = gb.logData;
		const emp = (log.length === 0);
		$id('log-size').innerHTML = humanFileSize(log.length, true);
		$id('log-line').innerHTML = log.split(/\r?\n/).at(-2);
		$id('log-info').style.display = (gb.disableLog || emp) ? 'none' : 'unset';
		$id('log-empty').style.display = (emp & (!gb.disableLog)) ? 'unset' : 'none';
		$id('log-disabled').style.display = gb.disableLog ? 'unset' : 'none';
		if($id('cdebug-toggle').checked) {
			gb.ppu.debugTileset("cdebug");
		}
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
			localStorage.setItem('lastrom', JSON.stringify(arr));
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
		const obj = JSON.parse(localStorage.getItem('lastrom'));
		const arr = new Uint8Array(Object.values(obj));
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

	//Remove deferred and noscript
	const deferred = $class("defer");
	for (let i = 0; i < deferred.length; i++) {
		deferred[i].classList.remove("defer");
	}
	$id("noscript").remove();
});
