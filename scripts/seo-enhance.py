#!/usr/bin/env python3
"""Enhance SPORTHUB static routes with consistent metadata and JSON-LD.

Run after build-pages.py and prerender.mjs. Safe for GitHub Pages subpaths.
"""
from pathlib import Path
from urllib.parse import urlsplit
import argparse
import html
import json
import re

parser = argparse.ArgumentParser()
parser.add_argument(
    '--base',
    default='https://tranthiquynhnhu0901-hue.github.io/the-thao-song-khoe/'
)
args = parser.parse_args()

parts = urlsplit(args.base)

if (
    parts.scheme not in ('http', 'https')
    or not parts.netloc
    or parts.query
    or parts.fragment
):
    parser.error(
        '--base must be an absolute HTTP(S) URL '
        'without a query or fragment'
    )

BASE = args.base.rstrip('/') + '/'
ROOT = Path(__file__).resolve().parent.parent

PRODUCTS = json.loads(
    (ROOT / 'functions/products.json').read_text(encoding='utf-8')
)

PRODUCT_BY_SLUG = {
    p['slug']: p
    for p in PRODUCTS
}

CATEGORY_NAMES = {
    p['category']: p['categoryName']
    for p in PRODUCTS
}

ARTICLE_DATES = {
    'bat-dau-chay-bo-dung-cach': '2026-10-08',
    'sap-xep-goc-tap-gym-tai-nha': '2026-10-05',
    'lam-quen-voi-pickleball': '2026-10-02',
}

ARTICLE_IMAGES = {
    'bat-dau-chay-bo-dung-cach':
        'https://images.pexels.com/photos/13953013/'
        'pexels-photo-13953013.jpeg?auto=compress&cs=tinysrgb&w=1200',

    'sap-xep-goc-tap-gym-tai-nha':
        'https://images.pexels.com/photos/8033017/'
        'pexels-photo-8033017.jpeg?auto=compress&cs=tinysrgb&w=1200',

    'lam-quen-voi-pickleball':
        'https://images.pexels.com/photos/30864598/'
        'pexels-photo-30864598.jpeg?auto=compress&cs=tinysrgb&w=1200',
}

PRIVATE_PAGES = {
    'checkout',
    'cart',
    'account',
    'login',
    'admin',
}

SKIP_DIRS = {
    '.git',
    '.github',
    'node_modules',
    'functions',
    'scripts',
    'assets',
    '.venv',
    'venv',
}

START = '<!-- SPORTHUB SEO ENHANCE START -->'
END = '<!-- SPORTHUB SEO ENHANCE END -->'

META_TAG = re.compile(
    r'<meta\b[^>]*>',
    re.I
)

LINK_TAG = re.compile(
    r'<link\b[^>]*>',
    re.I
)

JSONLD_TAG = re.compile(
    r'<script\b[^>]*\btype\s*=\s*["\']application/ld\+json'
    r'["\'][^>]*>[\s\S]*?</script\s*>',
    re.I
)


# ============================================================
# UTILITIES
# ============================================================

def safe_json(value):
    return (
        json.dumps(
            value,
            ensure_ascii=False,
            separators=(',', ':')
        )
        .replace('<', '\\u003c')
        .replace('>', '\\u003e')
        .replace('&', '\\u0026')
    )


def page_url(path):
    path = path.strip('/')
    return BASE + (path + '/' if path else '')


def attr(tag, name):
    match = re.search(
        r'\b' + re.escape(name) + r'\s*=\s*(["\'])(.*?)\1',
        tag,
        re.I | re.S
    )

    return html.unescape(match.group(2)) if match else None


def head_meta(doc, kind, name):
    for match in META_TAG.finditer(doc):
        if (
            attr(match.group(), kind) or ''
        ).lower() == name.lower():
            return attr(match.group(), 'content') or ''

    return ''


def upsert_meta(doc, kind, name, value):
    matches = [
        m
        for m in META_TAG.finditer(doc)
        if (
            attr(m.group(), kind) or ''
        ).lower() == name.lower()
    ]

    replacement = (
        f'<meta {kind}="{html.escape(name, quote=True)}" '
        f'content="{html.escape(value, quote=True)}">'
        if value is not None
        else ''
    )

    if matches:
        # Xóa thẻ trùng, giữ lại một thẻ duy nhất.
        for match in reversed(matches[1:]):
            doc = (
                doc[:match.start()]
                + doc[match.end():]
            )

        first = matches[0]

        doc = (
            doc[:first.start()]
            + replacement
            + doc[first.end():]
        )

    elif value is not None:
        doc = doc.replace(
            '</head>',
            replacement + '\n</head>',
            1
        )

    return doc


def upsert_canonical(doc, url):
    matches = [
        m
        for m in LINK_TAG.finditer(doc)
        if 'canonical' in (
            attr(m.group(), 'rel') or ''
        ).lower().split()
    ]

    tag = (
        '<link rel="canonical" '
        f'href="{html.escape(url, quote=True)}">'
    )

    if matches:
        for match in reversed(matches[1:]):
            doc = (
                doc[:match.start()]
                + doc[match.end():]
            )

        first = matches[0]

        doc = (
            doc[:first.start()]
            + tag
            + doc[first.end():]
        )

    else:
        doc = doc.replace(
            '</head>',
            tag + '\n</head>',
            1
        )

    return doc


# ============================================================
# IMAGE PATHS
# ============================================================

def asset_url(raw):
    raw = str(raw or '').strip()

    if raw.startswith('https://'):
        return raw

    # Tương thích dữ liệu cũ trong functions/products.json.
    if raw.startswith('assets/'):
        raw = raw[len('assets/'):]

    raw = raw.lstrip('/')

    if not raw:
        return None

    candidate = (ROOT / raw).resolve()

    # Chỉ cho phép ảnh nằm trong repository.
    if (
        not candidate.is_relative_to(ROOT)
        or not candidate.is_file()
    ):
        return None

    return BASE + raw


def og_image(page, slug):
    if page == 'article' and slug in ARTICLE_IMAGES:
        return ARTICLE_IMAGES[slug]

    if (
        page == 'product'
        and slug in PRODUCT_BY_SLUG
    ):
        product = PRODUCT_BY_SLUG[slug]

        for candidate in (
            product.get('image'),
            product.get('fallbackImage')
        ):
            url = asset_url(candidate)

            if url:
                return url

    # Ưu tiên ảnh chia sẻ; chỉ dùng ảnh tồn tại.
    for candidate in (
        'img/social-share.png',
        'img/editorial/hero.svg',
        'img/favicon.svg'
    ):
        url = asset_url(candidate)

        if url:
            return url

    return None


# ============================================================
# STRUCTURED DATA
# ============================================================

def ordered_products(items):
    # Trùng thứ tự mặc định: sản phẩm mới lên trước.
    return sorted(
        items,
        key=lambda p: bool(p.get('new')),
        reverse=True
    )


def item_list(url, items):
    return {
        '@type': 'ItemList',
        '@id': url + '#items',
        'numberOfItems': len(items),
        'itemListElement': [
            {
                '@type': 'ListItem',
                'position': i,
                'url': page_url(
                    'san-pham/' + product['slug']
                )
            }
            for i, product in enumerate(
                ordered_products(items),
                1
            )
        ],
    }


def breadcrumb(items):
    return {
        '@type': 'BreadcrumbList',
        'itemListElement': [
            {
                '@type': 'ListItem',
                'position': i,
                'name': name,
                'item': page_url(path)
            }
            for i, (name, path) in enumerate(items, 1)
        ]
    }


def schema(page, slug, path, title, description, image):
    url = page_url(path)

    organization = {
        '@type': 'Organization',
        '@id': BASE + '#organization',
        'name': 'SPORTHUB',
        'url': BASE,
        'description':
            'Trang giới thiệu thời trang, dụng cụ '
            'và phụ kiện thể thao SPORTHUB.',
    }

    logo = asset_url('img/favicon.svg')

    if logo:
        organization['logo'] = logo

    website = {
        '@type': 'WebSite',
        '@id': BASE + '#website',
        'name': 'SPORTHUB',
        'url': BASE,
        'inLanguage': 'vi-VN',
        'publisher': {
            '@id': BASE + '#organization'
        },
    }

    kind = (
        'CollectionPage'
        if page in ('shop', 'category')
        else 'WebPage'
    )

    webpage = {
        '@type': kind,
        '@id': url + '#webpage',
        'name': title,
        'description': description,
        'url': url,
        'inLanguage': 'vi-VN',
        'isPartOf': {
            '@id': BASE + '#website'
        },
    }

    graph = [
        organization,
        website,
        webpage
    ]

    # Trang tất cả sản phẩm và trang danh mục.
    if page in ('shop', 'category'):
        items = (
            PRODUCTS
            if page == 'shop'
            else [
                p
                for p in PRODUCTS
                if p.get('category') == slug
            ]
        )

        webpage['mainEntity'] = item_list(
            url,
            items
        )

    # Trang chi tiết sản phẩm.
    if (
        page == 'product'
        and slug in PRODUCT_BY_SLUG
    ):
        product_data = PRODUCT_BY_SLUG[slug]

        product = {
            '@type': 'Product',
            '@id': url + '#product',
            'name': product_data['name'],
            'sku': product_data['id'],
            'description': (
                product_data.get('description')
                or product_data.get('short')
                or ''
            ),
            'category': (
                product_data.get('categoryName')
                or CATEGORY_NAMES.get(
                    product_data.get('category'),
                    ''
                )
            ),
            'url': url,
        }

        if image:
            product['image'] = [image]

        # Không khai báo Offer/AggregateRating giả:
        # giá và tồn kho hiện đang là dữ liệu mẫu.

        graph.append(product)

        webpage['mainEntity'] = {
            '@id': product['@id']
        }

    # Trang bài viết.
    if page == 'article':
        article = {
            '@type': 'Article',
            '@id': url + '#article',
            'headline': title.rsplit(
                ' | SPORTHUB',
                1
            )[0],
            'description': description,
            'mainEntityOfPage': {
                '@id': webpage['@id']
            },
            'author': {
                '@id': organization['@id']
            },
            'publisher': {
                '@id': organization['@id']
            },
            'inLanguage': 'vi-VN',
        }

        if image:
            article['image'] = [image]

        if slug in ARTICLE_DATES:
            article['datePublished'] = (
                ARTICLE_DATES[slug]
            )

        graph.append(article)

        webpage['mainEntity'] = {
            '@id': article['@id']
        }

    # Breadcrumb theo giao diện thực tế.
    if page not in ('home', *PRIVATE_PAGES):
        crumbs = [('Trang chủ', '')]

        if (
            page == 'product'
            and slug in PRODUCT_BY_SLUG
        ):
            product_data = PRODUCT_BY_SLUG[slug]

            crumbs += [
                ('Cửa hàng', 'san-pham'),
                (
                    CATEGORY_NAMES.get(
                        product_data['category'],
                        product_data['category']
                    ),
                    'danh-muc/' + product_data['category']
                ),
                (product_data['name'], path)
            ]

        elif page == 'category':
            crumbs.append((
                CATEGORY_NAMES.get(slug, slug),
                path
            ))

        elif page == 'article':
            crumbs += [
                (
                    'Kiến thức thể thao',
                    'bai-viet'
                ),
                (
                    title.rsplit(' | SPORTHUB', 1)[0],
                    path
                )
            ]

        else:
            labels = {
                'shop': 'Tất cả sản phẩm',
                'about': 'Giới thiệu',
                'contact': 'Liên hệ',
                'blog': 'Kiến thức thể thao',
                'policy': 'Chính sách mua hàng',
                'privacy': 'Bảo mật & điều khoản',
            }

            crumbs.append((
                labels.get(
                    page,
                    title.rsplit(' | SPORTHUB', 1)[0]
                ),
                path
            ))

        graph.append(breadcrumb(crumbs))

    return {
        '@context': 'https://schema.org',
        '@graph': graph
    }


# ============================================================
# REMOVE OLD JSON-LD GENERATED BY PREVIOUS SEO SCRIPT
# ============================================================

def remove_legacy_jsonld(doc, url):
    def rewrite(match):
        body = match.group()

        source = re.search(
            r'>([\s\S]*?)</script\s*>$',
            body,
            re.I
        )

        try:
            data = (
                json.loads(source.group(1))
                if source
                else None
            )
        except (ValueError, AttributeError):
            return body

        if (
            not isinstance(data, dict)
            or not isinstance(
                data.get('@graph'),
                list
            )
        ):
            return body

        ids = {
            node.get('@id')
            for node in data['@graph']
            if isinstance(node, dict)
        }

        if (
            url + '#webpage' in ids
            or (
                url == BASE
                and BASE + '#website' in ids
            )
        ):
            return ''

        return body

    return JSONLD_TAG.sub(rewrite, doc)


# ============================================================
# ENHANCE ROUTES
# ============================================================

count = 0

for filename in sorted(ROOT.rglob('index.html')):
    relative_file = filename.relative_to(ROOT)

    if any(
        part in SKIP_DIRS
        for part in relative_file.parts
    ):
        continue

    doc = filename.read_text(
        encoding='utf-8'
    )

    body = re.search(
        r'<body\b[^>]*\bdata-page="([^"]+)"'
        r'[^>]*\bdata-slug="([^"]*)"',
        doc,
        re.I
    )

    if not body:
        continue

    page, slug = body.groups()

    path = filename.parent.relative_to(ROOT).as_posix()

    if path == '.':
        path = ''

    url = page_url(path)

    title_match = re.search(
        r'<title\b[^>]*>([\s\S]*?)</title>',
        doc,
        re.I
    )

    title = (
        html.unescape(
            title_match.group(1)
        ).strip()
        if title_match
        else 'SPORTHUB'
    )

    description = head_meta(
        doc,
        'name',
        'description'
    )

    image = og_image(
        page,
        slug
    )

    # Xóa khối SEO đã tạo ở lần chạy trước.
    doc = re.sub(
        re.escape(START)
        + r'[\s\S]*?'
        + re.escape(END)
        + r'\s*',
        '',
        doc
    )

    doc = remove_legacy_jsonld(
        doc,
        url
    )

    # Canonical luôn dùng URL thư mục.
    doc = upsert_canonical(
        doc,
        url
    )

    # Open Graph.
    for name, value in (
        (
            'og:type',
            'product'
            if page == 'product'
            else 'article'
            if page == 'article'
            else 'website'
        ),
        ('og:site_name', 'SPORTHUB'),
        ('og:title', title),
        ('og:description', description),
        ('og:url', url),
        ('og:image', image),
        ('og:locale', 'vi_VN'),
    ):
        doc = upsert_meta(
            doc,
            'property',
            name,
            value
        )

    # Metadata cơ bản và Twitter.
    for name, value in (
        ('author', 'SPORTHUB'),
        (
            'twitter:card',
            'summary_large_image'
            if image
            else 'summary'
        ),
        ('twitter:image', image),
    ):
        doc = upsert_meta(
            doc,
            'name',
            name,
            value
        )

    if (
        page == 'article'
        and slug in ARTICLE_DATES
    ):
        doc = upsert_meta(
            doc,
            'property',
            'article:published_time',
            ARTICLE_DATES[slug]
        )

    # Tránh thêm trùng preconnect.
    doc = re.sub(
        r'<link\b'
        r'(?=[^>]*\brel\s*=\s*["\']preconnect["\'])'
        r'(?=[^>]*\bhref\s*=\s*'
        r'["\']https://images\.pexels\.com["\'])'
        r'[^>]*>\s*',
        '',
        doc,
        flags=re.I
    )

    extras = [START]

    if page in (
        'home',
        'shop',
        'category',
        'blog',
        'article'
    ):
        extras.append(
            '<link rel="preconnect" '
            'href="https://images.pexels.com" crossorigin>'
        )

    # Không cần thêm Schema cho trang riêng tư.
    if page not in PRIVATE_PAGES:
        extras.append(
            '<script id="sporthub-seo-jsonld" '
            'type="application/ld+json">'
            + safe_json(
                schema(
                    page,
                    slug,
                    path,
                    title,
                    description,
                    image
                )
            )
            + '</script>'
        )

    extras.append(END)

    if '</head>' not in doc:
        raise RuntimeError(
            f'Missing </head> in {filename}'
        )

    doc = doc.replace(
        '</head>',
        '\n'.join(extras) + '\n</head>',
        1
    )

    # Chỉ yêu cầu CSS bên ngoài.
    # Không yêu cầu khối CSS backup cũ.
    if not re.search(
        r'<link\b[^>]*href=["\']'
        r'(?:\.\./)*css/style\.css["\']',
        doc,
        re.I
    ):
        raise RuntimeError(
            f'Missing css/style.css link: {filename}'
        )

    filename.write_text(
        doc,
        encoding='utf-8'
    )

    count += 1


print(
    f'SEO enhanced: {count} pages; base: {BASE}'
)