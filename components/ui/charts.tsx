'use client'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  PieChart, Pie, Cell, Legend,
} from 'recharts'

const COLORS = { PAGADO: '#22c55e', PENDIENTE: '#eab308', VENCIDO: '#ef4444' }

const tooltipStyle = {
  background: '#18181b',
  border: '1px solid rgba(255,255,255,0.07)',
  borderRadius: '12px',
  color: '#fff',
  fontSize: 12,
  padding: '8px 12px',
}

export function WeeklyBarChart({ data }: { data: { week: string; count: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} barCategoryGap="35%">
        <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.04)" />
        <XAxis dataKey="week" stroke="transparent" tick={{ fontSize: 10, fill: '#52525b' }} axisLine={false} tickLine={false} />
        <YAxis stroke="transparent" tick={{ fontSize: 10, fill: '#52525b' }} axisLine={false} tickLine={false} width={24} />
        <Tooltip cursor={{ fill: 'rgba(255,255,255,0.04)' }} contentStyle={tooltipStyle} itemStyle={{ color: '#FF8C00' }} />
        <Bar dataKey="count" fill="#FF8C00" radius={[6, 6, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}

export function PayStatusPie({
  data,
}: {
  data: { name: 'PAGADO' | 'PENDIENTE' | 'VENCIDO'; value: number }[]
}) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <PieChart>
        <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="45%"
          outerRadius={72} innerRadius={42} paddingAngle={3} strokeWidth={0}>
          {data.map(entry => (
            <Cell key={entry.name} fill={COLORS[entry.name]} />
          ))}
        </Pie>
        <Legend
          iconType="circle"
          iconSize={8}
          formatter={v => <span style={{ color: '#71717a', fontSize: 11 }}>{v}</span>}
        />
        <Tooltip contentStyle={tooltipStyle} />
      </PieChart>
    </ResponsiveContainer>
  )
}
