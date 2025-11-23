export default function Sidebar({ selectedMetric, onMetricChange, selectedDistrict }) {
    const getLegendData = (metric) => {
        if (metric === 'walkability') return [
            { label: '> 80 (Excellent)', color: '#800026' },
            { label: '60 - 80 (Good)', color: '#E31A1C' },
            { label: '40 - 60 (Average)', color: '#FD8D3C' },
            { label: '< 40 (Poor)', color: '#FFEDA0' },
        ];
        if (metric === 'population') return [
            { label: 'High Density', color: '#800026' },
            { label: 'Medium Density', color: '#E31A1C' },
            { label: 'Low Density', color: '#FFEDA0' },
        ];
        return [
            { label: 'High Green Space', color: '#800026' },
            { label: 'Medium Green Space', color: '#E31A1C' },
            { label: 'Low Green Space', color: '#FFEDA0' },
        ];
    }

    const legendItems = getLegendData(selectedMetric);

    return (
        <div className="h-full w-80 bg-white shadow-lg z-[1000] p-4 flex flex-col relative">
            <h1 className="text-2xl font-bold mb-4 text-gray-800">Taipei Walk Map</h1>
            <div className="flex-1 overflow-y-auto">
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 mb-4">
                    <h2 className="font-semibold text-blue-800 mb-2">About</h2>
                    <p className="text-sm text-blue-600">
                        Explore walkability and urban quality in Taipei City.
                    </p>
                </div>

                <div className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Layer Selection</label>
                        <select
                            value={selectedMetric}
                            onChange={(e) => onMetricChange(e.target.value)}
                            className="w-full border-gray-300 rounded-md shadow-sm p-2 border"
                        >
                            <option value="walkability">Walkability Score</option>
                            <option value="population">Population Density</option>
                            <option value="green_space">Green Spaces</option>
                        </select>
                    </div>

                    {selectedDistrict && (
                        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                            <h3 className="font-bold text-lg mb-2">{selectedDistrict.name}</h3>
                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span>Walkability:</span>
                                    <span className="font-semibold">{selectedDistrict.walkability}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Population:</span>
                                    <span className="font-semibold">{selectedDistrict.population.toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Green Space:</span>
                                    <span className="font-semibold">{selectedDistrict.green_space}%</span>
                                </div>
                            </div>
                        </div>
                    )}

                    <div>
                        <h3 className="text-sm font-medium text-gray-700 mb-2">Legend</h3>
                        <div className="space-y-2">
                            {legendItems.map((item, index) => (
                                <div key={index} className="flex items-center">
                                    <span
                                        className="w-4 h-4 rounded-full mr-2"
                                        style={{ backgroundColor: item.color }}
                                    ></span>
                                    <span className="text-sm text-gray-600">{item.label}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
            <div className="mt-4 pt-4 border-t border-gray-200 text-xs text-gray-500">
                Data source: OpenStreetMap & TGIS
            </div>
        </div>
    )
}
