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
	return new Gameboy("gb-canvas");
}

window.addEventListener("load", function() {
	let gb = newGameboy();

	let btn_pause = button("btn-pause", (btn) => { 
		if(gb.paused) { gb.resume(); } else { gb.pause(); }
		btu();
		loop();
	});

	function btu() {
		btn_pause.textContent = gb.paused ? 'Play' : 'Pause';
	}

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
		btu();
		loop();
	});

	button("btn-log", (btn) => {
		gb.flushLog();
	});

	button("btn-dwn", (btn) => {
		gb.downloadLog();
	});

	button("btn-swlog", (btn) => {
		gb.disableLog ^= true;
		btn.innerHTML = gb.disableLog ? 'Enable logging' : 'Disable logging';
		if(gb.disableLog) { gb.logData = ''; }
		loop();
	});

	window.GB = gb

	function loop() {
		btu();
		const log = gb.logData;
		const emp = (log.length === 0);
		$id('log-size').innerHTML = humanFileSize(log.length, true);
		$id('log-line').innerHTML = log.split(/\r?\n/).at(-2);
		$id('log-info').style.display = (gb.disableLog || emp) ? 'none' : 'unset';
		$id('log-empty').style.display = (emp & (!gb.disableLog)) ? 'unset' : 'none';
		$id('log-disabled').style.display = gb.disableLog ? 'unset' : 'none';
	}
	setInterval(loop, 1000);
	loop();

	const deferred = $class("defer");
	for (let i = 0; i < deferred.length; i++) {
		deferred[i].classList.remove("defer");
	}
	$id("noscript").remove();
});
