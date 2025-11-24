import json

# Load data
with open('src/data/zoning_colors.json', 'r', encoding='utf-8') as f:
    zoning_colors = json.load(f)

# Commercial color (pink in the screenshot)
commercial_color = '#ff003f'

# Find zones with commercial color
commercial_colored = [zone for zone, color in zoning_colors.items() if color == commercial_color]

print("使用商業區粉紅色 (#ff003f) 的分區:")
print("=" * 70)
for zone in commercial_colored:
    print(f"  - {zone}")

print(f"\n總計: {len(commercial_colored)} 個分區使用粉紅色")
