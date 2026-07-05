import { createClient } from 'npm:@supabase/supabase-js@2'

Deno.serve(async (req: Request) => {
  const expectedSecret = Deno.env.get('TELEGRAM_WEBHOOK_SECRET')
  if (expectedSecret && req.headers.get('x-telegram-bot-api-secret-token') !== expectedSecret) {
    return new Response('Unauthorized', { status: 401 })
  }

  const update = await req.json()
  const message = update.message
  const token = Deno.env.get('TELEGRAM_BOT_TOKEN')

  if (!message?.text || !token) return new Response('ok')

  const chatId = message.chat.id as number

  async function reply(text: string) {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text }),
    })
  }

  if (message.text.startsWith('/start')) {
    const userId = message.text.split(' ')[1]?.trim()
    if (!userId) {
      await reply('👋 Open the app and tap "Connect Telegram" to link your account.')
      return new Response('ok')
    }

    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
    const { error } = await supabase.from('profiles').update({ telegram_chat_id: String(chatId) }).eq('id', userId)

    await reply(
      error
        ? '❌ Something went wrong linking your account. Please try the link from the app again.'
        : "✅ Telegram connected! You'll receive your reminders here.",
    )
    return new Response('ok')
  }

  await reply("🤖 Send /start from the app's Telegram connect link to link your account.")
  return new Response('ok')
})
