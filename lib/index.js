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
  provideBusySignal() {
    logger.debug("Providing busy-signal service");
    const { registry } = this.instance;
    return { create: () => registry.create() };
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
