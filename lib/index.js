const BusySignal = require("./main");
const logger = require("./logger");

module.exports = {
  activate() {
    logger.debug("Activating package");
    this.instance = new BusySignal();
    this.debugSubscription = atom.config.observe("busy-signal.debug", (enabled) => {
      if (enabled) logger.debug("Debug logging enabled");
    });
  },
  consumeStatusBar(statusBar) {
    logger.debug("Consuming status-bar service");
    this.instance.attach(statusBar);
  },
  // One service for both zones. They are two registries because their data
  // models differ — transient titles with a history, versus long-running
  // entries keyed by a stable id — but that split belongs below the service
  // boundary, not in the name a consumer has to know.
  provideBusySignal() {
    logger.debug("Providing busy-signal service");
    const { registry, backgroundRegistry } = this.instance;
    return {
      create: () => registry.create(),
      createBackground: () => backgroundRegistry.create(),
    };
  },
  deactivate() {
    logger.debug("Deactivating package");
    if (this.debugSubscription) {
      this.debugSubscription.dispose();
      this.debugSubscription = null;
    }
    this.instance.dispose();
  },
};
