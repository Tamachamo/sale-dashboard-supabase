// src/components/Dashboard.jsx
import { useEffect, useMemo, useState } from 'react'
import dayjs from 'dayjs'
import { fetchRows, listStores } from '../api'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, Legend, CartesianGrid, ResponsiveContainer,
} from 'recharts'

const yen = (n) => new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY' }).format(n || 0)

export default function Dashboard() {
  const [stores, setStores] = useState([])
  const [storeFilter, setStoreFilter] = useState('ALL')
  const [startMonth, setStartMonth] = useState(dayjs().startOf('year').format('YYYY-MM'))
  const [endMonth, setEndMonth] = useState(dayjs().format('YYYY-MM'))
  const [rows, setRows] = useState([])

  useEffect(() => { (async () => {
    const s = await listStores(); if (s.ok) setStores(s.stores)
    await reload()
  })() }, [])

  useEffect(() => { reload() }, [storeFilter, startMonth, endMonth])

  async function reload() {
    const r = await fetchRows({ storeId: storeFilter, start: startMonth, end: endMonth, limit: 2000 })
    if (r.ok) setRows(r.rows)
  }

  const totalRevenue = useMemo(() => rows.reduce((s,r)=>s+(r.price_total||0),0), [rows])
  const totalCount = rows.length
  const countByTypeData = useMemo(() => {
    const map = {}
    rows.forEach(r => { map[r.chip_type] = (map[r.chip_type]||0) + 1 })
    return Object.entries(map).map(([name, count]) => ({ name, count }))
  }, [rows])

  return (
    <div className="space-y-6">
      {/* フィルタ（ダッシュボード専用） */}
      <div className="rounded-2xl shadow-md p-5 bg-white">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">フィルタ</h2>
          <div className="text-sm text-slate-500">期間と店舗で絞込（ダッシュボード専用）</div>
        </div>
        <div className="grid md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">店舗</label>
            <select className="w-full rounded-xl border p-2"
              value={storeFilter}
              onChange={(e)=>setStoreFilter(e.target.value)}>
              <option value="ALL">すべて</option>
              {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">開始月</label>
            <input type="month" className="w-full rounded-xl border p-2"
              value={startMonth} onChange={(e)=>setStartMonth(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">終了月</label>
            <input type="month" className="w-full rounded-xl border p-2"
              value={endMonth} onChange={(e)=>setEndMonth(e.target.value)} />
          </div>
        </div>
      </div>

      {/* KPI + グラフ */}
      <div className="grid md:grid-cols-3 gap-4">
        <div className="rounded-2xl shadow-md p-5 bg-white">
          <h2 className="text-lg font-semibold mb-2">総販売数</h2>
          <div className="text-3xl font-bold">{totalCount}</div>
          <div className="text-slate-500 text-sm mt-1">{startMonth}〜{endMonth}</div>
        </div>

        <div className="rounded-2xl shadow-md p-5 bg-white">
          <h2 className="text-lg font-semibold mb-2">売上合計</h2>
          <div className="text-3xl font-bold">{yen(totalRevenue)}</div>
          <div className="text-slate-500 text-sm mt-1">税込ベース</div>
        </div>

        <div className="rounded-2xl shadow-md p-5 bg-white md:col-span-1">
          <h2 className="text-lg font-semibold mb-2">チップ種類ごとの販売数</h2>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={countByTypeData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Legend />
                <Bar dataKey="count" name="販売数" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  )
}
