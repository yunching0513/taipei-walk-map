import json

# Load data
with open('src/data/zone_categories.json', 'r', encoding='utf-8') as f:
    zone_categories = json.load(f)

with open('src/data/zoning_colors.json', 'r', encoding='utf-8') as f:
    zoning_colors = json.load(f)

# Deep green color (same as 陽明山國家公園區)
dark_green = '#006400'

# Find 保護保存 category
protection_category = next((c for c in zone_categories['categories'] if c['category'] == '保護保存'), None)

if protection_category:
    print(f"找到「保護保存」類別，共 {len(protection_category['zones'])} 個分區")
    print("\n將所有分區改為深綠色 (#006400):")
    print("=" * 60)
    
    updated_count = 0
    for zone_info in protection_category['zones']:
        zone = zone_info['zone']
        old_color = zoning_colors.get(zone, '#cccccc')
        zoning_colors[zone] = dark_green
        print(f"  - {zone}: {old_color} → {dark_green}")
        updated_count += 1
    
    # Update category representative color
    protection_category['color'] = dark_green
    
    # Save updated data
    with open('src/data/zoning_colors.json', 'w', encoding='utf-8') as f:
        json.dump(zoning_colors, f, ensure_ascii=False, indent=2)
    
    with open('src/data/zone_categories.json', 'w', encoding='utf-8') as f:
        json.dump(zone_categories, f, ensure_ascii=False, indent=2)
    
    print(f"\n✓ 已更新 {updated_count} 個分區為深綠色")
    print("✓ 已儲存到 zoning_colors.json 和 zone_categories.json")
else:
    print("找不到「保護保存」類別")
