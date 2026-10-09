const { CompositeDisposable, Disposable } = require("lumine");
const { SignalElement } = require("./element");
const Registry = require("./registry");
const logger = require("./logger");

class BusySignal {
  constructor() {
    logger.debug("Creating BusySignal instance");
    this.element = new SignalElement();
    this.registry = new Registry();
    this.subscriptions = new CompositeDisposable();
    this.attachment = null;
    this.attachmentRecord = null;
    this.statusBars = new Map();
    this.statusEdges = [];
    this.rebinding = false;
    this.disposed = false;

    this.subscriptions.add(this.element);
    this.subscriptions.add(this.registry);

    this.subscriptions.add(
      this.registry.onDidUpdate(() => {
        if (this.disposed) return;
        const activeTiles = this.registry.getTilesActive();
        const oldTiles = this.registry.getTilesOld();
        logger.debug("Updating status element", {
          activeCount: activeTiles.length,
          historyCount: oldTiles.length,
        });
        this.element.update(activeTiles, oldTiles);
      }),
    );
  }
  attach(statusBar) {
    if (this.disposed) return new Disposable();
    let record = this.statusBars.get(statusBar);
    if (!record) {
      record = { statusBar, leases: 0 };
      this.statusBars.set(statusBar, record);
    }
    record.leases++;
    const edge = { record };
    this.statusEdges.push(edge);
    const lease = new Disposable(() => {
      this.subscriptions.remove(lease);
      if (this.statusBars.get(statusBar) !== record) return;
      const index = this.statusEdges.indexOf(edge);
      if (index < 0) return;
      this.statusEdges.splice(index, 1);
      if (--record.leases === 0) this.statusBars.delete(statusBar);
      this.updateAttachment();
    });
    this.subscriptions.add(lease);
    try {
      this.updateAttachment();
    } catch (error) {
      lease.dispose();
      throw error;
    }
    return lease;
  }
  updateAttachment() {
    // One element belongs to the latest live connection. Serialize
    // reentrant rebinding so an older tile cannot remove a newly moved element.
    if (this.rebinding || this.disposed) return;
    this.rebinding = true;
    try {
      while (!this.disposed) {
        let record = this.statusEdges.at(-1)?.record;
        if (this.attachment && this.attachmentRecord === record) break;
        const previous = this.attachment;
        this.attachment = null;
        this.attachmentRecord = null;
        previous?.dispose();
        record = this.statusEdges.at(-1)?.record;
        if (this.disposed || !record) break;

        logger.debug("Attaching status-bar tile");
        // Activity band, see the priority convention in the status-bar README.
        const tile = record.statusBar.addRightTile({ item: this.element, priority: 610 });
        const registration = new Disposable(() => {
          logger.debug("Destroying status-bar tile");
          tile.destroy();
          this.subscriptions.remove(registration);
        });
        if (this.disposed || record !== this.statusEdges.at(-1)?.record) {
          registration.dispose();
          continue;
        }
        this.attachment = registration;
        this.attachmentRecord = record;
        this.subscriptions.add(registration);
      }
    } finally {
      this.rebinding = false;
    }
  }
  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.statusBars.clear();
    this.statusEdges.length = 0;
    this.attachment = null;
    this.attachmentRecord = null;
    logger.debug("Disposing BusySignal instance");
    this.subscriptions.dispose();
  }
}

module.exports = BusySignal;
