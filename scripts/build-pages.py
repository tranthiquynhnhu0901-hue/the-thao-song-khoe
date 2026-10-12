#!/usr/bin/env python3
"""Generate static GitHub Pages routes with clean public URLs and SEO metadata."""

from pathlib import Path
import argparse
import html
import json
import subprocess
import sys
from urllib.parse import urlsplit


parser = argparse.ArgumentParser()

parser.add_argument(
    '--base',
    default='https://tranthiquynhnhu0901-hue.github.io/the-thao-song-khoe/',
    help='Public GitHub Pages base URL (with or without trailing slash).',
)

args = parser.parse_args()
parsed_base = urlsplit(args.base)

if (
    parsed_base.scheme not in ('https', 'http')
    or not parsed_base.netloc
    or parsed_base.query
    or parsed_base.fragment
):
    parser.error(
        '--base must be an absolute HTTP(S) URL without a query or fragment'
    )

BASE = args.base.rstrip('/') + '/'
ROOT = Path(__file__).resolve().parent.parent

products = json.loads(
    (ROOT / 'functions/products.json').read_text(encoding='utf-8')
)


# ============================================================
# CATEGORY SEO METADATA
# ============================================================

categories = [
    (
        'thoi-trang-the-thao',
        'Thời trang thể thao',
        'Khám phá áo chạy bộ, áo khoác gió, áo bóng rổ, '
        'quần short và legging tại SPORTHUB. Xem các mẫu '
        'thời trang thể thao cùng giá tham khảo.'
    ),
    (
        'giay-the-thao',
        'Giày thể thao',
        'Khám phá giày chạy bộ, giày tập gym, giày cầu lông '
        'và pickleball tại SPORTHUB. Xem kiểu dáng, lựa chọn '
        'cỡ giày và giá tham khảo.'
    ),
    (
        'gym-fitness',
        'Gym & Fitness',
        'Khám phá tạ tay, tạ ấm, dây kháng lực và dụng cụ '
        'tập gym tại SPORTHUB. Tham khảo trang bị phù hợp '
        'cho góc tập tại nhà.'
    ),
    (
        'pickleball',
        'Pickleball',
        'Khám phá vợt, bóng và phụ kiện pickleball tại '
        'SPORTHUB. Tìm hiểu các mẫu dụng cụ tập luyện '
        'và giá tham khảo trước khi lựa chọn.'
    ),
    (
        'cau-long',
        'Cầu lông',
        'Khám phá vợt cầu lông, ống cầu, dây cước và túi '
        'đựng vợt tại SPORTHUB. Xem các mẫu dụng cụ cầu lông '
        'cùng giá tham khảo.'
    ),
    (
        'yoga-pilates',
        'Yoga & Pilates',
        'Khám phá thảm yoga, gạch hỗ trợ, vòng Pilates '
        'và dây kéo giãn tại SPORTHUB. Tham khảo phụ kiện '
        'cho các buổi tập yoga và Pilates.'
    ),
    (
        'phu-kien',
        'Phụ kiện thể thao',
        'Khám phá bình nước, túi thể thao, vớ, băng đô '
        'và đai chạy bộ tại SPORTHUB. Xem phụ kiện vận động '
        'và giá tham khảo.'
    ),
    (
        'phuc-hoi',
        'Chăm sóc & phục hồi',
        'Khám phá ống lăn cơ, bóng massage và thiết bị '
        'massage cầm tay tại SPORTHUB. Tham khảo sản phẩm '
        'chăm sóc sau vận động.'
    ),
]


# ============================================================
# ARTICLE SEO METADATA
# ============================================================

posts = [
    (
        'bat-dau-chay-bo-dung-cach',
        'Bắt đầu chạy bộ: 5 điều nên biết',
        'Gợi ý chọn giày, trang phục, khởi động và duy trì '
        'thói quen dành cho người mới bắt đầu chạy bộ.'
    ),
    (
        'sap-xep-goc-tap-gym-tai-nha',
        'Thiết lập góc tập gym gọn gàng tại nhà',
        'Tìm hiểu cách bố trí không gian và lựa chọn dụng cụ '
        'để xây dựng góc tập gym tại nhà gọn gàng, thuận tiện.'
    ),
    (
        'lam-quen-voi-pickleball',
        'Pickleball: bộ môn thú vị để vận động cùng bạn bè',
        'Tìm hiểu những điều cơ bản về pickleball, dụng cụ '
        'cần chuẩn bị và cách bắt đầu tập luyện cùng bạn bè.'
    ),
]


# ============================================================
# MAIN ROUTES
# ============================================================

routes = [
    (
        '',
        'home',
        '',
        'SPORTHUB – Thể thao & lối sống năng động',
        'Khám phá thời trang, giày, dụng cụ và phụ kiện '
        'thể thao tại SPORTHUB. Tham khảo 40 sản phẩm mẫu '
        'cho lối sống năng động.'
    ),
    (
        'san-pham',
        'shop',
        '',
        'Cửa hàng thể thao | SPORTHUB',
        'Khám phá các mẫu thời trang, giày, dụng cụ gym, '
        'pickleball, cầu lông và yoga tại SPORTHUB. '
        'Tìm sản phẩm và xem giá tham khảo.'
    ),
    (
        'gio-hang',
        'cart',
        '',
        'Giỏ hàng | SPORTHUB',
        'Quản lý những sản phẩm bạn chọn.'
    ),
    (
        'thanh-toan',
        'checkout',
        '',
        'Thanh toán | SPORTHUB',
        'Kiểm tra và đặt hàng thể thao.'
    ),
    (
        'gioi-thieu',
        'about',
        '',
        'Về chúng tôi | SPORTHUB',
        'Tìm hiểu tinh thần vận động và phong cách SPORTHUB.'
    ),
    (
        'lien-he',
        'contact',
        '',
        'Liên hệ | SPORTHUB',
        'Kênh hỗ trợ, liên hệ cửa hàng SPORTHUB.'
    ),
    (
        'bai-viet',
        'blog',
        '',
        'Kiến thức thể thao | SPORTHUB',
        'Bài viết chạy bộ, gym, pickleball và sức khỏe vận động.'
    ),
    (
        'chinh-sach-mua-hang',
        'policy',
        '',
        'Chính sách mua hàng | SPORTHUB',
        'Chính sách đặt hàng, giao nhận, thanh toán.'
    ),
    (
        'bao-mat',
        'privacy',
        '',
        'Bảo mật & điều khoản | SPORTHUB',
        'Chính sách sử dụng thông tin người dùng và điều khoản.'
    ),
    (
        'dang-nhap',
        'login',
        '',
        'Đăng nhập | SPORTHUB',
        'Đăng nhập bằng Google để quản lý tài khoản.'
    ),
    (
        'tai-khoan',
        'account',
        '',
        'Tài khoản | SPORTHUB',
        'Xem lịch sử đơn hàng, thông tin cá nhân và yêu thích.'
    ),
    (
        'quan-tri',
        'admin',
        '',
        'Quản trị website | SPORTHUB',
        'Khu vực quản trị riêng tư, chỉ có thể truy cập '
        'sau khi cấp quyền.'
    ),
]


# ============================================================
# CATEGORY ROUTES
# ============================================================

for category_slug, name, description in categories:

    title = (
        'Thời trang thể thao: Áo, quần tập luyện | SPORTHUB'
        if category_slug == 'thoi-trang-the-thao'
        else f'{name} | SPORTHUB'
    )

    routes.append((
        f'danh-muc/{category_slug}',
        'category',
        category_slug,
        title,
        description
    ))


# ============================================================
# PRODUCT ROUTES
# ============================================================

for product in products:

    short = str(product.get('short') or '').strip()

    description = (
        f"{product['name']} tại SPORTHUB. "
        f"{short} "
        "Xem thông tin và giá tham khảo."
    )

    routes.append((
        f"san-pham/{product['slug']}",
        'product',
        product['slug'],
        f"{product['name']} | SPORTHUB",
        description
    ))


# ============================================================
# ARTICLE ROUTES
# ============================================================

for post_slug, name, description in posts:

    routes.append((
        f'bai-viet/{post_slug}',
        'article',
        post_slug,
        f'{name} | SPORTHUB',
        description
    ))


# ============================================================
# ASSET PATH NORMALIZATION
# ============================================================

def local_asset(path):
    """
    Convert legacy assets/ paths from products.json
    to the current repository layout.
    """

    value = str(path or '').lstrip('/')

    if value.startswith('assets/'):
        value = value[len('assets/'):]

    return value


def social_image(product=None):
    """
    Prefer an existing product photo.
    Otherwise use the site's shared social image.
    """

    if product:

        candidate = local_asset(product.get('image'))

        if candidate and (ROOT / candidate).is_file():
            return BASE + candidate

    return BASE + 'img/social-share.png'


# ============================================================
# IMAGE FALLBACK
# ============================================================

image_fallback_js = r'''
document.addEventListener('error', function (e) {

  var im = e.target;

  if (
    im &&
    im.tagName === 'IMG' &&
    im.src.includes('/img/products/') &&
    /\.webp(?:[?#]|$)/i.test(im.src) &&
    im.dataset.fallbackUsed !== '1'
  ) {

    im.dataset.fallbackUsed = '1';

    im.src = im.src.replace(
      /\.webp(?=[?#]|$)/i,
      '.svg'
    );
  }

}, true);
'''


# ============================================================
# PRIVATE PAGES
# ============================================================

private_pages = {
    'checkout',
    'cart',
    'account',
    'login',
    'admin'
}


# ============================================================
# GENERATE HTML ROUTES
# ============================================================

for path, page, slug, title, description in routes:

    folder = ROOT / path
    folder.mkdir(parents=True, exist_ok=True)

    depth = len(Path(path).parts) if path else 0
    prefix = '../' * depth

    # Public URL never contains /index.html.
    url = BASE + (path + '/' if path else '')

    product = (
        next(
            (p for p in products if p['slug'] == slug),
            None
        )
        if page == 'product'
        else None
    )

    image = social_image(product)

    robots = (
        'noindex,follow'
        if page in private_pages
        else 'index,follow'
    )

    content = f'''<!doctype html>
<html lang="vi">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="theme-color" content="#10233f">

<title>{html.escape(title)}</title>

<meta name="description" content="{html.escape(description, quote=True)}">
<meta name="robots" content="{robots}">

<link rel="canonical" href="{html.escape(url, quote=True)}">

<meta property="og:type" content="{'product' if page == 'product' else 'website'}">
<meta property="og:site_name" content="SPORTHUB">
<meta property="og:title" content="{html.escape(title, quote=True)}">
<meta property="og:description" content="{html.escape(description, quote=True)}">
<meta property="og:url" content="{html.escape(url, quote=True)}">
<meta property="og:image" content="{html.escape(image, quote=True)}">

<link rel="icon" href="{prefix}img/favicon.svg" type="image/svg+xml">
<link rel="stylesheet" href="{prefix}css/style.css">

<script>{image_fallback_js}</script>
</head>

<body data-page="{html.escape(page, quote=True)}" data-slug="{html.escape(slug, quote=True)}">

<div id="app">
  <noscript>
    Website cần JavaScript để hiển thị danh mục và giỏ hàng.
    Vui lòng bật JavaScript.
  </noscript>
</div>

<script src="{prefix}js/site-config.js" defer></script>
<script src="{prefix}js/products.js" defer></script>
<script src="{prefix}js/app.js" defer></script>

</body>
</html>
'''

    (folder / 'index.html').write_text(
        content,
        encoding='utf-8'
    )


# ============================================================
# GENERATE 404 PAGE
# ============================================================

not_found = f'''<!doctype html>
<html lang="vi">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,follow">

<title>404 • SPORTHUB</title>

<style>
body{{margin:0;min-height:100vh;display:grid;place-items:center;font:16px Arial,sans-serif;background:#f6f8fc;color:#10233f;text-align:center}}
main{{padding:40px}}
h1{{font-size:68px;margin:0}}
a{{display:inline-block;background:#2563eb;color:#fff;padding:14px 20px;border-radius:10px;text-decoration:none}}
</style>
</head>

<body>
<main>
<h1>404</h1>
<h2>Không tìm thấy trang này</h2>
<p>Vui lòng quay về trang chủ SPORTHUB.</p>
<a href="{html.escape(BASE, quote=True)}">Về trang chủ</a>
</main>
</body>
</html>
'''

(ROOT / '404.html').write_text(
    not_found,
    encoding='utf-8'
)


# ============================================================
# GENERATE SITEMAP
# ============================================================

# Private pages do not belong in the public sitemap.
public_routes = [
    route
    for route in routes
    if route[1] not in private_pages
]

xml = (
    '<?xml version="1.0" encoding="UTF-8"?>\n'
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
)

xml += ''.join(
    '  <url><loc>'
    + html.escape(BASE + (path + '/' if path else ''))
    + '</loc></url>\n'
    for path, *_ in public_routes
)

xml += '</urlset>\n'

(ROOT / 'sitemap.xml').write_text(
    xml,
    encoding='utf-8'
)


# ============================================================
# GENERATE ROBOTS
# ============================================================

# Crawlers need access to pages to read their noindex tags.
(ROOT / 'robots.txt').write_text(
    'User-agent: *\n'
    'Allow: /\n'
    'Sitemap: ' + BASE + 'sitemap.xml\n',
    encoding='utf-8'
)


# ============================================================
# BUILD REPORT
# ============================================================

print(
    f'Generated {len(routes)} HTML pages, '
    f'{len(public_routes)} sitemap URLs for {BASE}'
)


# ============================================================
# POST-PROCESSING
# ============================================================

# Preserve the existing rendering and SEO pipeline.

subprocess.run(
    [
        'node',
        str(ROOT / 'scripts/prerender.mjs')
    ],
    check=True
)

subprocess.run(
    [
        sys.executable,
        str(ROOT / 'scripts/seo-enhance.py'),
        '--base',
        BASE
    ],
    check=True
)