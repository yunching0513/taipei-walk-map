import { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

export default function Map({ layers, visibleLayers, layerStyles, layerOrder, scoringMode, searchLocation, uploadedLayers, treesData, basemapUrl, showMapLabels, showDistrictLabels, showVillageLabels, onSelectFeature, selectedFeature, zoningColors, selectedMainPlanZones }) {
    const mapContainer = useRef(null);
    const map = useRef(null);
    const searchMarker = useRef(null);
    const uploadedLayerIds = useRef(new Set());
    const listenersBound = useRef(false);
    const hoveredHexId = useRef(null);

    const [isLoaded, setIsLoaded] = useState(false);

    useEffect(() => {
        if (map.current) return;

        map.current = new maplibregl.Map({
            container: mapContainer.current,
            style: basemapUrl, // Use dynamic basemap URL
            center: [121.54, 25.05],
            zoom: 12,
            pitch: 45,
        });

        map.current.addControl(new maplibregl.NavigationControl({ showCompass: true, showZoom: true }), 'bottom-right');
        map.current.addControl(new maplibregl.ScaleControl({ maxWidth: 100, unit: 'metric' }), 'bottom-right');

        map.current.on('load', () => {
            console.log('Map Loaded');
            console.log('Map Glyphs:', map.current.getStyle().glyphs);
            setIsLoaded(true);
        });
    }, []);

    // Initialize Layers (Re-run when isLoaded becomes true, e.g. after basemap switch)
    useEffect(() => {
        if (!map.current || !isLoaded) return;

        const addLayers = () => {
            // --- 1. Districts (Polygon) ---
            if (layers.districts && !map.current.getSource('districts')) {
                map.current.addSource('districts', { type: 'geojson', data: layers.districts });
                map.current.addLayer({
                    id: 'districts-line',
                    type: 'line',
                    source: 'districts',
                    layout: { visibility: visibleLayers.districts ? 'visible' : 'none' },
                    paint: { 'line-color': '#ffffff', 'line-width': 2, 'line-opacity': 0.3 }
                });

                // Add district name labels
                console.log('Adding district labels layer');
                map.current.addLayer({
                    id: 'districts-labels',
                    type: 'symbol',
                    source: 'districts',
                    layout: {
                        'text-field': ['get', 'TNAME'],
                        'text-font': ['Open Sans Bold'],
                        'text-size': 12,
                        'text-anchor': 'center',
                        'text-allow-overlap': true,
                        visibility: (visibleLayers.districts && showDistrictLabels) ? 'visible' : 'none'
                    },
                    paint: {
                        'text-color': '#fff',
                        'text-halo-color': '#000',
                        'text-halo-width': 2
                    }
                });
            }

            // --- 1c. Main Plan (Polygon) ---
            if (layers.mainPlan && !map.current.getSource('main-plan')) {
                map.current.addSource('main-plan', { type: 'geojson', data: layers.mainPlan });

                // Build color match expression from zoningColors
                const colorMatchExpression = ['match', ['get', 'zone_type']];
                if (zoningColors) {
                    Object.entries(zoningColors).forEach(([zone, color]) => {
                        colorMatchExpression.push(zone, color);
                    });
                }
                colorMatchExpression.push('#cccccc'); // Default color

                console.log('Main Plan Color Expression:', colorMatchExpression.slice(0, 20)); // Log first 20 entries
                console.log('Total zones with colors:', Object.keys(zoningColors || {}).length);

                // Build filter expression based on selectedMainPlanZones
                let filterExpression = null;
                if (selectedMainPlanZones && selectedMainPlanZones.length > 0) {
                    filterExpression = ['in', ['get', 'zone_type'], ['literal', selectedMainPlanZones]];
                }

                map.current.addLayer({
                    id: 'main-plan-fill',
                    type: 'fill',
                    source: 'main-plan',
                    layout: { visibility: visibleLayers.mainPlan ? 'visible' : 'none' },
                    ...(filterExpression ? { filter: filterExpression } : {}),
                    paint: {
                        'fill-color': colorMatchExpression,
                        'fill-opacity': layerStyles.mainPlan ? layerStyles.mainPlan.opacity : 0.6,
                        'fill-outline-color': '#000000'
                    }
                });
            }
            // --- 1b. Villages (Polygon) ---
            if (layers.villages && !map.current.getSource('villages')) {
                map.current.addSource('villages', { type: 'geojson', data: layers.villages });
                map.current.addLayer({
                    id: 'villages-line',
                    type: 'line',
                    source: 'villages',
                    layout: { visibility: visibleLayers.villages ? 'visible' : 'none' },
                    paint: { 'line-color': '#cccccc', 'line-width': 1, 'line-opacity': 0.2 }
                });

                // Add village name labels
                map.current.addLayer({
                    id: 'villages-labels',
                    type: 'symbol',
                    source: 'villages',
                    layout: {
                        'text-field': ['get', 'VNAME'],
                        'text-font': ['Open Sans Regular'],
                        'text-size': 10,
                        'text-anchor': 'center',
                        'text-allow-overlap': false,
                        visibility: (visibleLayers.villages && showVillageLabels) ? 'visible' : 'none'
                    },
                    paint: {
                        'text-color': '#eee',
                        'text-halo-color': '#333',
                        'text-halo-width': 1
                    }
                });
            }

            // --- 2. Roads (Polygon) ---
            if (layers.roads && !map.current.getSource('roads')) {
                map.current.addSource('roads', { type: 'geojson', data: layers.roads });
                map.current.addLayer({
                    id: 'roads-fill',
                    type: 'fill',
                    source: 'roads',
                    layout: { visibility: visibleLayers.roads ? 'visible' : 'none' },
                    paint: { 'fill-color': '#ffffff', 'fill-opacity': 1.0 }
                });
            }

            // --- 3a. Sidewalks Marked (標線型人行道) ---
            if (layers.sidewalksMarked && !map.current.getSource('sidewalks-marked')) {
                map.current.addSource('sidewalks-marked', { type: 'geojson', data: layers.sidewalksMarked });
                map.current.addLayer({
                    id: 'sidewalks-marked-fill',
                    type: 'fill',
                    source: 'sidewalks-marked',
                    layout: { visibility: visibleLayers.sidewalksMarked ? 'visible' : 'none' },
                    paint: { 'fill-color': '#2ecc71', 'fill-opacity': 0.4 }
                });
            }

            // --- 3b. Sidewalks Physical (實體人行道) ---
            if (layers.sidewalksPhysical && !map.current.getSource('sidewalks-physical')) {
                map.current.addSource('sidewalks-physical', { type: 'geojson', data: layers.sidewalksPhysical });
                map.current.addLayer({
                    id: 'sidewalks-physical-fill',
                    type: 'fill',
                    source: 'sidewalks-physical',
                    layout: { visibility: visibleLayers.sidewalksPhysical ? 'visible' : 'none' },
                    paint: { 'fill-color': '#3498db', 'fill-opacity': 0.5 }
                });
            }

            // --- 4. Grid (Hexagon) ---
            if (layers.grid && !map.current.getSource('grid')) {
                map.current.addSource('grid', {
                    type: 'geojson',
                    data: layers.grid,
                    promoteId: 'hex_id' // Ensure we can identify features by ID for state
                });
                map.current.addLayer({
                    id: 'grid-fill',
                    type: 'fill',
                    source: 'grid',
                    layout: { visibility: visibleLayers.grid ? 'visible' : 'none' },
                    paint: {
                        'fill-color': [
                            'interpolate', ['linear'], ['get', `score_${scoringMode}`],
                            0, '#2c3e50',
                            5, '#e67e22',
                            10, '#f1c40f'
                        ],
                        'fill-opacity': [
                            'case',
                            ['boolean', ['feature-state', 'hover'], false],
                            0.9, // Higher opacity on hover
                            0.8  // Default opacity
                        ],
                        'fill-outline-color': 'rgba(255,255,255,0.05)'
                    }
                });

                // Add Highlight Layer (Stroke)
                map.current.addLayer({
                    id: 'grid-highlight',
                    type: 'line',
                    source: 'grid',
                    layout: { visibility: visibleLayers.grid ? 'visible' : 'none' },
                    paint: {
                        'line-color': '#ffffff',
                        'line-width': [
                            'case',
                            ['boolean', ['feature-state', 'selected'], false], 3, // Selected width
                            ['boolean', ['feature-state', 'hover'], false], 2,   // Hover width
                            0 // Default width (hidden)
                        ],
                        'line-opacity': [
                            'case',
                            ['boolean', ['feature-state', 'selected'], false], 1,
                            ['boolean', ['feature-state', 'hover'], false], 0.8,
                            0
                        ]
                    }
                });

                if (!listenersBound.current) {
                    // Click event for Grid
                    map.current.on('click', 'grid-fill', (e) => {
                        if (e.features.length > 0) {
                            const feature = e.features[0];
                            onSelectFeature({ ...feature.properties, type: 'hex' });
                        }
                    });

                    // Hover effects for Grid
                    map.current.on('mousemove', 'grid-fill', (e) => {
                        map.current.getCanvas().style.cursor = 'pointer';
                        if (e.features.length > 0) {
                            if (hoveredHexId.current !== null) {
                                map.current.setFeatureState(
                                    { source: 'grid', id: hoveredHexId.current },
                                    { hover: false }
                                );
                            }
                            hoveredHexId.current = e.features[0].id;
                            map.current.setFeatureState(
                                { source: 'grid', id: hoveredHexId.current },
                                { hover: true }
                            );
                        }
                    });

                    map.current.on('mouseleave', 'grid-fill', () => {
                        map.current.getCanvas().style.cursor = '';
                        if (hoveredHexId.current !== null) {
                            map.current.setFeatureState(
                                { source: 'grid', id: hoveredHexId.current },
                                { hover: false }
                            );
                        }
                        hoveredHexId.current = null;
                    });
                }
            }

            // --- 5. MRT Lines (Line) ---
            if (layers.mrtLines && !map.current.getSource('mrt-lines')) {
                map.current.addSource('mrt-lines', { type: 'geojson', data: layers.mrtLines });
                map.current.addLayer({
                    id: 'mrt-lines-layer',
                    type: 'line',
                    source: 'mrt-lines',
                    layout: { visibility: visibleLayers.mrtLines ? 'visible' : 'none' },
                    paint: {
                        'line-color': [
                            'match', ['get', 'RouteName'],
                            ['淡水線', '信義線', '新北投支線'], '#e3002c', // Red (Tamsui-Xinyi)
                            ['板橋線', '南港線', '土城線'], '#0070bd',     // Blue (Bannan)
                            ['木柵線', '內湖線'], '#c48c31',               // Brown (Wenhu)
                            ['新店線', '小南門線', '松山線', '碧潭支線'], '#008659', // Green (Songshan-Xindian)
                            ['中和線', '新莊線', '蘆洲線'], '#f8b61c',     // Orange (Zhonghe-Xinlu)
                            ['環狀線'], '#ffdb00',                         // Yellow (Circular)
                            '#95a5a6'                                     // Default Gray
                        ],
                        'line-width': 3
                    }
                });
            }

            // --- 6. MRT Stations (Point) ---
            if (layers.mrtStations && !map.current.getSource('mrt-stations')) {
                map.current.addSource('mrt-stations', { type: 'geojson', data: layers.mrtStations });
                map.current.addLayer({
                    id: 'mrt-stations-layer',
                    type: 'circle',
                    source: 'mrt-stations',
                    layout: { visibility: visibleLayers.mrtStations ? 'visible' : 'none' },
                    paint: { 'circle-radius': 5, 'circle-color': '#ffffff', 'circle-stroke-width': 2, 'circle-stroke-color': '#e74c3c' }
                });
            }

            // --- 7. Bus Stops (Point) ---
            if (layers.busStops && !map.current.getSource('bus-stops')) {
                map.current.addSource('bus-stops', { type: 'geojson', data: layers.busStops });
                map.current.addLayer({
                    id: 'bus-stops-layer',
                    type: 'circle',
                    source: 'bus-stops',
                    layout: { visibility: visibleLayers.busStops ? 'visible' : 'none' },
                    paint: {
                        'circle-radius': 2.5,
                        'circle-color': '#f39c12',
                        'circle-opacity': 0.8,
                        'circle-stroke-width': 1,
                        'circle-stroke-color': '#ffffff',
                        'circle-stroke-opacity': 0.6
                    }
                });
            }

            // --- 8. Trees (Point) ---
            if (layers.trees && !map.current.getSource('trees')) {
                map.current.addSource('trees', { type: 'geojson', data: layers.trees });
                map.current.addLayer({
                    id: 'trees-layer',
                    type: 'circle',
                    source: 'trees',
                    layout: { visibility: visibleLayers.trees ? 'visible' : 'none' },
                    paint: {
                        'circle-radius': [
                            'interpolate', ['linear'], ['zoom'],
                            11, 0.5,
                            15, ['*', ['get', '樹徑'], 0.05]
                        ],
                        'circle-color': [
                            'match',
                            ['get', 'type'],
                            'protected', '#f1c40f',
                            layerStyles.trees.color
                        ],
                        'circle-opacity': layerStyles.trees.opacity,
                        'circle-stroke-width': 0,
                        'circle-stroke-color': '#ffffff'
                    }
                });

                if (!listenersBound.current) {
                    // Click event for Trees
                    map.current.on('click', 'trees-layer', (e) => {
                        if (e.features.length > 0) {
                            const feature = e.features[0];
                            const props = feature.properties;

                            const coordinates = feature.geometry.coordinates.slice();
                            const isProtected = props.type === 'protected';
                            const typeLabel = isProtected ? '受保護樹木 (Protected)' : '一般行道樹 (Normal)';
                            const typeColor = isProtected ? '#f1c40f' : '#2ecc71';

                            const htmlContent = `
                            <div style="font-family: sans-serif; font-size: 12px; line-height: 1.5; color: #333;">
                                <strong style="color: ${typeColor}; font-size: 14px;">${typeLabel}</strong><br/>
                                <strong>Name:</strong> ${props.name}<br/>
                                <strong>Address:</strong> ${props.address}<br/>
                                <strong>Diameter:</strong> ${props.樹徑} cm<br/>
                                ${props.health && props.health !== 'N/A' ? `<strong>Health:</strong> ${props.health}` : ''}
                            </div>
                        `;

                            new maplibregl.Popup()
                                .setLngLat(coordinates)
                                .setHTML(htmlContent)
                                .addTo(map.current);

                            onSelectFeature({ ...props, type: 'tree' });
                        }
                    });

                    // Change cursor on hover (Trees)
                    map.current.on('mouseenter', 'trees-layer', () => {
                        map.current.getCanvas().style.cursor = 'pointer';
                    });
                    map.current.on('mouseleave', 'trees-layer', () => {
                        map.current.getCanvas().style.cursor = '';
                    });
                }
            }

            // --- 9. Parks (Polygon) ---
            if (layers.parks && !map.current.getSource('parks')) {
                map.current.addSource('parks', { type: 'geojson', data: layers.parks });
                map.current.addLayer({
                    id: 'parks-fill',
                    type: 'fill',
                    source: 'parks',
                    layout: { visibility: visibleLayers.parks ? 'visible' : 'none' },
                    paint: {
                        'fill-color': layerStyles.parks.color,
                        'fill-opacity': layerStyles.parks.opacity
                    }
                });
            }

            // --- 10. Agriculture (Polygon) ---
            if (layers.agriculture && !map.current.getSource('agriculture')) {
                map.current.addSource('agriculture', { type: 'geojson', data: layers.agriculture });
                map.current.addLayer({
                    id: 'agriculture-fill',
                    type: 'fill',
                    source: 'agriculture',
                    layout: { visibility: visibleLayers.agriculture ? 'visible' : 'none' },
                    paint: {
                        'fill-color': layerStyles.agriculture.color,
                        'fill-opacity': layerStyles.agriculture.opacity
                    }
                });
            }

            // --- 11. Bird Protection (Polygon) ---
            if (layers.birdProtection && !map.current.getSource('bird-protection')) {
                map.current.addSource('bird-protection', { type: 'geojson', data: layers.birdProtection });
                map.current.addLayer({
                    id: 'bird-protection-fill',
                    type: 'fill',
                    source: 'bird-protection',
                    layout: { visibility: visibleLayers.birdProtection ? 'visible' : 'none' },
                    paint: {
                        'fill-color': layerStyles.birdProtection.color,
                        'fill-opacity': layerStyles.birdProtection.opacity
                    }
                });
            }

            // --- 12. Nature Protection (Polygon) ---
            if (layers.natureProtection && !map.current.getSource('nature-protection')) {
                map.current.addSource('nature-protection', { type: 'geojson', data: layers.natureProtection });
                map.current.addLayer({
                    id: 'nature-protection-fill',
                    type: 'fill',
                    source: 'nature-protection',
                    layout: { visibility: visibleLayers.natureProtection ? 'visible' : 'none' },
                    paint: {
                        'fill-color': layerStyles.natureProtection.color,
                        'fill-opacity': layerStyles.natureProtection.opacity
                    }
                });
            }

            // Villages listeners (if not bound)
            if (layers.villages && !listenersBound.current) {
                // Click event for Villages
                map.current.on('click', 'villages-line', (e) => {
                    if (e.features.length > 0) {
                        const props = e.features[0].properties;
                        const htmlContent = `
                            <div style="font-family: 'Noto Sans TC', sans-serif; font-size: 12px; line-height: 1.5; color: #333;">
                                <strong style="color: #3498db; font-size: 14px;">里界 (Village)</strong><br/>
                                <strong>里名:</strong> ${props.VNAME || 'N/A'}<br/>
                                <strong>行政區:</strong> ${props.TNAME || 'N/A'}<br/>
                            </div>
                        `;
                        new maplibregl.Popup()
                            .setLngLat(e.lngLat)
                            .setHTML(htmlContent)
                            .addTo(map.current);
                    }
                });

                // Change cursor on hover (Villages)
                map.current.on('mouseenter', 'villages-line', () => {
                    map.current.getCanvas().style.cursor = 'pointer';
                });
                map.current.on('mouseleave', 'villages-line', () => {
                    map.current.getCanvas().style.cursor = '';
                });
            }

            // Main Plan listeners (if not bound)
            if (layers.mainPlan && !listenersBound.current) {
                // Click event for Main Plan
                map.current.on('click', 'main-plan-fill', (e) => {
                    if (e.features.length > 0) {
                        const props = e.features[0].properties;
                        const zoneType = props.zone_type || 'N/A';
                        const color = zoningColors[zoneType] || '#cccccc';

                        const htmlContent = `
                            <div style="font-family: 'Noto Sans TC', sans-serif; font-size: 12px; line-height: 1.5; color: #333;">
                                <div style="display: flex; align-items: center; margin-bottom: 8px;">
                                    <div style="width: 16px; height: 16px; background-color: ${color}; border: 1px solid #666; margin-right: 8px;"></div>
                                    <strong style="color: #2c3e50; font-size: 14px;">主要計畫分區</strong>
                                </div>
                                <strong>分區類型:</strong> ${zoneType}<br/>
                                ${props.使用分區 ? `<strong>原始分區:</strong> ${props.使用分區}<br/>` : ''}
                                ${props.分區說明 ? `<strong>說明:</strong> ${props.分區說明}<br/>` : ''}
                            </div>
                        `;

                        new maplibregl.Popup()
                            .setLngLat(e.lngLat)
                            .setHTML(htmlContent)
                            .addTo(map.current);
                    }
                });

                // Change cursor on hover (Main Plan)
                map.current.on('mouseenter', 'main-plan-fill', () => {
                    map.current.getCanvas().style.cursor = 'pointer';
                });
                map.current.on('mouseleave', 'main-plan-fill', () => {
                    map.current.getCanvas().style.cursor = '';
                });
            }

            listenersBound.current = true;
        };

        addLayers();
    }, [isLoaded, layers, visibleLayers, layerStyles, scoringMode]);

    // Update Main Plan Filter
    useEffect(() => {
        if (!map.current || !isLoaded || !map.current.getLayer('main-plan-fill')) return;

        let filterExpression = null;
        if (selectedMainPlanZones && selectedMainPlanZones.length > 0) {
            filterExpression = ['in', ['get', 'zone_type'], ['literal', selectedMainPlanZones]];
        }

        map.current.setFilter('main-plan-fill', filterExpression);
        console.log('Updated Main Plan Filter:', filterExpression);
    }, [selectedMainPlanZones, isLoaded]);

    // Update Visibility and Layer Order
    useEffect(() => {
        if (!map.current || !isLoaded) return; // Wait for load

        const setVisibility = (id, visible) => {
            if (map.current.getLayer(id)) {
                map.current.setLayoutProperty(id, 'visibility', visible ? 'visible' : 'none');
            }
        };

        setVisibility('grid-fill', visibleLayers.grid);
        setVisibility('districts-line', visibleLayers.districts);
        setVisibility('districts-labels', visibleLayers.districts && showDistrictLabels); // Update district labels visibility
        setVisibility('villages-line', visibleLayers.villages);
        setVisibility('villages-labels', visibleLayers.villages && showVillageLabels); // Add villages labels visibility
        setVisibility('main-plan-fill', visibleLayers.mainPlan); // Add Main Plan visibility
        setVisibility('mrt-lines-layer', visibleLayers.mrtLines);
        setVisibility('mrt-stations-layer', visibleLayers.mrtStations);
        setVisibility('bus-stops-layer', visibleLayers.busStops);
        setVisibility('trees-layer', visibleLayers.trees);
        setVisibility('parks-fill', visibleLayers.parks);
        setVisibility('agriculture-fill', visibleLayers.agriculture);
        setVisibility('bird-protection-fill', visibleLayers.birdProtection);
        setVisibility('nature-protection-fill', visibleLayers.natureProtection);
        setVisibility('roads-fill', visibleLayers.roads);
        setVisibility('sidewalks-marked-fill', visibleLayers.sidewalksMarked);
        setVisibility('sidewalks-physical-fill', visibleLayers.sidewalksPhysical);

        // MapLibre draws layers in order, so the last one added is on top.
        // moveLayer(id, beforeId) moves 'id' before 'beforeId'.
        // If 'beforeId' is undefined, 'id' is moved to the top.

        // We want the first item in layerOrder to be on top.
        // So we iterate from the last item to the first, moving each to the top.
        // This way, the first item in the array ends up being moved to the top last, staying on top.

        // However, some logical layers map to multiple map layers (e.g., districts-line).
        // We need a mapping from logical layer ID to actual map layer IDs.
        const layerMap = {
            'mrtStations': ['mrt-stations-layer'],
            'busStops': ['bus-stops-layer'],
            'trees': ['trees-layer'],
            'parks': ['parks-fill'],
            'agriculture': ['agriculture-fill'],
            'birdProtection': ['bird-protection-fill'],
            'natureProtection': ['nature-protection-fill'],
            'mrtLines': ['mrt-lines-layer'],
            'roads': ['roads-fill'],
            'sidewalksMarked': ['sidewalks-marked-fill'],
            'sidewalksPhysical': ['sidewalks-physical-fill'],
            'grid': ['grid-fill'],
            'villages': ['villages-line'], // Add villages to layer map
            'districts': ['districts-line'],
            'mainPlan': ['main-plan-fill']
        };

        // Reverse iterate to stack from bottom to top
        [...layerOrder].reverse().forEach(layerKey => {
            if (layerKey === 'grid') return; // Skip grid, it should stay at the bottom

            const mapLayerIds = layerMap[layerKey];
            if (mapLayerIds) {
                mapLayerIds.forEach(id => {
                    if (map.current.getLayer(id)) {
                        map.current.moveLayer(id);
                    }
                });
            }
        });

        // Explicitly move grid to bottom if needed, but since we moved everything else up, 
        // grid should naturally be at the bottom if it was added early. 
        // To be safe, we can move it to the bottom (before the first layer).
        // But maplibregl doesn't have 'moveToBottom'. 
        // The strategy of moving everything else to top works best.

        // Update grid if moved to top
        if (map.current.getLayer('grid-fill')) {
            map.current.moveLayer('grid-fill', layerMap['districts'][0]);
        }
    }, [visibleLayers, layerOrder, isLoaded, showDistrictLabels, showVillageLabels]);

    // Update Main Plan filter when selectedMainPlanZones changes
    useEffect(() => {
        if (!map.current || !isLoaded) return;

        if (map.current.getLayer('main-plan-fill')) {
            let filterExpression = null;
            if (selectedMainPlanZones && selectedMainPlanZones.length > 0) {
                filterExpression = ['in', ['get', 'zone_type'], ['literal', selectedMainPlanZones]];
            }
            map.current.setFilter('main-plan-fill', filterExpression);
        }
    }, [selectedMainPlanZones, isLoaded]);

    // Update Layer Styles (Color & Opacity)
    useEffect(() => {
        if (!map.current || !isLoaded || !layerStyles) return;

        // Grid
        if (map.current.getLayer('grid-fill')) {
            map.current.setPaintProperty('grid-fill', 'fill-opacity', layerStyles.grid.opacity);
        }

        // Districts
        if (map.current.getLayer('districts-line')) {
            map.current.setPaintProperty('districts-line', 'line-color', layerStyles.districts.color);
            map.current.setPaintProperty('districts-line', 'line-opacity', layerStyles.districts.opacity);
        }

        // Villages
        if (map.current.getLayer('villages-line')) {
            map.current.setPaintProperty('villages-line', 'line-color', layerStyles.villages.color);
            map.current.setPaintProperty('villages-line', 'line-opacity', layerStyles.villages.opacity);
        }

        // Main Plan
        if (map.current.getLayer('main-plan-fill')) {
            map.current.setPaintProperty('main-plan-fill', 'fill-opacity', layerStyles.mainPlan.opacity);
        }

        // MRT Lines (only opacity, color is data-driven based on RouteName)
        if (map.current.getLayer('mrt-lines-layer')) {
            map.current.setPaintProperty('mrt-lines-layer', 'line-opacity', layerStyles.mrtLines.opacity);
        }

        // MRT Stations
        if (map.current.getLayer('mrt-stations-layer')) {
            map.current.setPaintProperty('mrt-stations-layer', 'circle-stroke-color', layerStyles.mrtStations.color);
            map.current.setPaintProperty('mrt-stations-layer', 'circle-opacity', layerStyles.mrtStations.opacity);
            map.current.setPaintProperty('mrt-stations-layer', 'circle-stroke-opacity', layerStyles.mrtStations.opacity);
        }

        // Bus Stops
        if (map.current.getLayer('bus-stops-layer')) {
            map.current.setPaintProperty('bus-stops-layer', 'circle-color', layerStyles.busStops.color);
            map.current.setPaintProperty('bus-stops-layer', 'circle-opacity', layerStyles.busStops.opacity);
        }

        // Trees
        if (map.current.getLayer('trees-layer')) {
            map.current.setPaintProperty('trees-layer', 'circle-color', [
                'match',
                ['get', 'type'],
                'protected', '#f1c40f',
                layerStyles.trees.color
            ]);
            map.current.setPaintProperty('trees-layer', 'circle-opacity', layerStyles.trees.opacity);
        }

        // Parks
        if (map.current.getLayer('parks-fill')) {
            map.current.setPaintProperty('parks-fill', 'fill-color', layerStyles.parks.color);
            map.current.setPaintProperty('parks-fill', 'fill-opacity', layerStyles.parks.opacity);
        }

        // Agriculture
        if (map.current.getLayer('agriculture-fill')) {
            map.current.setPaintProperty('agriculture-fill', 'fill-color', layerStyles.agriculture.color);
            map.current.setPaintProperty('agriculture-fill', 'fill-opacity', layerStyles.agriculture.opacity);
        }

        // Bird Protection
        if (map.current.getLayer('bird-protection-fill')) {
            map.current.setPaintProperty('bird-protection-fill', 'fill-color', layerStyles.birdProtection.color);
            map.current.setPaintProperty('bird-protection-fill', 'fill-opacity', layerStyles.birdProtection.opacity);
        }

        // Nature Protection
        if (map.current.getLayer('nature-protection-fill')) {
            map.current.setPaintProperty('nature-protection-fill', 'fill-color', layerStyles.natureProtection.color);
            map.current.setPaintProperty('nature-protection-fill', 'fill-opacity', layerStyles.natureProtection.opacity);
        }

        // Roads
        if (map.current.getLayer('roads-fill')) {
            map.current.setPaintProperty('roads-fill', 'fill-color', layerStyles.roads.color);
            map.current.setPaintProperty('roads-fill', 'fill-opacity', layerStyles.roads.opacity);
        }

        // Sidewalks Marked
        if (map.current.getLayer('sidewalks-marked-fill')) {
            map.current.setPaintProperty('sidewalks-marked-fill', 'fill-color', layerStyles.sidewalksMarked.color);
            map.current.setPaintProperty('sidewalks-marked-fill', 'fill-opacity', layerStyles.sidewalksMarked.opacity);
        }

        // Sidewalks Physical
        if (map.current.getLayer('sidewalks-physical-fill')) {
            map.current.setPaintProperty('sidewalks-physical-fill', 'fill-color', layerStyles.sidewalksPhysical.color);
            map.current.setPaintProperty('sidewalks-physical-fill', 'fill-opacity', layerStyles.sidewalksPhysical.opacity);
        }

    }, [layerStyles]);

    // Update Grid Color based on Scoring Mode
    useEffect(() => {
        if (!map.current || !isLoaded || !scoringMode) return;

        if (map.current.getLayer('grid-fill')) {
            // Define color schemes for each scoring mode
            let colorScheme;

            if (scoringMode === 'commuter') {
                // Pink gradient (light to dark pink)
                colorScheme = [
                    'interpolate', ['linear'], ['get', `score_${scoringMode}`],
                    0, '#f5e6f0',   // Very light pink
                    3, '#e8b4d4',   // Light pink
                    5, '#db82b8',   // Medium pink
                    7, '#ce509c',   // Dark pink
                    10, '#c11e80'   // Very dark pink
                ];
            } else if (scoringMode === 'stroller') {
                // Green gradient (light to dark green)
                colorScheme = [
                    'interpolate', ['linear'], ['get', `score_${scoringMode}`],
                    0, '#e8f5e9',   // Very light green
                    3, '#a5d6a7',   // Light green
                    5, '#66bb6a',   // Medium green
                    7, '#43a047',   // Dark green
                    10, '#2e7d32'   // Very dark green
                ];
            } else if (scoringMode === 'pedestrian') {
                // Blue gradient (light to dark blue)
                colorScheme = [
                    'interpolate', ['linear'], ['get', `score_${scoringMode}`],
                    0, '#e3f2fd',   // Very light blue
                    3, '#90caf9',   // Light blue
                    5, '#42a5f5',   // Medium blue
                    7, '#1e88e5',   // Dark blue
                    10, '#1565c0'   // Very dark blue
                ];
            } else {
                // Default yellow/orange gradient (original)
                colorScheme = [
                    'interpolate', ['linear'], ['get', 'score'],
                    0, '#2c3e50',
                    5, '#e67e22',
                    10, '#f1c40f'
                ];
            }

            map.current.setPaintProperty('grid-fill', 'fill-color', colorScheme);
        }
    }, [scoringMode, isLoaded]);

    // Handle Search Location
    useEffect(() => {
        if (!map.current || !searchLocation) return;

        // Remove previous marker if exists
        if (searchMarker.current) {
            searchMarker.current.remove();
        }

        // Add new marker
        searchMarker.current = new maplibregl.Marker({ color: '#f1c40f' })
            .setLngLat([searchLocation.lon, searchLocation.lat])
            .addTo(map.current);

        // Fly to location
        map.current.flyTo({
            center: [searchLocation.lon, searchLocation.lat],
            zoom: 15,
            duration: 2000
        });

    }, [searchLocation]);

    // Handle Uploaded Layers
    useEffect(() => {
        if (!map.current || !map.current.isStyleLoaded() || !uploadedLayers) return;

        // Get current uploaded layer IDs
        const currentIds = new Set(uploadedLayers.map(l => `uploaded-${l.id}`));

        // Remove layers that are no longer in the array
        uploadedLayerIds.current.forEach(id => {
            if (!currentIds.has(id)) {
                if (map.current.getLayer(id)) {
                    map.current.removeLayer(id);
                }
                if (map.current.getSource(id)) {
                    map.current.removeSource(id);
                }
                uploadedLayerIds.current.delete(id);
            }
        });

        // Add or update layers
        uploadedLayers.forEach(layer => {
            const layerId = `uploaded-${layer.id}`;
            const sourceId = layerId;

            // Determine geometry type from first feature
            const firstFeature = layer.data.features?.[0];
            const geomType = firstFeature?.geometry?.type;

            // Add source if it doesn't exist
            if (!map.current.getSource(sourceId)) {
                map.current.addSource(sourceId, {
                    type: 'geojson',
                    data: layer.data
                });
            } else {
                // Update source data
                map.current.getSource(sourceId).setData(layer.data);
            }

            // Add layer if it doesn't exist
            if (!map.current.getLayer(layerId)) {
                let layerConfig = {
                    id: layerId,
                    source: sourceId,
                    layout: { visibility: layer.visible ? 'visible' : 'none' }
                };

                // Configure based on geometry type
                if (geomType?.includes('Polygon')) {
                    layerConfig.type = 'fill';
                    layerConfig.paint = {
                        'fill-color': layer.color,
                        'fill-opacity': layer.opacity,
                        'fill-outline-color': layer.color
                    };
                } else if (geomType?.includes('LineString')) {
                    layerConfig.type = 'line';
                    layerConfig.paint = {
                        'line-color': layer.color,
                        'line-width': 2,
                        'line-opacity': layer.opacity
                    };
                } else if (geomType?.includes('Point')) {
                    layerConfig.type = 'circle';
                    layerConfig.paint = {
                        'circle-radius': 5,
                        'circle-color': layer.color,
                        'circle-opacity': layer.opacity,
                        'circle-stroke-width': 1,
                        'circle-stroke-color': '#ffffff'
                    };
                }

                map.current.addLayer(layerConfig);
                uploadedLayerIds.current.add(layerId);
            } else {
                // Update visibility
                map.current.setLayoutProperty(layerId, 'visibility', layer.visible ? 'visible' : 'none');

                // Update style
                const geomType = firstFeature?.geometry?.type;
                if (geomType?.includes('Polygon')) {
                    map.current.setPaintProperty(layerId, 'fill-color', layer.color);
                    map.current.setPaintProperty(layerId, 'fill-opacity', layer.opacity);
                } else if (geomType?.includes('LineString')) {
                    map.current.setPaintProperty(layerId, 'line-color', layer.color);
                    map.current.setPaintProperty(layerId, 'line-opacity', layer.opacity);
                } else if (geomType?.includes('Point')) {
                    map.current.setPaintProperty(layerId, 'circle-color', layer.color);
                    map.current.setPaintProperty(layerId, 'circle-opacity', layer.opacity);
                }
            }
        });

    }, [uploadedLayers]);

    // Handle Basemap Switching
    useEffect(() => {
        if (!map.current || !basemapUrl) return;

        // Save current state
        const currentCenter = map.current.getCenter();
        const currentZoom = map.current.getZoom();
        const currentPitch = map.current.getPitch();
        const currentBearing = map.current.getBearing();

        // Set isLoaded to false to prevent layer effects from running prematurely
        setIsLoaded(false);

        // Set new style
        map.current.setStyle(basemapUrl);

        // Restore camera position after style loads
        map.current.once('styledata', () => {
            map.current.jumpTo({
                center: currentCenter,
                zoom: currentZoom,
                pitch: currentPitch,
                bearing: currentBearing
            });

            // Mark as loaded to trigger layer re-initialization
            setIsLoaded(true);
        });

    }, [basemapUrl]);

    // Handle Map Labels Visibility
    useEffect(() => {
        if (!map.current || !map.current.isStyleLoaded()) return;

        // This will hide/show all label layers in the basemap
        const style = map.current.getStyle();
        if (!style || !style.layers) return;

        style.layers.forEach(layer => {
            // Check if it's a symbol/text layer (labels)
            if (layer.type === 'symbol' && layer.layout && layer.layout['text-field']) {
                map.current.setLayoutProperty(
                    layer.id,
                    'visibility',
                    showMapLabels ? 'visible' : 'none'
                );
            }
        });

    }, [showMapLabels]);

    // Handle Selection State
    const selectedHexId = useRef(null);

    useEffect(() => {
        if (!map.current || !isLoaded) return;

        // Clear previous selection
        if (selectedHexId.current !== null) {
            if (map.current.getSource('grid')) {
                map.current.setFeatureState(
                    { source: 'grid', id: selectedHexId.current },
                    { selected: false }
                );
            }
            selectedHexId.current = null;
        }

        // Set new selection
        if (selectedFeature && selectedFeature.type === 'hex' && selectedFeature.hex_id) {
            selectedHexId.current = selectedFeature.hex_id;
            if (map.current.getSource('grid')) {
                map.current.setFeatureState(
                    { source: 'grid', id: selectedHexId.current },
                    { selected: true }
                );
            }
        }
    }, [selectedFeature, isLoaded]);

    return (
        <div ref={mapContainer} style={{ width: '100%', height: '100%', position: 'relative' }}>
            {!isLoaded && (
                <div style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    background: 'rgba(0, 0, 0, 0.7)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 2000,
                    color: '#fff',
                    backdropFilter: 'blur(4px)'
                }}>
                    <div style={{
                        width: '40px',
                        height: '40px',
                        border: '4px solid rgba(255, 255, 255, 0.3)',
                        borderTop: '4px solid #f1c40f',
                        borderRadius: '50%',
                        animation: 'spin 1s linear infinite',
                        marginBottom: '16px'
                    }} />
                    <div style={{ fontSize: '16px', fontWeight: '500', letterSpacing: '1px' }}>
                        載入地圖資料中...
                    </div>
                    <div style={{ fontSize: '12px', color: '#aaa', marginTop: '8px' }}>
                        Loading Map Data...
                    </div>
                    <style>{`
                        @keyframes spin {
                            0% { transform: rotate(0deg); }
                            100% { transform: rotate(360deg); }
                        }
                    `}</style>
                </div>
            )}
        </div>
    );
}
