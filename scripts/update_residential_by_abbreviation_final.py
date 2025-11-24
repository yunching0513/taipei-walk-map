import json, subprocess, sys

# Ensure dbfread installed
subprocess.run([sys.executable, "-m", "pip", "install", "dbfread"], check=True)

from dbfread import DBF

# Paths
shp_dir = "raw_data/03.Taipei_MP"
dbf_path = f"{shp_dir}/03.Taipei_MP.dbf"

# Load DBF with cp950 (big5) encoding
records = DBF(dbf_path, encoding='cp950')

target_zones = []
for rec in records:
    abbrev = str(rec.get('分區簡稱', '')).strip()
    if abbrev == '住':
        zone_name = rec.get('分區名稱')
        if zone_name:
            target_zones.append(zone_name)

print(f"找到 {len(target_zones)} 個分區簡稱為 '住' 的區塊")

# Load existing color mapping
with open('src/data/zoning_colors.json', 'r', encoding='utf-8') as f:
    zoning_colors = json.load(f)

yellow = '#ffff00'
updated = []
for zone in target_zones:
    old = zoning_colors.get(zone, '未設定')
    zoning_colors[zone] = yellow
    updated.append((zone, old))

# Save back
with open('src/data/zoning_colors.json', 'w', encoding='utf-8') as f:
    json.dump(zoning_colors, f, ensure_ascii=False, indent=2)

print("已將以下分區顏色設為黃色:")
for zone, old in updated:
    print(f"  - {zone}: {old} → {yellow}")
print(f"總計更新 {len(updated)} 個分區")
