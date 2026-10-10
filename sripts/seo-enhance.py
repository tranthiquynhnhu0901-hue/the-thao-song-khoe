#!/usr/bin/env python3
"""Enhance static route pages with consistent on-page metadata and JSON-LD.
Safe for GitHub Pages repository subpaths; no private pages in sitemap.
"""
from pathlib import Path
from datetime import date
import argparse,html,json,re
P=argparse.ArgumentParser()
P.add_argument('--base',default='https://tranthiquynhnhu0901-hue.github.io/the-thao-song-khoe/')
A=P.parse_args()
BASE=A.base.rstrip('/')+'/'
R=Path(__file__).resolve().parent.parent
products=json.loads((R/'functions/products.json').read_text('utf-8'))
product_by_slug={p['slug']:p for p in products}
cat_title={'thoi-trang-the-thao':'Thoi trang the thao','giay-the-thao':'Giay the thao','gym-fitness':'Gym & Fitness','pickleball':'Pickleball','cau-long':'Cau long','yoga-pilates':'Yoga & Pilates','phu-kien':'Phu kien the thao','phuc-hoi':'Cham soc & phuc hoi'}
cat_names={p['category']:p['categoryName'] for p in products}
article_dates={'bat-dau-chay-bo-dung-cach':'2026-10-08','sap-xep-goc-tap-gym-tai-nha':'2026-10-05','lam-quen-voi-pickleball':'2026-10-02'}
org={'@type':'Organization','@id':BASE+'#organization','name':'SPORTHUB','url':BASE,'logo':BASE+'assets/img/favicon.svg','description':'Cua hang thoi trang va dung cu the thao SPORTHUB.'}
def safe_json(data):
 return json.dumps(data,ensure_ascii=False,separators=(',',':')).replace('<','\\u003c').replace('>','\\u003e').replace('&','\\u0026')
def loc(path):return BASE+(path.strip('/')+'/' if path.strip('/') else '')
def breadcrumb(items):
 return {'@type':'BreadcrumbList','itemListElement':[{'@type':'ListItem','position':i+1,'name':name,'item':loc(path)} for i,(name,path) in enumerate(items)]}
count=0
for f in sorted(R.rglob('index.html')):
 if 'functions' in f.parts or 'node_modules' in f.parts:continue
 doc=f.read_text('utf-8')
 m=re.search(r'<body data-page="([^"]+)" data-slug="([^"]*)"',doc)
 if not m:continue
 page,slug=m.groups()
 path=f.parent.relative_to(R).as_posix()
 if path=='.':path=''
 url=loc(path)
 title_match=re.search(r'<title>(.*?)</title>',doc,re.S)
 title=html.unescape(title_match.group(1)) if title_match else 'SPORTHUB'
 desc_match=re.search(r'<meta name="description" content="([^"]+)"',doc)
 desc=html.unescape(desc_match.group(1)) if desc_match else ''
 image=BASE+'assets/img/social-share.png'
 # Product OG image must resolve now; use WebP when uploaded, otherwise SVG.
 if page=='product' and slug in product_by_slug:
  prod=product_by_slug[slug]
  image=BASE+(prod['image'] if (R/prod['image']).is_file() else prod['fallbackImage'])
 if page=='article':
  covers={'bat-dau-chay-bo-dung-cach':'https://images.pexels.com/photos/13953013/pexels-photo-13953013.jpeg?auto=compress&cs=tinysrgb&w=1200','sap-xep-goc-tap-gym-tai-nha':'https://images.pexels.com/photos/8033017/pexels-photo-8033017.jpeg?auto=compress&cs=tinysrgb&w=1200','lam-quen-voi-pickleball':'https://images.pexels.com/photos/30864598/pexels-photo-30864598.jpeg?auto=compress&cs=tinysrgb&w=1200'}
  image=covers.get(slug,image)
 doc=re.sub(r'(<meta property="og:image" content=")[^"]+("/>)',lambda a:a.group(1)+html.escape(image,quote=True)+a.group(2),doc)
 graph=[]
 if page=='home':
  graph.append(org)
  graph.append({'@type':'WebSite','@id':BASE+'#website','name':'SPORTHUB','url':BASE,'inLanguage':'vi-VN','publisher':{'@id':BASE+'#organization'}})
 else:
  graph.append({'@type':'WebPage','@id':url+'#webpage','name':title,'description':desc,'url':url,'inLanguage':'vi-VN','isPartOf':{'@id':BASE+'#website'}})
 if page=='shop':
  graph.append({'@type':'CollectionPage','name':'San pham the thao SPORTHUB','url':url,'mainEntity':{'@type':'ItemList','numberOfItems':len(products),'itemListElement':[{'@type':'ListItem','position':i+1,'url':loc('san-pham/'+p['slug'])} for i,p in enumerate(products)]}})
 if page=='category':
  items=[p for p in products if p['category']==slug]
  graph.append({'@type':'CollectionPage','name':cat_names.get(slug,slug),'url':url,'mainEntity':{'@type':'ItemList','numberOfItems':len(items),'itemListElement':[{'@type':'ListItem','position':i+1,'url':loc('san-pham/'+p['slug'])} for i,p in enumerate(items)]}})
 if page=='product' and slug in product_by_slug:
  p=product_by_slug[slug]
  graph.append({'@type':'Product','@id':url+'#product','name':p['name'],'sku':p['id'],'description':p.get('description') or p.get('short'),'image':[image],'category':p['categoryName'],'url':url})
  # No Offer markup: current catalog prices and inventory are demonstration data.
 if page=='article':
  graph.append({'@type':'Article','headline':title.split(' | ')[0],'description':desc,'image':[image],'mainEntityOfPage':url,'datePublished':article_dates.get(slug,'2026-10-10'),'author':{'@id':BASE+'#organization'},'publisher':{'@id':BASE+'#organization'},'inLanguage':'vi-VN'})
 if page not in ('home','login','account','admin','cart','checkout'):
  bc=[('Trang chủ','')]
  if page=='product':bc += [('Sản phẩm','san-pham'),(title.replace(' | SPORTHUB',''),path)]
  elif page=='article':bc += [('Kiến thức thể thao','bai-viet'),(title.replace(' | SPORTHUB',''),path)]
  elif page=='category':bc += [('Sản phẩm','san-pham'),(cat_names.get(slug,slug),path)]
  else:bc += [(title.split(' | ')[0],path)]
  graph.append(breadcrumb(bc))
 extras='''<meta property="og:locale" content="vi_VN"/>
<meta name="twitter:card" content="summary_large_image"/>
<meta name="author" content="SPORTHUB"/>
<link rel="preconnect" href="https://images.pexels.com" crossorigin/>
'''
 if page=='article':extras += '<meta property="article:published_time" content="'+article_dates.get(slug,'2026-10-10')+'"/>\n'
 extras += '<script type="application/ld+json">'+safe_json({'@context':'https://schema.org','@graph':graph})+'</script>\n'
 doc=doc.replace('</head>',extras+'</head>',1)
 if 'assets/css/style.css' not in doc or '/* CSS backup embedded on every route. */' not in doc:
  raise RuntimeError('CSS link or inline backup missing: '+str(f))
 f.write_text(doc,'utf-8')
 count += 1
print('SEO enhanced:',count,'pages; base:',BASE)
