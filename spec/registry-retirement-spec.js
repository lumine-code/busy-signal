describe("Busy signal registry retirement", () => {
  let main, service, registry;
  beforeEach(async () => {
    main = (await lumine.packages.activatePackage("busy-signal")).mainModule;
    service = main.provideBusySignal();
    registry = main.instance.registry;
  });

  it("does not register late work through a service from a retired activation", async () => {
    await lumine.packages.deactivatePackage("busy-signal");
    const current = await lumine.packages.activatePackage("busy-signal");
    const late = service.create();
    late.add("Late old task");

    expect(registry.providers.size).toBe(0);
    expect(registry.getTilesActive()).toEqual([]);
    expect(current.mainModule.instance.registry.providers.size).toBe(0);
    late.dispose();
  });

  it("notifies disposal once even when a disposer reenters the same provider", () => {
    const provider = service.create();
    provider.add("Completed at disposal");
    let calls = 0;
    provider.onDidDispose(() => {
      calls++;
      if (calls === 1) provider.dispose();
    });

    provider.dispose();
    provider.dispose();

    expect(calls).toBe(1);
    expect(registry.providers.size).toBe(0);
    expect(registry.getTilesOld().map((entry) => entry.title)).toEqual(["Completed at disposal"]);
  });

  it("does not resurrect a disposed provider's work from its disposal callback", () => {
    const provider = service.create();
    provider.add("Completed before callback");
    provider.onDidDispose(() => {
      provider.add("Orphan task");
      provider.changeTitle("Changed orphan", "Orphan task");
      provider.clear();
    });

    provider.dispose();

    expect(registry.providers.size).toBe(0);
    expect(registry.getTilesActive()).toEqual([]);
    expect(registry.getTilesOld().map((entry) => entry.title)).toEqual([
      "Completed before callback",
    ]);
  });
});
