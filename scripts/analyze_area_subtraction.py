#!/usr/bin/env python3
"""
分析台北市道路用地面積 (扣除法)
假設：都市計畫圖中未標示分區的空白區域即為道路用地
"""
import geopandas as gpd
import os
import sys

# 設定路徑
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
RAW_DATA_DIR = os.path.join(BASE_DIR, "../raw_data")

print("=" * 60)
print("台北市道路用地分析 (扣除法)")
print("=" * 60)

mp_path = os.path.join(RAW_DATA_DIR, "03.Taipei_MP/03.Taipei_MP2.shp")
dist_path = os.path.join(RAW_DATA_DIR, "00.Taipei_Dist/00.Taipei_Dist.shp")
sidewalk_marked_path = os.path.join(RAW_DATA_DIR, "02.Color_Sidewalk/02.Color_sidewalk.shp")
sidewalk_physical_path = os.path.join(RAW_DATA_DIR, "02.Taipei_sidewalk.json")

try:
    # 1. 載入行政區界 (總面積)
    print("1. 計算台北市總面積...")
    gdf_dist = gpd.read_file(dist_path)
    if gdf_dist.crs is None:
        gdf_dist.set_crs(epsg=3826, inplace=True)
    else:
        gdf_dist = gdf_dist.to_crs(epsg=3826)
        
    taipei_boundary = gdf_dist.unary_union
    taipei_area = taipei_boundary.area / 1_000_000
    print(f"   台北市總面積: {taipei_area:.4f} km²")
    
    # 2. 載入都市計畫圖 (非道路用地)
    print("\n2. 計算已分區面積 (住宅、商業、公園等)...")
    gdf_mp = gpd.read_file(mp_path, encoding='cp950')
    if gdf_mp.crs is None:
        gdf_mp.set_crs(epsg=3826, inplace=True)
    else:
        gdf_mp = gdf_mp.to_crs(epsg=3826)
        
    # 修復幾何
    gdf_mp['geometry'] = gdf_mp.geometry.buffer(0)
    
    # 過濾掉 "範圍" 類的大型多邊形 (使用分區為空，或分區代碼包含 '範圍')
    # 同時過濾掉明確標示為 '道路' 的 (雖然很少) 以免重複扣除? 
    # 不，如果我們是用扣除法，我們要扣除的是 "非道路" 的部分。
    # 所以我們要保留所有 "非道路" 的分區。
    
    # 找出有效的 "非道路" 分區
    # 排除:
    # 1. 使用分區為空 (通常是範圍界線)
    # 2. 分區代碼包含 '範圍'
    # 3. 明確的道路用地 (如果有，應該算在道路面積裡，所以不扣除)
    
    valid_zones = gdf_mp[
        (gdf_mp['使用分區'].notna()) & 
        (gdf_mp['使用分區'] != '') &
        (~gdf_mp['分區代碼'].astype(str).str.contains('範圍', na=False)) &
        (~gdf_mp['使用分區'].astype(str).str.contains('道路', na=False))
    ]
    
    print(f"   有效分區數量: {len(valid_zones)}")
    
    # 裁切到台北市範圍內 (避免超出邊界)
    print("   裁切至台北市範圍...")
    valid_zones_clipped = gpd.clip(valid_zones, taipei_boundary)
    
    # 計算聯合面積 (Union) 以處理重疊
    print("   計算聯合面積 (可能需要一點時間)...")
    zoned_area_union = valid_zones_clipped.unary_union
    zoned_area = zoned_area_union.area / 1_000_000
    print(f"   非道路分區總面積: {zoned_area:.4f} km²")
    
    # 3. 計算道路面積 (剩餘面積)
    print("\n3. 計算道路面積 (總面積 - 非道路分區面積)...")
    road_area_estimated = taipei_area - zoned_area
    print(f"   推估道路面積: {road_area_estimated:.4f} km²")
    print(f"   道路佔比: {(road_area_estimated / taipei_area * 100):.2f}%")
    
    # 4. 載入人行道面積 (用於比較)
    print("\n4. 載入人行道資料...")
    
    # 標線型
    gdf_marked = gpd.read_file(sidewalk_marked_path)
    if gdf_marked.crs is None: gdf_marked.set_crs(epsg=3826, inplace=True)
    else: gdf_marked = gdf_marked.to_crs(epsg=3826)
    marked_area = gdf_marked.area.sum() / 1_000_000
    
    # 實體
    gdf_physical = gpd.read_file(sidewalk_physical_path)
    if gdf_physical.crs is None: gdf_physical.set_crs(epsg=3826, inplace=True)
    else: gdf_physical = gdf_physical.to_crs(epsg=3826)
    physical_area = gdf_physical.area.sum() / 1_000_000
    
    print(f"   標線型人行道: {marked_area:.4f} km²")
    print(f"   實體人行道:   {physical_area:.4f} km²")
    
    # 5. 最終統計
    print("\n" + "=" * 60)
    print("📊 最終統計結果 (扣除法)")
    print("=" * 60)
    
    print(f"台北市總面積: {taipei_area:.2f} km²")
    print(f"推估道路面積: {road_area_estimated:.2f} km² (包含道路、人行道、溝渠等未分區空間)")
    print(f"標線型人行道: {marked_area:.2f} km²")
    print(f"實體人行道:   {physical_area:.2f} km²")
    
    print(f"\n【相對比例 - 以推估道路面積為基準 (100%)】")
    print(f"道路:         100.00%")
    print(f"標線型人行道: {(marked_area / road_area_estimated * 100):.2f}%")
    print(f"實體人行道:   {(physical_area / road_area_estimated * 100):.2f}%")
    
    print(f"\n【佔台北市總面積比例】")
    print(f"道路:         {(road_area_estimated / taipei_area * 100):.2f}%")
    print(f"標線型人行道: {(marked_area / taipei_area * 100):.2f}%")
    print(f"實體人行道:   {(physical_area / taipei_area * 100):.2f}%")

except Exception as e:
    print(f"❌ 處理失敗: {e}")
