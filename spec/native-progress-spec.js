describe("Busy signal native progress", () => {
  let main, reporter;

  beforeEach(async () => {
    await lumine.packages.deactivatePackage("busy-signal");
    reporter = {
      update: jasmine.createSpy("update").and.returnValue(Promise.resolve()),
      dispose: jasmine.createSpy("dispose").and.returnValue(Promise.resolve()),
    };
    spyOn(lumine.application, "createTaskProgress").and.returnValue(reporter);
    main = (await lumine.packages.activatePackage("busy-signal")).mainModule;
  });

  afterEach(async () => {
    await lumine.packages.deactivatePackage("busy-signal");
  });

  it("tracks active messages from independent service providers and clears the last one", () => {
    const first = main.provideBusySignal().create();
    const second = main.provideBusySignal().create();
    first.add("Building");
    second.add("Scanning");
    first.changeTitle("Finishing", "Building");
    first.dispose();
    second.clear();
    second.dispose();

    expect(reporter.update.calls.allArgs()).toEqual([
      [{ count: 1 }],
      [{ count: 2 }],
      [{ count: 2 }],
      [{ count: 1 }],
      [{ count: 0 }],
    ]);
  });

  it("retires the native reporter with the package and ignores old providers", async () => {
    const task = main.provideBusySignal().create();
    task.add("Building");
    await lumine.packages.deactivatePackage("busy-signal");
    expect(reporter.dispose).toHaveBeenCalledTimes(1);
    task.add("Stale work");
    expect(reporter.update).toHaveBeenCalledTimes(1);
  });
});
