import json

# Load data
with open('src/data/zone_counts.json', 'r', encoding='utf-8') as f:
    zone_counts = json.load(f)

with open('src/data/zoning_colors.json', 'r', encoding='utf-8') as f:
    zoning_colors = json.load(f)

with open('src/data/zone_categories.json', 'r', encoding='utf-8') as f:
    zone_categories = json.load(f)

# Find all zones containing '住宅'
residential_zones = [z for z in zone_counts if '住宅' in z['zone']]

print("包含'住宅'字樣的所有分區:")
print("=" * 70)

yellow = '#ffff00'
not_yellow = []
not_in_category = []

for zone_info in residential_zones:
    zone = zone_info['zone']
    count = zone_info['count']
    color = zoning_colors.get(zone, '無')
    category = zone_categories['zone_to_category'].get(zone, '無')
    
    status = []
    if color != yellow:
        status.append(f"顏色: {color}")
        not_yellow.append(zone)
    else:
        status.append("✓ 黃色")
    
    if category != '住宅':
        status.append(f"類別: {category}")
        not_in_category.append(zone)
    else:
        status.append("✓ 住宅類")
    
    status_str = " | ".join(status)
    print(f"{zone} ({count}) - {status_str}")

print("\n" + "=" * 70)
print(f"總計: {len(residential_zones)} 個包含'住宅'的分區")
print(f"未設為黃色: {len(not_yellow)} 個")
print(f"未在住宅類別: {len(not_in_category)} 個")

if not_yellow:
    print("\n需要改為黃色的分區:")
    for zone in not_yellow:
        print(f"  - {zone}")

if not_in_category:
    print("\n需要移至住宅類別的分區:")
    for zone in not_in_category:
        print(f"  - {zone}")
