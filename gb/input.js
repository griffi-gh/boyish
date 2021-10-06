import { isBrowser, isTouchDevice, getKeyByValue } from './common.js';

const keyMap = {
  RIGHT:  (1 << 0),
  LEFT:   (1 << 1),
  UP:     (1 << 2),
  DOWN:   (1 << 3),
  A:      (1 << 4),
  B:      (1 << 5),
  SELECT: (1 << 6),
  START:  (1 << 7),
}

export default class Input {
  constructor(gb) {
    this.gb = gb;
    this._kbCallback = null;
    this.enabled = false;
    this.keyState = 0xFF;
    this.select = 0;
    this.kbMap = {
      ArrowRight: 'RIGHT',
      ArrowLeft:  'LEFT',
      ArrowUp:    'UP',
      ArrowDown:  'DOWN',
      KeyZ:       'A',
      KeyX:       'B',
      Space:      'SELECT',
      KeyS:       'SELECT',
      Enter:      'START',
      KeyA:       'START',
    }
    this.touchMap = {};
  }
  get joyp() {
    switch (this.select) {
      case 0x10: return (this.actualKeyState >> 4);
      case 0x20: return (this.actualKeyState & 0xFF);
      default: return 0;
    }
  }
  set joyp(v) {
    this.select = v & 0x30;
  }
  inputHandler(isDown, key) {
    if(!this.gb.paused) {
      const keyMask = keyMap[key];
      const isCurrent = ((keyMask >= 0x10 && this.select == 0x10) || (keyMask < 0x10 && this.select == 0x20));
      if(isDown) {
        this.keyState &= (~keyMask) & 0xFF;
        if(isCurrent) {
          this.gb.cpu.irq.if |= 0x10; //Raise JOYP interrupt
        }
      } else {
        this.keyState |= keyMask;
      }
    }
  }
  get actualKeyState() {
    let ks = this.keyState;
    if((ks & 0b11) === 0) ks |= 0b11;
    if((ks & 0b1100) === 0) ks |= 0b1100;
    return ks;
  }
  inputEventHandler(ev) {
    ev.preventDefault();
    ev.stopPropagation();
    if(ev.repeat) return;
    if(!this.gb.paused) {
      const code = ev.code;
      if(code in this.kbMap) {
        this.inputHandler(
          event.type === 'keydown',
          this.kbMap[code]
        );
      }
    }
  }
  enable() {
    if(!this.enabled) {
      if(isBrowser()) {
        this.enabled = true;
        this.enableKeyboard();
        this.enableTouch();
      } else {
        console.warn("Not a browser");
      }
    }
  }
  disable() {
    if(this.enabled) {
      if(isBrowser()) {
        this.disableKeyboard();
        this.disableTouch();
      } else {
        console.warn("Not a browser");
      }
      this.enabled = false;
    }
  }
  enableKeyboard() {
    this._kbCallback = this.inputEventHandler.bind(this);
    document.addEventListener('keydown', this._kbCallback);
    document.addEventListener('keyup', this._kbCallback);
  }
  disableKeyboard() {
    document.removeEventListener('keydown', this._kbCallback);
    document.removeEventListener('keyup', this._kbCallback);
    this._kbCallback = null;
  }
  initTouch(buttons) {
    if(!(buttons instanceof Object)) {
      throw new Error(`Expected Object but got `+ typeof(buttons));
      return;
    }
    this._touch = isTouchDevice();
    if(this._touch) {
      for(const [i,v] of Object.entries(buttons)) {
        let e = document.getElementById(v);
        this.touchMap[i] = e;
        e.style.setProperty('display','none');
      }
    }
  }
  enableTouch() {
    if(this._touch) {
      for(const [i,v] of Object.entries(this.touchMap)) {
        e.style.setProperty('display','block');
      }
    }
  }
  disableTouch() {
    if(this._touch) {
      for(const [i,v] of Object.entries(this.touchMap)) {
        e.style.setProperty('display','none');
      }
    }
  }
}