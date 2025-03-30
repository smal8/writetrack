import { useState, useEffect } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface KeystrokeGraphProps {
  keystrokes: any[];
}

export function KeystrokeGraph({ keystrokes }: KeystrokeGraphProps) {
  const [data, setData] = useState<any[]>([]);

  useEffect(() => {
    // Group keystrokes by 10-second intervals for more detailed visualization
    const groupedData = keystrokes.reduce((acc: any[], keystroke: any) => {
      const time = new Date(keystroke.timestamp);
      const seconds = Math.floor(time.getSeconds() / 10) * 10;
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
          deletes: keystroke.type === 'delete' ? 1 : 0
        });
      }

      return acc;
    }, []);

    setData(groupedData.sort((a, b) => a.time.localeCompare(b.time)));
  }, [keystrokes]);

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

  return (
    <Card>
      <CardHeader>
        <CardTitle>Editing Activity Over Time</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px] border border-border rounded-md p-4">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="time" 
                tick={{ fontSize: 12 }}
                interval="preserveStartEnd"
              />
              <YAxis />
              <Tooltip 
                labelFormatter={(label) => `Time: ${label}`}
                formatter={(value, name) => [`${value} keystrokes`, name]}
              />
              <Line 
                type="natural" 
                dataKey="count" 
                stroke="hsl(var(--primary))" 
                name="Keystrokes"
                strokeWidth={2}
                dot={false}
                animationDuration={300}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}