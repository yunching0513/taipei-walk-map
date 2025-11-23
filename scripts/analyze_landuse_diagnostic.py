#!/usr/bin/env python3
"""
分析台北市道路用地面積 (進階診斷 - 修復版)
"""
import geopandas as gpd
import os
import sys
import pandas as pd

# 設定路徑
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
RAW_DATA_DIR = os.path.join(BASE_DIR, "../raw_data")

print("=" * 60)
print("台北市都市計畫圖 (03.Taipei_MP2) 進階分析 - 修復版")
print("=" * 60)

mp_path = os.path.join(RAW_DATA_DIR, "03.Taipei_MP/03.Taipei_MP2.shp")
dist_path = os.path.join(RAW_DATA_DIR, "00.Taipei_Dist/00.Taipei_Dist.shp")

if not os.path.exists(mp_path) or not os.path.exists(dist_path):
    print(f"❌ 找不到檔案")
    sys.exit(1)

try:
    # 1. 載入都市計畫圖
    print("載入都市計畫圖...")
    gdf_mp = gpd.read_file(mp_path, encoding='cp950')
    if gdf_mp.crs is None:
        gdf_mp.set_crs(epsg=3826, inplace=True)
    else:
        gdf_mp = gdf_mp.to_crs(epsg=3826)
        
    # 修復幾何
    gdf_mp['geometry'] = gdf_mp.geometry.buffer(0)
    
    # 2. 載入行政區界 (用於裁切)
    print("載入行政區界...")
    gdf_dist = gpd.read_file(dist_path)
    if gdf_dist.crs is None:
        gdf_dist.set_crs(epsg=3826, inplace=True)
    else:
        gdf_dist = gdf_dist.to_crs(epsg=3826)
        
    # 合併行政區界為一個多邊形
    taipei_boundary = gdf_dist.unary_union
    
    # 3. 裁切 (Clip) - 只保留在台北市內的資料
    print("裁切資料 (僅保留台北市範圍)...")
    gdf_clipped = gpd.clip(gdf_mp, taipei_boundary)
    
    # 4. 計算面積
    print("計算面積...")
    gdf_clipped['area_km2'] = gdf_clipped.area / 1_000_000
    total_area = gdf_clipped['area_km2'].sum()
    
    print(f"\n台北市範圍內總覆蓋面積: {total_area:.4f} km²")
    print(f"(台北市約 271 km²)")
    
    # 5. 統計各使用分區面積
    print(f"\n【各使用分區面積統計 (Top 30)】")
    if '使用分區' in gdf_clipped.columns:
        stats = gdf_clipped.groupby('使用分區')['area_km2'].sum().sort_values(ascending=False)
        
        print(f"{'使用分區':<20} {'面積 (km²)':<15} {'比例':<10}")
        print("-" * 50)
        
        for idx, value in stats.head(30).items():
            ratio = (value / total_area) * 100
            print(f"{idx:<20} {value:.4f}          {ratio:.2f}%")
            
        # 特別檢查道路相關
        print(f"\n【道路相關用地統計】")
        road_keywords = ['道路', '交通', '人行', '廣場']
        for keyword in road_keywords:
            related = stats[stats.index.astype(str).str.contains(keyword, na=False)]
            if not related.empty:
                print(f"\n--- 包含 '{keyword}' 的類別 ---")
                for idx, value in related.items():
                    print(f"{idx:<20} {value:.4f} km²")
                    
    else:
        print("❌ 找不到 '使用分區' 欄位")

except Exception as e:
    print(f"❌ 處理失敗: {e}")
