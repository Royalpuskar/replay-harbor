# Replay Harbor

Replay inventory events and expose the exact event that violates stock invariants.

**Status:** implemented browser-local research prototype. Automated tests can be reproduced with the command below. The existing Pages site previously passed smoke checks. The idempotency update is locally tested; its latest deployment and browser behavior have not been verified.

## Website

Live website: https://royalpuskar.github.io/replay-harbor/

## Problem and approach

Event consumers need to distinguish exact retries from conflicting reuse of an event ID. This tool records the first decision for each inventory event and exposes subsequent retries and payload conflicts without applying them again. It runs the same pure JavaScript engine in the browser and Node tests. All input is provided by the user or the included synthetic fixture; no external facts are inferred.

## Implemented features

- Editable scenario with a synthetic example and reset control.
- Deterministic analysis, summary metrics, filterable result table, and JSON report export.
- Input validation, explicit errors, and invalidation of outdated reports after edits.
- Keyboard-accessible controls, responsive layout, and large-screen CSS.
- Zero runtime dependencies and no external API calls.

## Install and run

Requirements: Python 3 for a static local server, Node.js 22 or later for tests.

```sh
git clone https://github.com/Royalpuskar/replay-harbor.git
cd replay-harbor
python3 -m http.server 8000
```

Open http://localhost:8000. Do not open index.html through a file URL; ES modules require a server.

```sh
node --test test.mjs
```

## Example and schema

The complete example in `sample.mjs` defines the supported input shape:

```json
{
  "initial": 3,
  "events": [
    {
      "id": "e1",
      "delta": -2
    },
    {
      "id": "e2",
      "delta": 4
    },
    {
      "id": "e3",
      "delta": -8
    }
  ]
}
```

Edit one value and select **Run analysis**. **Reset example** restores the fixture. **Export report** downloads the current result; it never publishes it.

Input is capped at 200,000 serialized characters, arrays processed by the engine at 500 elements, and numeric magnitudes at 1e12. Domain constraints are checked inside `engine.mjs`; unsupported structures return an error.

## Retry and conflict semantics

The first occurrence of an ID owns its decision, whether applied or rejected for negative inventory. A later event with the same ID and delta is an exact retry: it is ignored and links to the original outcome. Reusing the ID with a different delta is a conflict, not a harmless duplicate. It does not change inventory or replace the original decision.

```json
{"initial":0,"events":[
  {"id":"order","delta":-2},
  {"id":"restock","delta":5},
  {"id":"order","delta":-2},
  {"id":"order","delta":-1}
]}
```

Expected result: stock 5, one rejection, one applied event, one duplicate, and one conflict. Replenishment does not retroactively authorize the rejected order; retrying that operation as a new decision requires a new ID.

Each row includes its zero-based event index, before/after stock, applied delta, and the original index, delta, status, and stock. A retry's current stock can differ from its original stock. The invariant is `final stock = initial stock + sum(appliedDelta)`; ignored retries, conflicts, and rejected events contribute zero.

IDs are exact case-sensitive strings. Payload equality concerns the modeled delta only; extra fields are not interpreted. Quantities must be integers (initial stock from 0 to 1e12; deltas from −1e12 to 1e12). Zero delta is a valid event. Input order is authoritative. The 500-event bound keeps accumulated integer totals within JavaScript's exact integer range.

## Architecture and request flow

`index.html` loads `app.mjs`, which parses scenario JSON and calls `run` from `engine.mjs`. The engine returns `metrics` and `rows`; the UI renders values with `textContent`, never user-supplied HTML. Editing invalidates the prior report. Export creates a local Blob download.

There is no application authentication, credential store, session cookie, or token lifecycle. GitHub Pages serves public static files. The app does not collect passwords or API keys, contact third-party APIs, persist inputs, or send scenario data over the network. GitHub hosting can still receive ordinary page request metadata. Reloading discards edits.

## Limitations

In-memory, single-inventory event replay. Does not authenticate event sources, persist an event store, expire idempotency keys, or model concurrent writes and transactions. This demonstrates decision semantics, not a production exactly-once guarantee.

The interface shares a portfolio design system, while this repository has its own domain engine, fixture, and tests. No accuracy, novelty, production-readiness, or 4K visual-test claim is made. Large-screen CSS is not a substitute for device testing.

## Validation

Nine local Node tests pass for this update. They cover conflicting IDs, exact retries after rejection and replenishment, immutable first decisions, zero deltas, unusual IDs, input validation, and deterministic behavior. A bounded exhaustive test checks 125 three-event traces for nonnegative stock, conservation of applied deltas, and links to first decisions. These are synthetic fixture results, not production guarantees. Mobile, laptop, and 3840×2160 browser checks have not been performed for this update.

`test.mjs` checks domain outcomes and edge cases, deterministic behavior, input preservation, malformed roots, and size limits. GitHub Actions runs the same suite. Review the tests themselves to see exactly what is covered; passing these checks does not establish security or exhaustive correctness.

## Roadmap

- Add more independently reviewed domain fixtures and explicit schema documentation.
- Add domain-specific form controls alongside the JSON editor.
- Expand accessibility and mobile browser testing.
- Revisit the documented domain limitations before production use.

## Contribution and license

See [CONTRIBUTING.md](CONTRIBUTING.md), [SECURITY.md](SECURITY.md), and [LICENSE](LICENSE).

© 2026 Puskar (Royalpuskar). All rights reserved except permissions granted by the MIT license. Preserve applicable third-party notices.

