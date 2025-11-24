import geopandas as gpd
import os

# Paths
shp_path = "raw_data/03.Taipei_MP/03.Taipei_MP2.shp"
output_path = "src/data/taipei_main_plan.json"

try:
    print("Reading shapefile...")
    gdf = gpd.read_file(shp_path, encoding='cp950')
    
    # Ensure CRS is EPSG:4326
    if gdf.crs is None:
        print("Warning: CRS is missing. Assuming EPSG:3826 (TWD97 121) based on location.")
        gdf.set_crs(epsg=3826, inplace=True)
    
    print(f"Current CRS: {gdf.crs}")
    if gdf.crs.to_string() != "EPSG:4326":
        print("Converting to EPSG:4326...")
        gdf = gdf.to_crs(epsg=4326)
        
    # Filter out empty zones if necessary, but keep most for completeness
    # Based on inspection, '使用分區' is the key column.
    # We might want to rename it to 'zone_type' for easier access in JS
    gdf['zone_type'] = gdf['使用分區']
    
    # Keep only relevant columns to reduce file size
    columns_to_keep = ['zone_type', 'geometry']
    gdf = gdf[columns_to_keep]
    
    print(f"Saving to {output_path}...")
    gdf.to_file(output_path, driver='GeoJSON')
    print("Conversion complete!")

except Exception as e:
    print(f"Error: {e}")
