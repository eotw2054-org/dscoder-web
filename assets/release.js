/* ===================================================================== *
 *  THE RELEASE VALUES. WINDOWS IS FILLED; macOS AND LINUX ARE NOT.      *
 * ===================================================================== *
 *
 *  A version number, a file name, a file size and a minimum macOS version
 *  are things only a real build knows. Windows has been built, so its three
 *  are here. macOS and Linux have not -- a .dmg cannot be produced on
 *  Windows at all -- so theirs stay null and the pages go on saying "Not
 *  published yet" rather than linking a file that does not exist.
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
  version:      '0.1.0',
  macosMinimum: null,   // read off a built Info.plist; there is no mac build yet

  // Built on Windows from desktop/ at 0.1.0 and published as a Release asset
  // on this repository. The size is the installer rounded to the nearest
  // megabyte -- the same figure Windows itself shows for the file.
  windows: {
    file: 'dscoder-0.1.0-win-x64.exe',
    size: '107 MB',
    url:  'https://github.com/eotw2054/dscoder-web/releases/download/v0.1.0/dscoder-0.1.0-win-x64.exe',
  },

  // Still null on purpose, not forgotten. A .dmg can only be built on macOS
  // and nothing has built one, so the pages go on saying so rather than
  // linking a file that does not exist.
  macos:   { file: null, size: null, url: null },
  // Nor has anything built the AppImage yet.
  linux:   { file: null, size: null, url: null },
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
