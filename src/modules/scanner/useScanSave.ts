import { supabase } from '../../lib/supabase'
import { newId } from '../../lib/id'
import type { ExtractedReceipt } from './scannerTypes'

/**
 * Uploads the receipt image (if any), then makes the one RPC call that does
 * the whole six-table write server-side, in one transaction. Never
 * orchestrate the individual table writes from here — that is what
 * save_receipt exists to prevent. Idempotent on (user_id, client_ref): a
 * retry with the same client_ref returns the existing expense_id instead of
 * writing a duplicate.
 */
export async function saveReceipt(extracted: ExtractedReceipt, imageFile: File | null): Promise<string> {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Not signed in')

  let imageUrl = extracted.image_url
  if (imageFile) {
    const path = `${user.id}/receipts/${newId()}-${imageFile.name}`
    const { error: uploadError } = await supabase.storage.from('media').upload(path, imageFile)
    if (uploadError) throw uploadError
    const { data: publicUrlData } = supabase.storage.from('media').getPublicUrl(path)
    imageUrl = publicUrlData.publicUrl
  }

  const { data, error } = await supabase.rpc('save_receipt', {
    payload: { ...extracted, image_url: imageUrl },
  })
  if (error) throw error
  return data as string
}
