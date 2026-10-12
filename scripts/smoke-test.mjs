/* SPORTHUB - test static storefront without network, backend or product photos. */

import {readFileSync,existsSync} from 'node:fs';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';
import {resolve,dirname,join} from 'node:path';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const errors=[];

const check=(ok,message)=>{
  if(!ok)errors.push(message);
};

// -------------------------------------------------------
// 1. KIỂM TRA CÁC TỆP MÃ NGUỒN BẮT BUỘC
// -------------------------------------------------------

const required=[
  'js/app.js',
  'js/products.js',
  'css/style.css',
  'functions/products.json'
];

for(const file of required){
  if(!existsSync(join(root,file))){
    errors.push(`Thiếu tệp: ${file}`);
  }
}

if(errors.length){
  console.error(errors.join('\n'));
  process.exit(1);
}

const appSource=readFileSync(
  join(root,'js/app.js'),
  'utf8'
);

const catalogSource=readFileSync(
  join(root,'js/products.js'),
  'utf8'
);

const products=JSON.parse(
  readFileSync(join(root,'functions/products.json'),'utf8')
);

// Biên dịch trước để phát hiện lỗi cú pháp JavaScript.
const appScript=new vm.Script(
  appSource,
  {filename:'js/app.js'}
);

const catalogScript=new vm.Script(
  catalogSource,
  {filename:'js/products.js'}
);

const BASE='https://example.github.io/the-thao-song-khoe/';

// -------------------------------------------------------
// 2. DANH SÁCH 15 LOẠI TRANG CẦN KIỂM THỬ
// -------------------------------------------------------

const cases=[
  ['home','','Danh mục nổi bật',''],
  ['shop','','Tất cả sản phẩm',''],
  ['category','pickleball','Pickleball',''],
  ['product','ao-thun-chay-bo-aero','Áo thun chạy bộ Aero',''],
  ['cart','','Giỏ hàng của bạn',''],
  ['checkout','','Giỏ hàng đang trống',''],
  ['about','','Vận động theo cách của bạn',''],
  ['contact','','Liên hệ với chúng tôi',''],
  ['blog','','Góc kiến thức thể thao',''],
  ['article','bat-dau-chay-bo-dung-cach','Bắt đầu chạy bộ',''],
  ['policy','','Chính sách mua hàng',''],
  ['privacy','','Chính sách bảo mật',''],
  ['login','','Chào mừng trở lại',''],
  ['account','','Tài khoản của tôi',''],
  ['admin','','Khu vực quản trị','']
];

const routes={
  home:'',
  shop:'san-pham/',
  category:'danh-muc/pickleball/',
  product:'san-pham/ao-thun-chay-bo-aero/',
  cart:'gio-hang/',
  checkout:'thanh-toan/',
  about:'gioi-thieu/',
  contact:'lien-he/',
  blog:'bai-viet/',
  article:'bai-viet/bat-dau-chay-bo-dung-cach/',
  policy:'chinh-sach-mua-hang/',
  privacy:'bao-mat/',
  login:'dang-nhap/',
  account:'tai-khoan/',
  admin:'quan-tri/'
};

// -------------------------------------------------------
// 3. MÔ PHỎNG MÔI TRƯỜNG TRÌNH DUYỆT
// -------------------------------------------------------

function preview(page,slug='',query='',initialCart=[]){
  let html='';

  const saved={};

  if(initialCart.length){
    saved['sporthub-cart']=JSON.stringify(initialCart);
  }

  const listeners=new Map();
  const cachedImages=[];

  const on=(event,fn)=>{
    listeners.set(
      event,
      [...(listeners.get(event)||[]),fn]
    );
  };

  const application={
    set innerHTML(value){
      html=value;
    },
    get innerHTML(){
      return html;
    }
  };

  const dummy={
    innerHTML:'',
    value:1,
    textContent:'',
    setAttribute(){},
    remove(){},
    classList:{
      toggle(){}
    }
  };

  const pageURL=new URL(routes[page]+query,BASE);

  const mockWindow={
    SPORT_CONFIG:{},
    addEventListener:on
  };

  const mockDocument={
    currentScript:{
      src:new URL('js/app.js',BASE).href
    },

    body:{
      dataset:{page,slug},
      append(){}
    },

    head:{
      append(){}
    },

    getElementById(id){
      return id==='app'?application:dummy;
    },

    querySelector(){
      return null;
    },

    querySelectorAll(selector){
      return selector==='img.sh-photo-real'
        ? cachedImages
        : [];
    },

    addEventListener:on,

    createElement(){
      return {
        append(){},
        remove(){},
        setAttribute(){},
        getAttribute(){
          return null;
        },
        textContent:''
      };
    }
  };

  const context={
    window:mockWindow,
    document:mockDocument,

    location:{
      href:pageURL.href,
      origin:pageURL.origin,
      pathname:pageURL.pathname,
      protocol:pageURL.protocol,
      search:pageURL.search,
      hash:pageURL.hash
    },

    localStorage:{
      getItem:key=>saved[key]??null,
      setItem:(key,value)=>{
        saved[key]=value;
      }
    },

    URL,
    URLSearchParams,
    Intl,
    console,
    Date,
    Math,
    JSON,

    setTimeout:()=>1,
    clearTimeout(){},

    fetch(){
      throw new Error(
        'Smoke test không được gọi mạng'
      );
    },

    confirm:()=>true,
    navigator:{}
  };

  vm.createContext(context);

  catalogScript.runInContext(
    context,
    {timeout:2000}
  );

  appScript.runInContext(
    context,
    {timeout:3000}
  );

  return {
    html:()=>html,
    saved,
    cachedImages,
    products:mockWindow.SPORT_PRODUCTS,
    categories:mockWindow.SPORT_CATEGORIES,

    emit(event,target){
      let stopped=false;

      for(const fn of listeners.get(event)||[]){
        fn({
          target,
          stopPropagation(){
            stopped=true;
          }
        });

        if(stopped)break;
      }
    }
  };
}

function occurrences(text,fragment){
  return text.split(fragment).length-1;
}

// Mô phỏng một ảnh sản phẩm tải không thành công.
function imageState(){
  const values=new Set();

  return {
    tagName:'IMG',

    src:new URL(
      'img/products/ao-thun-chay-bo-aero.webp',
      BASE
    ).href,

    complete:true,
    naturalWidth:0,

    classList:{
      contains:value=>values.has(value),
      add:value=>values.add(value)
    },

    has:value=>values.has(value)
  };
}

// -------------------------------------------------------
// 4. KIỂM TRA TỪNG TRANG
// -------------------------------------------------------

for(const [page,slug,expected,query] of cases){
  try{
    const app=preview(page,slug,query);
    const html=app.html();

    // Trang phải có nội dung chính tương ứng.
    check(
      html.includes(expected),
      `${page}: thiếu nội dung ${expected}`
    );

    // Chỉ trang chủ và tất cả sản phẩm có tìm kiếm.
    const searchCount=occurrences(
      html,
      'data-search-form'
    );

    check(
      searchCount===(
        ['home','shop'].includes(page)?2:0
      ),
      `${page}: sai số lượng thanh tìm kiếm (${searchCount})`
    );

    // Các liên kết công khai không chứa /index.html.
    check(
      !/href="[^"]*\/index\.html(?:[?#"])/i.test(html),
      `${page}: còn liên kết index.html`
    );

    // -------- TRANG CHỦ --------

    if(page==='home'){
      check(
        html.includes('category-grid'),
        'Trang chủ: thiếu danh mục'
      );

      check(
        html.includes('sh-photo-placeholder'),
        'Trang chủ: thiếu ô chờ ảnh'
      );

      // Thử thêm SH003 vào giỏ hàng.
      app.emit('click',{
        closest:()=>({
          dataset:{
            action:'add',
            id:'SH003'
          }
        })
      });

      check(
        app.saved['sporthub-cart']?.includes('SH003'),
        'Trang chủ: thêm giỏ hàng không lưu dữ liệu'
      );
    }

    // -------- TẤT CẢ SẢN PHẨM --------

    if(page==='shop'){
      check(
        occurrences(html,'class="product-card"')===40,
        'Cửa hàng: phải có đúng 40 thẻ sản phẩm'
      );

      check(
        occurrences(
          html,
          'class="sh-photo-placeholder"'
        )===40,
        'Cửa hàng: phải có đúng 40 ô chờ ảnh'
      );

      check(
        occurrences(
          html,
          'class="sh-photo-real"'
        )===40,
        'Cửa hàng: phải có đúng 40 ảnh WebP'
      );

      check(
        html.includes(
          '/img/products/ao-thun-chay-bo-aero.webp'
        ),
        'Cửa hàng: đường dẫn ảnh không đúng'
      );
    }

    // -------- DANH MỤC PICKLEBALL --------

    if(page==='category'){
      check(
        occurrences(html,'class="product-card"')===5,
        'Danh mục Pickleball: phải có 5 sản phẩm'
      );
    }

    // -------- TRANG CHI TIẾT --------

    if(page==='product'){
      check(
        html.includes('class="detail-image"'),
        'Chi tiết: thiếu ảnh lớn'
      );

      check(
        occurrences(html,'class="product-card"')===4,
        'Chi tiết: phải có 4 sản phẩm liên quan'
      );

      check(
        occurrences(
          html,
          'class="sh-photo-placeholder"'
        )===5,
        'Chi tiết: thiếu ô chờ ảnh chính hoặc ảnh liên quan'
      );

      check(
        html.includes('data-action="detail-add"'),
        'Chi tiết: thiếu nút thêm vào giỏ'
      );

      check(
        html.includes('data-action="detail-inc"'),
        'Chi tiết: thiếu nút tăng số lượng'
      );

      // Thử trường hợp ảnh WebP chưa được tải lên.
      const broken=imageState();
      broken.classList.add('sh-photo-real');

      app.emit('error',broken);

      check(
        broken.has('sh-photo-error'),
        'Ảnh thiếu: chưa được ẩn để hiện tên sản phẩm'
      );

      check(
        broken.src.endsWith('.webp'),
        'Ảnh thiếu: không được ép sang SVG'
      );

      // Thử trường hợp ảnh lỗi đã nằm trong cache.
      const cached=imageState();
      cached.classList.add('sh-photo-real');

      app.cachedImages.push(cached);

      // Kích hoạt dựng lại trang để kiểm tra ảnh cache.
      app.emit('click',{
        closest:()=>({
          dataset:{
            action:'account-tab',
            tab:'orders'
          }
        })
      });

      check(
        cached.has('sh-photo-error'),
        'Ảnh cache lỗi: chưa được xử lý sau render'
      );
    }

    console.log(
      `✓ ${page.padEnd(9)} ${html.length} ký tự`
    );

  }catch(error){
    errors.push(
      `${page}: ${error.stack||error.message}`
    );
  }
}

// -------------------------------------------------------
// 5. KIỂM TRA TÌM KIẾM, DANH MỤC VÀ GIỎ HÀNG
// -------------------------------------------------------

try{
  const searched=preview(
    'shop',
    '',
    '?q=Aero'
  ).html();

  check(
    occurrences(
      searched,
      'class="product-card"'
    )===1,
    'Tìm kiếm Aero: phải trả về 1 sản phẩm'
  );

  // Danh mục không có chức năng tìm kiếm riêng.
  const category=preview(
    'category',
    'pickleball',
    '?q=khong-co-san-pham'
  ).html();

  check(
    occurrences(
      category,
      'class="product-card"'
    )===5,
    'Trang danh mục phải bỏ qua tham số tìm kiếm'
  );

  // Giỏ hàng đã có sản phẩm.
  const cart=preview(
    'cart',
    '',
    '',
    [{
      id:'SH001',
      qty:2,
      variant:'S'
    }]
  ).html();

  check(
    cart.includes('Áo thun chạy bộ Aero') &&
    cart.includes('sh-photo-placeholder'),
    'Giỏ hàng: thiếu sản phẩm hoặc ô chờ ảnh'
  );

  // Trang thanh toán với giỏ hàng không rỗng.
  const checkout=preview(
    'checkout',
    '',
    '',
    [{
      id:'SH001',
      qty:1,
      variant:'S'
    }]
  ).html();

  check(
    checkout.includes('sh-photo-placeholder'),
    'Thanh toán: thiếu ô chờ ảnh'
  );

}catch(error){
  errors.push(
    'Kiểm tra bổ sung: '+error.message
  );
}

// -------------------------------------------------------
// 6. KIỂM TRA ĐỒNG BỘ DỮ LIỆU 40 SẢN PHẨM
// -------------------------------------------------------

const catalogPreview=preview('shop');

check(
  catalogPreview.products?.length===40,
  'js/products.js: phải có đúng 40 sản phẩm'
);

check(
  catalogPreview.categories?.length===8,
  'js/products.js: phải có đúng 8 danh mục'
);

check(
  products.length===40,
  `functions/products.json: cần 40, hiện ${products.length}`
);

check(
  new Set(products.map(p=>p.id)).size===40,
  'Trùng mã sản phẩm'
);

check(
  new Set(products.map(p=>p.slug)).size===40,
  'Trùng slug sản phẩm'
);

check(
  new Set(products.map(p=>p.image)).size===40,
  'Trùng tên ảnh sản phẩm'
);

for(const p of products){
  // Đối chiếu dữ liệu JS với dữ liệu JSON.
  const jsProduct=catalogPreview.products?.find(
    item=>item.id===p.id
  );

  check(
    Boolean(jsProduct) &&
    jsProduct.slug===p.slug,
    `${p.id}: dữ liệu JS không khớp functions/products.json`
  );

  // Chấp nhận cả đường dẫn dữ liệu cũ assets/img/
  // vì app.js sẽ tự chuẩn hóa về img/.
  const image=String(p.image||'').replace(
    /^assets\//,
    ''
  );

  check(
    image===`img/products/${p.slug}.webp`,
    `${p.id}: ảnh phải có tên img/products/${p.slug}.webp`
  );

  // Kiểm tra trang HTML đã được tạo.
  check(
    existsSync(
      join(
        root,
        'san-pham',
        p.slug,
        'index.html'
      )
    ),
    `${p.id}: thiếu trang san-pham/${p.slug}/index.html`
  );

  /*
    Không yêu cầu tệp WebP hoặc SVG phải tồn tại
    ngay hôm nay.

    Khi chưa có ảnh:
      app.js hiển thị ô giữ chỗ có tên sản phẩm.

    Khi thêm ảnh:
      img/products/<slug>.webp
      trình duyệt tự sử dụng ảnh mới.
  */
}

// -------------------------------------------------------
// 7. KIỂM TRA 8 TRANG DANH MỤC
// -------------------------------------------------------

for(const category of [
  'thoi-trang-the-thao',
  'giay-the-thao',
  'gym-fitness',
  'pickleball',
  'cau-long',
  'yoga-pilates',
  'phu-kien',
  'phuc-hoi'
]){
  check(
    existsSync(
      join(
        root,
        'danh-muc',
        category,
        'index.html'
      )
    ),
    `Thiếu trang danh-muc/${category}/index.html`
  );
}

// -------------------------------------------------------
// 8. IN KẾT QUẢ CUỐI CÙNG
// -------------------------------------------------------

if(errors.length){
  console.error('\n❌ SMOKE TEST FAILED:');

  errors.forEach((error,i)=>{
    console.error(
      `${i+1}. ${error}`
    );
  });

  process.exitCode=1;

}else{
  console.log(
    '\n✅ PASS: 15 trang, 40 sản phẩm, URL sạch, tìm kiếm,'
  );

  console.log(
    'ô chờ ảnh, giỏ hàng và đường dẫn trang tĩnh.'
  );

  console.log(
    'Chưa yêu cầu có ảnh thật; cần kiểm thử trên trình duyệt sau deploy.'
  );
}