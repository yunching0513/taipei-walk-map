import json

# Load data files
with open('src/data/zone_categories.json', 'r', encoding='utf-8') as f:
    zone_categories = json.load(f)

with open('src/data/zoning_colors.json', 'r', encoding='utf-8') as f:
    zoning_colors = json.load(f)

# Define target color for residential zones
yellow = '#ffff00'

# Find residential category
res_category = next((c for c in zone_categories['categories'] if c['category'] == '住宅'), None)
if not res_category:
    print('找不到住宅類別')
    exit(1)

updated = []
for zone_info in res_category['zones']:
    zone = zone_info['zone']
    current_color = zoning_colors.get(zone)
    if current_color != yellow:
        zoning_colors[zone] = yellow
        updated.append((zone, current_color or '無'))

# Update category representative color if needed
res_category['color'] = yellow

# Save changes
with open('src/data/zoning_colors.json', 'w', encoding='utf-8') as f:
    json.dump(zoning_colors, f, ensure_ascii=False, indent=2)

with open('src/data/zone_categories.json', 'w', encoding='utf-8') as f:
    json.dump(zone_categories, f, ensure_ascii=False, indent=2)

print(f'✓ 已將 {len(updated)} 個住宅分區顏色改為黃色 ({yellow})')
for zone, old in updated:
    print(f'  - {zone}: {old} → {yellow}')
