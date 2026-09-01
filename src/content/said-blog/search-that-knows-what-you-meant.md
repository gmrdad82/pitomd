---
title: "Search that knows what you meant"
description: "Semantic search for notes, running entirely on your own machine: find the thought you half-remember, not just the words you happened to type."
published: false
pubDate: 2026-10-17
---

The cruelest thing about most search is that it works. It does exactly
what it promises: finds the words you typed, wherever those words
occur. The problem is that I am not looking for words. I am looking
for a _thought_, and the words I used to write a thought in February
have usually left the building by November. February-me wrote
"insulation quote". November-me searches "how much for the warm
walls". Word-search shrugs at both of us, technically innocent, and
the note — the note I need, the note I wrote, the note that exists —
stays lost in plain sight.

For years I treated this as my failure. Tag better, name files
better, be a more consistent person. Then I built search that meets
me halfway, and I found out the failure was never mine. I was asking
a librarian for a book about warm walls, and the librarian only knew
the alphabet.

## Semantic search for notes, with no cloud attached

Said and Done. searches by meaning. Type what you remember — the
gist, the paraphrase, the wrong-but-related words — and the desk
finds the notes and Pages that _meant_ that, whether or not they
share a syllable with your query. "How much for the warm walls"
finds February's insulation quote, exactly as promised. My personal
record is finding a two-year-old note about a phone plan by
searching for "the rip-off math" — no overlap, full hit.

The part I refuse to compromise on: all of it happens on your own
machine. The language model that reads your query and your notes
ships inside the installer — no API key, no account, no subscription
to a search service, and not one word of yours leaving the computer
to be understood. This is done honestly rather than magically, so
here is the honest part said plainly: meaning search runs on your
graphics card, and the desk requires a real one. A machine without a
GPU is told so at the door. I would rather ask you for hardware than
quietly ask you for your notes.

The pipeline is unglamorous and effective. As you write, the desk
reads your files in sensible, heading-aware chunks — about a
paragraph's worth at a time, so a hit lands on the _section_ you
meant, not just somewhere in a long file. A watcher follows your
folder; edit a note in any editor you like and the index catches up
on its own, within the second. You never rebuild anything, never
reindex, never file a ticket with yourself. The librarian just
quietly keeps reading.

![PLACEHOLDER — the finder open over the desk: a plain-words query on top, and beneath it two ranks of results, exact word-hits above, meaning-hits below with no shared words highlighted](/said-and-done/blog/TODO-search-that-knows-what-you-meant.png)

_One query, two kinds of hits: the words you typed, and the things you meant._

## Three legs, one answer

Meaning is the headline, but the desk actually searches three ways at
once, because a good answer often hides in a different layer than
you expect.

The first leg is exact search over your Pages — titles, bodies, and,
crucially, the conversation on them: every Thought and Update is
searchable, so a Page can be found by something someone said on it.
"The one where the agent flagged the voltage" is a findable object
in my desk, and I find it about weekly.

The second leg is exact search over the notes themselves — every
markdown file in the folder, tracked so efficiently that unchanged
files are never re-read. When you _do_ remember the exact phrase,
nothing beats the exact phrase, and this leg answers before your
finger leaves the key.

The third leg is the meaning search, sweeping both layers for what
you were getting at. The desk blends the legs into one ranked
answer: exact hits where they exist, meaning hits where the words
failed you, and — my favorite behavior in the whole app — the
cross-hit: when the meaning search lands on a note, the desk also
surfaces every Page pinned to that note. Search for the thought, and
the _tasks that depend on the thought_ walk into the room behind it,
even when their own titles matched nothing. Scope it as you like:
plain search stays in the Chapter, one operator widens it to a
Notebook or to everything you own.

## What changes when finding is free

The day search stopped failing, my writing changed — upstream, where
I did not expect it.

I stopped writing for the filing system. All those defensive habits
— repeating keywords so future-me could grep them, giving files
long bureaucratic names, keeping a tags taxonomy like some unpaid
municipal clerk — quietly died. I write a thought in whatever words
the thought arrives wearing, because retrieval no longer depends on
my phrasing discipline. The notes got looser, faster, more honest.
More _mine_. It turns out word-search was not just failing to find
my thoughts; it was standing over my shoulder while I wrote them,
demanding I write for the index instead of for myself.

And I started trusting the archive with real questions. Not "where
is the file" questions — "what did I think" questions. What did I
believe about that job before it went sideways? What was my original
reasoning on the fence, three repairs ago? The desk answers those
now, from my own words, in under a second, without a single byte of
my life leaving the house to be understood. A folder that answers
questions like that stops being storage.

It starts being a memory — the kind you were promised computers
would be, back when you were small enough to believe it. Mine
arrived twenty-something years late, speaks my half-remembered
nonsense fluently, and lives entirely on my desk. Yours is welcome
to the same arrangement: bring the notes you already have, and ask
them what you actually meant.
