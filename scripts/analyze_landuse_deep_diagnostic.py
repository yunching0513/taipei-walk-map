#!/usr/bin/env python3
"""
分析台北市道路用地面積 (深度診斷)
"""
import geopandas as gpd
import os
import sys
import pandas as pd

# 設定路徑
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
RAW_DATA_DIR = os.path.join(BASE_DIR, "../raw_data")

print("=" * 60)
print("台北市都市計畫圖 (03.Taipei_MP2) 深度診斷")
print("=" * 60)

mp_path = os.path.join(RAW_DATA_DIR, "03.Taipei_MP/03.Taipei_MP2.shp")
dist_path = os.path.join(RAW_DATA_DIR, "00.Taipei_Dist/00.Taipei_Dist.shp")

try:
    # 1. 檢查行政區界
    print("檢查行政區界...")
    gdf_dist = gpd.read_file(dist_path)
    if gdf_dist.crs is None:
        gdf_dist.set_crs(epsg=3826, inplace=True)
    else:
        gdf_dist = gdf_dist.to_crs(epsg=3826)
        
    taipei_boundary = gdf_dist.unary_union
    print(f"行政區界總面積: {taipei_boundary.area / 1_000_000:.4f} km²")
    
    # 2. 載入都市計畫圖
    print("\n載入都市計畫圖...")
    gdf_mp = gpd.read_file(mp_path, encoding='cp950')
    if gdf_mp.crs is None:
        gdf_mp.set_crs(epsg=3826, inplace=True)
    else:
        gdf_mp = gdf_mp.to_crs(epsg=3826)
        
    # 修復幾何
    gdf_mp['geometry'] = gdf_mp.geometry.buffer(0)
    
    # 3. 檢查是否有重疊 (Overlaps)
    # 簡單檢查：總面積 vs 聯合面積
    total_area_raw = gdf_mp.area.sum() / 1_000_000
    union_area_raw = gdf_mp.unary_union.area / 1_000_000
    print(f"原始資料總面積 (Sum): {total_area_raw:.4f} km²")
    print(f"原始資料聯合面積 (Union): {union_area_raw:.4f} km²")
    if total_area_raw > union_area_raw * 1.1:
        print("⚠️ 警告: 存在大量重疊區域！")
        
    # 4. 搜尋 '道路' 關鍵字 (在所有欄位)
    print("\n搜尋 '道路' 關鍵字...")
    columns_to_search = ['使用分區', '分區說明', '分區代碼', '分區簡稱']
    
    for col in columns_to_search:
        if col in gdf_mp.columns:
            print(f"\n--- 欄位: {col} ---")
            # 找出包含 '道路' 的唯一值
            matches = gdf_mp[gdf_mp[col].astype(str).str.contains('道路', na=False)][col].unique()
            print(f"找到 {len(matches)} 個相關詞彙: {matches[:10]}...")
            
            # 計算這些類別的總面積
            if len(matches) > 0:
                subset = gdf_mp[gdf_mp[col].isin(matches)]
                subset_area = subset.area.sum() / 1_000_000
                print(f"相關類別總面積: {subset_area:.4f} km²")

    # 5. 檢查空白區域 (Null Land Use)
    print("\n檢查無分區資訊的區域...")
    null_landuse = gdf_mp[gdf_mp['使用分區'].isna() | (gdf_mp['使用分區'] == '')]
    null_area = null_landuse.area.sum() / 1_000_000
    print(f"無 '使用分區' 的要素數量: {len(null_landuse)}")
    print(f"無 '使用分區' 的總面積: {null_area:.4f} km²")
    
    if len(null_landuse) > 0:
        print("前 5 筆無分區資訊的紀錄:")
        print(null_landuse[['分區代碼', '分區說明']].head())

except Exception as e:
    print(f"❌ 處理失敗: {e}")
