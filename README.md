# busy-signal

Show a busy signal in the status bar.

A base package that provides an easy-to-use API for other packages to signal they are performing a task.

## Features

- **Animated dot indicator**: a colored dot in the status bar pulses orange while busy and turns green when idle.
- **Minimum display duration**: the busy state is shown for at least 1 second to avoid flickering on fast operations.
- **Hover tooltip**: shows the currently running tasks and a history of recently completed ones with their durations.
- **Background zone**: a separate, animation-free zone counts long-running processes such as language servers, marks the failed ones, and stays hidden while there are none.
- **Background list**: clicking the background zone opens a filterable list of the live processes with their details and statuses.
- **One service, two zones**: other packages report transient work and long-running background processes through a single `busy-signal` service.

## Installation

To install `busy-signal` search for _busy-signal_ in the Install pane of the Lumine settings or run `lumine --install lumine-code/busy-signal`.

## Usage

Other packages report their work through the `busy-signal` service. It hands out two kinds of
provider: `create()` for work that starts and finishes, which spins the busy dot while anything is
live, and `createBackground()` for processes that stay up for the session, which are listed in their
own zone and never spin the dot.

```js
consumeBusySignal(busySignal) {
  this.busySignal = busySignal;
  return new Disposable(() => (this.busySignal = null));
},

async scan(root) {
  const provider = this.busySignal?.create();
  provider?.add(`Scanning ${root}`);
  try {
    return await doScan(root);
  } finally {
    provider?.dispose();
  }
}
```

The full contract — the cardinality rule, `changeTitle` argument order, and the background entry
shape — is in [docs/busy-signal.md](docs/busy-signal.md).

## Customization

The style can be adjusted according to user preferences in the `styles.less` file, e.g. change the dot color while busy and the background zone color:

```less
.busy-signal.busy::before {
  background-color: var(--text-color-error);
}

.busy-signal-background {
  color: var(--text-color-info);
}
```

## Services

- **[busy-signal](docs/busy-signal.md)** (`1.0.0`): provided to let other packages report transient work on the busy indicator and long-running processes in the background zone.
- **[status-bar](https://lumine-code.github.io/docs.html#services/status-bar)** (`^1.0.0`): consumed to place the busy indicator tile in the status bar.

## Contributing

Got ideas to make this package better, found a bug, or want to help add new features? Just drop your thoughts on GitHub. Any feedback is welcome!
