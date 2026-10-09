const { CompositeDisposable, Emitter } = require("lumine");
const { generateRandom } = require("./helpers");

class Provider {
  constructor() {
    this.disposed = false;
    this.id = generateRandom();
    this.emitter = new Emitter();
    this.subscriptions = new CompositeDisposable();

    this.subscriptions.add(this.emitter);
  }

  // Public
  add(title, options) {
    if (this.disposed) return;
    this.emitter.emit("did-add", { title, options });
  }
  // Public
  remove(title) {
    if (this.disposed) return;
    this.emitter.emit("did-remove", title);
  }
  // Public
  changeTitle(title, oldTitle) {
    if (this.disposed) return;
    this.emitter.emit("did-change-title", { title, oldTitle });
  }
  // Public
  clear() {
    if (this.disposed) return;
    this.emitter.emit("did-clear");
  }

  onDidAdd(callback) {
    return this.emitter.on("did-add", callback);
  }
  onDidRemove(callback) {
    return this.emitter.on("did-remove", callback);
  }
  onDidChangeTitle(callback) {
    return this.emitter.on("did-change-title", callback);
  }
  onDidClear(callback) {
    return this.emitter.on("did-clear", callback);
  }
  onDidDispose(callback) {
    return this.emitter.on("did-dispose", callback);
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    try {
      this.emitter.emit("did-dispose");
    } finally {
      this.subscriptions.dispose();
    }
  }
}

module.exports = Provider;
