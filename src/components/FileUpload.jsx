import { useState, useRef } from 'react';
import shp from 'shpjs';

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
        const geojson = JSON.parse(text);

        const layerName = file.name.replace(/\.(geo)?json$/i, '');
        const color = getRandomColor();

        onLayerAdd({
            id: Date.now() + Math.random(),
            name: layerName,
            data: geojson,
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
            if (['shp', 'dbf', 'shx', 'prj', 'cpg'].includes(ext)) {
                fileMap[ext] = await file.arrayBuffer();
            }
        }

        if (!fileMap.shp) {
            throw new Error('找不到 .shp 檔案');
        }

        // Parse shapefile using shpjs
        const geojson = await shp.parseShp(fileMap.shp, fileMap.prj);

        // If DBF exists, combine with geometries
        let features = geojson;
        if (fileMap.dbf) {
            const dbfData = await shp.parseDbf(fileMap.dbf);
            features = geojson.map((geometry, i) => ({
                type: 'Feature',
                geometry: geometry,
                properties: dbfData[i] || {}
            }));
        }

        const featureCollection = {
            type: 'FeatureCollection',
            features: Array.isArray(features) ? features : [features]
        };

        const shpFile = files.find(f => f.name.endsWith('.shp'));
        const layerName = shpFile.name.replace(/\.shp$/i, '');
        const color = getRandomColor();

        onLayerAdd({
            id: Date.now() + Math.random(),
            name: layerName,
            data: featureCollection,
            color: color,
            opacity: 0.7,
            visible: true
        });
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
        <div style={{ padding: '15px', background: '#333', borderRadius: '8px' }}>
            <h2 style={{ fontSize: '14px', textTransform: 'uppercase', color: '#aaa', marginBottom: '10px' }}>
                Upload Layer
            </h2>

            <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                style={{
                    border: `2px dashed ${isDragging ? '#f1c40f' : '#555'}`,
                    borderRadius: '8px',
                    padding: '20px',
                    textAlign: 'center',
                    cursor: 'pointer',
                    background: isDragging ? 'rgba(241, 196, 15, 0.1)' : '#1a1a1a',
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
                        <p style={{ fontSize: '14px', color: '#aaa', marginBottom: '8px' }}>
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
