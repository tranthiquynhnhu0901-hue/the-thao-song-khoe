/* SPORTHUB - offline smoke tests. Read-only: never build or overwrite pages. */
import { readFileSync, existsSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const BASE = 'https://example.github.io/the-thao-song-khoe/';
const PUBLIC_BASE = 'https://tranthiquynhnhu0901-hue.github.io/the-thao-song-khoe/';
const errors = [];
let assertions = 0;

function check(ok, message) {
  assertions++;
  if (!ok) errors.push(message);
}
function count(text, fragment) {
  return text.split(fragment).length - 1;
}
function read(path) {
  return readFileSync(join(ROOT, path), 'utf8');
}
function normalize(path) {
  return String(path || '').replace(/^assets\//i, '');
}

const expectedPhotos = {
  SH001:'ao-thun-chay-bo-aero.webp',
  SH002:'ao-bong-ro-court-move.webp',
  SH003:'quan-short-tap-luyen-sprint.webp',
  SH004:'ao-polo-the-thao-active.webp',
  SH005:'ao-khoac-gio-tempo.webp',
  SH006:'quan-legging-flex.webp',
  SH007:'ao-the-thao-nu-motion.webp',
  SH008:'giay-chay-bo-roadflow.webp',
  SH009:'giay-tap-gym-groundfit.webp',
  SH010:'giay-pickleball-court-one.webp',
  SH011:'giay-cau-long-swiftstep.webp',
  SH012:'giay-i-bo-everyday.webp',
  SH013:'giay-lifestyle-street-pace.webp',
  SH014:'bo-ta-tay-neoprene.webp',
  SH015:'ta-am-kettlebell-core.webp',
  SH016:'bo-day-khang-luc-3-muc.webp',
  SH017:'con-lan-tap-bung-ab-wheel.webp',
  SH018:'day-nhay-toc-o-pulse.webp',
  SH019:'banh-ta-boc-cao-su.webp',
  SH020:'vot-pickleball-nova.webp',
  SH021:'vot-pickleball-control-x.webp',
  SH022:'bo-bong-pickleball-6-qua.webp',
  SH023:'tui-ung-vot-pickleball.webp',
  SH024:'bang-quan-can-vot.webp',
  SH025:'vot-cau-long-airspeed.webp',
  SH026:'ong-cau-long-tap-luyen.webp',
  SH027:'bo-day-cuoc-cau-long.webp',
  SH028:'tui-ung-vot-cau-long.webp',
  SH029:'tham-yoga-harmony.webp',
  SH030:'bo-gach-yoga-balance.webp',
  SH031:'vong-tap-pilates-circle.webp',
  SH032:'day-keo-gian-yoga.webp',
  SH033:'binh-nuoc-the-thao-hydro.webp',
  SH034:'tui-du-lich-the-thao-gobag.webp',
  SH035:'vo-the-thao-performance.webp',
  SH036:'bang-o-tham-hut-active.webp',
  SH037:'ai-chay-bo-running-belt.webp',
  SH038:'ong-lan-co-foam-roller.webp',
  SH039:'may-massage-cam-tay-compact.webp',
  SH040:'bong-massage-iem-co.webp'
};

const categorySlugs = [
  'thoi-trang-the-thao', 'giay-the-thao', 'gym-fitness',
  'pickleball', 'cau-long', 'yoga-pilates', 'phu-kien', 'phuc-hoi'
];
const articleSlugs = [
  'bat-dau-chay-bo-dung-cach',
  'sap-xep-goc-tap-gym-tai-nha',
  'lam-quen-voi-pickleball'
];
const coreRoutes = [
  ['', 'home', ''],
  ['san-pham', 'shop', ''],
  ['gio-hang', 'cart', ''],
  ['thanh-toan', 'checkout', ''],
  ['gioi-thieu', 'about', ''],
  ['lien-he', 'contact', ''],
  ['bai-viet', 'blog', ''],
  ['chinh-sach-mua-hang', 'policy', ''],
  ['bao-mat', 'privacy', ''],
  ['dang-nhap', 'login', ''],
  ['tai-khoan', 'account', ''],
  ['quan-tri', 'admin', '']
];
const privatePages = new Set(['cart','checkout','login','account','admin']);

// Check prerequisites before trying to evaluate any JavaScript.
for (const path of [
  'js/app.js', 'js/products.js', 'css/style.css',
  'functions/products.json', 'index.html', 'sitemap.xml', 'robots.txt'
]) {
  check(existsSync(join(ROOT,path)), `Thiếu tệp: ${path}`);
}
if (errors.length) {
  console.error('❌ Thiếu tệp cần thiết trước khi smoke test:\n'+errors.join('\n'));
  process.exit(1);
}

let rawProducts;
let appScript;
let catalogScript;
try {
  rawProducts = JSON.parse(read('functions/products.json'));
  appScript = new vm.Script(read('js/app.js'), {filename:'js/app.js'});
  catalogScript = new vm.Script(read('js/products.js'), {filename:'js/products.js'});
} catch (err) {
  console.error('❌ Lỗi đọc dữ liệu hoặc cú pháp:',err.message);
  process.exit(1);
}
function element() {
  const attributes = new Map();
  const classes = new Set();
  return {
    id:'', value:'', checked:false, textContent:'', innerHTML:'',
    classList:{
      contains:key=>classes.has(key),
      add:key=>classes.add(key),
      remove:key=>classes.delete(key),
      toggle(key,state) {
        if(state ?? !classes.has(key)) classes.add(key);
        else classes.delete(key);
      }
    },
    setAttribute:(key,value)=>attributes.set(key,String(value)),
    getAttribute:key=>attributes.get(key) ?? null,
    append(){}, remove(){}, focus(){}, scrollIntoView(){}
  };
}

function preview(page,slug='',query='',initialCart=[],formState={}) {
  let markup = '';
  const saved = {};
  if(initialCart.length) saved['sporthub-cart'] = JSON.stringify(initialCart);
  const listeners = new Map();
  const cachedImages = [];
  const elements = new Map();
  const url = new URL(query, BASE + (
    page==='home' ? '' :
    page==='category' ? `danh-muc/${slug}/` :
    page==='product' ? `san-pham/${slug}/` :
    page==='article' ? `bai-viet/${slug}/` :
    {
      shop:'san-pham/', cart:'gio-hang/', checkout:'thanh-toan/',
      about:'gioi-thieu/', contact:'lien-he/', blog:'bai-viet/',
      policy:'chinh-sach-mua-hang/', privacy:'bao-mat/',
      login:'dang-nhap/', account:'tai-khoan/', admin:'quan-tri/'
    }[page] || ''
  ));
  const location = {
    href:url.href, origin:url.origin, pathname:url.pathname,
    protocol:url.protocol, search:url.search, hash:url.hash,
    replace(value){ this.href = value; }
  };
  const app = {
    set innerHTML(value){ markup = value; },
    get innerHTML(){ return markup; }
  };
  const addListener = (event,callback) => {
    listeners.set(event,[...(listeners.get(event)||[]),callback]);
  };
  const document = {
    currentScript:{src:new URL('js/app.js',BASE).href},
    body:{dataset:{page,slug},append(){}},
    head:{append(){}},
    getElementById(id) {
      if(id==='app') return app;
      if(Object.prototype.hasOwnProperty.call(formState,id)) {
        if(!elements.has(id)) elements.set(id,{
          ...element(),id, value:formState[id],
          checked:Boolean(formState[id])
        });
        return elements.get(id);
      }
      return elements.get(id) ?? null;
    },
    querySelector(){return null;},
    querySelectorAll(selector){
      return selector==='img.sh-photo-real' ? cachedImages : [];
    },
    addEventListener:addListener,
    createElement:element
  };
  class MockFormData {
    constructor(form){this.fields=form.fields||{};}
    get(name){return this.fields[name] ?? null;}
  }
  const context = {
    window:{SPORT_CONFIG:{},addEventListener:addListener},
    document, location,
    localStorage:{
      getItem:key=>saved[key] ?? null,
      setItem:(key,value)=>{saved[key]=value;}
    },
    URL,URLSearchParams,Intl,Date,Math,JSON,FormData:MockFormData,
    console,navigator:{},
    setTimeout:()=>1,clearTimeout(){},
    confirm:()=>true,
    fetch(){throw new Error('Smoke test không được truy cập mạng');}
  };
  vm.createContext(context);
  catalogScript.runInContext(context,{timeout:3000});
  appScript.runInContext(context,{timeout:5000});

  return {
    html:()=>markup,
    location,saved,cachedImages,
    products:context.window.SPORT_PRODUCTS,
    categories:context.window.SPORT_CATEGORIES,
    async emit(type,target) {
      if(!target.dataset) target.dataset={};
      for(const fn of listeners.get(type)||[]) {
        let stopped = false;
        await fn({target,preventDefault(){},stopPropagation(){stopped=true;}});
        if(stopped) break;
      }
    }
  };
}

function imageState() {
  const img = element();
  img.tagName='IMG';
  img.complete=true;
  img.naturalWidth=0;
  img.src=BASE+'img/products/ao-thun-chay-bo-aero.webp';
  img.classList.add('sh-photo-real');
  return img;
}
function button(action, extra={}) {
  return {closest:()=>({dataset:{action,...extra}})};
}
async function main() {
  // Catalog: keep every owner-approved photo filename, even unusual spelling.
  const base=preview('shop');
  const jsProducts=base.products;
  const jsCategories=base.categories;
  check(Array.isArray(rawProducts) && rawProducts.length===40,'JSON phải có đúng 40 sản phẩm');
  check(jsProducts?.length===40,'JavaScript phải có đúng 40 sản phẩm');
  check(jsCategories?.length===8,'JavaScript phải có đúng 8 danh mục');
  check(new Set(rawProducts.map(p=>p.id)).size===40,'Trùng mã sản phẩm');
  check(new Set(rawProducts.map(p=>p.slug)).size===40,'Trùng slug sản phẩm');
  check(new Set(rawProducts.map(p=>p.image)).size===40,'Trùng đường dẫn ảnh');
  check(categorySlugs.every(s=>jsCategories.some(c=>c.slug===s)),'Thiếu một trong 8 danh mục');

  const jsById=new Map(jsProducts.map(p=>[p.id,p]));
  for(const [id,filename] of Object.entries(expectedPhotos)) {
    const p=rawProducts.find(x=>x.id===id);
    const js=jsById.get(id);
    check(Boolean(p),`${id}: thiếu trong functions/products.json`);
    check(Boolean(js),`${id}: thiếu trong js/products.js`);
    if(!p||!js) continue;
    const photo='img/products/'+filename;
    check(normalize(p.image)===photo,`${id}: tên ảnh JSON phải là ${photo}`);
    check(normalize(js.image)===photo,`${id}: tên ảnh JS phải là ${photo}`);
    check(!p.image.includes('\\')&&!js.image.includes('\\'),`${id}: tên ảnh chứa dấu \\ sai`);
    check(js.slug===p.slug,`${id}: slug JS và JSON không khớp`);
    check(js.name===p.name,`${id}: tên JS và JSON không khớp`);
    check(js.category===p.category,`${id}: danh mục JS và JSON không khớp`);
    check(js.price===p.price && js.salePrice===p.salePrice,`${id}: giá JS và JSON không khớp`);
    check(js.stock===p.stock,`${id}: tồn kho JS và JSON không khớp`);
    check(JSON.stringify(js.variants)===JSON.stringify(p.variants),`${id}: biến thể JS và JSON không khớp`);
    check(js.description===p.description,`${id}: mô tả JS và JSON không khớp`);
    check(js.photoNotice===p.photoNotice,`${id}: thông báo ảnh JS và JSON không khớp`);
    check(Boolean(p.description?.trim()) && p.description.length>80,`${id}: mô tả còn thiếu hoặc quá ngắn`);
  }

  // All 63 routes: actual HTML, per-page metadata and offline rendering.
  const routes = [
    ...coreRoutes,
    ...categorySlugs.map(s=>[`danh-muc/${s}`,'category',s]),
    ...rawProducts.map(p=>[`san-pham/${p.slug}`,'product',p.slug]),
    ...articleSlugs.map(s=>[`bai-viet/${s}`,'article',s])
  ];
  check(routes.length===63,`Số tuyến trang phải là 63, hiện ${routes.length}`);
  const seenTitles=new Set();
  const publicURLs=[];
  for(const [path,page,slug] of routes) {
    const routeLabel=path||'/';
    const filename=join(ROOT,path,'index.html');
    if(!existsSync(filename)) {
      check(false,`Thiếu trang ${routeLabel}/index.html`);
      continue;
    }
    const doc=readFileSync(filename,'utf8');
    const head=doc.split(/<\/head\s*>/i)[0];
    const url=BASE+(path?path+'/':'');
    const canonical=PUBLIC_BASE+(path?path+'/':'');
    const canonTags=[...head.matchAll(/<link\b[^>]*\brel=["']canonical["'][^>]*>/gi)];
    const titles=[...head.matchAll(/<title\b[^>]*>([\s\S]*?)<\/title>/gi)];
    const descriptions=[...head.matchAll(/<meta\b[^>]*\bname=["']description["'][^>]*>/gi)];
    check(canonTags.length===1,`${routeLabel}: phải có đúng 1 canonical`);
    if(canonTags.length) {
      check(canonTags[0][0].includes(`href="${canonical}"`),`${routeLabel}: canonical sai URL sạch`);
    }
    check(titles.length===1 && titles[0][1].trim().length>5,`${routeLabel}: title bị thiếu/trùng`);
    if(titles.length){
      const t=titles[0][1].trim();
      check(!seenTitles.has(t),`${routeLabel}: title trùng trang khác (${t})`);
      seenTitles.add(t);
    }
    check(descriptions.length===1 && /content=["'][^"']+["']/i.test(descriptions[0]?.[0]||''),
      `${routeLabel}: meta description thiếu hoặc bị trùng`);
    if(!privatePages.has(page)) {
      check(/content=["'][^"']{60,}["']/i.test(descriptions[0]?.[0]||''),
        `${routeLabel}: mô tả SEO công khai quá ngắn (dưới 60 ký tự)`);
    }
    check(!/href=["'][^"']*\/index\.html(?:[?#"'])/i.test(doc),`${routeLabel}: liên kết công khai còn /index.html`);
    check(doc.includes(`data-page="${page}"`) && doc.includes(`data-slug="${slug}"`),
      `${routeLabel}: data-page/data-slug không khớp`);
    check(/<main(?:\s|>)/i.test(doc),`${routeLabel}: thiếu HTML chính sau prerender`);
    const robots=[...head.matchAll(/<meta\b[^>]*\bname=["']robots["'][^>]*>/gi)];
    check(robots.length===1,`${routeLabel}: phải có đúng 1 robots meta`);
    if(privatePages.has(page)) {
      check(/noindex/i.test(robots[0]?.[0]||''),`${routeLabel}: trang riêng tư cần noindex`);
    } else {
      publicURLs.push(canonical);
      check(!/noindex/i.test(robots[0]?.[0]||''),`${routeLabel}: trang công khai không được noindex`);
      check(/type=["']application\/ld\+json["']/.test(head),`${routeLabel}: thiếu JSON-LD`);
    }
    try {
      const app=preview(page,slug);
      const rendered=app.html();
      check(/<main(?:\s|>)/i.test(rendered),`${routeLabel}: app.js không dựng được <main>`);
      const searchCount=count(rendered,'data-search-form');
      check(searchCount===(page==='home'||page==='shop'?2:0),
        `${routeLabel}: ô tìm kiếm xuất hiện sai (${searchCount})`);
      check(!/href="[^"]*\/index\.html(?:[?#"])/i.test(rendered),
        `${routeLabel}: liên kết app.js chứa index.html`);
      if(page==='product') {
        const p=rawProducts.find(x=>x.slug===slug);
        check(rendered.includes(p.name),`${routeLabel}: thiếu tên sản phẩm`);
        const escapedDescription=p.description.replace(/[&<>"']/g,c=>({
          '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
        }[c]));
        check(rendered.includes(escapedDescription),`${routeLabel}: mô tả không hiển thị đúng`);
        check(rendered.includes('sh-photo-placeholder'),`${routeLabel}: thiếu ô chờ ảnh`);
        check(rendered.includes(normalize(p.image)),`${routeLabel}: sai nguồn ảnh WebP`);
      }
      if(page==='category') {
        const size=rawProducts.filter(p=>p.category===slug).length;
        check(count(rendered,'class="product-card"')===size,
          `${routeLabel}: sai số sản phẩm trong danh mục, cần ${size}`);
      }
    } catch(err) {
      check(false,`${routeLabel}: không dựng được trong VM: ${err.message}`);
    }
  }

  // Sitemap must list 58 indexable routes without private pages.
  const sitemap=read('sitemap.xml');
  check(publicURLs.length===58,`Sitemap dự kiến 58 URL, hiện ${publicURLs.length}`);
  for(const u of publicURLs) check(sitemap.includes(`<loc>${u}</loc>`),`Sitemap thiếu ${u}`);
  for(const [path,page] of coreRoutes.filter(([,type])=>privatePages.has(type))) {
    check(!sitemap.includes(`<loc>${PUBLIC_BASE}${path}/</loc>`),
      `Sitemap không nên chứa trang ${page}`);
  }
  check(read('robots.txt').includes('Sitemap:'),'robots.txt thiếu đường dẫn sitemap');

  // Focused runtime interactions, offline: search, filters, cart, no-image fallback.
  const shop=preview('shop');
  check(count(shop.html(),'class="product-card"')===40,'Cửa hàng cần 40 thẻ sản phẩm');
  check(count(shop.html(),'class="sh-photo-placeholder"')===40,'Cửa hàng cần 40 ô chờ ảnh');
  check(count(shop.html(),'class="sh-photo-real"')===40,'Cửa hàng cần 40 ảnh WebP');
  check(count(preview('shop','','?p=ao-thun-chay-bo-aero').html(),
    'data-search-form')===0,'Trang sản phẩm mở bằng ?p không được có tìm kiếm');
  check(count(preview('shop','','?q=Aero').html(),'class="product-card"')===1,
    'Tìm kiếm Aero phải trả 1 sản phẩm');
  check(count(preview('shop','','?sale=1').html(),'class="product-card"')===
    rawProducts.filter(p=>p.salePrice).length,'Bộ lọc khuyến mãi chưa đúng');
  const filtered=preview('shop','','',[],{
    'filter-q':'','filter-cat':'gym-fitness',
    'filter-sort':'new','filter-max':'','filter-sale':false
  });
  await filtered.emit('change',{id:'filter-cat',value:'gym-fitness'});
  check(count(filtered.html(),'class="product-card"')===
    rawProducts.filter(p=>p.category==='gym-fitness').length,
    'Cửa hàng: bộ lọc danh mục phải lọc sản phẩm tại chỗ');
  const category=preview('category','pickleball','?q=khong-co-san-pham');
  check(count(category.html(),'class="product-card"')===5,
    'Danh mục không được áp dụng tham số tìm kiếm q');
  await category.emit('change',{id:'filter-cat',value:'cau-long'});
  check(category.location.href===BASE+'danh-muc/cau-long/',
    'Đổi danh mục phải điều hướng sang URL danh mục mới');

  const homepage=preview('home');
  await homepage.emit('click',button('add',{id:'SH003'}));
  check(JSON.parse(homepage.saved['sporthub-cart']||'[]').some(x=>x.id==='SH003'),
    'Thêm sản phẩm từ trang chủ không vào giỏ');
  await homepage.emit('submit',{
    matches:selector=>selector==='[data-search-form]',
    fields:{q:'Roadflow'}
  });
  check(homepage.location.href===BASE+'san-pham/?q=Roadflow',
    'Biểu mẫu tìm kiếm phải dẫn đến cửa hàng và giữ từ khóa');

  const cart=preview('cart','','',[{id:'SH001',qty:2,variant:'S'}]);
  check(cart.html().includes('Áo thun chạy bộ Aero') &&
    cart.html().includes('sh-photo-placeholder'), 'Giỏ hàng thiếu nội dung/ô chờ ảnh');
  await cart.emit('click',button('cart-inc',{id:'SH001',variant:'S'}));
  check(JSON.parse(cart.saved['sporthub-cart'])[0].qty===3,'Không tăng được số lượng giỏ');
  await cart.emit('click',button('cart-dec',{id:'SH001',variant:'S'}));
  check(JSON.parse(cart.saved['sporthub-cart'])[0].qty===2,'Không giảm được số lượng giỏ');
  await cart.emit('click',button('cart-remove',{id:'SH001',variant:'S'}));
  check(JSON.parse(cart.saved['sporthub-cart']).length===0,'Không xóa được sản phẩm trong giỏ');

  const detail=preview('product','ao-thun-chay-bo-aero');
  check(count(detail.html(),'class="product-card"')===4,'Chi tiết phải gợi ý 4 sản phẩm liên quan');
  check(count(detail.html(),'class="sh-photo-placeholder"')===5,
    'Chi tiết cần ảnh chính và 4 ô chờ ảnh liên quan');
  await detail.emit('click',button('variant',{value:'M'}));
  await detail.emit('click',button('detail-inc'));
  await detail.emit('click',button('detail-add',{id:'SH001'}));
  const detailCart=JSON.parse(detail.saved['sporthub-cart']||'[]');
  check(detailCart.length===1 && detailCart[0].qty===2 && detailCart[0].variant==='M',
    'Chi tiết: thêm giỏ chưa giữ cỡ và số lượng');
  const broken=imageState();
  await detail.emit('error',broken);
  check(broken.classList.contains('sh-photo-error'),'Ảnh WebP lỗi chưa được ẩn');
  check(broken.src.endsWith('.webp'),'Ảnh WebP lỗi không được tự đổi sang SVG');
  const cached=imageState();
  detail.cachedImages.push(cached);
  await detail.emit('click',button('account-tab',{tab:'orders'}));
  check(cached.classList.contains('sh-photo-error'),'Ảnh lỗi đã cache chưa được xử lý');
  check(preview('checkout','','',[{id:'SH001',qty:1,variant:'S'}])
    .html().includes('sh-photo-placeholder'),'Thanh toán thiếu ô chờ ảnh');
  check(preview('login').html().includes('giao diện tài khoản mẫu'),
    'Trang đăng nhập phải giải thích trạng thái mô phỏng');

  if(errors.length) {
    console.error(`\n❌ SMOKE TEST FAILED: ${errors.length}/${assertions} kiểm tra chưa đạt`);
    errors.forEach((e,i)=>console.error(`${i+1}. ${e}`));
    process.exitCode=1;
  } else {
    console.log(`\n✅ PASS: ${assertions} kiểm tra; 63 trang, 58 URL sitemap, 8 danh mục, 40 sản phẩm.`);
    console.log('Giữ đúng 40 tên WebP; tìm kiếm, bộ lọc, giỏ hàng, ảnh chờ và metadata cơ bản đạt.');
    console.log('Không truy cập mạng, không yêu cầu có ảnh thật và không ghi lại bất kỳ tệp nào.');
  }
}

main().catch(err=>{
  console.error('❌ Smoke test gặp lỗi:',err.stack||err);
  process.exitCode=1;
});
