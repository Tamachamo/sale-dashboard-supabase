// src/components/SalesTable.jsx
import { useMemo, useState } from 'react'
import dayjs from 'dayjs'
import { updateSale, deleteSale } from '../api'

useEffect(() => {
  localStorage.setItem('lastPage', '/sales')
}, [])

export default function SalesTable({ rows, stores, onUpdated }) {
  const [editId, setEditId] = useState(null)
  const [draft, setDraft] = useState({})
  const [busy, setBusy] = useState(false)

  const storeMap = useMemo(()=>Object.fromEntries(stores.map(s=>[s.id, s.name])), [stores])

  function startEdit(row) {
    setEditId(row.id)
    setDraft({
      chip_type: row.chip_type,
      chip_number: row.chip_number || '',   // 追加
      size_cls: row.size_cls || '',
      size_digits: row.size_digits || '',
      price_total: row.price_total,
      store_id: row.store_id || '',
      manual_month: row.manual_month || '',
      note: row.note || ''                  // 追加
    })
  }

  async function saveEdit() {
    setBusy(true)
    const patch = {
      chip_type: draft.chip_type,
      chip_number: draft.chip_number || null, // 追加
      size_cls: draft.size_cls || null,
      size_digits: draft.size_digits || null,
      price_total: Number(draft.price_total),
      store_id: draft.store_id || null,
      manual_month: draft.manual_month || null,
      note: draft.note || null               // 追加
    }
    const r = await updateSale(editId, patch)
    setBusy(false)
    if (!r.ok) return alert('更新失敗: ' + r.error)
    setEditId(null)
    setDraft({})
    onUpdated && onUpdated()
  }

  async function removeRow(id) {
    if (!confirm('この売上データを削除します。よろしいですか？')) return
    setBusy(true)
    const r = await deleteSale(id)
    setBusy(false)
    if (!r.ok) return alert('削除失敗: ' + (r.error?.message || '不明なエラー'))
    onUpdated && onUpdated()
  }

  return (
    <div className="rounded-2xl border bg-white overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-slate-50">
            <th className="text-left p-3">日時</th>
            <th className="text-left p-3">月</th>
            <th className="text-left p-3">店舗</th>
            <th className="text-left p-3">種類</th>
            <th className="text-left p-3">番号</th>      {/* 追加 */}
            <th className="text-left p-3">S/M/L</th>
            <th className="text-left p-3">5桁</th>
            <th className="text-right p-3">価格</th>
            <th className="text-left p-3">備考</th>     {/* 追加 */}
            <th className="p-3 w-56">操作</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(r => {
            const isEdit = editId === r.id
            return (
              <tr key={r.id} className="border-b last:border-b-0 align-top">
                <td className="p-3 whitespace-nowrap">{dayjs(r.created_at).format('YYYY/MM/DD HH:mm')}</td>
                <td className="p-3">{r.manual_month || r.month}</td>
                <td className="p-3">{isEdit ? (
                  <select
                    className="w-full rounded-lg border p-2"
                    value={draft.store_id || ''}
                    onChange={(e)=>setDraft(d=>({...d, store_id:e.target.value}))}
                    disabled={busy}
                  >
                    <option value="">（未選択）</option>
                    {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                ) : (r.stores?.name || '(未設定)')}</td>
                <td className="p-3">{isEdit ? (
                  <select
                    className="w-full rounded-lg border p-2"
                    value={draft.chip_type}
                    onChange={(e)=>setDraft(d=>({...d, chip_type:e.target.value}))}
                    disabled={busy}
                  >
                    <option>ショートオーバル</option>
                    <option>ベリーショート</option>
                  </select>
                ) : r.chip_type}</td>
                <td className="p-3">{isEdit ? (
                  <input
                    className="w-28 rounded-lg border p-2"
                    value={draft.chip_number || ''}
                    onChange={(e)=>setDraft(d=>({...d, chip_number:e.target.value}))}
                    disabled={busy}
                  />
                ) : (r.chip_number || '')}</td>
                <td className="p-3">{isEdit ? (
                  <select
                    className="w-full rounded-lg border p-2"
                    value={draft.size_cls || ''}
                    onChange={(e)=>setDraft(d=>({...d, size_cls:e.target.value}))}
                    disabled={busy}
                  >
                    <option value="">（空）</option>
                    <option value="S">S</option>
                    <option value="M">M</option>
                    <option value="L">L</option>
                  </select>
                ) : (r.size_cls || '')}</td>
                <td className="p-3">{isEdit ? (
                  <input
                    className="w-28 rounded-lg border p-2"
                    value={draft.size_digits || ''}
                    onChange={(e)=>setDraft(d=>({...d, size_digits:e.target.value}))}
                    disabled={busy}
                  />
                ) : (r.size_digits || '')}</td>
                <td className="p-3 text-right">{isEdit ? (
                  <input
                    type="number"
                    className="w-28 rounded-lg border p-2 text-right"
                    value={draft.price_total}
                    onChange={(e)=>setDraft(d=>({...d, price_total:e.target.value}))}
                    disabled={busy}
                  />
                ) : r.price_total?.toLocaleString()}</td>
                <td className="p-3">{isEdit ? (
                  <textarea
                    className="w-full rounded-lg border p-2"
                    rows={2}
                    value={draft.note || ''}
                    onChange={(e)=>setDraft(d=>({...d, note:e.target.value}))}
                    disabled={busy}
                  />
                ) : (r.note || '')}</td>
                <td className="p-3">
                  {isEdit ? (
                    <div className="flex gap-2 justify-end">
                      <button
                        className="px-3 py-1 rounded-lg bg-black text-white disabled:opacity-50"
                        onClick={saveEdit}
                        disabled={busy}
                      >
                        {busy ? '保存中…' : '保存'}
                      </button>
                      <button
                        className="px-3 py-1 rounded-lg border"
                        onClick={()=>{ setEditId(null); setDraft({}) }}
                        disabled={busy}
                      >
                        キャンセル
                      </button>
                    </div>
                  ) : (
                    <div className="flex gap-2 justify-end">
                      <button className="px-3 py-1 rounded-lg border" onClick={()=>startEdit(r)}>編集</button>
                      <button className="px-3 py-1 rounded-lg border text-red-600" onClick={()=>removeRow(r.id)} disabled={busy}>削除</button>
                    </div>
                  )}
                </td>
              </tr>
            )
          })}
          {rows.length === 0 && (
            <tr><td className="p-4 text-slate-500" colSpan={10}>データがありません。</td></tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
