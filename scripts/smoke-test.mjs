import {readFileSync,existsSync} from 'node:fs';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';
import {resolve,dirname,join} from 'node:path';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const code=readFileSync(join(root,'assets/js/app.js'),'utf8');
const catalog=readFileSync(join(root,'assets/js/products.js'),'utf8');
const pageCases=[['home','', 'Danh mục nổi bật'],['shop','', 'Tất cả sản phẩm'],['category','pickleball','Pickleball'],['product','ao-thun-chay-bo-aero','Áo thun chạy bộ Aero'],['cart','', 'Giỏ hàng của bạn'],['checkout','', 'Giỏ hàng đang trống'],['about','', 'Vận động theo cách của bạn'],['contact','', 'Liên hệ với chúng tôi'],['blog','', 'Góc kiến thức thể thao'],['article','bat-dau-chay-bo-dung-cach','Bắt đầu chạy bộ'],['policy','', 'Chính sách mua hàng'],['privacy','', 'Chính sách bảo mật'],['login','', 'Chào mừng trở lại'],['account','', 'Tài khoản của tôi'],['admin','', 'Khu vực quản trị']];
let errors=[];
for(const [page,slug,expected] of pageCases){
 let html='';const listeners={},store={};
 const appEl={set innerHTML(v){html=v},get innerHTML(){return html}};
 const dummyEl={setAttribute(){},classList:{toggle(){}},innerHTML:'',textContent:''};
 const ctx={window:{SPORT_CONFIG:{}},document:{body:{dataset:{page,slug},append(){}},currentScript:{src:'https://example.github.io/the-thao-song-khoe/assets/js/app.js'},getElementById(id){return id==='app'?appEl:dummyEl},querySelector(){return null},querySelectorAll(){return []},addEventListener(k,fn){listeners[k]=fn},createElement(){return {className:'',textContent:'',remove(){}}}},location:{protocol:'https:',href:'https://example.github.io/the-thao-song-khoe/'+page+'/',origin:'https://example.github.io',search:'',pathname:'/'+page+'/'},localStorage:{getItem(k){return store[k]||null},setItem(k,v){store[k]=v}},URL,URLSearchParams,Intl,console,setTimeout(){return 1},clearTimeout(){},navigator:{},fetch(){throw Error('network should not be used in preview')},confirm(){return true},Date,Math};
 ctx.window.window=ctx.window;ctx.window.SPORT_CONFIG={};
 vm.createContext(ctx);vm.runInContext(catalog,ctx);vm.runInContext(code,ctx);
 if(!html.includes(expected))errors.push(page+' missing '+expected);
 if(page==='home'&&!html.includes('category-grid'))errors.push('missing category section');
 if(page==='shop'&&(html.match(/class="product-card"/g)||[]).length!==40)errors.push('shop must show exactly 40 products');
 if(page==='category'&&(html.match(/class="product-card"/g)||[]).length!==5)errors.push('pickleball must show 5 products');
 if(page==='admin'&&!html.includes('Không có quyền')){if(!html.includes('Khu vực quản trị'))errors.push('admin access guard absent')}
 if(page==='product'){
  const img={tagName:'IMG',src:'https://example.github.io/the-thao-song-khoe/assets/img/products/ao-thun-chay-bo-aero.webp',currentSrc:'https://example.github.io/the-thao-song-khoe/assets/img/products/ao-thun-chay-bo-aero.webp',dataset:{}};
  listeners.error?.({target:img});
  if(img.src!=='https://example.github.io/the-thao-song-khoe/assets/img/products/ao-thun-chay-bo-aero.svg')errors.push('WebP to SVG fallback failed');
 }
 if(page==='home'){
  const b={dataset:{action:'add',id:'SH003'}};
  listeners.click?.({target:{closest:()=>b}});
  if(!store['sporthub-cart']?.includes('SH003'))errors.push('add-to-cart did not save state');
 }
 console.log('✓',page,slug||'/',html.length,'characters');
}
const pText=readFileSync(join(root,'assets/js/products.js'),'utf8');
const srcProducts=JSON.parse(readFileSync(join(root,'functions/products.json'),'utf8'));
if(srcProducts.length!==40)errors.push('catalog != 40');
if(new Set(srcProducts.map(x=>x.image)).size!==40)errors.push('duplicate product images');
for(const p of srcProducts){if(p.image!==`assets/img/products/${p.slug}.webp` || p.fallbackImage!==`assets/img/products/${p.slug}.svg` || !existsSync(join(root,p.fallbackImage)))errors.push('missing WebP convention or SVG fallback '+p.id);if(!existsSync(join(root,'san-pham',p.slug,'index.html')))errors.push('missing route '+p.slug)}
for(const id of ['thoi-trang-the-thao','giay-the-thao','gym-fitness','pickleball','cau-long','yoga-pilates','phu-kien','phuc-hoi'])if(!existsSync(join(root,'danh-muc',id,'index.html')))errors.push('missing category '+id);
if(errors.length){console.error('FAILED',errors);process.exit(1)}
console.log('PASS: 15 page render checks, 40 products, images, carts and static routes.');
