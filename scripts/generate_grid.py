import h3
import geopandas as gpd
import pandas as pd
from shapely.geometry import Polygon, mapping
import os
import warnings

# 忽略警告
warnings.filterwarnings('ignore')

# --- 1. 設定檔案路徑 ---
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
RAW_DATA_DIR = os.path.join(BASE_DIR, "../raw_data")
OUTPUT_DIR = os.path.join(BASE_DIR, "../src/data") 

# 檔案路徑設定
DATA_FILES = {
    "boundary": "00.Taipei_Dist/00.Taipei_Dist.shp",
    "villages": "00.Taipei_Nei/00.Taipei_Nei.shp",
    "mrt_net": "01.Taipei_MRT_NET.json",
    "mrt_stations": "02.Taipei_MRT_Station/02.Taipei_MRT_Station.shp",
    "bus_stops": "02.Taipei_Busstop/02.Taipei_Busstop.shp",
    "roads": "01.Taipei_Road/01.Taipei_Road.shp",
    "sidewalks_marked": "02.Color_Sidewalk/02.Color_sidewalk.shp",
    "sidewalks_physical": "02.Taipei_sidewalk.json",
    "trees": "02.Taipei_Tree.json"
}

# --- 2. 參數設定 ---
H3_RESOLUTION = 9 

print(f"--- 開始執行 (Local Data Processing) ---")
os.makedirs(OUTPUT_DIR, exist_ok=True)

def load_data(key):
    """
    載入資料並統一轉換為 EPSG:4326
    """
    if key not in DATA_FILES:
        return None
    
    path = os.path.join(RAW_DATA_DIR, DATA_FILES[key])
    if not os.path.exists(path):
        print(f"⚠️ 找不到檔案: {path}")
        return None

    print(f"   讀取: {DATA_FILES[key]}...")
    try:
        if path.endswith('.json') or path.endswith('.geojson'):
            gdf = gpd.read_file(path)
        else:
            # Shapefile
            gdf = gpd.read_file(path, encoding='utf-8')
        
        # 檢查並設定 CRS
        if gdf.crs is None:
            # 檢查座標範圍來判斷是 WGS84 還是 TWD97
            first_geom = gdf.geometry.iloc[0]
            if hasattr(first_geom, 'x'):
                sample_x, sample_y = first_geom.x, first_geom.y
            else:
                centroid = first_geom.centroid
                sample_x, sample_y = centroid.x, centroid.y
            
            if 120 <= sample_x <= 122 and 22 <= sample_y <= 26:
                print("      ⚠️ 無 CRS 資訊，座標範圍符合 WGS84，設定為 EPSG:4326")
                gdf.set_crs(epsg=4326, inplace=True)
            else:
                print("      ⚠️ 無 CRS 資訊，假設為 EPSG:3826 (TWD97)")
                gdf.set_crs(epsg=3826, inplace=True)
        
        # 統一轉為 WGS84
        gdf = gdf.to_crs(epsg=4326)
        return gdf
    except Exception as e:
        print(f"❌ 讀取錯誤 {key}: {e}")
        return None

def main():
    # --------------------------
    # 1. 處理行政區界 & 生成網格
    # --------------------------
    print(f"1. [Boundary] 處理行政區界 & 生成網格...")
    gdf_dist = load_data("boundary")

    if gdf_dist is not None:
        # 儲存行政區界 (給地圖用)
        out_dist_path = os.path.join(OUTPUT_DIR, 'taipei_districts.json')
        gdf_dist.to_file(out_dist_path, driver="GeoJSON")
        print(f"   -> 行政區界已存: {out_dist_path}")

        # 合併成一個大區塊來生成網格
        city_polygon = gdf_dist.unary_union
        
        # 生成 H3
        if city_polygon.geom_type == 'Polygon':
            polys = [city_polygon]
        else:
            polys = list(city_polygon.geoms)

        hex_cells = set()
        for poly in polys:
            geojson = mapping(poly)
            hex_cells.update(h3.polyfill(geojson, H3_RESOLUTION, geo_json_conformant=True))

        print(f"   -> 生成了 {len(hex_cells)} 個六邊形網格")
    else:
        print("❌ 無法生成網格，因為找不到邊界資料")
        exit()

    # Process Villages (Nei)
    print(f"   處理里界資料...")
    gdf_villages = load_data("villages")
    if gdf_villages is not None:
        out_villages = os.path.join(OUTPUT_DIR, 'taipei_villages.json')
        gdf_villages.to_file(out_villages, driver="GeoJSON")
        print(f"   -> 里界 (Villages) 已存: {out_villages}")

    # --------------------------
    # 2. 處理交通數據 (MRT & Bus)
    # --------------------------
    print(f"2. [Transport] 處理捷運與公車數據...")

    # MRT Stations
    # 優先使用已生成的檔案，否則從 MRT 網絡提取
    mrt_stations_output = os.path.join(OUTPUT_DIR, 'taipei_mrt_stations.json')
    if os.path.exists(mrt_stations_output):
        print(f"   使用現有的 MRT 站點檔案: {mrt_stations_output}")
        gdf_mrt_stations = gpd.read_file(mrt_stations_output)
    else:
        # 嘗試從原始檔案載入
        gdf_mrt_stations = load_data("mrt_stations") if "mrt_stations" in DATA_FILES else None

    mrt_unary = None
    if gdf_mrt_stations is not None:
        # For distance calculation 
        mrt_meter = gdf_mrt_stations.to_crs(epsg=3857)
        mrt_unary = mrt_meter.unary_union
    else:
        print("   ⚠️ 找不到 MRT 站點資料，距離計算將使用預設值")

    # Bus Stops
    gdf_bus = load_data("bus_stops")
    bus_unary = None
    if gdf_bus is not None:
        # load_data 已經轉成 WGS84 (EPSG:4326)
        # 用於距離計算 (meter單位)
        bus_meter = gdf_bus.to_crs(epsg=3857)
        bus_unary = bus_meter.unary_union

    # Trees
    print(f"   處理行道樹數據...")
    
    # 1. 一般行道樹
    gdf_tree_normal = None
    tree_path = os.path.join(RAW_DATA_DIR, "04.Taipei_Tree.json")
    if os.path.exists(tree_path):
        try:
            df_tree = pd.read_json(tree_path)
            gdf_tree_normal = gpd.GeoDataFrame(
                df_tree, 
                geometry=gpd.points_from_xy(df_tree['TWD97X'], df_tree['TWD97Y']),
                crs="EPSG:3826"
            ).to_crs(epsg=4326)
            
            if 'Diameter' in gdf_tree_normal.columns:
                gdf_tree_normal = gdf_tree_normal.rename(columns={'Diameter': '樹徑'})
            
            # 統一欄位
            # Normal trees: TreeType -> name, Region -> address
            gdf_tree_normal['name'] = gdf_tree_normal['TreeType']
            gdf_tree_normal['address'] = gdf_tree_normal['Region']
            gdf_tree_normal['health'] = 'N/A' # Normal trees don't have health info
            
            gdf_tree_normal = gdf_tree_normal[['name', 'address', '樹徑', 'health', 'geometry']]
            gdf_tree_normal['type'] = 'normal'
        except Exception as e:
            print(f"   ❌ 處理一般行道樹失敗: {e}")

    # 2. 受保護樹木
    gdf_tree_protected = None
    protected_tree_path = os.path.join(RAW_DATA_DIR, "04.Taipei_ProtectedTree.csv")
    if os.path.exists(protected_tree_path):
        try:
            df_protected = pd.read_csv(protected_tree_path)
            # 經度, 緯度 (WGS84)
            gdf_tree_protected = gpd.GeoDataFrame(
                df_protected,
                geometry=gpd.points_from_xy(df_protected['經度'], df_protected['緯度']),
                crs="EPSG:4326"
            )
            
            if '樹胸徑' in gdf_tree_protected.columns:
                gdf_tree_protected = gdf_tree_protected.rename(columns={'樹胸徑': '樹徑'})
                # Protected tree diameter is in meters, convert to cm to match normal trees
                gdf_tree_protected['樹徑'] = gdf_tree_protected['樹徑'] * 100
            
            # 統一欄位
            # Protected trees: 樹種名稱 -> name, 地址 -> address, 健康度 -> health
            gdf_tree_protected['name'] = gdf_tree_protected['樹種名稱']
            gdf_tree_protected['address'] = gdf_tree_protected['地址']
            gdf_tree_protected['health'] = gdf_tree_protected['健康度']

            # 確保有樹徑欄位，若無則給預設值
            if '樹徑' not in gdf_tree_protected.columns:
                gdf_tree_protected['樹徑'] = 0.5 # 預設受保護樹木較大
            
            gdf_tree_protected = gdf_tree_protected[['name', 'address', '樹徑', 'health', 'geometry']]
            gdf_tree_protected['type'] = 'protected'
            print(f"   -> 讀取受保護樹木: {len(gdf_tree_protected)} 棵")
        except Exception as e:
            print(f"   ❌ 處理受保護樹木失敗: {e}")

    # 3. 合併樹木資料
    if gdf_tree_normal is not None or gdf_tree_protected is not None:
        trees_list = []
        if gdf_tree_normal is not None:
            trees_list.append(gdf_tree_normal)
        if gdf_tree_protected is not None:
            trees_list.append(gdf_tree_protected)
        
        gdf_tree = pd.concat(trees_list, ignore_index=True)
        
        # 處理樹徑資料 (確保是數值)
        gdf_tree['樹徑'] = pd.to_numeric(gdf_tree['樹徑'], errors='coerce').fillna(0.1)
        
        # 處理空值
        gdf_tree['name'] = gdf_tree['name'].fillna('Unknown')
        gdf_tree['address'] = gdf_tree['address'].fillna('')
        
        gdf_tree.to_file(os.path.join(OUTPUT_DIR, 'taipei_trees.json'), driver="GeoJSON")
        print(f"   -> 行道樹整合存檔完成: taipei_trees.json (共 {len(gdf_tree)} 棵)")
    else:
        print(f"   ❌ 找不到任何行道樹資料")
        gdf_tree = None

    # MRT Network (Lines)
    gdf_mrt_net = load_data("mrt_net")
    if gdf_mrt_net is not None:
        gdf_mrt_net.to_file(os.path.join(OUTPUT_DIR, 'taipei_mrt_lines.json'), driver="GeoJSON")

    # Bus Stops (export for visualization)
    if gdf_bus is not None:
        gdf_bus.to_file(os.path.join(OUTPUT_DIR, 'taipei_bus_stops.json'), driver="GeoJSON")
        print(f"   -> 公車站存檔完成: taipei_bus_stops.json")


    # --------------------------
    # 3. 準備視覺資料 (為了計算分數，需提前讀取)
    # --------------------------
    print(f"3. [Visual Data] 讀取人行道與行道樹資料 (用於評分)...")

    # Marked Sidewalks (標線型人行道)
    gdf_sidewalk_marked = load_data("sidewalks_marked")
    if gdf_sidewalk_marked is not None:
        out_marked = os.path.join(OUTPUT_DIR, 'taipei_sidewalks_marked.json')
        gdf_sidewalk_marked.to_file(out_marked, driver="GeoJSON")
        print(f"   -> 標線型人行道存檔完成: {out_marked}")

    # Physical Sidewalks (實體人行道)
    gdf_sidewalk_physical = load_data("sidewalks_physical")
    if gdf_sidewalk_physical is not None:
        out_physical = os.path.join(OUTPUT_DIR, 'taipei_sidewalks_physical.json')
        gdf_sidewalk_physical.to_file(out_physical, driver="GeoJSON")
        print(f"   -> 實體人行道存檔完成: {out_physical}")

    # Roads (只取大路以減少檔案大小)
    gdf_roads = load_data("roads")
    if gdf_roads is not None:
        out_road_path = os.path.join(OUTPUT_DIR, 'taipei_roads.json')
        gdf_roads.to_file(out_road_path, driver="GeoJSON")
        print(f"   -> 道路存檔完成: {out_road_path}")

    # --------------------------
    # 4. 計算分數 (Multi-Scheme)
    # --------------------------
    print(f"4. [Analysis] 計算多維度可及性分數...")

    # 準備六邊形
    hex_list = list(hex_cells)
    polys_geom = [Polygon(h3.h3_to_geo_boundary(h, geo_json=True)) for h in hex_list]
    gdf_hex = gpd.GeoDataFrame({'hex_id': hex_list, 'geometry': polys_geom}, crs="EPSG:4326")
    gdf_hex_meter = gdf_hex.to_crs(epsg=3857)

    # 4.1 計算基礎指標
    # (A) 交通距離
    if mrt_unary is not None:
        gdf_hex['dist_mrt'] = gdf_hex_meter.centroid.apply(lambda x: x.distance(mrt_unary)).astype(int)
    else:
        gdf_hex['dist_mrt'] = 9999

    if bus_unary is not None:
        gdf_hex['dist_bus'] = gdf_hex_meter.centroid.apply(lambda x: x.distance(bus_unary)).astype(int)
    else:
        gdf_hex['dist_bus'] = 9999

    # (B) 行道樹數量 (Point in Polygon)
    # gdf_tree 已經在前面讀取並轉為 WGS84
    if 'gdf_tree' in locals() and gdf_tree is not None:
        # 使用 sjoin 計算每個 hex 內的樹木數量
        # 注意: sjoin 需要相同的 CRS
        trees_in_hex = gpd.sjoin(gdf_tree, gdf_hex, how='inner', predicate='within')
        tree_counts = trees_in_hex.groupby('hex_id').size()
        gdf_hex['tree_count'] = gdf_hex['hex_id'].map(tree_counts).fillna(0)
        
        # 計算樹徑總和 (作為綠蔭指標)
        tree_diameter_sum = trees_in_hex.groupby('hex_id')['樹徑'].sum()
        gdf_hex['tree_diameter_sum'] = gdf_hex['hex_id'].map(tree_diameter_sum).fillna(0)
    else:
        gdf_hex['tree_count'] = 0
        gdf_hex['tree_diameter_sum'] = 0

    # (C) 人行道覆蓋 (Area Intersection Ratio)
    # 計算公式: (實體人行道面積 * 1.0 + 標線人行道面積 * 0.6) / 道路面積
    print(f"   計算人行道/道路面積比例 (這可能需要一點時間)...")

    gdf_hex['sidewalk_score'] = 0.0

    # 確保 CRS 一致 (EPSG:3857 用於計算面積)
    gdf_hex_3857 = gdf_hex.to_crs(epsg=3857)

    # 1. 計算每個 Hex 內的道路面積
    if gdf_roads is not None:
        gdf_roads_3857 = gdf_roads.to_crs(epsg=3857)
        # 使用 overlay 切割道路
        roads_overlay = gpd.overlay(gdf_hex_3857, gdf_roads_3857, how='intersection')
        roads_overlay['area'] = roads_overlay.geometry.area
        road_area_sum = roads_overlay.groupby('hex_id')['area'].sum()
        gdf_hex['road_area'] = gdf_hex['hex_id'].map(road_area_sum).fillna(0)
    else:
        gdf_hex['road_area'] = 0

    # 2. 計算每個 Hex 內的實體人行道面積
    if gdf_sidewalk_physical is not None:
        gdf_phys_3857 = gdf_sidewalk_physical.to_crs(epsg=3857)
        phys_overlay = gpd.overlay(gdf_hex_3857, gdf_phys_3857, how='intersection')
        phys_overlay['area'] = phys_overlay.geometry.area
        phys_area_sum = phys_overlay.groupby('hex_id')['area'].sum()
        gdf_hex['phys_area'] = gdf_hex['hex_id'].map(phys_area_sum).fillna(0)
    else:
        gdf_hex['phys_area'] = 0

    # 3. 計算每個 Hex 內的標線人行道面積
    if gdf_sidewalk_marked is not None:
        gdf_mark_3857 = gdf_sidewalk_marked.to_crs(epsg=3857)
        mark_overlay = gpd.overlay(gdf_hex_3857, gdf_mark_3857, how='intersection')
        mark_overlay['area'] = mark_overlay.geometry.area
        mark_area_sum = mark_overlay.groupby('hex_id')['area'].sum()
        gdf_hex['mark_area'] = gdf_hex['hex_id'].map(mark_area_sum).fillna(0)
    else:
        gdf_hex['mark_area'] = 0

    # 4. 計算品質分數
    def calc_sidewalk_quality(row):
        if row['road_area'] <= 10: # 忽略道路面積過小的區域
            return 0
        
        # 公式: (實體 * 1.0 + 標線 * 0.6) / 道路面積
        weighted_area = (row['phys_area'] * 1.0) + (row['mark_area'] * 0.6)
        ratio = weighted_area / row['road_area']
        
        # 轉換為 0-10 分
        # [調整] 更嚴格的標準：需要 60% (0.6) 的道路面積有人行道才能拿滿分 (原為 0.3)
        # 這樣會讓分數普遍降低一半左右
        score = min(10, (ratio / 0.6) * 10)
        return score

    gdf_hex['sidewalk_score'] = gdf_hex.apply(calc_sidewalk_quality, axis=1)


    # 4.2 定義評分函數
    def calc_scores(row):
        # 1. 交通分數 (Transport)
        # [調整] 更嚴格的距離標準
        # MRT: 1000m 內遞減至 0 (原 2000m) -> 走路 15 分鐘以上就沒分
        # Bus: 500m 內遞減至 0 (原 1000m) -> 走路 7-8 分鐘以上就沒分
        s_mrt = max(0, 10 - (row['dist_mrt'] / 100))
        s_bus = max(0, 10 - (row['dist_bus'] / 50))
        s_transport = (s_mrt * 0.6 + s_bus * 0.4)

        # 2. 人行道分數 (Sidewalk Quality)
        s_sidewalk = row['sidewalk_score']
            
        # 3. 綠蔭分數 (Trees)
        # [調整] 更嚴格的綠蔭標準：需要 40 棵樹才能拿滿分 (原 20 棵)
        s_tree = min(10, row['tree_count'] / 4) 

        # --- 方案 A: Commuter (效率通勤) ---
        # 70% 交通, 30% 人行道 (有就好，這裡還是用簡單的有/無判斷比較符合通勤者心態? 
        # 不，既然有了品質分數，就用品質分數，但權重低)
        # 為了保持 Commuter 的特性 (只要有路走就好)，我們稍微調整一下
        # 如果 sidewalk_score > 1 就給滿分? 或者是直接用 sidewalk_score
        # 讓我們維持原意：Commuter 比較在乎有沒有路，而不是路好不好
        # 但既然 User 強調要凸顯品質，我們就統一用 s_sidewalk
        score_commuter = (s_transport * 0.7) + (s_sidewalk * 0.3)

        # --- 方案 B: Stroller (舒適漫步) ---
        # 50% 人行道品質, 30% 樹, 20% 交通
        score_stroller = (s_sidewalk * 0.5) + (s_tree * 0.3) + (s_transport * 0.2)

        # --- 方案 C: Urbanist (城市規劃) ---
        # 40% 交通, 40% 人行道品質, 20% 樹
        score_urbanist = (s_transport * 0.4) + (s_sidewalk * 0.4) + (s_tree * 0.2)

        # --- 方案 D: Pedestrian (純粹步行) ---
        # 100% 人行道品質
        score_pedestrian = s_sidewalk

        return pd.Series({
            'score_commuter': round(score_commuter, 1),
            'score_stroller': round(score_stroller, 1),
            'score_urbanist': round(score_urbanist, 1),
            'score_pedestrian': round(score_pedestrian, 1),
            'score': round(score_urbanist, 1) 
        })

    # 應用評分
    scores = gdf_hex.apply(calc_scores, axis=1)
    gdf_hex = pd.concat([gdf_hex, scores], axis=1)

    # 5. 計算人行道密度 (Sidewalk Density)
    # 實體人行道面積 / Hex 總面積
    gdf_hex['hex_area'] = gdf_hex_meter.geometry.area
    gdf_hex['sidewalk_density'] = (gdf_hex['phys_area'] / gdf_hex['hex_area']) * 100 # 轉為百分比
    gdf_hex['sidewalk_density'] = gdf_hex['sidewalk_density'].fillna(0).round(1)

    # 輸出 Grid
    out_grid_path = os.path.join(OUTPUT_DIR, 'taipei_grid.json')
    # 保留所有分數欄位
    cols = ['hex_id', 'dist_mrt', 'dist_bus', 'tree_count', 'sidewalk_density', 'score', 'score_commuter', 'score_stroller', 'score_urbanist', 'score_pedestrian', 'geometry']
    gdf_hex[cols].to_file(out_grid_path, driver="GeoJSON")
    print(f"   -> Grid 存檔完成: {out_grid_path}")

    print("🎉 全部資料處理完成！")

if __name__ == "__main__":
    main()