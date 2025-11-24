import json

# Load data
with open('src/data/zone_categories.json', 'r', encoding='utf-8') as f:
    zone_categories = json.load(f)

with open('src/data/zoning_colors.json', 'r', encoding='utf-8') as f:
    zoning_colors = json.load(f)

# Blue color
blue = '#007fff'

# Find 醫療社福 category
medical_category = next((c for c in zone_categories['categories'] if c['category'] == '醫療社福'), None)

if medical_category:
    print(f"找到「醫療社福」類別，共 {len(medical_category['zones'])} 個分區")
    print("\n將所有分區改為藍色 (#007fff):")
    print("=" * 60)
    
    updated_count = 0
    for zone_info in medical_category['zones']:
        zone = zone_info['zone']
        old_color = zoning_colors.get(zone, '#cccccc')
        zoning_colors[zone] = blue
        print(f"  - {zone}: {old_color} → {blue}")
        updated_count += 1
    
    # Update category representative color
    medical_category['color'] = blue
    
    # Save updated data
    with open('src/data/zoning_colors.json', 'w', encoding='utf-8') as f:
        json.dump(zoning_colors, f, ensure_ascii=False, indent=2)
    
    with open('src/data/zone_categories.json', 'w', encoding='utf-8') as f:
        json.dump(zone_categories, f, ensure_ascii=False, indent=2)
    
    print(f"\n✓ 已更新 {updated_count} 個分區為藍色")
    print("✓ 已儲存到 zoning_colors.json 和 zone_categories.json")
else:
    print("找不到「醫療社福」類別")
