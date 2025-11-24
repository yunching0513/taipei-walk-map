import json

# Load data
with open('src/data/zoning_colors.json', 'r', encoding='utf-8') as f:
    zoning_colors = json.load(f)

# Blue color for public facilities
blue = '#007fff'

# Actual zone names found in the data
blue_zones = [
    '機關用地',
    '軍事機關用地',
    '醫療用地',
    '郵政用地',
    '電信用地',
    '郵政電信用地',
    '抽水站用地',
    '污水抽水站用地',
    '自來水用地',
    '自來水廠用地',
    '自來水工程用地',
    '自來水設備用地',
    '自來水加壓站用地',
    '自來水事業用地',
    '防洪調節池用地',
    '防洪蓄水池用地',
    '污水處理場用地',
    '社會福利設施用地',
    '排水溝用地'
]

print("將公共設施分區改為藍色 (#007fff):")
print("=" * 60)

updated_count = 0
for zone in blue_zones:
    if zone in zoning_colors:
        old_color = zoning_colors[zone]
        zoning_colors[zone] = blue
        print(f"✓ {zone}: {old_color} → {blue}")
        updated_count += 1

# Gray color for infrastructure
gray = '#808080'

# Infrastructure zones
gray_zones = [
    '交通用地',
    '護坡用地',
    '隧道用地',
    '變電所用地',
    '人行步道用地',
    '道路護坡用地',
    '電力設施用地',
    '垃圾處理場用地',
    '垃圾掩理場用地',
    '捷運系統用地'
]

print("\n將交通/基礎設施分區改為灰色 (#808080):")
print("=" * 60)

gray_updated = 0
for zone in gray_zones:
    if zone in zoning_colors:
        old_color = zoning_colors[zone]
        zoning_colors[zone] = gray
        print(f"✓ {zone}: {old_color} → {gray}")
        gray_updated += 1
    else:
        print(f"✗ 找不到: {zone}")

# Save
with open('src/data/zoning_colors.json', 'w', encoding='utf-8') as f:
    json.dump(zoning_colors, f, ensure_ascii=False, indent=2)

print("\n" + "=" * 60)
print(f"✓ 已更新 {updated_count} 個設施分區為藍色")
print(f"✓ 已更新 {gray_updated} 個交通/基建分區為灰色")
