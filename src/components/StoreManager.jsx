// src/components/StoreManager.jsx
import { useEffect, useState } from 'react'
import { listStores, createStore, updateStore, deleteStore } from '../api'


export default function StoreManager() {
  const [stores, setStores] = useState([])
  const [newName, setNewName] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [editingName, setEditingName] = useState('')
  const [busy, setBusy] = useState(false)

  async function load() {
    const r = await listStores()
    if (r.ok) setStores(r.stores)
  }
  useEffect(() => { load() }, [])

  async function onAdd(e) {
    e.preventDefault()
    if (!newName.trim()) return
    setBusy(true)
    const r = await createStore(newName.trim())
    setBusy(false)
    if (!r.ok) return alert('追加失敗: ' + r.error)
    setNewName('')
    load()
  }

  async function onSaveEdit() {
    if (!editingName.trim()) return
    setBusy(true)
    const r = await updateStore(editingId, editingName.trim())
    setBusy(false)
    if (!r.ok) return alert('更新失敗: ' + r.error)
    setEditingId(null)
    setEditingName('')
    load()
  }

  async function onDelete(id, name) {
    if (!confirm(`店舗「${name}」を削除します。よろしいですか？`)) return
    setBusy(true)
    const r = await deleteStore(id)
    setBusy(false)
    if (!r.ok) {
      // 外部キー制約などの人間向けメッセージ
      const msg = (r.error?.code === '23503' || /foreign key|参照|constraint/i.test(r.error?.message || ''))
        ? 'この店舗に紐づく売上データがあるため削除できません。先に該当売上の店舗を変更/削除してください。'
        : `削除失敗: ${r.error?.message || '不明なエラー'}`
      return alert(msg)
    }
    load()
  }

  return (
    <div className="space-y-4">
      <form onSubmit={onAdd} className="flex gap-2">
        <input
          className="flex-1 rounded-xl border p-2"
          placeholder="店舗名を入力して追加"
          value={newName}
          onChange={(e)=>setNewName(e.target.value)}
          disabled={busy}
        />
        <button
          className="px-4 py-2 rounded-xl bg-black text-white disabled:opacity-50"
          disabled={busy}
        >
          {busy ? '処理中…' : '追加'}
        </button>
      </form>

      <div className="rounded-2xl border bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-slate-50">
              <th className="text-left p-3">店舗名</th>
              <th className="p-3 w-48">操作</th>
            </tr>
          </thead>
          <tbody>
          {stores.map(s => (
            <tr key={s.id} className="border-b last:border-b-0">
              <td className="p-3">
                {editingId === s.id ? (
                  <input
                    className="w-full rounded-xl border p-2"
                    value={editingName}
                    onChange={(e)=>setEditingName(e.target.value)}
                    disabled={busy}
                  />
                ) : s.name}
              </td>
              <td className="p-3 text-right">
                {editingId === s.id ? (
                  <div className="flex gap-2 justify-end">
                    <button
                      type="button"
                      className="px-3 py-1 rounded-lg bg-black text-white disabled:opacity-50"
                      onClick={onSaveEdit}
                      disabled={busy}
                    >
                      保存
                    </button>
                    <button
                      type="button"
                      className="px-3 py-1 rounded-lg border"
                      onClick={()=>{ setEditingId(null); setEditingName('') }}
                      disabled={busy}
                    >
                      キャンセル
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-2 justify-end">
                    <button
                      type="button"
                      className="px-3 py-1 rounded-lg border"
                      onClick={()=>{ setEditingId(s.id); setEditingName(s.name) }}
                      disabled={busy}
                    >
                      変更
                    </button>
                    <button
                      type="button"
                      className="px-3 py-1 rounded-lg border text-red-600"
                      onClick={()=>onDelete(s.id, s.name)}
                      disabled={busy}
                    >
                      削除
                    </button>
                  </div>
                )}
              </td>
            </tr>
          ))}
          {stores.length === 0 && (
            <tr><td className="p-4 text-slate-500" colSpan={2}>店舗がありません。上で追加してください。</td></tr>
          )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
