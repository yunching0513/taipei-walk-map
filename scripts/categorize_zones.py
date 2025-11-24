import json
from collections import defaultdict
import colorsys

# Load data
with open('src/data/zone_counts.json', 'r', encoding='utf-8') as f:
    zone_counts = json.load(f)

with open('src/data/zoning_colors.json', 'r', encoding='utf-8') as f:
    zoning_colors = json.load(f)

def hex_to_rgb(hex_color):
    hex_color = hex_color.lstrip('#')
    return tuple(int(hex_color[i:i+2], 16) for i in (0, 2, 4))

def rgb_to_hsv(rgb):
    r, g, b = [x / 255.0 for x in rgb]
    return colorsys.rgb_to_hsv(r, g, b)

def color_distance(color1, color2):
    """Calculate color distance in HSV space"""
    rgb1 = hex_to_rgb(color1)
    rgb2 = hex_to_rgb(color2)
    hsv1 = rgb_to_hsv(rgb1)
    hsv2 = rgb_to_hsv(rgb2)
    
    # Weighted distance considering hue, saturation, and value
    h_dist = min(abs(hsv1[0] - hsv2[0]), 1 - abs(hsv1[0] - hsv2[0])) * 2
    s_dist = abs(hsv1[1] - hsv2[1])
    v_dist = abs(hsv1[2] - hsv2[2])
    
    return (h_dist * 2 + s_dist + v_dist) / 4

# Categorize zones
categories = {}

# Define manual categories based on common patterns
category_patterns = {
    '住宅': ['住宅', '社會住宅'],
    '商業': ['商業', '商務', '市場', '批發'],
    '工業': ['工業', '產業', '倉'],
    '學校教育': ['學校', '大學', '國小', '國中', '高中', '專科', '師', '文教'],
    '交通運輸': ['道路', '停車', '鐵路', '捷運', '車站', '公車', '港', '航空', '加油'],
    '公園綠地': ['公園', '綠地', '廣場', '遊樂', '體育', '運動'],
    '水利河川': ['河川', '水', '行水', '堤防', '溝'],
    '機關設施': ['機關', '行政', '郵政', '電信', '警察', '消防', '軍'],
    '醫療社福': ['醫療', '衛生', '社福', '社會福利', '殯'],
    '保護保存': ['保護', '保存', '古蹟', '風景'],
    '農業漁業': ['農業', '漁業', '魚塭', '鹽田'],
    '其他公設': ['變電', '污水', '垃圾', '抽水', '自來水']
}

# Categorize each zone
zone_to_category = {}
for zone_info in zone_counts:
    zone = zone_info['zone']
    categorized = False
    
    # Try to match with patterns
    for category, patterns in category_patterns.items():
        if any(pattern in zone for pattern in patterns):
            zone_to_category[zone] = category
            categorized = True
            break
    
    if not categorized:
        zone_to_category[zone] = '其他'

# Build categorized structure
categorized_zones = defaultdict(list)
for zone_info in zone_counts:
    zone = zone_info['zone']
    category = zone_to_category.get(zone, '其他')
    categorized_zones[category].append(zone_info)

# Calculate category totals and representative colors
category_data = []
for category, zones in categorized_zones.items():
    total_count = sum(z['count'] for z in zones)
    # Use the most common color in the category
    color_counts = defaultdict(int)
    for z in zones:
        color = zoning_colors.get(z['zone'], '#cccccc')
        color_counts[color] += z['count']
    representative_color = max(color_counts.items(), key=lambda x: x[1])[0]
    
    category_data.append({
        'category': category,
        'zones': zones,
        'total_count': total_count,
        'color': representative_color
    })

# Sort categories by total count
category_data.sort(key=lambda x: x['total_count'], reverse=True)

# Save to JSON
output = {
    'categories': category_data,
    'zone_to_category': zone_to_category
}

with open('src/data/zone_categories.json', 'w', encoding='utf-8') as f:
    json.dump(output, f, ensure_ascii=False, indent=2)

print("Zone Categories:")
print("=" * 60)
for cat in category_data:
    print(f"\n{cat['category']} (總數: {cat['total_count']}, 顏色: {cat['color']})")
    print(f"  包含 {len(cat['zones'])} 種分區")
    for zone in cat['zones'][:5]:  # Show first 5
        print(f"    - {zone['zone']} ({zone['count']})")
    if len(cat['zones']) > 5:
        print(f"    ... 還有 {len(cat['zones']) - 5} 種")

print(f"\n已儲存到 src/data/zone_categories.json")
