# API Thông báo (Notifications)

Quản lý thông báo hệ thống (hàng sắp hết, hết hàng, đơn hàng mới, công nợ).

## GET /api/notifications

Lấy danh sách thông báo và số lượng chưa đọc (`unreadCount`).

### Query Parameters
| Field | Type | Bắt buộc | Ghi chú |
|---|---|---|---|
| type | string | không | Lọc theo loại: `STOCK`, `ORDER`, `CASHBOOK`, `AUDIT` hoặc `ALL` |
| isRead | boolean | không | `true` hoặc `false` |
| limit | number | không | Số lượng bản ghi tối đa |
| offset | number | không | Vị trí bắt đầu |

### Response
```json
{
  "success": true,
  "total": 12,
  "unreadCount": 3,
  "data": [
    {
      "id": "notif-stock-out-p1",
      "contentKey": "stock:p1:OUT",
      "type": "STOCK",
      "title": "Hàng hóa đã hết hàng",
      "description": "Bút bi Thiên Long hiện đã hết hàng trong kho (tồn: 0 Cây)",
      "timestamp": 1788701983025,
      "isRead": false,
      "meta": {
        "productId": "p1",
        "stockState": "OUT",
        "isResolved": false
      }
    }
  ]
}
```

---

## PUT /api/notifications/read-all

Đánh dấu đã đọc cho tất cả thông báo trong hệ thống.

### Response
```json
{
  "success": true,
  "message": "Đã đánh dấu đọc tất cả thông báo"
}
```

---

## PUT /api/notifications/:id/read

Đánh dấu đã đọc cho một thông báo cụ thể.

### Response
```json
{
  "success": true,
  "message": "Đã đánh dấu đã đọc"
}
```

### Lỗi
- 404: Không tìm thấy thông báo (`{ "success": false, "error": "Không tìm thấy thông báo" }`).

---

## DELETE /api/notifications/:id

Ẩn / Xóa một thông báo.

### Response
```json
{
  "success": true,
  "message": "Đã xóa thông báo"
}
```

---

## DELETE /api/notifications

Xóa toàn bộ thông báo trong hệ thống.

### Response
```json
{
  "success": true,
  "message": "Đã xóa tất cả thông báo"
}
```
