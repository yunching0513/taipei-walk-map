import { useState } from 'react';
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

function App() {
  const [selectedFeature, setSelectedFeature] = useState(null);

  // 圖層開關狀態
  const [visibleLayers, setVisibleLayers] = useState({
    grid: false,
    districts: true,
    villages: false, // Add villages
    mrtLines: false,
    mrtStations: false,
    busStops: false,
    trees: false,
    roads: false,
    sidewalksMarked: false,
    sidewalksPhysical: false
  });

  // 圖層樣式 (顏色和透明度)
  const [layerStyles, setLayerStyles] = useState({
    grid: { opacity: 0.8 },
    districts: { color: '#ffffff', opacity: 0.3 },
    villages: { color: '#cccccc', opacity: 0.2 }, // Add villages style
    mrtLines: { opacity: 1 },
    mrtStations: { color: '#e74c3c', opacity: 1.0 },
    busStops: { color: '#f39c12', opacity: 0.8 },
    trees: { color: '#27ae60', opacity: 0.8 },
    roads: { color: '#ffffff', opacity: 1.0 },
    sidewalksMarked: { color: '#2ecc71', opacity: 1.0 },
    sidewalksPhysical: { color: '#3498db', opacity: 0.5 }
  });

  // 圖層順序 (由上到下，對應地圖上的 z-index 由大到小)
  // Layer Groups State
  const [transportLayers, setTransportLayers] = useState(['mrtStations', 'busStops', 'mrtLines']);
  const [infrastructureLayers, setInfrastructureLayers] = useState(['trees', 'sidewalksMarked', 'sidewalksPhysical', 'roads']);
  const [adminLayers, setAdminLayers] = useState(['villages', 'districts']);

  // Combined layer order for Map (Transport > Infra > Admin)
  const layerOrder = [...transportLayers, ...infrastructureLayers, ...adminLayers];

  // 圖層配置 (用於渲染列表)
  const layerConfig = {
    mrtStations: { label: '捷運站 (MRT Stations)', type: 'point' },
    busStops: { label: '公車站 (Bus Stops)', type: 'point' },
    trees: { label: '行道樹 (Trees)', type: 'point' },
    mrtLines: { label: '捷運路網 (MRT Lines)', type: 'line', noColor: true },
    roads: { label: '道路 (Roads)', type: 'polygon' },
    sidewalksMarked: { label: '標線型人行道 (Marked Sidewalks)', type: 'polygon' },
    sidewalksPhysical: { label: '實體人行道 (Physical Sidewalks)', type: 'polygon' },
    grid: { label: '步行分數網格 (Walkability Grid)', type: 'polygon', noColor: true },
    villages: { label: '里界 (Villages)', type: 'polygon' }, // Add villages config
    districts: { label: '行政區界 (Districts)', type: 'polygon' }
  };

  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

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
  const [scoringMode, setScoringMode] = useState('urbanist'); // default: urbanist

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
      id: 'urbanist',
      label: '城市規劃 (Urbanist)',
      desc: '綜合考量交通與步行品質',
      details: '40% 交通, 40% 人行道品質, 20% 樹蔭'
    },
    {
      id: 'pedestrian',
      label: '純粹步行 (Pedestrian)',
      desc: '僅考量人行道覆蓋率與品質',
      details: '100% 人行道品質 (實體 + 標線)'
    }
  ];

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
          <h1 style={{ fontSize: '24px', fontWeight: 'bold' }}>Taipei Walk Map</h1>
          <p style={{ color: '#888', fontSize: '14px' }}>Exploring urban accessibility.</p>
        </div>

        {/* 評分模式選擇 */}
        <div style={{ padding: '15px', background: '#333', borderRadius: '8px' }}>
          <h2 style={{ fontSize: '14px', textTransform: 'uppercase', color: '#aaa', marginBottom: '10px' }}>
            Scoring Mode
          </h2>
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

          {/* Grid Visibility Toggle (Moved here) */}
          <div style={{ marginTop: '15px', paddingTop: '15px', borderTop: '1px solid #444' }}>
            <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={visibleLayers.grid}
                onChange={() => setVisibleLayers(prev => ({ ...prev, grid: !prev.grid }))}
                style={{ marginRight: '8px' }}
              />
              <span style={{ fontSize: '14px', color: '#ddd' }}>顯示步行分數網格 (Show Grid)</span>
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
        </div>

        {/* 資訊顯示區 (Moved here) */}
        <div style={{ padding: '15px', background: '#333', borderRadius: '8px' }}>
          <h2 style={{ fontSize: '14px', textTransform: 'uppercase', color: '#aaa', marginBottom: '10px' }}>
            Selection
          </h2>
          {selectedFeature ? (
            <div style={{ fontSize: '14px', lineHeight: '1.6' }}>
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
            <p style={{ color: '#666', fontStyle: 'italic' }}>
              Click on a hexagon to see details.
            </p>
          )}
        </div>

        {/* 搜尋區 */}
        <form onSubmit={handleSearch} style={{ padding: '15px', background: '#333', borderRadius: '8px' }}>
          <h2 style={{ fontSize: '14px', textTransform: 'uppercase', color: '#aaa', marginBottom: '10px' }}>
            Search Location
          </h2>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="輸入地址或地標..."
              disabled={isSearching}
              style={{
                flex: 1,
                padding: '8px 12px',
                background: '#1a1a1a',
                border: '1px solid #555',
                borderRadius: '4px',
                color: 'white',
                fontSize: '14px'
              }}
            />
            <button
              type="submit"
              disabled={isSearching}
              style={{
                padding: '8px 16px',
                background: isSearching ? '#555' : '#f1c40f',
                border: 'none',
                borderRadius: '4px',
                color: '#1a1a1a',
                fontWeight: 'bold',
                cursor: isSearching ? 'not-allowed' : 'pointer',
                fontSize: '14px'
              }}
            >
              {isSearching ? '搜尋中...' : '搜尋'}
            </button>
          </div>
          {searchLocation && (
            <div style={{ marginTop: '10px', fontSize: '12px', color: '#aaa' }}>
              📍 {searchLocation.name}
            </div>
          )}
        </form>

        {/* 檔案上傳區 */}
        <FileUpload onLayerAdd={handleLayerAdd} />

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


      </div>

      {/* 右側地圖 */}
      <div style={{ flex: 1, position: 'relative' }}>
        <Map
          layers={{
            grid: gridData,
            districts: districtData,
            villages: villagesData, // Pass villages data
            mrtLines: mrtLinesData,
            mrtStations: mrtStationsData,
            busStops: busStopsData,
            trees: treesData,
            roads: roadsData,
            sidewalksMarked: sidewalksMarkedData,
            sidewalksPhysical: sidewalksPhysicalData
          }}
          visibleLayers={visibleLayers}
          layerStyles={layerStyles}
          layerOrder={layerOrder}
          scoringMode={scoringMode}
          searchLocation={searchLocation}
          uploadedLayers={uploadedLayers}
          treesData={treesData}
          onSelectFeature={setSelectedFeature}
        />
      </div>
    </div >
  );
}

export default App;