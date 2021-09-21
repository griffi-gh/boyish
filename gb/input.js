const keyMap = {
  ArrowRight: 0x01,
  ArrowLeft:  0x02,
  ArrowUp:    0x04,
  ArrowDown:  0x08,
}

export default class Input {
  constructor() {
    this._callback = null;
    this.enabled = false;
  }
  inputHandler(ev) {
    const code = ev.code;
    const down = (event.type === 'keyup');
    if(code in keyMap) {
      ev.preventDefault();
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