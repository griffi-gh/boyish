export default class PixelCanvas {
  constructor(id, width, height) {
    if (width instanceof Array) {
      [width, height] = width;
    }
    this.canvas = document.getElementById(id);
    this.canvas.width = width;
    this.canvas.height = height;
    this.canvas.style.setProperty('background','black');
    this.ctx = this.canvas.getContext('2d', {alpha: false});
    if(!this.ctx) { throw new Error("Failed to get Canvas context"); }
    this.img = this.ctx.createImageData(width, height);
    this.clear(255,255,255);
    this.blit();
    //console.log(`PixelCanvas created with size ${width}x${height}`);
  }
  clear(r, g, b) {
    const color = [r, g, b, 255];
    let data = this.img.data;
    for (let [i, v] of data.entries()) {
      data[i] = color[i % 4];
    }
  }
  set(x, y, r, g, b) {
    let index = 4 * (x + y * this.img.width);
    let imgData = this.img.data;
    imgData[index+0] = r;
    imgData[index+1] = g;
    imgData[index+2] = b;
  }
  setArr(x, y, a) {
    this.set(x, y, a[0], a[1], a[2]);
  }
  blit() {
    this.ctx.putImageData(this.img, 0, 0);
  }
  get width() { return this.canvas.width; }
  get height() { return this.canvas.height; }
}