# SPORTHUB - PHIEN BAN GITHUB PAGES

**Website se duoc dang tai dia chi:**

https://tranthiquynhnhu0901-hue.github.io/the-thao-song-khoe/

**Repository:** https://github.com/tranthiquynhnhu0901-hue/the-thao-song-khoe

## 1. Sua loi giao dien mat CSS

ZIP nay da duoc chinh theo TEN repository `the-thao-song-khoe`. Cac trang HTML (`index.html` o trang chu va trong tung thu muc san pham, danh muc) la binh thuong: GitHub Pages cho phep moi trang co `index.html` rieng. CSS duoc tai tu `assets/css/style.css` bang duong dan tuong doi DUNG cho moi cap thu muc, VA duoc nhung them trong HTML de tranh hien trang khong co dinh dang neu file CSS bi chan.

**Quan trong: Upload NOI DUNG ZIP vao GOC repository, khong upload nguyen ZIP, khong dat tat ca file trong mot thu muc SPORTHUB o ben trong repository.**

Cau truc can co tren GitHub:

```
the-thao-song-khoe (REPOSITORY ROOT)
  index.html
  assets/css/style.css
  assets/js/app.js
  assets/js/products.js
  assets/js/site-config.js
  assets/img/...
  san-pham/index.html
  san-pham/<ten-san-pham>/index.html
  danh-muc/<ten-danh-muc>/index.html
  quan-tri/index.html
  tai-khoan/index.html
  robots.txt
  sitemap.xml
  404.html
  xem-truoc.html
  .nojekyll
```

## 2. Cap nhat tren GitHub

1. Giai nen ZIP moi.
2. Mo repository: https://github.com/tranthiquynhnhu0901-hue/the-thao-song-khoe
3. Trong tab Code, bao dam nhan `main` va xac dinh thu muc goc. Neu co mot thu muc `SPORTHUB/` chua website cu, **khong tai tiep vao thu muc do**.
4. Chon **Add file > Upload files**, tai LEN CAC TAP TIN VA THU MUC BEN TRONG ZIP vao goc repo. Ghi de cac file cu cung duong dan. Xoa ban nhap/ban demo cu khong can thiet neu no dang lam trang chu.
5. **Commit changes**. Mo **Settings > Pages**: Deploy from a branch, Branch `main`, Folder `/ (root)`.
6. Cho GitHub Pages build xong va mo: https://tranthiquynhnhu0901-hue.github.io/the-thao-song-khoe/
7. Neu trinh duyet con hien giao dien cu, dung Ctrl+Shift+R hoac kiem tra file CSS bang lien ket: https://tranthiquynhnhu0901-hue.github.io/the-thao-song-khoe/assets/css/style.css

**Neu muon mot URL HOAN TOAN MOI:** can tao/doi ten repository (vi du `sporthub-vietnam`) trong tai khoan cua ban, sau do chay lenh tao lai URLs ben duoi truoc khi tai len. ZIP hien tai SU DUNG repo da co trong anh ban gui, khong tu tao repo moi.

## 3. Xem truoc tren may va che do demo

- Mo `index.html` sau khi giai nen de xem trang chu co SEO.
- Mo `xem-truoc.html` de xem **ban demo tuong tac 1 file** voi tai khoan/quang tri demo, khong can Firebase. File nay khong duoc Google lap chi muc.
- Trong website chinh, trang tai khoan, quan tri, don hang that, CRM va xuong AI **chi hoat dong sau khi ket noi backend**; khong co tai khoan demo duoc cap quyen admin that.
- Hinh anh san pham BAN DAU la SVG minh hoa va TU DONG DOI sang WebP neu ban upload file anh that dung ten vao assets/img/products/. Xem file HUONG-DAN-THAY-ANH-WEBP.md. Khong duoc coi anh minh hoa la anh xac thuc cua hang that.

## 4. SEO on-page da tinh chinh

- Canonical, Open Graph URL, OG image, Twitter card, sitemap, robots.txt dung URL repo cua ban.
- `index.html` trang chu co title, description, H1, markup noi dung san va Organisation/WebSite JSON-LD.
- 40 trang san pham co title, description, URL rieng, H1, Product/BreadcrumbList JSON-LD (chua khai gia ban that trong schema vi gia chi tham khao).
- 8 danh muc co CollectionPage / ItemList schema va breadcrumb; 3 bai viet co Article schema.
- URL admin, tai khoan, gio hang va checkout duoc noindex; loai khoi sitemap.
- Trang chu va 62 trang con khong can JavaScript de hien phan noi dung ban dau; CSS da duoc nhung du phong trong moi trang.

Sau khi sua thong tin san pham hoac doi ten repo, tu goc du an chay:

```
python scripts/build-pages.py --base https://tranthiquynhnhu0901-hue.github.io/the-thao-song-khoe/
```

Can Python 3 va Node.js de tai tao truoc khi deploy neu ban MUON sua du lieu hang loat; **khong can cai gi khi chi tai ZIP len GitHub Pages.** Sau khi thay doi thong tin tren backend, static SEO snapshots phai duoc tai tao de khong bi stale.

## 5. Gioi han can biet

Trang nay hien la giao dien + du lieu mau va ma backend de cau hinh. **Chua co ket noi Firebase, Google Authentication, Firestore hoac API AI cua chu website.** GitHub Pages khong chay backend, khong xac thuc gia/tinh tien hay luu don hang. Khong dat API key bi mat, tai khoan admin, CRM hay thong tin khach hang vao repository.

De cau hinh mang ban hang thuc: xem `HUONG-DAN-KET-NOI-BACKEND.md`. Khong duoc go `noindex` de SEO nguoi dung/don hang. Khong khang dinh diem Lighthouse khi chua kiem tra tren site live.

## 6. Thay anh minh hoa bang WebP KHONG CAN SUA CODE

Xem `HUONG-DAN-THAY-ANH-WEBP.md`. Dung ten file SVG, chi doi duoi `.webp`. Vi du `assets/img/products/ao-khoac-gio-tempo.webp`. Website tu uu tien WebP, thieu se dung SVG. Nhớ upload file anh moi vao dung duong dan tren GitHub, phai commit vao nhanh `main`.
