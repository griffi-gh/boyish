export default class PixelCanvas {
  constructor(id, width, height) {
    if(!(window && navigator)) {
      throw new Error("Not a browser");
      return;
    }
    if (width instanceof Array) {
      [width, height] = width;
    }
    this.canvas = document.getElementById(id);
    this.canvas.width = width;
    this.canvas.height = height;
    this.canvas.style.setProperty('background', 'black');
    this.canvas.style.setProperty('image-rendering', '-moz-crisp-edges');
    this.canvas.style.setProperty('image-rendering', 'crisp-edges');
    this.canvas.style.setProperty('image-rendering', '-webkit-optimize-contrast');
    this.canvas.style.setProperty('image-rendering', 'optimizeSpeed');
    this.canvas.style.setProperty('image-rendering', 'pixelated');
    this.canvas.style.setProperty('-ms-interpolation-mode', 'nearest-neighbor');
    let shouldUseDesync = true;
    if(navigator && navigator.userAgentData) {
      navigator.userAgentData.brands.forEach((v,i) => {
        if(!shouldUseDesync) return;
        if(v.brand && (v.brand.toLowerCase().search('edge') > 0)) {
          shouldUseDesync = false;
          console.warn('MS Edge detected. Falling back non-desynchronized canvas');
        }
      });
    }
    this.ctx = this.canvas.getContext('2d', {
      alpha: false,
      desynchronized: shouldUseDesync,
      preserveDrawingBuffer: true
    });
    if(!this.ctx) { throw new Error("Failed to get Canvas context"); }
    if(this.ctx.imageSmoothingEnabled === undefined) {
      this.ctx.mozImageSmoothingEnabled = false;
    }
    this.ctx.webkitImageSmoothingEnabled = false;
    this.ctx.imageSmoothingEnabled = false;
    this.img = this.ctx.createImageData(width, height);
    this.clear(255,255,255);
    this.blit();
    this.offsetCache = [];
    for(let i = 0; i <= height; i++) {
      this.offsetCache[i] = this.calcLineOffset(i);
    }
    this.frameStart();
  }
  get width() { return this.canvas.width; }
  get height() { return this.canvas.height; }

  clear(r, g, b) {
    const color = [r, g, b, 255];
    let data = this.img.data;
    for (let [i, v] of data.entries()) {
      data[i] = color[i % 4];
    }
  }
  blit() {
    this.ctx.putImageData(this.img, 0, 0);
  }

  calcLineOffset(y) {
    return (y * this.img.width) << 2;
  }
  getLineOffset(y) {
    return this.offsetCache[y];
  }

  frameStart() {
    this._i = 0;
    this._d = this.img.data;
    return;
  }
  lineStart(y) {
    this._i = this.getLineOffset(y);
    this._d = this.img.data;
    return this;
  }
  linePut(r,g,b) {
    let _d = this._d;
    _d[this._i] = r;
    _d[this._i+1] = g;
    _d[this._i+2] = b;
    this._i += 4;
  }
  lineSkip() {
    this._i += 4;
  }

  // Very slow!
  setIndex(i, r, g, b) {
    const imgData = this.img.data;
    imgData[i] = r;
    imgData[i+1] = g;
    imgData[i+2] = b;
  }
  set(x, y, r, g, b) {
    let index = 4 * (x + y * this.img.width);
    let imgData = this.img.data;
    this.setIndex(index, r, g, b)
  }
  setArr(x, y, a) {
    this.set(x, y, a[0], a[1], a[2]);
  }
}