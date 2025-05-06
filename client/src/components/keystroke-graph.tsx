import { useState, useEffect, useRef } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceArea,
  ReferenceLine
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface KeystrokeGraphProps {
  keystrokes: any[];
  onTimeRangeSelected?: (startTime: string, endTime: string, keystrokesInRange: any[]) => void;
}

export function KeystrokeGraph({ keystrokes, onTimeRangeSelected }: KeystrokeGraphProps) {
  const [data, setData] = useState<any[]>([]);
  const [left, setLeft] = useState<string | null>(null);
  const [right, setRight] = useState<string | null>(null);
  const [refAreaLeft, setRefAreaLeft] = useState<string>('');
  const [refAreaRight, setRefAreaRight] = useState<string>('');
  const [bottom, setBottom] = useState<number | 'auto'>('auto');
  const [top, setTop] = useState<number | 'auto'>('auto');
  const [zoomHistory, setZoomHistory] = useState<Array<{left: string | null, right: string | null, bottom: number | 'auto', top: number | 'auto'}>>([]);
  const chartRef = useRef<any>(null);
  const [selectedTimeRange, setSelectedTimeRange] = useState<{start: string, end: string} | null>(null);
  const [selectedPoint, setSelectedPoint] = useState<string | null>(null);

  // Store the keystrokes with their time buckets for easy retrieval
  const [keystrokesByTime, setKeystrokesByTime] = useState<Record<string, any[]>>({});
  
  useEffect(() => {
    // Group keystrokes by 1-second intervals for detailed visualization
    const groupedData = keystrokes.reduce((acc: any[], keystroke: any) => {
      const time = new Date(keystroke.timestamp);
      const seconds = Math.floor(time.getSeconds() / 1) * 1;
      const timeKey = `${time.getHours()}:${time.getMinutes().toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

      const existing = acc.find(item => item.time === timeKey);
      if (existing) {
        existing.count += 1;
        if (keystroke.type === 'input') existing.inputs += 1;
        if (keystroke.type === 'delete') existing.deletes += 1;
      } else {
        acc.push({ 
          time: timeKey, 
          count: 1,
          inputs: keystroke.type === 'input' ? 1 : 0,
          deletes: keystroke.type === 'delete' ? 1 : 0,
          timestamp: keystroke.timestamp // Store the original timestamp for sorting
        });
      }

      return acc;
    }, []);

    // Sort by original timestamp for proper chronological order
    const sortedData = groupedData.sort((a, b) => {
      return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
    });
    
    // Add index for better reference when zooming
    const indexedData = sortedData.map((item, index) => ({
      ...item,
      index
    }));

    setData(indexedData);
    
    // Create a mapping of time buckets to original keystrokes
    const timeMapping: Record<string, any[]> = {};
    keystrokes.forEach(k => {
      const time = new Date(k.timestamp);
      const seconds = Math.floor(time.getSeconds() / 1) * 1;
      const timeKey = `${time.getHours()}:${time.getMinutes().toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
      
      if (!timeMapping[timeKey]) {
        timeMapping[timeKey] = [];
      }
      timeMapping[timeKey].push(k);
    });
    
    setKeystrokesByTime(timeMapping);
  }, [keystrokes]);

  const getAxisYDomain = (from: string, to: string, ref: string, offset: number) => {
    const refData = data.slice(
      data.findIndex(d => d.time === from),
      data.findIndex(d => d.time === to) + 1
    );

    let [bottom, top] = [
      refData.length > 0 ? Math.min(...refData.map((d: any) => d[ref])) : 0,
      refData.length > 0 ? Math.max(...refData.map((d: any) => d[ref])) : 10
    ];
    
    // Ensure we have some padding even with small numbers
    bottom = bottom - offset < 0 ? 0 : bottom - offset;
    top = top + offset;

    return [bottom, top];
  };

  const zoomIn = () => {
    if (refAreaLeft === refAreaRight || refAreaRight === '') {
      setRefAreaLeft('');
      setRefAreaRight('');
      return;
    }

    // Ensure left and right are in correct order
    let leftIndex = data.findIndex(d => d.time === refAreaLeft);
    let rightIndex = data.findIndex(d => d.time === refAreaRight);

    if (leftIndex > rightIndex) 
      [leftIndex, rightIndex] = [rightIndex, leftIndex];

    const leftTime = data[leftIndex]?.time;
    const rightTime = data[rightIndex]?.time;

    if (leftTime && rightTime) {
      // Save current view to history for "zoom out"
      setZoomHistory(prevHistory => [...prevHistory, {
        left,
        right,
        top,
        bottom
      }]);

      // Calculate new Y domain for the zoomed area
      const [newBottom, newTop] = getAxisYDomain(leftTime, rightTime, 'count', 1);

      // Set the new zoom area
      setRefAreaLeft('');
      setRefAreaRight('');
      setLeft(leftTime);
      setRight(rightTime);
      setBottom(newBottom);
      setTop(newTop);
      
      // Clear any point selection
      setSelectedPoint(null);
      
      // Notify parent component of time range selection
      notifyTimeRangeSelected(leftTime, rightTime);
    }
  };

  const zoomOut = () => {
    if (zoomHistory.length === 0) {
      // If no history, reset to full view
      setLeft(null);
      setRight(null);
      setTop('auto');
      setBottom('auto');
      
      // Clear any selected time range and point
      setSelectedTimeRange(null);
      setSelectedPoint(null);
      if (onTimeRangeSelected) {
        onTimeRangeSelected('', '', []);
      }
      return;
    }

    // Pop the last zoom state from history
    const lastZoom = zoomHistory[zoomHistory.length - 1];
    setLeft(lastZoom.left);
    setRight(lastZoom.right);
    setTop(lastZoom.top);
    setBottom(lastZoom.bottom);
    setZoomHistory(zoomHistory.slice(0, -1));
    
    // Clear any point selection
    setSelectedPoint(null);
    
    // If no time range will be active after zoom out, clear selection
    if (!lastZoom.left || !lastZoom.right) {
      setSelectedTimeRange(null);
      if (onTimeRangeSelected) {
        onTimeRangeSelected('', '', []);
      }
    } else {
      // Otherwise notify parent of the new time range
      notifyTimeRangeSelected(lastZoom.left, lastZoom.right);
    }
  };

  const handleMouseDown = (e: any) => {
    if (!e) return;
    setRefAreaLeft(e.activeLabel);
  };

  const handleMouseMove = (e: any) => {
    if (!e) return;
    refAreaLeft && setRefAreaRight(e.activeLabel);
  };

  const handleMouseUp = () => {
    if (refAreaLeft && refAreaRight) {
      zoomIn();
    }
  };
  
  // Function to get all keystrokes within a time range
  const getKeystrokesInTimeRange = (startTime: string, endTime: string): any[] => {
    if (!startTime || !endTime) return [];
    
    // Get all time keys between startTime and endTime
    const timeKeys = Object.keys(keystrokesByTime)
      .filter(timeKey => {
        // Convert to timestamps for comparison
        const startTimestamp = new Date(`2023-01-01 ${startTime}`).getTime();
        const endTimestamp = new Date(`2023-01-01 ${endTime}`).getTime();
        const keyTimestamp = new Date(`2023-01-01 ${timeKey}`).getTime();
        
        return keyTimestamp >= startTimestamp && keyTimestamp <= endTimestamp;
      });
    
    // Collect all keystrokes from these time buckets
    const keystrokesInRange: any[] = [];
    timeKeys.forEach(key => {
      keystrokesInRange.push(...keystrokesByTime[key]);
    });
    
    // Sort by timestamp
    return keystrokesInRange.sort((a, b) => 
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
  };
  
  // Function to notify parent component of time range selection
  const notifyTimeRangeSelected = (startTime: string, endTime: string) => {
    if (!startTime || !endTime) return;
    
    // Store the selected time range
    setSelectedTimeRange({ start: startTime, end: endTime });
    
    // Get all keystrokes within the selected time range
    const keystrokesInRange = getKeystrokesInTimeRange(startTime, endTime);
    
    // Call the callback function if provided
    if (onTimeRangeSelected) {
      onTimeRangeSelected(startTime, endTime, keystrokesInRange);
    }
  };
  
  // Handle clicking on an individual dot/time point
  const handleDotClick = (e: any) => {
    if (!e) return;
    
    // Get the time of the clicked dot
    const clickedTime = e.time;
    
    // Clear current zoom area to avoid confusion
    setLeft(null);
    setRight(null);
    
    // Set the selected point
    setSelectedPoint(clickedTime);
    
    // Use a small time window around the clicked time (same time point)
    notifyTimeRangeSelected(clickedTime, clickedTime);
  };

  if (keystrokes.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Editing Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No editing activity recorded yet.</p>
        </CardContent>
      </Card>
    );
  }

  // Function to handle vertical scrolling
  const [yAxisRange, setYAxisRange] = useState<{min: number, max: number}>({ min: 0, max: 10 });
  const [verticalOffset, setVerticalOffset] = useState<number>(0);
  
  const handleVerticalScroll = (e: React.WheelEvent) => {
    if (e.deltaY !== 0) {
      // Prevent default browser scrolling
      e.preventDefault();
      
      // Calculate new vertical offset
      const scrollMultiplier = 0.1;
      const direction = e.deltaY > 0 ? 1 : -1;
      const range = yAxisRange.max - yAxisRange.min;
      const scrollAmount = range * scrollMultiplier * direction;
      
      // Update the vertical offset
      setVerticalOffset(prev => Math.min(Math.max(prev + scrollAmount, 0), range));
    }
  };
  
  // Update yAxisRange whenever top or bottom changes
  useEffect(() => {
    const min = bottom === 'auto' ? 0 : bottom as number;
    const maxDataValue = data.length > 0 ? Math.max(...data.map(d => d.count)) : 10;
    
    // Add a significant cushion (50%) to ensure no cutoff
    const max = top === 'auto' ? 
      maxDataValue * 1.5 + 10 : // 50% more space plus a fixed buffer
      (top as number) * 1.5;    // 50% more space for zoomed areas
    
    setYAxisRange({ min, max });
    setVerticalOffset(0); // Reset vertical offset on domain change
  }, [data, top, bottom]);
  
  // Calculate actual domain for Y axis with offset
  const getYAxisDomain = () => {
    const range = yAxisRange.max - yAxisRange.min;
    if (range <= 0) return [0, 10];
    
    if (bottom === 'auto' || top === 'auto') {
      // For auto scaling, ensure we have plenty of cushion at the top
      const maxDataValue = data.length > 0 ? Math.max(...data.map(d => d.count)) : 10;
      return [0, maxDataValue * 1.5 + 10];
    }
    
    return [
      Math.max(yAxisRange.min + verticalOffset, 0),
      Math.min(yAxisRange.max + verticalOffset, yAxisRange.max * 2) // Double max height for extra cushion
    ];
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex justify-between items-center">
          <span>Editing Activity Over Time</span>
          <div className="flex gap-2">
            <button 
              onClick={() => {
                setVerticalOffset(0);
                setLeft(null);
                setRight(null);
                // Clear selection when resetting view
                setSelectedTimeRange(null);
                setSelectedPoint(null);
                if (onTimeRangeSelected) {
                  onTimeRangeSelected('', '', []);
                }
              }} 
              className="bg-secondary text-secondary-foreground hover:bg-secondary/90 px-3 py-1 rounded-md text-sm"
            >
              Reset View
            </button>
            <button 
              onClick={zoomOut} 
              className="bg-primary text-primary-foreground hover:bg-primary/90 px-3 py-1 rounded-md text-sm"
              disabled={zoomHistory.length === 0 && left === null}
            >
              Zoom Out
            </button>
          </div>
        </CardTitle>
        {selectedTimeRange && (
          <div className="text-sm text-muted-foreground mt-2">
            {selectedTimeRange.start === selectedTimeRange.end ? (
              <span className="font-medium">Selected time point: {selectedTimeRange.start}</span>
            ) : (
              <span>Selected time range: {selectedTimeRange.start} - {selectedTimeRange.end}</span>
            )}
          </div>
        )}
      </CardHeader>
      <CardContent>
        <div className="mb-2 text-sm">
          <span className="inline-flex items-center mr-4">
            <span className="inline-block w-3 h-3 bg-primary rounded-full mr-1"></span>
            <span>Keystrokes</span>
          </span>
          
          {selectedPoint && (
            <span className="inline-flex items-center">
              <span className="inline-block w-3 h-3 bg-amber-500 rounded-full mr-1"></span>
              <span>Selected Point</span>
            </span>
          )}
        </div>
        
        <div 
          className="h-[500px] border border-border rounded-md p-4 overflow-hidden"
          onWheel={handleVerticalScroll}
        >
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={data}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              ref={chartRef}
              margin={{ top: 50, right: 50, left: 20, bottom: 40 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="time" 
                tick={{ fontSize: 12 }}
                domain={[left || 'dataMin', right || 'dataMax']}
                type="category"
                allowDataOverflow
                height={50}
                tickFormatter={(value) => {
                  // Return abbreviated time for better readability when zoomed out
                  if (data.length > 20 && !left && !right) {
                    const parts = value.split(':');
                    return parts.length > 1 ? `${parts[0]}:${parts[1]}` : value;
                  }
                  return value;
                }}
              />
              <YAxis 
                domain={getYAxisDomain()}
                allowDataOverflow
                width={50}
              />
              <Tooltip 
                labelFormatter={(label) => `Time: ${label}`}
                formatter={(value, name) => {
                  // Color-code the tooltip entries to match the lines
                  let color = "black";
                  if (name === "Keystrokes") color = "hsl(var(--primary))";
                  if (name === "Inputs") color = "green";
                  if (name === "Deletes") color = "red";
                  return [<span style={{ color }}>{`${value} keystrokes`}</span>, <span style={{ color }}>{name}</span>];
                }}
                wrapperStyle={{ 
                  zIndex: 1000,
                  backgroundColor: "rgba(255, 255, 255, 0.95)",
                  border: "1px solid #ccc",
                  borderRadius: "4px",
                  padding: "10px",
                  boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                  maxWidth: "none"
                }}
                contentStyle={{
                  border: "none",
                  padding: "8px"
                }}
              />

              <Line 
                type="natural" 
                dataKey="count" 
                stroke="hsl(var(--primary))" 
                name="Keystrokes"
                strokeWidth={2}
                dot={(props) => {
                  const { cx, cy, payload } = props;
                  // Make the selected point larger and highlighted
                  const isSelected = selectedPoint && payload.time === selectedPoint;
                  
                  return (
                    <circle 
                      cx={cx} 
                      cy={cy} 
                      r={isSelected ? 6 : 4} 
                      fill={isSelected ? "#f59e0b" : "hsl(var(--primary))"}
                      stroke={isSelected ? "#f59e0b" : "none"}
                      strokeWidth={isSelected ? 2 : 0}
                      onClick={() => handleDotClick(payload)}
                      style={{ cursor: 'pointer' }}
                    />
                  );
                }}
                activeDot={{ 
                  r: 6, 
                  strokeWidth: 2,
                  onClick: handleDotClick // Also for active dots
                }}
                animationDuration={300}
                isAnimationActive={false}
              />
              
              {/* Show a vertical reference line for the selected point */}
              {selectedPoint && (
                <ReferenceLine
                  x={selectedPoint}
                  stroke="#f59e0b"
                  strokeWidth={2}
                  strokeDasharray="3 3"
                  label={{
                    value: "Selected Time",
                    position: "top",
                    fill: "#f59e0b",
                    fontSize: 12
                  }}
                />
              )}
              
              {refAreaLeft && refAreaRight && (
                <ReferenceArea
                  x1={refAreaLeft}
                  x2={refAreaRight}
                  strokeOpacity={0.3}
                  fill="hsl(var(--primary))"
                  fillOpacity={0.3}
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-2 text-xs text-muted-foreground">
          <p>
            <strong>Controls:</strong> Click on individual points to see what was written at that specific time.
            Click and drag horizontally to zoom in and select a time range. 
            Use mouse wheel to scroll vertically. Use "Reset View" to clear the selection and "Zoom Out" to return to previous zoom level.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}