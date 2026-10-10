# SPORTHUB — Website thương mại điện tử thể thao

Bản giao diện tĩnh **HTML + CSS + JavaScript thuần**, kèm backend mẫu **Firebase Authentication + Firestore + Cloud Functions + Storage**. Không có bước build frontend. Toàn bộ giao diện bằng tiếng Việt, tương thích với GitHub Pages.

> **Trạng thái bàn giao:** Giao diện và mã nguồn có thể xem trước ngay. Đây là bộ sản phẩm **minh họa**, không phải cửa hàng đang nhận đơn thật. Google Sign-In, CRM, đơn hàng, quản trị lưu dữ liệu, thư viện ảnh AI cần Firebase đã triển khai và chủ cửa hàng tự cấu hình. Không tạo dữ liệu mua hàng hay trạng thái thanh toán giả.

## 1. Xem trước ngay bằng `index.html`

1. Giải nén `SPORTHUB-GIAO-DIEN-ANH-CHUP-LINK-NOI-BO.zip`.
2. Mở thư mục `SPORTHUB`, nhấp đúp **`index.html`** để xem trang chủ. Mã HTML đã có nội dung hiển thị sẵn để tránh trang trắng nếu JavaScript không chạy. Khi CSS/JS đi kèm bị chặn bởi công cụ xem file, bản xem trước tĩnh `SPORTHUB-XEM-TRUOC.html` (được bàn giao riêng) vẫn hiển thị trang chủ đầy đủ.
3. Bấm các menu để xem cửa hàng, chi tiết sản phẩm, bộ lọc, giỏ hàng, bài viết, thông tin và chính sách. Ở cuối trang có liên kết **Xem trước giao diện quản trị** (chỉ đọc).
4. Nếu trình duyệt hạn chế hoạt động của `file://`, mở thư mục bằng Live Server hoặc chạy `python -m http.server 8000`, rồi truy cập `http://localhost:8000/`. Không yêu cầu Node.js cho phần giao diện.

**Tương tác hoạt động khi chưa có backend:** tìm kiếm, lọc, sắp xếp, xem sản phẩm, thêm/xóa/tăng/giảm giỏ hàng, danh sách yêu thích lưu cục bộ, điều hướng các trang, giao diện thanh toán và xem trước giao diện quản trị. **Không hoạt động cho đến khi cấu hình:** đăng nhập Google, lưu đơn thật, dữ liệu CRM, quản trị ghi dữ liệu, tạo ảnh thật. Các thao tác này bị chặn và hiển thị thông báo cấu hình.

## 2. Đưa website lên GitHub Pages

1. Đăng nhập GitHub → **New repository** → gợi ý tên **`the-thao-song-khoe`** → tạo repository công khai.
2. Chọn **Add file → Upload files**. Tải **toàn bộ nội dung bên trong thư mục `SPORTHUB`**, gồm `index.html`, `assets/`, các thư mục trang con, `404.html`, `sitemap.xml`, `robots.txt` lên **thư mục gốc của repository**. Không tải nguyên ZIP làm nội dung website.
3. Mở **Settings → Pages** → **Build and deployment**: `Deploy from a branch` → nhánh `main`, thư mục `/ (root)` → **Save**.
4. Khi GitHub Pages hoàn tất xuất bản, mở địa chỉ dạng `https://TEN_GITHUB.github.io/TEN_REPOSITORY/`.
5. Thử mở trực tiếp đường dẫn `.../san-pham/ao-thun-chay-bo-aero/` để kiểm tra định tuyến trang sản phẩm.

**Quan trọng cho SEO:** Bộ URL canonical và `sitemap.xml` đang lấy URL mẫu `https://tranthiquynhnhu0901-hue.github.io/the-thao-song-khoe/`. Nếu tài khoản/repository khác, trước khi tải lên GitHub hãy chạy một lệnh từ thư mục gốc:

```bash
python scripts/build-pages.py --base https://TEN_GITHUB.github.io/TEN_REPOSITORY/
```

Lệnh tự tạo lại toàn bộ trang HTML, canonical, sitemap và robots theo đường dẫn mới; **không** cần chỉnh hàng chục file thủ công. Mã liên kết nội bộ và CSS dùng đường dẫn tương đối, hoạt động cả trong repository con. Nếu dùng custom domain, thay `--base` bằng URL domain thật.

**Lưu ý GitHub Pages:** Chỉ xuất bản HTML/CSS/JS/SVG và các tệp tĩnh. GitHub Pages **không** chạy Firebase Functions, lưu đơn hàng, lưu CRM hoặc giữ API key bảo mật. Dữ liệu riêng tư phải nằm ngoài GitHub.

## 3. Kết nối Firebase để vận hành thực tế

**Yêu cầu khi tự triển khai:** Tài khoản Firebase/Google Cloud có quyền quản trị dự án; Node.js 20+, npm, Firebase CLI. Cloud Functions và AI thường yêu cầu bật gói thanh toán Firebase và có thể phát sinh chi phí. Không có khóa mật nào được đưa sẵn trong ZIP.

1. Tạo dự án trên [Firebase Console](https://console.firebase.google.com/), tạo **Web app**.
2. Bật **Authentication → Sign-in method → Google**. Trong **Authorized domains**, thêm domain GitHub Pages (`TEN_GITHUB.github.io`) hoặc tên miền riêng, theo yêu cầu của Firebase.
3. Bật **Cloud Firestore** ở chế độ bảo mật, chọn khu vực phù hợp. Bật **Cloud Storage** và **Cloud Functions** (nếu vùng `asia-southeast1` không hỗ trợ dịch vụ ở dự án của bạn, cập nhật hằng `REGION` ở `functions/index.js` và `region` ở `assets/js/site-config.js` cho khớp).
4. Mở `assets/js/site-config.js`, điền **Firebase Web SDK config** (`apiKey`, `authDomain`, `projectId`, `storageBucket`, `messagingSenderId`, `appId`) do Firebase Console cung cấp. Đây là cấu hình web **công khai**, không phải khóa quản trị. **Không** điền khóa OpenAI hoặc service-account key vào file này.
5. Cài Firebase CLI trên máy cá nhân:

```bash
npm install -g firebase-tools
firebase login
cd functions
npm install
cd ..
firebase use --add
```

6. Xem `firebase.json`, `firestore.rules`, `storage.rules` trước khi triển khai. Tạo project alias bằng CLI (hoặc `cp .firebaserc.example .firebaserc` rồi thay project ID; `.firebaserc` được loại khỏi gói Git và chứa ID dự án, không phải bí mật). Sau đó triển khai:

```bash
firebase deploy --only firestore:rules,storage
firebase deploy --only functions
```

**Lưu ý khi triển khai toàn bộ functions:** Hàm tạo ảnh `adminGenerateImage` tham chiếu Secret Manager secret `OPENAI_API_KEY`; hãy tạo secret trước theo mục 6. Nếu chưa dùng AI, chỉ triển khai các function lõi (bỏ `adminGenerateImage`) bằng cú pháp `firebase deploy --only functions:placeOrder,functions:adminSeedCatalog,...`. Khi đã có secret, triển khai toàn bộ. Backend không nên chạy bằng GitHub Actions với khóa quản trị công khai.

## 4. Cấp quyền quản trị DUY NHẤT

Email chủ website đã được cố định ở tầng **Firebase Cloud Functions và Firestore rules** là `tranthiquynhnhu0901@gmail.com`, **nhưng chỉ trùng email là chưa đủ**: người dùng phải đăng nhập Google, email đã được xác minh và có **Firebase custom claim** `admin: true`.

1. Đăng nhập lần đầu vào website bằng đúng Google email đã nêu để Firebase tạo tài khoản.
2. Trên máy quản trị đáng tin cậy, thiết lập Application Default Credentials (ADC) bằng Google Cloud CLI hoặc biến môi trường `GOOGLE_APPLICATION_CREDENTIALS` trỏ tới tệp credential **nằm ngoài repository**.
3. Chạy:

```bash
cd functions
GOOGLE_CLOUD_PROJECT=YOUR_FIREBASE_PROJECT_ID node grant-admin.mjs
cd ..
```

4. Đăng xuất rồi đăng nhập lại để nhận custom claim mới. Mở `/quan-tri/`. Chỉ khi được xác minh, tài khoản mới gọi được các Cloud Functions quản trị và đọc dữ liệu CRM.

**Không** đưa service-account JSON, mật khẩu, token Google, dữ liệu khách hàng hoặc OpenAI API key lên GitHub. Đăng nhập Google không lưu mật khẩu trong website. Các tài khoản Google khác chỉ có quyền khách hàng. Không có `localStorage` nào cấp quyền quản trị.

## 5. Nhập dữ liệu mẫu và mở bán

Trong `/quan-tri/` → **Tổng quan** → **Nhập 40 sản phẩm mẫu lên hệ thống**. Đây là callable Cloud Function chỉ dành cho admin. Thao tác không ghi đè sản phẩm đã tồn tại, nhằm tránh mất chỉnh sửa.

Trước khi nhận đơn **thật**, chủ website cần thay giá tham khảo, số tồn, chính sách bảo hành/đổi trả, chất liệu/kích thước, hình ảnh sản phẩm thực và thông tin liên hệ. **40 sản phẩm hiển thị 40 ảnh chụp tham khảo khác nhau từ Pexels**, đồng thời mỗi sản phẩm có ảnh SVG dự phòng riêng trong ZIP. Ảnh chụp này tải trực tuyến từ CDN Pexels, **không nằm trong ZIP** và có thể không xuất hiện khi xem offline. Hình ảnh chỉ minh họa chủng loại; **không phải ảnh kiểm chứng của đúng mẫu SPORTHUB**. Khi kinh doanh thật, hãy thay bằng ảnh đúng SKU trong Xưởng tạo ảnh/Thư viện ảnh ở quản trị (ảnh sản phẩm thật nên do chủ shop cung cấp). Không quảng cáo sai sản phẩm thực tế.

Sau khi backend hoạt động, checkout yêu cầu đăng nhập Google và gọi `placeOrder`. Máy chủ đọc lại sản phẩm từ Firestore, kiểm tra tồn kho, tính giá, giảm tồn, lưu đơn và profile trong một transaction. Người dùng không thể tự tạo hay sửa đơn bằng quyền ghi Firestore client. Chủ shop cập nhật trạng thái đơn qua function có kiểm tra phân quyền. Đơn chuyển khoản luôn bắt đầu với `paymentStatus=unpaid`; chỉ admin sau **đối soát thực nhận** mới có thể đánh dấu đã thanh toán.

Cấu hình COD, tên ngân hàng, số tài khoản, người nhận, phí giao và miễn phí giao tại **Quản trị → Cài đặt website**. Mã QR VietQR chỉ xuất hiện sau khi tạo đơn chuyển khoản hợp lệ; việc hiển thị QR **không** xác nhận đã nhận tiền. Đối với COD, chỉ xác nhận đã nhận tiền sau khi có chứng từ giao hàng hợp lệ.

## 6. Xưởng tạo ảnh AI thật

Backend `adminGenerateImage` gọi **OpenAI Images API** từ Cloud Functions, không gọi trực tiếp từ trình duyệt. Chỉ tài khoản admin đã được cấp custom claim mới được phép tạo ảnh. Ảnh đầu ra chuyển sang WebP rồi được đối chiếu hash SHA-256 và difference-hash để từ chối ảnh trùng/gần giống trong thư viện; không thể bảo đảm loại hết mọi trùng lặp thị giác.

Cấu hình secret an toàn trên máy quản trị:

```bash
firebase functions:secrets:set OPENAI_API_KEY
firebase deploy --only functions
```

Secret nằm ở Firebase Secret Manager, không được ghi vào mã nguồn hoặc GitHub. Việc gọi API có thể phát sinh phí và yêu cầu quyền dùng model tương ứng. Xưởng AI cho phép nhập mô tả tiếng Việt, chọn loại ảnh, phong cách, tỷ lệ và xem kết quả đã lưu trong Cloud Storage. Khi không có secret hoặc API không khả dụng, hàm trả lỗi rõ ràng; không dùng ảnh có sẵn để giả kết quả.

Trong **Thư viện ảnh**, admin cũng có thể tải lên PNG/JPEG/WebP (tối đa 4 MB), kiểm tra ảnh trùng, xem trước, sao chép URL để sử dụng tại banner/sản phẩm/bài viết và xóa ảnh không còn sử dụng. URL ảnh trong trang công khai là URL có token đọc công khai (chỉ sử dụng với ảnh được phép xuất bản). Không đưa dữ liệu khách hàng vào ảnh AI hay mô tả.

## 7. Cấu trúc thư mục

```text
SPORTHUB/
├── index.html                 # trang chủ có nội dung HTML hiển thị sẵn
├── assets/
│   ├── css/style.css          # thiết kế responsive
│   ├── js/site-config.js      # Firebase Web config công khai
│   ├── js/products.js         # 40 sản phẩm minh họa
│   ├── js/app.js              # giao diện dùng chung + nghiệp vụ client
│   └── img/                   # SVG sản phẩm, danh mục, banner, bài viết
├── san-pham/                  # danh sách và 40 đường dẫn chi tiết
├── danh-muc/                  # 8 đường dẫn danh mục
├── gio-hang/, thanh-toan/, gioi-thieu/, lien-he/
├── bai-viet/                  # danh sách và trang bài viết
├── tai-khoan/, dang-nhap/, quan-tri/
├── chinh-sach-mua-hang/, bao-mat/
├── functions/                 # backend Firebase có kiểm tra quyền
├── firestore.rules           # quy tắc cơ sở dữ liệu
├── storage.rules             # quy tắc kho lưu trữ
├── firebase.json
├── scripts/build-pages.py    # tạo lại route + SEO metadata
├── scripts/prerender.mjs     # tạo HTML tĩnh để tránh trang trắng
├── scripts/smoke-test.mjs    # test không cần trình duyệt
├── sitemap.xml, robots.txt, 404.html
└── README.md
```

Một mẫu trang chi tiết và một mẫu thẻ sản phẩm, không nhân bản mã giao diện cho 40 sản phẩm. Các đường dẫn sản phẩm, danh mục và bài viết mẫu có **file index.html vật lý** nên mở trực tiếp trên GitHub Pages không bị 404.

## 8. Kiểm thử và giới hạn đã biết

Đã có script kiểm tra các giao diện chính, dữ liệu sản phẩm, bộ lọc danh mục, giỏ hàng cục bộ, ảnh riêng và định tuyến. Chạy lại:

```bash
node --check assets/js/app.js
node --check functions/index.js
node scripts/smoke-test.mjs
```

Để kiểm thử tích hợp **thực tế**, cần cấu hình dự án Firebase thật, domain GitHub Pages, chức năng thanh toán, quyền admin, Google OAuth, Firestore Rules, Storage Rules và API tạo ảnh. Chưa có Firebase project/API key của chủ website nên không thể xác minh các bước đó trong gói bàn giao. Đồng thời chưa thể xác nhận điểm Lighthouse khi chưa triển khai trên domain thật.

**Hạn chế:** Thông số và giá là ví dụ, chưa đại diện cho hàng hóa thương mại. CRM hiện lấy tối đa 150 khách hàng và 2.000 đơn hàng khi tổng hợp mỗi lượt tải; khi mở rộng vượt quy mô này nên bổ sung cursor pagination/aggregation máy chủ. Trang mới do admin thêm sau khi website đã xuất bản hiển thị bằng URL truy vấn dự phòng; để có permalink tĩnh và SEO hoàn chỉnh cho các sản phẩm mới, cần tạo lại trang route hoặc chuyển sang hosting hỗ trợ SSR/pre-render khi mở rộng. Mẫu 40 sản phẩm và 3 bài viết ban đầu đã có đường dẫn tĩnh đầy đủ.

**Ghi chú bảo mật:** Không mở rộng quyền Firestore để thử nhanh (`allow read, write: if true`). Hãy kiểm tra CORS/Auth/domain, triển khai rules và cấp claim đúng cách. Để kết nối các tích hợp khác cần thêm backend riêng, không đặt secret trong JavaScript frontend.

## 9. Khắc phục khung xem trước trắng trong ChatGPT

ChatGPT có thể hiển thị một file HTML mà không tải được thư mục `assets/` ở bên cạnh. Trong phiên bản đầu, `#app` là một phần tử rỗng chờ `app.js` tạo toàn bộ trang, vì vậy công cụ chỉ xem HTML đơn lẻ có thể hiển thị màn hình trắng. Bản này đã được bổ sung nội dung HTML tĩnh (pre-render) cho toàn bộ 63 trang và nhúng CSS cùng ảnh vào riêng `index.html`. Để xem độc lập không cần JavaScript, mở file `SPORTHUB-XEM-TRUOC.html` bàn giao cạnh file ZIP; đây là bản giao diện tĩnh, không thay thế trang bán hàng có chức năng thực.

Khi triển khai lên GitHub Pages, phải **tải lên toàn bộ nội dung bên trong thư mục SPORTHUB**, không chỉ tải riêng `index.html`. Để tạo lại nội dung HTML sau khi thay đổi sản phẩm/mã nguồn, chạy `python scripts/build-pages.py --base https://TEN_GITHUB.github.io/TEN_REPOSITORY/` rồi tải các tệp đã thay đổi. Lệnh cần Python và Node.js trên máy tạo trang; **website đã đóng gói không cần build** khi tải lên GitHub Pages.

## 9. Ảnh chụp sản phẩm, liên kết nội bộ và hạn chế xem trước

- 40 ảnh sản phẩm, 8 ảnh danh mục, 2 banner chính và 3 ảnh bài viết là ảnh chụp tham khảo (Pexels). Ảnh trực tuyến được nhúng bằng thẻ `<img>` **không phải liên kết đưa khách sang Pexels**. Nguồn ảnh dùng giấy phép Pexels, xem `PHOTO-CREDITS.md`.
- **Cần Internet** để tải ảnh chụp. Khi mất mạng, JavaScript thay bằng SVG riêng cho từng sản phẩm. Nếu muốn toàn bộ ảnh chụp có sẵn OFFLINE trong file ZIP, chủ website phải tải các ảnh có quyền sử dụng về máy và đặt lên hosting/CDN của mình, rồi sửa đường dẫn ảnh qua quản trị.
- Các nút **Xem sản phẩm / Mua ngay / Thêm giỏ / Danh mục / Blog / Giỏ hàng / Thanh toán / Tài khoản** đều tương tác nội bộ trong SPORTHUB; không điều hướng tới website thương mại điện tử khác.
- LƯU Ý: ảnh chụp là stock photos, có thể hiển thị nhãn hãng khác; **không sử dụng để khẳng định mẫu hàng thực, không công bố thương hiệu sai**. Muốn kinh doanh thực tế, cần ảnh thật của đúng hàng.
- `index.html` là file khởi động để xem trước. Trang quản trị có demo chỉ đọc tại `quan-tri/?demo=1`. Muốn AI tạo ảnh **bên trong chính website**, nhập Firebase và `OPENAI_API_KEY` qua Secret Manager rồi sử dụng `Quản trị → Xưởng tạo ảnh AI`.
