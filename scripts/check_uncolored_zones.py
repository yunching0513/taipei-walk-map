import json

# Load data
with open('src/data/zone_counts.json', 'r', encoding='utf-8') as f:
    zone_counts = json.load(f)

with open('src/data/zoning_colors.json', 'r', encoding='utf-8') as f:
    zoning_colors = json.load(f)

# Check which zones don't have colors or have default color
default_color = '#cccccc'
no_color_zones = []
default_color_zones = []

for zone_info in zone_counts:
    zone = zone_info['zone']
    color = zoning_colors.get(zone)
    
    if not color:
        no_color_zones.append(zone_info)
    elif color == default_color:
        default_color_zones.append(zone_info)

print("=" * 70)
print("分區顏色檢查報告")
print("=" * 70)

if no_color_zones:
    print(f"\n沒有分配顏色的分區 ({len(no_color_zones)} 個):")
    print("-" * 70)
    for zone_info in no_color_zones:
        print(f"  ✗ {zone_info['zone']} ({zone_info['count']})")
else:
    print("\n✓ 所有分區都已分配顏色")

if default_color_zones:
    print(f"\n使用預設灰色 (#cccccc) 的分區 ({len(default_color_zones)} 個):")
    print("-" * 70)
    for zone_info in default_color_zones:
        print(f"  ⚠ {zone_info['zone']} ({zone_info['count']})")

# Statistics
total_zones = len(zone_counts)
colored_zones = total_zones - len(no_color_zones)
print("\n" + "=" * 70)
print(f"總計: {total_zones} 個分區")
print(f"已分配顏色: {colored_zones} 個")
print(f"使用預設灰色: {len(default_color_zones)} 個")
print(f"未分配顏色: {len(no_color_zones)} 個")
print("=" * 70)
