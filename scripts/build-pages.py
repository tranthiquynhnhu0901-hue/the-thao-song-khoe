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
    parser.error('--base must be an absolute HTTP(S) URL without a query or fragment')

BASE = args.base.rstrip('/') + '/'
ROOT = Path(__file__).resolve().parent.parent
products = json.loads((ROOT / 'functions/products.json').read_text(encoding='utf-8'))

# The filenames below are fixed by the store owner. Never derive them from a slug.
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
    """Convert legacy assets/ paths to the current repository layout."""
    value = str(path or '').lstrip('/')
    if value.startswith('assets/'):
        value = value[len('assets/'):]
    return value


def validate_catalog():
    """Catch unintended product/image changes before overwriting any HTML."""
    if not isinstance(products, list) or len(products) != 40:
        raise SystemExit('Build stopped: functions/products.json must have 40 products.')

    ids = [p.get('id') for p in products]
    slugs = [p.get('slug') for p in products]
    if set(ids) != set(EXPECTED_IMAGES) or len(set(slugs)) != 40:
        raise SystemExit('Build stopped: product IDs or slugs are missing/duplicated.')

    for product in products:
        pid = product['id']
        expected = 'img/products/' + EXPECTED_IMAGES[pid]
        actual = local_asset(product.get('image'))
        if actual != expected:
            raise SystemExit(
                f'Build stopped: {pid} image should be {expected}; got {actual!r}.'
            )
        if not str(product.get('name') or '').strip():
            raise SystemExit(f'Build stopped: {pid} has no product name.')


validate_catalog()

# ============================================================
# CATEGORY SEO METADATA
# ============================================================
categories = [
    (
        'thoi-trang-the-thao', 'Thời trang thể thao',
        'Khám phá áo thun chạy bộ, áo khoác gió, áo bóng rổ, '
        'quần short và legging tại SPORTHUB. Tìm trang phục cho '
        'nhiều kiểu vận động và xem giá tham khảo.'
    ),
    (
        'giay-the-thao', 'Giày thể thao',
        'Khám phá giày chạy bộ, tập gym, pickleball, cầu lông và '
        'giày đi bộ tại SPORTHUB. Tìm kiểu dáng phù hợp nhu cầu '
        'vận động, xem thông tin và giá tham khảo.'
    ),
    (
        'gym-fitness', 'Gym & Fitness',
        'Tìm hiểu tạ tay, tạ ấm, dây kháng lực, con lăn tập bụng '
        'và phụ kiện Gym & Fitness tại SPORTHUB. Khám phá dụng cụ '
        'tập luyện tại nhà và giá tham khảo.'
    ),
    (
        'pickleball', 'Pickleball',
        'Khám phá vợt pickleball, bóng tập, túi đựng vợt và băng '
        'quấn cán tại SPORTHUB. Xem đặc điểm của từng sản phẩm '
        'và giá tham khảo để lựa chọn phù hợp.'
    ),
    (
        'cau-long', 'Cầu lông',
        'Khám phá vợt cầu lông, ống cầu, dây cước và túi đựng vợt '
        'tại SPORTHUB. Xem các mẫu dụng cụ cầu lông dành cho '
        'tập luyện, giải trí cùng giá tham khảo.'
    ),
    (
        'yoga-pilates', 'Yoga & Pilates',
        'Khám phá thảm yoga, gạch hỗ trợ, vòng Pilates và dây kéo '
        'giãn tại SPORTHUB. Tìm hiểu các phụ kiện tập yoga và '
        'Pilates, đặc điểm sản phẩm và giá tham khảo.'
    ),
    (
        'phu-kien', 'Phụ kiện thể thao',
        'Chọn bình nước thể thao, túi tập, vớ, băng đô và đai '
        'chạy bộ tại SPORTHUB. Khám phá phụ kiện tiện dụng '
        'cho luyện tập, di chuyển và xem giá tham khảo.'
    ),
    (
        'phuc-hoi', 'Chăm sóc & phục hồi',
        'Khám phá ống lăn cơ, bóng massage và máy massage cầm tay '
        'tại SPORTHUB. Tìm hiểu dụng cụ hỗ trợ chăm sóc cơ thể '
        'sau vận động và mức giá tham khảo.'
    ),
]

category_titles = {
    'thoi-trang-the-thao': 'Thời trang thể thao: Áo, quần tập luyện | SPORTHUB',
    'giay-the-thao': 'Giày thể thao: Chạy bộ, gym và giày sân | SPORTHUB',
    'gym-fitness': 'Gym & Fitness: Tạ và dụng cụ tập luyện | SPORTHUB',
    'pickleball': 'Pickleball: Vợt, bóng và phụ kiện | SPORTHUB',
    'cau-long': 'Cầu lông: Vợt, cầu và phụ kiện tập luyện | SPORTHUB',
    'yoga-pilates': 'Yoga & Pilates: Thảm và dụng cụ tập | SPORTHUB',
    'phu-kien': 'Phụ kiện thể thao: Bình nước, túi và vớ | SPORTHUB',
    'phuc-hoi': 'Chăm sóc & phục hồi: Dụng cụ massage | SPORTHUB',
}
category_names = {slug: name for slug, name, _ in categories}

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
        '', 'home', '',
        'SPORTHUB – Thể thao & lối sống năng động',
        'Khám phá thời trang thể thao, giày, dụng cụ gym, '
        'pickleball, cầu lông và yoga tại SPORTHUB. Xem '
        'các mẫu sản phẩm cho lối sống năng động và giá tham khảo.'
    ),
    (
        'san-pham', 'shop', '',
        'Cửa hàng thể thao: 40 sản phẩm | SPORTHUB',
        'Khám phá 40 mẫu thời trang, giày và dụng cụ thể thao '
        'tại SPORTHUB. Lọc theo danh mục, mức giá và ưu đãi '
        'để tìm sản phẩm cùng thông tin, giá tham khảo.'
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
        'Tìm hiểu SPORTHUB, tinh thần vận động mỗi ngày và '
        'cách cửa hàng giới thiệu thời trang, giày, dụng cụ '
        'tập luyện, phụ kiện cho nhiều bộ môn thể thao.'
    ),
    (
        'lien-he', 'contact', '',
        'Liên hệ SPORTHUB – Thông tin và hỗ trợ',
        'Xem thông tin liên hệ SPORTHUB và các kênh trao đổi '
        'khi cần hỏi về sản phẩm, thông tin giá tham khảo '
        'hoặc những vấn đề liên quan đến cửa hàng.'
    ),
    (
        'bai-viet', 'blog', '',
        'Kiến thức thể thao: Chạy bộ, gym, pickleball | SPORTHUB',
        'Đọc bài viết về cách bắt đầu chạy bộ, sắp xếp góc '
        'tập gym tại nhà và làm quen với pickleball. Khám '
        'phá kiến thức vận động tại SPORTHUB.'
    ),
    (
        'chinh-sach-mua-hang', 'policy', '',
        'Chính sách mua hàng và thanh toán | SPORTHUB',
        'Tham khảo chính sách mua hàng tại SPORTHUB, thông '
        'tin liên quan đến quy trình đặt hàng, thanh toán '
        'và những lưu ý trước khi lựa chọn sản phẩm.'
    ),
    (
        'bao-mat', 'privacy', '',
        'Chính sách bảo mật và điều khoản | SPORTHUB',
        'Đọc nội dung chính sách bảo mật và điều khoản của '
        'SPORTHUB. Tìm hiểu cách sử dụng thông tin người dùng '
        'và các lưu ý khi truy cập website.'
    ),
    (
        'dang-nhap', 'login', '',
        'Đăng nhập | SPORTHUB',
        'Giao diện đăng nhập mô phỏng của SPORTHUB; '
        'chức năng tài khoản chưa được kích hoạt.'
    ),
    (
        'tai-khoan', 'account', '',
        'Tài khoản | SPORTHUB',
        'Trang tài khoản mô phỏng của SPORTHUB; '
        'chức năng đăng nhập chưa được kích hoạt.'
    ),
    (
        'quan-tri', 'admin', '',
        'Quản trị website | SPORTHUB',
        'Khu vực quản trị riêng tư, chỉ có thể truy cập '
        'sau khi cấp quyền.'
    ),
]

# ============================================================
# CATEGORY ROUTES
# ============================================================
for category_slug, name, description in categories:
    routes.append((
        f'danh-muc/{category_slug}', 'category', category_slug,
        category_titles[category_slug], description
    ))

# ============================================================
# PRODUCT ROUTES
# ============================================================
for product in products:
    name = str(product['name']).strip()
    short = ' '.join(str(product.get('short') or '').split()).rstrip('. ')
    category = category_names.get(product.get('category'), '')

    product_title = f'{name} – {category} | SPORTHUB' if category else f'{name} | SPORTHUB'
    if len(product_title) > 65:
        product_title = f'{name} | SPORTHUB'

    description = f'{name} tại SPORTHUB. '
    if short:
        description += f'{short}. '
    description += 'Khám phá thông tin chi tiết, lựa chọn phù hợp và giá tham khảo.'

    routes.append((
        f"san-pham/{product['slug']}", 'product',
        product['slug'], product_title, description
    ))

# ============================================================
# ARTICLE ROUTES
# ============================================================
for post_slug, name, description in posts:
    routes.append((
        f'bai-viet/{post_slug}', 'article', post_slug,
        f'{name} | SPORTHUB', description
    ))

# ============================================================
# SOCIAL IMAGES
# ============================================================
def social_image(product=None):
    """Only advertise images that actually exist; missing WebP is acceptable."""
    if product:
        candidate = local_asset(product.get('image'))
        if candidate and (ROOT / candidate).is_file():
            return BASE + candidate

    for shared in ('img/social-share.png', 'img/social-share.webp'):
        if (ROOT / shared).is_file():
            return BASE + shared

    return None

# ============================================================
# PRIVATE PAGES
# ============================================================
private_pages = {'checkout', 'cart', 'account', 'login', 'admin'}
# ============================================================
# GENERATE HTML ROUTES
# ============================================================
for path, page, slug, title, description in routes:
    folder = ROOT / path
    folder.mkdir(parents=True, exist_ok=True)

    depth = len(Path(path).parts) if path else 0
    prefix = '../' * depth
    url = BASE + (path + '/' if path else '')  # Public URL without index.html.

    product = (
        next((p for p in products if p['slug'] == slug), None)
        if page == 'product' else None
    )
    image = social_image(product)
    social_image_tag = (
        f'<meta property="og:image" content="{html.escape(image, quote=True)}">'
        if image else ''
    )
    robots = 'noindex,follow' if page in private_pages else 'index,follow'

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
{social_image_tag}

<link rel="icon" href="{prefix}img/favicon.svg" type="image/svg+xml">
<link rel="stylesheet" href="{prefix}css/style.css">
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
    (folder / 'index.html').write_text(content, encoding='utf-8')

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
(ROOT / '404.html').write_text(not_found, encoding='utf-8')

# ============================================================
# GENERATE SITEMAP
# ============================================================
public_routes = [route for route in routes if route[1] not in private_pages]
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
(ROOT / 'sitemap.xml').write_text(xml, encoding='utf-8')

# ============================================================
# GENERATE ROBOTS
# ============================================================
# Crawlers need access to private pages to read their noindex tags.
(ROOT / 'robots.txt').write_text(
    'User-agent: *\n'
    'Allow: /\n'
    'Sitemap: ' + BASE + 'sitemap.xml\n',
    encoding='utf-8'
)

# ============================================================
# BUILD REPORT AND EXISTING POST-PROCESSING
# ============================================================
print(
    f'Generated {len(routes
    