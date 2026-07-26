# busy-signal.reporter

Reports that something is happening, in the shape most callers actually want: wrap a promise, or take a handle and dispose it when done.

|             |                                                             |
| ----------- | ----------------------------------------------------------- |
| Version     | `1.0.0`                                                     |
| Provided by | `provideBusySignalReporter()` returning the reporter        |
| Consumed by | `consumeBusySignalReporter(reporter)`                       |
| Owner       | [`busy-signal`](https://github.com/lumine-code/busy-signal) |

The high-level entry point, and the one to reach for first. [`busy-signal.registry`](busy-signal.registry.md) is the same thing without the ergonomics, and [`busy-signal.background-registry`](busy-signal.background-registry.md) is for work that runs for minutes rather than seconds.

## Registration

In your `package.json`:

```json
{
  "consumedServices": {
    "busy-signal.reporter": {
      "versions": { "^1.0.0": "consumeBusySignalReporter" }
    }
  }
}
```

## Contract

```ts
type Reporter = {
  reportBusyWhile<T>(title: string, work: () => Promise<T>, options?: object): Promise<T>;
  reportBusy(title: string, options?: object): BusyMessage;
  dispose(): void;
};

type BusyMessage = {
  setTitle(title: string): void;
  dispose(): void;
};
```

| Member                                  | Description                                                                                                                    |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `reportBusyWhile(title, work, options)` | Shows the message, awaits `work()`, and clears the message whether it resolves or rejects. Returns whatever `work()` returned. |
| `reportBusy(title, options)`            | Shows the message and hands back a handle. **You must dispose it.**                                                            |
| `dispose()`                             | A no-op on the service object itself — see Teardown.                                                                           |

## Minimal example

```js
const { Disposable } = require("atom");

module.exports = {
  consumeBusySignalReporter(reporter) {
    this.busy = reporter;
    return new Disposable(() => (this.busy = null));
  },

  async lint(editor) {
    // Cleared automatically, including if runMyTool throws.
    return this.busy.reportBusyWhile(`Linting ${editor.getTitle()}`, () => runMyTool(editor));
  },
};
```

## Behavior

**Prefer `reportBusyWhile`.** Its `finally` clears the message even when the work throws, which is the failure mode that otherwise leaves a spinner stuck in the status bar forever.

Each call creates its own underlying provider, so concurrent messages are independent and disposing one never affects another.

`setTitle` rewrites the message in place rather than adding a second one, which is what a multi-stage operation wants — "Downloading", then "Installing", under one entry.

The message is transient: it appears in the busy indicator's active list and then moves to its short history. For work the user should be able to watch for minutes, use the background registry instead.

## Teardown

Dispose every handle `reportBusy` returns. The service's own `dispose()` does nothing, so a consumer's `Disposable` should just drop the reference.

When `busy-signal` deactivates it disposes the outstanding messages itself, so a handle disposed after that is disposed twice — the handles tolerate it.

## Versioning

`1.0.0` provided, `^1.0.0` consumed. A change that breaks this shape gets a new service name rather than a new major version, and both sides move in the same release.
