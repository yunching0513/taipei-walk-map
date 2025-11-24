import json

# Load data
with open('src/data/zoning_colors.json', 'r', encoding='utf-8') as f:
    zoning_colors = json.load(f)

# Define colors
blue = '#007fff'  # 公共設施
gray = '#808080'  # 交通基建
red = '#ff003f'   # 商業
brown = '#7f3f00' # 工業

# Categorize and assign colors to uncolored zones
updates = {
    # 公共設施 - 藍色
    blue: [
        '電力設施用地', '抽水站用地', '排水溝用地', '變電所用地',
        '電信用地', '郵政用地', '自來水廠用地', '社福及機關用地',
        '自來水用地', '軍事機關用地', '自來水事業用地',
        '污水處理場用地', '社福及機關用地(供本府及相關單位公務使用)',
        '防洪調節池用地', '自來水設備用地', '電信專用區',
        '社教機構用地', '污水抽水站用地', '自來水工程用地',
        '電信及社會福利專用區', '電路鐵塔用地', '自來水加壓站用地',
        '調度站用地', '中正紀念堂用地', '郵政電信用地',
        '警察機關用地', '防洪蓄水池用地', '社會福利設施及機關用地',
        '服務中心用地', '機關用地(供中央機關使用)', '衛福及機關用地',
        '機關及社會福利設施用地', '機關用地兼供社會福利設施使用',
        '醫院用地', '消防用地', '水利設施用地', '沉砂池用地'
    ],
    # 交通基建 - 灰色
    gray: [
        '高速公路用地', '道路護坡用地', '隧道用地', '捷運系統用地',
        '捷運開發區', '交通廣場用地', '機場用地', '擋土牆護坡用地',
        '公車調度站用地', '捷運系統用地(兼供道路使用)', '轉運站用地',
        '人行步道(無遮簷)', '垃圾處理場用地', '垃圾掩理場用地',
        '橋樑用地', '河道用地', '河川用地', '水溝用地', '溝渠用地'
    ],
    # 商業 - 紅色 
    red: [
        '批發市場用地', '特定觀光商業專用區', '娛樂區', '商務產業專用區',
        '金融資訊專用區', '文化觀光專用區', '創意文化專用區',
        '露營場專用區\n', '糧倉專用區', '文化廣場用地'
    ],
    # 工業 - 棕色
    brown: [
        '資訊產業專用區', '科技產業專用區\n', '產業服務區',
        '產業支援專用區', '產業支援設施用地', '煤氣公用事業用地'
    ],
    # 學校 - 紫色
    '#bf7fff': [
        '高職用地', '寺廟專用區'
    ]
}

print("批量分配顏色:")
print("=" * 70)

total_updated = 0
for color, zones in updates.items():
    color_name = {
        blue: '藍色(公共設施)',
        gray: '灰色(交通基建)',
        red: '紅色(商業)',
        brown: '棕色(工業)',
        '#bf7fff': '紫色(教育)'
    }[color]
    
    print(f"\n{color_name} ({color}):")
    print("-" * 70)
    for zone in zones:
        zone = zone.strip()
        if zone in zoning_colors:
            old = zoning_colors[zone]
            print(f"  已有顏色: {zone} ({old})")
        else:
            zoning_colors[zone] = color
            print(f"  ✓ 新增: {zone}")
            total_updated += 1

# Save
with open('src/data/zoning_colors.json', 'w', encoding='utf-8') as f:
    json.dump(zoning_colors, f, ensure_ascii=False, indent=2)

print("\n" + "=" * 70)
print(f"✓ 已新增 {total_updated} 個分區的顏色")
