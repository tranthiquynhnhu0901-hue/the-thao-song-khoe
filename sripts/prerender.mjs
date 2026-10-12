
/**
 * Put static HTML into every route shell as a fallback when external JavaScript
 * cannot run (including file/document previews). Runtime app.js replaces it.
 * Root index.html additionally embeds critical CSS and SVG images to support
 * single-file HTML preview without the asset folder.
 */
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { resolve, dirname, join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const appCode = readFileSync(join(ROOT, 'assets/js/app.js'), 'utf8');
const productsCode = readFileSync(join(ROOT, 'assets/js/products.js'), 'utf8');
const stylesheet = readFileSync(join(ROOT, 'assets/css/style.css'), 'utf8');
const fakeRoot = 'https://sporthub-static.invalid/';
const allHTML = [];

function collect(dir) {
 for (const ent of readdirSync(dir, {withFileTypes:true})) {
  if (['node_modules','.git'].includes(ent.name) || ent.name === 'functions' || ent.name === 'assets') continue;
  const loc = join(dir,ent.name);
  if(ent.isDirectory()) collect(loc);
  else if(ent.name === 'index.html') allHTML.push(loc);
 }
}

collect(ROOT);

function render(page,slug) {
 let markup = '';
 const dummy={innerHTML:'',textContent:'',setAttribute(){},classList:{toggle(){}}};
 const app={set innerHTML(v){markup=v},get innerHTML(){return markup}};
 const context = {
  window: {SPORT_CONFIG:{}},
  document:{body:{dataset:{page,slug},append(){}},currentScript:{src:fakeRoot+'assets/js/app.js'},getElementById(x){return x==='app'?app:dummy},querySelector(){return null},querySelectorAll(){return []},addEventListener(){},createElement(){return {className:'',textContent:'',remove(){}}}},
  location:{protocol:'https:',href:fakeRoot,origin:'https://sporthub-static.invalid',search:'',pathname:'/'},
  localStorage:{getItem(){return null},setItem(){}},
  URL, URLSearchParams, Intl, Date, Math, console, navigator:{},setTimeout(){},clearTimeout(){},fetch(){throw Error('Static fallback must not call network')}
 };
 context.window.window=context.window;
 vm.createContext(context);
 vm.runInContext(productsCode,context,{filename:'products.js'});
 vm.runInContext(appCode,context,{filename:'app.js'});
 return markup;
}

function rewrite(markup,prefix,isRoot) {
 return markup.replace(/https:\/\/sporthub-static\.invalid\/([^"'\s<>]*)/g, (match,pathAndQuery) => {
   let path=pathAndQuery;

   if(isRoot && path.startsWith('assets/img/') && !path.includes('?')) {
     const f=resolve(ROOT,path);
     if(f.startsWith(ROOT+sep) && existsSync(f)) {
      return 'data:image/svg+xml,'+encodeURIComponent(readFileSync(f,'utf8'));
     }
   }

   // Keep clean directory URLs without exposing index.html.
   if(path === '') return prefix || './';
   if(path.endsWith('/')) return prefix+path;

   return prefix+path;
 });
}

let count=0;

for (const filename of allHTML) {
 let doc=readFileSync(filename,'utf8');
 const p=doc.match(/<body\s+data-page="([^"]+)"\s+data-slug="([^"]*)"/);

 if(!p)continue;

 const isRoot=filename===join(ROOT,'index.html');
 const depth=relative(ROOT,dirname(filename)).split(sep).filter(x=>x && x!=='.').length;
 const prefix='../'.repeat(depth);
 const markup=rewrite(render(p[1],p[2]),prefix,isRoot);
 const shell=/<div id="app">[\s\S]*?<\/div>\s*<script src="/;

 if(!shell.test(doc))throw Error('Missing app shell '+filename);

 doc=doc.replace(shell,`<div id="app">${markup}<noscript><p class="container">Để sử dụng giỏ hàng và tìm kiếm, vui lòng bật JavaScript.</p></noscript></div>\n<script src="`);

 // Critical CSS is embedded in EVERY route. This guards against unstyled
 // pages when the stylesheet request is blocked or an HTML preview isolates files.

 // Remove only CSS backup blocks created by this script on previous runs.
 // This prevents older CSS from overriding the latest stylesheet.
 doc=doc.replace(
   /<style>\s*\/\* CSS backup embedded on every route\. \*\/[\s\S]*?<\/style>\s*/g,
   ''
 );

 const cssLink=/<link rel="stylesheet" href="[^"]*assets\/css\/style\.css"\/>/;

 if(!cssLink.test(doc))throw Error('Missing main stylesheet '+filename);

 doc=doc.replace(cssLink,link =>
   `${link}\n<style>\n/* CSS backup embedded on every route. */\n${stylesheet}\n</style>`
 );

 writeFileSync(filename,doc,'utf8');
 count++;
}

console.log(`Added static HTML fallbacks to ${count} routes, embedded CSS/SVG for root index.html`);
