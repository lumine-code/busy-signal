describe("busy task context menu", () => {
  let main, provider, element;
  beforeEach(async () => {
    jasmine.attachToDOM(lumine.workspace.getElement());
    main = (await lumine.packages.activatePackage("busy-signal")).mainModule;
    element = main.instance.element;
    lumine.workspace.getElement().appendChild(element);
    provider = main.provideBusySignal().create();
  });
  afterEach(async () => {
    provider.dispose();
    await lumine.packages.deactivatePackage("busy-signal");
  });
  it("offers live provider actions without invoking them on right click", async () => {
    const action = jasmine.createSpy("cancel");
    provider.add("Indexing", { onDidClick: action, actionLabel: "Cancel Indexing" });
    provider.add("Read Only");
    element.dispatchEvent(new MouseEvent("mouseup", { button: 2, bubbles: true }));
    const template = lumine.contextMenu.templateForElement(element);
    expect(action).not.toHaveBeenCalled();
    expect(template.length).toBe(1);
    expect(template[0].submenu.map((item) => item.label)).toEqual(["Cancel Indexing"]);
    expect(element.classList.contains("is-read-only")).toBe(false);
    const item = template[0].submenu[0];
    await lumine.commands.dispatch(element, item.command, item.commandDetail);
    expect(action).toHaveBeenCalledTimes(1);
    expect(action.calls.mostRecent().args[0] instanceof MouseEvent).toBe(true);
  });
  it("ignores menu actions for finished tasks and removes menus on deactivation", async () => {
    const action = jasmine.createSpy("cancel");
    provider.add("Indexing", { onDidClick: action });
    const item = lumine.contextMenu.templateForElement(element)[0].submenu[0];
    provider.remove("Indexing");
    const replacement = jasmine.createSpy("replacement task");
    provider.add("Indexing", { onDidClick: replacement });
    await lumine.commands.dispatch(element, item.command, item.commandDetail);
    expect(action).not.toHaveBeenCalled();
    expect(replacement).not.toHaveBeenCalled();
    provider.remove("Indexing");
    expect(lumine.contextMenu.templateForElement(element)).toEqual([]);
    await lumine.packages.deactivatePackage("busy-signal");
    expect(lumine.contextMenu.templateForElement(element)).toEqual([]);
  });
});
