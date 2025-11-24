import pandas as pd
import json
import os

file_path = 'raw_data/03.Plan_Color.xls'

try:
    # Try reading with pandas (requires xlrd for .xls)
    # We'll assume the file has columns like 'Zone', 'R', 'G', 'B' or similar.
    # Since I don't know the exact schema, I'll read the first few rows first.
    df = pd.read_excel(file_path)
    print("Columns:", df.columns.tolist())
    print(df.head())
    
    # Specific columns found
    zone_col = '類別名稱'
    r_col = '圖形R值'
    g_col = '圖形G值'
    b_col = '圖形B值'
    
    print(f"Using columns: {zone_col}, {r_col}, {g_col}, {b_col}")
    
    color_map = {}
    for index, row in df.iterrows():
        zone = row[zone_col]
        
        if pd.isna(zone):
            continue
            
        # Clean zone name
        zone = str(zone).strip()
        
        try:
            r = int(row[r_col])
            g = int(row[g_col])
            b = int(row[b_col])
            
            hex_color = '#{:02x}{:02x}{:02x}'.format(r, g, b)
            
            # Only add if not exists (or overwrite? usually categories have same color)
            if zone not in color_map:
                color_map[zone] = hex_color
                
        except Exception as e:
            # print(f"Error parsing RGB for {zone}: {e}")
            pass
            
    print("\nJSON Mapping:")
    print(json.dumps(color_map, ensure_ascii=False, indent=2))
    
    # Save to file
    with open('src/data/zoning_colors.json', 'w', encoding='utf-8') as f:
        json.dump(color_map, f, ensure_ascii=False, indent=2)
    print("Saved to src/data/zoning_colors.json")

except Exception as e:
    print(f"Error processing file: {e}")
