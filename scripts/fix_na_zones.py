import json

# Load the Main Plan data
with open('src/data/taipei_main_plan.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

# Count and update N/A zones
updated_count = 0
for feature in data['features']:
    zone_type = feature['properties'].get('zone_type')
    if not zone_type or zone_type == 'N/A' or zone_type == '':
        feature['properties']['zone_type'] = '計畫道路'
        updated_count += 1

# Save updated data
with open('src/data/taipei_main_plan.json', 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

print(f"✓ 已將 {updated_count} 個 N/A 分區更新為「計畫道路」")

# Update color
colors = json.load(open('src/data/zoning_colors.json', 'r', encoding='utf-8'))
colors['計畫道路'] = '#ffffff'
json.dump(colors, open('src/data/zoning_colors.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=2)

print("✓ 已設定「計畫道路」顏色為白色 (#ffffff)")
print("✓ 外框顏色將由 Map.jsx 中的設定控制")
