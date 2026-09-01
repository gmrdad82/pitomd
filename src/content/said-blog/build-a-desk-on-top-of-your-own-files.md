---
title: "Build a desk on top of the files you already own"
description: "Why I built a markdown task manager that sits on top of your own folder of notes instead of asking you to move into someone else's app."
published: false
pubDate: 2026-09-03
---

My head does not stop. A house project, a dog that needs walking at the
worst possible moment, a game I keep meaning to finish, three ideas that
arrived in the shower and one that arrived during a meeting I was supposed
to be listening to. For years I poured all of it into a folder of markdown
files, because plain text is the one format that has never once betrayed
me. The trouble was never the notes: the folder just sat there, holding
everything and doing nothing.

Every task app I tried had the same opening demand: move in with us.
Import your notes into our format. Make an account. Trust our cloud with
the contents of your head. I would last two weeks, then find my thoughts
split across two homes: the real ones in my folder, a stale copy rotting
in someone's database. I was paying rent on both. I did not want a new
home for my notes. I wanted a desk bolted on top of the home they already
had.

So I built one. It is called Said and Done., and this is what it is.

## A markdown task manager that starts from your folder

Setup is one question: where do your notes live? You point Said and Done.
at that folder and you are done. Every top-level folder inside it becomes
a Notebook on its own — your `garden/` folder shows up as a Garden
Notebook, `work/` becomes Work, the folder you embarrassingly named
`stuff/` becomes Stuff, and each one wears its own color, derived from its
name, the same forever. Nothing is imported. Nothing is converted. Nothing
moves. Drop a new folder in next month and it becomes a Notebook too.

Inside a Notebook you get Chapters, and inside Chapters you get Pages. A
Page is one thing you intend to do, and it walks four steps from "someday"
to "done". You can even rename the four steps in your own words, because
your life is not a software project unless it is. Every Page is born with
a permanent name, Notebook plus number, like GARDEN-12. It keeps that name
through every move and every mood, so "the shed thing" has an address you
can say out loud.

The part I care about most: a Page does not contain your note, it
_points_ at it. A Page about the leaking shed roof pins the exact lines
of `house/repairs.md` where you wrote about the shed — those lines, not
the whole file. Press one key and the app shows you the pinned
paragraph right there. Your note never gets copied, edited, or moved. Ten
Pages can pin the same file from ten angles. The notes stay the archive;
the desk stays the desk.

![PLACEHOLDER — a plain folder of markdown files on the left, the same folder standing as a colorful Notebook desk on the right, an arrow between them labeled "nothing moved"](/said-and-done/blog/TODO-build-a-desk-on-top-of-your-own-files.png)

_Your folder, before and after: the files never move — the desk assembles itself on top._

## What the desk makes possible

Once the desk exists on top of your folder, things a bare folder never
could do become possible.

Search finds Pages by their exact words, your notes by theirs, and —
the part that still makes me grin — either one by meaning, using a
small model that ships inside the installer and works entirely on your
machine. No API key, no subscription, nothing of yours travels anywhere.
A new Page can find its own note: type a task with nothing attached and
the app pins the right file, and the right section of it, at the moment
you create it. A connected AI assistant can read those pinned
paragraphs, work the desk, and sign everything it does. A phone client,
served by your own computer over a connection you control, puts the
whole desk in your pocket. And you never start from empty: the app
arrives with a complete sample world already living in it, so every one
of these things can be tried before a single file of yours moves in.
Each of those gets its own article soon, because each deserves more than a
bullet.

One honest requirement before you get excited: Said and Done. needs a
real graphics card. The meaning search runs a local model on your GPU, and
rather than ship a degraded experience I made it a hard requirement. A
machine without one will tell you so plainly instead of limping.

## Yours on the way in, yours on the way out

I built the exit before I built the entrance. Your notes are never touched
by the app's backups, because they are your files. Mine live in a git
repository, and yours might live on a backup drive, and either way that
job was already done right before my app showed up. What the app does back
up is its own side of the desk: the Pages, Thoughts, Updates, and attachments, in a
boring standard database file plus a plain tar of your images, the kind of
backup you can open in twenty years with free tools and no permission from
me. Uninstall the app and your data folder stays exactly where it was.

There is no account, because there is nothing to sign into, and no
tracking, because your thoughts are none of my business. The whole thing
is free, and if it earns a place in your day there is a one-time
four-euros-and-change way to say thanks — a story for another article.

Keep the folder, gain the desk.
If your notes already live in plain files you love and a system you
trust, you should not have to abandon them to get search that understands
you, tasks that point at the exact paragraph they came from, and an AI
that can pull up a chair. That is the desk I wanted, so that is the desk
I built — and your folder is already the only requirement it has, give or
take a graphics card.
