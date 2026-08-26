const CALLMEBOT_URL = "https://api.callmebot.com/whatsapp.php"

export async function sendWhatsApp(message: string): Promise<void> {
  const phone = process.env.CALLMEBOT_PHONE
  const apikey = process.env.CALLMEBOT_APIKEY

  if (!phone || !apikey) return

  const url = `${CALLMEBOT_URL}?phone=${phone}&text=${encodeURIComponent(message)}&apikey=${apikey}`
  await fetch(url)
}
