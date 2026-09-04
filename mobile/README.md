# 📱 Ứng Dụng Di Động Ngân Sơn Store (React Native / Expo)

Ứng dụng di động chuyên biệt dành cho chủ cửa hàng và nhân viên **Cửa hàng Điện Nước & Kim Khí Ngân Sơn (318 Vũ Quang)**.

---

## 🌟 Tính Năng Chính
1. **Bán Hàng POS Cảm Ứng Di Động (`PosMobileScreen`)**:
   - Thao tác chạm nhanh, lọc danh mục, tăng/giảm số lượng sản phẩm.
   - Thanh toán tiền mặt hoặc **quét mã VietQR động** ngay trên màn hình điện thoại.
2. **Quét Mã Vạch & Tra Cứu Kho (`ProductScannerScreen`)**:
   - Dùng camera điện thoại hoặc nhập barcode để tra cứu tồn kho, giá bán, giá vốn tức thì khi đang đứng kiểm hàng trong kho.
3. **Lập Phiếu Nhập Kho Di Động (`StockInMobileScreen`)**:
   - Nhập hàng trực tiếp tại kho bãi khi xe hàng về.
   - **Tự động tính lại giá vốn bình quân gia quyền (BQGQ)** và cộng dồn tồn kho.
4. **Trợ Lý AI Giọng Nói (`VoiceAssistantModal`)**:
   - Nút micro nổi 🎙️ có mặt ở mọi màn hình.
   - Hỗ trợ ra lệnh bằng tiếng Việt: tìm hàng, báo giá, thêm vào giỏ, kiểm tra công nợ khách hàng, mở sổ quỹ.
   - Kết nối trực tiếp máy chủ phân tích Gemini 3.7 Flash.
5. **Cài Đặt Kết Nối IP Máy Chủ (`SettingsMobileScreen`)**:
   - Dễ dàng thay đổi địa chỉ IP máy chủ trong mạng Wi-Fi cửa hàng (VD: `http://192.168.1.100:3000/api`).
   - Có nút **Kiểm tra kết nối** hiển thị độ trễ (latency ms) thời gian thực.

---

## 🚀 Hướng Dẫn Cài Đặt & Chạy Ứng Dụng

### 1. Chuẩn Bị Môi Trường
Đảm bảo máy tính đã cài đặt [Node.js](https://nodejs.org) và máy chủ POS backend đang chạy (`npm run dev` ở thư mục gốc).

### 2. Cài Đặt Dependencies
Mở terminal trong thư mục `mobile`:
```bash
cd mobile
npm install
```

### 3. Chạy Ứng Dụng Với Expo
```bash
npm start
```
Terminal sẽ hiển thị mã QR.

### 4. Xem Trên Điện Thoại Thật (iOS & Android)
1. Cài ứng dụng **Expo Go** từ App Store (iOS) hoặc Google Play (Android).
2. Kết nối điện thoại vào **cùng mạng Wi-Fi** với máy tính chạy server.
3. Mở camera điện thoại (iOS) hoặc quét qua app Expo Go (Android) mã QR trên màn hình.
4. Vào tab **Cài đặt** trên app và nhập địa chỉ IP máy tính (VD: `http://192.168.1.15:3000/api`) rồi bấm **Kiểm tra kết nối**.

---

## 📦 Đóng Gói File Cài Đặt (.APK / .IPA)

Sử dụng EAS Build để tạo file cài đặt độc lập:
```bash
npm install -g eas-cli
eas login
eas build -p android --profile preview
```
File APK sẽ được tạo tự động để cài đặt trực tiếp lên các thiết bị Android của thu ngân và nhân viên kho.
