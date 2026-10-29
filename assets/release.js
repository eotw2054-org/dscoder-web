/* ===================================================================== *
 *  THE RELEASE VALUES. ALL OF THEM ARE FILLED, FROM A REAL BUILD.      *
 * ===================================================================== *
 *
 *  A version number, a file name, a file size and a minimum macOS version
 *  are things only a real build knows. Windows has been built, so its three
 *  are here, read off the Release that CI published, and so are both
 *  macOS builds -- one per architecture, because picking the wrong one
 *  gets you an app that will not open.
 *
 *  This is the point of the file: nothing is written down anywhere else.
 *  There is no "0.9.4" and no "94 MB" hiding in the markup to be forgotten
 *  and shipped.
 *
 *  THE STEP THAT BUILDS THE ARTEFACTS EDITS THIS BLOCK AND NOTHING ELSE.
 *  Fill in the values, commit, done. Until then the pages show a dotted
 *  blank where each number goes and the download buttons say so.
 *
 *  macosMinimum: read it off the build, do not guess. Electron sets the
 *  floor (LSMinimumSystemVersion in the built Info.plist), and it moves
 *  when Electron is upgraded.
 *
 *  url: the browser download link. These will be GitHub Release assets on
 *  this repository once a release exists.
 */

const RELEASE = {
  version:      '0.5.32',
  macosMinimum: null,   // read off a built Info.plist; nobody has opened one

  // Every figure below is read off the published Release, not guessed. The
  // sizes are binary megabytes -- the number the operating system itself
  // shows beside the file.
  windows: {
    file: 'dscoder-0.5.32-win-x64.exe',
    size: '106 MB',
    url:  'https://github.com/eotw2054-org/dscoder-web/releases/download/v0.5.32/dscoder-0.5.32-win-x64.exe',
  },

  // Linux is not offered. It still builds in CI, first and alone, because
  // it is the cheapest runner and almost everything that breaks a release
  // breaks on all three -- but nothing is published from it.

  // Two machines, two files, and picking the wrong one gets you an app that
  // will not open. Apple silicon is every Mac since 2020; Intel is before
  // that. One button each, named after the machine rather than the chip
  // architecture, because that is what somebody knows about their own Mac.
  macosArm: {
    file: 'dscoder-0.5.32-mac-arm64.dmg',
    size: '122 MB',
    url:  'https://github.com/eotw2054-org/dscoder-web/releases/download/v0.5.32/dscoder-0.5.32-mac-arm64.dmg',
  },
  macosIntel: {
    file: 'dscoder-0.5.32-mac-x64.dmg',
    size: '128 MB',
    url:  'https://github.com/eotw2054-org/dscoder-web/releases/download/v0.5.32/dscoder-0.5.32-mac-x64.dmg',
  },

};

/* ===================================================================== *
 *  Below here is only plumbing: it copies the values above into the page
 *  and needs no attention when the numbers change.
 * ===================================================================== */

(function fill() {
  const get = (path) => path.split('.').reduce((o, k) => (o == null ? o : o[k]), RELEASE);

  // Text slots: <span data-rel="windows.size">
  for (const el of document.querySelectorAll('[data-rel]')) {
    const value = get(el.dataset.rel);
    if (value) {
      el.textContent = value;
      el.classList.remove('unfilled');
    } else {
      el.textContent = el.dataset.relBlank || 'not published yet';
      el.classList.add('unfilled');
    }
  }

  // Whole phrases that only make sense once there is a value at all:
  // <span data-rel-if="macosMinimum">macOS <span data-rel="macosMinimum"></span> and later</span>
  for (const el of document.querySelectorAll('[data-rel-if]')) {
    if (!get(el.dataset.relIf)) el.hidden = true;
  }

  // Download buttons. The markup ships in the unpublished state -- no href,
  // and "Not published yet" on the face of it -- so that a reader with no
  // JavaScript is told the truth rather than handed a dead dark button. The
  // real label waits in data-rel-label until there is somewhere to send them.
  for (const el of document.querySelectorAll('[data-rel-download]')) {
    const url = get(el.dataset.relDownload + '.url');
    if (!url) continue;
    el.href = url;
    el.textContent = el.dataset.relLabel || el.textContent;
    el.removeAttribute('aria-disabled');
    el.removeAttribute('role');
  }

  // The version beside the wordmark is an ornament, not information. With
  // no version it is simply not there, rather than a dotted blank in the
  // corner of every page.
  for (const el of document.querySelectorAll('[data-rel-version-mark]')) {
    el.textContent = RELEASE.version || '';
  }
})();
