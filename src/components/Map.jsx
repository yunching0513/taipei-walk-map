import { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

export default function Map({ layers, visibleLayers, layerStyles, layerOrder, scoringMode, searchLocation, uploadedLayers, treesData, onSelectFeature }) {
    const mapContainer = useRef(null);
    const map = useRef(null);
    const searchMarker = useRef(null);
    const uploadedLayerIds = useRef(new Set());

    const [isLoaded, setIsLoaded] = useState(false);

    useEffect(() => {
        if (map.current) return;

        map.current = new maplibregl.Map({
            container: mapContainer.current,
            style: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
            center: [121.54, 25.05],
            zoom: 12,
            pitch: 45,
        });

        map.current.addControl(new maplibregl.NavigationControl({ showCompass: true, showZoom: true }), 'bottom-right');
        map.current.addControl(new maplibregl.ScaleControl({ maxWidth: 100, unit: 'metric' }), 'bottom-right');

        map.current.on('load', () => {
            // --- 1. Districts (Polygon) ---
            if (layers.districts) {
                map.current.addSource('districts', { type: 'geojson', data: layers.districts });
                map.current.addLayer({
                    id: 'districts-line',
                    type: 'line',
                    source: 'districts',
                    layout: { visibility: visibleLayers.districts ? 'visible' : 'none' },
                    paint: { 'line-color': '#ffffff', 'line-width': 2, 'line-opacity': 0.3 }
                });

                // Add district name labels
                map.current.addLayer({
                    id: 'districts-labels',
                    type: 'symbol',
                    source: 'districts',
                    layout: {
                        'text-field': ['get', 'TOWNNAME'],
                        'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
                        'text-size': 10,
                        'text-anchor': 'center',
                        visibility: visibleLayers.districts ? 'visible' : 'none'
                    },
                    paint: {
                        'text-color': '#fff',
                        'text-halo-color': '#000',
                        'text-halo-width': 1.5
                    }
                });
            }

            // --- 1b. Villages (Polygon) ---
            if (layers.villages) {
                map.current.addSource('villages', { type: 'geojson', data: layers.villages });
                map.current.addLayer({
                    id: 'villages-line',
                    type: 'line',
                    source: 'villages',
                    layout: { visibility: visibleLayers.villages ? 'visible' : 'none' },
                    paint: { 'line-color': '#cccccc', 'line-width': 1, 'line-opacity': 0.2 }
                });
            }

            // --- 2. Roads (Polygon) ---
            if (layers.roads) {
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
            if (layers.sidewalksMarked) {
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
            if (layers.sidewalksPhysical) {
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
            if (layers.grid) {
                map.current.addSource('grid', { type: 'geojson', data: layers.grid });
                map.current.addLayer({
                    id: 'grid-fill',
                    type: 'fill',
                    source: 'grid',
                    layout: { visibility: visibleLayers.grid ? 'visible' : 'none' },
                    paint: {
                        'fill-color': [
                            'interpolate', ['linear'], ['get', 'score'], // Default to 'score' initially
                            0, '#2c3e50',
                            5, '#e67e22',
                            10, '#f1c40f'
                        ],
                        'fill-opacity': 0.8,
                        'fill-outline-color': 'rgba(255,255,255,0.05)'
                    }
                });

                // Click event for Grid
                map.current.on('click', 'grid-fill', (e) => {
                    if (e.features.length > 0) {
                        const feature = e.features[0];
                        onSelectFeature({ ...feature.properties, type: 'hex' }); // Add type identifier
                    }
                });

                // Click event for Trees
                map.current.on('click', 'trees-layer', (e) => {
                    if (e.features.length > 0) {
                        const feature = e.features[0];
                        const props = feature.properties;

                        // Create Popup
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

                        // Also select feature for sidebar (optional, but good for consistency)
                        onSelectFeature({ ...props, type: 'tree' });
                    }
                });

                // Change cursor on hover (Grid)
                map.current.on('mouseenter', 'grid-fill', () => {
                    map.current.getCanvas().style.cursor = 'pointer';
                });
                map.current.on('mouseleave', 'grid-fill', () => {
                    map.current.getCanvas().style.cursor = '';
                });

                // Change cursor on hover (Trees)
                map.current.on('mouseenter', 'trees-layer', () => {
                    map.current.getCanvas().style.cursor = 'pointer';
                });
                map.current.on('mouseleave', 'trees-layer', () => {
                    map.current.getCanvas().style.cursor = '';
                });

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

            // --- 5. MRT Lines (Line) ---
            if (layers.mrtLines) {
                map.current.addSource('mrt-lines', { type: 'geojson', data: layers.mrtLines });
                map.current.addLayer({
                    id: 'mrt-lines-layer',
                    type: 'line',
                    source: 'mrt-lines',
                    layout: { visibility: visibleLayers.mrtLines ? 'visible' : 'none' },
                    paint: {
                        'line-color': [
                            'match', ['get', 'RouteName'],
                            '淡水信義線', '#e74c3c',
                            '板南線', '#3498db',
                            '文湖線', '#9b59b6',
                            '松山新店線', '#2ecc71',
                            '中和新蘆線', '#f1c40f',
                            '環狀線', '#f39c12',
                            '#95a5a6' // default
                        ],
                        'line-width': 3
                    }
                });
            }

            // --- 6. MRT Stations (Point) ---
            if (layers.mrtStations) {
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
            if (layers.busStops) {
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
            if (layers.trees) {
                map.current.addSource('trees', { type: 'geojson', data: layers.trees });
                map.current.addLayer({
                    id: 'trees-layer',
                    type: 'circle',
                    source: 'trees',
                    layout: { visibility: visibleLayers.trees ? 'visible' : 'none' },
                    paint: {
                        'circle-radius': [
                            'interpolate', ['linear'], ['zoom'],
                            11, 0.5, // Reduced from 1 to 0.5
                            15, ['*', ['get', '樹徑'], 0.05] // Reduced multiplier from 0.1 to 0.05
                        ],
                        'circle-color': [
                            'match',
                            ['get', 'type'],
                            'protected', '#f1c40f', // Gold for protected trees
                            layerStyles.trees.color // Default/User color for normal trees
                        ],
                        'circle-opacity': layerStyles.trees.opacity,
                        'circle-stroke-width': 0,
                        'circle-stroke-color': '#ffffff'
                    }
                });
            }

            setIsLoaded(true); // Mark as loaded
        });
    }, []);

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
        setVisibility('districts-labels', visibleLayers.districts); // Update district labels visibility
        setVisibility('villages-line', visibleLayers.villages); // Add villages visibility
        setVisibility('mrt-lines-layer', visibleLayers.mrtLines);
        setVisibility('mrt-stations-layer', visibleLayers.mrtStations);
        setVisibility('bus-stops-layer', visibleLayers.busStops);
        setVisibility('trees-layer', visibleLayers.trees);
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
            'mrtLines': ['mrt-lines-layer'],
            'roads': ['roads-fill'],
            'sidewalksMarked': ['sidewalks-marked-fill'],
            'sidewalksPhysical': ['sidewalks-physical-fill'],
            'grid': ['grid-fill'],
            'villages': ['villages-line'], // Add villages to layer map
            'districts': ['districts-line']
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

    }, [visibleLayers, layerOrder, isLoaded]); // Add isLoaded dependency

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

    return <div ref={mapContainer} style={{ width: '100%', height: '100%' }} />;
}
