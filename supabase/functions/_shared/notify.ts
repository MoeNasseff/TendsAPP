import nodemailer from 'npm:nodemailer@6.9.14'
import webpush from 'npm:web-push@3.6.7'

export type ReminderChannel = 'telegram' | 'push' | 'email' | 'whatsapp'

export interface NotifyPayload {
  title: string
  body: string | null
  image_url: string | null
  url?: string
  chat_id?: string | null
  push_subscription?: webpush.PushSubscription | null
  email?: string | null
}

export interface NotifyResult {
  sent: boolean
  reason?: string
}

export async function notify(channel: ReminderChannel, payload: NotifyPayload): Promise<NotifyResult> {
  switch (channel) {
    case 'telegram':
      return notifyTelegram(payload)
    case 'push':
      return notifyPush(payload)
    case 'email':
      return notifyEmail(payload)
    case 'whatsapp':
      return notifyWhatsapp(payload)
    default:
      return { sent: false, reason: `Unknown channel: ${channel}` }
  }
}

async function notifyTelegram(payload: NotifyPayload): Promise<NotifyResult> {
  const token = Deno.env.get('TELEGRAM_BOT_TOKEN')
  if (!token) return { sent: false, reason: 'TELEGRAM_BOT_TOKEN not configured' }
  if (!payload.chat_id) return { sent: false, reason: 'User has not linked Telegram yet' }

  const text = `⏰ *${payload.title}*\n\n${payload.body ?? ''}`.trim()
  const isPhoto = !!payload.image_url
  const method = isPhoto ? 'sendPhoto' : 'sendMessage'
  const body: Record<string, unknown> = { chat_id: payload.chat_id, parse_mode: 'Markdown' }
  if (isPhoto) {
    body.photo = payload.image_url
    body.caption = text
  } else {
    body.text = text
  }

  const res = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  if (!res.ok) return { sent: false, reason: `Telegram API error: ${await res.text()}` }
  return { sent: true }
}

async function notifyPush(payload: NotifyPayload): Promise<NotifyResult> {
  const publicKey = Deno.env.get('VAPID_PUBLIC_KEY')
  const privateKey = Deno.env.get('VAPID_PRIVATE_KEY')
  if (!publicKey || !privateKey) return { sent: false, reason: 'VAPID keys not configured' }
  if (!payload.push_subscription) return { sent: false, reason: 'User has no push subscription' }

  webpush.setVapidDetails('mailto:notifications@tend.app', publicKey, privateKey)
  try {
    await webpush.sendNotification(
      payload.push_subscription,
      JSON.stringify({ title: payload.title, body: payload.body, image: payload.image_url, url: payload.url }),
    )
    return { sent: true }
  } catch (err) {
    return { sent: false, reason: `Push error: ${err instanceof Error ? err.message : String(err)}` }
  }
}

async function notifyEmail(payload: NotifyPayload): Promise<NotifyResult> {
  const host = Deno.env.get('SMTP_HOST')
  const user = Deno.env.get('SMTP_USER')
  const pass = Deno.env.get('SMTP_PASS')
  if (!host || !user || !pass) return { sent: false, reason: 'SMTP not configured' }
  if (!payload.email) return { sent: false, reason: 'User has no email on file' }

  const port = parseInt(Deno.env.get('SMTP_PORT') ?? '587', 10)
  const from = Deno.env.get('SMTP_FROM') || user

  const transport = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  })

  const html = `
    <div style="font-family:Inter,Arial,sans-serif;max-width:600px;margin:0 auto;background:#12303a;color:#e2e8f0;padding:32px;border-radius:16px">
      <h1 style="color:#278276;font-size:20px;margin:0 0 16px">⏰ ${payload.title}</h1>
      ${payload.image_url ? `<img src="${payload.image_url}" style="max-width:100%;border-radius:12px;margin-bottom:16px" alt="" />` : ''}
      <p style="font-size:14px;line-height:1.6;margin:0">${payload.body ?? ''}</p>
    </div>`

  await transport.sendMail({ from, to: payload.email, subject: `Reminder: ${payload.title}`, html })
  return { sent: true }
}

function notifyWhatsapp(payload: NotifyPayload): Promise<NotifyResult> {
  const enabled = Deno.env.get('WHATSAPP_ENABLED') === 'true'
  if (!enabled) {
    console.log(`[whatsapp] disabled by flag — would have sent "${payload.title}"`)
    return Promise.resolve({ sent: false, reason: 'WhatsApp not enabled (WHATSAPP_ENABLED=false)' })
  }
  // TODO: Meta Cloud API integration once WHATSAPP_ACCESS_TOKEN/WHATSAPP_PHONE_NUMBER_ID are set —
  // see supabase/README.md for the request shape (mirrors config/n8n/whatsapp-meeting-bot.json).
  console.log('[whatsapp] enabled but Meta Cloud API integration not implemented yet')
  return Promise.resolve({ sent: false, reason: 'WhatsApp integration not implemented' })
}
