/**
 * SPORTHUB - Static HTML Prerender
 *
 * Generate static HTML snapshots for GitHub Pages.
 *
 * Public URLs:
 * - Clean directory URLs
 * - No /index.html suffix
 *
 * Only the homepage embeds CSS and existing SVG previews
 * for standalone HTML viewing.
 *
 * Product WebP names are preserved exactly as provided.
 *
 * Runtime app.js replaces the static snapshot
 * when JavaScript is available.
 */

import {
  readFileSync,
  writeFileSync,
  readdirSync,
  existsSync
} from 'node:fs';

import {
  resolve,
  dirname,
  join,
  relative,
  sep
} from 'node:path';

import { fileURLToPath } from 'node:url';
import vm from 'node:vm';


const ROOT = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '..'
);

const appCode = readFileSync(
  join(ROOT, 'js/app.js'),
  'utf8'
);

const productsCode = readFileSync(
  join(ROOT, 'js/products.js'),
  'utf8'
);

const stylesheet = readFileSync(
  join(ROOT, 'css/style.css'),
  'utf8'
);

const FAKE_ROOT = 'https://sporthub-static.invalid/';

const allHTML = [];


// ============================================================
// COLLECT HTML ROUTES
// ============================================================

function collect(dir) {

  for (const ent of readdirSync(dir, {
    withFileTypes: true
  })) {

    if (ent.isDirectory()) {

      if ([
        'node_modules',
        '.git',
        '.github',
        'functions',
        'assets',
        'scripts',
        'js',
        'css',
        'img',
        '.venv'
      ].includes(ent.name)) {
        continue;
      }

      collect(join(dir, ent.name));

    } else if (
      ent.isFile() &&
      ent.name === 'index.html'
    ) {

      allHTML.push(join(dir, ent.name));

    }

  }

}


// ============================================================
// MOCK DOM ELEMENTS
// ============================================================

function makeElement() {

  const attributes = new Map();

  return {

    href: '',
    textContent: '',
    innerHTML: '',

    classList: {
      toggle() {},
      add() {},
      remove() {},
      contains() {
        return false;
      }
    },

    setAttribute(name, value) {
      attributes.set(name, String(value));
    },

    getAttribute(name) {
      return attributes.get(name) ?? null;
    },

    remove() {},

    append() {}

  };

}


// ============================================================
// RENDER STATIC PAGE
// ============================================================

function render(page, slug, path) {

  let markup = '';

  const app = {

    set innerHTML(value) {
      markup = value;
    },

    get innerHTML() {
      return markup;
    }

  };

  const currentPath = '/' + (
    path ? path + '/' : ''
  );

  const context = {

    window: {
      SPORT_CONFIG: {},
      addEventListener() {}
    },

    document: {

      body: {
        dataset: { page, slug },
        append() {}
      },

      head: {
        append() {}
      },

      currentScript: {
        src: FAKE_ROOT + 'js/app.js'
      },

      getElementById(id) {
        return id === 'app' ? app : null;
      },

      querySelector() {
        return null;
      },

      querySelectorAll() {
        return [];
      },

      addEventListener() {},

      createElement: makeElement

    },

    location: {

      protocol: 'https:',

      href: FAKE_ROOT + (
        path ? path + '/' : ''
      ),

      origin: 'https://sporthub-static.invalid',

      pathname: currentPath,

      search: '',

      hash: ''

    },

    localStorage: {

      getItem() {
        return null;
      },

      setItem() {}

    },

    URL,
    URLSearchParams,
    Intl,
    Date,
    Math,
    console,

    navigator: {},

    setTimeout() {
      return 1;
    },

    clearTimeout() {},

    fetch() {
      throw Error(
        'Static pre-render cannot access network'
      );
    }

  };

  context.window.window = context.window;

  vm.createContext(context);

  // Load the existing product data.
  vm.runInContext(
    productsCode,
    context,
    {
      filename: 'products.js',
      timeout: 5000
    }
  );

  // Render the corresponding page.
  vm.runInContext(
    appCode,
    context,
    {
      filename: 'app.js',
      timeout: 5000
    }
  );

  if (
    typeof markup !== 'string' ||
    !/<main(?:\s|>)/i.test(markup)
  ) {

    throw new Error(
      `Missing main content while prerendering ${path || '/'}`
    );

  }

  return markup;

}


// ============================================================
// INLINE EXISTING SVG FOR HOMEPAGE PREVIEW
// ============================================================

function inlineRootSvg(pathAndQuery) {

  const path = pathAndQuery.split(/[?#]/, 1)[0];

  if (!path.startsWith('img/')) {
    return null;
  }

  // Only inline an image that is already an SVG.
  // Never rename a product .webp image to .svg.
  if (!/\.svg$/i.test(path)) {
    return null;
  }

  const fullPath = resolve(ROOT, path);

  // Prevent reading outside the repository.
  if (
    !fullPath.startsWith(ROOT + sep) ||
    !existsSync(fullPath)
  ) {
    return null;
  }

  return 'data:image/svg+xml;charset=utf-8,' +
    encodeURIComponent(
      readFileSync(fullPath, 'utf8')
    );

}


// ============================================================
// REWRITE INTERNAL LINKS
// ============================================================

function rewrite(markup, prefix, isRoot) {

  return markup.replace(

    /https:\/\/sporthub-static\.invalid\/([^"'\s<>]*)/g,

    (_match, rawPath) => {

      const path = rawPath

        // Remove index.html from public URLs.
        .replace(
          /(^|\/)index\.html(?=([?#]|$))/gi,
          '$1'
        )

        // Normalize legacy asset paths.
        // This does not change product filenames.
        .replace(/^assets\//i, '');

      // Preserve existing SVG previews on homepage.
      if (isRoot) {

        const inline = inlineRootSvg(path);

        if (inline) {
          return inline;
        }

      }

      // A bare homepage link must not become href="".
      if (!path) {
        return prefix || './';
      }

      // Preserve clean directory URLs and WebP filenames.
      return prefix + path;

    }

  );

}
// ============================================================
// FIND GENERATED ROUTES
// ============================================================

collect(ROOT);


// ============================================================
// MATCH APP HTML SHELL
// ============================================================

// Match #app through its closing tag immediately before
// the existing site-config.js script.
//
// Keep the document <head> intact so that generated SEO
// titles, descriptions, canonical and schema are preserved.

const appShell =
  /<div\s+id=["']app["'][^>]*>[\s\S]*?<\/div>\s*(?=<script\s+src=["'](?:\.\.\/)*js\/site-config\.js["'])/i;


// ============================================================
// REMOVE OLD DUPLICATE CSS
// ============================================================

const oldBackupCSS =
  /<style>\s*\/\* CSS backup embedded on every route\. \*\/[\s\S]*?<\/style>\s*/gi;

const markedBackupCSS =
  /<style\s+data-sporthub-preview-css(?:=["'][^"']*["'])?\s*>[\s\S]*?<\/style>\s*/gi;


// ============================================================
// FIND MAIN STYLESHEET
// ============================================================

const stylesheetLink =
  /(<link\s+rel=["']stylesheet["']\s+href=["'](?:\.\.\/)*css\/style\.css["'][^>]*>)/i;


// ============================================================
// PREPARE ALL HTML ROUTES
// ============================================================

// Prepare every page first.
//
// If prerendering fails on any route, stop before
// overwriting existing HTML files.

const preparedPages = [];

for (const filename of allHTML) {

  let doc = readFileSync(filename, 'utf8');

  const pageData = doc.match(
    /<body\s+data-page="([^"]+)"\s+data-slug="([^"]*)"/i
  );

  // Leave unrelated index.html files untouched.
  if (!pageData) {
    continue;
  }

  const isRoot = filename === join(ROOT, 'index.html');

  const path = relative(
    ROOT,
    dirname(filename)
  )
    .split(sep)
    .filter(part => part && part !== '.')
    .join('/');

  const prefix = '../'.repeat(
    path ? path.split('/').length : 0
  );

  // The HTML shell must exist before any changes.
  if (!appShell.test(doc)) {

    throw new Error(
      'Cannot find app shell in ' + filename
    );

  }

  // Render content using the existing app.js.
  const snapshot = rewrite(
    render(pageData[1], pageData[2], path),
    prefix,
    isRoot
  );

  // Replace only the body content inside #app.
  // Using a callback avoids special replacement-string
  // interpretation of $ characters in rendered markup.
  doc = doc.replace(

    appShell,

    () =>
      `<div id="app">${snapshot}` +
      `<noscript>` +
      `<p class="container">` +
      `Để sử dụng giỏ hàng và bộ lọc sản phẩm, ` +
      `vui lòng bật JavaScript.` +
      `</p>` +
      `</noscript></div>\n`

  );

  // Remove duplicate CSS generated by older versions.
  doc = doc
    .replace(oldBackupCSS, '')
    .replace(markedBackupCSS, '');

  // Embed CSS only for standalone homepage preview.
  if (isRoot) {

    if (!stylesheetLink.test(doc)) {

      throw new Error(
        'Missing root stylesheet link in ' + filename
      );

    }

    // Keep the existing CSS content unchanged.
    // Escape a possible HTML closing-style sequence.
    const safeCSS = stylesheet.replace(
      /<\/style/gi,
      '<\\/style'
    );

    // Preserve the actual linked stylesheet.
    // Inline CSS is only an extra homepage preview.
    doc = doc.replace(

      stylesheetLink,

      match =>
        `${match}\n` +
        `<style data-sporthub-preview-css>\n` +
        `${safeCSS}\n` +
        `</style>`

    );

  }

  // Do not write yet: wait until every route succeeds.
  preparedPages.push({
    filename,
    content: doc
  });

}


// ============================================================
// VERIFY PREPARED ROUTES
// ============================================================

if (preparedPages.length === 0) {

  throw new Error(
    'No SPORTHUB HTML routes found for prerendering.'
  );

}


// ============================================================
// WRITE PRERENDERED HTML
// ============================================================

for (const page of preparedPages) {

  writeFileSync(
    page.filename,
    page.content,
    'utf8'
  );

}


// ============================================================
// BUILD REPORT
// ============================================================

console.log(
  `Prerendered ${preparedPages.length} HTML routes ` +
  'with clean URLs; preview CSS only on homepage.'
);
