import json

# Load data
with open('src/data/zoning_colors.json', 'r', encoding='utf-8') as f:
    zoning_colors = json.load(f)

# Gray color
gray = '#808080'

# Actual zone names in the data
additional_gray_zones = [
    '變電所用地',
    '電力設施用地',
    '垃圾處理場用地',
    '垃圾掩理場用地',
    '捷運系統用地',
    '道路護坡用地',
    '隧道用地'
]

print("繼續將分區改為灰色:")
print("=" * 60)

updated = 0
for zone in additional_gray_zones:
    if zone in zoning_colors:
        old_color = zoning_colors[zone]
        zoning_colors[zone] = gray
        print(f"✓ {zone}: {old_color} → {gray}")
        updated += 1
    else:
        # Try to find partial matches
        from difflib import get_close_matches
        matches = get_close_matches(zone, zoning_colors.keys(), n=1, cutoff=0.6)
        if matches:
            matched_zone = matches[0]
            old_color = zoning_colors[matched_zone]
            zoning_colors[matched_zone] = gray
            print(f"✓ {matched_zone} (相似於{zone}): {old_color} → {gray}")
            updated += 1
        else:
            print(f"✗ 找不到: {zone}")

# Save
with open('src/data/zoning_colors.json', 'w', encoding='utf-8') as f:
    json.dump(zoning_colors, f, ensure_ascii=False, indent=2)

print(f"\n✓ 已更新 {updated} 個分區為灰色")
