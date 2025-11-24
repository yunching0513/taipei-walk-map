import json

# Load data
with open('src/data/zone_categories.json', 'r', encoding='utf-8') as f:
    zone_categories = json.load(f)

with open('src/data/zoning_colors.json', 'r', encoding='utf-8') as f:
    zoning_colors = json.load(f)

with open('src/data/zone_counts.json', 'r', encoding='utf-8') as f:
    zone_counts = json.load(f)

# Red color (same as commercial)
red = '#ff003f'

# Target zones from the image
target_keywords = [
    '聯合開發區',
    '特定專用區',
    '金融服務專用區',
    '國際事務及公共服務特定專用區'
]

# Find commercial category
commercial_category = next((c for c in zone_categories['categories'] if c['category'] == '商業'), None)

if not commercial_category:
    print("找不到「商業」類別")
    exit(1)

print("搜尋以下關鍵字的分區:")
print("=" * 60)
for keyword in target_keywords:
    print(f"  - {keyword}")

# Find matching zones
matching_zones = []
for zone_info in zone_counts:
    zone = zone_info['zone']
    if any(keyword in zone for keyword in target_keywords):
        matching_zones.append(zone_info)

print(f"\n找到 {len(matching_zones)} 個匹配的分區:")
print("=" * 60)
for zone_info in matching_zones:
    print(f"  - {zone_info['zone']} ({zone_info['count']})")

# Update each zone
print("\n處理分區:")
print("=" * 60)
for zone_info in matching_zones:
    zone = zone_info['zone']
    
    # Update color
    old_color = zoning_colors.get(zone, '#cccccc')
    zoning_colors[zone] = red
    print(f"{zone}:")
    print(f"  顏色: {old_color} → {red}")
    
    # Update category mapping
    old_category = zone_categories['zone_to_category'].get(zone, '無')
    zone_categories['zone_to_category'][zone] = '商業'
    print(f"  類別: {old_category} → 商業")
    
    # Remove from old category
    for category in zone_categories['categories']:
        category['zones'] = [z for z in category['zones'] if z['zone'] != zone]
    
    # Add to commercial category if not already there
    if not any(z['zone'] == zone for z in commercial_category['zones']):
        commercial_category['zones'].append(zone_info)

# Recalculate totals
for category in zone_categories['categories']:
    category['total_count'] = sum(z['count'] for z in category['zones'])

# Save updated data
with open('src/data/zoning_colors.json', 'w', encoding='utf-8') as f:
    json.dump(zoning_colors, f, ensure_ascii=False, indent=2)

with open('src/data/zone_categories.json', 'w', encoding='utf-8') as f:
    json.dump(zone_categories, f, ensure_ascii=False, indent=2)

print("\n" + "=" * 60)
print(f"✓ 已將 {len(matching_zones)} 個分區改為紅色")
print(f"✓ 已移至「商業」類別")
print(f"✓ 商業類別現有 {len(commercial_category['zones'])} 個分區，總數: {commercial_category['total_count']}")
