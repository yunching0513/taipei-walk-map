import json

# Load data
with open('src/data/zone_categories.json', 'r', encoding='utf-8') as f:
    zone_categories = json.load(f)

with open('src/data/zoning_colors.json', 'r', encoding='utf-8') as f:
    zoning_colors = json.load(f)

with open('src/data/zone_counts.json', 'r', encoding='utf-8') as f:
    zone_counts = json.load(f)

# Green color for parks
green = '#00ff00'

# Target zones
target_keywords = ['動物園用地', '綠地用地', '體育場用地', '公園用地', '公園', '綠地', '體育', '運動']

# Find park category
park_category = next((c for c in zone_categories['categories'] if c['category'] == '公園綠地'), None)

if not park_category:
    print("找不到「公園綠地」類別")
    exit(1)

# Find matching zones
matching_zones = []
for zone_info in zone_counts:
    zone = zone_info['zone']
    if any(keyword in zone for keyword in target_keywords):
        matching_zones.append(zone_info)

print(f"找到 {len(matching_zones)} 個公園綠地相關分區:")
print("=" * 60)

updated = []
for zone_info in matching_zones:
    zone = zone_info['zone']
    old_color = zoning_colors.get(zone, '#cccccc')
    old_category = zone_categories['zone_to_category'].get(zone, '無')
    
    # Update color
    if old_color != green:
        zoning_colors[zone] = green
        updated.append(zone)
    
    # Update category
    zone_categories['zone_to_category'][zone] = '公園綠地'
    
    # Remove from other categories
    for category in zone_categories['categories']:
        if category['category'] != '公園綠地':
            category['zones'] = [z for z in category['zones'] if z['zone'] != zone]
    
    # Add to park category if not there
    if not any(z['zone'] == zone for z in park_category['zones']):
        park_category['zones'].append(zone_info)
    
    status = "✓" if old_color == green and old_category == '公園綠地' else "更新"
    print(f"{status} {zone} ({zone_info['count']}) - {old_category} → 公園綠地")

# Recalculate totals
for category in zone_categories['categories']:
    category['total_count'] = sum(z['count'] for z in category['zones'])

park_category['color'] = green

# Save
with open('src/data/zoning_colors.json', 'w', encoding='utf-8') as f:
    json.dump(zoning_colors, f, ensure_ascii=False, indent=2)

with open('src/data/zone_categories.json', 'w', encoding='utf-8') as f:
    json.dump(zone_categories, f, ensure_ascii=False, indent=2)

print("\n" + "=" * 60)
print(f"✓ 已將 {len(matching_zones)} 個分區統一為綠色 (#00ff00)")
print(f"✓ 全部歸入「公園綠地」類別")
print(f"✓ 公園綠地類別現有 {len(park_category['zones'])} 個分區，總數: {park_category['total_count']}")
