import json

# Load data
with open('src/data/zone_categories.json', 'r', encoding='utf-8') as f:
    zone_categories = json.load(f)

with open('src/data/zoning_colors.json', 'r', encoding='utf-8') as f:
    zoning_colors = json.load(f)

with open('src/data/zone_counts.json', 'r', encoding='utf-8') as f:
    zone_counts = json.load(f)

# Deep gray color
dark_gray = '#505050'

# Keywords for funeral-related zones
funeral_keywords = ['殯葬', '殯儀', '墳墓', '公墓', '納骨']

# Find funeral-related zones
funeral_zones = []
for zone_info in zone_counts:
    zone = zone_info['zone']
    if any(keyword in zone for keyword in funeral_keywords):
        funeral_zones.append(zone_info)

print("找到以下殯葬相關分區:")
print("=" * 60)
for zone_info in funeral_zones:
    print(f"  - {zone_info['zone']} ({zone_info['count']})")

print(f"\n總計: {len(funeral_zones)} 個分區")

# Find 其他公設 category
other_facilities = next((c for c in zone_categories['categories'] if c['category'] == '其他公設'), None)

if not other_facilities:
    print("找不到「其他公設」類別")
    exit(1)

# Update each funeral zone
print("\n處理分區:")
print("=" * 60)
for zone_info in funeral_zones:
    zone = zone_info['zone']
    
    # Update color
    old_color = zoning_colors.get(zone, '#cccccc')
    zoning_colors[zone] = dark_gray
    print(f"{zone}:")
    print(f"  顏色: {old_color} → {dark_gray}")
    
    # Update category mapping
    old_category = zone_categories['zone_to_category'].get(zone, '無')
    zone_categories['zone_to_category'][zone] = '其他公設'
    print(f"  類別: {old_category} → 其他公設")
    
    # Remove from old category
    for category in zone_categories['categories']:
        category['zones'] = [z for z in category['zones'] if z['zone'] != zone]
    
    # Add to 其他公設 if not already there
    if not any(z['zone'] == zone for z in other_facilities['zones']):
        other_facilities['zones'].append(zone_info)

# Recalculate totals for affected categories
for category in zone_categories['categories']:
    category['total_count'] = sum(z['count'] for z in category['zones'])

# Save updated data
with open('src/data/zoning_colors.json', 'w', encoding='utf-8') as f:
    json.dump(zoning_colors, f, ensure_ascii=False, indent=2)

with open('src/data/zone_categories.json', 'w', encoding='utf-8') as f:
    json.dump(zone_categories, f, ensure_ascii=False, indent=2)

print("\n" + "=" * 60)
print(f"✓ 已將 {len(funeral_zones)} 個殯葬相關分區改為深灰色")
print(f"✓ 已移至「其他公設」類別")
print(f"✓ 其他公設類別現有 {len(other_facilities['zones'])} 個分區，總數: {other_facilities['total_count']}")
