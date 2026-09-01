---
title: "Own your notes in five minutes"
description: "A local notes app with no account, no cloud, and no strings: what setup looks like when the software plans to be owned by you, not the other way around."
published: false
pubDate: 2026-10-29
---

I have a stopwatch ritual for new software, born of scar tissue: I
time how long it takes before the app asks me for something that is
none of its business. An email address. A verification code. A cloud
region, a newsletter opt-out pre-opted-in, a permission to "improve my
experience" by watching me have it. The record holder demanded my
phone number to let me format text. Somewhere between all those
stopwatches I wrote down a sentence I have been building toward ever
since: _ownership should not have a signup flow._

Said and Done. is my answer to that sentence, and this article is the
whole setup story, stopwatch running.

## A local notes app, no account, no strings — the first five minutes

Minute one: download and run. The installer carries everything the
desk needs, including the small language model that powers meaning
search — there is no dependency hunt, no runtime to fetch, no
"finishing setup on our servers". One honest hardware check happens
here: the desk requires a real graphics card, because the meaning
search runs on it, and a machine without one is told so plainly at
the door rather than strung along. That is the only gate. It is about
your hardware, never your identity.

Minute two: the one question that matters. Where do your notes live?
You point the desk at your folder — the markdown you already own, or
an empty folder if you are starting fresh — and that is the entire
data conversation. Nothing imports, nothing converts, nothing
uploads, because there is nowhere to upload _to_. The app has no
servers. I want that sentence to land with its full weight: not "we
take security seriously", but there-is-no-server, structurally,
the way a bicycle has no gas tank.

Minutes three through five: your folders are already Notebooks, the
sample world is offered in case you want a furnished tour first, and
you are typing. No account was created in this story. No email
exists in this story. The stopwatch shows nothing, because nothing
none-of-its-business was ever asked.

![PLACEHOLDER — a setup screen containing a single folder-picker question, surrounded by generous empty space where forms would normally be](/said-and-done/blog/TODO-own-your-notes-in-five-minutes.png)

_The entire interrogation: one question, and it is about your folder, not about you._

## What ownership looks like on disk

Five-minute setup is a nice trick, but plenty of traps set up fast.
Ownership is proven later, in the unfashionable places — so here are
the deeds to the house, in plain sight.

Your data is two boring things in your home directory: one SQLite
database file and a folder of attachments, sitting under your own
user like any honest document. Not a proprietary vault, not a
scatter of hidden caches — a single database in the world's most
widely understood format, openable by a thousand free tools, next
to a folder of ordinary files. Your notes themselves are not even
in there; they never left the folder you pointed at in minute two.

The backups deserve their own sentence, because backup theater is
where fake ownership goes to hide. The desk backs up its own side
daily while it runs — a proper online snapshot of the database, not
a hopeful file copy, gzipped, the last fourteen days kept — and your
attachments land in a plain tar archive that any computer twenty
years from now will open without asking anyone's permission. Your
notes are deliberately _not_ in the app's backups: they are your
files, already living in whatever backup regime you trust — mine
sit in git — and the desk refuses to pretend it owns them. It also
takes one extra snapshot before updating itself, because software
that might stumble should buckle its own seatbelt first.

Even the paid unlock respects the deed. Buy the licence and what
you receive is a signed receipt the app verifies _offline_ — no
activation server, no phone-home, no distant computer with the
power to decide someday that your desk stops working. And should
you ever leave: uninstall removes the app and only the app. The
database, the attachments, your notes — every byte you made stays
on your disk, readable forever, as if the desk had been raised
polite. Which it was.

## Five minutes now, zero minutes forever

The part nobody advertises about accountless, cloudless software is
the _recurring_ absence. No password resets, ever. No "new login
from an unknown device". No sync conflicts to referee, no storage
quota creeping toward an upsell, no terms-of-service update asking
you to re-consent to something worse. The five minutes you spent at
setup is, rounded fairly, the total administrative cost of the desk
for as long as you run it. My notes have needed less upkeep than my
houseplants, and I own a cactus.

There is a deeper comfort underneath, and it is the actual point.
Every promise in this article is _structural_, not contractual. I
am not pledging to keep your notes private — the app cannot see
them leave your machine because no road exists. I am not vowing to
never lock you out — there is no lock, no account to suspend, no
server to sunset. You are not trusting my character; you are
trusting the shape of the thing, and the shape is checkable: one
program, one database, your folder, your disk.

Five minutes, then, for something most software never sells at any
price: a thinking tool that is simply _yours_ — the way a notepad
from the stationery shop is yours, no counterparty attached. The
desk starts working for you at minute five and never starts working
for anyone else. Run the stopwatch on that.
