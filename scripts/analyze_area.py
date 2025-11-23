#!/usr/bin/env python3
"""
計算台北市道路和人行道的面積比例
"""
import geopandas as gpd
import os

# 設定路徑
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, "../src/data")

print("=" * 60)
print("台北市道路與人行道面積分析")
print("=" * 60)

# 載入資料
print("\n1. 載入資料...")
roads = gpd.read_file(os.path.join(DATA_DIR, "taipei_roads.json"))
sidewalks_marked = gpd.read_file(os.path.join(DATA_DIR, "taipei_sidewalks_marked.json"))
sidewalks_physical = gpd.read_file(os.path.join(DATA_DIR, "taipei_sidewalks_physical.json"))
districts = gpd.read_file(os.path.join(DATA_DIR, "taipei_districts.json"))

print(f"   道路: {len(roads)} 個要素")
print(f"   標線型人行道: {len(sidewalks_marked)} 個要素")
print(f"   實體人行道: {len(sidewalks_physical)} 個要素")

# 轉換到適合計算面積的座標系統 (TWD97 / TM2, EPSG:3826, 單位: 公尺)
print("\n2. 轉換座標系統 (EPSG:3826)...")
roads_meter = roads.to_crs(epsg=3826)
sidewalks_marked_meter = sidewalks_marked.to_crs(epsg=3826)
sidewalks_physical_meter = sidewalks_physical.to_crs(epsg=3826)
districts_meter = districts.to_crs(epsg=3826)

# 計算總面積
print("\n3. 計算面積...")

# 如果是 LineString，需要用 buffer 來估算面積
# 假設道路寬度平均 10m，標線型人行道寬度 1.5m
roads_area = roads_meter.buffer(5).area.sum() / 1_000_000  # 轉換為平方公里
sidewalks_marked_area = sidewalks_marked_meter.buffer(0.75).area.sum() / 1_000_000
sidewalks_physical_area = sidewalks_physical_meter.area.sum() / 1_000_000  # Polygon 直接計算

# 台北市總面積
taipei_total_area = districts_meter.area.sum() / 1_000_000

print("\n" + "=" * 60)
print("面積統計結果")
print("=" * 60)
print(f"\n台北市總面積: {taipei_total_area:.2f} km²")
print(f"\n道路面積 (估算):        {roads_area:.2f} km²")
print(f"標線型人行道面積 (估算): {sidewalks_marked_area:.2f} km²")
print(f"實體人行道面積:         {sidewalks_physical_area:.2f} km²")

# 計算比例
total_infrastructure = roads_area + sidewalks_marked_area + sidewalks_physical_area
print(f"\n總計 (道路+人行道):     {total_infrastructure:.2f} km²")

print("\n" + "=" * 60)
print("佔台北市總面積比例")
print("=" * 60)
print(f"道路:         {(roads_area / taipei_total_area * 100):.2f}%")
print(f"標線型人行道: {(sidewalks_marked_area / taipei_total_area * 100):.2f}%")
print(f"實體人行道:   {(sidewalks_physical_area / taipei_total_area * 100):.2f}%")
print(f"總計:         {(total_infrastructure / taipei_total_area * 100):.2f}%")

print("\n" + "=" * 60)
print("相對比例 (以道路為基準)")
print("=" * 60)
print(f"道路:         100.00%")
print(f"標線型人行道: {(sidewalks_marked_area / roads_area * 100):.2f}%")
print(f"實體人行道:   {(sidewalks_physical_area / roads_area * 100):.2f}%")

print("\n" + "=" * 60)
print("相對比例 (以總交通設施為基準)")
print("=" * 60)
print(f"道路:         {(roads_area / total_infrastructure * 100):.2f}%")
print(f"標線型人行道: {(sidewalks_marked_area / total_infrastructure * 100):.2f}%")
print(f"實體人行道:   {(sidewalks_physical_area / total_infrastructure * 100):.2f}%")

print("\n⚠️  注意:")
print("- 道路和標線型人行道為 LineString，使用 buffer 估算面積")
print("- 道路假設平均寬度 10m")
print("- 標線型人行道假設平均寬度 1.5m")
print("- 實際面積可能因道路寬度變化而有所不同")
