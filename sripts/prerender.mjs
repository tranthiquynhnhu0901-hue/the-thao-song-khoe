
/**
 * SPORTHUB V1 - render HTML content for static GitHub Pages routes.
 * Keep the current product data, original images and existing app behavior.
 * Public links use clean directory URLs while index.html remains on disk.
 */
import {readFileSync, writeFileSync, readdirSync, existsSync} from 'node:fs';
import {resolve, dirname, join, relative, sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import vm from 'node:vm';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const appCode = readFileSync(join(ROOT, 'assets/js/app.js'), 'utf8');
const productsCode = readFileSync(join(ROOT, 'assets/js/products.js'), 'utf8');
const stylesheet = readFileSync(join(ROOT, 'assets/css/style.css'), 'utf8');
const fakeRoot = 'https://sporthub-static.invalid/';

// Apply layout rules after the existing stylesheet and media queries.
// Keep the product listing full-width without changing other sections.
const storefrontCSS = `
/* SPORTHUB V1: full-width product listing */
.shop-layout{display:block!important;min-width:0!important}
.shop-layout>.filters{display:none!important}
.shop-layout>div:last-child{display:block!important;min-width:0!important;width:100%!important;max-width:100%!important;grid-column:auto!important;flex:none!important}
.shop-layout .shop-toolbar{display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;min-width:0}
.shop-layout .shop-toolbar select{max-width:215px;min-width:0}
.shop-layout .product-grid{display:grid!important;width:100%!important;min-width:0!important;grid-template-columns:repeat(4,minmax(0,1fr))!important;gap:20px!important}
.shop-layout .product-card,.shop-layout .product-info{min-width:0;max-width:100%;width:100%}
.shop-layout .product-title{overflow-wrap:anywhere}
@media(max-width:1100px){.shop-layout .product-grid{grid-template-columns:repeat(3,minmax(0,1fr))!important}}
@media(max-width:760px){.shop-layout .product-grid{grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:11px!important}}
@media(max-width:370px){.shop-layout .product-grid{grid-template-columns:minmax(0,1fr)!important}}
`;

const allHTML = [];

function collect(dir) {
  for (const entry of readdirSync(dir, {withFileTypes:true})) {
    if (['node_modules', '.git', 'functions', 'assets'].includes(entry.name)) {
      continue;
    }

    const filename = join(dir, entry.name);

    if (entry.isDirectory()) {
      collect(filename);
    } else if (entry.name === 'index.html') {
      allHTML.push(filename);
    }
  }
}

collect(ROOT);

function render(page, slug) {
  let markup = '';

  const dummy = {
    innerHTML: '',
    textContent: '',
    setAttribute() {},
    classList: {
      toggle() {}
    }
  };

  const app = {
    set innerHTML(value) {
      markup = value;
    },
    get innerHTML() {
      return markup;
    }
  };

  const context = {
    window: {
      SPORT_CONFIG: {}
    },

    document: {
      body: {
        dataset: {page, slug},
        append() {}
      },

      currentScript: {
        src: fakeRoot + 'assets/js/app.js'
      },

      getElementById(id) {
        return id === 'app' ? app : dummy;
      },

      querySelector() {
        return null;
      },

      querySelectorAll() {
        return [];
      },

      addEventListener() {},

      createElement() {
        return {
          className: '',
          textContent: '',
          remove() {}
        };
      }
    },

    location: {
      protocol: 'https:',
      href: fakeRoot,
      origin: 'https://sporthub-static.invalid',
      search: '',
      pathname: '/'
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

    setTimeout() {},
    clearTimeout() {},

    fetch() {
      throw Error('Static render must not use the network');
    }
  };

  context.window.window = context.window;

  vm.createContext(context);

  vm.runInContext(productsCode, context, {
    filename: 'products.js'
  });

  vm.runInContext(appCode, context, {
    filename: 'app.js'
  });

  if (!markup) {
    throw Error(`No static HTML rendered for ${page}/${slug}`);
  }

  return markup;
}

// Clean links left over from old generated HTML.
function cleanAnchorLinks(markup) {
  return markup.replace(
    /(<a\b[^>]*\bhref=)(["'])([^"']*)(\2)/gi,
    (full, start, quote, href) => {

      // Leave external links and special schemes unchanged.
      if (/^(?:[a-z][a-z0-9+.-]*:|\/\/|#)/i.test(href)) {
        return full;
      }

      const match = href.match(/^([^?#]*)([?#].*)?$/);

      if (!match) {
        return full;
      }

      let path = match[1];

      if (path === 'index.html') {
        path = './';
      } else {
        path = path.replace(/\/index\.html$/i, '/');
      }

      return start + quote + path + (match[2] || '') + quote;
    }
  );
}

// Convert render-time URLs into working relative URLs.
function rewrite(markup, prefix, isRoot) {
  const withRelativeAssets = markup.replace(
    /https:\/\/sporthub-static\.invalid\/([^"'\s<>]*)/g,
    (_match, originalPath) => {
      let path = originalPath;

      // Use an existing SVG when a product WebP does not exist.
      // Do not modify or generate any image file.
      if (
        /^assets\/img\/products\/[a-zA-Z0-9/_-]+\.webp$/.test(path) &&
        !existsSync(join(ROOT, path)) &&
        existsSync(join(ROOT, path.replace(/\.webp$/, '.svg')))
      ) {
        path = path.replace(/\.webp$/, '.svg');
      }

      // Single-file home preview: embed SVG images only.
      if (
        isRoot &&
        /^assets\/img\/[a-zA-Z0-9/_-]+\.svg$/.test(path)
      ) {
        const filename = resolve(ROOT, path);

        if (
          filename.startsWith(ROOT + sep) &&
          existsSync(filename)
        ) {
          return 'data:image/svg+xml,' +
            encodeURIComponent(readFileSync(filename, 'utf8'));
        }
      }

      return prefix + path;
    }
  );

  return cleanAnchorLinks(withRelativeAssets);
}

let count = 0;

for (const filename of allHTML) {
  let doc = readFileSync(filename, 'utf8');

  const info = doc.match(
    /<body\s+data-page="([^"]+)"\s+data-slug="([^"]*)"/
  );

  if (!info) {
    continue;
  }

  const isRoot = filename === join(ROOT, 'index.html');

  const depth = relative(ROOT, dirname(filename))
    .split(sep)
    .filter(part => part && part !== '.')
    .length;

  const prefix = '../'.repeat(depth);

  const markup = rewrite(
    render(info[1], info[2]),
    prefix,
    isRoot
  );

  const shell = /<div id="app">[\s\S]*?<\/div>\s*<script src=/;

  if (!shell.test(doc)) {
    throw Error('Missing app shell: ' + filename);
  }

  doc = doc.replace(
    shell,
    `<div id="app">${markup}<noscript><p class="container">Để sử dụng giỏ hàng và tìm kiếm, vui lòng bật JavaScript.</p></noscript></div>\n<script src=`
  );

  // Remove previously generated CSS to prevent old layout
  // rules from overriding the latest stylesheet.
  doc = doc.replace(
    /<style>\s*\/\* CSS backup embedded on every route\. \*\/[\s\S]*?<\/style>\s*/g,
    ''
  );

  const cssLink =
    /(<link rel="stylesheet" href="[^"]*assets\/css\/style\.css"\s*\/?\s*>)/;

  if (!cssLink.test(doc)) {
    throw Error('Missing stylesheet link: ' + filename);
  }

  const cssBackup =
    `<style>\n/* CSS backup embedded on every route. */\n` +
    stylesheet +
    '\n' +
    storefrontCSS +
    '\n</style>';

  doc = doc.replace(
    cssLink,
    (_full, linkTag) => `${linkTag}\n${cssBackup}`
  );

  writeFileSync(filename, doc, 'utf8');
  count++;
}

console.log(
  `Updated ${count} SPORTHUB static routes (full-width shop and clean links).`
);
