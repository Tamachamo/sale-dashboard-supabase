// src/api.js
import { supabase } from './lib/supabase'

/** ---------- Stores (店舗) ---------- */
export async function listStores() {
  const { data, error } = await supabase
    .from('stores')
    .select('id, name')
    .order('name', { ascending: true })
  if (error) return { ok:false, error: error.message, stores: [] }
  return { ok:true, stores: data || [] }
}

export async function createStore(name) {
  const { data, error } = await supabase
    .from('stores')
    .insert([{ name }])
    .select()
    .single()
  if (error) return { ok:false, error: error.message }
  return { ok:true, store: data }
}

export async function updateStore(id, name) {
  const { data, error } = await supabase
    .from('stores')
    .update({ name })
    .eq('id', id)
    .select()
    .single()
  if (error) return { ok:false, error: error.message }
  return { ok:true, store: data }
}

export async function deleteStore(id) {
  const { error } = await supabase.from('stores').delete().eq('id', id)
  if (error) return { ok:false, error }
  return { ok:true }
}

/** ---------- Sales (売上) ---------- */
export async function submitSale(payload) {
  const { data, error } = await supabase.from('sales').insert([{
    chip_type: payload.chip_type,
    chip_number: payload.chip_number || null,  // 追加
    size_cls: payload.size_cls || null,
    size_digits: payload.size_digits || null,
    price_total: Number(payload.price_total),
    manual_month: payload.month || null,
    store_id: payload.store_id || null,
    note: payload.note || null                 // 追加
  }]).select(`
    id, created_at, month, manual_month, chip_type, chip_number, size_cls, size_digits, price_total,
    store_id, stores(name), note
  `).single()

  if (error) return { ok:false, error: error.message }
  return { ok:true, data }
}

export async function fetchRows({ storeId='ALL', start='', end='', limit=500 } = {}) {
  let q = supabase.from('sales')
    .select(`
      id, created_at, month, manual_month, chip_type, chip_number, size_cls, size_digits, price_total,
      store_id, stores(name), note
    `)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (start) q = q.gte('month', start)
  if (end)   q = q.lte('month', end)
  if (storeId !== 'ALL') q = q.eq('store_id', storeId)

  const { data, error } = await q
  if (error) return { ok:false, error: error.message, rows: [] }
  return { ok:true, rows: data || [] }
}

export async function updateSale(id, patch) {
  const { data, error } = await supabase
    .from('sales')
    .update({
      chip_type: patch.chip_type,
      chip_number: patch.chip_number ?? null,     // 追加
      size_cls: patch.size_cls ?? null,
      size_digits: patch.size_digits ?? null,
      price_total: Number(patch.price_total),
      store_id: patch.store_id ?? null,
      manual_month: patch.manual_month ?? null,
      note: patch.note ?? null                    // 追加
    })
    .eq('id', id)
    .select(`
      id, created_at, month, manual_month, chip_type, chip_number, size_cls, size_digits, price_total,
      store_id, stores(name), note
    `).single()
  if (error) return { ok:false, error: error.message }
  return { ok:true, data }
}

export async function deleteSale(id) {
  const { error } = await supabase.from('sales').delete().eq('id', id)
  if (error) return { ok:false, error }
  return { ok:true }
}
