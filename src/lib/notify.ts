const TELEGRAM_BOT_USERNAME = import.meta.env.VITE_TELEGRAM_BOT_USERNAME

export function getTelegramConnectUrl(userId: string) {
  if (!TELEGRAM_BOT_USERNAME) return null
  return `https://t.me/${TELEGRAM_BOT_USERNAME}?start=${userId}`
}
