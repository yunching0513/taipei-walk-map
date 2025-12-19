import { useState, useMemo, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import './mobile.css';
import Map from './components/Map';
import FileUpload from './components/FileUpload';

// 引入所有圖層資料
import gridData from './data/taipei_grid.json';
import districtData from './data/taipei_districts.json';
import villagesData from './data/taipei_villages.json'; // Import villages
import mrtLinesData from './data/taipei_mrt_lines.json';
import mrtStationsData from './data/taipei_mrt_stations.json';
import roadsData from './data/taipei_roads.json';
import sidewalksMarkedData from './data/taipei_sidewalks_marked.json';
import sidewalksPhysicalData from './data/taipei_sidewalks_physical.json';
import busStopsData from './data/taipei_bus_stops.json';
import treesData from './data/taipei_trees.json';
import mainPlanData from './data/taipei_main_plan.json'; // Import Main Plan
import zoningColors from './data/zoning_colors.json'; // Import zoning colors
import zoneCounts from './data/zone_counts.json'; // Import zone counts
import zoneCategories from './data/zone_categories.json'; // Import zone categories
// Blue and Green 生態水與綠
import parksData from './data/taipei_parks.json';
import agricultureData from './data/taipei_agriculture.json';
import birdProtectionData from './data/taipei_bird_protection.json';
import natureProtectionData from './data/taipei_nature_protection.json';
import socialHousingRawData from './data/taipei_social_housing.json'; // Import local social housing data

function App() {
  const [selectedFeature, setSelectedFeature] = useState(null);
  const [selectedMainPlanZones, setSelectedMainPlanZones] = useState([]); // State for selected zones
  const [expandedCategories, setExpandedCategories] = useState({}); // State for expanded categories

  const [socialHousingData, setSocialHousingData] = useState(null); // State for social housing data (GeoJSON points)
  const [socialHousingStatus, setSocialHousingStatus] = useState('all'); // State for social housing choropleth filter

  // 圖層開關狀態
  const [visibleLayers, setVisibleLayers] = useState({
    grid: false,
    districts: true,
    villages: false,
    mainPlan: false, // Add Main Plan
    mrtLines: false,
    mrtStations: false,
    busStops: false,
    trees: false,
    ecoProtection: false, // Group: Parks, Agriculture, Bird, Nature
    roads: false,
    sidewalksMarked: false,
    sidewalksPhysical: false,
    socialHousing: false, // Add Social Housing (Points)
    socialHousingChoropleth: false // Add Social Housing (Choropleth)
  });

  // 圖層樣式 (顏色和透明度)
  const [layerStyles, setLayerStyles] = useState({
    grid: { opacity: 0.8 },
    districts: { color: '#ffffff', opacity: 0.5 },
    villages: { color: '#cccccc', opacity: 0.4 },
    mainPlan: { opacity: 0.6 }, // Add Main Plan style
    mrtLines: { opacity: 1 },
    mrtStations: { color: '#e74c3c', opacity: 1.0 },
    busStops: { color: '#f39c12', opacity: 0.8 },
    trees: { color: '#27ae60', opacity: 0.8 },
    ecoProtection: { color: '#4caf50', opacity: 0.6 }, // Group style
    roads: { color: '#ffffff', opacity: 1.0 },
    sidewalksMarked: { color: '#2ecc71', opacity: 1.0 },
    sidewalksPhysical: { color: '#3498db', opacity: 0.5 },
    socialHousing: { color: '#f7e18bff', opacity: 0.8 }, // Add Social Housing style
    socialHousingChoropleth: { opacity: 0.6 } // Add Social Housing Choropleth style
  });

  // 圖層順序 (由上到下，對應地圖上的 z-index 由大到小)
  // Layer Groups State
  const [transportLayers, setTransportLayers] = useState(['mrtStations', 'busStops', 'mrtLines']);
  const [blueGreenLayers, setBlueGreenLayers] = useState(['trees', 'ecoProtection']);
  const [socialHousingLayers, setSocialHousingLayers] = useState(['socialHousing', 'socialHousingChoropleth']); // New Group
  const [infrastructureLayers, setInfrastructureLayers] = useState(['sidewalksMarked', 'sidewalksPhysical', 'roads']);

  const [adminLayers, setAdminLayers] = useState(['villages', 'districts', 'mainPlan']); // Removed socialHousing layers from here

  // Combined layer order for Map (Transport > Blue&Green > Social Housing > Infra > Admin)
  const layerOrder = [...transportLayers, ...blueGreenLayers, ...socialHousingLayers, ...infrastructureLayers, ...adminLayers];

  // 圖層配置 (用於渲染列表)
  const layerConfig = {
    mrtStations: { label: '捷運站 (MRT Stations)', type: 'point' },
    mrtLines: { label: '捷運路網 (MRT Lines)', type: 'line', noColor: true },
    busStops: { label: '公車站 (Bus Stops)', type: 'point' },
    trees: { label: '行道樹 (Trees)', type: 'point' },
    ecoProtection: { label: '生態保護區 (Eco Protection)', type: 'polygon' },
    roads: { label: '道路 (Roads)', type: 'polygon' },
    sidewalksMarked: { label: '標線型人行道 (Marked Sidewalks)', type: 'polygon' },
    sidewalksPhysical: { label: '實體人行道 (Physical Sidewalks)', type: 'polygon' },
    grid: { label: '步行分數網格 (Walkability Grid)', type: 'polygon', noColor: true },
    villages: { label: '里界 (Villages)', type: 'polygon', hasLabelToggle: true },
    districts: { label: '行政區界 (Districts)', type: 'polygon', hasLabelToggle: true },
    districts: { label: '行政區界 (Districts)', type: 'polygon', hasLabelToggle: true },
    mainPlan: { label: '主要計畫 (Main Plan)', type: 'polygon', noColor: true }, // Add Main Plan config
    socialHousing: { label: '社會住宅-點位 (Social Housing Points)', type: 'point' }, // Add Social Housing config
    socialHousingChoropleth: { label: '社會住宅-面量圖 (Social Housing Choropleth)', type: 'polygon', noColor: true } // Add Social Housing Choropleth config
  };

  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isSelectionOpen, setIsSelectionOpen] = useState(true); // Selection panel state (default: open)

  // Label visibility state
  const [showDistrictLabels, setShowDistrictLabels] = useState(true);
  const [showVillageLabels, setShowVillageLabels] = useState(true);

  const toggleLayer = (layer) => {
    setVisibleLayers(prev => ({ ...prev, [layer]: !prev[layer] }));
  };

  const updateLayerStyle = (layer, property, value) => {
    setLayerStyles(prev => ({
      ...prev,
      [layer]: { ...prev[layer], [property]: value }
    }));
  };

  const onDragEnd = (result) => {
    if (!result.destination) return;

    const { source, destination } = result;
    const listId = source.droppableId;

    if (listId === 'transport') {
      const items = Array.from(transportLayers);
      const [reorderedItem] = items.splice(source.index, 1);
      items.splice(destination.index, 0, reorderedItem);
      setTransportLayers(items);
    } else if (listId === 'blueGreen') {
      const items = Array.from(blueGreenLayers);
      const [reorderedItem] = items.splice(source.index, 1);
      items.splice(destination.index, 0, reorderedItem);
      setBlueGreenLayers(items);
    } else if (listId === 'socialHousing') { // New Group Handler
      const items = Array.from(socialHousingLayers);
      const [reorderedItem] = items.splice(source.index, 1);
      items.splice(destination.index, 0, reorderedItem);
      setSocialHousingLayers(items);
    } else if (listId === 'infrastructure') {
      const items = Array.from(infrastructureLayers);
      const [reorderedItem] = items.splice(source.index, 1);
      items.splice(destination.index, 0, reorderedItem);
      setInfrastructureLayers(items);
    } else if (listId === 'admin') {
      const items = Array.from(adminLayers);
      const [reorderedItem] = items.splice(source.index, 1);
      items.splice(destination.index, 0, reorderedItem);
      setAdminLayers(items);
    }
  };

  // 上傳的圖層
  const [uploadedLayers, setUploadedLayers] = useState([]);

  const handleLayerAdd = (layer) => {
    setUploadedLayers(prev => [...prev, layer]);
  };

  const handleLayerRemove = (layerId) => {
    setUploadedLayers(prev => prev.filter(l => l.id !== layerId));
  };

  const handleLayerToggle = (layerId) => {
    setUploadedLayers(prev => prev.map(l =>
      l.id === layerId ? { ...l, visible: !l.visible } : l
    ));
  };

  const handleLayerStyleUpdate = (layerId, property, value) => {
    setUploadedLayers(prev => prev.map(l =>
      l.id === layerId ? { ...l, [property]: value } : l
    ));
  };

  // 搜尋功能
  const [searchQuery, setSearchQuery] = useState('');
  const [searchLocation, setSearchLocation] = useState(null);
  const [isLocating, setIsLocating] = useState(false);
  const [isSearching, setIsSearching] = useState(false);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    try {
      // 使用 Nominatim API 進行地理編碼
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?` +
        `q=${encodeURIComponent(searchQuery)}&` +
        `format=json&` +
        `limit=1&` +
        `countrycodes=tw&` +
        `addressdetails=1`
      );
      const data = await response.json();

      if (data && data.length > 0) {
        const result = data[0];
        setSearchLocation({
          lon: parseFloat(result.lon),
          lat: parseFloat(result.lat),
          name: result.display_name
        });
      } else {
        alert('找不到該位置，請嘗試其他關鍵字');
      }
    } catch (error) {
      console.error('搜尋錯誤:', error);
      alert('搜尋時發生錯誤');
    } finally {
      setIsSearching(false);
    }
  };

  // 評分模式
  const [scoringMode, setScoringMode] = useState('commuter'); // default: commuter

  const scoringModes = [
    {
      id: 'commuter',
      label: '效率通勤 (Commuter)',
      desc: '重視捷運/公車距離',
      details: '70% 交通, 30% 基礎人行道'
    },
    {
      id: 'stroller',
      label: '舒適漫步 (Stroller)',
      desc: '重視實體人行道與綠蔭',
      details: '50% 實體人行道, 30% 樹蔭, 20% 交通'
    },
    {
      id: 'pedestrian',
      label: '純粹步行 (Pedestrian)',
      desc: '僅考量人行道覆蓋率與品質',
      details: '100% 人行道品質 (實體 + 標線)'
    }
  ];

  // 底圖選擇
  const [selectedBasemap, setSelectedBasemap] = useState('dark'); // default: dark

  const basemaps = {
    dark: {
      id: 'dark',
      label: '暗色地圖 (Dark)',
      url: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json'
    },
    light: {
      id: 'light',
      label: '明亮地圖 (Light)',
      url: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json'
    },
    terrain: {
      id: 'terrain',
      label: '地形地圖 (Terrain)',
      url: 'https://api.maptiler.com/maps/outdoor-v2/style.json?key=get_your_own_OpIi9ZULNHzrESv6T2vL'
    }
  };

  const [showMapLabels, setShowMapLabels] = useState(true); // Map labels toggle

  const handleGeolocation = () => {
    if (!navigator.geolocation) {
      alert('您的瀏覽器不支援地理定位功能');
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setSearchLocation({
          lat: latitude,
          lon: longitude,
          name: '您的位置'
        });
        setIsLocating(false);
      },
      (error) => {
        console.error('定位失敗:', error);
        alert('無法取得您的位置，請確認已允許瀏覽器存取位置資訊');
        setIsLocating(false);
      }
    );
  };

  // Fetch Social Housing Data
  useEffect(() => {
    const fetchSocialHousing = async () => {
      try {
        const response = await fetch('/api/BigData/project');
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();

        // Convert to GeoJSON
        const geojson = {
          type: 'FeatureCollection',
          features: data.map((item, index) => ({
            type: 'Feature',
            id: index,
            geometry: {
              type: 'Point',
              coordinates: [parseFloat(item.lng), parseFloat(item.lat)]
            },
            properties: item
          })).filter(feature => !isNaN(feature.geometry.coordinates[0]) && !isNaN(feature.geometry.coordinates[1]))
        };

        setSocialHousingData(geojson);
        console.log('Social Housing Data Loaded:', geojson);
      } catch (error) {
        console.error('Error fetching social housing data:', error);
      }
    };

    fetchSocialHousing();
  }, []);

  // Process Social Housing Data for Choropleth
  const socialHousingChoroplethData = useMemo(() => {
    const counts = {};
    // Initialize counts for all districts (optional, but good practice)
    districtData.features.forEach(feature => {
      counts[feature.properties.TNAME] = 0;
    });

    socialHousingRawData.forEach(project => {
      // Filter by status if not 'all'
      if (socialHousingStatus !== 'all' && project.progress !== socialHousingStatus) {
        return;
      }

      const district = project.distict; // Note: typo in JSON 'distict'
      const households = parseInt(project.houseHolds) || 0;

      if (counts[district] !== undefined) {
        counts[district] += households;
      } else {
        // Handle potential district name mismatches or new districts
        counts[district] = households;
      }
    });

    return counts;
  }, [socialHousingStatus]);

  // Memoize layers object to prevent unnecessary re-renders of Map component
  const layers = useMemo(() => ({
    grid: gridData,
    districts: districtData,
    villages: villagesData,
    mainPlan: mainPlanData,
    mrtLines: mrtLinesData,
    mrtStations: mrtStationsData,
    busStops: busStopsData,
    trees: treesData,
    parks: parksData,
    agriculture: agricultureData,
    birdProtection: birdProtectionData,
    natureProtection: natureProtectionData,
    roads: roadsData,
    sidewalksMarked: sidewalksMarkedData,
    roads: roadsData,
    sidewalksMarked: sidewalksMarkedData,
    sidewalksPhysical: sidewalksPhysicalData,
    sidewalksPhysical: sidewalksPhysicalData,
    socialHousing: socialHousingData, // Add social housing data
    socialHousingChoroplethData: socialHousingChoroplethData // Pass aggregated data
  }), [socialHousingData, socialHousingChoroplethData]);

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100%', position: 'relative' }}>
      {/* Mobile Menu Toggle Button */}
      <button
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        style={{
          position: 'fixed',
          top: '10px',
          left: '10px',
          zIndex: 1001,
          background: '#1a1a1a',
          color: '#fff',
          border: '1px solid #444',
          borderRadius: '4px',
          padding: '10px 12px',
          cursor: 'pointer',
          fontSize: '18px',
          display: 'none' // Hidden on desktop
        }}
        className="mobile-menu-toggle"
      >
        ☰
      </button>

      {/* Sidebar */}
      <div
        style={{
          width: '400px',
          background: '#1a1a1a',
          color: '#fff',
          overflowY: 'auto',
          padding: '20px',
          boxShadow: '2px 0 10px rgba(0,0,0,0.5)',
          position: 'relative',
          zIndex: 1000,
          transition: 'transform 0.3s ease',
          display: 'flex', flexDirection: 'column', gap: '20px'
        }}
        className={isSidebarOpen ? 'sidebar sidebar-open' : 'sidebar sidebar-closed'}
      >
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '800', fontFamily: "'Noto Sans TC', sans-serif" }}>
            Taipei Walk Map
          </h1>
          <p style={{ color: '#888', fontSize: '14px', fontWeight: '200', fontFamily: "'Noto Sans TC', sans-serif", marginTop: '4px' }}>
            Exploring urban accessibility.
          </p>
          <p style={{ color: '#666', fontSize: '18px', fontWeight: '200', fontFamily: "'Noto Sans TC', sans-serif", marginTop: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span>Created by Yun-Ching Wu（吳昀慶）</span>
            <a
              href="https://www.linkedin.com/in/yunching0513/"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '22px',
                height: '22px',
                background: '#000',
                borderRadius: '50%',
                color: '#fff',
                fontSize: '11px',
                fontWeight: 'bold',
                textDecoration: 'none',
                transition: 'background 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = '#333'}
              onMouseLeave={(e) => e.currentTarget.style.background = '#000'}
              title="LinkedIn Profile"
            >
              in
            </a>
          </p>
        </div>

        {/* Search Location */}
        <form onSubmit={handleSearch} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜尋地點 (Search Location)"
              style={{
                flex: 1,
                padding: '10px',
                borderRadius: '4px',
                border: '1px solid #444',
                background: '#2a2a2a',
                color: '#fff',
                fontSize: '14px'
              }}
            />
            <button
              type="button"
              onClick={handleGeolocation}
              disabled={isLocating}
              style={{
                padding: '10px 12px',
                borderRadius: '4px',
                border: '1px solid #444',
                background: isLocating ? '#555' : '#2a2a2a',
                color: '#fff',
                cursor: isLocating ? 'wait' : 'pointer',
                fontSize: '18px',
                transition: 'background 0.2s'
              }}
              onMouseEnter={(e) => !isLocating && (e.currentTarget.style.background = '#3a3a3a')}
              onMouseLeave={(e) => !isLocating && (e.currentTarget.style.background = '#2a2a2a')}
              title="定位我的位置"
            >
              {isLocating ? '⏳' : '📍'}
            </button>
          </div>
          {searchLocation && (
            <div style={{ marginTop: '5px', fontSize: '12px', color: '#aaa', display: 'flex', alignItems: 'center', gap: '5px' }}>
              📍 {searchLocation.name}
              <button
                type="button"
                onClick={() => setSearchLocation(null)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#e74c3c',
                  cursor: 'pointer',
                  fontSize: '12px',
                  padding: '2px 5px'
                }}
              >
                ✕
              </button>
            </div>
          )}
        </form>



        {/* 評分模式選擇 */}
        <div style={{ background: '#2a2a2a', padding: '15px', borderRadius: '8px' }}>
          <h2 style={{ fontSize: '18px', marginBottom: '15px', color: '#f1c40f' }}>
            Scoring Mode
          </h2>

          {/* Grid Visibility Toggle (Moved to top) */}
          <div style={{ marginBottom: '20px', paddingBottom: '15px', borderBottom: '1px solid #444' }}>
            <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={visibleLayers.grid}
                onChange={() => setVisibleLayers(prev => ({ ...prev, grid: !prev.grid }))}
                style={{ marginRight: '8px' }}
              />
              <span style={{ fontSize: '16px', fontWeight: 'bold', color: '#ddd' }}>顯示步行分數網格 (Show Grid)</span>
            </label>
            {visibleLayers.grid && (
              <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#aaa' }}>
                <span>Opacity:</span>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={layerStyles.grid.opacity}
                  onChange={(e) => setLayerStyles(prev => ({ ...prev, grid: { ...prev.grid, opacity: parseFloat(e.target.value) } }))}
                  style={{ flex: 1 }}
                />
                <span>{layerStyles.grid.opacity.toFixed(1)}</span>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {scoringModes.map(mode => (
              <label key={mode.id} style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', padding: '8px', background: scoringMode === mode.id ? '#444' : 'transparent', borderRadius: '4px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <input
                    type="radio"
                    name="scoringMode"
                    checked={scoringMode === mode.id}
                    onChange={() => setScoringMode(mode.id)}
                    style={{ cursor: 'pointer' }}
                  />
                  <div>
                    <div style={{ fontWeight: 'bold', fontSize: '14px' }}>{mode.label}</div>
                    <div style={{ fontSize: '12px', color: '#aaa' }}>{mode.desc}</div>
                    {scoringMode === mode.id && (
                      <div style={{ fontSize: '11px', color: '#f1c40f', marginTop: '4px' }}>
                        {mode.details}
                      </div>
                    )}
                  </div>
                </div>
              </label>
            ))}
          </div>
        </div>



        {/* 上傳的圖層管理 */}
        {uploadedLayers.length > 0 && (
          <div style={{ padding: '15px', background: '#333', borderRadius: '8px' }}>
            <h2 style={{ fontSize: '14px', textTransform: 'uppercase', color: '#aaa', marginBottom: '10px' }}>
              Uploaded Layers ({uploadedLayers.length})
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {uploadedLayers.map(layer => (
                <div key={layer.id} style={{ padding: '10px', background: '#1a1a1a', borderRadius: '4px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', flex: 1 }}>
                      <input
                        type="checkbox"
                        checked={layer.visible}
                        onChange={() => handleLayerToggle(layer.id)}
                        style={{ marginRight: '8px' }}
                      />
                      <span style={{ fontSize: '13px', fontWeight: 'bold' }}>{layer.name}</span>
                    </label>
                    <button
                      onClick={() => handleLayerRemove(layer.id)}
                      style={{
                        background: '#e74c3c',
                        border: 'none',
                        borderRadius: '4px',
                        color: 'white',
                        padding: '4px 8px',
                        cursor: 'pointer',
                        fontSize: '11px'
                      }}
                    >
                      🗑️
                    </button>
                  </div>
                  {layer.visible && (
                    <div style={{ marginLeft: '24px', display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span>Color:</span>
                        <input
                          type="color"
                          value={layer.color}
                          onChange={(e) => handleLayerStyleUpdate(layer.id, 'color', e.target.value)}
                          style={{ width: '40px', height: '24px', border: 'none', cursor: 'pointer' }}
                        />
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span>Opacity:</span>
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.1"
                          value={layer.opacity}
                          onChange={(e) => handleLayerStyleUpdate(layer.id, 'opacity', parseFloat(e.target.value))}
                          style={{ flex: 1 }}
                        />
                        <span>{layer.opacity.toFixed(1)}</span>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 圖層控制區 (Drag & Drop) */}
        <div style={{ padding: '15px', background: '#333', borderRadius: '8px' }}>
          <h2 style={{ fontSize: '14px', textTransform: 'uppercase', color: '#aaa', marginBottom: '10px' }}>
            Layers (Drag to Reorder)
          </h2>
          <DragDropContext onDragEnd={onDragEnd}>

            {/* Infrastructure Group */}
            <div style={{ marginBottom: '15px' }}>
              <h3 style={{ fontSize: '12px', color: '#3498db', marginBottom: '8px', textTransform: 'uppercase' }}>基礎設施 (Infrastructure)</h3>
              <Droppable droppableId="infrastructure">
                {(provided) => (
                  <div {...provided.droppableProps} ref={provided.innerRef} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {infrastructureLayers.map((layerKey, index) => {
                      const config = layerConfig[layerKey];
                      return (
                        <Draggable key={layerKey} draggableId={layerKey} index={index}>
                          {(provided) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              style={{
                                ...provided.draggableProps.style,
                                background: '#1a1a1a',
                                padding: '10px',
                                borderRadius: '4px',
                                border: '1px solid #444'
                              }}
                            >
                              <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', marginBottom: '8px' }}>
                                <span style={{ marginRight: '8px', cursor: 'grab' }}>☰</span>
                                <input
                                  type="checkbox"
                                  checked={visibleLayers[layerKey]}
                                  onChange={() => toggleLayer(layerKey)}
                                  style={{ marginRight: '8px' }}
                                />
                                <strong>{config.label}</strong>
                              </label>

                              {visibleLayers[layerKey] && (
                                <div style={{ marginLeft: '24px', display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '12px' }}>
                                  {/* Label Toggle */}
                                  {config.hasLabelToggle && (
                                    <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', marginBottom: '4px' }}>
                                      <input
                                        type="checkbox"
                                        checked={layerKey === 'districts' ? showDistrictLabels : showVillageLabels}
                                        onChange={() => layerKey === 'districts' ? setShowDistrictLabels(!showDistrictLabels) : setShowVillageLabels(!showVillageLabels)}
                                        style={{ marginRight: '6px' }}
                                      />
                                      <span>顯示名稱 (Show Name)</span>
                                    </label>
                                  )}

                                  {!config.noColor && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                      <span>Color:</span>
                                      <input
                                        type="color"
                                        value={layerStyles[layerKey].color}
                                        onChange={(e) => updateLayerStyle(layerKey, 'color', e.target.value)}
                                        style={{ width: '40px', height: '24px', border: 'none', cursor: 'pointer' }}
                                      />
                                    </div>
                                  )}
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span>Opacity:</span>
                                    <input
                                      type="range"
                                      min="0"
                                      max="1"
                                      step="0.1"
                                      value={layerStyles[layerKey].opacity}
                                      onChange={(e) => updateLayerStyle(layerKey, 'opacity', parseFloat(e.target.value))}
                                      style={{ flex: 1 }}
                                    />
                                    <span>{layerStyles[layerKey].opacity.toFixed(1)}</span>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </Draggable>
                      );
                    })}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </div>

            {/* Public Transport Group */}
            <div style={{ marginBottom: '15px' }}>
              <h3 style={{ fontSize: '12px', color: '#f1c40f', marginBottom: '8px', textTransform: 'uppercase' }}>公共運輸 (Public Transport)</h3>
              <Droppable droppableId="transport">
                {(provided) => (
                  <div {...provided.droppableProps} ref={provided.innerRef} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {transportLayers.map((layerKey, index) => {
                      const config = layerConfig[layerKey];
                      return (
                        <Draggable key={layerKey} draggableId={layerKey} index={index}>
                          {(provided) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              style={{
                                ...provided.draggableProps.style,
                                background: '#1a1a1a',
                                padding: '10px',
                                borderRadius: '4px',
                                border: '1px solid #444'
                              }}
                            >

                              <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', marginBottom: '8px' }}>
                                <span style={{ marginRight: '8px', cursor: 'grab' }}>☰</span>
                                <input
                                  type="checkbox"
                                  checked={visibleLayers[layerKey]}
                                  onChange={() => toggleLayer(layerKey)}
                                  style={{ marginRight: '8px' }}
                                />
                                <strong>{config.label}</strong>
                              </label>

                              {visibleLayers[layerKey] && (
                                <div style={{ marginLeft: '24px', display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '12px' }}>
                                  {/* Label Toggle */}
                                  {config.hasLabelToggle && (
                                    <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', marginBottom: '4px' }}>
                                      <input
                                        type="checkbox"
                                        checked={layerKey === 'districts' ? showDistrictLabels : showVillageLabels}
                                        onChange={() => layerKey === 'districts' ? setShowDistrictLabels(!showDistrictLabels) : setShowVillageLabels(!showVillageLabels)}
                                        style={{ marginRight: '6px' }}
                                      />
                                      <span>顯示名稱 (Show Name)</span>
                                    </label>
                                  )}

                                  {!config.noColor && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                      <span>Color:</span>
                                      <input
                                        type="color"
                                        value={layerStyles[layerKey].color}
                                        onChange={(e) => updateLayerStyle(layerKey, 'color', e.target.value)}
                                        style={{ width: '40px', height: '24px', border: 'none', cursor: 'pointer' }}
                                      />
                                    </div>
                                  )}
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span>Opacity:</span>
                                    <input
                                      type="range"
                                      min="0"
                                      max="1"
                                      step="0.1"
                                      value={layerStyles[layerKey].opacity}
                                      onChange={(e) => updateLayerStyle(layerKey, 'opacity', parseFloat(e.target.value))}
                                      style={{ flex: 1 }}
                                    />
                                    <span>{layerStyles[layerKey].opacity.toFixed(1)}</span>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </Draggable>
                      );
                    })}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </div>

            {/* Blue & Green Group */}
            <div style={{ marginBottom: '15px' }}>
              <h3 style={{ fontSize: '12px', color: '#27ae60', marginBottom: '8px', textTransform: 'uppercase' }}>生態水與綠 (Blue and Green)</h3>
              <Droppable droppableId="blueGreen">
                {(provided) => (
                  <div {...provided.droppableProps} ref={provided.innerRef} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {blueGreenLayers.map((layerKey, index) => {
                      const config = layerConfig[layerKey];
                      return (
                        <Draggable key={layerKey} draggableId={layerKey} index={index}>
                          {(provided) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              style={{
                                ...provided.draggableProps.style,
                                background: '#1a1a1a',
                                padding: '10px',
                                borderRadius: '4px',
                                border: '1px solid #444'
                              }}
                            >
                              <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', marginBottom: '8px' }}>
                                <span style={{ marginRight: '8px', cursor: 'grab' }}>☰</span>
                                <input
                                  type="checkbox"
                                  checked={visibleLayers[layerKey]}
                                  onChange={() => toggleLayer(layerKey)}
                                  style={{ marginRight: '8px' }}
                                />
                                <strong>{config.label}</strong>
                              </label>

                              {visibleLayers[layerKey] && (
                                <div style={{ marginLeft: '24px', display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '12px' }}>
                                  {/* Label Toggle */}
                                  {config.hasLabelToggle && (
                                    <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', marginBottom: '4px' }}>
                                      <input
                                        type="checkbox"
                                        checked={layerKey === 'districts' ? showDistrictLabels : showVillageLabels}
                                        onChange={() => layerKey === 'districts' ? setShowDistrictLabels(!showDistrictLabels) : setShowVillageLabels(!showVillageLabels)}
                                        style={{ marginRight: '6px' }}
                                      />
                                      <span>顯示名稱 (Show Name)</span>
                                    </label>
                                  )}

                                  {!config.noColor && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                      <span>Color:</span>
                                      <input
                                        type="color"
                                        value={layerStyles[layerKey].color}
                                        onChange={(e) => updateLayerStyle(layerKey, 'color', e.target.value)}
                                        style={{ width: '40px', height: '24px', border: 'none', cursor: 'pointer' }}
                                      />
                                    </div>
                                  )}
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span>Opacity:</span>
                                    <input
                                      type="range"
                                      min="0"
                                      max="1"
                                      step="0.1"
                                      value={layerStyles[layerKey].opacity}
                                      onChange={(e) => updateLayerStyle(layerKey, 'opacity', parseFloat(e.target.value))}
                                      style={{ flex: 1 }}
                                    />
                                    <span>{layerStyles[layerKey].opacity.toFixed(1)}</span>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </Draggable>
                      );
                    })}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </div>

            {/* Social Housing Group (New) */}
            <div style={{ marginBottom: '15px' }}>
              <h3 style={{ fontSize: '12px', color: '#8e44ad', marginBottom: '8px', textTransform: 'uppercase' }}>社會住宅 (Social Housing)</h3>
              <Droppable droppableId="socialHousing">
                {(provided) => (
                  <div {...provided.droppableProps} ref={provided.innerRef} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {socialHousingLayers.map((layerKey, index) => {
                      const config = layerConfig[layerKey];
                      return (
                        <Draggable key={layerKey} draggableId={layerKey} index={index}>
                          {(provided) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              style={{
                                ...provided.draggableProps.style,
                                background: '#1a1a1a',
                                padding: '10px',
                                borderRadius: '4px',
                                border: '1px solid #444'
                              }}
                            >
                              <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', marginBottom: '8px' }}>
                                <span style={{ marginRight: '8px', cursor: 'grab' }}>☰</span>
                                <input
                                  type="checkbox"
                                  checked={visibleLayers[layerKey]}
                                  onChange={() => toggleLayer(layerKey)}
                                  style={{ marginRight: '8px' }}
                                />
                                <strong>{config.label}</strong>
                              </label>

                              {visibleLayers[layerKey] && (
                                <div style={{ marginLeft: '24px', display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '12px' }}>

                                  {/* Special Controls for Social Housing Choropleth */}
                                  {layerKey === 'socialHousingChoropleth' && (
                                    <div style={{ marginBottom: '10px', padding: '10px', background: '#2a2a2a', borderRadius: '4px' }}>
                                      <label style={{ display: 'block', marginBottom: '5px', fontSize: '12px', color: '#aaa' }}>狀態 (Status):</label>
                                      <select
                                        value={socialHousingStatus}
                                        onChange={(e) => setSocialHousingStatus(e.target.value)}
                                        style={{
                                          width: '100%',
                                          padding: '5px',
                                          borderRadius: '4px',
                                          background: '#1a1a1a',
                                          color: '#fff',
                                          border: '1px solid #444',
                                          fontSize: '12px'
                                        }}
                                      >
                                        <option value="all">全部 (All)</option>
                                        <option value="已完工">已完工 (Completed)</option>
                                        <option value="施工中及待開工">施工中及待開工 (Under Construction)</option>
                                        <option value="招標中及待上網">招標中及待上網 (Tendering)</option>
                                        <option value="規劃中">規劃中 (Planning)</option>
                                        <option value="都更聯開分回">都更聯開分回 (Urban Renewal)</option>
                                      </select>

                                      <div style={{ marginTop: '10px' }}>
                                        <div style={{ fontSize: '12px', color: '#aaa', marginBottom: '5px' }}>圖例 (Legend - 戶數):</div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '10px', flexWrap: 'wrap' }}>
                                          <div style={{ display: 'flex', alignItems: 'center' }}><span style={{ width: '8px', height: '8px', background: '#f3e5f5', marginRight: '4px' }}></span>0</div>
                                          <div style={{ display: 'flex', alignItems: 'center' }}><span style={{ width: '8px', height: '8px', background: '#e1bee7', marginRight: '4px' }}></span>1-500</div>
                                          <div style={{ display: 'flex', alignItems: 'center' }}><span style={{ width: '8px', height: '8px', background: '#ce93d8', marginRight: '4px' }}></span>500-1000</div>
                                          <div style={{ display: 'flex', alignItems: 'center' }}><span style={{ width: '8px', height: '8px', background: '#ba68c8', marginRight: '4px' }}></span>1k-2k</div>
                                          <div style={{ display: 'flex', alignItems: 'center' }}><span style={{ width: '8px', height: '8px', background: '#8e24aa', marginRight: '4px' }}></span>{'>'}2k</div>
                                        </div>
                                      </div>
                                    </div>
                                  )}

                                  {!config.noColor && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                      <span>Color:</span>
                                      <input
                                        type="color"
                                        value={layerStyles[layerKey].color}
                                        onChange={(e) => updateLayerStyle(layerKey, 'color', e.target.value)}
                                        style={{ width: '40px', height: '24px', border: 'none', cursor: 'pointer' }}
                                      />
                                    </div>
                                  )}
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span>Opacity:</span>
                                    <input
                                      type="range"
                                      min="0"
                                      max="1"
                                      step="0.1"
                                      value={layerStyles[layerKey].opacity}
                                      onChange={(e) => updateLayerStyle(layerKey, 'opacity', parseFloat(e.target.value))}
                                      style={{ flex: 1 }}
                                    />
                                    <span>{layerStyles[layerKey].opacity.toFixed(1)}</span>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </Draggable>
                      );
                    })}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </div>



            {/* Admin Group */}
            <div>
              <h3 style={{ fontSize: '12px', color: '#95a5a6', marginBottom: '8px', textTransform: 'uppercase' }}>行政區 (Districts)</h3>
              <Droppable droppableId="admin">
                {(provided) => (
                  <div {...provided.droppableProps} ref={provided.innerRef} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {adminLayers.map((layerKey, index) => {
                      const config = layerConfig[layerKey];
                      return (
                        <Draggable key={layerKey} draggableId={layerKey} index={index}>
                          {(provided) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              style={{
                                ...provided.draggableProps.style,
                                background: '#1a1a1a',
                                padding: '10px',
                                borderRadius: '4px',
                                border: '1px solid #444'
                              }}
                            >
                              <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', marginBottom: '8px' }}>
                                <span style={{ marginRight: '8px', cursor: 'grab' }}>☰</span>
                                <input
                                  type="checkbox"
                                  checked={visibleLayers[layerKey]}
                                  onChange={() => toggleLayer(layerKey)}
                                  style={{ marginRight: '8px' }}
                                />
                                <strong>{config.label}</strong>
                              </label>

                              {visibleLayers[layerKey] && (
                                <div style={{ marginLeft: '24px', display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '12px' }}>
                                  {/* Label Toggle */}
                                  {config.hasLabelToggle && (
                                    <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', marginBottom: '4px' }}>
                                      <input
                                        type="checkbox"
                                        checked={layerKey === 'districts' ? showDistrictLabels : showVillageLabels}
                                        onChange={() => layerKey === 'districts' ? setShowDistrictLabels(!showDistrictLabels) : setShowVillageLabels(!showVillageLabels)}
                                        style={{ marginRight: '6px' }}
                                      />
                                      <span>顯示名稱 (Show Name)</span>
                                    </label>
                                  )}

                                  {/* Zone Filter for Main Plan */}
                                  {layerKey === 'mainPlan' && zoningColors && (
                                    <div style={{ marginBottom: '8px' }}>
                                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                                        <label style={{ fontSize: '11px', color: '#aaa' }}>
                                          過濾分區 (Filter Zones) {selectedMainPlanZones.length > 0 && `(${selectedMainPlanZones.length})`}
                                        </label>
                                        {selectedMainPlanZones.length > 0 && (
                                          <button
                                            onClick={() => setSelectedMainPlanZones([])}
                                            style={{
                                              padding: '2px 6px',
                                              background: '#555',
                                              border: 'none',
                                              borderRadius: '3px',
                                              color: '#fff',
                                              cursor: 'pointer',
                                              fontSize: '9px'
                                            }}
                                          >
                                            清除
                                          </button>
                                        )}
                                      </div>
                                      <div style={{
                                        maxHeight: '400px',
                                        overflowY: 'auto',
                                        background: '#2a2a2a',
                                        border: '1px solid #555',
                                        borderRadius: '4px',
                                        padding: '6px'
                                      }}>
                                        {zoneCategories.categories.map((category) => {
                                          const isExpanded = expandedCategories[category.category];
                                          const categoryZones = category.zones.map(z => z.zone);
                                          const selectedInCategory = categoryZones.filter(z => selectedMainPlanZones.includes(z)).length;

                                          return (
                                            <div key={category.category} style={{ marginBottom: '4px' }}>
                                              {/* Category Header */}
                                              <div
                                                onClick={() => setExpandedCategories(prev => ({
                                                  ...prev,
                                                  [category.category]: !prev[category.category]
                                                }))}
                                                style={{
                                                  display: 'flex',
                                                  alignItems: 'center',
                                                  padding: '6px 4px',
                                                  background: '#3a3a3a',
                                                  borderRadius: '3px',
                                                  cursor: 'pointer',
                                                  marginBottom: isExpanded ? '4px' : '0'
                                                }}
                                                onMouseEnter={(e) => e.currentTarget.style.background = '#444'}
                                                onMouseLeave={(e) => e.currentTarget.style.background = '#3a3a3a'}
                                              >
                                                <span style={{ marginRight: '6px', fontSize: '10px', color: '#aaa' }}>
                                                  {isExpanded ? '▼' : '▶'}
                                                </span>
                                                <span
                                                  style={{
                                                    width: '12px',
                                                    height: '12px',
                                                    backgroundColor: category.color,
                                                    border: '1px solid #666',
                                                    marginRight: '6px',
                                                    flexShrink: 0
                                                  }}
                                                />
                                                <span style={{ flex: 1, fontSize: '11px', color: '#fff', fontWeight: 'bold' }}>
                                                  {category.category}
                                                </span>
                                                <span style={{ fontSize: '9px', color: '#888', marginRight: '8px' }}>
                                                  {selectedInCategory > 0 ? `${selectedInCategory}/` : ''}{category.zones.length}
                                                </span>
                                                <span style={{ fontSize: '9px', color: '#888' }}>
                                                  ({category.total_count})
                                                </span>
                                              </div>

                                              {/* Category Zones */}
                                              {isExpanded && (
                                                <div style={{ paddingLeft: '16px' }}>
                                                  {category.zones.map(({ zone, count }) => {
                                                    const isSelected = selectedMainPlanZones.includes(zone);
                                                    const color = zoningColors[zone] || '#cccccc';
                                                    return (
                                                      <label
                                                        key={zone}
                                                        style={{
                                                          display: 'flex',
                                                          alignItems: 'center',
                                                          padding: '4px 2px',
                                                          cursor: 'pointer',
                                                          background: isSelected ? '#333' : 'transparent',
                                                          borderRadius: '3px',
                                                          marginBottom: '2px',
                                                          fontSize: '10px'
                                                        }}
                                                        onMouseEnter={(e) => e.currentTarget.style.background = isSelected ? '#3a3a3a' : '#2d2d2d'}
                                                        onMouseLeave={(e) => e.currentTarget.style.background = isSelected ? '#333' : 'transparent'}
                                                      >
                                                        <input
                                                          type="checkbox"
                                                          checked={isSelected}
                                                          onChange={(e) => {
                                                            if (e.target.checked) {
                                                              setSelectedMainPlanZones([...selectedMainPlanZones, zone]);
                                                            } else {
                                                              setSelectedMainPlanZones(selectedMainPlanZones.filter(z => z !== zone));
                                                            }
                                                          }}
                                                          style={{ marginRight: '6px', cursor: 'pointer' }}
                                                        />
                                                        <span
                                                          style={{
                                                            width: '10px',
                                                            height: '10px',
                                                            backgroundColor: color,
                                                            border: '1px solid #666',
                                                            marginRight: '6px',
                                                            flexShrink: 0
                                                          }}
                                                        />
                                                        <span style={{ flex: 1, color: '#ccc' }}>{zone}</span>
                                                        <span style={{ color: '#777', fontSize: '9px', marginLeft: '4px' }}>({count})</span>
                                                      </label>
                                                    );
                                                  })}
                                                </div>
                                              )}
                                            </div>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  )}

                                  {!config.noColor && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                      <span>Color:</span>
                                      <input
                                        type="color"
                                        value={layerStyles[layerKey].color}
                                        onChange={(e) => updateLayerStyle(layerKey, 'color', e.target.value)}
                                        style={{ width: '40px', height: '24px', border: 'none', cursor: 'pointer' }}
                                      />
                                    </div>
                                  )}
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span>Opacity:</span>
                                    <input
                                      type="range"
                                      min="0"
                                      max="1"
                                      step="0.1"
                                      value={layerStyles[layerKey].opacity}
                                      onChange={(e) => updateLayerStyle(layerKey, 'opacity', parseFloat(e.target.value))}
                                      style={{ flex: 1 }}
                                    />
                                    <span>{layerStyles[layerKey].opacity.toFixed(1)}</span>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </Draggable>
                      );
                    })}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </div>

          </DragDropContext>
        </div>

        {/* 底圖選擇 (Basemap Selection) */}
        <div style={{ background: '#2a2a2a', padding: '15px', borderRadius: '8px' }}>
          <h2 style={{ fontSize: '14px', textTransform: 'uppercase', color: '#888', marginBottom: '12px' }}>
            底圖 (Basemap)
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {Object.values(basemaps).map(basemap => (
              <label key={basemap.id} style={{
                display: 'flex',
                alignItems: 'center',
                cursor: 'pointer',
                padding: '8px',
                background: selectedBasemap === basemap.id ? '#444' : 'transparent',
                borderRadius: '4px',
                transition: 'background 0.2s'
              }}>
                <input
                  type="radio"
                  name="basemap"
                  checked={selectedBasemap === basemap.id}
                  onChange={() => setSelectedBasemap(basemap.id)}
                  style={{ marginRight: '8px', cursor: 'pointer' }}
                />
                <span style={{ fontSize: '14px' }}>{basemap.label}</span>
              </label>
            ))}
          </div>

          <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #444' }}>
            <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={showMapLabels}
                onChange={() => setShowMapLabels(!showMapLabels)}
                style={{ marginRight: '8px', cursor: 'pointer' }}
              />
              <span style={{ fontSize: '13px', color: '#ccc' }}>顯示地圖資訊 (Show Map Info)</span>
            </label>
          </div>
        </div>

        {/* 檔案上傳區 (Moved to bottom) */}
        <FileUpload onLayerAdd={handleLayerAdd} />

        {/* 上傳的圖層管理 (Moved to bottom) */}
        {uploadedLayers.length > 0 && (
          <div style={{ padding: '15px', background: '#333', borderRadius: '8px' }}>
            <h2 style={{ fontSize: '14px', textTransform: 'uppercase', color: '#aaa', marginBottom: '10px' }}>
              Uploaded Layers ({uploadedLayers.length})
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {uploadedLayers.map(layer => (
                <div key={layer.id} style={{ padding: '10px', background: '#1a1a1a', borderRadius: '4px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', flex: 1 }}>
                      <input
                        type="checkbox"
                        checked={layer.visible}
                        onChange={() => handleLayerToggle(layer.id)}
                        style={{ marginRight: '8px' }}
                      />
                      <span style={{ fontSize: '13px', fontWeight: 'bold' }}>{layer.name}</span>
                    </label>
                    <button
                      onClick={() => handleLayerRemove(layer.id)}
                      style={{
                        background: '#e74c3c',
                        border: 'none',
                        borderRadius: '4px',
                        color: 'white',
                        padding: '4px 8px',
                        cursor: 'pointer',
                        fontSize: '11px'
                      }}
                    >
                      🗑️
                    </button>
                  </div>
                  {layer.visible && (
                    <div style={{ marginLeft: '24px', display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span>Color:</span>
                        <input
                          type="color"
                          value={layer.color}
                          onChange={(e) => handleLayerStyleUpdate(layer.id, 'color', e.target.value)}
                          style={{ width: '40px', height: '24px', border: 'none', cursor: 'pointer' }}
                        />
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span>Opacity:</span>
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.1"
                          value={layer.opacity}
                          onChange={(e) => handleLayerStyleUpdate(layer.id, 'opacity', parseFloat(e.target.value))}
                          style={{ flex: 1 }}
                        />
                        <span>{layer.opacity.toFixed(1)}</span>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}


      </div>

      {/* 右側地圖 */}
      <div style={{ flex: 1, position: 'relative' }}>
        <Map
          layers={layers}
          visibleLayers={visibleLayers}
          layerStyles={layerStyles}
          layerOrder={layerOrder}
          scoringMode={scoringMode}
          searchLocation={searchLocation}
          uploadedLayers={uploadedLayers}
          treesData={treesData}
          basemapUrl={basemaps[selectedBasemap].url}
          showMapLabels={showMapLabels}
          showDistrictLabels={showDistrictLabels}
          showVillageLabels={showVillageLabels}
          setShowVillageLabels={setShowVillageLabels}
          zoningColors={zoningColors} // Pass zoning colors
          selectedMainPlanZones={selectedMainPlanZones} // Pass selected zones
          setSelectedMainPlanZones={setSelectedMainPlanZones} // Pass setter
          onSelectFeature={(feature) => {
            setSelectedFeature(feature);
            setIsSelectionOpen(true);
          }}
          selectedFeature={selectedFeature}
        />
      </div>

      {/* Feedback Button - Moved above scale */}
      <a
        href="mailto:jtl0513@gmail.com?subject=Taipei Walk Map 回饋&body=請在此分享您的建議或回饋："
        style={{
          position: 'fixed',
          bottom: '225px',
          right: '20px',
          width: '56px',
          height: '56px',
          borderRadius: '50%',
          background: '#000',
          color: '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '24px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
          textDecoration: 'none',
          cursor: 'pointer',
          transition: 'all 0.3s ease',
          zIndex: 999
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'scale(1.1)';
          e.currentTarget.style.background = '#333';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'scale(1)';
          e.currentTarget.style.background = '#000';
        }}
        title="提供回饋 (Send Feedback)"
      >
        ✉️
      </a>
      {/* Floating Selection Panel - Top Right */}
      <div style={{
        position: 'fixed',
        top: '20px',
        right: '20px',
        width: '320px',
        background: '#1a1a1a',
        borderRadius: '8px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.7)',
        zIndex: 1000,
        overflow: 'hidden',
        border: '1px solid #444'
      }}>
        {/* Header with collapse button */}
        <div
          onClick={() => setIsSelectionOpen(!isSelectionOpen)}
          style={{
            padding: '12px 15px',
            background: '#2a2a2a',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: isSelectionOpen ? '1px solid #444' : 'none',
            transition: 'background 0.2s'
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = '#333'}
          onMouseLeave={(e) => e.currentTarget.style.background = '#2a2a2a'}
        >
          <h2 style={{ fontSize: '14px', textTransform: 'uppercase', color: '#aaa', margin: 0 }}>
            Selection
          </h2>
          <span style={{ fontSize: '18px', color: '#aaa', transition: 'transform 0.3s', transform: isSelectionOpen ? 'rotate(0deg)' : 'rotate(180deg)' }}>
            ▲
          </span>
        </div>

        {/* Content */}
        {isSelectionOpen && (
          <div style={{ padding: '15px' }}>
            {selectedFeature ? (
              <div style={{ fontSize: '14px', lineHeight: '1.6', color: '#fff' }}>
                {selectedFeature.type === 'tree' ? (
                  <>
                    <p>Type: <b style={{ color: selectedFeature.type === 'protected' ? '#f1c40f' : '#2ecc71' }}>
                      {selectedFeature.type === 'protected' ? '受保護樹木 (Protected)' : '一般行道樹 (Normal)'}
                    </b></p>
                    <p>Name: <b>{selectedFeature.name}</b></p>
                    <p>Address: <b>{selectedFeature.address}</b></p>
                    <p>Diameter: <b>{selectedFeature.樹徑} cm</b></p>
                    {selectedFeature.health && selectedFeature.health !== 'N/A' && (
                      <p>Health: <b>{selectedFeature.health}</b></p>
                    )}
                  </>
                ) : (
                  <>
                    <div style={{ fontSize: '36px', fontWeight: 'bold', color: '#f1c40f' }}>
                      {selectedFeature[`score_${scoringMode}`] || selectedFeature.score} <span style={{ fontSize: '14px' }}>/ 10</span>
                    </div>
                    <p style={{ color: '#aaa', fontSize: '12px', marginBottom: '10px' }}>
                      {scoringModes.find(m => m.id === scoringMode)?.label}
                    </p>
                    <hr style={{ borderColor: '#444', margin: '15px 0' }} />
                    <p>MRT Dist: <b>{selectedFeature.dist_mrt} m</b></p>
                    <p>Bus Dist: <b>{selectedFeature.dist_bus} m</b></p>
                    <p>Trees: <b>{selectedFeature.tree_count || 0}</b></p>
                    <p>Sidewalk Density: <b>{selectedFeature.sidewalk_density || 0}%</b></p>
                    <p>Hex ID: <span style={{ fontSize: '10px', color: '#666' }}>{selectedFeature.hex_id}</span></p>
                  </>
                )}
              </div>
            ) : (
              <p style={{ color: '#666', fontStyle: 'italic', margin: 0 }}>
                Click on a hexagon to see details.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default App;