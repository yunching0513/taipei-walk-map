import json
from collections import Counter

# Load the Main Plan GeoJSON
with open('src/data/taipei_main_plan.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

# Count zones
zone_counts = Counter()
for feature in data['features']:
    zone_type = feature['properties'].get('zone_type')
    if zone_type:
        zone_counts[zone_type] += 1

# Sort by count (descending)
sorted_zones = sorted(zone_counts.items(), key=lambda x: x[1], reverse=True)

# Print results
print("Zone Counts (sorted by frequency):")
print("=" * 50)
for zone, count in sorted_zones:
    print(f"{zone}: {count}")

# Save to JSON for frontend
zone_info = [{"zone": zone, "count": count} for zone, count in sorted_zones]
with open('src/data/zone_counts.json', 'w', encoding='utf-8') as f:
    json.dump(zone_info, f, ensure_ascii=False, indent=2)

print(f"\nSaved {len(zone_info)} zones to src/data/zone_counts.json")
