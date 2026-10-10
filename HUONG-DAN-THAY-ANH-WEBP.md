# SPORTHUB - TỰ ĐỘNG THAY ẢNH SẢN PHẨM BẰNG WEBP

Website hiện hiển thị **SVG minh họa**. Mã nguồn đã được đổi để **ưu tiên file WebP lưu ngay trên GitHub**. Khi ảnh WebP chưa có, trình duyệt tự chuyển sang SVG cùng tên. Không cần đổi `products.js` sau mỗi lần thêm ảnh.

## Cách thay ảnh

1. Chuẩn bị ảnh sản phẩm thật được quyền sử dụng; ảnh đúng sản phẩm, không cần trùng nội dung với SVG.
2. Xuất ảnh sang định dạng WebP, nên có độ phân giải vuông khoảng **800 × 800 px**, dung lượng mục tiêu dưới **200 KB** nếu chất lượng cho phép.
3. Đặt tên giống hệt file SVG, chỉ đổi đuôi `.svg` thành `.webp` (viết chữ thường, không dấu, không dấu cách). Ví dụ:

   `assets/img/products/ao-khoac-gio-tempo.svg` (ảnh minh họa hiện có)

   `assets/img/products/ao-khoac-gio-tempo.webp` (ảnh thật bạn tải lên sau)

4. Mở repository `tranthiquynhnhu0901-hue/the-thao-song-khoe`, tải ảnh mới vào đúng thư mục `assets/img/products/`, sau đó commit vào nhánh đang được GitHub Pages triển khai.
5. Chờ GitHub Pages cập nhật, mở lại website và nhấn **Ctrl + Shift + R** nếu trình duyệt còn nhớ ảnh cũ.

**Quan trọng:** Đổi phần mở rộng trên tên file không biến ảnh JPG/PNG thành WebP thật; hãy dùng phần mềm xuất/chuyển đổi sang WebP. Phân biệt chữ hoa chữ thường khi đặt tên. Giữ lại ảnh SVG để dự phòng.

**Kiểm tra:** Mở trực tiếp `https://tranthiquynhnhu0901-hue.github.io/the-thao-song-khoe/assets/img/products/ao-khoac-gio-tempo.webp` để chắc rằng ảnh đã được tải lên. Nếu URL này báo 404, website vẫn dùng SVG.

Ảnh trang chủ sản phẩm, trang danh mục, trang chi tiết, giỏ hàng và khu quản trị đều dùng chung dữ liệu ảnh nên cùng tự chuyển sang WebP. `xem-truoc.html` là bản xem giao diện một file; khi được đặt ở gốc repo, nó cũng sẽ cố tải ảnh WebP trong thư mục `assets/img/products/`, nếu không có sẽ sử dụng SVG nhúng sẵn.

Khi muốn metadata ảnh Open Graph, Product JSON-LD phản ánh đúng file WebP mới, chạy lại `python scripts/build-pages.py --base https://tranthiquynhnhu0901-hue.github.io/the-thao-song-khoe/` và đẩy các HTML đã tạo lên GitHub (không bắt buộc để website hiển thị ảnh WebP sau khi upload).

## Danh sách tên ảnh WebP cho 40 sản phẩm

| STT | Sản phẩm | Tên ảnh WebP |
|---|---|---|
| 01 | `Áo thun chạy bộ Aero` | `ao-thun-chay-bo-aero.webp` |
| 02 | `Áo bóng rổ Court Move` | `ao-bong-ro-court-move.webp` |
| 03 | `Quần short tập luyện Sprint` | `quan-short-tap-luyen-sprint.webp` |
| 04 | `Áo polo thể thao Active` | `ao-polo-the-thao-active.webp` |
| 05 | `Áo khoác gió Tempo` | `ao-khoac-gio-tempo.webp` |
| 06 | `Quần legging Flex` | `quan-legging-flex.webp` |
| 07 | `Áo thể thao nữ Motion` | `ao-the-thao-nu-motion.webp` |
| 08 | `Giày chạy bộ Roadflow` | `giay-chay-bo-roadflow.webp` |
| 09 | `Giày tập gym GroundFit` | `giay-tap-gym-groundfit.webp` |
| 10 | `Giày Pickleball Court One` | `giay-pickleball-court-one.webp` |
| 11 | `Giày cầu lông Swiftstep` | `giay-cau-long-swiftstep.webp` |
| 12 | `Giày đi bộ Everyday` | `giay-i-bo-everyday.webp` |
| 13 | `Giày lifestyle Street Pace` | `giay-lifestyle-street-pace.webp` |
| 14 | `Bộ tạ tay neoprene` | `bo-ta-tay-neoprene.webp` |
| 15 | `Tạ ấm Kettlebell Core` | `ta-am-kettlebell-core.webp` |
| 16 | `Bộ dây kháng lực 3 mức` | `bo-day-khang-luc-3-muc.webp` |
| 17 | `Con lăn tập bụng AB Wheel` | `con-lan-tap-bung-ab-wheel.webp` |
| 18 | `Dây nhảy tốc độ Pulse` | `day-nhay-toc-o-pulse.webp` |
| 19 | `Bánh tạ bọc cao su` | `banh-ta-boc-cao-su.webp` |
| 20 | `Vợt Pickleball Nova` | `vot-pickleball-nova.webp` |
| 21 | `Vợt Pickleball Control X` | `vot-pickleball-control-x.webp` |
| 22 | `Bộ bóng Pickleball 6 quả` | `bo-bong-pickleball-6-qua.webp` |
| 23 | `Túi đựng vợt Pickleball` | `tui-ung-vot-pickleball.webp` |
| 24 | `Băng quấn cán vợt` | `bang-quan-can-vot.webp` |
| 25 | `Vợt cầu lông Airspeed` | `vot-cau-long-airspeed.webp` |
| 26 | `Ống cầu lông tập luyện` | `ong-cau-long-tap-luyen.webp` |
| 27 | `Bộ dây cước cầu lông` | `bo-day-cuoc-cau-long.webp` |
| 28 | `Túi đựng vợt cầu lông` | `tui-ung-vot-cau-long.webp` |
| 29 | `Thảm yoga Harmony` | `tham-yoga-harmony.webp` |
| 30 | `Bộ gạch yoga Balance` | `bo-gach-yoga-balance.webp` |
| 31 | `Vòng tập Pilates Circle` | `vong-tap-pilates-circle.webp` |
| 32 | `Dây kéo giãn yoga` | `day-keo-gian-yoga.webp` |
| 33 | `Bình nước thể thao Hydro` | `binh-nuoc-the-thao-hydro.webp` |
| 34 | `Túi du lịch thể thao GoBag` | `tui-du-lich-the-thao-gobag.webp` |
| 35 | `Vớ thể thao Performance` | `vo-the-thao-performance.webp` |
| 36 | `Băng đô thấm hút Active` | `bang-o-tham-hut-active.webp` |
| 37 | `Đai chạy bộ Running Belt` | `ai-chay-bo-running-belt.webp` |
| 38 | `Ống lăn cơ Foam Roller` | `ong-lan-co-foam-roller.webp` |
| 39 | `Máy massage cầm tay Compact` | `may-massage-cam-tay-compact.webp` |
| 40 | `Bóng massage điểm cơ` | `bong-massage-iem-co.webp` |
