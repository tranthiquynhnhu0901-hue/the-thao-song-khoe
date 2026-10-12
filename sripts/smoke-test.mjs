
import { readFileSync, existsSync } from 'node:fs';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { resolve, dirname, join } from 'node:path';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const BASE = 'https://tranthiquynhnhu0901-hue.github.io/the-thao-song-khoe/';
const TEST_BASE = 'https://example.github.io/the-thao-song-khoe/';

const errors = [];
let passed = 0;

function check(condition, message) {
  if (condition) passed++;
  else errors.push(message);
}

function read(path) {
  return readFileSync(join(ROOT, path), 'utf8');
}

function escapeHTML(v) {
  return String(v ?? '').replace(/[&<>"']/g, ch => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[ch]);
}

function normalized(v) {
  if (Array.isArray(v)) return v.map(normalized);

  if (v && typeof v === 'object') {
    return Object.fromEntries(
      Object.keys(v).sort().map(k => [k, normalized(v[k])])
    );
  }

  return v;
}

function same(a, b) {
  return JSON.stringify(normalized(a)) ===
         JSON.stringify(normalized(b));
}

const appCode = read('assets/js/app.js');
const catalogCode = read('assets/js/products.js');
const sourceProducts = JSON.parse(read('functions/products.json'));

function renderPage(page, slug = '') {
  let html = '';

  const listeners = {};
  const store = {};

  const app = {
    set innerHTML(value) {
      html = value;
    },
    get innerHTML() {
      return html;
    }
  };

  const dummy = {
    setAttribute() {},
    classList: {
      toggle() {}
    },
    innerHTML: '',
    textContent: ''
  };

  const context = {
    window: {
      SPORT_CONFIG: {}
    },

    document: {
      body: {
        dataset: { page, slug },
        append() {}
      },

      currentScript: {
        src: TEST_BASE + 'assets/js/app.js'
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

      addEventListener(event, handler) {
        listeners[event] = handler;
      },

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
      href: TEST_BASE + (
        slug
          ? page + '/' + slug + '/'
          : page + '/'
      ),
      origin: 'https://example.github.io',
      search: '',
      pathname: '/the-thao-song-khoe/'
    },

    localStorage: {
      getItem(key) {
        return store[key] ?? null;
      },

      setItem(key, value) {
        store[key] = value;
      }
    },

    URL,
    URLSearchParams,
    Intl,
    Date,
    Math,
    console,

    setTimeout() {
      return 1;
    },

    clearTimeout() {},

    navigator: {},

    fetch() {
      throw Error('Smoke test cannot access network');
    },

    confirm() {
      return true;
    }
  };

  context.window.window = context.window;

  vm.createContext(context);

  vm.runInContext(catalogCode, context, {
    filename: 'products.js'
  });

  vm.runInContext(appCode, context, {
    filename: 'app.js'
  });

  return {
    html,
    listeners,
    store,
    context
  };
}

// 1. Render 15 page types.
const cases = [
  ['home', '', 'Danh mục nổi bật'],
  ['shop', '', 'Tất cả sản phẩm'],
  ['category', 'pickleball', 'Pickleball'],
  ['product', 'ao-thun-chay-bo-aero', 'Mô tả chi tiết sản phẩm'],
  ['cart', '', 'Giỏ hàng của bạn'],
  ['checkout', '', 'Giỏ hàng đang trống'],
  ['about', '', 'Vận động theo cách của bạn'],
  ['contact', '', 'Liên hệ với chúng tôi'],
  ['blog', '', 'Góc kiến thức thể thao'],
  ['article', 'bat-dau-chay-bo-dung-cach', 'Bắt đầu chạy bộ'],
  ['policy', '', 'Chính sách mua hàng'],
  ['privacy', '', 'Chính sách bảo mật'],
  ['login', '', 'Chào mừng trở lại'],
  ['account', '', 'Tài khoản của tôi'],
  ['admin', '', 'Khu vực quản trị']
];

for (const [page, slug, expected] of cases) {
  const result = renderPage(page, slug);
  const markup = result.html;

  check(
    markup.includes(expected),
    `${page}: không hiển thị "${expected}"`
  );

  check(
    !/<a\b[^>]*\bhref="[^"]*\/index\.html(?:[?#]|")/i.test(markup),
    `${page}: liên kết nội bộ còn /index.html`
  );

  if (page === 'home') {
    check(
      markup.includes('category-grid'),
      'Trang chủ thiếu danh mục'
    );

    const button = {
      dataset: {
        action: 'add',
        id: 'SH003'
      }
    };

    result.listeners.click?.({
      target: {
        closest: () => button
      }
    });

    check(
      (result.store['sporthub-cart'] || '').includes('SH003'),
      'Thêm vào giỏ không lưu được'
    );

    const wish = {
      dataset: {
        action: 'wish',
        id: 'SH003'
      },

      classList: {
        toggle() {}
      },

      setAttribute() {}
    };

    result.listeners.click?.({
      target: {
        closest: () => wish
      }
    });

    check(
      (result.store['sporthub-wish'] || '').includes('SH003'),
      'Yêu thích chưa được lưu cho khách'
    );
  }

  if (page === 'shop') {
    check(
      (markup.match(/class="product-card"/g) || []).length === 40,
      'Cửa hàng phải có 40 sản phẩm'
    );

    check(
      markup.includes('class="shop-results"'),
      'Trang cửa hàng thiếu vùng kết quả sản phẩm'
    );
  }

  if (page === 'category') {
    check(
      (markup.match(/class="product-card"/g) || []).length === 5,
      'Danh mục Pickleball phải có 5 sản phẩm'
    );
  }

  if (page === 'product') {
    check(
      markup.includes(escapeHTML(sourceProducts[0].description)),
      'Trang chi tiết không hiển thị mô tả mới'
    );

    check(
      markup.includes('Chi tiết sản phẩm'),
      'Trang chi tiết thiếu bảng thông số'
    );

    const path =
      'assets/img/products/ao-thun-chay-bo-aero';

    const image = {
      tagName: 'IMG',
      src: TEST_BASE + path + '.webp',
      currentSrc: TEST_BASE + path + '.webp',
      dataset: {}
    };

    result.listeners.error?.({
      target: image
    });

    check(
      image.src === TEST_BASE + path + '.svg',
      'Ảnh WebP lỗi không chuyển về SVG'
    );
  }

  if (page === 'admin') {
    check(
      markup.includes('Chỉ tài khoản đã được cấp quyền'),
      'Trang quản trị chưa chặn khách không có quyền'
    );
  }

  console.log('✓ Render:', page, slug || '/');
}

// 2. Verify product catalogs are synchronized.
check(
  sourceProducts.length === 40,
  'functions/products.json phải có đúng 40 sản phẩm'
);

const browserProducts = Array.from(
  renderPage('home').context.window.SPORT_PRODUCTS
);

check(
  same(sourceProducts, browserProducts),
  'products.js và products.json chưa đồng bộ hoàn toàn'
);

check(
  new Set(sourceProducts.map(p => p.id)).size === 40,
  'Mã sản phẩm bị trùng'
);

check(
  new Set(sourceProducts.map(p => p.slug)).size === 40,
  'Slug sản phẩm bị trùng'
);

check(
  new Set(sourceProducts.map(p => p.image)).size === 40,
  'Ảnh sản phẩm dùng trùng đường dẫn'
);

// 3. Verify descriptions and existing image references.
for (const p of sourceProducts) {
  check(
    typeof p.description === 'string' &&
    p.description.trim().length >= 120,
    `${p.id}: mô tả chi tiết quá ngắn hoặc bị thiếu`
  );

  check(
    !p.description.includes(
      'là lựa chọn trong bộ sưu tập SPORTHUB'
    ),
    `${p.id}: vẫn dùng mô tả mẫu cũ`
  );

  check(
    p.image === `assets/img/products/${p.slug}.webp` &&
    p.fallbackImage === `assets/img/products/${p.slug}.svg`,
    `${p.id}: đường dẫn ảnh không theo quy ước V1`
  );

  check(
    existsSync(join(ROOT, p.fallbackImage)),
    `${p.id}: thiếu SVG dự phòng`
  );
}

// 4. Verify categories and all static routes.
const categories = Array.from(
  renderPage('home').context.window.SPORT_CATEGORIES
);

check(
  categories.length === 8,
  'Phải có 8 danh mục'
);

const articleSlugs = [
  'bat-dau-chay-bo-dung-cach',
  'sap-xep-goc-tap-gym-tai-nha',
  'lam-quen-voi-pickleball'
];

const routes = [
  ['', 'home'],
  ['san-pham', 'shop'],
  ['gio-hang', 'cart'],
  ['thanh-toan', 'checkout'],
  ['gioi-thieu', 'about'],
  ['lien-he', 'contact'],
  ['bai-viet', 'blog'],
  ['chinh-sach-mua-hang', 'policy'],
  ['bao-mat', 'privacy'],
  ['dang-nhap', 'login'],
  ['tai-khoan', 'account'],
  ['quan-tri', 'admin'],

  ...categories.map(c => [
    'danh-muc/' + c.slug,
    'category'
  ]),

  ...sourceProducts.map(p => [
    'san-pham/' + p.slug,
    'product'
  ]),

  ...articleSlugs.map(slug => [
    'bai-viet/' + slug,
    'article'
  ])
];

const privatePages = new Set([
  'cart',
  'checkout',
  'login',
  'account',
  'admin'
]);

const sitemapUrls = [];

for (const [route, page] of routes) {
  const path = join(ROOT, route, 'index.html');

  if (!existsSync(path)) {
    errors.push(
      `Thiếu trang: ${route || '/'}`
    );
    continue;
  }

  const doc = readFileSync(path, 'utf8');

  const cleanUrl = BASE + (
    route ? route + '/' : ''
  );

  // Verify canonical URL.
  const canonical = [
    ...doc.matchAll(
      /<link rel="canonical" href="([^"]+)"\s*\/?\s*>/g
    )
  ].map(m => m[1]);

  // Verify Open Graph URL.
  const ogUrls = [
    ...doc.matchAll(
      /<meta property="og:url" content="([^"]+)"\s*\/?\s*>/g
    )
  ].map(m => m[1]);

  // Verify JSON-LD structured data.
  const ld = [
    ...doc.matchAll(
      /<script type="application\/ld\+json">([\s\S]*?)<\/script>/g
    )
  ];

  check(
    canonical.length === 1 &&
    canonical[0] === cleanUrl,
    `${route || '/'}: canonical sai/trùng`
  );

  check(
    ogUrls.length === 1 &&
    ogUrls[0] === cleanUrl,
    `${route || '/'}: og:url sai/trùng`
  );

  check(
    ld.length === 1,
    `${route || '/'}: Schema JSON-LD thiếu/trùng`
  );

  if (ld.length === 1) {
    try {
      const graph =
        JSON.parse(ld[0][1])['@graph'];

      check(
        Array.isArray(graph) &&
        graph.length > 0,
        `${route || '/'}: @graph không hợp lệ`
      );
    } catch {
      errors.push(
        `${route || '/'}: JSON-LD không parse được`
      );
    }
  }

  // Verify indexing rules.
  const robots = doc.match(
    /<meta name="robots" content="([^"]+)"/
  );

  check(
    Boolean(
      robots &&
      robots[1].startsWith(
        privatePages.has(page)
          ? 'noindex'
          : 'index'
      )
    ),
    `${route || '/'}: robots meta không đúng`
  );

  // Ensure the embedded CSS is not duplicated.
  check(
    (
      doc.match(
        /\/\* CSS backup embedded on every route\. \*\//g
      ) || []
    ).length === 1,
    `${route || '/'}: CSS backup thiếu hoặc trùng`
  );

  // Internal links should not expose index.html.
  check(
    !/<a\b[^>]*\bhref="[^"]*\/index\.html(?:[?#]|")/i.test(doc),
    `${route || '/'}: đường dẫn liên kết còn /index.html`
  );

  if (!privatePages.has(page)) {
    sitemapUrls.push(cleanUrl);
  }

  // Verify product descriptions exist in generated static HTML.
  if (page === 'product') {
    const p = sourceProducts.find(
      x => route === 'san-pham/' + x.slug
    );

    check(
      doc.includes('Mô tả chi tiết sản phẩm') &&
      doc.includes(escapeHTML(p.description)),
      `${p.id}: trang HTML tĩnh chưa cập nhật mô tả mới`
    );
  }
}

check(
  routes.length === 63,
  `Số trang dự kiến phải là 63, hiện có ${routes.length}`
);

// 5. Verify sitemap.
const sitemap = read('sitemap.xml');

const locs = [
  ...sitemap.matchAll(
    /<loc>([^<]+)<\/loc>/g
  )
].map(m => m[1]);

check(
  locs.length === 58,
  `Sitemap phải có 58 URL công khai, hiện có ${locs.length}`
);

check(
  same(
    [...locs].sort(),
    [...sitemapUrls].sort()
  ),
  'Sitemap không khớp các trang công khai'
);

check(
  !sitemap.includes('/index.html'),
  'Sitemap chứa /index.html'
);

// 6. Verify repository-specific robots.txt paths.
const robotsTxt = read('robots.txt');

check(
  robotsTxt.includes(
    'Sitemap: ' + BASE + 'sitemap.xml'
  ),
  'robots.txt khai báo sitemap sai URL'
);

for (const route of [
  'quan-tri',
  'tai-khoan',
  'thanh-toan',
  'gio-hang'
]) {
  check(
    robotsTxt.includes(
      'Disallow: /the-thao-song-khoe/' +
      route + '/'
    ),
    `robots.txt chưa dùng đúng tiền tố GitHub Pages cho ${route}`
  );
}

// 7. Basic static checks for the corrected catalog layout.
const css = read('assets/css/style.css');

check(
  css.includes('.shop-layout .product-grid'),
  'CSS thiếu lưới sản phẩm trong trang danh mục'
);

check(
  css.includes('@media(max-width:760px)'),
  'CSS thiếu breakpoint cho màn hình nhỏ'
);

// 8. Final test report.
if (errors.length) {
  console.error(
    `\nFAILED: ${errors.length} lỗi (${passed} kiểm tra đạt):`
  );

  for (const item of errors) {
    console.error('✗', item);
  }

  process.exitCode = 1;
} else {
  console.log(
    `\nPASS: ${passed} kiểm tra; ` +
    '15 giao diện, 40 sản phẩm, 8 danh mục, ' +
    '63 trang tĩnh, 58 URL sitemap, SEO và giỏ hàng.'
  );

  console.log(
    'CHƯA KIỂM THỬ: Firebase thật, ' +
    'thanh toán thực tế, responsive trên trình duyệt.'
  );
}
