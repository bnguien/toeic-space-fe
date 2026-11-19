# Dữ liệu đơn vị hành chính Việt Nam

`vietnam-administrative-units.json` chứa 34 tỉnh/thành phố và 3.321 phường/xã theo mô hình
2 cấp sau sáp nhập (2025). Mỗi tỉnh/thành phố có `code`, `name` và danh sách `wards` (mã + tên).

File được nạp lười (`import()`) trong `src/shared/utils/vietnam-address.ts` nên chỉ tải khi mở
form địa chỉ, không nằm trong bundle chính.

## Nguồn dữ liệu

Dữ liệu lấy từ API công khai [provinces.open-api.vn](https://provinces.open-api.vn/api/v2/):

```bash
curl -s https://provinces.open-api.vn/api/v2/p/ -o provinces.json
curl -s https://provinces.open-api.vn/api/v2/w/ -o wards.json
```

## Tạo lại file

```bash
node -e "
const fs = require('fs');
const provinces = JSON.parse(fs.readFileSync('provinces.json', 'utf8'));
const wards = JSON.parse(fs.readFileSync('wards.json', 'utf8'));
const byProvince = new Map(provinces.map((p) => [p.code, { code: p.code, name: p.name, wards: [] }]));
for (const ward of wards) byProvince.get(ward.province_code)?.wards.push({ code: ward.code, name: ward.name });
fs.writeFileSync('src/shared/data/vietnam-administrative-units.json', JSON.stringify([...byProvince.values()]));
"
```
