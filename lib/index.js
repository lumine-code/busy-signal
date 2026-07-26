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
  provideBusySignalRegistry() {
    logger.debug("Providing busy-signal registry service");
    return this.instance.registry;
  },
  provideBusySignalBackgroundRegistry() {
    logger.debug("Providing busy-signal background registry service");
    return this.instance.backgroundRegistry;
  },
  provideBusySignalReporter() {
    logger.debug("Providing busy-signal reporter service");
    const provider = this.instance.reporterProvider;
    return {
      reportBusyWhile(title, f, options) {
        return provider.reportBusyWhile(title, f, options);
      },
      reportBusy(title, options) {
        return provider.reportBusy(title, options);
      },
      dispose() {
        // nop
      },
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
