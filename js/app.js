/* SPORTHUB - static-first storefront, optional secure Firebase backend. */
(() => {
'use strict';

const script = document.currentScript;
const ROOT = new URL('../', script.src).href;
const FILE = location.protocol === 'file:';

// GitHub Pages serves index.html internally; public links use clean URLs.
if (!FILE && /\/index\.html$/i.test(location.pathname)) {
  location.replace(
    location.pathname.replace(/index\.html$/i, '') +
    location.search +
    location.hash
  );
  return;
}

const page = document.body.dataset.page || 'home';
const slug = document.body.dataset.slug || '';
const cfg = window.SPORT_CONFIG || {};

let products = [...(window.SPORT_PRODUCTS || [])];
const categories = window.SPORT_CATEGORIES || [];

const defaults = {
  brand:'SPORTHUB',
  headline:'Chuyển động mạnh mẽ. Sống trọn đam mê.',
  promo:'Nâng tầm cuộc chơi cùng bộ sưu tập thể thao năng động.',
  contactEmail:'',
  phone:'',
  address:'',
  shippingFee:30000,
  freeShippingFrom:1000000,
  bankName:'',
  bankId:'',
  bankAccount:'',
  bankHolder:'',
  heroImage:'',
  saleImage:''
};

let settings = {...defaults};
let cart = safeParse('sporthub-cart', []);
let favorites = safeParse('sporthub-wish', []);

let fb = null,
    user = null,
    isAdmin = false,
    authReady = false,
    adminTab = 'dashboard',
    accountTab = 'orders';

let adminProducts = [],
    adminOrders = [],
    adminCustomers = [],
    adminMedia = [],
    adminPosts = [];

let demoAdmin =
  new URLSearchParams(location.search).get('demo') === '1';

let shopFilters = {
  category:new URLSearchParams(location.search).get('danh-muc') || '',
  sort:'new',
  max:'',
  q:new URLSearchParams(location.search).get('q') || '',
  sale:new URLSearchParams(location.search).get('sale') === '1'
};

let detailQty = 1,
    detailVariant = '';

const posts = [
  {
    slug:'bat-dau-chay-bo-dung-cach',
    title:'Bắt đầu chạy bộ: 5 điều nên biết',
    category:'Chạy bộ',
    date:'08.10.2026',
    image:'https://images.pexels.com/photos/13953013/pexels-photo-13953013.jpeg?auto=compress&cs=tinysrgb&w=900',
    intro:'Không cần bắt đầu bằng một quãng đường thật dài. Điều quan trọng là thói quen đều đặn và sự thoải mái.',
    content:[
      'Chọn một đôi giày vừa chân, trang phục thoáng và tuyến đường phù hợp. Khởi động nhẹ trước khi chạy để cơ thể làm quen với vận động.',
      'Hãy xen kẽ chạy chậm và đi bộ trong những buổi đầu. Tăng thời lượng một cách từ tốn dựa trên khả năng cá nhân thay vì cố chạy theo thành tích của người khác.',
      'Dành thời gian nghỉ ngơi sau buổi tập và duy trì việc uống đủ nước. Nếu có vấn đề sức khỏe, bạn nên tham khảo ý kiến chuyên môn trước khi bắt đầu.'
    ]
  },
  {
    slug:'sap-xep-goc-tap-gym-tai-nha',
    title:'Thiết lập góc tập gym gọn gàng tại nhà',
    category:'Gym & Fitness',
    date:'05.10.2026',
    image:'https://images.pexels.com/photos/8033017/pexels-photo-8033017.jpeg?auto=compress&cs=tinysrgb&w=900',
    intro:'Một góc nhỏ, đủ ánh sáng và những dụng cụ phù hợp là điểm khởi đầu thú vị cho việc tập luyện.',
    content:[
      'Ưu tiên nơi có mặt sàn chắc chắn, thông thoáng và không vướng đồ nội thất. Để trống đủ không gian cho các chuyển động tay chân.',
      'Bạn có thể bắt đầu với thảm, dây kháng lực và tạ tay theo nhu cầu. Không cần mua quá nhiều dụng cụ ngay từ đầu.',
      'Cất thiết bị về vị trí cố định sau mỗi lần sử dụng và kiểm tra độ an toàn của phụ kiện trước khi tập.'
    ]
  },
  {
    slug:'lam-quen-voi-pickleball',
    title:'Pickleball: bộ môn thú vị để vận động cùng bạn bè',
    category:'Pickleball',
    date:'02.10.2026',
    image:'https://images.pexels.com/photos/30864598/pexels-photo-30864598.jpeg?auto=compress&cs=tinysrgb&w=900',
    intro:'Pickleball kết hợp sự linh hoạt của các môn thể thao dùng vợt với lối chơi dễ tiếp cận.',
    content:[
      'Khi mới chơi, bạn nên tìm hiểu sân chơi, cách tính điểm và các nguyên tắc cơ bản trước trận đấu.',
      'Một cây vợt vừa tay, bóng phù hợp và giày có độ bám tốt là những trang bị cần cân nhắc.',
      'Bắt đầu với các pha bóng đơn giản, tập trung vào khả năng kiểm soát và giao tiếp cùng đồng đội để duy trì niềm vui.'
    ]
  }
];

function safeParse(key,fbk){
  try{
    return JSON.parse(localStorage.getItem(key)) || fbk;
  }catch{
    return fbk;
  }
}

function store(key,data){
  try{
    localStorage.setItem(key,JSON.stringify(data));
  }catch{}
}

function escapeHTML(v){
  return String(v??'').replace(
    /[&<>"']/g,
    c=>({
      '&':'&amp;',
      '<':'&lt;',
      '>':'&gt;',
      '"':'&quot;',
      "'":'&#39;'
    }[c])
  );
}

function money(n){
  return Number(n||0).toLocaleString('vi-VN')+'₫';
}

// The placeholder is always behind each product photo. No SVG file is required.
// On errors, hide the broken image and reveal the product name underneath.
function onProductPhotoError(event){
  const img=event.target;
  if(img?.tagName !== 'IMG' || !img.classList.contains('sh-photo-real')) return;
  img.classList.add('sh-photo-error');
  // Prevent older per-page fallback scripts from inserting duplicate placeholders.
  event.stopPropagation?.();
}
if(typeof window.addEventListener === 'function'){
  window.addEventListener('error',onProductPhotoError,true);
}else{
  document.addEventListener('error',onProductPhotoError,true);
}

// Normalize local asset paths to the repository root.
function asset(path){
  const raw = String(path || 'img/categorial/phu-kien.svg');

  if (
    /^(?:https?:)?\/\//i.test(raw) ||
    /^(?:data|blob):/i.test(raw)
  ) return raw;

  const clean = raw
    .replace(/^\/+/, '')
    .replace(/^assets\//i, '')
    .replace(/^img\/categories\//i, 'img/categorial/');

  return new URL(clean, ROOT).href;
}

// Clean public URLs; support local file preview separately.
// Product image component shared by home, shop, categories, detail, cart and checkout.
// Upload the exact p.image WebP filename later; no per-page edits or SVG placeholders needed.
function productPhoto(p, {loading='lazy', width=380, height=380, small=false}={}){
  const label = escapeHTML(p.name || 'Sản phẩm SPORTHUB');
  const image = escapeHTML(asset(p.image));
  return `<span class="sh-photo-box${small?' sh-photo-small':''}">
    <span class="sh-photo-placeholder" aria-hidden="true">
      <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m3 17 5-5 4 4 3-3 6 6"/></svg>
      <strong>${label}</strong>
      <small>Ảnh sản phẩm đang cập nhật</small>
    </span>
    <img class="sh-photo-real" src="${image}" alt="Hình ảnh sản phẩm ${label}" loading="${loading}" width="${width}" height="${height}">
  </span>`;
}

function photoStyles(){
  return `<style id="sh-product-photo-styles">
    .sh-photo-box{position:relative;display:block;width:100%;aspect-ratio:1/1;overflow:hidden;background:#f1f5fb;isolation:isolate}
    .sh-photo-placeholder{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;padding:12px;text-align:center;background:linear-gradient(140deg,#f4f7fc,#e6edf8);color:#637b99}
    .sh-photo-placeholder strong{font-size:clamp(11px,1.3vw,16px);line-height:1.45;color:#304861;overflow-wrap:anywhere}
    .sh-photo-placeholder small{font-size:10px;line-height:1.5;color:#7a8da6}
    .sh-photo-real{position:absolute!important;inset:0;width:100%!important;height:100%!important;max-height:none!important;aspect-ratio:auto!important;object-fit:cover!important;z-index:1}
    .sh-photo-real.sh-photo-error{display:none!important}
    .product-pic>a{display:block;width:100%;height:100%}
    .product-pic .tag,.product-pic .wish{z-index:2}
    .detail-image .sh-photo-box{width:100%;aspect-ratio:1/1}
    .combo-photos .sh-photo-box{flex:0 0 40%;width:40%;border:5px solid white;border-radius:16px}
    .combo-photos .sh-photo-box+.sh-photo-box{margin-left:-16px}
    .cart-row .sh-photo-box{width:108px;height:108px;border-radius:12px}
    .sh-photo-box.sh-photo-small{width:56px;height:56px;flex-shrink:0;border-radius:9px}
    .sh-photo-small .sh-photo-placeholder strong{font-size:9px}
    .sh-photo-small .sh-photo-placeholder small{display:none}
    .sh-photo-small .sh-photo-placeholder svg{width:16px;height:16px}
    @media(max-width:760px){.cart-row .sh-photo-box{width:80px;height:80px}.sh-photo-placeholder{gap:5px;padding:7px}.sh-photo-placeholder strong{font-size:11px}.sh-photo-placeholder small{font-size:9px}}
  </style>`;
}

// Also covers cached images that completed before the error listener ran.
function checkProductPhotos(){
  document.querySelectorAll('img.sh-photo-real').forEach(img=>{
    if(img.complete && img.naturalWidth === 0){
      img.classList.add('sh-photo-error');
    }
  });
}

function link(path=''){
  const p = String(path)
    .replace(/^\/+/, '')
    .replace(/(?:\/index\.html|^index\.html)$/i, '')
    .replace(/\/+$/, '');

  return new URL(
    p
      ? p + (FILE ? '/index.html' : '/')
      : (FILE ? 'index.html' : ''),
    ROOT
  ).href;
}

function productLink(p){
  const original = window.SPORT_PRODUCTS.some(
    x => x.slug === p.slug
  );

  return original
    ? link('san-pham/' + p.slug)
    : link('san-pham') + '?p=' + encodeURIComponent(p.slug);
}

function articleLink(p){
  return posts.some(x=>x.slug===p.slug)
    ? link('bai-viet/'+p.slug)
    : link('bai-viet')+'?p='+encodeURIComponent(p.slug);
}

function catName(id){
  return categories.find(x=>x.slug===id)?.name || id;
}

function icon(name,size=20){
  const paths = {
    search:'<circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>',
    bag:'<path d="M5 8h14l-1 13H6L5 8Z"/><path d="M9 9V6a3 3 0 0 1 6 0v3"/>',
    user:'<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
    heart:'<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0l-1 1-1-1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z"/>',
    menu:'<path d="M4 6h16M4 12h16M4 18h16"/>',
    truck:'<path d="M3 5h12v12H3zM15 10h4l3 4v3h-7z"/><circle cx="7" cy="18" r="2"/><circle cx="18" cy="18" r="2"/>',
    shield:'<path d="M12 2 4 5v6c0 6 4 10 8 11 4-1 8-5 8-11V5z"/><path d="m9 12 2 2 4-4"/>',
    refresh:'<path d="M3 11a9 9 0 0 1 16-5l2 2M3 11l-2-2M3 11l3-3M21 13l2 2M21 13l-3 3"/>',
    headphones:'<path d="M3 13v-2a9 9 0 0 1 18 0v2M3 13h4v8H5a2 2 0 0 1-2-2zM21 13h-4v8h2a2 2 0 0 0 2-2z"/>',
    arrow:'<path d="M5 12h14m-6-6 6 6-6 6"/>',
    trash:'<path d="M3 6h18M8 6V4h8v2M6 6l1 15h10l1-15M10 10v7M14 10v7"/>',
    check:'<path d="m4 12 5 5L20 6"/>',
    lock:'<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
    star:'<path d="m12 2 3 6 7 .8-5.1 5 1.2 7L12 17.5 5.9 20.8l1.2-7L2 8.8 9 8z"/>'
  };

  return `<svg class="icon" width="${size}" height="${size}" viewBox="0 0 24 24" aria-hidden="true">${paths[name]||paths.star}</svg>`;
}

function notify(msg,kind=''){
  document.querySelector('.toast')?.remove();

  const el = document.createElement('div');
  el.className = 'toast '+kind;
  el.textContent = msg;
  document.body.append(el);

  setTimeout(()=>el.remove(),3800);
}

function cartCount(){
  return cart.reduce((a,b)=>a+b.qty,0);
}

function cartSubtotal(){
  return cart.reduce(
    (a,b)=>a+((getProduct(b.id)?.salePrice||getProduct(b.id)?.price||0)*b.qty),
    0
  );
}

function getProduct(id){
  return products.find(p=>p.id===id);
}

function price(p){
  return p.salePrice||p.price;
}

function addCart(id,qty=1,variant=''){
  const p=getProduct(id);
  if(!p)return;

  const choice=variant||p.variants?.[0]||'Tiêu chuẩn';

  const existing=cart.find(
    x=>x.id===id &&
    (x.variant||p.variants?.[0]||'Tiêu chuẩn')===choice
  );

  if(existing){
    existing.qty=Math.min(99,existing.qty+qty);
  }else{
    cart.push({
      id,
      qty:Math.min(99,qty),
      variant:choice
    });
  }

  store('sporthub-cart',cart);
  updateCartBadge();

  notify(
    'Đã thêm '+p.name+' ('+choice+') vào giỏ hàng',
    'success'
  );
}

function updateCartBadge(){
  document.querySelectorAll('[data-cart-count]').forEach(
    x=>x.textContent=cartCount()
  );
}

function wishSync(){
  store('sporthub-wish',favorites);

  if(fb&&user){
    fb.setDoc(
      fb.doc(fb.db,'users',user.uid),
      {favorites},
      {merge:true}
    ).catch(()=>{});
  }
}

function toggleWish(id){
  favorites=favorites.includes(id)
    ? favorites.filter(v=>v!==id)
    : [...favorites,id];

  wishSync();

  document.querySelectorAll(`[data-wish="${id}"]`).forEach(b=>{
    b.classList.toggle('is-active',favorites.includes(id));

    b.setAttribute(
      'aria-label',
      favorites.includes(id)?'Bỏ yêu thích':'Yêu thích'
    );
  });

  notify('Đã cập nhật danh sách yêu thích');
}

function crumb(items){
  return `<div class="breadcrumb container"><a href="${link()}">Trang chủ</a>${items.map((it,i)=>`<span>/</span>${i===items.length-1?`<b>${escapeHTML(it.text)}</b>`:`<a href="${it.href}">${escapeHTML(it.text)}</a>`}`).join('')}</div>`;
}

// Header: search only on Home and All Products listing.
function header(){
  const showSearch =
    page==='home' ||
    (
      page==='shop' &&
      !new URLSearchParams(location.search).has('p')
    );

  return `<div class="topbar"><div class="container topbar-inner"><span>✦ Chuyển động mỗi ngày, bứt phá theo cách của bạn</span><span>Ưu đãi giao hàng cho đơn từ ${money(settings.freeShippingFrom)}</span></div></div><header class="main-header"><div class="container header-inner"><a class="logo" href="${link()}" aria-label="SPORTHUB - Trang chủ"><span class="logo-mark">S</span><span class="logo-type"><b>SPORT<span class="text-blue">HUB</span></b><small>LIVE TO MOVE</small></span></a>${showSearch?`<div class="site-search"><form data-search-form><input name="q" placeholder="Tìm giày, vợt, dụng cụ thể thao..." aria-label="Tìm kiếm sản phẩm"/><button aria-label="Tìm kiếm" type="submit">${icon('search')}</button></form></div>`:''}<div class="header-actions"><a class="header-action" href="${link('tai-khoan')}">${icon('user',23)}<span><span class="hint">${user?'Xin chào':'Tài khoản'}</span>${escapeHTML(user?.displayName?.split(' ').slice(-1)[0]||'Đăng nhập')}</span></a><a class="header-action" href="${link('gio-hang')}"><span class="bag-icon">${icon('bag',24)}<span class="count-badge" data-cart-count>${cartCount()}</span></span><span><span class="hint">Giỏ hàng</span>${money(cartSubtotal())}</span></a><button class="icon-btn mobile-toggle" data-action="menu" aria-label="Mở danh mục">${icon('menu')}</button></div></div></header>${showSearch?`<div class="mobile-search"><div class="container"><form data-search-form><input name="q" placeholder="Bạn đang tìm sản phẩm nào?" aria-label="Tìm kiếm sản phẩm"/><button aria-label="Tìm kiếm">${icon('search')}</button></form></div></div>`:''}<nav class="navbar" id="mobile-nav"><div class="container nav-inner"><a href="${link('san-pham')}" class="nav-link all">☷ Tất cả sản phẩm</a><a class="nav-link" href="${link()}">Trang chủ</a>${categories.slice(0,6).map(c=>`<a class="nav-link" href="${link('danh-muc/'+c.slug)}">${escapeHTML(c.name)}</a>`).join('')}<a class="nav-link" href="${link('bai-viet')}">Kiến thức</a><a class="nav-link" href="${link('lien-he')}">Liên hệ</a></div></nav>`;
}

function footer(){
  return `<footer class="footer"><div class="container"><div class="footer-grid"><div><a class="logo" href="${link()}"><span class="logo-mark">S</span><span class="logo-type"><b>SPORT<span style="color:var(--lime)">HUB</span></b><small>LIVE TO MOVE</small></span></a><p style="max-width:330px;margin-top:16px">Không chỉ là trang bị thể thao. SPORTHUB đồng hành cùng bạn trên hành trình sống khỏe, vận động vui và khám phá những giới hạn mới.</p><small>Ảnh trong danh mục hiện là hình minh họa mẫu.</small></div><div><h4>Khám phá</h4><div class="footer-links"><a href="${link('san-pham')}">Cửa hàng</a><a href="${link('gioi-thieu')}">Về SPORTHUB</a><a href="${link('bai-viet')}">Kiến thức thể thao</a><a href="${link('lien-he')}">Liên hệ</a></div></div><div><h4>Hỗ trợ</h4><div class="footer-links"><a href="${link('chinh-sach-mua-hang')}">Chính sách mua hàng</a><a href="${link('bao-mat')}">Bảo mật & điều khoản</a><a href="${link('gio-hang')}">Giỏ hàng</a><a href="${link('tai-khoan')}">Tài khoản của tôi</a></div></div><div><h4>Kết nối</h4><p>${settings.contactEmail?escapeHTML(settings.contactEmail):'Email: chưa cập nhật'}<br>${settings.phone?'Điện thoại: '+escapeHTML(settings.phone):'Hotline: chưa cập nhật'}<br>${settings.address?escapeHTML(settings.address):'Thông tin địa chỉ đang cập nhật'}</p><a href="${link('quan-tri')}?demo=1" style="color:var(--lime)">Xem trước giao diện quản trị ↗</a></div></div><div class="footer-bottom"><span>© 2026 SPORTHUB. Thiết kế dành cho lối sống năng động.</span><span>Website mẫu • Chức năng giao dịch cần cấu hình backend bảo mật</span></div></div></footer>`;
}

function productCard(p){
  return `<article class="product-card"><div class="product-pic"><a href="${productLink(p)}" aria-label="Xem ${escapeHTML(p.name)}">${productPhoto(p)}</a>${p.salePrice && p.price>p.salePrice?`<span class="tag orange">−${Math.round((p.price-p.salePrice)/p.price*100)}%</span>`:p.new?'<span class="tag">Hàng mới</span>':''}<button class="wish ${favorites.includes(p.id)?'is-active':''}" data-action="wish" data-id="${p.id}" data-wish="${p.id}" aria-label="${favorites.includes(p.id)?'Bỏ yêu thích':'Yêu thích'}">${icon('heart',17)}</button></div><div class="product-info"><div class="cat">${escapeHTML(catName(p.category))}</div><a class="product-title" href="${productLink(p)}">${escapeHTML(p.name)}</a><div class="rating"><span class="muted">Mã ${escapeHTML(p.id)} • Giá tham khảo</span></div><div class="price">${money(price(p))}${p.salePrice?`<span class="old-price">${money(p.price)}</span>`:''}</div><div class="product-bottom"><button class="btn sm" data-action="add" data-id="${p.id}">${icon('bag',15)} Thêm vào giỏ</button><a class="icon-btn" href="${productLink(p)}" aria-label="Chi tiết">${icon('arrow',17)}</a></div></div></article>`;
}

function productGrid(items){
  return `<div class="product-grid">${items.map(productCard).join('')}</div>`;
}

function sectionTitle(kicker,title,href,desc=''){
  return `<div class="section-header"><div><div class="eyebrow">${kicker}</div><h2>${title}</h2>${desc?`<p class="muted">${desc}</p>`:''}</div>${href?`<a class="link-arrow" href="${href}">Xem tất cả ${icon('arrow',17)}</a>`:''}</div>`;
}

function categoryCards(){
  return `<div class="category-grid">${categories.map(c=>`<a class="category-card" href="${link('danh-muc/'+c.slug)}"><div class="category-img"><img src="${asset(c.image)}" loading="lazy" width="320" height="220" alt="Danh mục ${escapeHTML(c.name)}"/></div><div class="category-caption"><b>${escapeHTML(c.name)} ↗</b><small>${escapeHTML(c.tagline)}</small></div></a>`).join('')}</div>`;
}

function blogCards(items=posts){
  return `<div class="blog-grid">${items.map(p=>`<article class="blog-card"><a href="${articleLink(p)}"><img src="${asset(p.image)}" width="420" height="270" alt="${escapeHTML(p.title)}" loading="lazy"/></a><div class="body"><span class="tag gray">${escapeHTML(p.category)}</span><h3><a href="${articleLink(p)}">${escapeHTML(p.title)}</a></h3><p>${escapeHTML(p.intro)}</p><a class="link-arrow" href="${articleLink(p)}">Đọc bài viết ${icon('arrow',15)}</a></div></article>`).join('')}</div>`;
}
function home(){
  const featured=products.filter(p=>p.featured).slice(0,8);
  const news=products.filter(p=>p.new).slice(0,8);
  const combos=[
    [products[0],products[7],'Combo chạy bộ khởi đầu'],
    [products[13],products[19],'Combo tập gym tại nhà'],
    [products[24],products[29],'Combo cân bằng & thư giãn']
  ];

  return `<main>
    <section class="hero-section">
      <div class="container">
        <div class="hero">
          <div class="hero-copy">
            <div class="hero-kicker">✦ Move with purpose — SPORTHUB 2026</div>
            <h1>
              ${escapeHTML(settings.headline.split('. ')[0]||'Chuyển động mạnh mẽ.')}
              <br>
              <span>${escapeHTML(settings.headline.split('. ').slice(1).join('. ')||'Sống trọn đam mê.')}</span>
            </h1>
            <p>${escapeHTML(settings.promo)} Khám phá các lựa chọn giày, thời trang và dụng cụ phù hợp với bạn.</p>
            <div class="hero-buttons">
              <a href="${link('san-pham')}" class="btn lime">Khám phá sản phẩm ${icon('arrow')}</a>
              <a href="${link('gioi-thieu')}" class="btn outline" style="color:white;border-color:#71849c">Về SPORTHUB</a>
            </div>
          </div>
          <div class="hero-art">
            <div class="hero-circle"></div>
            <div class="hero-mini">⚡ NEW SEASON / 2026</div>
            <img src="${asset(settings.heroImage||'https://images.pexels.com/photos/21923387/pexels-photo-21923387.jpeg?auto=compress&cs=tinysrgb&w=1100')}" alt="Vận động viên chạy bộ trên đường chạy" width="550" height="520" fetchpriority="high">
            <span class="hero-seal">SPORT<br>IS LIFE ↗</span>
          </div>
        </div>
        <div class="trustbar">
          <div class="trust-item"><span class="trust-ico">${icon('truck')}</span><div><b>Ưu đãi giao hàng</b><small>Đơn từ ${money(settings.freeShippingFrom)}</small></div></div>
          <div class="trust-item"><span class="trust-ico">${icon('shield')}</span><div><b>Đặt hàng bảo mật</b><small>Thông tin được bảo vệ</small></div></div>
          <div class="trust-item"><span class="trust-ico">${icon('refresh')}</span><div><b>Thông tin rõ ràng</b><small>Chính sách minh bạch</small></div></div>
          <div class="trust-item"><span class="trust-ico">${icon('headphones')}</span><div><b>Hỗ trợ thân thiện</b><small>Đồng hành với bạn</small></div></div>
        </div>
      </div>
    </section>

    <section class="section">
      <div class="container">
        ${sectionTitle('01 / Danh mục nổi bật','Tìm đúng bộ môn, đúng cảm hứng',link('san-pham'))}
        ${categoryCards()}
      </div>
    </section>

    <section class="section soft">
      <div class="container">
        ${sectionTitle('02 / Tuyển chọn SPORTHUB','Sản phẩm nổi bật',link('san-pham'),'Những lựa chọn được ưu tiên giới thiệu trong danh mục mẫu.')}
        ${productGrid(featured)}
      </div>
    </section>

    <section class="section">
      <div class="container">
        ${sectionTitle('03 / Vừa lên kệ','Khám phá sản phẩm mới',link('san-pham'))}
        ${productGrid(news)}
      </div>
    </section>

    <section class="section sm">
      <div class="container">
        <div class="promo">
          <div class="promo-copy">
            <span class="tag lime">ƯU ĐÃI MÙA VẬN ĐỘNG</span>
            <h2>Trang bị tốt.<br><span style="color:var(--lime)">Tự tin bứt phá.</span></h2>
            <p>Khám phá những sản phẩm đang có mức giá ưu đãi trong bộ sưu tập mẫu.</p>
            <a class="btn lime" href="${link('san-pham')}?sale=1">Xem ưu đãi ${icon('arrow',17)}</a>
          </div>
          <img src="${asset(settings.saleImage||'https://images.pexels.com/photos/8033017/pexels-photo-8033017.jpeg?auto=compress&cs=tinysrgb&w=1000')}" alt="Chương trình ưu đãi thể thao" loading="lazy">
        </div>
      </div>
    </section>

    <section class="section">
      <div class="container">
        ${sectionTitle('04 / Theo bộ môn','Chọn sân chơi của bạn',link('san-pham'))}
        <div class="sport-strip">
          ${[categories[2],categories[3],categories[5]].map(c=>`
            <div class="sport-tile">
              <img src="${asset('img/editorial/'+({
                'gym-fitness':'sport-gym',
                'pickleball':'sport-pickleball',
                'yoga-pilates':'sport-yoga'
              }[c.slug])+'.svg')}" loading="lazy" alt="${escapeHTML(c.name)}">
              <div class="inner">
                <h3>${escapeHTML(c.name)}</h3>
                <a href="${link('danh-muc/'+c.slug)}">Khám phá ngay ↗</a>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    </section>

    <section class="section soft">
      <div class="container">
        ${sectionTitle('05 / Mua cùng nhau','Gợi ý bộ đôi năng động',null,'Nhóm sản phẩm gợi ý; giá tính theo từng mặt hàng.')}
        <div class="combo-grid">
          ${combos.map((c,i)=>`
            <div class="combo-card">
              <div class="combo-photos">
                ${c.slice(0,2).map(p=>`
                  ${productPhoto(p)}
                `).join('')}
              </div>
              <span class="tag gray">GỢI Ý ${i+1}</span>
              <h3>${escapeHTML(c[2])}</h3>
              <p>${escapeHTML(c[0].name)} + ${escapeHTML(c[1].name)}</p>
              <div class="combo-price">${money(price(c[0])+price(c[1]))}</div>
              <button class="btn sm space-top" data-action="combo" data-ids="${c[0].id},${c[1].id}">
                Thêm 2 sản phẩm ${icon('arrow',15)}
              </button>
            </div>
          `).join('')}
        </div>
      </div>
    </section>

    <section class="section">
      <div class="container">
        ${sectionTitle('06 / Góc kiến thức','Cùng nhau sống năng động',link('bai-viet'))}
        ${blogCards()}
      </div>
    </section>

    <section class="section sm">
      <div class="container">
        <div class="newsletter">
          <div>
            <div class="eyebrow">SPORTHUB CARE</div>
            <h2>Chọn đúng trang bị, yên tâm vận động</h2>
            <p class="muted" style="margin:0">Khám phá thông tin mua hàng và chính sách hỗ trợ minh bạch.</p>
          </div>
          <a class="btn dark" href="${link('chinh-sach-mua-hang')}">Xem chính sách ${icon('arrow',17)}</a>
        </div>
      </div>
    </section>
  </main>`;
}

function shop(){
  const params = new URLSearchParams(location.search);

  if(params.get('sale') === '1') shopFilters.sale = true;

  const isCat = page === 'category';

  if(isCat){
    shopFilters.category = slug;
    shopFilters.q = '';
  }

  const name = isCat ? catName(slug) : 'Tất cả sản phẩm';

  let chosen = products.filter(p =>
    (!shopFilters.category || p.category === shopFilters.category) &&
    (!shopFilters.q || [p.name,p.short,p.categoryName].join(' ').toLowerCase().includes(shopFilters.q.toLowerCase())) &&
    (!shopFilters.max || price(p) <= Number(shopFilters.max)) &&
    (!shopFilters.sale || p.salePrice)
  );

  if(shopFilters.sort === 'asc') chosen.sort((a,b)=>price(a)-price(b));
  if(shopFilters.sort === 'desc') chosen.sort((a,b)=>price(b)-price(a));
  if(shopFilters.sort === 'new') chosen.sort((a,b)=>(b.new?1:0)-(a.new?1:0));

  const searchFilter = isCat
    ? '<input id="filter-q" type="hidden" value="">'
    : `<label class="filter-label" for="filter-q">Tìm nhanh</label><input class="form-control" id="filter-q" placeholder="Nhập tên sản phẩm" value="${escapeHTML(shopFilters.q)}">`;

  const categoryIntros = {
    'thoi-trang-the-thao':'Khám phá áo chạy bộ, áo khoác gió, áo bóng rổ, quần short và legging cho nhiều hoạt động. So sánh kiểu dáng và giá tham khảo.',
    'giay-the-thao':'Tìm hiểu các mẫu giày chạy bộ, tập gym, pickleball, cầu lông và giày đi bộ. Chọn theo bộ môn và kiểm tra cỡ giày trước khi mua.',
    'gym-fitness':'Tham khảo tạ tay, tạ ấm, dây kháng lực, con lăn tập bụng và dây nhảy cho góc tập tại nhà. Kiểm tra trọng lượng và cách sử dụng an toàn.',
    'pickleball':'Khám phá vợt, bóng, túi đựng vợt và băng quấn cán pickleball. So sánh kiểu dáng, nhu cầu chơi và thông tin sản phẩm trước khi lựa chọn.',
    'cau-long':'Tìm hiểu vợt cầu lông, ống cầu, dây cước và túi đựng vợt. Tham khảo trang bị cho tập luyện, chơi giải trí và cách chọn phụ kiện.',
    'yoga-pilates':'Khám phá thảm yoga, gạch hỗ trợ, vòng Pilates và dây kéo giãn. Tìm dụng cụ cho không gian luyện tập và kiểm tra thông số trước khi sử dụng.',
    'phu-kien':'Tham khảo bình nước, túi thể thao, vớ, băng đô và đai chạy bộ. Khám phá các phụ kiện phục vụ tập luyện và sinh hoạt năng động.',
    'phuc-hoi':'Tìm hiểu ống lăn cơ, bóng massage và máy massage cầm tay. Tham khảo cách lựa chọn dụng cụ chăm sóc sau vận động và lưu ý sử dụng an toàn.'
  };
  const introText = isCat
    ? (categoryIntros[slug] || 'Khám phá các lựa chọn dành cho '+escapeHTML(name)+'.')
    : 'Chọn sản phẩm phù hợp với nhịp vận động của bạn.';

  return `<main>
    ${crumb([{text:name}])}
    <div class="page-intro">
      <div class="container">
        <div class="eyebrow">SPORTHUB / SHOP</div>
        <h1>${escapeHTML(name)}</h1>
        <p>${introText}</p>
      </div>
    </div>

    <section class="section sm">
      <div class="container shop-layout">
        <aside class="filters">
          <h3>Bộ lọc sản phẩm</h3>
          ${searchFilter}

          <label class="filter-label" for="filter-cat">Danh mục</label>
          <select class="form-control" id="filter-cat">
            <option value="">Tất cả danh mục</option>
            ${categories.map(c=>`<option value="${c.slug}" ${shopFilters.category===c.slug?'selected':''}>${escapeHTML(c.name)}</option>`).join('')}
          </select>

          <label class="filter-label" for="filter-max">Giá tối đa</label>
          <select class="form-control" id="filter-max">
            <option value="">Tất cả mức giá</option>
            ${[300000,500000,1000000,1500000].map(n=>`<option value="${n}" ${String(shopFilters.max)===String(n)?'selected':''}>Dưới ${money(n)}</option>`).join('')}
          </select>

          <label class="checkbox-row space-top">
            <input id="filter-sale" type="checkbox" ${shopFilters.sale?'checked':''}>
            Đang khuyến mãi
          </label>

          <button class="btn ghost block sm space-top" data-action="clear-filters">
            Xóa bộ lọc
          </button>
        </aside>

        <div>
          ${isCat?`<h2 style="font-size:22px;margin:0 0 18px">Sản phẩm ${escapeHTML(name.toLowerCase())}</h2>`:''}

          <div class="shop-toolbar">
            <div><b>${chosen.length}</b> sản phẩm phù hợp</div>
            <select class="form-control" id="filter-sort" aria-label="Sắp xếp">
              <option value="new" ${shopFilters.sort==='new'?'selected':''}>Ưu tiên sản phẩm mới</option>
              <option value="asc" ${shopFilters.sort==='asc'?'selected':''}>Giá thấp đến cao</option>
              <option value="desc" ${shopFilters.sort==='desc'?'selected':''}>Giá cao đến thấp</option>
            </select>
          </div>

          ${chosen.length
            ? productGrid(chosen)
            : `<div class="empty">
                <div class="emoji">⌕</div>
                <h3>Chưa có sản phẩm phù hợp</h3>
                <p>Thử thay đổi bộ lọc nhé.</p>
                <button class="btn sm" data-action="clear-filters">Xem tất cả</button>
              </div>`
          }
        </div>
      </div>
    </section>
  </main>`;
}
function detail(){
  const p=products.find(x=>x.slug===(slug||new URLSearchParams(location.search).get('p')));
  if(!p)return notFound();

  detailVariant=p.variants?.[0]||'Tiêu chuẩn';

  return `<main>${crumb([{text:'Cửa hàng',href:link('san-pham')},{text:catName(p.category),href:link('danh-muc/'+p.category)},{text:p.name}])}
    <div class="container">
      <div class="detail-grid">
        <div>
          <div class="detail-image">
            ${productPhoto(p,{loading:'eager',width:680,height:680})}
          </div>
          <p class="muted text-small">Ảnh sản phẩm sẽ tự cập nhật khi có tệp WebP đúng tên. Vui lòng xác nhận thông tin thực tế trước khi mua.</p>
        </div>
        <div class="detail-side">
          <span class="tag">${escapeHTML(catName(p.category))}</span>
          <h1>${escapeHTML(p.name)}</h1>
          <p class="muted text-small">Mã sản phẩm: ${escapeHTML(p.id)} &nbsp; • &nbsp; Hàng mẫu</p>
          <div class="detail-price">
            <span class="price">${money(price(p))}</span>
            ${p.salePrice?`<span class="old-price">${money(p.price)}</span>`:''}
            <div class="detail-stock">✓ ${p.stock>0?`Còn ${p.stock} sản phẩm (dữ liệu mẫu)`:'Hết hàng'}</div>
          </div>
          <p class="detail-description">${escapeHTML(p.short)}</p>
          <b style="font-size:12px">Chọn ${p.category==='giay-the-thao'?'cỡ':'phiên bản'}</b>
          <div class="choice-row">
            ${(p.variants||['Tiêu chuẩn']).map(v=>`<button class="choice ${v===detailVariant?'active':''}" data-action="variant" data-value="${escapeHTML(v)}">${escapeHTML(v)}</button>`).join('')}
          </div>
          <b style="font-size:12px">Số lượng</b>
          <div class="space-top qty">
            <button data-action="detail-dec" aria-label="Giảm">−</button>
            <input aria-label="Số lượng" type="number" readonly id="detail-qty" value="${detailQty}">
            <button data-action="detail-inc" aria-label="Tăng">+</button>
          </div>
          <div class="detail-ctas">
            <button class="btn" data-action="detail-add" data-id="${p.id}">${icon('bag')} Thêm vào giỏ hàng</button>
            <button class="btn dark" data-action="buy" data-id="${p.id}">Mua ngay ${icon('arrow')}</button>
          </div>
          <button class="btn ghost sm" data-action="wish" data-id="${p.id}" data-wish="${p.id}">
            ${icon('heart',16)} ${favorites.includes(p.id)?'Bỏ yêu thích':'Thêm vào yêu thích'}
          </button>
          <div class="perk-list">
            <div>✓ Đơn hàng được kiểm tra và xác nhận phía máy chủ khi kết nối.</div>
            <div>✓ Có lựa chọn thanh toán khi nhận hàng (COD).</div>
            <div>✓ Thông tin và chính sách minh bạch.</div>
          </div>
        </div>
      </div>
    </div>

    <section class="section soft">
      <div class="container tabs-content">
        <div>
          <h2>Thông tin sản phẩm</h2>
          <p style="color:#5a6a80;line-height:2">${escapeHTML(p.description)}</p>
          <p>SPORTHUB ưu tiên những sản phẩm phục vụ vận động hằng ngày. Mọi giá bán và tồn kho ở trạng thái dữ liệu mẫu sẽ được thay bằng thông tin chính thức khi chủ cửa hàng cấu hình hệ thống.</p>
        </div>
        <div>
          <h3>Chi tiết sản phẩm</h3>
          <table class="spec-table">
            ${Object.entries(p.specs||{}).map(([k,v])=>`<tr><td>${escapeHTML(k)}</td><td><b>${escapeHTML(v)}</b></td></tr>`).join('')}
            <tr><td>Mã sản phẩm</td><td><b>${escapeHTML(p.id)}</b></td></tr>
          </table>
        </div>
      </div>
    </section>

    <section class="section">
      <div class="container">
        ${sectionTitle('Gợi ý dành cho bạn','Có thể bạn cũng thích',link('danh-muc/'+p.category))}
        ${productGrid(products.filter(x=>x.category===p.category&&x.id!==p.id).slice(0,4))}
      </div>
    </section>
  </main>`;
}

function totalsHtml(sub){
  const shipping=sub>=settings.freeShippingFrom?0:settings.shippingFee;
  return `<div class="totals">
    <div class="line"><span>Tạm tính</span><b>${money(sub)}</b></div>
    <div class="line"><span>Phí giao hàng tham khảo</span><b>${money(shipping)}</b></div>
    <div class="line grand"><span>Tổng dự kiến</span><b>${money(sub+shipping)}</b></div>
    <div class="notice">Phí và giá cuối cùng do máy chủ xác nhận lúc đặt hàng.</div>
  </div>`;
}

function cartPage(){
  const valid=cart.filter(it=>getProduct(it.id));
  return `<main>${crumb([{text:'Giỏ hàng'}])}
    <div class="page-intro">
      <div class="container"><h1>Giỏ hàng của bạn</h1><p>Kiểm tra lựa chọn của mình trước khi đặt hàng.</p></div>
    </div>
    <section class="section sm">
      <div class="container">
        ${valid.length
          ? `<div class="cart-layout">
              <div class="panel">
                <h3>Sản phẩm đã chọn (${cartCount()})</h3>
                ${valid.map(it=>{
                  const p=getProduct(it.id);
                  return `<div class="cart-row">
                    <a href="${productLink(p)}">${productPhoto(p,{width:108,height:108})}</a>
                    <div>
                      <a href="${productLink(p)}"><b>${escapeHTML(p.name)}</b></a>
                      <small class="muted">${escapeHTML(catName(p.category))} • ${escapeHTML(it.variant||p.variants?.[0]||'Tiêu chuẩn')}</small>
                      <div class="price">${money(price(p))}</div>
                    </div>
                    <div class="cart-actions">
                      <div class="qty">
                        <button data-action="cart-dec" data-id="${p.id}" data-variant="${escapeHTML(it.variant||p.variants?.[0]||'Tiêu chuẩn')}" aria-label="Giảm">−</button>
                        <input value="${it.qty}" readonly aria-label="Số lượng">
                        <button data-action="cart-inc" data-id="${p.id}" data-variant="${escapeHTML(it.variant||p.variants?.[0]||'Tiêu chuẩn')}" aria-label="Tăng">+</button>
                      </div>
                      <button class="delete" data-action="cart-remove" data-id="${p.id}" data-variant="${escapeHTML(it.variant||p.variants?.[0]||'Tiêu chuẩn')}">Xóa sản phẩm</button>
                    </div>
                  </div>`;
                }).join('')}
              </div>
              <aside class="panel">
                <h3>Đơn hàng dự kiến</h3>
                ${totalsHtml(cartSubtotal())}
                <a class="btn block space-top" href="${link('thanh-toan')}">Tiến hành thanh toán ${icon('arrow',18)}</a>
                <a href="${link('san-pham')}" class="btn outline block sm space-top">Tiếp tục mua sắm</a>
              </aside>
            </div>`
          : `<div class="empty">
              <div class="emoji">🛍</div>
              <h3>Giỏ hàng đang trống</h3>
              <p>Hãy khám phá những sản phẩm thể thao thú vị nhé.</p>
              <a class="btn" href="${link('san-pham')}">Khám phá cửa hàng ${icon('arrow')}</a>
            </div>`
        }
      </div>
    </section>
  </main>`;
}
// Restored complete pages and checkout from the previous working source.
function checkout(){if(!cartCount())return `<main>${crumb([{text:'Thanh toán'}])}<section class="section container"><div class="empty"><h1>Giỏ hàng đang trống</h1><a class="btn" href="${link('san-pham')}">Chọn sản phẩm</a></div></section></main>`;const active=Boolean(fb&&user);const bankReady=Boolean(settings.bankName&&settings.bankAccount&&settings.bankHolder);return `<main>${crumb([{text:'Giỏ hàng',href:link('gio-hang')},{text:'Thanh toán'}])}<div class="page-intro"><div class="container"><h1>Thanh toán an toàn</h1><p>Thông tin đơn hàng sẽ được kiểm tra lại trên máy chủ.</p></div></div><section class="section sm"><div class="container checkout-layout"><div><div class="panel"><h3>01. Thông tin nhận hàng</h3>${!fb?'<div class="notice warning">Chưa kết nối dịch vụ bán hàng. Có thể xem giao diện, nhưng chưa thể gửi đơn hàng thật.</div>':!user?`<div class="notice warning">Vui lòng <a href="${link('dang-nhap')}"><u>đăng nhập Google</u></a> trước khi đặt hàng.</div>`:''}<form id="checkout-form"><div class="form-grid"><div class="field"><label for="co-name">Họ và tên *</label><input class="form-control" id="co-name" name="name" required maxlength="100" value="${escapeHTML(user?.displayName||'')}" placeholder="Nguyễn Văn A"/></div><div class="field"><label for="co-phone">Số điện thoại *</label><input class="form-control" id="co-phone" name="phone" type="tel" pattern="[0-9+ .-]{9,16}" required placeholder="09xxxxxxxx"/></div></div><div class="field"><label for="co-address">Địa chỉ giao hàng *</label><input class="form-control" id="co-address" name="address" required maxlength="260" placeholder="Số nhà, đường, phường, quận, tỉnh/thành"/></div><div class="field"><label for="co-note">Ghi chú (không bắt buộc)</label><textarea class="form-control" id="co-note" name="note" maxlength="500" rows="3" placeholder="Ví dụ: giao giờ hành chính"></textarea></div><h3 style="margin-top:20px">02. Phương thức thanh toán</h3><label class="payment-option"><input type="radio" name="payment" value="cod" checked/> <span><b>Thanh toán khi nhận hàng (COD)</b><br><small class="muted">Thanh toán cho đơn vị giao hàng sau khi nhận đơn.</small></span></label>${bankReady?`<label class="payment-option"><input type="radio" name="payment" value="bank"/> <span><b>Chuyển khoản ngân hàng</b><br><small class="muted">Thông tin và mã QR sẽ xuất hiện sau khi tạo đơn hợp lệ.</small></span></label>`:`<div class="notice">Chuyển khoản/QR sẽ khả dụng khi chủ cửa hàng cấu hình tài khoản nhận tiền.</div>`}<button class="btn block space-top" type="submit" ${active?'':'disabled'}>${icon('lock',17)} ${active?'Xác nhận đặt hàng':'Đặt hàng chưa khả dụng'}</button><div id="order-result" role="status"></div></form></div></div><aside class="panel"><h3>Đơn hàng (${cartCount()} sản phẩm)</h3>${cart.map(it=>{const p=getProduct(it.id);return p?`<div style="display:flex;gap:10px;align-items:center;margin-bottom:15px">${productPhoto(p,{width:56,height:56,small:true})}<div style="flex:1"><b style="font-size:11px">${escapeHTML(p.name)}</b><div class="muted text-small">${escapeHTML(it.variant||p.variants?.[0]||'Tiêu chuẩn')} • Số lượng: ${it.qty}</div></div><b style="font-size:11px">${money(price(p)*it.qty)}</b></div>`:''}).join('')}${totalsHtml(cartSubtotal())}</aside></div></section></main>`}
function intro(){return `<main>${crumb([{text:'Giới thiệu'}])}<div class="page-intro"><div class="container"><div class="eyebrow">WE ARE SPORTHUB</div><h1>Vận động theo cách của bạn</h1><p>Chúng tôi tin mỗi bước chân đều là một khởi đầu đáng giá.</p></div></div><section class="section"><div class="container"><div class="contact-grid" style="align-items:center"><div><div class="eyebrow">OUR STORY</div><h2>Không chỉ là những món đồ thể thao</h2><p style="color:#586980;line-height:2">SPORTHUB được xây dựng với mong muốn giúp mọi người tìm được trang phục và dụng cụ phù hợp với những hoạt động yêu thích. Dù bạn vừa làm quen với đường chạy, bước vào phòng gym hay khám phá pickleball, hãy bắt đầu từ niềm vui được vận động.</p><p style="color:#586980;line-height:2">Mẫu website này minh họa danh mục 40 sản phẩm thuộc 8 nhóm. Khi vận hành chính thức, chủ cửa hàng sẽ bổ sung thông tin và hình ảnh thực tế, tồn kho và chính sách cụ thể.</p><a href="${link('san-pham')}" class="btn">Khám phá cửa hàng ${icon('arrow')}</a></div><img style="border-radius:22px;max-height:460px;object-fit:cover;width:100%" src="${asset('assets/img/editorial/about.svg')}" alt="Hình minh họa tinh thần vận động"/></div></div></section><section class="section soft"><div class="container">${sectionTitle('GIÁ TRỊ CỐT LÕI','Mỗi ngày một phiên bản tốt hơn')}<div class="trustbar"><div class="trust-item">${icon('shield')} <b>Minh bạch</b></div><div class="trust-item">${icon('heart')} <b>Tích cực</b></div><div class="trust-item">${icon('truck')} <b>Thuận tiện</b></div><div class="trust-item">${icon('star')} <b>Tinh gọn</b></div></div></div></section></main>`}
function contact(){return `<main>${crumb([{text:'Liên hệ'}])}<div class="page-intro"><div class="container"><h1>Chúng tôi luôn sẵn sàng lắng nghe</h1><p>Bạn có câu hỏi về sản phẩm hoặc đơn hàng? Gửi tin nhắn cho SPORTHUB.</p></div></div><section class="section"><div class="container contact-grid"><div class="contact-card"><div class="eyebrow" style="color:var(--lime)">HELLO SPORTHUB</div><h2>Liên hệ với chúng tôi</h2><p>Thông tin liên hệ chỉ hiển thị khi chủ website đã cấu hình trên trang quản trị.</p><h3 style="margin-top:36px">✉ Email</h3><p>${settings.contactEmail?escapeHTML(settings.contactEmail):'Chưa thiết lập'}</p><h3>☎ Điện thoại</h3><p>${settings.phone?escapeHTML(settings.phone):'Chưa thiết lập'}</p><h3>⌂ Địa chỉ</h3><p>${settings.address?escapeHTML(settings.address):'Chưa thiết lập'}</p></div><div class="panel"><h3>Gửi lời nhắn</h3><p class="muted">Biểu mẫu mở ứng dụng email của bạn; website không lưu nội dung lời nhắn.</p><form id="contact-form"><div class="field"><label>Họ và tên *</label><input name="name" class="form-control" maxlength="100" required placeholder="Tên của bạn"/></div><div class="field"><label>Email của bạn *</label><input name="email" type="email" class="form-control" required placeholder="ban@example.com"/></div><div class="field"><label>Chủ đề *</label><input name="subject" class="form-control" maxlength="120" required placeholder="Bạn cần được hỗ trợ điều gì?"/></div><div class="field"><label>Nội dung *</label><textarea name="message" class="form-control" required maxlength="1500" placeholder="Nội dung tin nhắn..."></textarea></div>${!settings.contactEmail?'<div class="notice warning">Chưa cấu hình email nhận liên hệ nên chưa thể gửi.</div>':''}<button class="btn" ${settings.contactEmail?'':'disabled'}>Soạn email ${icon('arrow')}</button></form></div></div></section></main>`}
function blog(){return `<main>${crumb([{text:'Kiến thức thể thao'}])}<div class="page-intro"><div class="container"><div class="eyebrow">SPORT JOURNAL</div><h1>Góc kiến thức thể thao</h1><p>Những gợi ý nhỏ giúp hành trình vận động thú vị hơn.</p></div></div><section class="section"><div class="container">${blogCards(mergedPosts())}</div></section></main>`}
function mergedPosts(){return [...posts.map(p=>adminPosts.find(a=>a.slug===p.slug)?{...p,...adminPosts.find(a=>a.slug===p.slug)}:p),...adminPosts.filter(p=>!posts.some(x=>x.slug===p.slug))].filter(p=>p.published!==false)}
function article(){const p=mergedPosts().find(x=>x.slug===(slug||new URLSearchParams(location.search).get('p')));if(!p)return notFound();return `<main>${crumb([{text:'Kiến thức thể thao',href:link('bai-viet')},{text:p.title}])}<section class="section sm"><div class="container article-layout"><article class="article-content"><div class="eyebrow">${escapeHTML(p.category||'Kiến thức')} • ${escapeHTML(p.date||'')}</div><h1>${escapeHTML(p.title)}</h1><p style="font-size:17px;font-weight:700">${escapeHTML(p.intro)}</p><img class="article-cover" src="${asset(p.image)}" alt="${escapeHTML(p.title)}"/>${(Array.isArray(p.content)?p.content:[]).map((v,i)=>`<h2>${['Bắt đầu từ điều cơ bản','Duy trì thói quen phù hợp','Lắng nghe cơ thể'][i]||'Gợi ý dành cho bạn'}</h2><p>${escapeHTML(v)}</p>`).join('')}<div class="notice">Bài viết mang tính chia sẻ kiến thức chung, không thay thế lời khuyên từ chuyên gia.</div><a class="link-arrow" href="${link('bai-viet')}">← Trở lại bài viết</a></article><aside><div class="panel"><h3>Bài viết khác</h3>${mergedPosts().filter(x=>x.slug!==slug).map(x=>`<p><a href="${articleLink(x)}"><b>${escapeHTML(x.title)} ↗</b></a></p>`).join('')}</div></aside></div></section></main>`}
function policy(type){const privacy=type==='privacy';return `<main>${crumb([{text:privacy?'Bảo mật & điều khoản':'Chính sách mua hàng'}])}<div class="page-intro"><div class="container"><h1>${privacy?'Chính sách bảo mật & điều khoản':'Chính sách mua hàng'}</h1><p>Nguyên tắc minh bạch để bạn yên tâm khi sử dụng SPORTHUB.</p></div></div><section class="section"><div class="container static-copy">${privacy?`<h2>1. Thông tin thu thập</h2><p>Khi bạn đăng nhập Google và mua hàng (sau khi hệ thống được kết nối), SPORTHUB chỉ cần thông tin tài khoản, địa chỉ giao hàng, số điện thoại và dữ liệu đơn hàng để xử lý việc bán hàng. Không thu thập dữ liệu sức khỏe cá nhân.</p><h2>2. Mục đích sử dụng</h2><p>Dữ liệu được sử dụng để xác thực tài khoản, giao hàng, hỗ trợ và quản lý đơn hàng. CRM tổng thể chỉ cấp quyền cho quản trị viên đã được xác minh.</p><h2>3. Bảo vệ dữ liệu</h2><p>Hệ thống sử dụng quyền truy cập của backend và quy tắc cơ sở dữ liệu. Không lưu mật khẩu Google trong website. Dữ liệu quan trọng không đặt trong repository GitHub.</p><h2>4. Quyền của người sử dụng</h2><p>Bạn có thể yêu cầu chủ cửa hàng cập nhật hoặc xóa dữ liệu theo các quy định áp dụng. Thông tin liên hệ sẽ được hiển thị khi website chính thức vận hành.</p><h2>5. Điều khoản</h2><p>Danh mục và giá hiện tại mang tính minh họa. Mọi hoạt động thương mại chính thức sẽ tuân theo điều khoản đã công bố và xác nhận đơn hàng hợp lệ trên máy chủ.</p>`:`<h2>1. Đặt hàng</h2><p>Khách hàng chọn sản phẩm, nhập thông tin nhận hàng và xác nhận đặt hàng. Sau khi chủ website kích hoạt backend, hệ thống mới tiếp nhận đơn hàng và đối chiếu giá, tồn kho tại máy chủ.</p><h2>2. Thanh toán</h2><p>Hỗ trợ thanh toán khi nhận hàng (COD) và chuyển khoản khi chủ cửa hàng đã cấu hình thông tin ngân hàng. Việc đặt đơn không đồng nghĩa giao dịch chuyển khoản đã được thanh toán; trạng thái thanh toán được xác nhận riêng sau đối soát.</p><h2>3. Vận chuyển</h2><p>Mức phí mẫu trong giao diện là ${money(settings.shippingFee)} và miễn phí từ ${money(settings.freeShippingFrom)}. Phí giao thực tế, thời gian giao dự kiến và khu vực vận chuyển sẽ được cập nhật khi chính thức hoạt động.</p><h2>4. Đổi trả và bảo hành</h2><p>Điều kiện đổi trả, thời hạn tiếp nhận và phạm vi bảo hành cần được chủ cửa hàng công bố chính thức theo từng dòng sản phẩm trước khi mở bán. Liên hệ bộ phận hỗ trợ để được xác nhận thông tin cụ thể.</p><h2>5. Thông tin sản phẩm</h2><p>Hình ảnh và giá hiện là thông tin mẫu. SPORTHUB khuyến nghị khách hàng xác nhận chất liệu, kích thước và thông số khi sản phẩm thực tế được công bố.</p>`}</div></section></main>`}
function signIn(){return `<main>${crumb([{text:'Đăng nhập'}])}<div class="container auth-container"><div class="auth-card"><div class="logo-mark" style="margin:0 auto 20px">S</div><h1>${user?'Đã đăng nhập':'Chào mừng trở lại'}</h1><p class="muted">${user?'Bạn đang sử dụng tài khoản '+escapeHTML(user.email):'Đây là giao diện tài khoản mẫu. Chức năng đăng nhập chỉ hoạt động sau khi chủ website kích hoạt Google Authentication.'}</p>${!fb?'<div class="notice warning">Chưa kết nối Firebase. Cần điền cấu hình trong <b>js/site-config.js</b> và thiết lập Google Authentication.</div>':user?`<a class="btn block" href="${link('tai-khoan')}">Đến tài khoản của tôi</a><button class="btn outline block space-top" data-action="logout">Đăng xuất</button>`:`<button class="google-btn space-top" data-action="google"><span class="google-g">G</span> Tiếp tục với Google</button>`}<p class="text-small muted space-top">Bằng cách đăng nhập, bạn đồng ý với <a class="text-blue" href="${link('bao-mat')}">điều khoản và chính sách bảo mật</a>.</p></div></div></main>`}
function account(){if(!user)return `<main>${crumb([{text:'Tài khoản'}])}<section class="section container"><div class="auth-container auth-card"><h1>Tài khoản của tôi</h1><p class="muted">Đây là giao diện tài khoản mẫu. Đăng nhập và quản lý đơn hàng chưa khả dụng nếu dịch vụ chưa được kích hoạt.</p><a class="btn" href="${link('dang-nhap')}">Đăng nhập Google ${icon('arrow')}</a>${!fb?'<div class="notice warning">Chưa kết nối dịch vụ đăng nhập thực tế.</div>':''}</div></section></main>`;const tabNames={orders:'Đơn hàng của tôi',profile:'Thông tin cá nhân',favorites:'Yêu thích'};return `<main>${crumb([{text:'Tài khoản của tôi'}])}<div class="page-intro"><div class="container"><h1>Xin chào, ${escapeHTML(user.displayName||'bạn')} 👋</h1><p>Quản lý thông tin của bạn cùng SPORTHUB.</p></div></div><section class="section sm"><div class="container account-grid"><aside class="side-nav">${Object.entries(tabNames).map(([k,v])=>`<button class="${accountTab===k?'active':''}" data-action="account-tab" data-tab="${k}">${escapeHTML(v)}</button>`).join('')}${isAdmin?`<a href="${link('quan-tri')}">Quản trị website ↗</a>`:''}<button data-action="logout">Đăng xuất</button></aside><div class="panel" id="account-content">${accountContent()}</div></div></section></main>`}
function accountContent(){if(accountTab==='favorites'){const items=products.filter(p=>favorites.includes(p.id));return `<h3>Danh sách yêu thích (${items.length})</h3>${items.length?productGrid(items):'<div class="empty"><p>Chưa có sản phẩm yêu thích.</p><a class="btn" href="'+link('san-pham')+'">Khám phá sản phẩm</a></div>'}`}
if(accountTab==='profile')return `<h3>Thông tin cá nhân</h3><p class="muted">Email xác thực: <b>${escapeHTML(user.email)}</b></p><form id="profile-form"><div class="field"><label>Họ và tên</label><input class="form-control" name="displayName" value="${escapeHTML(user.displayName||'')}" required maxlength="100"/></div><div class="field"><label>Số điện thoại (không bắt buộc)</label><input class="form-control" name="phone" value="${escapeHTML(user._phone||'')}" maxlength="20"/></div><div class="field"><label>Địa chỉ mặc định</label><textarea name="address" class="form-control" maxlength="260">${escapeHTML(user._address||'')}</textarea></div><button class="btn">Lưu thông tin</button></form>`;
return `<h3>Đơn hàng của tôi</h3><div id="my-orders"><p class="muted">${fb?'Đang kiểm tra đơn hàng...':'Không có dữ liệu đơn hàng khi chưa kết nối.'}</p></div>`}
function notFound(){return `<main><section class="section"><div class="container empty"><div class="emoji">404</div><h1>Không tìm thấy trang</h1><p>Nội dung bạn tìm kiếm chưa tồn tại hoặc đã thay đổi.</p><a class="btn" href="${link()}">Về trang chủ ${icon('arrow')}</a></div></section></main>`}

function render(){
  let content;

  switch(page){
    case 'home': content=home();break;
    case 'shop': content=new URLSearchParams(location.search).has('p')?detail():shop();break;
    case 'category': content=shop();break;
    case 'product': content=detail();break;
    case 'cart': content=cartPage();break;
    case 'checkout': content=checkout();break;
    case 'about': content=intro();break;
    case 'contact': content=contact();break;
    case 'blog': content=new URLSearchParams(location.search).has('p')?article():blog();break;
    case 'article': content=article();break;
    case 'policy': content=policy('shopping');break;
    case 'privacy': content=policy('privacy');break;
    case 'login': content=signIn();break;
    case 'account': content=account();break;
    case 'admin': content=adminPage();break;
    default: content=notFound();
  }

  document.getElementById('app').innerHTML=
    photoStyles()+
    (page==='admin'?'':header())+
    content+
    (page==='admin'?'':footer());

  updateCartBadge();
  checkProductPhotos();
  metaUpdate();

  if(page==='account'&&accountTab==='orders'){
    loadMyOrders();
  }
}

// Preserve static SEO metadata and use clean canonical URLs.
function metaUpdate(){
  const params = new URLSearchParams(location.search);
  const dynamicSlug = params.get('p');
  const dynamicProduct = page === 'shop' && Boolean(dynamicSlug);
  const dynamicArticle = page === 'blog' && Boolean(dynamicSlug);
  const isDynamic = dynamicProduct || dynamicArticle;

  const selectedProduct = (page === 'product' || dynamicProduct)
    ? products.find(p => p.slug === (dynamicSlug || slug))
    : null;

  const selectedArticle = (page === 'article' || dynamicArticle)
    ? mergedPosts().find(p => p.slug === (dynamicSlug || slug))
    : null;

  // Preserve SEO title and description written in static HTML.
  if(isDynamic){
    const selected = selectedProduct || selectedArticle;

    if(selected){
      document.title = (selected.name || selected.title) + ' | SPORTHUB';

      document.querySelector('meta[name="description"]')
        ?.setAttribute('content',selected.short || selected.intro || '');
    }
  }

  if(FILE) return;

  const baseURL = location.origin +
    location.pathname.replace(/\/index\.html$/i,'/');

  const canonicalURL = isDynamic
    ? baseURL + '?p=' + encodeURIComponent(dynamicSlug)
    : baseURL;

  let canonical = document.querySelector('link[rel="canonical"]');

  if(!canonical){
    canonical = document.createElement('link');
    canonical.rel = 'canonical';
    document.head.append(canonical);
  }

  if(
    isDynamic ||
    !canonical.getAttribute('href') ||
    /\/index\.html(?:$|[?#])/i.test(canonical.href)
  ){
    canonical.href = canonicalURL;
  }

  const ogURL = document.querySelector('meta[property="og:url"]');

  if(
    ogURL &&
    (
      isDynamic ||
      /\/index\.html(?:$|[?#])/i.test(ogURL.content)
    )
  ){
    ogURL.content = canonical.href;
  }

  const chosenImage = selectedProduct?.image || selectedArticle?.image;
  const ogImage = document.querySelector('meta[property="og:image"]');

  if(ogImage && chosenImage && isDynamic &&
    (!selectedProduct || document.querySelector('.detail-image img.sh-photo-real')?.naturalWidth>0)){
    ogImage.content = asset(chosenImage);
  }

  // Avoid duplicate Product/Article schema in static HTML.
  const targetType = selectedProduct
    ? 'Product'
    : selectedArticle
      ? 'Article'
      : '';

  const hasStaticType = targetType &&
    [...document.querySelectorAll('script[type="application/ld+json"]')]
      .filter(el => el.id !== 'structured-data')
      .some(el => {
        try{
          return JSON.stringify(JSON.parse(el.textContent))
            .includes('"'+targetType+'"');
        }catch{
          return false;
        }
      });

  if(!targetType || hasStaticType){
    document.getElementById('structured-data')?.remove();
    return;
  }

  const schema = selectedProduct
    ? schemaProduct(selectedProduct)
    : schemaArticle(selectedArticle);

  if(!schema) return;

  let sd = document.getElementById('structured-data');

  if(!sd){
    sd = document.createElement('script');
    sd.type = 'application/ld+json';
    sd.id = 'structured-data';
    document.head.append(sd);
  }

  sd.textContent = JSON.stringify(schema);
}

function schemaProduct(p){
  if(!p)return null;
  const result = {
    '@context':'https://schema.org',
    '@type':'Product',
    name:p.name,
    description:p.description||p.short,
    sku:p.id,
    url:productLink(p),
    category:catName(p)
    // No Offer/AggregateRating while pricing and inventory are samples.
  };
  const loadedPhoto = document.querySelector('.detail-image img.sh-photo-real');
  if(loadedPhoto?.complete && loadedPhoto.naturalWidth>0){
    result.image=[asset(p.image)];
  }
  return result;
}

function schemaArticle(p){
  if(!p)return null;

  return {
    '@context':'https://schema.org',
    '@type':'Article',
    headline:p.title,
    description:p.intro,
    image:[asset(p.image)],
    publisher:{
      '@type':'Organization',
      name:'SPORTHUB'
    }
  };
}

function onFilterChange(restoreSearchFocus=false){
  const queryInput=document.getElementById('filter-q');

  shopFilters.q=page==='category'
    ? ''
    : (queryInput?.value.trim()||'');

  shopFilters.category=document.getElementById('filter-cat')?.value||'';
  shopFilters.max=document.getElementById('filter-max')?.value||'';
  shopFilters.sort=document.getElementById('filter-sort')?.value||'new';
  shopFilters.sale=Boolean(document.getElementById('filter-sale')?.checked);

  render();

  if(page==='shop' && restoreSearchFocus){
    document.getElementById('filter-q')?.focus();
  }
}

function setCartQty(id,variant,delta){
  const p=getProduct(id);
  const choice=variant||p?.variants?.[0]||'Tiêu chuẩn';

  const it=cart.find(x=>
    x.id===id &&
    (x.variant||p?.variants?.[0]||'Tiêu chuẩn')===choice
  );

  if(it){
    it.qty+=delta;

    if(it.qty<=0){
      cart=cart.filter(x=>x!==it);
    }

    it.qty=Math.min(it.qty,99);
    store('sporthub-cart',cart);
    render();
  }
}

// Firebase initialization keeps static preview available.
async function initFirebase(){
  const options=cfg.firebase;

  if(!options?.apiKey||!options?.projectId||!options?.appId){
    authReady=true;
    render();
    return;
  }

  try{
    const [appMod,authMod,dbMod,fnMod] = await Promise.all([
      import('https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js'),
      import('https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js'),
      import('https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js'),
      import('https://www.gstatic.com/firebasejs/10.14.1/firebase-functions.js')
    ]);

    const app=appMod.initializeApp(options);
    const auth=authMod.getAuth(app);
    const db=dbMod.getFirestore(app);
    const fns=fnMod.getFunctions(
      app,
      cfg.region||'asia-southeast1'
    );

    fb={
      auth,
      db,
      fns,
      ...authMod,
      ...dbMod,
      ...fnMod
    };

    fb.onAuthStateChanged(auth,async u=>{
      user=u;
      isAdmin=false;

      try{
        if(u){
          const token=await u.getIdTokenResult();

          isAdmin=
            token.claims.admin===true &&
            u.emailVerified===true &&
            u.email?.toLowerCase()==='tranthiquynhnhu0901@gmail.com';

          await ensureUser();
        }
      }catch(e){
        console.warn('Auth profile:',e.message);
      }

      authReady=true;
      render();

      if(page==='admin'&&isAdmin){
        loadAdmin();
      }
    });

    fb.onSnapshot(
      fb.collection(db,'catalog'),
      snap=>{
        if(!snap.empty){
          const live=snap.docs.map(d=>({...d.data(),id:d.id}));
          const map=new Map(products.map(p=>[p.id,p]));

          live.forEach(p=>map.set(p.id,p));

          products=[...map.values()].filter(x=>!x.archived);
          render();
        }
      },
      ()=>{}
    );

    fb.onSnapshot(
      fb.doc(db,'site','settings'),
      snap=>{
        if(snap.exists()){
          settings={...defaults,...snap.data()};
          render();
        }
      },
      ()=>{}
    );

    fb.onSnapshot(
      fb.collection(db,'posts'),
      snap=>{
        adminPosts=snap.docs.map(d=>({...d.data(),slug:d.id}));

        if(['home','blog','article'].includes(page)){
          render();
        }
      },
      ()=>{}
    );

  }catch(e){
    console.error('Firebase initialization failed:',e);

    notify(
      'Không thể kết nối Firebase. Kiểm tra cấu hình hoặc mạng.',
      'error'
    );

    authReady=true;
    render();
  }
}

async function ensureUser(){
  if(!fb||!user)return;

  const ref=fb.doc(fb.db,'users',user.uid);
  const snap=await fb.getDoc(ref);

  if(!snap.exists()){
    await fb.setDoc(ref,{
      uid:user.uid,
      email:user.email,
      displayName:user.displayName||'',
      phone:'',
      address:'',
      favorites:[],
      createdAt:fb.serverTimestamp()
    });
  }else{
    user._phone=snap.data().phone||'';
    user._address=snap.data().address||'';
    favorites=snap.data().favorites||favorites;
  }
}

async function loginGoogle(){
  if(!fb){
    return notify('Chưa kết nối dịch vụ Google.','error');
  }

  try{
    await fb.signInWithPopup(
      fb.auth,
      new fb.GoogleAuthProvider()
    );

    location.href=link('tai-khoan');
  }catch(e){
    notify(
      'Đăng nhập không thành công: '+e.message,
      'error'
    );
  }
}

async function logout(){
  if(fb){
    await fb.signOut(fb.auth);
    location.href=link();
  }
}

async function loadMyOrders(){
  const el=document.getElementById('my-orders');
  if(!fb||!user||!el)return;

  try{
    const snap=await fb.getDocs(
      fb.query(
        fb.collection(fb.db,'orders'),
        fb.where('userId','==',user.uid)
      )
    );

    const orders=snap.docs.map(d=>({
      id:d.id,
      ...d.data()
    })).sort(
      (a,b)=>(b.createdAt?.seconds||0)-(a.createdAt?.seconds||0)
    );

    el.innerHTML=orders.length
      ? orders.map(o=>`
          <div class="order-row">
            <b>Đơn #${escapeHTML(o.id)} — ${money(o.total)}</b>
            <span class="tag">${escapeHTML(statusVi(o.status))}</span>
            <p class="muted text-small" style="margin:4px 0">
              ${(o.items||[]).map(x=>
                escapeHTML(x.name)+
                ' ('+escapeHTML(x.variant||'Tiêu chuẩn')+') × '+
                x.qty
              ).join(' · ')}
            </p>
            <small>Thanh toán: ${escapeHTML(statusVi(o.paymentStatus))}</small>
          </div>
        `).join('')
      : '<div class="empty"><p>Bạn chưa có đơn hàng nào.</p><a class="btn" href="'+link('san-pham')+'">Mua sắm ngay</a></div>';

  }catch(e){
    el.innerHTML=
      '<div class="notice warning">Không thể tải đơn hàng: '+
      escapeHTML(e.message)+
      '</div>';
  }
}

async function call(name,payload){
  if(!fb||!user){
    throw new Error('Chưa kết nối hoặc chưa đăng nhập');
  }

  const fn=fb.httpsCallable(fb.fns,name);
  return (await fn(payload)).data;
}

async function submitOrder(form){
  if(!fb||!user){
    return notify('Cần đăng nhập và kết nối backend.','error');
  }

  const button=form.querySelector('[type="submit"]');
  button.disabled=true;
  button.innerHTML='<span class="spinner"></span> Đang xác nhận...';

  const data=new FormData(form);

  try{
    const result=await call('placeOrder',{
      items:cart.map(({id,qty,variant})=>({
        id,
        qty,
        variant:variant||getProduct(id)?.variants?.[0]||'Tiêu chuẩn'
      })),
      shipping:{
        name:data.get('name'),
        phone:data.get('phone'),
        address:data.get('address'),
        note:data.get('note')||''
      },
      paymentMethod:data.get('payment')
    });

    cart=[];
    store('sporthub-cart',cart);

    document.getElementById('order-result').innerHTML=`
      <div class="notice success">
        <b>✓ Đặt hàng thành công!</b><br>
        Mã đơn: <b>${escapeHTML(result.orderId)}</b><br>
        Tổng thanh toán: ${money(result.total)}<br>
        Trạng thái: Chờ xác nhận.
        ${result.paymentMethod==='bank'
          ? '<br>Đơn hiện CHƯA được xác nhận thanh toán.'
          : ''
        }
      </div>
    `+
    (
      result.paymentMethod==='bank'&&settings.bankAccount
        ? bankReceipt(result)
        : ''
    )+
    `<a class="btn sm space-top" href="${link('tai-khoan')}">Theo dõi đơn hàng</a>`;

    updateCartBadge();

    form.querySelectorAll('input,textarea,button').forEach(
      x=>x.disabled=true
    );

    notify('Đơn hàng đã được lưu lên hệ thống.','success');

  }catch(e){
    notify('Không thể tạo đơn: '+e.message,'error');
    button.disabled=false;
    button.textContent='Xác nhận đặt hàng';
  }
}

function bankReceipt(order){
  const description='SPORTHUB '+order.orderId;

  const qr=`https://img.vietqr.io/image/${encodeURIComponent(settings.bankId||settings.bankName)}-${encodeURIComponent(settings.bankAccount)}-compact2.png?amount=${encodeURIComponent(order.total)}&addInfo=${encodeURIComponent(description)}&accountName=${encodeURIComponent(settings.bankHolder)}`;

  return `<div class="bank-details">
    <b>Thông tin chuyển khoản</b>
    <p>
      Ngân hàng: ${escapeHTML(settings.bankName)}<br>
      STK: <b>${escapeHTML(settings.bankAccount)}</b><br>
      Người nhận: ${escapeHTML(settings.bankHolder)}<br>
      Nội dung: <b>${escapeHTML(description)}</b>
    </p>
    <img src="${qr}" alt="Mã QR thanh toán VietQR" referrerpolicy="no-referrer">
    <small>Hãy kiểm tra tên người nhận trong ứng dụng ngân hàng. Chuyển khoản không được tự đánh dấu là đã thanh toán.</small>
  </div>`;
}
function adminGate(){
  if(isAdmin)return 'live';
  if(demoAdmin)return 'demo';
  return 'locked';
}

function adminPage(){
  const gate=adminGate();

  if(gate==='locked'){
    return `<main>${crumb([{text:'Quản trị website'}])}
      <section class="section container">
        <div class="auth-container auth-card">
          <div style="font-size:42px">🔐</div>
          <h1>Khu vực quản trị</h1>
          <p class="muted">Chỉ tài khoản đã được cấp quyền quản trị trên backend mới có thể truy cập dữ liệu và thay đổi website.</p>
          ${!fb
            ? '<div class="notice warning">Firebase chưa được cấu hình.</div>'
            : !user
              ? `<a class="btn" href="${link('dang-nhap')}">Đăng nhập Google</a>`
              : '<div class="notice warning">Tài khoản hiện tại không có quyền quản trị.</div>'
          }
          <a class="btn outline block space-top" href="${link('quan-tri')}?demo=1">Xem trước giao diện (chỉ đọc)</a>
          <a class="btn ghost block sm space-top" href="${link()}">Về trang chủ</a>
        </div>
      </section>
    </main>`;
  }

  const nav=[
    ['dashboard','Tổng quan'],
    ['products','Sản phẩm'],
    ['orders','Đơn hàng'],
    ['crm','CRM khách hàng'],
    ['content','Bài viết & banner'],
    ['ai','Xưởng tạo ảnh AI'],
    ['media','Thư viện ảnh'],
    ['settings','Cài đặt website']
  ];

  return `<main class="admin-page"><div class="admin-shell"><aside class="admin-aside"><a class="logo" href="${link()}"><span class="logo-mark">S</span><span class="logo-type"><b>SPORT<span style="color:var(--lime)">HUB</span></b><small>TRANG QUẢN TRỊ</small></span></a><h4>ĐIỀU HƯỚNG</h4><div class="admin-menu">${nav.map(([id,label])=>`<button class="${adminTab===id?'active':''}" data-action="admin-tab" data-tab="${id}">${escapeHTML(label)}</button>`).join('')}</div></aside><div class="admin-main">${gate==='demo'?'<div class="notice warning">CHẾ ĐỘ XEM TRƯỚC: chỉ hiển thị giao diện. Không có dữ liệu khách hàng thật, không có quyền sửa, tạo ảnh hoặc xác nhận thanh toán.</div>':''}<div class="admin-titlebar"><div><h1>${escapeHTML(nav.find(x=>x[0]===adminTab)?.[1]||'Quản trị')}</h1><p>${gate==='live'?'Quản lý nội dung và dữ liệu được bảo vệ trên hệ thống.':'Bản trình diễn thiết kế giao diện quản trị.'}</p></div><a class="btn outline sm" href="${link()}">↗ Xem cửa hàng</a></div><div id="admin-content">${adminContent(gate)}</div></div></div></main>`;
}
function adminContent(gate){
  if(adminTab==='dashboard'){
    const count=gate==='live'?adminOrders.length:0;
    const revenue=gate==='live'
      ? adminOrders
          .filter(x=>x.paymentStatus==='paid'&&x.status!=='cancelled')
          .reduce((s,x)=>s+Number(x.total||0),0)
      : 0;

    return `<div class="stat-grid">
      <div class="stat-card"><small>Sản phẩm đang hiển thị</small><b>${products.length}</b></div>
      <div class="stat-card"><small>Đơn hàng</small><b>${count}</b></div>
      <div class="stat-card"><small>Khách hàng</small><b>${gate==='live'?adminCustomers.length:0}</b></div>
      <div class="stat-card"><small>Doanh thu đã đối soát</small><b style="font-size:18px">${money(revenue)}</b></div>
    </div>
    <div class="admin-grid">
      <div class="panel">
        <h3>Trạng thái hệ thống</h3>
        <div class="order-row"><b>Trang bán hàng tĩnh</b><span class="tag lime">Sẵn sàng xem trước</span></div>
        <div class="order-row"><b>Firebase / Đơn hàng</b><span class="tag ${fb?'lime':'orange'}">${fb?'Đã kết nối cấu hình':'Chưa kết nối'}</span></div>
        <div class="order-row"><b>Phân quyền quản trị</b><span class="tag ${isAdmin?'lime':'orange'}">${isAdmin?'Đã xác minh':'Chưa cấp quyền'}</span></div>
        <div class="order-row"><b>API tạo ảnh AI</b><span class="tag gray">${gate==='live'?'Chưa xác minh kết nối':'Không khả dụng trong bản xem trước'}</span></div>
      </div>
      <div class="panel">
        <h3>Công việc cần hoàn tất</h3>
        <p class="muted">• Kết nối Firebase và kích hoạt Google Authentication.</p>
        <p class="muted">• Cấp custom claim cho tài khoản quản trị.</p>
        <p class="muted">• Nhập danh mục 40 sản phẩm mẫu vào Firestore.</p>
        <p class="muted">• Cấu hình API tạo ảnh và tài khoản ngân hàng.</p>
        ${gate==='live'
          ? '<button class="btn sm" data-action="seed">Nhập 40 sản phẩm mẫu lên hệ thống</button>'
          : '<div class="notice">Thao tác chỉ dành cho quản trị viên thật.</div>'
        }
      </div>
    </div>`;
  }

  if(adminTab==='products'){
    return `<div class="panel"><div class="section-header"><div><h3>Quản lý sản phẩm</h3><p class="muted">Mỗi sản phẩm có hình ảnh và dữ liệu riêng.</p></div>${gate==='live'?'<button class="btn sm" data-action="new-product">+ Thêm sản phẩm</button>':''}</div><div class="table-wrap"><table class="data-table"><thead><tr><th>Sản phẩm</th><th>Danh mục</th><th>Giá</th><th>Kho</th><th>Thao tác</th></tr></thead><tbody>${products.slice(0,60).map(p=>`<tr><td><div style="display:flex;align-items:center;gap:9px">${productPhoto(p,{width:54,height:54,small:true})}<span class="mini-title">${escapeHTML(p.name)}<br><small class="muted">${p.id}</small></span></div></td><td>${escapeHTML(catName(p.category))}</td><td>${money(price(p))}</td><td>${p.stock}</td><td>${gate==='live'?`<button class="btn sm ghost" data-action="edit-product" data-id="${p.id}">Sửa</button> <button class="btn sm outline" data-action="delete-product" data-id="${p.id}">Ẩn</button>`:'Chỉ xem'}</td></tr>`).join('')}</tbody></table></div></div><div id="admin-modal"></div>`;
  }

  if(adminTab==='orders'){
    return `<div class="panel"><h3>Đơn hàng đã nhận</h3>${gate==='demo'?'<div class="empty"><h3>Không hiển thị đơn hàng mẫu</h3><p>Chỉ dữ liệu thật sau đăng nhập quản trị mới xuất hiện tại đây.</p></div>':adminOrders.length?`<div class="table-wrap"><table class="data-table"><thead><tr><th>Mã đơn</th><th>Khách hàng</th><th>Tổng</th><th>Thanh toán</th><th>Trạng thái</th><th>Cập nhật</th></tr></thead><tbody>${adminOrders.map(o=>`<tr><td>${escapeHTML(o.id)}</td><td>${escapeHTML(o.shipping?.name||'')}<br><small>${escapeHTML(o.shipping?.phone||'')}</small></td><td>${money(o.total)}</td><td>${escapeHTML(statusVi(o.paymentStatus))}</td><td>${escapeHTML(statusVi(o.status))}</td><td><select class="form-control" data-action="order-status" data-id="${escapeHTML(o.id)}"><option value="">Cập nhật</option>${['pending','confirmed','shipping','completed','cancelled'].map(s=>`<option value="${s}">${statusVi(s)}</option>`).join('')}</select>${o.paymentStatus!=='paid'&&o.status!=='cancelled'?`<button class="btn sm outline space-top" data-action="mark-paid" data-id="${escapeHTML(o.id)}">Xác nhận đã nhận tiền</button>`:''}</td></tr>`).join('')}</tbody></table></div>`:'<div class="empty"><p>Chưa có đơn hàng thật trên hệ thống.</p></div>'}</div>`;
  }

  if(adminTab==='crm'){
    return `<div class="panel"><div class="section-header"><div><h3>CRM khách hàng</h3><p class="muted">Dữ liệu chỉ dành cho quản trị viên có quyền hợp lệ.</p></div>${gate==='live'?'<button class="btn sm outline" data-action="export-crm">Xuất CSV</button>':''}</div><input id="crm-search" class="form-control space-bottom" placeholder="Tìm theo họ tên, email hoặc số điện thoại"><div id="crm-results">${gate==='demo'?'<div class="empty"><h3>CRM được bảo vệ</h3><p>Bản xem trước không sử dụng và không mô phỏng thông tin khách hàng cá nhân.</p></div>':customerRows(adminCustomers)}</div></div><div id="customer-detail"></div>`;
  }

  if(adminTab==='content'){
    return `<div class="admin-grid">
      <div class="panel">
        <h3>Banner & trang chủ</h3>
        <form id="banner-form">
          <div class="field"><label>Tiêu đề trang chủ</label><input class="form-control" name="headline" value="${escapeHTML(settings.headline)}" ${gate==='demo'?'disabled':''}></div>
          <div class="field"><label>Mô tả banner</label><textarea class="form-control" name="promo" ${gate==='demo'?'disabled':''}>${escapeHTML(settings.promo)}</textarea></div>
          <div class="field"><label>URL ảnh banner chính</label><input class="form-control" name="heroImage" value="${escapeHTML(settings.heroImage||'')}" placeholder="Chọn ảnh từ thư viện hoặc URL HTTPS" ${gate==='demo'?'disabled':''}></div>
          <div class="field"><label>URL ảnh khuyến mãi</label><input class="form-control" name="saleImage" value="${escapeHTML(settings.saleImage||'')}" placeholder="URL HTTPS" ${gate==='demo'?'disabled':''}></div>
          ${gate==='live'?'<button class="btn">Lưu banner trang chủ</button>':'<div class="notice">Chỉ hiển thị giao diện chỉnh sửa.</div>'}
        </form>
      </div>
      <div class="panel">
        <h3>Quản lý bài viết</h3>
        <p class="muted">Chỉnh sửa bài viết mẫu hoặc bổ sung nội dung mới.</p>
        <form id="post-form">
          <div class="field"><label>Đường dẫn bài viết (slug)</label><input class="form-control" name="slug" placeholder="huong-dan-tap-luyen" required ${gate==='demo'?'disabled':''}></div>
          <div class="field"><label>Tiêu đề</label><input class="form-control" name="title" required ${gate==='demo'?'disabled':''}></div>
          <div class="field"><label>Mô tả ngắn</label><textarea class="form-control" name="intro" required ${gate==='demo'?'disabled':''}></textarea></div>
          <div class="field"><label>Nội dung (các đoạn ngăn bằng dòng trống)</label><textarea class="form-control" name="content" rows="5" ${gate==='demo'?'disabled':''}></textarea></div>
          <div class="field"><label>Ảnh (URL HTTPS / ảnh thư viện)</label><input class="form-control" name="image" placeholder="https://..." ${gate==='demo'?'disabled':''}></div>
          ${gate==='live'?'<button class="btn">Lưu bài viết</button>':'<div class="notice">Bài viết mới chỉ lưu được khi có backend.</div>'}
        </form>
      </div>
    </div>`;
  }

  if(adminTab==='ai'){
    return `<div class="admin-grid"><div class="panel"><div class="eyebrow">AI CREATIVE STUDIO</div><h3>Xưởng tạo hình ảnh AI</h3><p class="muted">Tạo ảnh mới qua API server, xem trước rồi lưu vào thư viện.</p><div class="notice ${gate==='demo'?'warning':''}">${gate==='demo'?'Chưa kết nối ở chế độ xem trước. Không có ảnh tạo giả.':'Trạng thái API: chưa xác minh kết nối. Hãy cấu hình OPENAI_API_KEY trên Firebase Functions trước khi sử dụng.'}</div><form id="ai-form"><div class="field"><label>Mô tả bằng tiếng Việt *</label><textarea name="prompt" class="form-control" required minlength="15" maxlength="1500" placeholder="Ví dụ: Ảnh quảng cáo đôi giày chạy bộ trên đường đua, ánh sáng sáng sớm, không có logo..." ${gate==='demo'?'disabled':''}></textarea></div><div class="field"><label>Loại hình ảnh</label><select name="type" class="form-control" ${gate==='demo'?'disabled':''}><option>Ảnh sản phẩm</option><option>Banner trang chủ</option><option>Banner khuyến mãi</option><option>Ảnh danh mục</option><option>Ảnh bài viết</option></select></div><div class="form-grid"><div class="field"><label>Phong cách</label><select name="style" class="form-control" ${gate==='demo'?'disabled':''}><option>Thể thao chân thực</option><option>Studio cao cấp</option><option>Năng động ngoài trời</option><option>Đồ họa tối giản</option></select></div><div class="field"><label>Tỷ lệ</label><select name="ratio" class="form-control" ${gate==='demo'?'disabled':''}><option value="1:1">1:1 — Vuông</option><option value="3:2">3:2 — Ngang</option><option value="2:3">2:3 — Dọc</option></select></div></div>${gate==='live'?'<button class="btn" type="submit">✦ Tạo ảnh thật qua AI</button>':'<button class="btn" disabled>Chưa thể tạo ảnh</button>'}</form><p class="admin-note">Không dùng AI tạo ảnh sai thực tế cho sản phẩm mang thương hiệu thật.</p></div><div class="panel"><h3>Ảnh kết quả</h3><div class="editor-preview" id="ai-preview">Ảnh được tạo từ backend sẽ xuất hiện tại đây.</div><p class="admin-note">Ảnh được kiểm tra SHA-256 và độ tương đồng trước khi lưu. Tác vụ tạo ảnh cần khóa API trên máy chủ.</p></div></div>`;
  }

  if(adminTab==='media'){
    return `<div class="panel"><div class="section-header"><div><h3>Thư viện ảnh</h3><p class="muted">Ảnh đã tạo hoặc tải lên được lưu trên dịch vụ đám mây.</p></div></div>${gate==='live'?'<form id="upload-form" class="space-bottom"><label class="filter-label">Tải ảnh mới (PNG/JPEG/WebP, tối đa 4 MB)</label><input type="file" class="form-control" name="file" accept="image/png,image/jpeg,image/webp" required><button class="btn sm space-top">Kiểm tra trùng & tải lên</button></form>':''}<div id="media-gallery" class="category-grid">${adminMedia.length?adminMedia.map(m=>`<div class="category-card"><img src="${asset(m.url)}" alt="${escapeHTML(m.label||'Ảnh thư viện')}" loading="lazy"><div class="category-caption"><small>${escapeHTML(m.label||m.id||'')}</small>${gate==='live'?`<button class="btn ghost sm block" data-action="copy-media" data-url="${escapeHTML(m.url)}">Sao chép URL</button><button class="btn outline sm block space-top" data-action="delete-media" data-id="${escapeHTML(m.id)}">Xóa khỏi thư viện</button>`:''}</div></div>`).join(''):'<div class="empty" style="grid-column:1/-1">Chưa có ảnh nào trong thư viện.</div>'}</div></div>`;
  }

  if(adminTab==='settings'){
    return `<div class="panel" style="max-width:760px">
      <h3>Thông tin cửa hàng & thanh toán</h3>
      <form id="settings-form">
        <div class="admin-form">
          <div class="field"><label>Email liên hệ công khai</label><input class="form-control" name="contactEmail" type="email" value="${escapeHTML(settings.contactEmail)}" ${gate==='demo'?'disabled':''}></div>
          <div class="field"><label>Hotline</label><input class="form-control" name="phone" value="${escapeHTML(settings.phone)}" ${gate==='demo'?'disabled':''}></div>
          <div class="field wide"><label>Địa chỉ</label><input class="form-control" name="address" value="${escapeHTML(settings.address)}" ${gate==='demo'?'disabled':''}></div>
          <div class="field"><label>Phí vận chuyển tham khảo (VND)</label><input class="form-control" type="number" min="0" name="shippingFee" value="${settings.shippingFee}" ${gate==='demo'?'disabled':''}></div>
          <div class="field"><label>Miễn phí vận chuyển từ (VND)</label><input class="form-control" type="number" min="0" name="freeShippingFrom" value="${settings.freeShippingFrom}" ${gate==='demo'?'disabled':''}></div>
          <div class="field"><label>Ngân hàng</label><input class="form-control" name="bankName" value="${escapeHTML(settings.bankName)}" ${gate==='demo'?'disabled':''}></div>
          <div class="field"><label>Mã ngân hàng (VietQR)</label><input class="form-control" name="bankId" value="${escapeHTML(settings.bankId)}" ${gate==='demo'?'disabled':''}></div>
          <div class="field"><label>Số tài khoản nhận tiền</label><input class="form-control" name="bankAccount" value="${escapeHTML(settings.bankAccount)}" ${gate==='demo'?'disabled':''}></div>
          <div class="field"><label>Tên chủ tài khoản</label><input class="form-control" name="bankHolder" value="${escapeHTML(settings.bankHolder)}" ${gate==='demo'?'disabled':''}></div>
        </div>
        ${gate==='live'?'<button class="btn space-top">Lưu cấu hình</button>':'<div class="notice warning">Bản xem trước không cho phép lưu cấu hình.</div>'}
      </form>
    </div>`;
  }

  return '';
}

function statusVi(status){
  return ({
    pending:'Chờ xác nhận',
    confirmed:'Đã xác nhận',
    shipping:'Đang giao',
    completed:'Hoàn tất',
    cancelled:'Đã hủy',
    paid:'Đã thanh toán',
    unpaid:'Chưa thanh toán'
  })[status]||status||'Chưa cập nhật';
}

function customerRows(items){
  if(!items.length){
    return '<div class="empty">Chưa có hồ sơ khách hàng trong cơ sở dữ liệu.</div>';
  }

  return `<div class="table-wrap"><table class="data-table"><thead><tr><th>Khách hàng</th><th>Email</th><th>Điện thoại</th><th>Đơn hàng</th><th>Hành động</th></tr></thead><tbody>${items.map(x=>`<tr><td><b>${escapeHTML(x.displayName||'Chưa cung cấp')}</b></td><td>${escapeHTML(x.email||'')}</td><td>${escapeHTML(x.phone||'—')}</td><td>${x.orderCount||0}</td><td><button class="btn sm outline" data-action="customer-detail" data-id="${escapeHTML(x.uid||x.id)}">Xem hồ sơ</button></td></tr>`).join('')}</tbody></table></div>`;
}

async function loadAdmin(){
  if(!isAdmin||!fb)return;

  try{
    if(['dashboard','orders'].includes(adminTab)){
      const r=await call('adminListOrders',{limit:100});
      adminOrders=r.orders||[];
    }

    if(['dashboard','crm'].includes(adminTab)){
      const r=await call('adminListCustomers',{limit:150});
      adminCustomers=r.customers||[];
    }

    if(adminTab==='media'||adminTab==='ai'){
      const snap=await fb.getDocs(fb.collection(fb.db,'media'));
      adminMedia=snap.docs.map(d=>({id:d.id,...d.data()}));
    }

    const el=document.getElementById('admin-content');

    if(el){
      el.innerHTML=adminContent('live');
    }
  }catch(e){
    notify('Quản trị: '+e.message,'error');
  }
}

function productEditor(p){
  const data=p||{
    id:'',
    name:'',
    slug:'',
    category:categories[0].slug,
    price:0,
    salePrice:0,
    stock:0,
    short:'',
    description:'',
    image:''
  };

  return `<div class="panel space-top">
    <h3>${p?'Chỉnh sửa sản phẩm':'Thêm sản phẩm mới'}</h3>
    <form id="product-edit-form">
      <div class="admin-form">
        <div class="field"><label>Mã sản phẩm *</label><input class="form-control" name="id" required value="${escapeHTML(data.id)}" ${p?'readonly':''}></div>
        <div class="field"><label>Đường dẫn (slug) *</label><input class="form-control" name="slug" required value="${escapeHTML(data.slug)}"></div>
        <div class="field wide"><label>Tên sản phẩm *</label><input class="form-control" name="name" required value="${escapeHTML(data.name)}"></div>
        <div class="field"><label>Danh mục</label><select name="category" class="form-control">${categories.map(c=>`<option value="${c.slug}" ${c.slug===data.category?'selected':''}>${escapeHTML(c.name)}</option>`).join('')}</select></div>
        <div class="field"><label>Tồn kho</label><input class="form-control" name="stock" type="number" min="0" required value="${data.stock}"></div>
        <div class="field"><label>Giá bán (VND)</label><input class="form-control" name="price" type="number" min="0" required value="${data.price}"></div>
        <div class="field"><label>Giá giảm (0 = không giảm)</label><input class="form-control" name="salePrice" type="number" min="0" value="${data.salePrice||0}"></div>
        <div class="field wide"><label>Phiên bản / kích cỡ (phân cách bằng dấu phẩy)</label><input class="form-control" name="variants" value="${escapeHTML((data.variants||['Tiêu chuẩn']).join(', '))}"></div>
        <div class="field wide"><label>Thông số sản phẩm (JSON)</label><textarea class="form-control" name="specs" rows="3">${escapeHTML(JSON.stringify(data.specs||{},null,2))}</textarea></div>
        <div class="field wide"><label>Mô tả ngắn</label><textarea class="form-control" name="short">${escapeHTML(data.short)}</textarea></div>
        <div class="field wide"><label>Mô tả chi tiết</label><textarea class="form-control" name="description">${escapeHTML(data.description)}</textarea></div>
        <div class="field wide"><label>Ảnh (đường dẫn đã có hoặc URL thư viện)</label><input class="form-control" name="image" value="${escapeHTML(data.image)}"></div>
      </div>
      <button class="btn">Lưu lên cơ sở dữ liệu</button>
      <button class="btn outline" type="button" data-action="close-editor">Đóng</button>
    </form>
  </div>`;
}
// Delegated navigation/actions
let filterTimer;

document.addEventListener('input',e=>{
  if(e.target.id==='filter-q'){
    clearTimeout(filterTimer);
    filterTimer=setTimeout(()=>onFilterChange(true),350);
  }

  if(e.target.id==='crm-search'){
    const q=e.target.value.toLowerCase();

    document.getElementById('crm-results').innerHTML=
      customerRows(
        adminCustomers.filter(x=>
          [x.displayName,x.email,x.phone]
            .join(' ')
            .toLowerCase()
            .includes(q)
        )
      );
  }
});

document.addEventListener('change',async e=>{
  if(page==='category' && e.target.id==='filter-cat'){
    const target=e.target.value;
    location.href=target ? link('danh-muc/'+target) : link('san-pham');
    return;
  }
  if(
    ['filter-cat','filter-max','filter-sort','filter-sale']
      .includes(e.target.id)
  ){
    onFilterChange();
  }

  if(
    e.target.dataset.action==='order-status' &&
    e.target.value
  ){
    if(!confirm('Bạn xác nhận cập nhật trạng thái đơn hàng?')){
      return;
    }

    try{
      await call('adminUpdateOrder',{
        orderId:e.target.dataset.id,
        status:e.target.value
      });

      notify('Đã cập nhật trạng thái','success');
      await loadAdmin();

    }catch(err){
      notify(err.message,'error');
    }
  }
});
document.addEventListener('click',async e=>{
  const b=e.target.closest('[data-action]');
  if(!b)return;

  const a=b.dataset.action;
  const id=b.dataset.id;

  if(a==='menu'){
    document.getElementById('mobile-nav')?.classList.toggle('open');
  }

  if(a==='add'){
    addCart(id);
  }

  if(a==='wish'){
    toggleWish(id);
  }

  if(a==='combo'){
    b.dataset.ids.split(',').forEach(pid=>addCart(pid));
  }

  if(a==='detail-add'){
    addCart(id,detailQty,detailVariant);
  }

  if(a==='buy'){
    addCart(id,detailQty,detailVariant);
    location.href=link('thanh-toan');
  }

  if(a==='detail-inc'||a==='detail-dec'){
    detailQty=Math.max(
      1,
      Math.min(99,detailQty+(a==='detail-inc'?1:-1))
    );

    const el=document.getElementById('detail-qty');

    if(el){
      el.value=detailQty;
    }
  }

  if(a==='variant'){
    detailVariant=b.dataset.value;

    document.querySelectorAll('.choice').forEach(x=>
      x.classList.toggle('active',x===b)
    );
  }

  if(a==='cart-inc'||a==='cart-dec'){
    setCartQty(
      id,
      b.dataset.variant,
      a==='cart-inc'?1:-1
    );
  }

  if(a==='cart-remove'){
    cart=cart.filter(x=>!(
      x.id===id &&
      (
        x.variant ||
        getProduct(id)?.variants?.[0] ||
        'Tiêu chuẩn'
      )===(b.dataset.variant||'Tiêu chuẩn')
    ));

    store('sporthub-cart',cart);
    render();
  }

  if(a==='clear-filters'){
    shopFilters={
      category:'',
      sort:'new',
      max:'',
      q:'',
      sale:false
    };

    render();
  }

  if(a==='google'){
    loginGoogle();
  }

  if(a==='logout'){
    logout();
  }

  if(a==='account-tab'){
    accountTab=b.dataset.tab;
    render();
  }

  if(a==='admin-tab'){
    adminTab=b.dataset.tab;
    render();
    await loadAdmin();
  }

  if(a==='seed'){
    if(!confirm(
      'Nhập 40 sản phẩm mẫu lên Firestore (không xóa dữ liệu khác)?'
    )){
      return;
    }

    try{
      const r=await call('adminSeedCatalog',{});

      notify(
        'Đã nhập '+r.count+' sản phẩm',
        'success'
      );
    }catch(err){
      notify(err.message,'error');
    }
  }

  if(a==='new-product'||a==='edit-product'){
    document.getElementById('admin-modal').innerHTML=
      productEditor(
        a==='edit-product'?getProduct(id):null
      );

    document.getElementById('admin-modal')
      .scrollIntoView({behavior:'smooth'});
  }

  if(a==='close-editor'){
    document.getElementById('admin-modal').innerHTML='';
  }

  if(a==='delete-product'){
    if(!confirm('Ẩn sản phẩm '+id+' khỏi website?')){
      return;
    }

    try{
      await call('adminArchiveProduct',{id});

      products=products.filter(p=>p.id!==id);
      render();

      notify('Đã ẩn sản phẩm','success');

    }catch(err){
      notify(err.message,'error');
    }
  }

  if(a==='mark-paid'){
    if(!confirm(
      'CHỈ XÁC NHẬN khi đã kiểm tra thực nhận tiền chuyển khoản hoặc tiền COD. Tiếp tục?'
    )){
      return;
    }

    try{
      await call('adminUpdateOrder',{
        orderId:id,
        paymentStatus:'paid'
      });

      notify(
        'Đã ghi nhận xác nhận thanh toán',
        'success'
      );

      await loadAdmin();

    }catch(err){
      notify(err.message,'error');
    }
  }

  if(a==='customer-detail'){
    try{
      const r=await call('adminCustomerDetail',{uid:id});

      document.getElementById('customer-detail').innerHTML=`
        <div class="panel space-top">
          <h3>Hồ sơ ${escapeHTML(r.customer?.displayName||id)}</h3>
          <p>
            Email: ${escapeHTML(r.customer?.email)}<br>
            Địa chỉ: ${escapeHTML(r.customer?.address||'Chưa cung cấp')}
          </p>
          <p>Số đơn: ${(r.orders||[]).length}</p>

          ${(r.orders||[]).map(o=>`
            <p>#${escapeHTML(o.id)} — ${money(o.total)}</p>
          `).join('')}

          <form id="crm-note-form" data-uid="${escapeHTML(id)}">
            <div class="field">
              <label>Ghi chú chăm sóc khách hàng</label>
              <textarea
                name="note"
                class="form-control"
                maxlength="800"
              >${escapeHTML(r.customer?.adminNote||'')}</textarea>
            </div>

            <button class="btn sm">Lưu ghi chú</button>
          </form>
        </div>
      `;

    }catch(err){
      notify(err.message,'error');
    }
  }

  if(a==='export-crm'){
    if(!confirm(
      'Xác nhận bạn có quyền và mục đích hợp lệ để xuất thông tin khách hàng?'
    )){
      return;
    }

    const columns=[
      'uid',
      'displayName',
      'email',
      'phone',
      'address',
      'orderCount',
      'totalSpent',
      'adminNote'
    ];

    const val=v=>
      '"'+
      String(v??'')
        .replace(/^([=+@\-])/,'\'$1')
        .replaceAll('"','""')+
      '"';

    const csv='\ufeff'+[
      columns.join(','),
      ...adminCustomers.map(o=>
        columns.map(k=>val(o[k])).join(',')
      )
    ].join('\r\n');

    const blob=new Blob(
      [csv],
      {type:'text/csv;charset=utf-8'}
    );

    const u=URL.createObjectURL(blob);
    const linkElement=document.createElement('a');

    linkElement.href=u;
    linkElement.download='sporthub-crm.csv';
    linkElement.click();

    URL.revokeObjectURL(u);
  }

  if(a==='copy-media'){
    try{
      await navigator.clipboard.writeText(b.dataset.url);
      notify('Đã sao chép URL','success');

    }catch{
      notify(
        'Không sao chép được trên trình duyệt này',
        'error'
      );
    }
  }

  if(a==='delete-media'){
    if(!confirm(
      'Xóa ảnh này khỏi thư viện? Hãy bảo đảm ảnh chưa được sử dụng.'
    )){
      return;
    }

    try{
      await call('adminDeleteMedia',{id});

      notify('Đã xóa ảnh','success');
      await loadAdmin();

    }catch(err){
      notify(err.message,'error');
    }
  }
});

// Form submission handlers.
document.addEventListener('submit',async e=>{
  const form=e.target;

  // Global product search: Home and All Products.
  if(form.matches('[data-search-form]')){
    e.preventDefault();

    const q=new FormData(form).get('q');

    location.href=
      link('san-pham')+
      '?q='+
      encodeURIComponent(q||'');

    return;
  }

  if(form.id==='checkout-form'){
    e.preventDefault();
    await submitOrder(form);
  }

  if(form.id==='contact-form'){
    e.preventDefault();

    if(!settings.contactEmail){
      notify(
        'Chưa cấu hình địa chỉ liên hệ của cửa hàng.',
        'error'
      );
      return;
    }

    const x=new FormData(form);

    const subject=encodeURIComponent(
      '[SPORTHUB] '+x.get('subject')
    );

    const body=encodeURIComponent(
      'Họ tên: '+x.get('name')+
      '\nEmail: '+x.get('email')+
      '\n\n'+x.get('message')
    );

    // Open the user's email client; no message is sent by this website.
    location.href='mailto:'+settings.contactEmail+
      '?subject='+subject+'&body='+body;
  }

  if(form.id==='profile-form'){
    e.preventDefault();

    if(!fb||!user)return;

    const v=new FormData(form);

    try{
      const displayName=String(v.get('displayName')).trim();
      const phone=String(v.get('phone')).trim();
      const address=String(v.get('address')).trim();

      await fb.setDoc(
        fb.doc(fb.db,'users',user.uid),
        {displayName,phone,address},
        {merge:true}
      );

      user._phone=phone;
      user._address=address;

      await fb.updateProfile(user,{displayName});

      notify('Đã cập nhật thông tin','success');

    }catch(err){
      notify(err.message,'error');
    }
  }

  if(form.id==='product-edit-form'){
    e.preventDefault();

    const v=new FormData(form);
    const p={};

    for(const [k,value] of v.entries()){
      p[k]=value;
    }

    p.price=Number(p.price);
    p.salePrice=Number(p.salePrice)||null;
    p.stock=Number(p.stock);

    p.variants=String(p.variants||'')
      .split(',')
      .map(x=>x.trim())
      .filter(Boolean);

    try{
      p.specs=JSON.parse(p.specs||'{}');

    }catch{
      notify('Thông số phải là JSON hợp lệ','error');
      return;
    }

    p.categoryName=catName(p.category);

    try{
      await call('adminUpsertProduct',{product:p});

      notify(
        'Đã lưu sản phẩm lên Firestore',
        'success'
      );

      document.getElementById('admin-modal').innerHTML='';

    }catch(err){
      notify(err.message,'error');
    }
  }

  if(
    form.id==='banner-form' ||
    form.id==='settings-form'
  ){
    e.preventDefault();

    const v=Object.fromEntries(new FormData(form));

    for(const k of ['shippingFee','freeShippingFrom']){
      if(k in v){
        v[k]=Number(v[k]);
      }
    }

    try{
      await call('adminUpdateSettings',{updates:v});
      notify('Đã lưu thay đổi','success');

    }catch(err){
      notify(err.message,'error');
    }
  }

  if(form.id==='post-form'){
    e.preventDefault();

    const v=Object.fromEntries(new FormData(form));

    v.content=v.content
      .split(/\n\s*\n/)
      .filter(Boolean);

    v.published=true;
    v.category='Kiến thức';
    v.date=new Date().toLocaleDateString('vi-VN');

    try{
      await call('adminSavePost',{post:v});

      notify('Đã lưu bài viết','success');
      form.reset();

    }catch(err){
      notify(err.message,'error');
    }
  }

  if(form.id==='ai-form'){
    e.preventDefault();

    const v=Object.fromEntries(new FormData(form));
    const el=document.getElementById('ai-preview');

    el.innerHTML=
      '<span class="spinner" style="border-color:#d8e3f2;border-top-color:#2563eb"></span> Đang kết nối AI...';

    const btn=form.querySelector('[type="submit"]');
    btn.disabled=true;

    try{
      const r=await call('adminGenerateImage',v);

      el.innerHTML=`
        <img src="${asset(r.url)}" alt="Ảnh được tạo từ AI">
        <div class="notice success">
          Ảnh mới đã được lưu vào thư viện.
        </div>
      `;

      notify(
        'Đã tạo ảnh và kiểm tra trùng lặp',
        'success'
      );

    }catch(err){
      el.textContent='Không tạo được ảnh. '+err.message;

      notify('AI: '+err.message,'error');

    }finally{
      btn.disabled=false;
    }
  }

  if(form.id==='upload-form'){
    e.preventDefault();

    const file=form.elements.file.files[0];

    if(!file||file.size>4*1024*1024){
      return notify(
        'Chỉ hỗ trợ ảnh dưới 4 MB.',
        'error'
      );
    }

    const btn=form.querySelector('button');
    btn.disabled=true;

    try{
      const b64=await new Promise((resolve,reject)=>{
        const reader=new FileReader();

        reader.onload=()=>resolve(
          reader.result.split(',')[1]
        );

        reader.onerror=reject;
        reader.readAsDataURL(file);
      });

      await call('adminUploadMedia',{
        base64:b64,
        label:file.name
      });

      notify(
        'Đã tải ảnh lên và kiểm tra trùng',
        'success'
      );

      await loadAdmin();

    }catch(err){
      notify(err.message,'error');

    }finally{
      btn.disabled=false;
    }
  }

  if(form.id==='crm-note-form'){
    e.preventDefault();

    try{
      await call('adminCustomerNote',{
        uid:form.dataset.uid,
        note:new FormData(form).get('note')
      });

      notify('Đã lưu ghi chú','success');

    }catch(err){
      notify(err.message,'error');
    }
  }
});

// Initialize storefront.
render();
initFirebase();

if(page==='admin'&&isAdmin){
  loadAdmin();
}

})();
