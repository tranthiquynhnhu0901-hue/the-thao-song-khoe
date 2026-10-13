#!/usr/bin/env python3
"""Build SPORTHUB static pages, then prerender and enhance SEO."""

from pathlib import Path
from urllib.parse import urlsplit
import argparse
import html
import json
import subprocess
import sys

parser = argparse.ArgumentParser()
parser.add_argument(
    '--base',
    default='https://tranthiquynhnhu0901-hue.github.io/the-thao-song-khoe/',
    help='Public GitHub Pages base URL.',
)
args = parser.parse_args()
parsed = urlsplit(args.base)
if (parsed.scheme not in ('http', 'https') or not parsed.netloc
        or parsed.query or parsed.fragment):
    parser.error('--base must be an absolute HTTP(S) URL without query or fragment')

BASE = args.base.rstrip('/') + '/'
ROOT = Path(__file__).resolve().parent.parent
products = json.loads((ROOT / 'functions/products.json').read_text(encoding='utf-8'))

# Fixed image filenames approved by the store owner. Never derive from slugs.
EXPECTED_IMAGES = {
    'SH001': 'ao-thun-chay-bo-aero.webp',
    'SH002': 'ao-bong-ro-court-move.webp',
    'SH003': 'quan-short-tap-luyen-sprint.webp',
    'SH004': 'ao-polo-the-thao-active.webp',
    'SH005': 'ao-khoac-gio-tempo.webp',
    'SH006': 'quan-legging-flex.webp',
    'SH007': 'ao-the-thao-nu-motion.webp',
    'SH008': 'giay-chay-bo-roadflow.webp',
    'SH009': 'giay-tap-gym-groundfit.webp',
    'SH010': 'giay-pickleball-court-one.webp',
    'SH011': 'giay-cau-long-swiftstep.webp',
    'SH012': 'giay-i-bo-everyday.webp',
    'SH013': 'giay-lifestyle-street-pace.webp',
    'SH014': 'bo-ta-tay-neoprene.webp',
    'SH015': 'ta-am-kettlebell-core.webp',
    'SH016': 'bo-day-khang-luc-3-muc.webp',
    'SH017': 'con-lan-tap-bung-ab-wheel.webp',
    'SH018': 'day-nhay-toc-o-pulse.webp',
    'SH019': 'banh-ta-boc-cao-su.webp',
    'SH020': 'vot-pickleball-nova.webp',
    'SH021': 'vot-pickleball-control-x.webp',
    'SH022': 'bo-bong-pickleball-6-qua.webp',
    'SH023': 'tui-ung-vot-pickleball.webp',
    'SH024': 'bang-quan-can-vot.webp',
    'SH025': 'vot-cau-long-airspeed.webp',
    'SH026': 'ong-cau-long-tap-luyen.webp',
    'SH027': 'bo-day-cuoc-cau-long.webp',
    'SH028': 'tui-ung-vot-cau-long.webp',
    'SH029': 'tham-yoga-harmony.webp',
    'SH030': 'bo-gach-yoga-balance.webp',
    'SH031': 'vong-tap-pilates-circle.webp',
    'SH032': 'day-keo-gian-yoga.webp',
    'SH033': 'binh-nuoc-the-thao-hydro.webp',
    'SH034': 'tui-du-lich-the-thao-gobag.webp',
    'SH035': 'vo-the-thao-performance.webp',
    'SH036': 'bang-o-tham-hut-active.webp',
    'SH037': 'ai-chay-bo-running-belt.webp',
    'SH038': 'ong-lan-co-foam-roller.webp',
    'SH039': 'may-massage-cam-tay-compact.webp',
    'SH040': 'bong-massage-iem-co.webp',
}


def local_asset(path):
    value = str(path or '').lstrip('/')
    return value[7:] if value.startswith('assets/') else value


def validate_catalog():
    if not isinstance(products, list) or len(products) != 40:
        raise SystemExit('Build stopped: functions/products.json must contain 40 products.')

    ids = [p.get('id') for p in products]
    slugs = [p.get('slug') for p in products]

    if set(ids) != set(EXPECTED_IMAGES) or len(set(ids)) != 40:
        raise SystemExit('Build stopped: incorrect or duplicated product IDs.')

    if any(not isinstance(s, str) or not s for s in slugs) or len(set(slugs)) != 40:
        raise SystemExit('Build stopped: product slugs missing or duplicated.')

    for product in products:
        pid = product['id']
        expected = 'img/products/' + EXPECTED_IMAGES[pid]
        actual = local_asset(product.get('image'))

        if actual != expected:
            raise SystemExit(
                f'Build stopped: {pid} image must be {expected}; got {actual!r}.'
            )

        if not str(product.get('name') or '').strip():
            raise SystemExit(f'Build stopped: {pid} missing product name.')


validate_catalog()

# ============================================================
# CATEGORY SEO METADATA
# ============================================================

categories = [
    (
        'thoi-trang-the-thao', 'Thời trang thể thao',
        'Khám phá áo chạy bộ, áo khoác gió, áo bóng rổ, quần short và legging tại SPORTHUB. Xem kiểu dáng và giá tham khảo.'
    ),
    (
        'giay-the-thao', 'Giày thể thao',
        'Khám phá giày chạy bộ, gym, pickleball, cầu lông và đi bộ tại SPORTHUB. So sánh kiểu giày và giá tham khảo.'
    ),
    (
        'gym-fitness', 'Gym & Fitness',
        'Khám phá tạ tay, tạ ấm, dây kháng lực và dụng cụ tập gym tại nhà. Xem thông tin và giá tham khảo tại SPORTHUB.'
    ),
    (
        'pickleball', 'Pickleball',
        'Khám phá vợt, bóng, túi đựng vợt và băng quấn cán pickleball tại SPORTHUB. So sánh sản phẩm và giá tham khảo.'
    ),
    (
        'cau-long', 'Cầu lông',
        'Khám phá vợt cầu lông, ống cầu, dây cước và túi đựng vợt tại SPORTHUB. Xem dụng cụ tập luyện và giá tham khảo.'
    ),
    (
        'yoga-pilates', 'Yoga & Pilates',
        'Khám phá thảm yoga, gạch hỗ trợ, vòng Pilates và dây kéo giãn tại SPORTHUB. Xem thông tin dụng cụ và giá tham khảo.'
    ),
    (
        'phu-kien', 'Phụ kiện thể thao',
        'Chọn bình nước, túi tập, vớ, băng đô và đai chạy bộ tại SPORTHUB. Tìm hiểu phụ kiện vận động và giá tham khảo.'
    ),
    (
        'phuc-hoi', 'Chăm sóc & phục hồi',
        'Khám phá ống lăn cơ, bóng massage và máy massage cầm tay tại SPORTHUB. Xem lưu ý sử dụng và mức giá tham khảo.'
    ),
]

category_titles = {
    'thoi-trang-the-thao': 'Thời trang thể thao: Áo, quần tập luyện | SPORTHUB',
    'giay-the-thao': 'Giày thể thao: Chạy bộ, gym và giày sân | SPORTHUB',
    'gym-fitness': 'Gym & Fitness: Tạ tay và dụng cụ tập luyện | SPORTHUB',
    'pickleball': 'Pickleball: Vợt, bóng và phụ kiện tập luyện | SPORTHUB',
    'cau-long': 'Cầu lông: Vợt, cầu và phụ kiện tập luyện | SPORTHUB',
    'yoga-pilates': 'Yoga & Pilates: Thảm và dụng cụ tập tại nhà | SPORTHUB',
    'phu-kien': 'Phụ kiện thể thao: Bình nước, túi và vớ | SPORTHUB',
    'phuc-hoi': 'Chăm sóc & phục hồi: Ống lăn và dụng cụ massage | SPORTHUB',
}

category_names = {slug: name for slug, name, _ in categories}

# ============================================================
# ARTICLE SEO METADATA
# ============================================================

posts = [
    (
        'bat-dau-chay-bo-dung-cach',
        'Bắt đầu chạy bộ: 5 điều nên biết cho người mới',
        'Gợi ý chọn giày, khởi động và kết hợp chạy với đi bộ cho người mới bắt đầu. Duy trì thói quen vận động cùng SPORTHUB.'
    ),
    (
        'sap-xep-goc-tap-gym-tai-nha',
        'Gợi ý bố trí góc tập gym gọn gàng tại nhà',
        'Tìm hiểu cách bố trí góc tập gym tại nhà và chọn thảm, dây kháng lực, tạ tay phù hợp. Xem lưu ý tập an toàn.'
    ),
    (
        'lam-quen-voi-pickleball',
        'Pickleball: bộ môn thú vị để chơi cùng bạn bè',
        'Làm quen với pickleball: luật chơi cơ bản, cách chọn vợt, bóng và giày sân. Xem mẹo tập cùng bạn bè tại SPORTHUB.'
    ),
]

# ============================================================
# MAIN ROUTES
# ============================================================

# Each route contains:
# path, page type, slug, HTML title, SEO description.

routes = [
    (
        '', 'home', '',
        'SPORTHUB | 40 mẫu thời trang, giày và dụng cụ thể thao',
        'Khám phá 40 mẫu thời trang, giày và dụng cụ thể thao SPORTHUB. Xem 8 danh mục, thông tin sản phẩm và giá tham khảo.'
    ),
    (
        'san-pham', 'shop', '',
        'Cửa hàng thể thao: 40 sản phẩm & 8 danh mục | SPORTHUB',
        'Khám phá 40 sản phẩm ở 8 danh mục SPORTHUB: thời trang, giày, gym, pickleball và yoga. Lọc theo giá, bộ môn và ưu đãi.'
    ),
    (
        'gio-hang', 'cart', '',
        'Giỏ hàng | SPORTHUB',
        'Quản lý những sản phẩm bạn chọn.'
    ),
    (
        'thanh-toan', 'checkout', '',
        'Thanh toán | SPORTHUB',
        'Kiểm tra và đặt hàng thể thao.'
    ),
    (
        'gioi-thieu', 'about', '',
        'Giới thiệu SPORTHUB – Thể thao & lối sống năng động',
        'Tìm hiểu về SPORTHUB và tinh thần vận động mỗi ngày. Khám phá 8 danh mục thời trang, giày và dụng cụ thể thao.'
    ),
    (
        'lien-he', 'contact', '',
        'Liên hệ SPORTHUB: Hỏi đáp và hỗ trợ mua đồ thể thao',
        'Liên hệ SPORTHUB để hỏi về sản phẩm, giá tham khảo và chính sách mua hàng. Xem các kênh hỗ trợ của cửa hàng.'
    ),
    (
        'bai-viet', 'blog', '',
        'Kiến thức thể thao: Chạy bộ, gym, pickleball | SPORTHUB',
        'Đọc bài viết SPORTHUB về bắt đầu chạy bộ, bố trí góc tập gym tại nhà và làm quen với pickleball. Khám phá mẹo vận động.'
    ),
    (
        'chinh-sach-mua-hang', 'policy', '',
        'Chính sách mua hàng: Thanh toán và giao nhận | SPORTHUB',
        'Tìm hiểu chính sách mua hàng SPORTHUB: đặt hàng, thanh toán, giao nhận và lưu ý đổi trả trước khi mua sản phẩm.'
    ),
    (
        'bao-mat', 'privacy', '',
        'Chính sách bảo mật & điều khoản sử dụng | SPORTHUB',
        'Đọc chính sách bảo mật và điều khoản SPORTHUB, cách dùng thông tin tài khoản và quyền riêng tư khi truy cập website.'
    ),
    (
        'dang-nhap', 'login', '',
        'Đăng nhập | SPORTHUB',
        'Giao diện đăng nhập mô phỏng của SPORTHUB.'
    ),
    (
        'tai-khoan', 'account', '',
        'Tài khoản | SPORTHUB',
        'Trang tài khoản mô phỏng của SPORTHUB.'
    ),
    (
        'quan-tri', 'admin', '',
        'Quản trị website | SPORTHUB',
        'Khu vực quản trị riêng tư.'
    ),
]

# ============================================================
# CATEGORY ROUTES
# ============================================================

for cat_slug, _name, description in categories:
    routes.append((
        f'danh-muc/{cat_slug}',
        'category',
        cat_slug,
        category_titles[cat_slug],
        description,
    ))

# ============================================================
# PRODUCT ROUTES
# ============================================================

# Product titles always contain the owner's original product name.
# Choose accurate category context without inventing technical features.
PRODUCT_TITLE_CONTEXTS = {
    'thoi-trang-the-thao': ('Thời trang thể thao', 'Trang phục vận động', 'Đồ tập thể thao'),
    'giay-the-thao': ('Giày thể thao', 'Giày cho vận động', 'Giày theo bộ môn'),
    'gym-fitness': ('Dụng cụ Gym & Fitness', 'Dụng cụ tập gym', 'Thiết bị tập luyện'),
    'pickleball': ('Dụng cụ Pickleball', 'Phụ kiện Pickleball', 'Pickleball'),
    'cau-long': ('Dụng cụ cầu lông', 'Phụ kiện cầu lông', 'Cầu lông'),
    'yoga-pilates': ('Dụng cụ Yoga & Pilates', 'Yoga & Pilates', 'Phụ kiện yoga'),
    'phu-kien': ('Phụ kiện thể thao', 'Phụ kiện vận động', 'Đồ tập thể thao'),
    'phuc-hoi': ('Chăm sóc & phục hồi', 'Dụng cụ massage', 'Dụng cụ phục hồi'),
}


def product_seo_title(product):
    name = str(product['name']).strip()
    contexts = PRODUCT_TITLE_CONTEXTS.get(product.get('category'), ())
    candidates = [f'{name} – {context} | SPORTHUB' for context in contexts]
    for candidate in candidates:
        if 50 <= len(candidate) <= 60:
            return candidate
    return min(candidates, key=lambda x: abs(len(x) - 55)) if candidates else f'{name} | SPORTHUB'


def product_seo_description(product):
    """Keep a natural, unique summary close to the tested SEOquake examples."""
    name = str(product['name']).strip()
    short = ' '.join(str(product.get('short') or '').split()).rstrip(' .')
    prefix = f'{name}: {short}.' if short else f'Tìm hiểu {name} tại SPORTHUB.'

    endings = (
        ' Tìm hiểu cách sử dụng và giá tham khảo tại SPORTHUB.',
        ' Tìm hiểu cách chọn và giá tại SPORTHUB.',
        ' Xem cách chọn và giá tham khảo tại SPORTHUB.',
        ' Xem thông số và giá tham khảo tại SPORTHUB.',
        ' Xem chi tiết và giá tham khảo tại SPORTHUB.',
        ' Tìm hiểu sản phẩm và giá tại SPORTHUB.',
        ' Xem mẫu và giá tham khảo tại SPORTHUB.',
        ' Xem giá tham khảo tại SPORTHUB.',
        ' Xem giá tại SPORTHUB.',
    )
    choices = [prefix + end for end in endings]
    # Aim around 118 characters, not the longer 158-195 used previously.
    in_range = [text for text in choices if 105 <= len(text) <= 125]
    return min(in_range or choices, key=lambda text: abs(len(text) - 118))


for product in products:
    routes.append((
        f"san-pham/{product['slug']}",
        'product',
        product['slug'],
        product_seo_title(product),
        product_seo_description(product),
    ))

# ============================================================
# ARTICLE ROUTES
# ============================================================

for article_slug, name, description in posts:
    routes.append((
        f'bai-viet/{article_slug}',
        'article',
        article_slug,
        f'{name} | SPORTHUB',
        description
    ))

# ============================================================
# VALIDATE PUBLIC SEO BEFORE WRITING HTML
# ============================================================

PRIVATE_PAGES = {'checkout', 'cart', 'account', 'login', 'admin'}
PUBLIC_ROUTES = [route for route in routes if route[1] not in PRIVATE_PAGES]

if len(routes) != 63 or len({route[0] for route in routes}) != 63:
    raise SystemExit('Build stopped: expected 63 unique routes.')

if len(PUBLIC_ROUTES) != 58:
    raise SystemExit('Build stopped: expected 58 public routes.')

for field, index in (('titles', 3), ('descriptions', 4)):
    values = [route[index] for route in PUBLIC_ROUTES]
    if len(values) != len(set(values)):
        raise SystemExit(f'Build stopped: duplicate SEO {field}.')

# Length is a tool heuristic; content accuracy and search intent come first.
for path, _page, _slug, title, description in PUBLIC_ROUTES:
    if not 50 <= len(title) <= 60:
        print(f'SEO review: title {len(title)} characters at {path or "/"}', file=sys.stderr)
    if not 105 <= len(description) <= 130:
        print(f'SEO review: description {len(description)} characters at {path or "/"}', file=sys.stderr)

# ============================================================
# SOCIAL IMAGES
# ============================================================

def social_image(product=None):
    """
    Only advertise an image if it actually exists
    in the repository.
    """

    if product:
        product_image = local_asset(
            product.get('image')
        )

        if product_image and (ROOT / product_image).is_file():
            return BASE + product_image

    for candidate in (
        'img/social-share.png',
        'img/social-share.webp'
    ):
        if (ROOT / candidate).is_file():
            return BASE + candidate

    return None


PRODUCT_BY_SLUG = {
    p['slug']: p
    for p in products
}

# ============================================================
# GENERATE HTML ROUTES
# ============================================================

for path, page, slug, title, description in routes:
    folder = ROOT / path
    folder.mkdir(parents=True, exist_ok=True)

    depth = len(Path(path).parts) if path else 0
    prefix = '../' * depth

    # Public URL must not contain /index.html.
    url = BASE + (path + '/' if path else '')

    product = (
        PRODUCT_BY_SLUG.get(slug)
        if page == 'product'
        else None
    )

    image = social_image(product)

    og_image_tag = (
        f'<meta property="og:image" content="{html.escape(image, quote=True)}">'
        if image
        else ''
    )

    robots = (
        'noindex,follow'
        if page in PRIVATE_PAGES
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
{og_image_tag}

<link rel="icon" href="{prefix}img/favicon.svg" type="image/svg+xml">
<link rel="stylesheet" href="{prefix}css/style.css">
</head>
<body data-page="{html.escape(page, quote=True)}" data-slug="{html.escape(slug, quote=True)}">
<div id="app">
  <noscript>Website cần JavaScript để hiển thị danh mục và giỏ hàng.</noscript>
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

public_routes = [
    route
    for route in routes
    if route[1] not in PRIVATE_PAGES
]

xml = (
    '<?xml version="1.0" encoding="UTF-8"?>\n'
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
)

for path, *_ in public_routes:
    xml += (
        '  <url><loc>'
        + html.escape(
            BASE + (path + '/' if path else '')
        )
        + '</loc></url>\n'
    )

xml += '</urlset>\n'

(ROOT / 'sitemap.xml').write_text(
    xml,
    encoding='utf-8'
)

# ============================================================
# GENERATE ROBOTS
# ============================================================

# Allow crawlers to see noindex metadata on private pages.
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

# First: insert static page contents.
subprocess.run(
    ['node', str(ROOT / 'scripts/prerender.mjs')],
    check=True
)

# Second: enhance final HTML metadata and schema.
subprocess.run(
    [
        sys.executable,
        str(ROOT / 'scripts/seo-enhance.py'),
        '--base',
        BASE
    ],
    check=True
)