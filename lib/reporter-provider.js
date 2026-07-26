const logger = require("./logger");

class ReporterProvider {
  constructor(createProvider) {
    this.createProvider = createProvider;
    this.messages = new Set();
  }

  async reportBusyWhile(title, f, options) {
    logger.debug("Reporting busy while promise runs", { title });
    const busyMessage = this.reportBusy(title, options);
    try {
      return await f();
    } finally {
      busyMessage.dispose();
    }
  }

  reportBusy(title, options) {
    const provider = this.createProvider();
    provider.add(title, options);
    logger.debug("Reported busy message", { title });

    const busyMessage = {
      setTitle: (newTitle) => {
        provider.changeTitle(newTitle, title);
        logger.debug("Updated busy message title", { oldTitle: title, title: newTitle });
        title = newTitle;
      },
      dispose: () => {
        provider.dispose();
        this.messages.delete(busyMessage);
        logger.debug("Disposed busy message", { title, messageCount: this.messages.size });
      },
    };
    this.messages.add(busyMessage);

    return busyMessage;
  }

  dispose() {
    logger.debug("Disposing reporter provider", { messageCount: this.messages.size });
    this.messages.forEach((msg) => {
      msg.dispose();
    });
    this.messages.clear();
  }
}

module.exports = { ReporterProvider };
