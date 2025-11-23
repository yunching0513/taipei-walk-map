#!/usr/bin/env python3
"""
分析台北市道路用地面積 (使用都市計畫圖資料)
資料來源：
1. 03.Taipei_MP/03.Taipei_MP2.shp (都市計畫圖 - 面)
2. 02.Color_Sidewalk (Shapefile) - 標線型人行道
3. 02.Taipei_sidewalk (JSON) - 實體人行道
"""
import geopandas as gpd
import os
import sys

# 設定路徑
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
RAW_DATA_DIR = os.path.join(BASE_DIR, "../raw_data")

print("=" * 60)
print("台北市道路用地與人行道面積分析 (都市計畫圖)")
print("=" * 60)

def load_and_calculate_area(name, path, encoding=None, filter_col=None, filter_val=None):
    print(f"\n處理 {name}...")
    full_path = os.path.join(RAW_DATA_DIR, path)
    
    if not os.path.exists(full_path):
        print(f"❌ 找不到檔案: {full_path}")
        return None
        
    try:
        if encoding:
            gdf = gpd.read_file(full_path, encoding=encoding)
        else:
            gdf = gpd.read_file(full_path)
            
        print(f"   讀取成功: {len(gdf)} 個要素")
        print(f"   原始 CRS: {gdf.crs}")
        
        # 過濾資料
        if filter_col and filter_val:
            original_len = len(gdf)
            if isinstance(filter_val, list):
                gdf = gdf[gdf[filter_col].isin(filter_val)]
            else:
                gdf = gdf[gdf[filter_col] == filter_val]
            print(f"   過濾後 ({filter_col} = {filter_val}): {len(gdf)} / {original_len} 個要素")
        
        # 統一轉換為 TWD97 (EPSG:3826) 以計算面積 (單位: 公尺)
        if gdf.crs is None:
            print("   ⚠️ 無 CRS 資訊，假設為 EPSG:3826 (TWD97)")
            gdf.set_crs(epsg=3826, inplace=True)
        else:
            gdf = gdf.to_crs(epsg=3826)
            
        # 計算面積 (平方公里)
        total_area = gdf.area.sum() / 1_000_000
        print(f"   總面積: {total_area:.4f} km²")
        
        return total_area
        
    except Exception as e:
        print(f"❌ 處理失敗: {e}")
        return None

# 1. 道路用地 (03.Taipei_MP2 - 道路用地)
# 包含: '道路用地', '捷運系統用地(兼供道路使用)'
road_landuse_types = ['道路用地', '捷運系統用地(兼供道路使用)']
road_area = load_and_calculate_area(
    "道路用地 (03.Taipei_MP2)", 
    "03.Taipei_MP/03.Taipei_MP2.shp", 
    encoding='cp950',
    filter_col='使用分區',
    filter_val=road_landuse_types
)

# 2. 標線型人行道 (02.Color_Sidewalk)
marked_sidewalk_area = load_and_calculate_area("標線型人行道 (02.Color_Sidewalk)", "02.Color_Sidewalk/02.Color_sidewalk.shp")

# 3. 實體人行道 (02.Taipei_sidewalk)
physical_sidewalk_area = load_and_calculate_area("實體人行道 (02.Taipei_sidewalk)", "02.Taipei_sidewalk.json")

# 4. 台北市總面積 (參考值)
dist_area = load_and_calculate_area("台北市行政區界 (參考)", "00.Taipei_Dist/00.Taipei_Dist.shp")

if road_area is not None and marked_sidewalk_area is not None and physical_sidewalk_area is not None:
    print("\n" + "=" * 60)
    print("📊 最終統計結果 (基於都市計畫道路用地)")
    print("=" * 60)
    
    total_infrastructure = road_area  # 這裡假設人行道包含在道路用地內，或者我們比較兩者
    
    print(f"\n【絕對面積】")
    if dist_area:
        print(f"台北市總面積: {dist_area:.2f} km²")
    print(f"道路用地:     {road_area:.2f} km² (含: {', '.join(road_landuse_types)})")
    print(f"標線型人行道: {marked_sidewalk_area:.2f} km²")
    print(f"實體人行道:   {physical_sidewalk_area:.2f} km²")
    
    print(f"\n【相對比例 - 以道路用地為基準 (100%)】")
    print(f"道路用地:     100.00%")
    print(f"標線型人行道: {(marked_sidewalk_area / road_area * 100):.2f}%")
    print(f"實體人行道:   {(physical_sidewalk_area / road_area * 100):.2f}%")
    
    if dist_area:
        print(f"\n【佔台北市總面積比例】")
        print(f"道路用地:     {(road_area / dist_area * 100):.2f}%")
        print(f"標線型人行道: {(marked_sidewalk_area / dist_area * 100):.2f}%")
        print(f"實體人行道:   {(physical_sidewalk_area / dist_area * 100):.2f}%")

print("\n" + "=" * 60)
