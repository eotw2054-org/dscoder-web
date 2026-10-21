# dscoder-web

The public website for **dscoder**, and the place its downloads are published.

dscoder is a coding agent that runs on your own computer, in your own
repository. You drive it from a browser, and the browser does not have to be
on that computer. The site says the rest.

## What is in here

Two static pages and the files they need. There is no build step, no
framework, no dependency and nothing to install — what is in the repository
is exactly what gets served.

```
index.html         the home page
download.html      installing it, and what each operating system will say
assets/
  site.css         colours, header, footer, the one button
  home.css         the home page
  download.css     the download page
  fonts.css        @font-face for the two faces below
  fonts/           IBM Plex Sans and IBM Plex Mono, self-hosted
  release.js       the version, file names and sizes — see below
check.mjs          screenshots every page at 1360 and 390 and fails on overflow
```

The fonts are IBM Plex Sans and IBM Plex Mono, the two faces the app itself
uses, served from this repository rather than from Google Fonts or a CDN:
opening the site fetches nothing from anybody else. They are under the SIL
Open Font Licence 1.1 (`assets/fonts/LICENSE.txt`). Only the Latin-1 and
punctuation subsets are shipped, at the four sans and three mono weights the
pages use.

## The release values are not filled in

`assets/release.js` holds the version number, the installer file names, their
sizes, the download URLs and the minimum macOS version. **All of them are
empty.** They are things only a real build knows, and no build has been made
yet.

Until they are filled in, the pages show a dotted blank where each value goes
and the download buttons say "Not published yet" and cannot be clicked.

They appear in that one file and nowhere else — there is no version number or
file size hiding in the markup. The step that produces the installers edits
that block, and nothing else.

## Downloads

The installers are published as **Releases on this repository**. There is
nowhere else to get them.

dscoder is **not code-signed and will not be**. Windows SmartScreen warns the
first time you run the installer, macOS refuses to open the app until you
clear the quarantine attribute by hand, and an unsigned app cannot update
itself on macOS — every macOS update is a manual download. The download page
says all of this in full, with the steps.

## The source

This repository is the website. **The source of dscoder itself is private**
and is not published here.

## Checking a change

```
node check.mjs
```

Serves the directory, opens it in headless Chrome at 1360 and 390, writes a
full-page and a first-screen PNG for each into `_shots/`, and exits non-zero
if any page scrolls sideways (`scrollWidth !== clientWidth`). It needs node
and a Chrome install and nothing else.

The pictures are the point: the assertion catches overflow and nothing else,
so look at them.
