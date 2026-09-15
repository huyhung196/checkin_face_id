# UI Style Guide – Face ID Attendance App

Bản tài liệu này mô tả phong cách giao diện hiện tại của app để bạn có thể sao chép cho các app khác một cách nhanh chóng.

## 1. Tông màu chính

App dùng tone năng động, hiện đại và công nghiệp, mang cảm giác tech + khen thưởng + an toàn.

### Palette

- Primary orange: `#FD6900`
- Orange light: `#FF8533`
- Coral: `#FF647E`
- Blue: `#006AFF`
- Blue light: `#388AFF`
- Emerald: `#10B981`
- Rose: `#F43F5E`
- Text main: `#0F172A`
- Text muted: `#64748B`
- Background page: `#F8FAFC`
- Card background: `#FFFFFF`
- Border: `#E2E8F0`

### Màu sắc sử dụng theo vai trò

- Accent / CTA / hành động chính: orange gradient
- Xác nhận / thành công: emerald
- Cảnh báo / lỗi: rose / red
- Tài nguyên / thông tin / dữ liệu: blue
- Nền tổng thể: light slate / off-white

### Gradient chủ đạo

```css
background: linear-gradient(135deg, #FD6900, #FF647E, #006AFF);
```

Dùng cho:
- logo / title brand
- tab active
- button priority high
- badges nổi bật

---

## 2. Typography

Font-family chính:

```css
'Be Vietnam Pro', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
```

### Cách dùng

- Heading chính: bold, large, letter spacing âm nhẹ
- Subtitle: medium, muted, nhỏ hơn
- Label: uppercase, small, spacing vừa phải
- Numeric data: dùng mono font cho số, thời gian, metric

### Đặc điểm

- Mạnh, rõ, hiện đại
- Tối ưu cho dashboard & admin panel
- Không quá “designer”, nhưng vẫn clean và premium

---

## 3. Layout & spacing

### Layout rules

- Container giới hạn trung tâm: `max-width: 1380px`
- Padding ngang 16px, trên dưới 14–18px
- Gap giữa các section: 12–16px
- Card radius: 12–16px
- Shadow mềm, rất nhẹ nhưng rõ ranh giới

### Tỷ lệ khung nhìn

- Desktop: 2 cột chính
- Mobile: stack theo chiều dọc
- PWA / mobile app: bottom nav cố định
- Nền page có light gradient để tạo cảm giác không quá ngắt

---

## 4. Card system

### Card chuẩn

```css
.glass-card {
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 16px;
  box-shadow: 0 4px 16px rgba(0,0,0,0.06);
}
```

### Khi nào dùng

- Header
- Section content
- Camera area
- Stats blocks
- Employee list
- Log table cards

### Tính chất

- Không quá bóng
- Không quá tối
- Tạo cảm giác phần tử “nằm trên nền” nhưng vẫn sáng và sạch

---

## 5. Buttons

### Button pattern

- Primary: gradient orange → coral
- Secondary: white + border + gray text
- Danger: soft red / rose
- Success: green fill
- Size: compact cho mobile, padded cho desktop

### Button style

```css
.tab-btn.active {
  background: linear-gradient(135deg, #FD6900, #FF647E);
  color: #fff;
  box-shadow: 0 3px 10px rgba(253,105,0,0.3);
}
```

### Rule

- Nút chính luôn nổi bật hơn nút phụ
- Không dùng quá nhiều màu cùng lúc trong 1 vùng
- CTA nên ưu tiên orange, còn background support là white/neutral

---

## 6. Tabs & navigation

### Desktop tabs

- Nền trắng, border nhẹ
- Tab active có gradient orange
- Tab inactive có text gray và hover orange nhẹ

### Mobile nav

- Fixed bottom bar
- Icon + label
- Active tab đổi màu sang orange
- Làm cho app giống mobile app native hơn

### Character

- Giao diện vừa professional vừa friendly
- Mục tiêu: thao tác nhanh trên điện thoại và máy tính

---

## 7. Status chips & badges

Các chip thường thấy:

- Public IP / local IP
- online status
- pass / fail
- late / early / absent
- success / warning / info

### Pattern

```css
.meta-chip {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 20px;
  padding: 4px 10px;
  font-size: 0.75rem;
  font-weight: 600;
}
```

### Mẹo

- Dùng nền rất nhạt, không quá saturate
- Mỗi trạng thái nên có màu tương ứng rõ ràng
- Không dùng badge quá lớn gây rối layout

---

## 8. Statistics cards

App sử dụng block stats dạng mini dashboard rất rõ ràng.

### Pattern

- Icon circle trong màu nhạt
- Value lớn, bold
- Label nhỏ, uppercase
- Subtext nhẹ hơn

### Ví dụ màu icon block

- Orange: tổng số, active
- Green: check-in thành công
- Rose: violations / missing
- Blue: employee / data
- Amber: warnings
- Purple: other advanced data

---

## 9. Camera / photo interface

Đây là phần đặc trưng của app.

### Tính chất

- Nền tối / neutral để focus vào khuôn mặt
- Các element điều hướng luôn trong upper layer
- Cảm giác “professional scanner”
- Dữ liệu/overlay không làm rối visual

### Best practice

- Đặt CTA rõ ràng trên vùng camera
- Dùng kính lúp, border, shadow nhẹ để tăng khả năng nhận diện
- Không làm quá nhiều chỉ thị trên camera
- Chỉ hiển thị các thông tin cần thiết trong lúc điểm danh

---

## 10. Visual rule – “AI tech + clean business”

Điểm đặc trưng của app này là sự kết hợp giữa:

- tech-forward: orange / blue / gradient
- business product: white cards, light border, clean spacing
- mobile usability: compact, bottom nav, touch-friendly controls

Nói ngắn gọn:

> Giao diện này là “modern SaaS dashboard + mobile-first productivity tool”, không quá tối, không quá sặc sỡ, nhưng đủ nổi bật để cho thấy tính chuyên nghiệp và AI.

---

## 11. Token CSS dùng lại cho app mới

Bạn có thể copy hẳn các biến sau:

```css
:root {
  --bg-page: #f8fafc;
  --bg-card: #ffffff;
  --border-card: #e2e8f0;
  --border-subtle: #cbd5e1;
  --brand-orange: #FD6900;
  --brand-orange-light: #ff8533;
  --brand-coral: #FF647E;
  --brand-blue: #006AFF;
  --brand-blue-light: #388aff;
  --brand-emerald: #10b981;
  --brand-rose: #f43f5e;
  --text-main: #0f172a;
  --text-muted: #64748b;
  --text-dim: #94a3b8;
  --shadow-sm: 0 2px 6px rgba(0, 0, 0, 0.04);
  --shadow-md: 0 4px 16px rgba(0, 0, 0, 0.06);
  --font-family: 'Be Vietnam Pro', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}
```

---

## 12. Một số nguyên tắc khi reuse style

### Nên làm

- Giữ background sáng và không quá tối
- Dùng 1 accent chính, 1-2 accent phụ
- Hộp thông tin nên rõ, không quá nhiều màu
- Dùng white card + border để tạo hierarchy
- Ensure mobile friendly

### Không nên làm

- Dùng quá nhiều gradient màu trên mỗi card
- Dùng text quá nhạt trên nền sáng
- Chọn shadow quá đậm làm mất sự sạch
- Để các button cùng màu với background
- Tạo quá nhiều badge màu khác nhau trong cùng 1 view

---

## 13. Quick starter snippet

```css
body {
  font-family: 'Be Vietnam Pro', sans-serif;
  background: #f8fafc;
  color: #0f172a;
}

.card {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 16px;
  box-shadow: 0 4px 16px rgba(0,0,0,0.06);
}

.primary-btn {
  background: linear-gradient(135deg, #FD6900, #FF647E);
  color: #fff;
  border: none;
  border-radius: 10px;
  font-weight: 700;
  box-shadow: 0 3px 10px rgba(253,105,0,0.3);
}
```

---

## 14. Kết luận

Style giao diện của app này phù hợp cho:

- attendance app
- employee management dashboard
- HR / field operation systems
- internal tools có nhiều thao tác nhanh
- app chạy trên web + mobile PWA

Bản chất của style là: sáng, rõ, chuyên nghiệp, tương tác mạnh, và có điểm nhấn màu cam mạnh mẽ để tạo hiệu ứng hành động.
