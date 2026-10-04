# Võ Lâm Idle — bản offline

Bản sao đầy đủ của https://volam.vinarpg.com (bản 2026-10-04) để chơi hoàn toàn không cần mạng.

## Chạy

```bash
python3 server.py          # mở http://localhost:8080/
python3 server.py 9000     # đổi cổng
```

Trên Windows: cài Python 3 từ python.org (nhớ tick "Add python.exe to PATH"), rồi double-click `run-windows.bat`.

Chỉ cần Python 3 có sẵn trên macOS, không cần cài thêm gì. Không mở trực tiếp `site/index.html` bằng `file://`, vì khi đó âm thanh (`fetch`) và service worker sẽ không hoạt động.

Khi chạy trên `localhost`, thẻ **Khác** có thêm 2 mục mà bản online không có:
- **Thử nghiệm**: bảng admin, mỗi ngày dùng 1 lần (lên cấp trần, +10 triệu lượng, nguyên liệu, ...).
- **Biên tập map** (`edit_map.html`): sửa vùng chặn của bản đồ. Nút Lưu ghi vào `site/jmo.js`, bản cũ được sao lưu trong `backups/`.

Save game nằm trong localStorage của trình duyệt và gắn với origin (`http://localhost:8080`). Đổi cổng hoặc đổi trình duyệt thì sẽ không thấy save cũ. Để chuyển save, dùng **Khác → Tải file lưu (.jxsave)** hoặc **Xuất mã / Nhập mã**. Save từ bản online cũng chuyển sang được theo cách này.

## Cấu trúc

| Đường dẫn | Nội dung |
|---|---|
| `site/` | Toàn bộ game: khoảng 9.000 file, 250 MB (sprite trang phục `img/jx` 125 MB, quái/nhân vật `img/a` 39 MB, nhạc 12 MB) |
| `server.py` | Server tĩnh, kèm endpoint `POST /__admin/maps/save` cho map editor |
| `tools/mirror.py` | Tải lại hoặc cập nhật từ site gốc: `python3 tools/mirror.py --refresh-code` |
| `tools/smoke.mjs` | Test tự động bằng Chrome headless: `node tools/smoke.mjs http://localhost:8080/ 60 /tmp` |
| `tools/missing.txt` | Các file mà game tham chiếu nhưng site gốc cũng không có (404) |

### Đã chỉnh so với bản gốc
- Bỏ script beacon của Cloudflare (`/cdn-cgi/challenge-platform`) trong `index.html`.
- Bổ sung font IBM Plex Mono (`site/fonts/*.woff2`, giấy phép SIL OFL) lấy từ Google Fonts. Site gốc thiếu các file này nên trên web đang hiển thị bằng font dự phòng.

### Lỗi có sẵn từ bản gốc (không sửa)
- `ui/s0.png` … `ui/s4.png` (icon ngũ hành trong một số nút) bị 404 ngay trên site gốc.
- Nút "Cập nhật" hiện ở lần mở đầu tiên do logic service worker. Bấm vào chỉ reload trang.

### Cập nhật khi game online ra bản mới
`python3 tools/mirror.py --refresh-code` sẽ tải lại HTML/JS/CSS rồi tải thêm các asset mới. Asset đã có sẽ được bỏ qua. Script dùng `curl` nên chạy được sau proxy công ty. Chú ý: lệnh này ghi đè `site/jmo.js`, nên nếu bạn đã sửa map thì hãy sao lưu trước.
