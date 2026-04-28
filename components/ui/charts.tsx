'use client'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts'

const COLORS = { PAGADO: '#22c55e', PENDIENTE: '#eab308', VENCIDO: '#ef4444' }

export function WeeklyBarChart({ data }: { data: { week: string; count: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data}>
        <XAxis dataKey="week" stroke="#71717a" tick={{ fontSize: 11 }} />
        <YAxis stroke="#71717a" />
        <Tooltip contentStyle={{ background: '#18181b', border: 'none', color: '#fff' }} />
        <Bar dataKey="count" fill="#FF8C00" radius={[4, 4, 0, 0]} />
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
        <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70}>
          {data.map(entry => (
            <Cell key={entry.name} fill={COLORS[entry.name]} />
          ))}
        </Pie>
        <Legend formatter={v => <span style={{ color: '#a1a1aa' }}>{v}</span>} />
        <Tooltip contentStyle={{ background: '#18181b', border: 'none', color: '#fff' }} />
      </PieChart>
    </ResponsiveContainer>
  )
}
