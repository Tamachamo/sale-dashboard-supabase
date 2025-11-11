// src/App.jsx
import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import StoreManager from './components/StoreManager'
import SalesTable from './components/SalesTable'
import Dashboard from './components/Dashboard'
import { listStores, submitSale, fetchRows } from './api'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || ''
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || ''
createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false } })

const CHIP_TYPES = ['ショートオーバル', 'ベリーショート']
const SIZE_MAP = { S: '26569', M: '15458', L: '04347' }

export default function App() {
  // ✅ ページ更新後も最後のタブを保持
  const [tab, setTab] = useState(localStorage.getItem('lastTab') || 'dashboard')
  const [stores, setStores] = useState([])
  const [rows, setRows] = useState([])
  const [submitting, setSubmitting] = useState(false)

  const [form, setForm] = useState({
    chip_type: CHIP_TYPES[0],
    chip_number: '',
    size_cls: '',
    size_digits: '',
    price_total: '',
    store_id: '',
    month: '',
    note: '',
  })

  // ✅ タブ変更時に記憶
  useEffect(() => {
    localStorage.setItem('lastTab', tab)
  }, [tab])

  async function loadStores() {
    const r = await listStores()
    if (r.ok) setStores(r.stores)
  }

  async function loadList() {
    const r = await fetchRows({ limit: 500 })
    if (r.ok) setRows(r.rows)
  }

  useEffect(() => {
    ;(async () => {
      await loadStores()
      await loadList()
    })()
  }, [])

  useEffect(() => {
    if (form.size_cls && SIZE_MAP[form.size_cls]) {
      setForm((prev) => ({ ...prev, size_digits: SIZE_MAP[prev.size_cls] }))
    }
  }, [form.size_cls])

  async function onSubmit(e) {
    e.preventDefault()
    setSubmitting(true)
    const res = await submitSale(form)
    setSubmitting(false)
    if (!res.ok) return alert('登録失敗: ' + res.error)

    setForm((prev) => ({
      ...prev,
      price_total: '',
      chip_number: '',
      note: '',
      size_digits: prev.size_cls ? SIZE_MAP[prev.size_cls] : '',
    }))
    await loadList()
    alert('登録しました')
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="px-6 py-4 bg-white border-b">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <h1 className="text-2xl font-bold">
            ネイルチップ販売管理（urupuya.）
          </h1>
          <nav className="flex gap-2">
            <button
              className={`px-3 py-1 rounded-lg ${
                tab === 'dashboard' ? 'bg-black text-white' : 'border'
              }`}
              onClick={() => setTab('dashboard')}
            >
              ダッシュボード
            </button>
            <button
              className={`px-3 py-1 rounded-lg ${
                tab === 'form' ? 'bg-black text-white' : 'border'
              }`}
              onClick={() => setTab('form')}
            >
              登録
            </button>
            <button
              className={`px-3 py-1 rounded-lg ${
                tab === 'list' ? 'bg-black text-white' : 'border'
              }`}
              onClick={() => setTab('list')}
            >
              売上一覧
            </button>
            <button
              className={`px-3 py-1 rounded-lg ${
                tab === 'stores' ? 'bg-black text-white' : 'border'
              }`}
              onClick={() => setTab('stores')}
            >
              店舗管理
            </button>
          </nav>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-6 space-y-6">
        {tab === 'dashboard' && <Dashboard />}

        {tab === 'form' && (
          <div className="rounded-2xl shadow-md p-5 bg-white">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold">データ登録</h2>
              <div className="text-sm text-slate-500">
                店舗は「店舗管理」から追加/変更できます
              </div>
            </div>

            <form onSubmit={onSubmit} className="grid md:grid-cols-3 gap-4">
              {/* チップ種類 */}
              <div>
                <label className="block text-sm font-medium mb-1">チップ種類</label>
                <select
                  className="w-full rounded-xl border p-2"
                  value={form.chip_type}
                  onChange={(e) => setForm({ ...form, chip_type: e.target.value })}
                >
                  {CHIP_TYPES.map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
              </div>

              {/* チップ番号 */}
              <div>
                <label className="block text-sm font-medium mb-1">チップ番号</label>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="\d*"
                  className="w-full rounded-xl border p-2"
                  placeholder="任意の番号（数字のみ）"
                  value={form.chip_number}
                  onChange={(e) => setForm({ ...form, chip_number: e.target.value })}
                />
              </div>

              {/* S/M/L */}
              <div>
                <label className="block text-sm font-medium mb-1">
                  S/M/L（空欄可）
                </label>
                <select
                  className="w-full rounded-xl border p-2"
                  value={form.size_cls}
                  onChange={(e) => setForm({ ...form, size_cls: e.target.value })}
                >
                  <option value="">（未指定）</option>
                  <option value="S">S（→26569）</option>
                  <option value="M">M（→15458）</option>
                  <option value="L">L（→04347）</option>
                </select>
              </div>

              {/* 5桁サイズ */}
              <div>
                <label className="block text-sm font-medium mb-1">5桁サイズ</label>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="\d*"
                  className="w-full rounded-xl border p-2"
                  placeholder="例: 26569 / 04347"
                  value={form.size_digits}
                  onChange={(e) =>
                    setForm({ ...form, size_digits: e.target.value })
                  }
                />
              </div>

              {/* 価格 */}
              <div>
                <label className="block text-sm font-medium mb-1">価格（税抜）</label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  className="w-full rounded-xl border p-2 text-right"
                  placeholder="例: 3200"
                  value={form.price_total}
                  onChange={(e) =>
                    setForm({ ...form, price_total: e.target.value })
                  }
                  required
                />
              </div>

              {/* 店舗 */}
              <div>
                <label className="block text-sm font-medium mb-1">店舗</label>
                <select
                  className="w-full rounded-xl border p-2"
                  value={form.store_id}
                  onChange={(e) =>
                    setForm({ ...form, store_id: e.target.value })
                  }
                  required
                >
                  <option value="">（選択してください）</option>
                  {stores.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* 売上月 */}
              <div>
                <label className="block text-sm font-medium mb-1">
                  売上月（任意・年月選択）
                </label>
                <input
                  type="month"
                  className="w-full rounded-xl border p-2"
                  value={form.month}
                  onChange={(e) => setForm({ ...form, month: e.target.value })}
                />
              </div>

              {/* 備考 */}
              <div className="md:col-span-3">
                <label className="block text-sm font-medium mb-1">備考</label>
                <textarea
                  className="w-full rounded-xl border p-2"
                  rows={3}
                  placeholder="メモなど（任意）"
                  value={form.note}
                  onChange={(e) => setForm({ ...form, note: e.target.value })}
                />
              </div>

              {/* 登録ボタン */}
              <div className="md:col-span-3">
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-black text-white disabled:opacity-50"
                  disabled={submitting}
                >
                  {submitting ? '登録中…' : '登録する'}
                </button>
              </div>
            </form>
          </div>
        )}

        {tab === 'list' && (
          <SalesTable rows={rows} stores={stores} onUpdated={loadList} />
        )}

        {tab === 'stores' && <StoreManager />}
      </main>

      <footer className="py-6 text-center text-sm text-slate-500">
        © {new Date().getFullYear()} Sales Dashboard
      </footer>
    </div>
  )
}