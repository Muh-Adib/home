"use client"

import { Area, AreaChart, CartesianGrid, XAxis, ResponsiveContainer, YAxis, Tooltip } from "recharts"

const chartConfig = {
  revenue: {
    label: "Revenue",
    color: "hsl(160, 60%, 45%)",
  },
}

interface ChartRevenueProps {
  data: { month_short: string; revenue: number }[];
}

export function ChartRevenue({ data }: ChartRevenueProps) {
  const formatCurrency = (value: number) => {
    if (value >= 1000000000) {
      const val = value / 1000000000;
      return `${val % 1 === 0 ? val.toFixed(0) : val.toFixed(1)}M`;
    }
    if (value >= 1000000) {
      const val = value / 1000000;
      return `${val % 1 === 0 ? val.toFixed(0) : val.toFixed(1)}Jt`;
    }
    if (value >= 1000) {
      const val = value / 1000;
      return `${val % 1 === 0 ? val.toFixed(0) : val.toFixed(1)}Rb`;
    }
    return value.toString();
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white border rounded-lg shadow-lg p-3">
          <p className="font-medium text-sm">{label}</p>
          <p className="text-emerald-600 font-semibold">
            Rp {payload[0].value.toLocaleString('id-ID')}
          </p>
        </div>
      );
    }
    return null;
  };

  if (!data || data.length === 0) {
    return (
      <div className="h-full w-full flex items-center justify-center text-muted-foreground">
        <p className="text-sm">No revenue data available</p>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
        <XAxis
          dataKey="month_short"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          tick={{ fontSize: 12 }}
        />
        <YAxis
          tickFormatter={formatCurrency}
          tickLine={false}
          axisLine={false}
          tick={{ fontSize: 11 }}
          width={50}
        />
        <Tooltip content={<CustomTooltip />} />
        <Area
          type="monotone"
          dataKey="revenue"
          stroke="#10b981"
          strokeWidth={2}
          fillOpacity={1}
          fill="url(#colorRevenue)"
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
