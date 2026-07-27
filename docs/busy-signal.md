# busy-signal

Report work in progress on the status bar's busy indicator.

|             |                                                             |
| ----------- | ----------------------------------------------------------- |
| Version     | `1.0.0`                                                     |
| Provided by | `provideBusySignal()` returning the service                 |
| Consumed by | `consumeBusySignal(busySignal)`                             |
| Owner       | [`busy-signal`](https://github.com/lumine-code/busy-signal) |

`create()` hands out a provider for work that starts and finishes — compiling, scanning, loading a tool. The busy dot spins while any provider has a live message and settles back to idle once the last one clears. Processes that stay up for the whole session do not belong here: the dot would never stop.

## Registration

In your `package.json`:

```json
{
  "consumedServices": {
    "busy-signal": {
      "versions": { "^1.0.0": "consumeBusySignal" }
    }
  }
}
```

## Contract

```ts
type BusySignal = {
  create(): Provider;
};

type Provider = {
  add(title: string, options?: { onDidClick?: (event: MouseEvent) => void }): void;
  remove(title: string): void;
  changeTitle(title: string, oldTitle: string): void;
  clear(): void;
  dispose(): void;
};
```

| Member                         | Description                                                                 |
| ------------------------------ | --------------------------------------------------------------------------- |
| `create()`                     | A provider. See the cardinality rule below.                                 |
| `add(title, options)`          | Shows a message. Within one provider the title is the identity.             |
| `remove(title)`                | Removes it again. Must match the title exactly.                             |
| `changeTitle(title, oldTitle)` | Renames in place, keeping its position and start time. **New title first.** |
| `clear()`                      | Removes everything this provider added.                                     |
| `dispose()`                    | Clears and unregisters the provider.                                        |

## Minimal example

```js
const { Disposable } = require("atom");

module.exports = {
  consumeBusySignal(busySignal) {
    this.busySignal = busySignal;
    return new Disposable(() => {
      this.busySignal = null;
    });
  },

  async scan(projectRoot) {
    const provider = this.busySignal?.create();
    provider?.add(`Scanning ${projectRoot}`);
    try {
      return await doScan(projectRoot);
    } finally {
      provider?.dispose();
    }
  },
};
```

## Behavior

**Within one provider the title is the key.** Two `add` calls with the same title collapse into one entry, and `remove` needs the exact string back.

**Cardinality: one provider per independent unit of concurrency.** If only one message of yours is ever live, one provider for the whole package is right — `add` on start, `remove` on finish. If several can be live at once and they share a title — one "Loading" message per project root, say — give each unit its own provider and dispose it when that unit finishes. Otherwise the second `add` collapses onto the first and finishing either clears both.

A provider you dispose does not accumulate: `dispose()` unregisters it. The cost of a provider is one object and one entry in a `Set`.

Nothing clears a message for you, so a throw between `add` and `dispose` leaves it on screen. Use `try`/`finally`, as above.

Removed messages move to a short history the indicator shows as recent activity with their elapsed time; `clear()` and `dispose()` drop them silently.

`changeTitle` is not `remove` plus `add`: it keeps the entry's position and start time, which is what a multi-stage operation wants. Note the argument order — the **new** title comes first.

## Teardown

Dispose every provider you created, and drop your reference to the service in the disposable you return from `consumeBusySignal`. The service object itself has no `dispose()`: it is shared by every consumer, so disposing it would be either a lie or a footgun.

## Versioning

`1.0.0` provided, `^1.0.0` consumed. A change that breaks this shape gets a new service name rather than a new major version, and both sides move in the same release.

`createBackground()`, which listed processes that stay up for the session, was removed without a rename: every consumer of this service lives in the same workspace, exactly one called it, and it moved to a status item of its own in the same pass. A consumer that only calls `create()` — which is all of them — never saw the difference.
