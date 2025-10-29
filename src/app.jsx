// /src/App.jsx
import { useEffect, useMemo, useState } from 'react'
import dayjs from 'dayjs'
import { createClient } from '@supabase/supabase-js'

// ====== Supabase 接続（Vercelの環境変数から読み込み） ======
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || ''
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || ''
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false } })

// ====== 最小限のユーティリティ ======
const SIZE_MAP = { S: '26569', M: '15458', L: '04347' }
const CHIP_TYPES = ['ショートオーバル', 'ベリーショート']
const yen = (n) => new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY' }).format(n || 0)

// recharts（外部コンポーネントなしで直接使う）
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, Legend, CartesianGrid, ResponsiveContainer,
} from 'recharts'

export default function App() {
  const [storeFilter, setStoreFilter] = useState('ALL')
  const [startMonth, setStartMonth] = useState(dayjs().startOf('year').format('YYYY-MM'))
  const [endMonth, setEndMonth] = useState(dayjs().format('YYYY-MM'))
  const [rows, setRows] = useState([])
  const [stores, setStores] = useState([])

  const [form, setForm] = useState({
    chip_type: CHIP_TYPES[0],
    size_cls: '',
    size_digits: '',
    price_total: '',
    store: '',
    month: '', // <input type="month">
  })

  useEffect(() => {
    (async () => {
      // 店舗一覧
      const { data: storeRows, error: sErr } = await supabase.from('sales').select('store')
      if (!sErr && storeRows) {
        const ss = Array.from(new Set(storeRows.map(r => r.store).filter(Boolean)))
        setStores(ss)
      }
      await reloadRows()
    })()
  }, [])

  useEffect(() => { reloadRows() }, [storeFilter, startMonth, endMonth])

  async function reloadRows() {
    let q = supabase
      .from('sales')
      .select('created_at, month, manual_month, chip_type, size_cls, size_digits, price_total, store')
      .order('created_at', { ascending: false })
      .limit(2000)

    if (startMonth) q = q.gte('month', startMonth)
    if (endMonth) q = q.lte('month', endMonth)
    if (storeFilter !== 'ALL') q = q.eq('store', storeFilter)

    const { data, error } = await q
    if (!error && data) setRows(data)
  }

  // S/M/L 選択時は 5桁を自動補完（手入力があればそれを優先してOK）
  useEffect(() => {
    if (form.size_cls && SIZE_MAP[form.size_cls]) {
      setForm(prev => ({ ...prev, size_digits: SIZE_MAP[prev.size_cls] }))
    }
  }, [form.size_cls])

  async function onSubmit(e) {
    e.preventDefault()
    const payload = {
      chip_type: form.chip_type,
      size_cls: form.size_cls || null,
      size_digits: form.size_digits || null,          // 手入力優先
      price_total: Number(form.price_total),
      store: form.store,
      manual_month: form.month || null,               // 任意の売上月
    }
    const { error } = await supabase.from('sales').insert([payload])
    if (error) {
      alert('登録失敗: ' + error.message)
      return
    }
    setForm(prev => ({ ...prev, price_total: '', size_digits: prev.size_cls ? SIZE_MAP[prev.size_cls] : '' }))
    await reloadRows()
    alert('登録しました')
  }

  const filtered = useMemo(() => {
    return rows.filter(r => {
      const inStore = storeFilter === 'ALL' || r.store === storeFilter
      const m = r.month
      const inPeriod = (!startMonth || m >= startMonth) && (!endMonth || m <= endMonth)
      return inStore && inPeriod
    })
  }, [rows, storeFilter, startMonth, endMonth])

  const totalRevenue = useMemo(() => filtered.reduce((s, r) => s + (r.price_total || 0), 0), [filtered])
  const totalCount = filtered.length
  const countByTypeData = useMemo(() => {
    const map = {}
    filtered.forEach(r => { map[r.chip_type] = (map[r.chip_type] || 0) + 1 })
    return Object.entries(map).map(([name, count]) => ({ name, count }))
  }, [filtered])

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="px-6 py-4 bg-white border-b">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <h1 className="text-2xl font-bold">ネイルチップ販売管理（Supabase）</h1>
          <div className="text-sm text-slate-500">有料級UI</div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-6 space-y-6">
        {/* 登録フォーム */}
        <div className="rounded-2xl shadow-md p-5 bg-white">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold">データ登録</h2>
          </div>
          <form onSubmit={onSubmit} className="grid md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">チップ種類</label>
              <select className="w-full rounded-xl border p-2"
                value={form.chip_type}
                onChange={e => setForm({ ...form, chip_type: e.target.value })}>
                {CHIP_TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">チップサイズ S/M/L（空欄可）</label>
              <select className="w-full rounded-xl border p-2"
                value={form.size_cls}
                onChange={e => setForm({ ...form, size_cls: e.target.value })}>
                <option value="">（未指定）</option>
                <option value="S">S（→26569）</option>
                <option value="M">M（→15458）</option>
                <option value="L">L（→04347）</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">チップサイズ 5桁</label>
              <input className="w-full rounded-xl border p-2"
                placeholder="例: 26569"
                value={form.size_digits}
                onChange={e => setForm({ ...form, size_digits: e.target.value })} />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">商品価格（税込）</label>
              <input type="number" min="0" step="1"
                className="w-full rounded-xl border p-2"
                placeholder="例: 3200"
                value={form.price_total}
                onChange={e => setForm({ ...form, price_total: e.target.value })}
                required />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">店舗名</label>
              <input className="w-full rounded-xl border p-2"
                placeholder="例: Matoeru 金沢店"
                value={form.store}
                onChange={e => setForm({ ...form, store: e.target.value })}
                required />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">売上月（任意・年月選択）</label>
              <input type="month" className="w-full rounded-xl border p-2"
                value={form.month}
                onChange={e => setForm({ ...form, month: e.target.value })} />
            </div>

            <div className="md:col-span-3">
              <button type="submit" className="px-5 py-2 rounded-xl bg-black text-white hover:opacity-90">
                登録する
              </button>
            </div>
          </form>
        </div>

        {/* フィルタ */}
        <div className="rounded-2xl shadow-md p-5 bg-white">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold">フィルタ</h2>
            <div className="text-sm text-slate-500">期間と店舗で絞込</div>
          </div>
          <div className="grid md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">店舗</label>
              <select className="w-full rounded-xl border p-2"
                value={storeFilter}
                onChange={e => setStoreFilter(e.target.value)}>
                <option value="ALL">すべて</option>
                {stores.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">開始月</label>
              <input type="month" className="w-full rounded-xl border p-2"
                value={startMonth} onChange={e => setStartMonth(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">終了月</label>
              <input type="month" className="w-full rounded-xl border p-2"
                value={endMonth} onChange={e => setEndMonth(e.target.value)} />
            </div>
          </div>
        </div>

        {/* 指標 + グラフ */}
        <div className="grid md:grid-cols-3 gap-4">
          <div className="rounded-2xl shadow-md p-5 bg-white">
            <h2 className="text-lg font-semibold mb-2">総販売数</h2>
            <div className="text-3xl font-bold">{totalCount}</div>
            <div className="text-slate-500 text-sm mt-1">
              {startMonth}〜{endMonth}（{storeFilter === 'ALL' ? '全店舗' : storeFilter}）
            </div>
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
      </main>

      <footer className="py-6 text-center text-sm text-slate-500">
        © {new Date().getFullYear()} Sales Dashboard
      </footer>
    </div>
  )
}
