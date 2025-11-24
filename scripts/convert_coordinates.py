#!/usr/bin/env python3
"""
Convert GeoJSON files from EPSG:3826 (TWD97 TM2) to EPSG:4326 (WGS84)
"""
import json
from pyproj import Transformer

# Create transformer from TWD97 TM2 (EPSG:3826) to WGS84 (EPSG:4326)
transformer = Transformer.from_crs("EPSG:3826", "EPSG:4326", always_xy=True)

def convert_coordinates(coords, coord_type):
    """Recursively convert coordinates"""
    if coord_type == "Point":
        # Point: [x, y]
        return list(transformer.transform(coords[0], coords[1]))
    elif coord_type in ["LineString", "MultiPoint"]:
        # LineString/MultiPoint: [[x1,y1], [x2,y2], ...]
        return [list(transformer.transform(x, y)) for x, y in coords]
    elif coord_type in ["Polygon", "MultiLineString"]:
        # Polygon/MultiLineString: [[[x1,y1], [x2,y2], ...], ...]
        return [[list(transformer.transform(x, y)) for x, y in ring] for ring in coords]
    elif coord_type == "MultiPolygon":
        # MultiPolygon: [[[[x1,y1], ...]], ...]
        return [[[list(transformer.transform(x, y)) for x, y in ring] for ring in polygon] for polygon in coords]
    else:
        return coords

def convert_geojson(input_file, output_file):
    """Convert a GeoJSON file from EPSG:3826 to EPSG:4326"""
    print(f"Converting {input_file} to {output_file}...")
    
    with open(input_file, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    # Update CRS if present
    if 'crs' in data:
        data['crs'] = {
            "type": "name",
            "properties": {
                "name": "urn:ogc:def:crs:OGC:1.3:CRS84"
            }
        }
    
    # Convert features
    if 'features' in data:
        for feature in data['features']:
            if 'geometry' in feature and feature['geometry']:
                geom_type = feature['geometry']['type']
                coords = feature['geometry']['coordinates']
                feature['geometry']['coordinates'] = convert_coordinates(coords, geom_type)
    
    # Update bbox if present
    if 'bbox' in data:
        # Convert bbox corners
        min_lon, min_lat = transformer.transform(data['bbox'][0], data['bbox'][1])
        max_lon, max_lat = transformer.transform(data['bbox'][2], data['bbox'][3])
        data['bbox'] = [min_lon, min_lat, max_lon, max_lat]
    
    # Write output
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False)
    
    print(f"✓ Converted {input_file}")

# Convert all four files
files_to_convert = [
    ('src/data/taipei_parks.json', 'src/data/taipei_parks.json'),
    ('src/data/taipei_agriculture.json', 'src/data/taipei_agriculture.json'),
    ('src/data/taipei_bird_protection.json', 'src/data/taipei_bird_protection.json'),
    ('src/data/taipei_nature_protection.json', 'src/data/taipei_nature_protection.json')
]

print("Starting coordinate conversion...")
for input_file, output_file in files_to_convert:
    convert_geojson(input_file, output_file)

print("\n✅ All files converted successfully!")
