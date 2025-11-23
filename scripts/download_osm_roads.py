"""
Download OpenStreetMap road network data for Taipei City
and convert to GeoJSON format for use in the map application.
"""

import osmnx as ox
import geopandas as gpd
import json

def download_taipei_roads():
    """Download all roads in Taipei City from OpenStreetMap"""
    
    print("Downloading road network from OpenStreetMap...")
    
    # Define Taipei City area
    place_name = "Taipei, Taiwan"
    
    # Download road network
    # Include all road types for complete coverage
    G = ox.graph_from_place(
        place_name,
        network_type='all',  # Get all roads
        simplify=True
    )
    
    print(f"Downloaded {len(G.edges)} road segments")
    
    # Convert to GeoDataFrame
    gdf_edges = ox.graph_to_gdfs(G, nodes=False, edges=True)
    
    # Select relevant columns and rename for clarity
    gdf_edges = gdf_edges[['geometry', 'highway', 'name', 'length']]
    
    # Classify roads into categories for styling
    def classify_road(highway):
        if pd.isna(highway):
            return 'other'
        if isinstance(highway, list):
            highway = highway[0]
        
        major = ['motorway', 'trunk', 'primary']
        medium = ['secondary', 'tertiary']
        minor = ['residential', 'service', 'unclassified']
        
        if highway in major:
            return 'major'
        elif highway in medium:
            return 'medium'
        elif highway in minor:
            return 'minor'
        else:
            return 'other'
    
    gdf_edges['road_class'] = gdf_edges['highway'].apply(classify_road)
    
    # Convert to WGS84 (EPSG:4326) if not already
    if gdf_edges.crs != 'EPSG:4326':
        gdf_edges = gdf_edges.to_crs('EPSG:4326')
    
    # Convert to GeoJSON
    geojson_data = json.loads(gdf_edges.to_json())
    
    # Save to file
    output_path = 'src/data/taipei_roads_osm.json'
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(geojson_data, f, ensure_ascii=False)
    
    print(f"✓ Road network saved to {output_path}")
    print(f"  - Total segments: {len(gdf_edges)}")
    print(f"  - Major roads: {len(gdf_edges[gdf_edges['road_class'] == 'major'])}")
    print(f"  - Medium roads: {len(gdf_edges[gdf_edges['road_class'] == 'medium'])}")
    print(f"  - Minor roads: {len(gdf_edges[gdf_edges['road_class'] == 'minor'])}")

if __name__ == '__main__':
    import pandas as pd
    download_taipei_roads()
