#!/usr/bin/env python3
"""Enhance SPORTHUB static HTML metadata and JSON-LD after prerender.

Preserve existing page titles, descriptions, content, CSS and public URLs.
Run after build-pages.py and prerender.mjs.
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
    parser.error('--base must be an absolute HTTP(S) URL without a query or fragment')

BASE = args.base.rstrip('/') + '/'
ROOT = Path(__file__).resolve().parent.parent
PRODUCTS = json.loads(
    (ROOT / 'functions/products.json').read_text(encoding='utf-8')
)
PRODUCT_BY_SLUG = {p['slug']: p for p in PRODUCTS}
CATEGORY_NAMES = {p['category']: p['categoryName'] for p in PRODUCTS}

# Retained from the original script; verify dates against the actual articles.
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

PRIVATE_PAGES = {'checkout', 'cart', 'account', 'login', 'admin'}
SKIP_DIRS = {
    '.git', '.github', 'node_modules', 'functions', 'scripts',
    'assets', '.venv', 'venv',
}
START = '<!-- SPORTHUB SEO ENHANCE START -->'
END = '<!-- SPORTHUB SEO ENHANCE END -->'
META_TAG = re.compile(r'<meta\b[^>]*>', re.I)
LINK_TAG = re.compile(r'<link\b[^>]*>', re.I)
SCRIPT_TAG = re.compile(r'<script\b[^>]*>[\s\S]*?</script\s*>', re.I)
HEAD_CLOSE = re.compile(r'</head\s*>', re.I)
BODY_TAG = re.compile(r'<body\b[^>]*>', re.I)
TITLE_TAG = re.compile(r'<title\b[^>]*>([\s\S]*?)</title\s*>', re.I)

# ============================================================
# UTILITIES
# ============================================================
def safe_json(value):
    """Keep JSON-LD valid and prevent embedded HTML closing tags."""
    return (
        json.dumps(value, ensure_ascii=False, separators=(',', ':'))
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
        re.I | re.S,
    )
    return html.unescape(match.group(2)) if match else None


def head_meta(doc, kind, name):
    for match in META_TAG.finditer(doc):
        if (attr(match.group(), kind) or '').lower() == name.lower():
            return attr(match.group(), 'content') or ''
    return ''


def upsert_meta(doc, kind, name, value):
    """Update one matching tag, remove duplicates, or remove if value is None."""
    matches = [
        match for match in META_TAG.finditer(doc)
        if (attr(match.group(), kind) or '').lower() == name.lower()
    ]
    replacement = (
        f'<meta {kind}="{html.escape(name, quote=True)}" '
        f'content="{html.escape(str(value), quote=True)}">'
        if value is not None else ''
    )
    if matches:
        for match in reversed(matches[1:]):
            doc = doc[:match.start()] + doc[match.end():]
        first = matches[0]
        doc = doc[:first.start()] + replacement + doc[first.end():]
    elif value is not None:
        doc = HEAD_CLOSE.sub(lambda m: replacement + '\n' + m.group(), doc, count=1)
    return doc


def upsert_canonical(doc, url):
    matches = [
        match for match in LINK_TAG.finditer(doc)
        if 'canonical' in (attr(match.group(), 'rel') or '').lower().split()
    ]
    tag = f'<link rel="canonical" href="{html.escape(url, quote=True)}">'
    if matches:
        for match in reversed(matches[1:]):
            doc = doc[:match.start()] + doc[match.end():]
        first = matches[0]
        doc = doc[:first.start()] + tag + doc[first.end():]
    else:
        doc = HEAD_CLOSE.sub(lambda m: tag + '\n' + m.group(), doc, count=1)
    return doc


# ============================================================
# IMAGE URLS
# ============================================================
def asset_url(raw):
    raw = str(raw or '').strip()
    if raw.startswith('https://'):
        return raw
    if raw.startswith('http://'):
        return raw
    if raw.startswith('//') or ':' in raw:
        return None
    if raw.startswith('assets/'):
        raw = raw[len('assets/'):]
    raw = raw.lstrip('/')
    if not raw:
        return None
    candidate = (ROOT / raw).resolve()
    if not candidate.is_relative_to(ROOT) or not candidate.is_file():
        return None
    return BASE + raw


def product_photo(slug):
    """Use only the owner's actual WebP filename, never an invented SVG."""
    product = PRODUCT_BY_SLUG.get(slug)
    if not product:
        return None
    image = str(product.get('image') or '').strip()
    if not image.lower().endswith('.webp'):
        return None
    return asset_url(image)


def og_image(page, slug):
    if page == 'article' and slug in ARTICLE_IMAGES:
        return ARTICLE_IMAGES[slug]
    if page == 'product':
        real_photo = product_photo(slug)
        if real_photo:
            return real_photo
    # Generic sharing artwork is fine for Open Graph, but not as a Product photo.
    for candidate in ('img/social-share.png', 'img/social-share.webp', 'img/editorial/hero.svg'):
        url = asset_url(candidate)
        if url:
            return url
    return None
# ============================================================
# STRUCTURED DATA
# ============================================================
def ordered_products(items):
    return sorted(items, key=lambda p: bool(p.get('new')), reverse=True)


def item_list(url, items):
    return {
        '@type': 'ItemList',
        '@id': url + '#items',
        'numberOfItems': len(items),
        'itemListElement': [
            {
                '@type': 'ListItem',
                'position': i,
                'url': page_url('san-pham/' + product['slug']),
            }
            for i, product in enumerate(ordered_products(items), 1)
        ],
    }


def breadcrumb(items):
    return {
        '@type': 'BreadcrumbList',
        'itemListElement': [
            {'@type': 'ListItem', 'position': i, 'name': name, 'item': page_url(path)}
            for i, (name, path) in enumerate(items, 1)
        ],
    }


def schema(page, slug, path, title, description, image):
    url = page_url(path)
    organization = {
        '@type': 'Organization',
        '@id': BASE + '#organization',
        'name': 'SPORTHUB',
        'url': BASE,
        'description': 'Trang giới thiệu thời trang, dụng cụ và phụ kiện thể thao SPORTHUB.',
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
        'publisher': {'@id': BASE + '#organization'},
    }
    webpage = {
        '@type': 'CollectionPage' if page in ('shop', 'category') else 'WebPage',
        '@id': url + '#webpage',
        'name': title,
        'description': description,
        'url': url,
        'inLanguage': 'vi-VN',
        'isPartOf': {'@id': BASE + '#website'},
    }
    graph = [organization, website, webpage]

    if page in ('shop', 'category'):
        items = (
            PRODUCTS if page == 'shop'
            else [p for p in PRODUCTS if p.get('category') == slug]
        )
        webpage['mainEntity'] = item_list(url, items)

    if page == 'product' and slug in PRODUCT_BY_SLUG:
        product_data = PRODUCT_BY_SLUG[slug]
        product = {
            '@type': 'Product',
            '@id': url + '#product',
            'name': product_data['name'],
            'sku': product_data['id'],
            'description': (
                product_data.get('description')
                or product_data.get('short') or ''
            ),
            'category': (
                product_data.get('categoryName')
                or CATEGORY_NAMES.get(product_data.get('category'), '')
            ),
            'url': url,
        }
        # Missing images should show placeholders in the UI; never claim a fake Product image.
        real_photo = product_photo(slug)
        if real_photo:
            product['image'] = [real_photo]
        # No invented offers, availability or review ratings for demo products.
        graph.append(product)
        webpage['mainEntity'] = {'@id': product['@id']}

    if page == 'article':
        article = {
            '@type': 'Article',
            '@id': url + '#article',
            'headline': title.rsplit(' | SPORTHUB', 1)[0],
            'description': description,
            'mainEntityOfPage': {'@id': webpage['@id']},
            'author': {'@id': organization['@id']},
            'publisher': {'@id': organization['@id']},
            'inLanguage': 'vi-VN',
        }
        if image:
            article['image'] = [image]
        if slug in ARTICLE_DATES:
            article['datePublished'] = ARTICLE_DATES[slug]
        graph.append(article)
        webpage['mainEntity'] = {'@id': article['@id']}

    if page not in ('home', *PRIVATE_PAGES):
        crumbs = [('Trang chủ', '')]
        if page == 'product' and slug in PRODUCT_BY_SLUG:
            product_data = PRODUCT_BY_SLUG[slug]
            crumbs += [
                ('Cửa hàng', 'san-pham'),
                (
                    CATEGORY_NAMES.get(product_data['category'], product_data['category']),
                    'danh-muc/' + product_data['category'],
                ),
                (product_data['name'], path),
            ]
        elif page == 'category':
            crumbs.append((CATEGORY_NAMES.get(slug, slug), path))
        elif page == 'article':
            crumbs += [
                ('Kiến thức thể thao', 'bai-viet'),
                (title.rsplit(' | SPORTHUB', 1)[0], path),
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
            crumbs.append((labels.get(page, title.rsplit(' | SPORTHUB', 1)[0]), path))
        graph.append(breadcrumb(crumbs))

    return {'@context': 'https://schema.org', '@graph': graph}
# ============================================================
# REMOVE ONLY GENERATED/LEGACY SPORTHUB JSON-LD
# ============================================================
def remove_legacy_jsonld(doc, url):
    def rewrite(match):
        whole = match.group()
        opening = whole.split('>', 1)[0] + '>'
        if (attr(opening, 'type') or '').lower() != 'application/ld+json':
            return whole
        source = re.search(r'>([\s\S]*?)</script\s*>$', whole, re.I)
        try:
            data = json.loads(source.group(1)) if source else None
        except (ValueError, AttributeError):
            return whole
        if not isinstance(data, dict) or not isinstance(data.get('@graph'), list):
            return whole
        ids = {
            node.get('@id') for node in data['@graph'] if isinstance(node, dict)
        }
        if url + '#webpage' in ids or (url == BASE and BASE + '#website' in ids):
            return ''
        return whole

    return SCRIPT_TAG.sub(rewrite, doc)


def remove_pexels_preconnect(doc):
    def rewrite(match):
        tag = match.group()
        rel = (attr(tag, 'rel') or '').lower().split()
        href = (attr(tag, 'href') or '').rstrip('/')
        return '' if 'preconnect' in rel and href == 'https://images.pexels.com' else tag
    return LINK_TAG.sub(rewrite, doc)


# ============================================================
# ENHANCE ROUTES
# ============================================================
def enhance(doc, page, slug, path, filename):
    if not HEAD_CLOSE.search(doc):
        raise RuntimeError(f'Missing </head> in {filename}')

    # Keep page-specific title and meta description from build-pages.py.
    title_match = TITLE_TAG.search(doc)
    title = html.unescape(title_match.group(1)).strip() if title_match else 'SPORTHUB'
    description = head_meta(doc, 'name', 'description')
    url = page_url(path)
    image = og_image(page, slug)

    # Remove only our previous enhancement block and legacy SPORTHUB schema.
    doc = re.sub(re.escape(START) + r'[\s\S]*?' + re.escape(END) + r'\s*', '', doc)
    doc = remove_legacy_jsonld(doc, url)
    doc = remove_pexels_preconnect(doc)

    # One canonical tag, and no /index.html in its public target.
    doc = upsert_canonical(doc, url)
    if page in PRIVATE_PAGES:
        doc = upsert_meta(doc, 'name', 'robots', 'noindex,follow')

    for name, value in (
        ('og:type', 'product' if page == 'product' else 'article' if page == 'article' else 'website'),
        ('og:site_name', 'SPORTHUB'),
        ('og:title', title),
        ('og:description', description),
        ('og:url', url),
        ('og:image', image),
        ('og:locale', 'vi_VN'),
    ):
        doc = upsert_meta(doc, 'property', name, value)

    for name, value in (
        ('author', 'SPORTHUB'),
        ('twitter:card', 'summary_large_image' if image else 'summary'),
        ('twitter:image', image),
    ):
        doc = upsert_meta(doc, 'name', name, value)

    if page == 'article' and slug in ARTICLE_DATES:
        doc = upsert_meta(doc, 'property', 'article:published_time', ARTICLE_DATES[slug])

    extras = [START]
    # Preconnect only if a Pexels resource is actually used on this page.
    if 'https://images.pexels.com/' in doc or (image or '').startswith('https://images.pexels.com/'):
        extras.append('<link rel="preconnect" href="https://images.pexels.com" crossorigin>')
    if page not in PRIVATE_PAGES:
        extras.append(
            '<script id="sporthub-seo-jsonld" type="application/ld+json">'
            + safe_json(schema(page, slug, path, title, description, image))
            + '</script>'
        )
    extras.append(END)
    doc = HEAD_CLOSE.sub(lambda m: '\n'.join(extras) + '\n' + m.group(), doc, count=1)

    # Fail safely if stylesheet is missing; never overwrite the original HTML.
    if not any(
        (attr(tag.group(), 'href') or '').endswith('css/style.css')
        and 'stylesheet' in (attr(tag.group(), 'rel') or '').lower().split()
        for tag in LINK_TAG.finditer(doc)
    ):
        raise RuntimeError(f'Missing css/style.css link: {filename}')
    return doc


def main():
    prepared = []
    for filename in sorted(ROOT.rglob('index.html')):
        relative_file = filename.relative_to(ROOT)
        if any(part in SKIP_DIRS for part in relative_file.parts):
            continue
        doc = filename.read_text(encoding='utf-8')
        body = BODY_TAG.search(doc)
        if not body:
            continue
        page = attr(body.group(), 'data-page')
        slug = attr(body.group(), 'data-slug') or ''
        if not page:
            continue
        path = filename.parent.relative_to(ROOT).as_posix()
        if path == '.':
            path = ''
        prepared.append((filename, enhance(doc, page, slug, path, filename)))

    if not prepared:
        raise RuntimeError('No SPORTHUB HTML pages found for SEO enhancement.')
    # Calculate all changes before writing any file.
    for filename, result in prepared:
        if filename.read_text(encoding='utf-8') != result:
            filename.write_text(result, encoding='utf-8')
    print(f'SEO enhanced: {len(prepared)} pages; base: {BASE}')


if __name__ == '__main__':
    main()
    