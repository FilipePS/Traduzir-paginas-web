# Content-script regression tests

## General Google HTML recovery

Run the self-contained checks with `npm --prefix tests run test:google` (Node
only). They execute the production Google adapter and exact extracted page
routines, the production X helper, and the real XMLHttpRequestShim with
controlled transport/cache/timer/node contracts. They cover ordinary page
recovery on GitHub/Reddit/other hostnames, malformed/partial/empty/unchanged
results, old cache entries, exhausted budgets, shared X recovery slots, stale
responses, custom dictionary markers, service changes, restoration and deadlines
including response bodies stalled after headers. These are not browser, layout,
MutationObserver or live-provider tests and contain no performance measurements.

The ordinary Google HTML path now validates usable indexed results before
accepting or caching them. An unchanged foreign paragraph is still considered
suspect only for known source/target languages that differ, at least 80
characters and eight letter-words. Failed page pieces have at most three total
attempts per source revision, delayed by at least 1.5 then 4 seconds. Recovery
shares two in-flight slots per document with X, respects visibility/viewport,
uses the existing 300 ms routine, and does not reset its budget on tab return.
The two-second ordinary dynamic-content collection interval is unchanged.

Google HTTP requests and authentication discovery have 30-second deadlines;
request abort precedes a later recovery. The shim dispatches error when body
parsing fails instead of leaving its promise rejection unhandled. HTTP failure
handling is otherwise shared by its existing consumers. Dictionary placeholders
remain stable across retries of one ordinary piece. Protection rules and the
reverted Reddit title-specific helper are unchanged.

`npm --prefix tests run test:browser` runs the existing Chromium DOM suite and
requires Playwright/Chromium. Some expectations were updated for the newly
general cache validation; this suite has not been rerun for this revision in the
current restricted execution environment. Earlier browser test counts must not
be represented as checks of the new revision. `npm test` runs both suites.

The tests execute the production content scripts in Chromium, with deterministic extension APIs and translation responses. They cover tab-return recovery, bounded language detection, manual-restore preferences, X post expansion, text-node identity, original-text restoration, protected link labels, stale responses, dynamic-content preferences and viewport changes.

From the repository root:

```sh
npm --prefix tests install
npx --prefix tests playwright install chromium
npm --prefix tests test
```

Use `CHROMIUM_PATH` for an existing Chromium executable, or `PLAYWRIGHT_MODULE` when Playwright is installed outside `tests/node_modules`. `TEST_FILTER` selects a test group by part of its name.

This is not an end-to-end test of an installed extension or a live translation provider. Live X/Reddit behavior and Firefox remain manual validation items.

Visibility transitions are dispatched explicitly so lifecycle races are reproducible; they do not simulate native background-tab timer throttling. The normal dynamic-content collection interval remains 2 seconds.


## Bounded Google recovery on X

`retry-regression.cjs` also executes the production background Google adapter,
response parser and cache. Only the remote XHR responses are controlled. It
covers transient transport errors, empty/whitespace/partial/malformed responses,
a cached partial result, the three-attempt limit, two-post recovery concurrency,
success/unchanged responses, hidden/offscreen posts, stale revisions, removal,
manual restoration and sharing pending requests.

`fixtures/twitterTranslator-v1.1.js` is an unmodified historical snapshot of
the X helper from the preceding PR revision (head
`054f524288e5b929ee8ca8d3a94c293bbb5c6d4e`). One comparison test loads that helper
with the current adapter's normal, non-refresh path to reproduce the missing
recovery and cached-error replay. All remaining recovery tests use the current
production helper. No adjacent checkout or network access is needed.

The recovery tests use a controlled Chromium clock, not native timer throttling.
They do not establish the cause of a previously observed intermittent live-X
translation failure. Valid responses that retain the original text and requests
that never settle are outside this recovery mechanism.


## Cached original-text validation on X

`cache-regression.cjs` covers Google cache entries that contain the original
paragraph while reporting a detected language different from the target. The
check now applies to the common Google HTML path, including ordinary pages. It requires at least 80
characters and eight letter-words of unchanged text. Both completed in-memory
entries and persistent entries are checked; newly returned suspect originals
are treated as failures before they can become cached successes.

Unknown/target languages, short names and valid translations retain existing behavior; ordinary pages
now receive bounded recovery as well. The current two-retry budget and concurrency cap
remain in effect. Tests include text split around a protected mention.

The check is conservative, not proof that every unchanged result is invalid.
It does not detect English paraphrases or entries with unknown source language.
Clearing a live cache removed the evidence needed to establish the exact cause
of that incident; controlled regressions cover the specific class above.


## Visible identities and translatable publication times

`identity-regression.cjs` exercises the production scripts in Chromium with
controlled translation responses. It covers Reddit community/user root links,
X User-Name/UserName/UserCell fields and post links, explicit rel=author and
schema.org author/creator name fields, standalone handles and visible addresses.
The selector checks follow open shadow-root hosts and also run when collecting
inserted text or applying a pending translation.

Written-out publication times remain translatable, including time/faceplate-timeago
contents, X status links and ordinary "2 hours ago" labels. Whole compact labels
such as "1h" and "1 min" are kept verbatim, including dynamically inserted labels
and open shadow roots. A compact unit inside ordinary prose does not exclude the
whole sentence. Article titles,
bios, buttons, ordinary link labels and unmarked prose remain translatable.
The pre-existing workaround for links inside X tweetText is preserved.

On Reddit, standalone numeric labels (including vote/comment counts such as
"23K", "1,8K", "1.8K" and "0") retain their original formatting. Split digits
and suffixes in faceplate-number are also protected, through open shadow roots.
Adjacent action labels still translate, and live counter changes are left to
the site. Numbers embedded in prose and standalone counts on other sites keep
their existing translation behavior. Tests use a controlled provider that
expands "23K" and "1,8K" to reproduce the reported unwanted reformatting.

These are conservative DOM rules, not general person-name recognition.
Unmarked names, novel site layouts, arbitrary bare domains without a link or
scheme, private shadow roots, and identifiers embedded in a mixed prose Text
node are not guaranteed to be protected. Tooltips/other attribute text are not
covered by the new visible-text rules. No timers, observers, network API calls,
permissions or provider changes are added.

Set TWP_SOURCE_ROOT to choose another source tree when reproducing an older
version's behavior with this fixture. This is functional validation, not a
benchmark or an installed-extension/live-provider test.
