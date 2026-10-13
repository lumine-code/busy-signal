describe("read-only busy indicator", () => {
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
  it("reports active work without exposing provider callbacks", () => {
    const action = jasmine.createSpy("ignored provider action");
    provider.add("Indexing", { onDidClick: action });
    expect(element.classList.contains("is-read-only")).toBe(true);
    expect(element.tooltipContent.textContent).toContain("Indexing");
    expect(element.titles[0].options).toBeUndefined();
    element.click();
    element.dispatchEvent(new MouseEvent("auxclick", { button: 1 }));
    element.tooltipContent.lastElementChild.click();
    expect(action).not.toHaveBeenCalled();
    expect(lumine.contextMenu.templateForElement(element)).toEqual([]);
  });
  it("keeps completed history informational", () => {
    provider.add("Finished");
    provider.remove("Finished");
    expect(element.classList.contains("is-read-only")).toBe(true);
    expect(element.tooltipContent.textContent).toContain("Finished");
    expect(lumine.contextMenu.templateForElement(element)).toEqual([]);
  });
});
