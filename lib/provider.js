const { CompositeDisposable, Emitter } = require("lumine");
const { generateRandom } = require("./helpers");

class Provider {
  constructor() {
    this.id = generateRandom();
    this.emitter = new Emitter();
    this.subscriptions = new CompositeDisposable();

    this.subscriptions.add(this.emitter);
  }

  // Public
  add(title, options) {
    this.emitter.emit("did-add", { title, options });
  }
  // Public
  remove(title) {
    this.emitter.emit("did-remove", title);
  }
  // Public
  changeTitle(title, oldTitle) {
    this.emitter.emit("did-change-title", { title, oldTitle });
  }
  // Public
  clear() {
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
    this.emitter.emit("did-dispose");
    this.subscriptions.dispose();
  }
}

module.exports = Provider;
