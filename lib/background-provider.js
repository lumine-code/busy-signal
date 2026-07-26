const { CompositeDisposable, Emitter } = require("atom");
const { generateRandom } = require("./helpers");

// Provider handed out by the background registry. Mirrors the transient
// Provider, but its entries are keyed by a caller-supplied id and stay in the
// status bar until they are removed instead of being pushed into a history.
class BackgroundProvider {
  constructor() {
    this.id = generateRandom();
    this.emitter = new Emitter();
    this.subscriptions = new CompositeDisposable();

    this.subscriptions.add(this.emitter);
  }

  // Public
  set(id, entry) {
    this.emitter.emit("did-set", { id, entry });
  }
  // Public
  remove(id) {
    this.emitter.emit("did-remove", id);
  }
  // Public
  clear() {
    this.emitter.emit("did-clear");
  }

  onDidSet(callback) {
    return this.emitter.on("did-set", callback);
  }
  onDidRemove(callback) {
    return this.emitter.on("did-remove", callback);
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

module.exports = BackgroundProvider;
