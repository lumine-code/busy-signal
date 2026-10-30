// Authentic package usage. Run with lumine/script/demo.js; fixtures stay in demo/.
module.exports = {
  version: 1,
  dependencies: ["language-javascript", "build"],
  viewport: { width: 1100, height: 730 },
  async before() {},
  async prepare(context) {
    const { lumine, state, fixture, open } = context;
    state.editor = await open("build-sample/signal.js");
    await lumine.project.setPaths([fixture("build-sample")]);
  },
  scenes: [
    {
      id: "scene-1",
      file: "demo.png",
      caption: "Track a running project target through the busy indicator.",
      timeout: 60000,
      async run(context) {
        const { lumine } = context;
        {
          const b = lumine.packages.getActivePackage("build").mainModule;
          await b.refreshTargets();
          void b.runActiveTarget();
        }
      },
      ready(context) {
        const { lumine } = context;
        return Boolean(lumine.packages.getActivePackage("build").mainModule.activeProcess);
      },
    },
  ],
  async cleanup(context) {
    const { lumine } = context;
    await lumine.packages.getActivePackage("build").mainModule.stop();
  },
};
