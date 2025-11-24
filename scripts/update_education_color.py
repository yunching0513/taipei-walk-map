import json

# Load data
with open('src/data/zone_categories.json', 'r', encoding='utf-8') as f:
    zone_categories = json.load(f)

with open('src/data/zoning_colors.json', 'r', encoding='utf-8') as f:
    zoning_colors = json.load(f)

# Find education category
education_category = next((c for c in zone_categories['categories'] if c['category'] == '學校教育'), None)

if education_category:
    print(f"找到「學校教育」類別，共 {len(education_category['zones'])} 個分區")
    print("\n將以下分區改為紫色 (#bf7fff):")
    print("=" * 50)
    
    # Update colors
    purple = '#bf7fff'
    updated_count = 0
    
    for zone_info in education_category['zones']:
        zone = zone_info['zone']
        old_color = zoning_colors.get(zone, '#cccccc')
        zoning_colors[zone] = purple
        print(f"  - {zone}: {old_color} → {purple}")
        updated_count += 1
    
    # Save updated colors
    with open('src/data/zoning_colors.json', 'w', encoding='utf-8') as f:
        json.dump(zoning_colors, f, ensure_ascii=False, indent=2)
    
    print(f"\n✓ 已更新 {updated_count} 個分區的顏色")
    print("✓ 已儲存到 src/data/zoning_colors.json")
    
    # Update category representative color
    education_category['color'] = purple
    with open('src/data/zone_categories.json', 'w', encoding='utf-8') as f:
        json.dump(zone_categories, f, ensure_ascii=False, indent=2)
    
    print("✓ 已更新類別代表顏色")
    
else:
    print("找不到「學校教育」類別")
