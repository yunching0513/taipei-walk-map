import { useState, useRef } from 'react';
import shp from 'shpjs';
import proj4 from 'proj4';

// Define TWD97 (EPSG:3826)
proj4.defs('EPSG:3826', '+proj=tmerc +lat_0=0 +lon_0=121 +k=0.9999 +x_0=250000 +y_0=0 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs');

const reprojectCoordinates = (coords) => {
    if (!Array.isArray(coords)) return coords;
    
    // Base case: [x, y] or [x, y, z]
    if (typeof coords[0] === 'number') {
        // If x is wildly out of WGS84 bounds (e.g. > 180 or < -180), treat as TWD97
        if (Math.abs(coords[0]) > 180) {
            const [x, y] = proj4('EPSG:3826', 'EPSG:4326', [coords[0], coords[1]]);
            return coords.length === 3 ? [x, y, coords[2]] : [x, y];
        }
        return coords;
    }
    
    // Recursive case
    return coords.map(c => reprojectCoordinates(c));
};

const autoReprojectFeatureCollection = (featureCollection) => {
    return {
        ...featureCollection,
        features: featureCollection.features.map(feature => ({
            ...feature,
            geometry: feature.geometry ? {
                ...feature.geometry,
                coordinates: reprojectCoordinates(feature.geometry.coordinates)
            } : null
        }))
    };
};

export default function FileUpload({ onLayerAdd }) {
    const [isDragging, setIsDragging] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const fileInputRef = useRef(null);

    const handleDragOver = (e) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = () => {
        setIsDragging(false);
    };

    const handleDrop = async (e) => {
        e.preventDefault();
        setIsDragging(false);
        const files = Array.from(e.dataTransfer.files);
        await processFiles(files);
    };

    const handleFileInput = async (e) => {
        const files = Array.from(e.target.files);
        await processFiles(files);
    };

    const processFiles = async (files) => {
        setIsProcessing(true);

        try {
            // Check for JSON files
            const jsonFiles = files.filter(f => f.name.endsWith('.json') || f.name.endsWith('.geojson'));
            for (const file of jsonFiles) {
                await processGeoJSON(file);
            }

            // Check for Shapefile bundles
            const shpFile = files.find(f => f.name.endsWith('.shp'));
            if (shpFile) {
                await processShapefile(files);
            }

        } catch (error) {
            console.error('Error processing files:', error);
            alert('處理檔案時發生錯誤: ' + error.message);
        } finally {
            setIsProcessing(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    const processGeoJSON = async (file) => {
        const text = await file.text();
        let geojson = JSON.parse(text);

        // Normalize to FeatureCollection
        if (geojson.type === 'Feature') {
            geojson = { type: 'FeatureCollection', features: [geojson] };
        } else if (geojson.type !== 'FeatureCollection') {
            // Assume it's a raw geometry
            geojson = { type: 'FeatureCollection', features: [{ type: 'Feature', geometry: geojson, properties: {} }] };
        }

        const layerName = file.name.replace(/\.(geo)?json$/i, '');
        const color = getRandomColor();

        // Auto reproject if needed
        const finalData = autoReprojectFeatureCollection(geojson);

        onLayerAdd({
            id: Date.now() + Math.random(),
            name: layerName,
            data: finalData,
            color: color,
            opacity: 0.7,
            visible: true
        });
    };

    const processShapefile = async (files) => {
        // Create a FileReader array buffer map
        const fileMap = {};

        for (const file of files) {
            const ext = file.name.split('.').pop().toLowerCase();
            if (['shp', 'dbf', 'shx', 'prj', 'cpg', 'zip'].includes(ext)) {
                fileMap[ext] = await file.arrayBuffer();
            }
        }

        let geojsonResult;
        
        if (fileMap.zip) {
            geojsonResult = await shp(fileMap.zip);
        } else if (fileMap.shp) {
            geojsonResult = await shp({ 
                shp: fileMap.shp, 
                dbf: fileMap.dbf, 
                prj: fileMap.prj ? new TextDecoder().decode(fileMap.prj) : undefined 
            });
        } else {
            throw new Error('找不到 .shp 或 .zip 檔案 (Missing .shp or .zip file)');
        }

        const geojsons = Array.isArray(geojsonResult) ? geojsonResult : [geojsonResult];

        for (const geojson of geojsons) {
            // Auto reproject if needed
            const finalData = autoReprojectFeatureCollection(geojson);

            let layerName = 'Uploaded Layer';
            if (geojson.fileName) layerName = geojson.fileName;
            else {
                const shpFile = files.find(f => f.name.endsWith('.shp') || f.name.endsWith('.zip'));
                if (shpFile) {
                    layerName = shpFile.name.replace(/\.(shp|zip)$/i, '');
                }
            }

            const color = getRandomColor();

            onLayerAdd({
                id: Date.now() + Math.random(),
                name: layerName,
                data: finalData,
                color: color,
                opacity: 0.7,
                visible: true
            });
        }
    };

    const getRandomColor = () => {
        const colors = [
            '#e74c3c', '#3498db', '#2ecc71', '#f39c12',
            '#9b59b6', '#1abc9c', '#e67e22', '#34495e',
            '#16a085', '#27ae60', '#2980b9', '#8e44ad'
        ];
        return colors[Math.floor(Math.random() * colors.length)];
    };

    return (
        <div style={{ padding: '15px', background: 'var(--color-bg)', borderRadius: 'var(--radius-lg)' }}>
            <h2 style={{ fontSize: '14px', textTransform: 'uppercase', color: 'var(--color-text-light)', marginBottom: '10px' }}>
                Upload Layer
            </h2>

            <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                style={{
                    border: `2px dashed ${isDragging ? '#f1c40f' : 'var(--color-sidebar)'}`,
                    borderRadius: 'var(--radius-lg)',
                    padding: '20px',
                    textAlign: 'center',
                    cursor: 'pointer',
                    background: isDragging ? 'rgba(241, 196, 15, 0.1)' : 'var(--color-sidebar)',
                    transition: 'all 0.3s'
                }}
            >
                <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept=".json,.geojson,.shp,.dbf,.shx,.prj,.cpg"
                    onChange={handleFileInput}
                    style={{ display: 'none' }}
                />

                {isProcessing ? (
                    <p style={{ color: '#f1c40f', fontSize: '14px' }}>處理中...</p>
                ) : (
                    <>
                        <p style={{ fontSize: '14px', color: 'var(--color-text-light)', marginBottom: '8px' }}>
                            📁 拖曳檔案至此或點擊上傳
                        </p>
                        <p style={{ fontSize: '12px', color: '#666' }}>
                            支援: GeoJSON, Shapefile (.shp + .dbf + .shx)
                        </p>
                    </>
                )}
            </div>
        </div>
    );
}
