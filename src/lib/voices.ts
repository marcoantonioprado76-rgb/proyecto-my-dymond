/**
 * Catálogo de voces para las notas de voz de los agentes (ElevenLabs / Fish).
 *
 * SIN secretos — lo importan tanto el cliente (selector en la UI) como el
 * servidor (motor TTS). La API key vive solo en el servidor (tts.ts).
 */

export interface BotVoice {
  id: string
  name: string
  desc: string
  gender: 'female' | 'male'
  provider?: 'elevenlabs' | 'fish' // por defecto elevenlabs
}

export const BOT_VOICES: BotVoice[] = [
  { id: 'OvtO9gsCwLixPcLCwlEK', name: 'Paola',     desc: 'Argentina · segura · anuncios',      gender: 'female' },
  { id: 'z24CeWYH9yhrPKMBKU69', name: 'Carolina',  desc: 'Latina · profesional · formal',      gender: 'female' },
  { id: 'VP1iqtlANFWQMax9Iw8M', name: 'Kizzy',     desc: 'Latina · cálida · cercana',          gender: 'female' },
  { id: 'M8loDRgNKB2tSjz2DSyo', name: 'Fran',      desc: 'Latino · joven · profesional',       gender: 'male'   },
  { id: '2lXqHPvvYzPdMCli0szc', name: 'Cruz',      desc: 'Latino · casual · conversacional',   gender: 'male'   },
  { id: 'UxEeTOXgTgyv54iyYaa5', name: 'Alexander', desc: 'Colombiano · seguro · cierre',       gender: 'male'   },
  { id: 'ff2941afa1654da5bb1f48ec1f908071', name: 'Orlando', desc: 'Latino · natural · cercano',  gender: 'male',   provider: 'fish' },
  { id: '91cb315c198e4b00be65bbd69a737d50', name: 'Yecenia', desc: 'Latina · cálida · natural',   gender: 'female', provider: 'fish' },
]

export const DEFAULT_VOICE_ID = 'M8loDRgNKB2tSjz2DSyo' // Fran

/** Modos: cuándo responde con voz el agente. */
export type VoiceMode = 'off' | 'audio_in' | 'always'
export const VOICE_MODES: Array<{ id: VoiceMode; label: string; desc: string }> = [
  { id: 'off',      label: 'Desactivada',           desc: 'El agente responde solo con texto (como hoy).' },
  { id: 'audio_in', label: 'Solo si mandan audio',  desc: 'Si el cliente envía una nota de voz, el agente responde con voz. Recomendado.' },
  { id: 'always',   label: 'Siempre con voz',       desc: 'El agente responde siempre con nota de voz.' },
]

/** Devuelve una voz válida del catálogo a partir de un id (o la voz por defecto). */
export function resolveVoice(id?: string | null): BotVoice {
  return BOT_VOICES.find(v => v.id === id) ?? BOT_VOICES.find(v => v.id === DEFAULT_VOICE_ID) ?? BOT_VOICES[0]
}
