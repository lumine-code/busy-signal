describe("Busy signal status payload lifetime", () => {
  let main, hub, consumer, bars, providers, StatusBarView;
  const tiles = (bar) =>
    bar.getRightTiles().filter((tile) => tile.getItem().matches?.("busy-signal"));

  beforeEach(async () => {
    jasmine.attachToDOM(lumine.workspace.getElement());
    await lumine.packages.activatePackage("status-bar");
    StatusBarView = lumine.packages.getActivePackage("status-bar").mainModule.statusBar.constructor;
    main = (await lumine.packages.activatePackage("busy-signal")).mainModule;
    hub = new lumine.packages.serviceHub.constructor();
    consumer = hub.consume("status-bar", "^1.0.0", (bar) => main.consumeStatusBar(bar));
    bars = [];
    providers = [];
  });

  afterEach(async () => {
    consumer.dispose();
    providers.forEach((provider) => provider.dispose());
    await lumine.packages.deactivatePackage("busy-signal");
    for (const bar of bars) bar.destroy();
  });

  function provide(bar) {
    if (!bar) {
      bar = new StatusBarView();
      bars.push(bar);
      jasmine.attachToDOM(bar.element);
    }
    const provider = hub.provide("status-bar", "1.0.0", bar);
    providers.push(provider);
    return { bar, provider };
  }

  it("keeps the live shared payload when the newest duplicate lease is withdrawn", () => {
    const first = provide(),
      second = provide(first.bar);
    const task = main.provideBusySignal().create();
    task.add("Shared live task");

    second.provider.dispose();

    expect(tiles(first.bar).length).toBe(1);
    expect(main.instance.element.tooltipContent?.textContent).toContain("Shared live task");
    first.provider.dispose();
    expect(tiles(first.bar).length).toBe(0);
    task.dispose();
  });

  it("restores the previous live distinct bar with current messages and history", () => {
    const first = provide(),
      second = provide();
    const task = main.provideBusySignal().create();
    task.add("Completed task");
    task.remove("Completed task");
    task.add("Still busy");
    expect(tiles(first.bar).length).toBe(0);
    expect(tiles(second.bar).length).toBe(1);

    second.provider.dispose();

    expect(tiles(first.bar).length).toBe(1);
    expect(main.instance.element.tooltipContent?.textContent).toContain("Completed task");
    expect(main.instance.element.tooltipContent?.textContent).toContain("Still busy");
    task.dispose();
  });

  it("keeps a replacement activation alive when an old shared lease ends", async () => {
    const first = provide(),
      second = provide(first.bar);
    await lumine.packages.deactivatePackage("busy-signal");
    main = (await lumine.packages.activatePackage("busy-signal")).mainModule;
    const current = provide(first.bar);

    second.provider.dispose();
    first.provider.dispose();

    expect(tiles(current.bar).length).toBe(1);
    expect(main.instance.element.isConnected).toBe(true);
  });

  it("serializes replacement consumption during tile allocation before moving the singleton", () => {
    const olderBar = new StatusBarView(),
      newerBar = new StatusBarView();
    bars.push(olderBar, newerBar);
    jasmine.attachToDOM(olderBar.element);
    jasmine.attachToDOM(newerBar.element);
    const add = olderBar.addRightTile.bind(olderBar);
    spyOn(olderBar, "addRightTile").and.callFake((options) => {
      const tile = add(options);
      provide(newerBar);
      return tile;
    });

    provide(olderBar);

    expect(tiles(olderBar).length).toBe(0);
    expect(tiles(newerBar).length).toBe(1);
    expect(main.instance.element.isConnected).toBe(true);
    expect(main.instance.element.parentElement).toBe(newerBar.rightPanel);
  });

  it("retires a tile returned after package deactivation during allocation", () => {
    const bar = new StatusBarView();
    bars.push(bar);
    jasmine.attachToDOM(bar.element);
    const add = bar.addRightTile.bind(bar);
    spyOn(bar, "addRightTile").and.callFake((options) => {
      const tile = add(options);
      main.deactivate();
      return tile;
    });

    provide(bar);

    expect(tiles(bar).length).toBe(0);
    expect(main.instance.element.isConnected).toBe(false);
    expect(main.instance.element.tooltip).toBeNull();
  });
});
