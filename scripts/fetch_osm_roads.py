import requests
import json
import os

# Define the Overpass API endpoint
OVERPASS_URL = "http://overpass-api.de/api/interpreter"

# Define the query
# Taipei relation ID is roughly 2307289, but using a bounding box or simple area query is safer for specific tags over a large area.
# Let's use a bounding box for Taipei City.
# Approx bounds: 24.96, 121.45, 25.21, 121.66
# To be precise, we can query by area name.

query = """
[out:json][timeout:90];
area["name:en"="Taipei"]->.searchArea;
(
  way["highway"~"service|residential|living_street|pedestrian|path|footway|track|unclassified"](area.searchArea);
);
out geom;
"""

def fetch_data():
    print("Fetching data from Overpass API...")
    response = requests.get(OVERPASS_URL, params={'data': query})
    if response.status_code == 200:
        return response.json()
    else:
        print(f"Error: {response.status_code}")
        print(response.text)
        return None

def convert_to_geojson(osm_data):
    print("Converting to GeoJSON...")
    features = []
    for element in osm_data.get('elements', []):
        if element['type'] == 'way':
            coordinates = []
            for point in element.get('geometry', []):
                coordinates.append([point['lon'], point['lat']])
            
            feature = {
                "type": "Feature",
                "properties": element.get('tags', {}),
                "geometry": {
                    "type": "LineString",
                    "coordinates": coordinates
                }
            }
            features.append(feature)
            
    return {
        "type": "FeatureCollection",
        "features": features
    }

def main():
    osm_data = fetch_data()
    if osm_data:
        geojson = convert_to_geojson(osm_data)
        
        output_path = os.path.join("src", "data", "taipei_small_roads.json")
        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        
        with open(output_path, "w", encoding="utf-8") as f:
            json.dump(geojson, f, ensure_ascii=False)
        
        print(f"Successfully saved {len(geojson['features'])} features to {output_path}")

if __name__ == "__main__":
    main()
