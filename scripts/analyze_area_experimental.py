#!/usr/bin/env python3
"""
實驗性質：計算台北市道路與人行道面積比例 (使用原始資料)
資料來源：
1. 01.Taipei_Road (Shapefile) - 道路
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
print("台北市道路與人行道面積分析 (實驗性質 - 原始資料)")
print("=" * 60)

def load_and_calculate_area(name, path, layer_type="Polygon"):
    print(f"\n處理 {name}...")
    full_path = os.path.join(RAW_DATA_DIR, path)
    
    if not os.path.exists(full_path):
        print(f"❌ 找不到檔案: {full_path}")
        return None
        
    try:
        gdf = gpd.read_file(full_path)
        print(f"   讀取成功: {len(gdf)} 個要素")
        print(f"   原始 CRS: {gdf.crs}")
        
        # 檢查幾何類型
        geom_types = gdf.geom_type.unique()
        print(f"   幾何類型: {geom_types}")
        
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

# 1. 道路 (01.Taipei_Road)
road_area = load_and_calculate_area("道路 (01.Taipei_Road)", "01.Taipei_Road/01.Taipei_Road.shp")

# 2. 標線型人行道 (02.Color_Sidewalk)
marked_sidewalk_area = load_and_calculate_area("標線型人行道 (02.Color_Sidewalk)", "02.Color_Sidewalk/02.Color_sidewalk.shp")

# 3. 實體人行道 (02.Taipei_sidewalk)
physical_sidewalk_area = load_and_calculate_area("實體人行道 (02.Taipei_sidewalk)", "02.Taipei_sidewalk.json")

# 4. 台北市總面積 (參考值)
# 這裡我們直接載入行政區界來計算，確保基準一致
dist_area = load_and_calculate_area("台北市行政區界 (參考)", "00.Taipei_Dist/00.Taipei_Dist.shp")

if road_area is not None and marked_sidewalk_area is not None and physical_sidewalk_area is not None:
    print("\n" + "=" * 60)
    print("📊 最終統計結果")
    print("=" * 60)
    
    total_infrastructure = road_area + marked_sidewalk_area + physical_sidewalk_area
    
    print(f"\n【絕對面積】")
    if dist_area:
        print(f"台北市總面積: {dist_area:.2f} km²")
    print(f"道路:         {road_area:.2f} km²")
    print(f"標線型人行道: {marked_sidewalk_area:.2f} km²")
    print(f"實體人行道:   {physical_sidewalk_area:.2f} km²")
    
    print(f"\n【相對比例 - 以道路為基準 (100%)】")
    print(f"道路:         100.00%")
    print(f"標線型人行道: {(marked_sidewalk_area / road_area * 100):.2f}%")
    print(f"實體人行道:   {(physical_sidewalk_area / road_area * 100):.2f}%")
    
    print(f"\n【相對比例 - 以總交通設施為基準】")
    print(f"道路:         {(road_area / total_infrastructure * 100):.2f}%")
    print(f"標線型人行道: {(marked_sidewalk_area / total_infrastructure * 100):.2f}%")
    print(f"實體人行道:   {(physical_sidewalk_area / total_infrastructure * 100):.2f}%")
    
    if dist_area:
        print(f"\n【佔台北市總面積比例】")
        print(f"道路:         {(road_area / dist_area * 100):.2f}%")
        print(f"標線型人行道: {(marked_sidewalk_area / dist_area * 100):.2f}%")
        print(f"實體人行道:   {(physical_sidewalk_area / dist_area * 100):.2f}%")

print("\n" + "=" * 60)
