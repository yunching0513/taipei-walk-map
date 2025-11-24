import json

# Load data
with open('src/data/zone_counts.json', 'r', encoding='utf-8') as f:
    zone_counts = json.load(f)

with open('src/data/zone_categories.json', 'r', encoding='utf-8') as f:
    zone_categories = json.load(f)

# Get all zones from zone_counts
all_zones = set(z['zone'] for z in zone_counts)

# Get all zones in categories
categorized_zones = set()
for category in zone_categories['categories']:
    for zone_info in category['zones']:
        categorized_zones.add(zone_info['zone'])

# Find missing zones
missing_zones = all_zones - categorized_zones

print(f"Total zones in data: {len(all_zones)}")
print(f"Categorized zones: {len(categorized_zones)}")
print(f"Missing zones: {len(missing_zones)}")

if missing_zones:
    print("\n遺漏的分區:")
    print("=" * 50)
    for zone in sorted(missing_zones):
        # Find count
        count = next((z['count'] for z in zone_counts if z['zone'] == zone), 0)
        print(f"  - {zone} ({count})")
else:
    print("\n✓ 所有分區都已分類！")
