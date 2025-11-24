import json

# Load data
with open('src/data/zone_categories.json', 'r', encoding='utf-8') as f:
    zone_categories = json.load(f)

with open('src/data/zoning_colors.json', 'r', encoding='utf-8') as f:
    zoning_colors = json.load(f)

# Blue color
blue = '#007fff'

# Target zones from the image
target_zones = [
    '機關用地',
    '軍事機關用地',
    '醫療用地',
    '郵政用地',
    '電信用地',
    '抽水站用地',
    '自來水用地',
    '自來水工程用地',
    '防洪調節池用地',
    '污水抽水站用地',
    '自來水事業用地',
    '社會福利設施用地',
    '排水溝用地'
]

print("將以下分區改為藍色 (#007fff):")
print("=" * 60)

updated_count = 0
for zone in target_zones:
    if zone in zoning_colors:
        old_color = zoning_colors[zone]
        zoning_colors[zone] = blue
        category = zone_categories['zone_to_category'].get(zone, '無')
        print(f"✓ {zone}: {old_color} → {blue} (類別: {category})")
        updated_count += 1
    else:
        print(f"✗ 找不到: {zone}")

# Save updated data
with open('src/data/zoning_colors.json', 'w', encoding='utf-8') as f:
    json.dump(zoning_colors, f, ensure_ascii=False, indent=2)

print("\n" + "=" * 60)
print(f"✓ 已更新 {updated_count} 個分區為藍色")
