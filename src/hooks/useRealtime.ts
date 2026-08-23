import { useEffect, useRef } from 'react'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

/**
 * One realtime channel per table, shared by every hook that watches it.
 *
 * The naive version — `supabase.channel(`${table}-realtime`).on(...)` inside
 * the effect — breaks as soon as two components watch the same table.
 * `RealtimeClient.channel()` dedupes by topic and hands back the channel that
 * already exists, and `.on('postgres_changes', ...)` throws on a channel that
 * has already been subscribed. It also tore down the shared channel when the
 * first of the two unmounted, silently killing the survivor's updates.
 *
 * So subscriptions are refcounted here instead: the first listener for a table
 * opens the channel, the last one to leave closes it, and the channel fans one
 * postgres_changes event out to all of them.
 */
type Subscription = { channel: RealtimeChannel; listeners: Set<() => void> }

const subscriptions = new Map<string, Subscription>()

/**
 * Topics carry a serial because `removeChannel` resolves asynchronously. Under
 * StrictMode's mount/unmount/mount an unsuffixed topic can still be in the
 * client's channel list while it is being torn down, and the remount would be
 * handed that dying channel — the exact error this module exists to avoid.
 */
let topicSeq = 0

function addListener(table: string, listener: () => void) {
  let sub = subscriptions.get(table)

  if (!sub) {
    const listeners = new Set<() => void>()
    const channel = supabase
      .channel(`${table}-realtime-${++topicSeq}`)
      .on('postgres_changes', { event: '*', schema: 'public', table }, () => {
        // Copied before iterating: a listener that unmounts in response to the
        // change would otherwise mutate the set mid-iteration.
        for (const fn of [...listeners]) fn()
      })
      .subscribe()

    sub = { channel, listeners }
    subscriptions.set(table, sub)
  }

  sub.listeners.add(listener)
}

function removeListener(table: string, listener: () => void) {
  const sub = subscriptions.get(table)
  if (!sub) return

  sub.listeners.delete(listener)
  if (sub.listeners.size > 0) return

  subscriptions.delete(table)
  supabase.removeChannel(sub.channel)
}

export function useRealtime(table: string, onChange: () => void) {
  const callbackRef = useRef(onChange)
  callbackRef.current = onChange

  useEffect(() => {
    // Stable identity so the set can remove exactly this consumer, while the
    // ref keeps it pointed at the latest onChange without resubscribing.
    const listener = () => callbackRef.current()
    addListener(table, listener)
    return () => removeListener(table, listener)
  }, [table])
}
