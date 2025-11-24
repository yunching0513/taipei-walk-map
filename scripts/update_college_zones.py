import json

# Load data
with open('src/data/zone_categories.json', 'r', encoding='utf-8') as f:
    zone_categories = json.load(f)

with open('src/data/zoning_colors.json', 'r', encoding='utf-8') as f:
    zoning_colors = json.load(f)

with open('src/data/zone_counts.json', 'r', encoding='utf-8') as f:
    zone_counts = json.load(f)

# Target zones
target_zones = ['大專用地', '台北工專用地', '私立中國海專用地']
purple = '#bf7fff'

# Find education category
education_category = next((c for c in zone_categories['categories'] if c['category'] == '學校教育'), None)

if not education_category:
    print("找不到「學校教育」類別")
    exit(1)

print("處理以下分區:")
print("=" * 50)

moved_zones = []
for zone_name in target_zones:
    # Check if zone exists in data
    zone_data = next((z for z in zone_counts if zone_name in z['zone']), None)
    
    if zone_data:
        actual_zone_name = zone_data['zone']
        print(f"✓ 找到: {actual_zone_name} ({zone_data['count']})")
        
        # Update color
        zoning_colors[actual_zone_name] = purple
        
        # Update category mapping
        zone_categories['zone_to_category'][actual_zone_name] = '學校教育'
        
        # Find if already in education category
        already_in_education = any(z['zone'] == actual_zone_name for z in education_category['zones'])
        
        if not already_in_education:
            # Remove from other categories
            for category in zone_categories['categories']:
                category['zones'] = [z for z in category['zones'] if z['zone'] != actual_zone_name]
            
            # Add to education category
            education_category['zones'].append(zone_data)
            print(f"  → 已移至「學校教育」類別")
        else:
            print(f"  → 已在「學校教育」類別中")
        
        print(f"  → 顏色設為紫色 {purple}")
        moved_zones.append(actual_zone_name)
    else:
        # Try partial match
        matching_zones = [z for z in zone_counts if zone_name.replace('用地', '') in z['zone']]
        if matching_zones:
            print(f"\n可能匹配 '{zone_name}':")
            for z in matching_zones:
                print(f"  - {z['zone']} ({z['count']})")
        else:
            print(f"✗ 找不到: {zone_name}")

# Recalculate education category total
education_category['total_count'] = sum(z['count'] for z in education_category['zones'])

# Save updated data
with open('src/data/zoning_colors.json', 'w', encoding='utf-8') as f:
    json.dump(zoning_colors, f, ensure_ascii=False, indent=2)

with open('src/data/zone_categories.json', 'w', encoding='utf-8') as f:
    json.dump(zone_categories, f, ensure_ascii=False, indent=2)

print("\n" + "=" * 50)
print(f"✓ 已更新 {len(moved_zones)} 個分區")
print(f"✓ 學校教育類別現有 {len(education_category['zones'])} 個分區")
print(f"✓ 總數: {education_category['total_count']}")
