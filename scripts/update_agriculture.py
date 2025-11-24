import json

# Load data
with open('src/data/zone_categories.json', 'r', encoding='utf-8') as f:
    zone_categories = json.load(f)

with open('src/data/zoning_colors.json', 'r', encoding='utf-8') as f:
    zoning_colors = json.load(f)

# Find agriculture category
ag_category = next((c for c in zone_categories['categories'] if c['category'] == '農業漁業'), None)

if ag_category:
    print(f"找到「農業漁業」類別，共 {len(ag_category['zones'])} 個分區")
    print("\n將類別名稱改為「農業」，所有分區改為綠色 (#7fff00):")
    print("=" * 50)
    
    # Update category name
    ag_category['category'] = '農業'
    
    # Update colors
    green = '#7fff00'
    ag_category['color'] = green
    updated_count = 0
    
    for zone_info in ag_category['zones']:
        zone = zone_info['zone']
        old_color = zoning_colors.get(zone, '#cccccc')
        zoning_colors[zone] = green
        print(f"  - {zone}: {old_color} → {green}")
        updated_count += 1
    
    # Also update zone_to_category mapping
    for zone_info in ag_category['zones']:
        zone = zone_info['zone']
        zone_categories['zone_to_category'][zone] = '農業'
    
    # Save updated data
    with open('src/data/zoning_colors.json', 'w', encoding='utf-8') as f:
        json.dump(zoning_colors, f, ensure_ascii=False, indent=2)
    
    with open('src/data/zone_categories.json', 'w', encoding='utf-8') as f:
        json.dump(zone_categories, f, ensure_ascii=False, indent=2)
    
    print(f"\n✓ 類別名稱: 農業漁業 → 農業")
    print(f"✓ 已更新 {updated_count} 個分區的顏色為綠色")
    print("✓ 已儲存到 src/data/zoning_colors.json 和 zone_categories.json")
    
else:
    print("找不到「農業漁業」類別")
