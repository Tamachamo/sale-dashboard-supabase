import { useEffect, useMemo, useState } from 'react'
import dayjs from 'dayjs'
import { fetchRows, listStores } from '../api'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, Legend, CartesianGrid, ResponsiveContainer,
} from 'recharts'

const yen = (n) =>
  new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY' }).format(n || 0)

export default function Dashboard() {
  const [stores, setStores] = useState([])
  const [storeFilter, setStoreFilter] = useState('ALL')
  const [startMonth, setStartMonth] = useState(dayjs().startOf('year').format('YYYY-MM'))
  const [endMonth, setEndMonth] = useState(dayjs().format('YYYY-MM'))
  const [rows, setRows] = useState([])
  const [topN, setTopN] = useState(20)
  const [includeEmptyChipNo, setIncludeEmptyChipNo] = useState(false)

  useEffect(() => {
    ;(async () => {
      const s = await listStores()
      if (s.ok) setStores(s.stores)
      await reload()
    })()
  }, [])

  useEffect(() => {
    reload()
  }, [storeFilter, startMonth, endMonth])

  async function reload() {
  const r = await fetchRows({
    storeId: storeFilter,
    limit: 2000, // 期間条件はフロントで処理する
  })
  if (!r.ok) return
  const all = r.rows || []

  // 🔥 売上月(month = "YYYY-MM")でフィルタリング（文字列比較）
  const filtered = all.filter(row => {
    if (!row.manual_month) return true
    return row.manual_month >= startMonth && row.manual_month <= endMonth
  })

  // 店舗フィルタ（SupabaseでALL指定時に効かないので再確認）
  const final = storeFilter === 'ALL'
    ? filtered
    : filtered.filter(r => r.store_id === storeFilter)

  setRows(final)
}

  // KPI
  const totalRevenue = useMemo(
    () => rows.reduce((s, r) => s + (r.price_total || 0), 0),
    [rows]
  )
  const totalCount = rows.length

  // チップ種類ごと販売数
  const countByTypeData = useMemo(() => {
    const map = {}
    rows.forEach((r) => {
      map[r.chip_type] = (map[r.chip_type] || 0) + 1
    })
    return Object.entries(map).map(([name, count]) => ({ name, count }))
  }, [rows])

  // チップ番号別集計
  const chipAgg = useMemo(() => {
    const m = new Map()
    rows.forEach((r) => {
      let key = r.chip_number || '(未設定)'
      if (!includeEmptyChipNo && key === '(未設定)') return
      const prev = m.get(key) || { chip_number: key, count: 0, revenue: 0 }
      prev.count += 1
      prev.revenue += r.price_total || 0
      m.set(key, prev)
    })
    return Array.from(m.values())
  }, [rows, includeEmptyChipNo])

  const chipTopByCount = useMemo(() => {
    return [...chipAgg].sort((a, b) => b.count - a.count).slice(0, Math.max(1, Number(topN) || 20))
  }, [chipAgg, topN])

  const chipTopByRevenue = useMemo(() => {
    return [...chipAgg].sort((a, b) => b.revenue - a.revenue).slice(0, Math.max(1, Number(topN) || 20))
  }, [chipAgg, topN])

  // チップサイズ5桁別集計
  const sizeDigitAgg = useMemo(() => {
    const map = {}
    rows.forEach((r) => {
      const key = r.size_digits || '(未設定)'
      if (!map[key]) map[key] = { size_digits: key, count: 0, revenue: 0 }
      map[key].count += 1
      map[key].revenue += r.price_total || 0
    })
    return Object.values(map)
  }, [rows])

  return (
    <div className="space-y-6">
      {/* フィルタ */}
      <div className="rounded-2xl shadow-md p-5 bg-white">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">フィルタ</h2>
          <div className="text-sm text-slate-500">期間と店舗で絞込</div>
        </div>
        <div className="grid md:grid-cols-5 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">店舗</label>
            <select
              className="w-full rounded-xl border p-2"
              value={storeFilter}
              onChange={(e) => setStoreFilter(e.target.value)}
            >
              <option value="ALL">すべて</option>
              {stores.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">開始月</label>
            <input
              type="month"
              className="w-full rounded-xl border p-2"
              value={startMonth}
              onChange={(e) => setStartMonth(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">終了月</label>
            <input
              type="month"
              className="w-full rounded-xl border p-2"
              value={endMonth}
              onChange={(e) => setEndMonth(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">TOP件数</label>
            <input
              type="number"
              min="1"
              step="1"
              className="w-full rounded-xl border p-2 text-right"
              value={topN}
              onChange={(e) => setTopN(e.target.value)}
            />
          </div>
          <div className="flex items-end">
            <label className="inline-flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="rounded"
                checked={includeEmptyChipNo}
                onChange={(e) => setIncludeEmptyChipNo(e.target.checked)}
              />
              「未設定」を含める
            </label>
          </div>
        </div>
      </div>

      {/* KPIカード */}
      <div className="grid md:grid-cols-3 gap-4">
        <div className="rounded-2xl shadow-md p-5 bg-white">
          <h2 className="text-lg font-semibold mb-2">総販売数</h2>
          <div className="text-3xl font-bold">{totalCount}</div>
          <div className="text-slate-500 text-sm mt-1">{startMonth}〜{endMonth}</div>
        </div>

        <div className="rounded-2xl shadow-md p-5 bg-white">
          <h2 className="text-lg font-semibold mb-2">売上合計（税抜）</h2>
          <div className="text-3xl font-bold">{yen(totalRevenue)}</div>
          <div className="text-slate-500 text-sm mt-1">税込換算なし</div>
        </div>

        <div className="rounded-2xl shadow-md p-5 bg-white">
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

      {/* チップ番号別グラフ */}
      <div className="rounded-2xl shadow-md p-5 bg-white">
        <h2 className="text-lg font-semibold mb-2">チップ番号別・販売数（TOP{topN}）</h2>
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
      </div>

      <div className="rounded-2xl shadow-md p-5 bg-white">
        <h2 className="text-lg font-semibold mb-2">チップ番号別・売上金額（TOP{topN}）</h2>
        <div className="h-96">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chipTopByRevenue} margin={{ left: 8, right: 16 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="chip_number" />
              <YAxis allowDecimals={false} />
              <Tooltip formatter={(v) => [yen(v), '売上']} />
              <Legend />
              <Bar dataKey="revenue" name="売上金額（税抜）" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ▼ 追加：チップサイズ5桁別グラフ */}
      <div className="rounded-2xl shadow-md p-5 bg-white">
        <h2 className="text-lg font-semibold mb-2">チップサイズ5桁別・販売数</h2>
        <div className="h-96">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={sizeDigitAgg.sort((a, b) => b.count - a.count)}
              margin={{ left: 8, right: 16 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="size_digits" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Legend />
              <Bar dataKey="count" name="販売数" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="rounded-2xl shadow-md p-5 bg-white">
        <h2 className="text-lg font-semibold mb-2">チップサイズ5桁別・売上金額（税抜）</h2>
        <div className="h-96">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={sizeDigitAgg.sort((a, b) => b.revenue - a.revenue)}
              margin={{ left: 8, right: 16 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="size_digits" />
              <YAxis allowDecimals={false} />
              <Tooltip formatter={(v) => [yen(v), '売上']} />
              <Legend />
              <Bar dataKey="revenue" name="売上金額" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}