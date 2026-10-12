
#!/usr/bin/env python3
"""Generate direct-link static route shells for GitHub Pages, no bundler needed."""
from pathlib import Path
import json, sys, argparse, html, urllib.parse

p=argparse.ArgumentParser();p.add_argument('--base',default='https://tranthiquynhnhu0901-hue.github.io/the-thao-song-khoe/',help='final public GitHub Pages URL, trailing / optional');a=p.parse_args()

ROOT=Path(__file__).resolve().parent.parent
BASE=a.base.rstrip('/')+'/'

products=json.loads((ROOT/'functions/products.json').read_text(encoding='utf8'))

categories=[
 ('thoi-trang-the-thao','Thời trang thể thao'),
 ('giay-the-thao','Giày thể thao'),
 ('gym-fitness','Gym & Fitness'),
 ('pickleball','Pickleball'),
 ('cau-long','Cầu lông'),
 ('yoga-pilates','Yoga & Pilates'),
 ('phu-kien','Phụ kiện thể thao'),
 ('phuc-hoi','Chăm sóc & phục hồi')
]

posts=[
 ('bat-dau-chay-bo-dung-cach','Bắt đầu chạy bộ: 5 điều nên biết'),
 ('sap-xep-goc-tap-gym-tai-nha','Thiết lập góc tập gym gọn gàng tại nhà'),
 ('lam-quen-voi-pickleball','Pickleball: bộ môn thú vị để vận động cùng bạn bè')
]

routes=[
 ('','home','','SPORTHUB – Thể thao & lối sống năng động','Khám phá 40 sản phẩm mẫu thể thao, giày, dụng cụ và phụ kiện tại SPORTHUB.'),
 ('san-pham','shop','','Cửa hàng thể thao | SPORTHUB','Thời trang, giày và dụng cụ thể thao dành cho bạn.'),
 ('gio-hang','cart','','Giỏ hàng | SPORTHUB','Quản lý những sản phẩm bạn chọn.'),
 ('thanh-toan','checkout','','Thanh toán | SPORTHUB','Kiểm tra và đặt hàng thể thao.'),
 ('gioi-thieu','about','','Về chúng tôi | SPORTHUB','Tìm hiểu tinh thần vận động và phong cách SPORTHUB.'),
 ('lien-he','contact','','Liên hệ | SPORTHUB','Kênh hỗ trợ, liên hệ cửa hàng SPORTHUB.'),
 ('bai-viet','blog','','Kiến thức thể thao | SPORTHUB','Bài viết chạy bộ, gym, pickleball và sức khỏe vận động.'),
 ('chinh-sach-mua-hang','policy','','Chính sách mua hàng | SPORTHUB','Chính sách đặt hàng, giao nhận, thanh toán.'),
 ('bao-mat','privacy','','Bảo mật & điều khoản | SPORTHUB','Chính sách sử dụng thông tin người dùng và điều khoản.'),
 ('dang-nhap','login','','Đăng nhập | SPORTHUB','Đăng nhập bằng Google để quản lý tài khoản.'),
 ('tai-khoan','account','','Tài khoản | SPORTHUB','Xem lịch sử đơn hàng, thông tin cá nhân và yêu thích.'),
 ('quan-tri','admin','','Quản trị website | SPORTHUB','Khu vực quản trị riêng tư, chỉ có thể truy cập sau khi cấp quyền.')
]

for slug,name in categories:
 routes.append((
  f'danh-muc/{slug}',
  'category',
  slug,
  f'{name} | SPORTHUB',
  f'Khám phá {name.lower()} tại SPORTHUB.'
 ))

for v in products:
 routes.append((
  f'san-pham/{v["slug"]}',
  'product',
  v['slug'],
  v['name']+' | SPORTHUB',
  v['short']
 ))

for slug,name in posts:
 routes.append((
  f'bai-viet/{slug}',
  'article',
  slug,
  name+' | SPORTHUB',
  'Chia sẻ những gợi ý hữu ích dành cho người yêu vận động.'
 ))

for path,page,slug,title,desc in routes:
 folder=ROOT/path
 folder.mkdir(parents=True,exist_ok=True)

 dep=(len(Path(path).parts) if path else 0)
 prefix='../'*dep

 # Canonical URL: clean directory path, never /index.html.
 url=BASE+('/'.join(Path(path).parts)+'/' if path else '')

 image=BASE+'assets/img/editorial/hero.svg'

 if page=='product':
  p=next(p for p in products if p['slug']==slug)
  image=BASE+(p['image'] if (ROOT/p['image']).is_file() else p['fallbackImage'])

 private=page in ['checkout','cart','account','login','admin']

 content=f'''<!doctype html>
<html lang="vi">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<meta name="theme-color" content="#10233f"/>
<meta name="description" content="{html.escape(desc,quote=True)}"/>
<meta name="robots" content="{'noindex,nofollow' if private else 'index,follow'}"/>
<link rel="canonical" href="{html.escape(url,quote=True)}"/>
<meta property="og:type" content="{'product' if page=='product' else 'website'}"/>
<meta property="og:site_name" content="SPORTHUB"/>
<meta property="og:title" content="{html.escape(title,quote=True)}"/>
<meta property="og:description" content="{html.escape(desc,quote=True)}"/>
<meta property="og:url" content="{html.escape(url,quote=True)}"/>
<meta property="og:image" content="{html.escape(image,quote=True)}"/>
<link rel="icon" href="{prefix}assets/img/favicon.svg" type="image/svg+xml"/>
<link rel="stylesheet" href="{prefix}assets/css/style.css"/>
<script>/* Image fallback works even if the main app JavaScript is unavailable. */
document.addEventListener('error', function (e) {{
 var im=e.target;
 if (im && im.tagName === 'IMG' && im.src.includes('/assets/img/products/') && /\\.webp(?:[?#]|$)/i.test(im.src) && im.dataset.fallbackUsed !== '1') {{
  im.dataset.fallbackUsed='1'; im.src=im.src.replace(/\\.webp(?=[?#]|$)/i,'.svg');
 }}
}},true);
</script>
<title>{html.escape(title)}</title>
</head>
<body data-page="{page}" data-slug="{html.escape(slug,quote=True)}">
<div id="app"><noscript>Website cần JavaScript để hiển thị danh mục và giỏ hàng. Vui lòng bật JavaScript.</noscript></div>
<script src="{prefix}assets/js/site-config.js" defer></script>
<script src="{prefix}assets/js/products.js" defer></script>
<script src="{prefix}assets/js/app.js" defer></script>
</body>
</html>
'''

 (folder/'index.html').write_text(content,encoding='utf8')

# Unknown routes should lead back to the correct V1 homepage.
# Preserve the existing 404 appearance.
(ROOT/'404.html').write_text(
 f'''<!doctype html>
<html lang="vi">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex">
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
<a id="home" href="{html.escape(BASE,quote=True)}">Về trang chủ</a>
</main>
</body>
</html>''',
 encoding='utf8'
)

# Sitemap: do not index account or admin.
public=[
 x for x in routes
 if x[1] not in ['checkout','cart','account','login','admin']
]

xml=(
 '<?xml version="1.0" encoding="UTF-8"?>\n'
 '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
 +''.join(
  '  <url><loc>'+
  html.escape(BASE+(path+'/' if path else ''))+
  '</loc></url>\n'
  for path,*_ in public
 )
 +'</urlset>\n'
)

(ROOT/'sitemap.xml').write_text(xml,encoding='utf8')

# Use the correct GitHub Pages V1 repository prefix.
site_path=urllib.parse.urlsplit(BASE).path

(ROOT/'robots.txt').write_text(
 'User-agent: *\nAllow: /\n'
 +''.join(
  f'Disallow: {site_path}{x}/\n'
  for x in ['quan-tri','tai-khoan','thanh-toan','gio-hang']
 )
 +'Sitemap: '+BASE+'sitemap.xml\n',
 encoding='utf8'
)

print(
 f'Generated {len(routes)} HTML pages, '
 f'{len(public)} sitemap URLs for {BASE}'
)

# Include static HTML snapshots in routes for document previews / JS disabled.
import subprocess

subprocess.run(
 ['node',str(ROOT/'scripts/prerender.mjs')],
 check=True
)

subprocess.run(
 [
  sys.executable,
  str(ROOT/'scripts/seo-enhance.py'),
  '--base',
  BASE
 ],
 check=True
)
