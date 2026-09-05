# 🏪 Cửa Hàng Ngân Sơn - 318 Vũ Quang
### Hệ Thống Quản Lý Bán Hàng (POS), Kho Hàng, Sổ Quỹ & Phân Quyền Đa Nền Tảng

[![React 19](https://img.shields.io/badge/React-19-blue.svg)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue.svg)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-6.2-646CFF.svg)](https://vitejs.dev/)
[![TailwindCSS v4](https://img.shields.io/badge/TailwindCSS-v4-38B2AC.svg)](https://tailwindcss.com/)
[![Express](https://img.shields.io/badge/Express-4.21-lightgrey.svg)](https://expressjs.com/)
[![Supabase](https://img.shields.io/badge/Database-Supabase%20%2F%20Local%20JSON-3ECF8E.svg)](https://supabase.com/)
[![Gemini AI](https://img.shields.io/badge/AI-Google%20Gemini-orange.svg)](https://ai.google.dev/)

Hệ thống phần mềm quản trị bán hàng và vận hành toàn diện (ERP Mini / POS) được thiết kế may đo riêng cho **Cửa hàng Ngân Sơn** (318 Vũ Quang, TP. Hà Tĩnh), phục vụ cả mô hình kinh doanh bán lẻ, bán buôn (giá thợ, giá sỉ), kiểm soát xuất nhập tồn kho, sổ quỹ tiền mặt - ngân hàng, đối soát công nợ và quản lý nhân sự chuyên sâu.

---

## 📑 Mục lục

1. [Tính năng Nổi bật](#-tính-năng-nổi-bật)
2. [Tài khoản Mặc định & Phân quyền](#-tài-khoản-mặc-định--phân-quyền)
3. [Công nghệ Sử dụng (Tech Stack)](#-công-nghệ-sử-dụng-tech-stack)
4. [Cấu trúc Thư mục Dự án](#-cấu-trúc-thư-mục-dự-án)
5. [Hướng dẫn Cài đặt & Vận hành](#-hướng-dẫn-cài-đặt--vận-hành)
6. [Cấu hình Biến Môi trường (.env)](#-cấu-hình-biến-môi-trường-env)
7. [Triển khai Production](#-triển-khai-production)
8. [Thông tin Bản quyền & Hỗ trợ](#-thông-tin-bản-quyền--hỗ-trợ)

---

## ✨ Tính năng Nổi bật

### 1. 🛒 Bán Hàng Tại Quầy (Desktop POS & Mobile POS)
- **Giao diện 2 trong 1**: Tối ưu giao diện thu ngân đa năng trên màn hình lớn Desktop và giao diện cảm ứng nhanh nhạy trên điện thoại di động (PWA/Responsive). Có nút chuyển đổi chế độ xem tức thì.
- **Tìm kiếm & Phân loại thông minh**:
  - Tra cứu siêu tốc theo tên sản phẩm, mã SKU, mã vạch (Barcode).
  - Tích hợp quét mã vạch bằng camera thiết bị (`html5-qrcode`).
  - **Tự động đẩy sản phẩm hết hàng xuống cuối**: Giúp nhân viên thu ngân luôn ưu tiên hàng sẵn có, hỗ trợ bật/tắt chế độ *"Hết hàng ở cuối"* hoặc *"Ẩn hết hàng"*.
- **Cơ chế giá đa cấp bậc & Chiết khấu**:
  - Hỗ trợ 3 bảng giá: **Giá lẻ (Niêm yết)**, **Giá thợ (-5%)**, **Giá sỉ (-10%)**.
  - Chiết khấu linh hoạt theo số tiền trực tiếp hoặc phần trăm từng đơn.
- **Thanh toán đa phương thức**:
  - Tiền mặt (tự động tính tiền thừa, chống bấm đúp thanh toán).
  - Chuyển khoản ngân hàng (tự động tạo mã **VietQR** động kèm nội dung thanh toán).
  - Ghi nợ khách hàng (tự động cộng dồn vào công nợ).
- **In ấn & Hóa đơn**:
  - In hóa đơn nhiệt K80 chuẩn thu ngân hoặc tải về dạng PDF (`jspdf`, `html2canvas`).
  - Quản lý giỏ hàng đa tab (chuyển đổi đơn nhiều khách cùng lúc).
- **Trợ lý Bán hàng Giọng nói AI (Gemini Voice POS)**: Lên đơn hàng bằng giọng nói tiếng Việt tự nhiên, tự động nhận diện mặt hàng, số lượng và tạo đơn tức thì.

### 2. 📦 Quản lý Kho Hàng & Nhập Xuất Tồn
- Quản lý danh mục hàng hóa, nhóm hàng, đơn vị tính, barcode, hình ảnh, giá vốn và các mức giá bán.
- Cảnh báo sản phẩm sắp hết hàng theo ngưỡng tồn kho an toàn.
- **Nhập kho (Stock In)**: Tạo phiếu nhập từ nhà cung cấp, cập nhật giá vốn bình quân gia quyền và tự động ghi nhận công nợ nhà cung cấp.
- **Xuất nhập dữ liệu Excel**: Nhập danh mục hàng nghìn sản phẩm hoặc xuất báo cáo tồn kho định dạng `.xlsx`.

### 3. 🔍 Kiểm Kê & Cân Đối Kho (Inventory Audit)
- Hỗ trợ tạo đợt kiểm kê kho định kỳ hoặc đột xuất theo từng ngành hàng.
- So sánh số lượng tồn kho trên phần mềm và số lượng thực tế kiểm đếm.
- Tự động tạo phiếu điều chỉnh và cân đối chênh lệch tồn kho kèm ghi chú lý do.

### 4. 💰 Sổ Quỹ & Quản lý Tài chính (Cashbook)
- Quản lý thu chi hai nguồn tiền độc lập: **Quỹ Tiền Mặt** và **Tài Khoản Ngân Hàng**.
- Tự động ghi nhận phiếu thu từ các đơn bán hàng POS và các khoản thanh toán nợ của khách.
- **Bàn giao ca thu ngân (Shift Handover)**: Đối soát tiền mặt thực tế đầu ca - cuối ca, doanh thu trong ca, phiếu chi phát sinh và ghi nhận chênh lệch quỹ chuẩn xác.

### 5. 👥 Quản lý Khách Hàng, Nhà Cung Cấp & Công Nợ
- Quản lý hồ sơ khách hàng, phân loại khách lẻ, thợ, đại lý.
- Theo dõi chi tiết lịch sử mua hàng, hạn mức công nợ và thu nợ từng phần.
- Quản lý danh bạ nhà cung cấp, lịch sử nhập hàng và lịch thanh toán tiền hàng.

### 6. 📊 Báo Cáo & Phân Tích Doanh Thu
- Biểu đồ doanh thu trực quan theo ngày, tuần, tháng, quý bằng **Recharts**.
- Báo cáo lợi nhuận gộp (Doanh thu - Giá vốn).
- Thống kê top mặt hàng bán chạy, doanh số theo nhân viên thu ngân, so sánh tăng trưởng kỳ trước.

### 7. 🔐 Hệ Thống Xác Thực (Auth) & Quản Lý Nhân Sự Toàn Diện
- Đăng nhập bảo mật bằng **Username** hoặc **Email** kết hợp Mật khẩu.
- Hỗ trợ thanh chọn nhanh tài khoản với ảnh đại diện trực quan.
- **Quản trị 15 quyền hạn chuyên sâu**:
  - Quyền bán hàng POS, nhập hàng, xem hóa đơn, xóa hóa đơn.
  - Quyền xem báo cáo, quản lý sổ quỹ, kiểm kê kho, cân đối kho.
  - Quyền quản lý sản phẩm, khách hàng, nhà cung cấp, trung tâm dữ liệu.
  - Quyền quản trị nhân sự và cấu hình hệ thống.
- Chức năng **Đổi mật khẩu cá nhân** và **Xem/Sửa thông tin hồ sơ**.
- Quyền Admin: Thêm/sửa nhân viên, khóa/mở khóa tài khoản, đặt lại mật khẩu nhân viên.
- Cơ chế bảo vệ tài khoản khi chuyển đổi người dùng (User Switcher) yêu cầu nhập mật khẩu xác nhận.

---

## 👥 Tài khoản Mặc định & Phân quyền

Hệ thống được khởi tạo sẵn với 4 tài khoản nghiệp vụ:

| Tên người dùng | Username / Email | Mật khẩu | Vai trò | Quyền hạn mặc định |
| :--- | :--- | :--- | :--- | :--- |
| **Phan Anh Tài** | `tai`<br>`taiphananh28@gmail.com` | `admin123` | **ADMIN** (Quản trị viên) | **Toàn quyền 15/15 phân hệ**: Quản trị nhân sự, cài đặt hệ thống, xóa hóa đơn, cấu hình, sổ quỹ, bán hàng... |
| **Phan Minh Sơn** | `son`<br>`sn.phanminh@gmail.com` | `minhson318vuquang` | **MANAGER** (Quản lý) | Quản lý vận hành, bán hàng POS, báo cáo doanh thu, kiểm kê kho, sổ quỹ, nhà cung cấp. |
| **Nguyễn Thị Ngân** | `ngan`<br>`ngansonlv@gmail.com` | `ngan318vuquang` | **MANAGER** (Quản lý) | Quản lý báo cáo doanh thu, thu chi, kho hàng, khách hàng & nhà cung cấp. |
| **Phan Minh Nhật** | `nhat`<br>`nhatphanminh2711@gmail.com` | `minhnhat318vuquang` | **STAFF** (Thu ngân) | Chuyên trách bán lẻ POS, tra cứu hóa đơn cá nhân, in biên lai K80. Khóa các mục quản trị nhạy cảm. |

---

## 🛠️ Công nghệ Sử dụng (Tech Stack)

| Lĩnh vực | Công nghệ | Mục đích sử dụng |
| :--- | :--- | :--- |
| **Frontend** | React 19, TypeScript, Vite 6 | Giao diện Single Page Application hiện đại, hiệu năng cao |
| **Styling** | TailwindCSS v4, Lucide React, Framer Motion | Thiết kế UI Glassmorphism, icon đồng bộ, hiệu ứng mượt mà |
| **Charts & Data** | Recharts, XLSX | Vẽ biểu đồ doanh thu tài chính, xuất/nhập tệp Excel |
| **Barcode & Printing**| `html5-qrcode`, `jspdf`, `html2canvas` | Quét mã vạch camera, tạo và in hóa đơn nhiệt K80 |
| **AI Integration** | Google Gemini API (`@google/genai`) | Trợ lý giọng nói Voice POS tiếng Việt, phân tích dữ liệu |
| **Backend & API** | Node.js, Express, tsx, esbuild | RESTful API server phục vụ đồng bộ dữ liệu và xác thực |
| **Database** | Supabase (PostgreSQL) + Local JSON/SQLite | Cơ sở dữ liệu đám mây kèm chế độ Offline-First đáng tin cậy |
| **Mobile App** | React Native (Expo) | Thư mục `mobile/` dành cho ứng dụng di động độc lập |

---

## 📁 Cấu trúc Thư mục Dự án

```text
├── .data/                      # Cơ sở dữ liệu cục bộ (db.json) dự phòng offline
├── mobile/                     # Ứng dụng di động Expo / React Native
│   ├── src/                    # Mã nguồn màn hình và thành phần Mobile
│   └── App.tsx                 # Điểm khởi chạy ứng dụng Mobile
├── public/                     # Tài nguyên tĩnh, âm thanh thông báo, icons
├── scripts/                    # Scripts tiện ích: seed Supabase, clone CSDL
│   ├── seed_supabase.ts
│   └── sync_prod_to_staging.ts
├── server/                     # Backend Express server
│   ├── db.ts                   # Tầng giao tiếp CSDL (Supabase & Local JSON)
│   └── routes.ts               # Các định tuyến API (Auth, POS, Inventory, Cashbook...)
├── src/                        # Mã nguồn ứng dụng Frontend
│   ├── components/             # Thành phần giao diện
│   │   ├── auth/               # Đăng nhập, Đổi mật khẩu, Hồ sơ người dùng
│   │   ├── cashbook/           # Quản lý Sổ quỹ thu chi, bàn giao ca
│   │   ├── common/             # Thành phần dùng chung, quét mã, giọng nói AI
│   │   ├── customers/          # Quản lý khách hàng & công nợ
│   │   ├── inventory/          # Quản lý tồn kho, nhập hàng, kiểm kê
│   │   ├── invoices/           # Lịch sử hóa đơn, in K80, chi tiết đơn
│   │   ├── layout/             # Sidebar, Header, Mobile Viewport Switcher
│   │   ├── mobile/             # Bộ giao diện cảm ứng tối ưu cho điện thoại
│   │   ├── pos/                # Màn hình bán hàng Desktop POS chuyên nghiệp
│   │   ├── reports/            # Báo cáo doanh thu, lợi nhuận, biểu đồ
│   │   ├── suppliers/          # Quản lý nhà cung cấp & nhập hàng
│   │   └── users/              # Màn hình quản trị nhân sự & 15 quyền hạn
│   ├── context/
│   │   └── AppContext.tsx      # Quản lý trạng thái toàn cục (State Management)
│   ├── services/               # Dịch vụ kết nối API, Gemini AI, Supabase client
│   ├── types/                  # Định nghĩa kiểu dữ liệu TypeScript toàn hệ thống
│   ├── App.tsx                 # Root component với Auth Guard & View Router
│   └── main.tsx                # Điểm gắn kết DOM
├── .env.example                # Tệp mẫu cấu hình biến môi trường
├── package.json                # Cấu hình gói thư viện & Scripts
├── server.ts                   # Điểm khởi chạy API Server môi trường dev
└── vite.config.ts              # Cấu hình build Vite
```

---

## 🚀 Hướng dẫn Cài đặt & Vận hành

### 1. Yêu cầu Hệ thống
- **Node.js**: Phiên bản `>= 18.0.0` (Khuyến nghị Node 20 LTS hoặc mới hơn).
- **Trình quản lý gói**: `npm` hoặc `pnpm` / `bun`.

### 2. Cài đặt Dependencies
```bash
# Cài đặt thư viện cho dự án chính
npm install

# (Tùy chọn) Cài đặt thư viện cho ứng dụng mobile
npm run mobile:install
```

### 3. Cấu hình Môi trường
Sao chép tệp cấu hình mẫu và điền thông tin tương ứng:
```bash
cp .env.example .env
```
*(Chi tiết cấu hình xem tại mục [Cấu hình Biến Môi trường](#-cấu-hình-biến-môi-trường-env))*

### 4. Khởi chạy Môi trường Phát triển (Development)
```bash
npm run dev
```
Hệ thống sẽ khởi động máy chủ API tích hợp Vite tại:
👉 **`http://localhost:3001`** (hoặc cổng cấu hình trong `.env`).

---

## 🔑 Cấu hình Biến Môi trường (.env)

Tệp cấu hình `.env` gồm các tham số chính:

```env
# 1. Cấu hình Cổng & Môi trường
PORT=3001
NODE_ENV=development

# 2. Khóa API Trí tuệ nhân tạo (Google Gemini)
GEMINI_API_KEY=your_gemini_api_key_here

# 3. Kết nối Supabase Cloud Database (Tùy chọn cho đồng bộ đám mây)
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

> **Lưu ý**: Nếu chưa cấu hình Supabase, hệ thống sẽ tự động sử dụng cơ sở dữ liệu nội bộ `.data/db.json` với đầy đủ tính năng mà không bị gián đoạn.

---

## 📦 Triển khai Production

### 1. Kiểm tra Typecheck & Đóng gói Build
```bash
# Kiểm tra tính toàn vẹn kiểu dữ liệu
npm run lint

# Đóng gói ứng dụng web và server bundle
npm run build
```
Lệnh này sẽ biên dịch:
- Giao diện người dùng: Lưu vào thư mục `dist/`.
- Server API độc lập: Tạo tệp `dist/server.cjs`.

### 2. Khởi chạy Production Server
```bash
npm run start
# Hoặc chạy trực tiếp:
PORT=3001 NODE_ENV=production node dist/server.cjs
```

### 3. Triển khai lên Vercel
Dự án đã tích hợp sẵn tệp cấu hình [`vercel.json`](vercel.json):
1. Kết nối kho lưu trữ GitHub với tài khoản Vercel.
2. Thêm các biến môi trường trong mục **Settings ➔ Environment Variables**.
3. Vercel sẽ tự động build và triển khai ứng dụng.

---

## 🏛️ Thông tin Cửa hàng & Hỗ trợ

- **Tên cửa hàng**: Cửa hàng Ngân Sơn
- **Địa chỉ**: 318 Vũ Quang, TP. Hà Tĩnh, Tỉnh Hà Tĩnh
- **Chuyên doanh**: Kim khí, điện nước, thiết bị gia dụng và vật liệu xây dựng hoàn thiện
- **Phiên bản hệ thống**: v2.5.0 Production Ready