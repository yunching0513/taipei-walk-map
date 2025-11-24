import geopandas as gpd
import os

# Path to the shapefile
shp_path = "raw_data/03.Taipei_MP/03.Taipei_MP2.shp"

try:
    gdf = gpd.read_file(shp_path, encoding='cp950') # Try cp950 for Traditional Chinese
    print("Columns:", gdf.columns.tolist())
    print("\nFirst 5 rows:")
    print(gdf.head())
    
    # Print unique values for potential zone type columns
    for col in gdf.columns:
        if '分區' in col or 'USE' in col.upper() or 'TYPE' in col.upper():
            print(f"\nUnique values in '{col}':")
            print(gdf[col].unique()) # Show all unique values

except Exception as e:
    print(f"Error reading shapefile: {e}")
