
/** SPORTHUB Firebase Functions v2 - server authoritative prices, claims, inventory and AI. */

import {initializeApp as initAdmin} from 'firebase-admin/app';

import {getFirestore,FieldValue,Timestamp} from 'firebase-admin/firestore';

import {getStorage} from 'firebase-admin/storage';

import {getAuth} from 'firebase-admin/auth';

import {onCall,HttpsError} from 'firebase-functions/v2/https';

import {defineSecret} from 'firebase-functions/params';

import sharp from 'sharp';

import crypto from 'node:crypto';

import seedProducts from './products.json' with {type:'json'};


initAdmin();const db=getFirestore();

const REGION='asia-southeast1';

const ADMIN_EMAIL='tranthiquynhnhu0901@gmail.com';

const AI_SECRET=defineSecret('OPENAI_API_KEY');

const callable=(handler,opts={})=>onCall({region:REGION,maxInstances:5,timeoutSeconds:120,...opts},handler);

function clean(v,max=200){return String(v??'').trim().slice(0,max)}

function must(cond,message,code='invalid-argument'){if(!cond)throw new HttpsError(code,message)}

function signed(req){must(req.auth?.uid,'Bạn cần đăng nhập Google.','unauthenticated');must(req.auth.token.email_verified===true,'Email chưa được xác minh.','permission-denied');return req.auth.uid}

function admin(req){const uid=signed(req);must(req.auth.token.admin===true&&String(req.auth.token.email||'').toLowerCase()===ADMIN_EMAIL,'Không có quyền quản trị.','permission-denied');return uid}

function obj(data){must(data&&typeof data==='object'&&!Array.isArray(data),'Dữ liệu không hợp lệ.');return data}

function limitMoney(v){const n=Number(v);must(Number.isSafeInteger(n)&&n>=0&&n<=1000000000,'Giá trị tiền không hợp lệ.');return n}

function refId(v){const s=clean(v,80);must(/^[a-zA-Z0-9_-]{2,80}$/.test(s),'Mã không hợp lệ');return s}

function validateMediaURL(v){const s=clean(v,2000);must(!/[\"'<>\\]/.test(s)&&(s===''||/^assets\/img\/[a-zA-Z0-9/_.-]+$/.test(s)||/^https:\/\/[^\s]+$/i.test(s)),'Đường dẫn ảnh cần là ảnh nội bộ hoặc HTTPS hợp lệ');return s}

async function checkRate(uid,op,seconds=30){const ref=db.doc(`limits/${uid}_${op}`),now=Date.now();await db.runTransaction(async t=>{const snap=await t.get(ref);const before=snap.data()?.at||0;must(now-before>seconds*1000,'Thao tác quá nhanh, vui lòng thử lại sau.','resource-exhausted');t.set(ref,{at:now,updatedAt:FieldValue.serverTimestamp()})})}


export const placeOrder=callable(async req=>{

 const uid=signed(req),data=obj(req.data),items=data.items;must(Array.isArray(items)&&items.length>0&&items.length<=20,'Giỏ hàng không hợp lệ.');

 const unique=new Set();const entries=items.map(item=>{

  const id=refId(item.id),qty=Number(item.qty),variant=clean(item.variant,35);

  const key=id+'|'+variant;must(!unique.has(key),'Mã sản phẩm và phiên bản bị trùng.');unique.add(key);

  must(Number.isInteger(qty)&&qty>=1&&qty<=20,'Số lượng mỗi sản phẩm phải từ 1 đến 20.');

  return {id,qty,variant};

 });

 const shipping=obj(data.shipping);const name=clean(shipping.name,100),phone=clean(shipping.phone,20),address=clean(shipping.address,260),note=clean(shipping.note,500);

 must(name.length>=2&&/^[0-9+ .-]{9,16}$/.test(phone)&&address.length>=12,'Vui lòng nhập đủ họ tên, số điện thoại và địa chỉ nhận hàng.');

 const method=clean(data.paymentMethod,10);must(['cod','bank'].includes(method),'Phương thức thanh toán không hợp lệ');

 await checkRate(uid,'order',10);

 const result=await db.runTransaction(async t=>{

  const ids=[...new Set(entries.map(x=>x.id))],refs=ids.map(id=>db.doc(`catalog/${id}`));

  const docs=await Promise.all(refs.map(r=>t.get(r)));

  const byId=new Map(ids.map((id,i)=>[id,docs[i]]));

  const settingRef=db.doc('site/settings');const settingSnap=await t.get(settingRef),set=settingSnap.data()||{};

  // Read the account profile before any transaction writes.
  // Delivery information must not overwrite saved account information.
  const customerRef=db.doc(`users/${uid}`);
  const customerSnap=await t.get(customerRef);

  if(method==='bank')must(Boolean(set.bankName&&set.bankAccount&&set.bankHolder),'Chuyển khoản chưa được cấu hình.','failed-precondition');

  const quantities=new Map();let sub=0;

  const rows=entries.map(item=>{

   const snapshot=byId.get(item.id);must(snapshot?.exists&&!snapshot.data().archived,'Sản phẩm không khả dụng.','failed-precondition');

   const p=snapshot.data(),variants=Array.isArray(p.variants)&&p.variants.length?p.variants:['Tiêu chuẩn'];

   must(variants.includes(item.variant),'Vui lòng chọn phiên bản/cỡ hợp lệ cho sản phẩm.','failed-precondition');

   quantities.set(item.id,(quantities.get(item.id)||0)+item.qty);

   const unit=limitMoney(p.salePrice||p.price);must(unit>0,'Giá sản phẩm chưa hợp lệ.','failed-precondition');

   sub+=unit*item.qty;return {id:item.id,name:clean(p.name,120),variant:item.variant,qty:item.qty,unitPrice:unit,image:clean(p.image,400)};

  });

  for(const [id,qty] of quantities){const doc=byId.get(id),p=doc.data();must(Number.isInteger(p.stock)&&p.stock>=qty,`Sản phẩm ${p.name||id} không đủ tồn kho.`,'failed-precondition');}

  const threshold=limitMoney(set.freeShippingFrom??1000000),delivery=limitMoney(set.shippingFee??30000),shippingFee=sub>=threshold?0:delivery;

  const total=sub+shippingFee;must(total<=1000000000,'Giá trị đơn hàng vượt giới hạn');

  const orderRef=db.collection('orders').doc();

  for(const id of ids)t.update(db.doc(`catalog/${id}`),{stock:byId.get(id).data().stock-quantities.get(id),updatedAt:FieldValue.serverTimestamp()});

  t.create(orderRef,{userId:uid,email:req.auth.token.email||'',items:rows,shipping:{name,phone,address,note},subtotal:sub,shippingFee,total,paymentMethod:method,paymentStatus:'unpaid',status:'pending',createdAt:FieldValue.serverTimestamp(),updatedAt:FieldValue.serverTimestamp()});

  // Preserve an existing customer's display name, phone,
  // address and favorites when a new order is placed.
  if(customerSnap.exists){

   t.update(customerRef,{
    lastPurchaseAt:FieldValue.serverTimestamp()
   });

  }else{

   // Create a complete profile only when one does not exist.
   t.create(customerRef,{
    uid,
    email:req.auth.token.email||'',
    displayName:clean(req.auth.token.name,100)||name,
    phone,
    address,
    favorites:[],
    createdAt:FieldValue.serverTimestamp(),
    lastPurchaseAt:FieldValue.serverTimestamp()
   });

  }

  return {orderId:orderRef.id,subtotal:sub,shippingFee,total,paymentMethod:method,status:'pending',paymentStatus:'unpaid'};

 });return result;

});


export const adminSeedCatalog=callable(async req=>{admin(req);await checkRate(req.auth.uid,'seed',60);const batch=db.batch();let count=0;for(const p of seedProducts){const ref=db.doc('catalog/'+p.id);const exists=await ref.get();if(!exists.exists){batch.set(ref,{...p,updatedAt:FieldValue.serverTimestamp()});count++}}if(count)await batch.commit();return {count}});

export const adminUpsertProduct=callable(async req=>{admin(req);const p=obj(req.data?.product);const id=refId(p.id);const name=clean(p.name,120),slug=clean(p.slug,150),category=clean(p.category,80),image=validateMediaURL(p.image);must(name.length>=3&&/^[a-z0-9-]{3,150}$/.test(slug),'Tên hoặc đường dẫn sản phẩm không hợp lệ');must(seedProducts.some(x=>x.category===category),'Danh mục không hợp lệ');const price=limitMoney(p.price),salePrice=p.salePrice?limitMoney(p.salePrice):null,stock=Number(p.stock);must(price>0&&(!salePrice||salePrice<price),'Giá giảm phải nhỏ hơn giá gốc');must(Number.isInteger(stock)&&stock>=0&&stock<=100000,'Số lượng tồn kho không hợp lệ');

if(image){

 must(!image.startsWith('assets/img/categories/')&&!image.startsWith('assets/img/editorial/'),'Ảnh danh mục hoặc banner không được dùng cho sản phẩm.','already-exists');

 const [matches,postMatches,siteDoc]=await Promise.all([db.collection('catalog').where('image','==',image).limit(3).get(),db.collection('posts').where('image','==',image).limit(1).get(),db.doc('site/settings').get()]);

 must(!matches.docs.some(d=>d.id!==id)&&postMatches.empty&&siteDoc.data()?.heroImage!==image&&siteDoc.data()?.saleImage!==image,'Ảnh đang được sử dụng ở nơi khác.','already-exists');

 }

await db.doc('catalog/'+id).set({id,name,slug,category,categoryName:seedProducts.find(x=>x.category===category)?.categoryName||category,short:clean(p.short,350),description:clean(p.description,4000),image,price,salePrice,stock,variants:Array.isArray(p.variants)&&p.variants.length?p.variants.slice(0,16).map(x=>clean(x,35)):['Tiêu chuẩn'],specs:typeof p.specs==='object'&&p.specs&&!Array.isArray(p.specs)?Object.fromEntries(Object.entries(p.specs).slice(0,16).map(([k,v])=>[clean(k,60),clean(v,250)])):{},archived:false,updatedAt:FieldValue.serverTimestamp()},{merge:true});return {ok:true,id}});

export const adminArchiveProduct=callable(async req=>{admin(req);const id=refId(req.data?.id);await db.doc('catalog/'+id).update({archived:true,updatedAt:FieldValue.serverTimestamp()});return {ok:true}});

export const adminUpdateOrder=callable(async req=>{

 admin(req);

 const id=refId(req.data?.orderId),ref=db.doc('orders/'+id);

 return db.runTransaction(async t=>{

  const snap=await t.get(ref);must(snap.exists,'Không tìm thấy đơn hàng.','not-found');

  const order=snap.data(),changes={updatedAt:FieldValue.serverTimestamp()};

  const state=order.status||'pending',next=req.data.status?clean(req.data.status,20):null;

  const allowed={pending:['confirmed','cancelled'],confirmed:['shipping','cancelled'],shipping:['completed'],completed:[],cancelled:[]};

  if(next){must((allowed[state]||[]).includes(next),'Không thể chuyển trạng thái đơn hàng theo hướng này.','failed-precondition');changes.status=next;}

  if(req.data.paymentStatus){

   must(req.data.paymentStatus==='paid','Trạng thái thanh toán không hợp lệ');

   must(['bank','cod'].includes(order.paymentMethod)&&order.paymentStatus==='unpaid'&&state!=='cancelled','Chỉ xác nhận tiền thực nhận cho đơn chưa thanh toán hợp lệ.','failed-precondition');

   changes.paymentStatus='paid';changes.paidConfirmedAt=FieldValue.serverTimestamp();changes.paidConfirmedBy=req.auth.uid;

  }

  const restock=next==='cancelled';

  if(restock){

   const quantities=new Map();for(const item of order.items||[]){const id=refId(item.id);quantities.set(id,(quantities.get(id)||0)+(Number(item.qty)||0));}

   const refs=[...quantities.keys()].map(id=>db.doc('catalog/'+id));const snaps=await Promise.all(refs.map(r=>t.get(r)));

   for(let i=0;i<refs.length;i++)if(snaps[i].exists)t.update(refs[i],{stock:FieldValue.increment(quantities.get(refs[i].id))});

  }

  t.update(ref,changes);return {ok:true};

 });

});

export const adminListOrders=callable(async req=>{admin(req);const max=Math.min(200,Math.max(1,Number(req.data?.limit)||100));const snap=await db.collection('orders').orderBy('createdAt','desc').limit(max).get();return {orders:snap.docs.map(d=>({id:d.id,...d.data(),createdAt:d.data().createdAt?.toMillis()||null,updatedAt:d.data().updatedAt?.toMillis()||null}))}});

export const adminListCustomers=callable(async req=>{

 admin(req);

 const max=Math.min(500,Math.max(1,Number(req.data?.limit)||150));

 const [users,orders]=await Promise.all([db.collection('users').limit(max).get(),db.collection('orders').limit(2000).get()]);

 const map=new Map();

 for(const o of orders.docs){

  const x=o.data(),k=x.userId;if(!k)continue;

  const v=map.get(k)||{orderCount:0,totalSpent:0,lastPurchaseAt:null};

  v.orderCount++;

  if(x.status!=='cancelled'&&x.paymentStatus==='paid')v.totalSpent+=(x.total||0);

  if(!v.lastPurchaseAt||(x.createdAt?.toMillis()||0)>v.lastPurchaseAt)v.lastPurchaseAt=x.createdAt?.toMillis()||null;

  map.set(k,v);

 }

 return {customers:users.docs.map(d=>{

  const x=d.data(),v=map.get(d.id)||{};

  return {uid:d.id,displayName:x.displayName||'',email:x.email||'',phone:x.phone||'',address:x.address||'',adminNote:x.adminNote||'',registeredAt:x.createdAt?.toMillis()||null,orderCount:v.orderCount||0,totalSpent:v.totalSpent||0,lastPurchaseAt:v.lastPurchaseAt||null,status:v.orderCount?'Đã mua':'Khách mới'};

 })};

});

export const adminCustomerDetail=callable(async req=>{admin(req);const uid=refId(req.data?.uid);const [p,o]=await Promise.all([db.doc('users/'+uid).get(),db.collection('orders').where('userId','==',uid).limit(100).get()]);must(p.exists,'Khách hàng không tồn tại','not-found');return {customer:{uid,...p.data(),createdAt:p.data().createdAt?.toMillis()||null},orders:o.docs.map(d=>({id:d.id,total:d.data().total,status:d.data().status,createdAt:d.data().createdAt?.toMillis()||null}))}});

export const adminCustomerNote=callable(async req=>{admin(req);const uid=refId(req.data?.uid),note=clean(req.data?.note,800);await db.doc('users/'+uid).update({adminNote:note});return {ok:true}});

const PUBLIC_SETTINGS=['headline','promo','heroImage','saleImage','contactEmail','phone','address','shippingFee','freeShippingFrom','bankName','bankId','bankAccount','bankHolder'];

export const adminUpdateSettings=callable(async req=>{admin(req);const x=obj(req.data?.updates),out={updatedAt:FieldValue.serverTimestamp()};must(Object.keys(x).length<=PUBLIC_SETTINGS.length,'Quá nhiều trường cập nhật');for(const [key,value] of Object.entries(x)){must(PUBLIC_SETTINGS.includes(key),'Trường không được phép cập nhật');out[key]=['shippingFee','freeShippingFrom'].includes(key)?limitMoney(value):['heroImage','saleImage'].includes(key)?validateMediaURL(value):clean(value,1000)}const snap=await db.doc('site/settings').get(),now={...(snap.data()||{}),...out};

 must(!now.heroImage||now.heroImage!==now.saleImage,'Hai banner phải dùng ảnh khác nhau.');

 for(const field of ['heroImage','saleImage'])if(now[field]){

  must(!now[field].startsWith('assets/img/products/')&&!now[field].startsWith('assets/img/categories/'),'Không dùng ảnh sản phẩm/danh mục làm banner.');

  const used=await db.collection('catalog').where('image','==',now[field]).limit(1).get();

  must(used.empty,'Ảnh banner đang được dùng cho sản phẩm.','already-exists');

 }

 await db.doc('site/settings').set(out,{merge:true});return {ok:true}});

export const adminSavePost=callable(async req=>{admin(req);const p=obj(req.data?.post),slug=clean(p.slug,100);must(/^[a-z0-9-]{3,100}$/.test(slug),'Đường dẫn bài viết không hợp lệ');must(clean(p.title).length>5,'Chưa nhập tiêu đề');must(Array.isArray(p.content)&&p.content.length<=25,'Nội dung không hợp lệ');const image=validateMediaURL(p.image);await db.doc('posts/'+slug).set({slug,title:clean(p.title,170),intro:clean(p.intro,500),content:p.content.map(x=>clean(x,3500)),image,category:clean(p.category,70),date:clean(p.date,40),published:p.published===true,updatedAt:FieldValue.serverTimestamp()},{merge:true});return {ok:true}});


// Image library: derive sha256 and 64-bit difference hash to avoid duplicates/near-duplicates.

async function hashes(buffer){const normalized=await sharp(buffer).rotate().resize(800,800,{fit:'inside',withoutEnlargement:true}).webp({quality:82,effort:5}).toBuffer();const raw=await sharp(normalized).greyscale().resize(9,8,{fit:'fill'}).raw().toBuffer({resolveWithObject:true});let bits='';for(let y=0;y<8;y++)for(let x=0;x<8;x++)bits+=(raw.data[y*9+x]>raw.data[y*9+x+1])?'1':'0';return {buffer:normalized,sha256:crypto.createHash('sha256').update(normalized).digest('hex'),dhash:BigInt('0b'+bits).toString(16).padStart(16,'0')}}

function hamming(a,b){let n=BigInt('0x'+a)^BigInt('0x'+b),count=0;while(n){count++;n&=n-1n}return count}

async function saveImage(uid,bytes,label,kind='upload'){

 must(bytes.length<=12*1024*1024,'Ảnh quá lớn.');let info;try{info=await hashes(bytes)}catch{throw new HttpsError('invalid-argument','Tệp ảnh không hợp lệ.')}

 const previous=await db.collection('media').limit(500).get();for(const d of previous.docs){const p=d.data();if(p.sha256===info.sha256||p.dhash&&hamming(p.dhash,info.dhash)<=6)throw new HttpsError('already-exists','Ảnh trùng hoặc quá giống ảnh đã lưu trong thư viện.');}

 const id=crypto.randomUUID(),storagePath=`public/sporthub/${id}.webp`,token=crypto.randomUUID();const bucket=getStorage().bucket();await bucket.file(storagePath).save(info.buffer,{resumable:false,metadata:{contentType:'image/webp',cacheControl:'public,max-age=31536000,immutable',metadata:{firebaseStorageDownloadTokens:token}}});

 const url=`https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(storagePath)}?alt=media&token=${token}`;

 await db.doc('media/'+id).set({url,storagePath,label:clean(label,200),kind,sha256:info.sha256,dhash:info.dhash,createdBy:uid,createdAt:FieldValue.serverTimestamp()});return {id,url};

}

export const adminUploadMedia=callable(async req=>{const uid=admin(req);await checkRate(uid,'upload',12);const b64=clean(req.data?.base64,7_000_000);must(b64.length>0&&b64.length<6_000_000&&/^[A-Za-z0-9+/=]+$/.test(b64),'Dữ liệu ảnh không hợp lệ');return saveImage(uid,Buffer.from(b64,'base64'),clean(req.data?.label,120),'upload')},{memory:'1GiB'});

export const adminGenerateImage=callable(async req=>{const uid=admin(req);await checkRate(uid,'ai',45);const data=obj(req.data),prompt=clean(data.prompt,1500),type=clean(data.type,50),style=clean(data.style,50),ratio=clean(data.ratio,5);must(prompt.length>=15,'Vui lòng mô tả ảnh chi tiết hơn.');must(['Ảnh sản phẩm','Banner trang chủ','Banner khuyến mãi','Ảnh danh mục','Ảnh bài viết'].includes(type),'Loại ảnh không hợp lệ');must(['Thể thao chân thực','Studio cao cấp','Năng động ngoài trời','Đồ họa tối giản'].includes(style),'Phong cách không hợp lệ');must(['1:1','3:2','2:3'].includes(ratio),'Tỷ lệ không hợp lệ');

 const apiKey=AI_SECRET.value();must(Boolean(apiKey),'AI chưa được kết nối. Hãy cấu hình OPENAI_API_KEY.','failed-precondition');

 const dimensions=ratio==='1:1'?'1024x1024':ratio==='3:2'?'1536x1024':'1024x1536';

 let response;try{response=await fetch('https://api.openai.com/v1/images/generations',{method:'POST',headers:{Authorization:`Bearer ${apiKey}`,'Content-Type':'application/json'},body:JSON.stringify({model:'gpt-image-1',size:dimensions,quality:'medium',n:1,prompt:`Create an original, professional sport & wellness e-commerce image. Intended use: ${type}. Art direction: ${style}. No text, no watermark, no brand logos unless explicitly supplied. User description (Vietnamese): ${prompt}. Avoid inventing technical attributes for real branded goods.`})})}catch{throw new HttpsError('unavailable','Không kết nối được dịch vụ tạo ảnh AI.');}

 if(!response.ok){const raw=await response.text();console.error('AI API failure',response.status,raw.slice(0,350));throw new HttpsError('failed-precondition','API tạo ảnh không hoạt động. Kiểm tra khóa, quyền truy cập và hạn mức.');}

 const json=await response.json();const base64=json.data?.[0]?.b64_json;must(Boolean(base64),'API không trả về dữ liệu ảnh.','internal');return saveImage(uid,Buffer.from(base64,'base64'),prompt.slice(0,100),'ai');

},{secrets:[AI_SECRET],memory:'1GiB',timeoutSeconds:180});

export const adminDeleteMedia=callable(async req=>{admin(req);const id=clean(req.data?.id,50);must(/^[a-f0-9-]{36}$/.test(id),'Mã ảnh không hợp lệ');const ref=db.doc('media/'+id),doc=await ref.get();must(doc.exists,'Ảnh không tồn tại','not-found');const used=await db.collection('catalog').where('image','==',doc.data().url).limit(1).get();must(used.empty,'Ảnh đang được gắn với sản phẩm, không thể xóa.','failed-precondition');const [site,postUsage]=await Promise.all([db.doc('site/settings').get(),db.collection('posts').where('image','==',doc.data().url).limit(1).get()]);must(site.data()?.heroImage!==doc.data().url&&site.data()?.saleImage!==doc.data().url&&postUsage.empty,'Ảnh đang được sử dụng trên website.','failed-precondition');await getStorage().bucket().file(doc.data().storagePath).delete({ignoreNotFound:true});await ref.delete();return {ok:true}});
