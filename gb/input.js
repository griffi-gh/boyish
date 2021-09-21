const keyMap = {
  ArrowRight: (1 << 0),
  ArrowLeft:  (1 << 1),
  ArrowUp:    (1 << 2),
  ArrowDown:  (1 << 3),
  KeyZ:  (1 << 4),
  KeyX:  (1 << 5),
  Space: (1 << 6),
  Enter: (1 << 7),
}

export default class Input {
  constructor(gb) {
    this.gb = gb;
    this._callback = null;
    this.enabled = false;
    this.keyState = 0xFF;
    this.select = 0;
  }
  get joyp() {
    switch (this.select) {
      case 0x10: return (this.keyState >> 4);
      case 0x20: return (this.keyState & 0xFF);
      default: return 0;
    }
  }
  set joyp(v) {
    this.select = v & 0x30;
  }
  inputHandler(ev) {
    const code = ev.code;
    if(code in keyMap) {
      let keyMask = keyMap[code];
      if(event.type === 'keydown') {
        this.keyState &= (~keyMask) & 0xFF;
        this.gb.cpu.irq.if |= 0x10;
      } else {
        this.keyState |= keyMask;
      }
      ev.preventDefault();
      ev.stopPropagation();
    }
  }
  enable() {
    if(!this.enabled) {
      this._callback = this.inputHandler.bind(this);
      document.addEventListener('keydown', this._callback);
      document.addEventListener('keyup', this._callback);
      this.enabled = true;
    }
  }
  disable() {
    if(this.enabled) {
      document.removeEventListener('keydown', this._callback);
      document.removeEventListener('keyup', this._callback);
      this._callback = null;
      this.enabled = false;
    }
  }
}