import json, subprocess, sys

# Ensure dbfread is installed
subprocess.run([sys.executable, "-m", "pip", "install", "dbfread"], check=True)

from dbfread import DBF

shp_dir = "raw_data/03.Taipei_MP"
dbf_path = f"{shp_dir}/03.Taipei_MP.dbf"

# Try different encodings
encodings = ["utf-8", "cp950", "big5", "latin1"]
records = None
for enc in encodings:
    try:
        records = DBF(dbf_path, encoding=enc)
        print(f"成功使用編碼 {enc} 讀取 DBF")
        break
    except Exception as e:
        print(f"編碼 {enc} 失敗: {e}")
        continue

if records is None:
    print("無法讀取 DBF 檔案，請檢查檔案或編碼")
    sys.exit(1)

# Identify zones where 分區簡稱 == '住'
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
