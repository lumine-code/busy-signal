const { CompositeDisposable, Emitter } = require("lumine");
const Provider = require("./provider");
const logger = require("./logger");

function formatMs(n) {
  if (n < 1000) return `${n}ms`;
  return `${(n / 1000).toFixed(1)}s`;
}

class Registry {
  constructor() {
    this.emitter = new Emitter();
    this.providers = new Set();
    this.subscriptions = new CompositeDisposable();
    this.subscriptions.add(this.emitter);

    this.statuses = new Map();
    this.statusHistory = [];
  }
  // Public method
  create() {
    const provider = new Provider();
    logger.debug("Created provider", { providerId: provider.id });
    provider.onDidAdd(({ title, options }) => {
      this.statusAdd(provider, title, options);
    });
    provider.onDidRemove((title) => {
      this.statusRemove(provider, title);
    });
    provider.onDidChangeTitle(({ title, oldTitle }) => {
      this.statusChangeTitle(provider, title, oldTitle);
    });
    provider.onDidClear(() => {
      this.statusClear(provider);
    });
    provider.onDidDispose(() => {
      this.statusClear(provider);
      this.providers.delete(provider);
      logger.debug("Disposed provider", { providerId: provider.id });
    });
    this.providers.add(provider);
    return provider;
  }
  statusAdd(provider, title, options) {
    const key = `${provider.id}::${title}`;
    if (this.statuses.has(key)) {
      logger.debug("Replacing active status", { key, title });
      this.pushIntoHistory(this.statuses.get(key));
      this.statuses.delete(key);
    }

    const entry = {
      key,
      title,
      provider,
      timeStarted: Date.now(),
      timeStopped: null,
      options,
    };
    this.statuses.set(entry.key, entry);
    logger.debug("Added status", { key, title, activeCount: this.statuses.size });
    this.emitter.emit("did-update");
  }
  statusRemove(provider, title) {
    const key = `${provider.id}::${title}`;
    const value = this.statuses.get(key);
    if (value) {
      this.pushIntoHistory(value);
      this.statuses.delete(key);
      logger.debug("Removed status", { key, title, activeCount: this.statuses.size });
      this.emitter.emit("did-update");
    }
  }
  statusChangeTitle(provider, title, oldTitle) {
    const oldKey = `${provider.id}::${oldTitle}`;
    const entry = this.statuses.get(oldKey);
    if (!entry) {
      return;
    }

    this.statuses.delete(oldKey);

    entry.title = title;
    entry.key = `${provider.id}::${title}`;

    this.statuses.set(entry.key, entry);
    logger.debug("Changed status title", { oldTitle, title, key: entry.key });
    this.emitter.emit("did-update");
  }
  statusClear(provider) {
    let triggerUpdate = false;
    this.statuses.forEach((value) => {
      if (value.provider === provider) {
        triggerUpdate = true;
        this.pushIntoHistory(value);
        this.statuses.delete(value.key);
        logger.debug("Cleared status", { key: value.key, title: value.title });
      }
    });
    if (triggerUpdate) {
      this.emitter.emit("did-update");
    }
  }
  pushIntoHistory(status) {
    status.timeStopped = Date.now();
    let i = this.statusHistory.length;
    while (i--) {
      if (this.statusHistory[i].key === status.key) {
        this.statusHistory.splice(i, 1);
        break;
      }
    }
    this.statusHistory.push(status);
    this.statusHistory = this.statusHistory.slice(-10);
    logger.debug("Pushed status into history", {
      key: status.key,
      title: status.title,
      duration: formatMs(status.timeStopped - status.timeStarted),
      historyCount: this.statusHistory.length,
    });
  }
  getTilesActive() {
    return Array.from(this.statuses.values()).sort((a, b) => b.timeStarted - a.timeStarted);
  }
  getTilesOld() {
    const oldTiles = [];

    this.statusHistory.forEach((entry) => {
      if (this.statuses.has(entry.key)) return;
      oldTiles.push({
        title: entry.title,
        duration: formatMs((entry.timeStopped || 0) - entry.timeStarted),
      });
    });

    return oldTiles;
  }
  onDidUpdate(callback) {
    return this.emitter.on("did-update", callback);
  }
  dispose() {
    logger.debug("Disposing registry", { providerCount: this.providers.size });
    for (const provider of this.providers) {
      provider.dispose();
    }
    this.subscriptions.dispose();
  }
}

module.exports = Registry;
