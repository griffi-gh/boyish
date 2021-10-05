const kbMap = {
  ArrowRight: 'RIGHT',
  ArrowLeft:  'LEFT',
  ArrowUp:    'UP',
  ArrowDown:  'DOWN',
  KeyZ:       'A',
  KeyX:       'B',
  Space:      'SELECT',
  Enter:      'START',
}

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
  inputEventHandler(ev) {
    if(!this.gb.paused) {
      if(ev.repeat) return;
      const code = ev.code;
      if(code in kbMap) {
        this.inputHandler(
          event.type === 'keydown',
          kbMap[code]
        );
        ev.preventDefault();
        ev.stopPropagation();
      }
    }
  }
  enable() {
    if(!this.enabled) {
      this._callback = this.inputEventHandler.bind(this);
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