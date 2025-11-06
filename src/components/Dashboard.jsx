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

  // チップ番号用オプション
  const [topN, setTopN] = useState(20)
  const [includeEmptyChipNo, setIncludeEmptyChipNo] = useState(false)

  useEffect(() => { (async () => {
    const s = await listStores(); if (s.ok) setStores(s.stores)
    await reload()
  })() }, [])

  useEffect(() => { reload() }, [storeFilter, startMonth, endMonth])

  async function reload() {
    const r = await fetchRows({ storeId: storeFilter, start: startMonth, end: endMonth, limit: 2000 })
    if (r.ok) setRows(r.rows)
  }

  // 既存KPI
  const totalRevenue = useMemo(() => rows.reduce((s,r)=>s+(r.price_total||0),0), [rows])
  const totalCount = rows.length
  const countByTypeData = useMemo(() => {
    const map = {}
    rows.forEach(r => { map[r.chip_type] = (map[r.chip_type]||0) + 1 })
    return Object.entries(map).map(([name, count]) => ({ name, count }))
  }, [rows])

  // ▼ 追加：チップ番号別 集計
  const chipAgg = useMemo(() => {
    const m = new Map()
    rows.forEach(r => {
      let key = r.chip_number || '(未設定)'
      if (!includeEmptyChipNo && key === '(未設定)') return
      const prev = m.get(key) || { chip_number: key, count: 0, revenue: 0 }
      prev.count += 1
      prev.revenue += (r.price_total || 0)
      m.set(key, prev)
    })
    return Array.from(m.values())
  }, [rows, includeEmptyChipNo])

  const chipTopByCount = useMemo(() => {
    return [...chipAgg].sort((a,b)=>b.count - a.count).slice(0, Math.max(1, Number(topN)||20))
  }, [chipAgg, topN])

  const chipTopByRevenue = useMemo(() => {
    return [...chipAgg].sort((a,b)=>b.revenue - a.revenue).slice(0, Math.max(1, Number(topN)||20))
  }, [chipAgg, topN])

  return (
    <div className="space-y-6">
      {/* フィルタ（ダッシュボード専用） */}
      <div className="rounded-2xl shadow-md p-5 bg-white">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">フィルタ</h2>
          <div className="text-sm text-slate-500">期間と店舗で絞込（ダッシュボード専用）</div>
        </div>
        <div className="grid md:grid-cols-5 gap-4">
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

          {/* 追加：チップ番号集計オプション */}
          <div>
            <label className="block text-sm font-medium mb-1">TOP件数</label>
            <input
              type="number" min="1" step="1"
              className="w-full rounded-xl border p-2 text-right"
              value={topN}
              onChange={e=>setTopN(e.target.value)}
            />
          </div>
          <div className="flex items-end">
            <label className="inline-flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="rounded"
                checked={includeEmptyChipNo}
                onChange={(e)=>setIncludeEmptyChipNo(e.target.checked)}
              />
              「未設定」を含める
            </label>
          </div>
        </div>
      </div>

      {/* KPI + 既存グラフ */}
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

      {/* ▼ 追加：チップ番号別 販売数 TOPN */}
      <div className="rounded-2xl shadow-md p-5 bg-white">
        <h2 className="text-lg font-semibold mb-2">チップ番号別・販売数（TOP{Math.max(1, Number(topN)||20)}）</h2>
        <div className="h-96">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chipTopByCount} margin={{ left: 8, right: 16 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="chip_number" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Legend />
              <Bar dataKey="count" name="販売数" />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="text-xs text-slate-500 mt-2">同一チップ番号の売上を合算。未設定は「(未設定)」として集計します。</div>
      </div>

      {/* ▼ 追加：チップ番号別 売上金額 TOPN */}
      <div className="rounded-2xl shadow-md p-5 bg-white">
        <h2 className="text-lg font-semibold mb-2">チップ番号別・売上金額（TOP{Math.max(1, Number(topN)||20)}）</h2>
        <div className="h-96">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chipTopByRevenue} margin={{ left: 8, right: 16 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="chip_number" />
              <YAxis allowDecimals={false} />
              <Tooltip formatter={(v, n) => n === 'revenue' ? [yen(v), '売上'] : [v, n]} />
              <Legend formatter={(v) => v === 'revenue' ? '売上' : v} />
              <Bar dataKey="revenue" name="売上" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}

{/* ▼ 追加：サイズ別 販売数＆売上金額 */}
<div className="rounded-2xl shadow-md p-5 bg-white">
  <h2 className="text-lg font-semibold mb-2">サイズ別・販売実績（販売数）</h2>
  <div className="h-96">
    <ResponsiveContainer width="100%" height="100%">
      <BarChart
        data={
          ['S','M','L'].map(size => {
            const filtered = rows.filter(r => r.size_cls === size)
            return {
              size,
              count: filtered.length,
              revenue: filtered.reduce((s,r)=>s+(r.price_total||0),0)
            }
          })
        }
        margin={{ left: 8, right: 16 }}
      >
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="size" />
        <YAxis allowDecimals={false} />
        <Tooltip />
        <Legend />
        <Bar dataKey="count" name="販売数" />
      </BarChart>
    </ResponsiveContainer>
  </div>
</div>

<div className="rounded-2xl shadow-md p-5 bg-white mt-6">
  <h2 className="text-lg font-semibold mb-2">サイズ別・売上金額（税抜）</h2>
  <div className="h-96">
    <ResponsiveContainer width="100%" height="100%">
      <BarChart
        data={
          ['S','M','L'].map(size => {
            const filtered = rows.filter(r => r.size_cls === size)
            return {
              size,
              count: filtered.length,
              revenue: filtered.reduce((s,r)=>s+(r.price_total||0),0)
            }
          })
        }
        margin={{ left: 8, right: 16 }}
      >
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="size" />
        <YAxis allowDecimals={false} />
        <Tooltip formatter={(v, n) => n === 'revenue' ? [yen(v), '売上'] : [v, n]} />
        <Legend />
        <Bar dataKey="revenue" name="売上金額（税抜）" />
      </BarChart>
    </ResponsiveContainer>
  </div>
</div>
