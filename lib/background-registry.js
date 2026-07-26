const { CompositeDisposable, Emitter } = require("atom");
const BackgroundProvider = require("./background-provider");
const logger = require("./logger");

const STATUSES = ["starting", "running", "failed", "stopped"];
const DEFAULT_STATUS = "running";

function normalizeStatus(status) {
  if (typeof status === "string" && STATUSES.includes(status)) {
    return status;
  }
  if (status !== undefined) {
    logger.warn("Unknown background status, falling back to running", { status });
  }
  return DEFAULT_STATUS;
}

// Pools the long-running entries of every background provider. Unlike the
// transient registry there is no history: an entry lives until its provider
// removes it, clears, or is disposed.
class BackgroundRegistry {
  constructor() {
    this.emitter = new Emitter();
    this.providers = new Set();
    this.subscriptions = new CompositeDisposable();
    this.subscriptions.add(this.emitter);

    this.entries = new Map();
  }
  // Public method
  create() {
    const provider = new BackgroundProvider();
    logger.debug("Created background provider", { providerId: provider.id });
    provider.onDidSet(({ id, entry }) => {
      this.entrySet(provider, id, entry);
    });
    provider.onDidRemove((id) => {
      this.entryRemove(provider, id);
    });
    provider.onDidClear(() => {
      this.entryClear(provider);
    });
    provider.onDidDispose(() => {
      this.entryClear(provider);
      this.providers.delete(provider);
      logger.debug("Disposed background provider", { providerId: provider.id });
    });
    this.providers.add(provider);
    return provider;
  }
  entrySet(provider, id, entry) {
    if (typeof id !== "string" || !id.length) {
      logger.warn("Ignoring background entry with an invalid id", { id });
      return;
    }

    const source = entry || {};
    const key = `${provider.id}::${id}`;
    const existing = this.entries.get(key);
    const value = {
      key,
      id,
      title: typeof source.title === "string" && source.title.length ? source.title : id,
      detail: typeof source.detail === "string" ? source.detail : null,
      status: normalizeStatus(source.status),
      provider,
      // Keep the original timestamp on an upsert so a status transition does
      // not reorder the zone.
      timeStarted: existing ? existing.timeStarted : Date.now(),
    };

    // Map.set keeps the insertion order of an existing key, so updating an
    // entry in place never shuffles the list.
    this.entries.set(key, value);
    logger.debug(existing ? "Updated background entry" : "Added background entry", {
      key,
      title: value.title,
      status: value.status,
      entryCount: this.entries.size,
    });
    this.emitter.emit("did-update");
  }
  entryRemove(provider, id) {
    const key = `${provider.id}::${id}`;
    const value = this.entries.get(key);
    if (value) {
      this.entries.delete(key);
      logger.debug("Removed background entry", { key, entryCount: this.entries.size });
      this.emitter.emit("did-update");
    }
  }
  entryClear(provider) {
    let triggerUpdate = false;
    this.entries.forEach((value) => {
      if (value.provider === provider) {
        triggerUpdate = true;
        this.entries.delete(value.key);
        logger.debug("Cleared background entry", { key: value.key, title: value.title });
      }
    });
    if (triggerUpdate) {
      this.emitter.emit("did-update");
    }
  }
  getEntries() {
    return Array.from(this.entries.values()).map(({ id, title, detail, status }) => ({
      id,
      title,
      detail,
      status,
    }));
  }
  onDidUpdate(callback) {
    return this.emitter.on("did-update", callback);
  }
  dispose() {
    logger.debug("Disposing background registry", { providerCount: this.providers.size });
    for (const provider of this.providers) {
      provider.dispose();
    }
    this.subscriptions.dispose();
  }
}

module.exports = BackgroundRegistry;
