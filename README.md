# Chi tiêu gia đình — PWA + Supabase + Vercel

Ứng dụng quản lý thu chi cho gia đình 2 vợ chồng, dùng chung **một tài khoản đăng nhập**. Mỗi giao dịch có trường **Người thực hiện: Chồng/Vợ** để thống kê riêng.

## Điểm mới
- Giao diện mobile chiếm đúng chiều cao màn hình bằng `100dvh`, hỗ trợ vùng an toàn tai thỏ/home indicator.
- Có thể cài như app từ Chrome/Edge nhờ PWA + Service Worker.
- Bàn phím tính tiền kiểu máy tính: phím lớn, tương phản cao, khoảng cách rõ, dễ bấm bằng ngón tay.
- Khi chọn danh mục cha có danh mục con, các danh mục con xuất hiện **ngay phía trên bàn phím**, có thể cuộn ngang và chạm chọn nhanh.
- Quản lý danh mục tốt hơn: thêm, sửa tên, đổi biểu tượng, đổi nhóm cha, đổi Thu/Chi; danh mục đang được dùng hoặc còn danh mục con sẽ không cho xóa nhầm.
- Dữ liệu đồng bộ Supabase.

## 1. Supabase
Chạy `supabase.sql` trong SQL Editor của project Supabase.

## 2. Chạy local
```bash
npm install
npm run dev
```

Tạo `.env`:
```env
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_ANON_KEY
```

## 3. Deploy Vercel
Thêm 2 Environment Variables giống trên vào Vercel, sau đó Deploy.

## 4. Cài thành app trên Chrome
Sau khi Vercel deploy thành công:
1. Mở website bằng Chrome trên điện thoại Android.
2. Đăng nhập tài khoản chung của gia đình.
3. Chrome sẽ có tùy chọn **Cài đặt ứng dụng / Install app** hoặc vào menu `⋮` → **Cài đặt ứng dụng**.
4. Sau khi cài, mở từ biểu tượng trên màn hình như một app độc lập.

Trên Chrome desktop cũng có thể bấm biểu tượng **Install** ở thanh địa chỉ khi website đạt điều kiện PWA.

## Lưu ý
- Chỉ dùng `VITE_SUPABASE_ANON_KEY` ở frontend. Không đưa `service_role key` vào Vercel frontend.
- Supabase Auth đang dùng email + mật khẩu. Vì hai vợ chồng dùng chung một tài khoản, không cần tạo nhiều user.
