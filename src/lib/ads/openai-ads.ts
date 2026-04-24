/**
 * OpenAI integration for the Ads AI System.
 * Uses native fetch (no SDK) with the user's own API key.
 */

export interface BusinessBriefData {
    name: string
    industry: string
    description: string
    valueProposition: string
    painPoints: string[]
    interests: string[]
    brandVoice: string
    brandColors: string[]
    visualStyle: string[]
    primaryObjective: string
    mainCTA: string
    targetLocations: string[]
    keyMessages: string[]
    personalityTraits: string[]
    contentThemes: string[]
    engagementLevel: string
}

export interface AdCopyData {
    slotIndex: number
    primaryText: string
    headline: string
    description: string
    hook: string
    hashtags?: string   // space-separated winning hashtags e.g. "#FitnessMotivation #GymLife"
}

const OPENAI_BASE = 'https://api.openai.com/v1'

/** Validates a user's OpenAI API key with a lightweight model call */
export async function validateApiKey(apiKey: string): Promise<boolean> {
    try {
        const res = await fetch(`${OPENAI_BASE}/models`, {
            headers: { Authorization: `Bearer ${apiKey}` }
        })
        return res.ok
    } catch {
        return false
    }
}

/** Transcribes audio using OpenAI Whisper-1 */
export async function transcribeAudio(
    audioBuffer: Buffer,
    fileName: string,
    apiKey: string
): Promise<string> {
    const formData = new FormData()
    const blob = new Blob([audioBuffer.buffer as ArrayBuffer], { type: 'audio/webm' })
    formData.append('file', blob, fileName)
    formData.append('model', 'whisper-1')
    formData.append('language', 'es')

    const res = await fetch(`${OPENAI_BASE}/audio/transcriptions`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}` },
        body: formData
    })

    if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err?.error?.message || `Whisper error ${res.status}`)
    }

    const data = await res.json()
    return data.text as string
}

/** Generates a structured BusinessBrief from free text using GPT-4o */
export async function generateBusinessBrief(
    text: string,
    apiKey: string,
    model = 'gpt-4o'
): Promise<BusinessBriefData> {
    const systemPrompt = `Eres un experto en marketing digital, copywriting y estrategia de marca. Tu tarea es analizar la descripción de un negocio y extraer información estructurada para crear campañas publicitarias de alto rendimiento. Responde ÚNICAMENTE con un JSON válido, sin markdown, sin texto adicional.`

    const userPrompt = `Analiza el siguiente texto sobre un negocio y extrae la información de marketing. Si no se menciona algún campo, inferlo inteligentemente del contexto.

TEXTO DEL NEGOCIO:
"""
${text}
"""

Devuelve EXACTAMENTE este JSON (todos los campos son obligatorios):
{
  "name": "nombre del negocio",
  "industry": "industria (ej: Salud y Bienestar, Moda, Tecnología, Alimentación, Belleza, etc)",
  "description": "descripción completa del negocio en 2-3 oraciones claras",
  "valueProposition": "propuesta de valor única que diferencia al negocio en 1-2 oraciones directas",
  "painPoints": ["problema que resuelve 1", "problema que resuelve 2", "problema que resuelve 3", "problema 4", "problema 5"],
  "interests": ["interés del cliente ideal 1", "interés 2", "interés 3", "interés 4", "interés 5"],
  "brandVoice": "tono de comunicación (ej: casual e informativo, profesional y confiable, urgente y directo)",
  "brandColors": ["#hexcolor1", "#hexcolor2", "#hexcolor3"],
  "visualStyle": ["estilo visual 1 (ej: minimalista)", "estilo 2", "estilo 3"],
  "primaryObjective": "conversion",
  "mainCTA": "llamada a la acción principal (ej: Comprar ahora, Solicitar info, Ver oferta)",
  "targetLocations": ["país o ciudad principal"],
  "keyMessages": ["mensaje clave 1", "mensaje clave 2", "mensaje clave 3"],
  "personalityTraits": ["rasgo de marca 1", "rasgo 2", "rasgo 3"],
  "contentThemes": ["tema de contenido 1", "tema 2", "tema 3"],
  "engagementLevel": "alto"
}`

    const res = await fetch(`${OPENAI_BASE}/chat/completions`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`
        },
        body: JSON.stringify({
            model,
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt }
            ],
            temperature: 0.4,
            max_tokens: 1200,
            response_format: { type: 'json_object' }
        })
    })

    if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err?.error?.message || `OpenAI error ${res.status}`)
    }

    const data = await res.json()
    const content = data.choices?.[0]?.message?.content
    if (!content) throw new Error('OpenAI no devolvió contenido')

    try {
        return JSON.parse(content) as BusinessBriefData
    } catch {
        throw new Error('Error al parsear el brief generado por IA')
    }
}

/** Generates N ad copies based on brief + strategy using GPT-4o */
export async function generateAdCopies(params: {
    brief: BusinessBriefData
    strategyName: string
    platform: string
    objective: string
    destination: string
    mediaType: string
    count: number
    apiKey: string
    model?: string
}): Promise<AdCopyData[]> {
    const { brief, strategyName, platform, objective, destination, mediaType, count, apiKey, model = 'gpt-4o' } = params

    const platformLimits: Record<string, { primaryText: number; headline: number; description: number }> = {
        META: { primaryText: 500, headline: 40, description: 30 },
        TIKTOK: { primaryText: 300, headline: 50, description: 80 },
        GOOGLE_ADS: { primaryText: 90, headline: 30, description: 90 }
    }

    const limits = platformLimits[platform] || platformLimits['META']

    const destinationMap: Record<string, string> = {
        instagram: 'Instagram (feed y stories)',
        whatsapp: 'WhatsApp Business',
        website: 'Sitio web / tienda online',
        messenger: 'Facebook Messenger',
        tiktok: 'TikTok'
    }

    const hashtagInstructions = platform === 'GOOGLE_ADS'
        ? '- hashtags: "" (Google Ads no usa hashtags)'
        : platform === 'TIKTOK'
            ? `- hashtags: string con 8-12 hashtags TikTok ganadores (mezcla: 2-3 trending masivos + 4-5 nicho del negocio + 1-2 de acción). Formato: "#Tag1 #Tag2 #Tag3"`
            : `- hashtags: string con 5-8 hashtags Instagram/Facebook ganadores (mezcla: 2 masivos populares + 3-4 de nicho específico del negocio + 1 de acción). Formato: "#Tag1 #Tag2 #Tag3"`

    const systemPrompt = `Eres Alex Hormozi mezclado con Gary Vaynerchuk — el mejor copywriter de publicidad digital en español del mundo. Tienes 15 años de experiencia lanzando campañas de millones de dólares en META, TikTok y Google para marcas latinoamericanas. Conoces los patrones psicológicos que hacen que las personas detengan el scroll, lean y compren.

Tu copy SIEMPRE:
✓ Para el scroll en los primeros 3 segundos (hook brutalmente directo)
✓ Activa una emoción fuerte: aspiración, miedo a perder, FOMO, curiosidad
✓ Habla el idioma del cliente ideal (no jerga corporativa)
✓ Tiene prueba social o autoridad implícita
✓ Crea urgencia REAL sin sonar falso
✓ Usa emojis estratégicamente para romper el texto y llamar atención
✓ Termina con CTA irresistible

Respondes ÚNICAMENTE con JSON válido. NUNCA texto fuera del JSON.`

    const platformGuide = platform === 'TIKTOK'
        ? 'Para TikTok: copy muy corto, energético, con lenguaje Gen-Z/Millennial, emojis frecuentes, sentido de inmediatez. Hook = pregunta o afirmación provocadora.'
        : platform === 'GOOGLE_ADS'
            ? 'Para Google Ads: copy basado en intención de búsqueda, beneficios claros, palabras clave del negocio, sin emojis excesivos.'
            : 'Para META/Instagram: copy conversacional y aspiracional. Hook emocional en la primera línea. Usa emojis para separar párrafos y llamar atención. Mezcla beneficios racionales y emocionales.'

    const userPrompt = `Crea exactamente ${count} variaciones PREMIUM de anuncios para ${platform} que generen ventas reales.

═══ NEGOCIO ═══
Nombre: ${brief.name}
Industria: ${brief.industry}
Descripción: ${brief.description}
Propuesta de valor ÚNICA: ${brief.valueProposition}
Puntos de dolor del cliente: ${brief.painPoints.join(' | ')}
Voz de marca: ${brief.brandVoice}
Mensajes clave: ${brief.keyMessages.join(' | ')}
CTA principal: ${brief.mainCTA}
Intereses de la audiencia: ${brief.interests?.join(', ')}

═══ ESTRATEGIA ═══
Nombre: ${strategyName}
Plataforma: ${platform}
Objetivo: ${objective}
Destino: ${destinationMap[destination] || destination}
Tipo de creativo: ${mediaType}

${platformGuide}

═══ LÍMITES ESTRICTOS ═══
Primary Text: máx ${limits.primaryText} caracteres
Headline: máx ${limits.headline} caracteres
Description: máx ${limits.description} caracteres

═══ FRAMEWORKS A ROTAR (uno por variación) ═══
Var 1: PAS — Pain → Agitate → Solution (agita el dolor antes de ofrecer la solución)
Var 2: AIDA — Attention → Interest → Desire → Action (clásico pero devastador)
Var 3: Social Proof — Empieza con resultado de un cliente real/hipotético
Var 4: Curiosity Gap — Pregunta o afirmación que OBLIGA a seguir leyendo
Var 5+: Fear of Missing Out — Lo que pierden si no actúan HOY

═══ REGLAS DE ORO ═══
1. Hook (primera oración) = 90% del éxito. Hazlo IMPOSIBLE de ignorar
2. Emojis: usarlos para guiar la lectura (✅ ⚡ 🔥 💡 👇 etc.), no decorar
3. Párrafos cortos: máx 2-3 líneas cada uno
4. Urgencia real: plazo, cantidad limitada, o consecuencia de no actuar
5. Siempre termina con: "${brief.mainCTA}"
6. Varía completamente el ángulo entre variaciones — NO repitas la misma idea
7. Habla de "tú/tu" (tuteo directo al lector)

${hashtagInstructions}

═══ FORMATO DE RESPUESTA ═══
Devuelve EXACTAMENTE este JSON:
{
  "copies": [
    {
      "slotIndex": 0,
      "hook": "primera oración del copy — el hook solo",
      "primaryText": "copy completo con emojis y párrafos...",
      "headline": "titular de hasta ${limits.headline} chars",
      "description": "descripción breve de hasta ${limits.description} chars",
      "hashtags": "#Tag1 #Tag2 #Tag3"
    }
  ]
}
Genera EXACTAMENTE ${count} objetos (slotIndex del 0 al ${count - 1}).`

    const res = await fetch(`${OPENAI_BASE}/chat/completions`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`
        },
        body: JSON.stringify({
            model,
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt }
            ],
            temperature: 0.8,
            max_tokens: 4000,
            response_format: { type: 'json_object' }
        })
    })

    if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err?.error?.message || `OpenAI error ${res.status}`)
    }

    const data = await res.json()
    const content = data.choices?.[0]?.message?.content
    if (!content) throw new Error('OpenAI no devolvió contenido')

    try {
        const parsed = JSON.parse(content)
        let copies: AdCopyData[]
        if (Array.isArray(parsed)) {
            copies = parsed
        } else {
            // Find the first array value in the object (handles: copies, ads, anuncios, variaciones, etc.)
            const arrayVal = Object.values(parsed).find(v => Array.isArray(v))
            if (!arrayVal) throw new Error('La respuesta de OpenAI no contiene un array de copies')
            copies = arrayVal as AdCopyData[]
        }
        return copies.slice(0, count)
    } catch (e: any) {
        throw new Error(e.message || 'Error al parsear los copies generados por IA')
    }
}

export interface SuggestedStrategy {
    name: string
    description: string
    reason: string
    platform: 'META' | 'TIKTOK' | 'GOOGLE_ADS'
    objective: string
    destination: string
    mediaType: string
    mediaCount: number
    minBudgetUSD: number
    advantageType: string
}

/** Generates AI-personalized strategy suggestions based on a business brief */
export async function generateStrategySuggestions(
    brief: BusinessBriefData,
    apiKey: string,
    model = 'gpt-4o',
    platform?: string,
    objective?: string,
    destination?: string,
    mediaType?: string
): Promise<SuggestedStrategy[]> {
    const systemPrompt = `Eres un experto en publicidad digital con 15 años de experiencia en Meta Ads, TikTok Ads y Google Ads. Tu especialidad es analizar negocios y recomendar exactamente qué tipo de campaña publicitaria les funcionará mejor. Respondes ÚNICAMENTE con JSON válido.`

    const platformRules: Record<string, string> = {
        META: `PLATAFORMA: Solo META (Facebook & Instagram).
- Todos los valores de "platform" deben ser "META"
- Destinos disponibles: whatsapp, instagram, website, messenger
- minBudgetUSD: elige entre 4-30 USD según la escala recomendada para ESTE negocio
- advantageType: "advantage" para Meta Advantage+ (recomendado para la mayoría), "smart_segmentation" para segmentación manual por intereses
- Objetivos válidos: conversions, leads, traffic, awareness, engagement
- REGLA ABSOLUTA: NUNCA uses "app_promotion"
- REGLA ABSOLUTA: "engagement" SOLO con destino whatsapp, messenger o instagram (NUNCA website)
- REGLA ABSOLUTA: "traffic" y "awareness" SOLO con destino website o instagram

ELIGE libremente las combinaciones objetivo+destino que mejor encajen con este negocio específico.
Piensa: ¿dónde compran sus clientes? ¿WhatsApp es su canal principal o tienen tienda web? ¿El negocio vive de leads o de ventas directas?
No uses siempre las mismas combinaciones — analiza el negocio y decide cuáles tienen más sentido para ÉL.`,
        TIKTOK: `PLATAFORMA: Solo TIKTOK.
- Todos los valores de "platform" deben ser "TIKTOK"
- Destinos disponibles: tiktok, website
- minBudgetUSD: entre 5-25 USD según la escala recomendada
- advantageType: "custom"
- Enfoca estrategias en contenido visual corto, viral y entretenido
- Elige los objetivos que mejor encajen con este negocio en TikTok`,
        GOOGLE_ADS: `PLATAFORMA: Solo GOOGLE_ADS.
- Todos los valores de "platform" deben ser "GOOGLE_ADS"
- Destinos disponibles: website
- minBudgetUSD: entre 8-40 USD según la escala recomendada
- advantageType: "custom"
- Enfoca estrategias en búsqueda por intención: usa palabras clave que los clientes de ESTE negocio realmente buscan en Google`,
    }

    const platformInstruction = platform && platformRules[platform]
        ? platformRules[platform]
        : `PLATAFORMAS: Varía entre META, TIKTOK y GOOGLE_ADS según lo que mejor se adapte al negocio.
- META mínimo 4 USD, TikTok mínimo 5 USD, Google mínimo 8 USD`

    // If user pre-selected a specific ad type, generate focused strategies for that type
    const focusedMode = !!(objective || destination || mediaType)
    const focusInstruction = focusedMode
        ? `El usuario ya eligió el tipo de anuncio que quiere:${objective ? `\n- Objetivo: ${objective}` : ''}${destination ? `\n- Destino: ${destination}` : ''}${mediaType ? `\n- Tipo de creativo: ${mediaType}` : ''}\n\nGenera EXACTAMENTE 4 estrategias enfocadas en esta combinación, con diferentes ángulos (distintos presupuestos, tamaños de audiencia, enfoques creativos, o variaciones del mismo objetivo). NO generes estrategias con otros objetivos o destinos distintos a los elegidos.`
        : 'Genera entre 6 y 8 estrategias diversas con diferentes objetivos y destinos para cubrir todos los ángulos del negocio.'

    const userPrompt = `Eres un consultor experto en publicidad digital. Analiza este negocio en profundidad y diseña estrategias de campaña ESPECÍFICAS para él — no estrategias genéricas.

${focusInstruction}

═══ NEGOCIO ═══
Nombre: ${brief.name}
Industria: ${brief.industry}
Descripción: ${brief.description}
Propuesta de valor única: ${brief.valueProposition}
Puntos de dolor que resuelve: ${brief.painPoints?.join(' | ')}
Audiencia (intereses): ${brief.interests?.join(', ')}
Voz de marca: ${brief.brandVoice}
CTA principal: ${brief.mainCTA}
Mensajes clave: ${brief.keyMessages?.join(' | ')}
Temas de contenido: ${brief.contentThemes?.join(', ')}
Personalidad de marca: ${brief.personalityTraits?.join(', ')}
Objetivo principal del negocio: ${brief.primaryObjective}
Ubicaciones objetivo: ${brief.targetLocations?.join(', ')}

═══ INSTRUCCIONES DE PERSONALIZACIÓN ═══
Antes de generar, responde internamente estas preguntas sobre el negocio:
1. ¿Sus clientes compran por impulso o necesitan convencimiento? → define el objetivo
2. ¿El canal de venta principal es WhatsApp, web, o redes? → define el destino
3. ¿Es un negocio visual (moda, comida, fitness) o informativo (servicios, consultoría)? → define mediaType
4. ¿Qué presupuesto tiene sentido para esta industria y tamaño?
5. ¿Qué hace ÚNICO a este negocio y cómo se traduce en un anuncio diferente?

Cada estrategia debe tener:
- Un nombre que MENCIONE el negocio o su industria (no nombres genéricos como "Campaña de Conversiones")
- Una descripción que explique exactamente cómo esa estrategia aprovecha lo único de ESTE negocio
- Un "reason" que cite datos específicos del negocio (máx 130 caracteres)

═══ REGLAS TÉCNICAS ═══
1. No repitas la misma combinación objetivo+destino más de una vez
2. mediaCount: 5 para test inicial, 10 para escala, 20 para campaña grande — elige según presupuesto y madurez
3. El nombre máx 55 chars — debe ser específico al negocio
4. "app_promotion" solo si el negocio tiene app móvil (si no la menciona, no la uses)

GUÍA DE OBJETIVOS:
- conversions → compras, pagos, registros con pago directo
- leads → formularios, contactos, solicitudes de info
- traffic → visitas a sitio web, blog, landing
- awareness → reconocimiento de marca, alcance masivo
- engagement → mensajes, comentarios, interacción directa

${platformInstruction}

Devuelve EXACTAMENTE este JSON (${focusedMode ? 'exactamente 4 estrategias' : 'entre 6 y 8 estrategias'}):
{
  "strategies": [
    {
      "name": "nombre profesional y atractivo",
      "description": "descripción clara de 1-2 oraciones de cómo funciona la estrategia",
      "reason": "por qué funciona específicamente para este negocio",
      "platform": "META",
      "objective": "conversions",
      "destination": "whatsapp",
      "mediaType": "image",
      "mediaCount": 10,
      "minBudgetUSD": 4,
      "advantageType": "advantage"
    }
  ]
}

${platform === 'META' ? 'Plataforma única: META' : platform === 'TIKTOK' ? 'Plataforma única: TIKTOK' : platform === 'GOOGLE_ADS' ? 'Plataforma única: GOOGLE_ADS' : 'Plataformas válidas: META, TIKTOK, GOOGLE_ADS'}
${platform === 'META' ? 'Objetivos válidos para META: conversions, leads, traffic, awareness, engagement (NO app_promotion)' : platform === 'TIKTOK' ? 'Objetivos válidos para TIKTOK: conversions, leads, traffic, awareness, engagement' : platform === 'GOOGLE_ADS' ? 'Objetivos válidos para GOOGLE_ADS: conversions, leads, traffic, awareness' : 'Objetivos válidos: conversions, leads, traffic, awareness, engagement, app_promotion'}
${platform === 'META' ? 'Destinos válidos para META: instagram, whatsapp, website, messenger' : platform === 'TIKTOK' ? 'Destinos válidos para TIKTOK: tiktok, website' : platform === 'GOOGLE_ADS' ? 'Destinos válidos para GOOGLE_ADS: website' : 'Destinos válidos: instagram, whatsapp, website, messenger, tiktok'}`

    const res = await fetch(`${OPENAI_BASE}/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
            model,
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt }
            ],
            temperature: 0.7,
            max_tokens: 2500,
            response_format: { type: 'json_object' }
        })
    })

    if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err?.error?.message || `OpenAI error ${res.status}`)
    }

    const data = await res.json()
    const content = data.choices?.[0]?.message?.content
    if (!content) throw new Error('OpenAI no devolvió contenido')

    const parsed = JSON.parse(content)
    const strategies = Array.isArray(parsed)
        ? parsed
        : (parsed.strategies ?? Object.values(parsed).find((v: any) => Array.isArray(v)) ?? [])
    return (strategies as SuggestedStrategy[]).slice(0, focusedMode ? 4 : 8)
}

/**
 * Generates 8-12 Meta-compatible interest keyword strings from a business brief.
 * These keyword strings are then resolved to real Meta interest IDs via the Targeting Search API.
 */
export async function generateAudienceInterests(
    brief: BusinessBriefData,
    apiKey: string,
    model = 'gpt-4o'
): Promise<string[]> {
    const prompt = `You are a senior Meta Ads specialist with deep knowledge of Meta's interest targeting taxonomy. Your job is to generate search terms that will find REAL, EXISTING interests in Meta's Targeting Search API.

BUSINESS TO ANALYZE:
- Name: ${brief.name}
- Industry: ${brief.industry}
- Description: ${brief.description}
- Value proposition: ${brief.valueProposition || ''}
- Target customer interests: ${brief.interests?.join(', ') || ''}
- Customer pain points: ${brief.painPoints?.join(', ') || ''}
- Primary objective: ${brief.primaryObjective || ''}
- Target customer interests: ${(brief.interests || []).join(', ')}

WHAT META'S INTEREST TAXONOMY LOOKS LIKE:
Meta groups interests into categories like: (cosmetics), (personal care), (health & beauty), (fitness & wellness), (food & drink), (fashion), (family), (business), (technology), etc.
Examples of REAL Meta interests:
- "Skin care (cosmetics)" — for beauty/skincare brands
- "Natural skin care (cosmetics)" — for organic/natural products
- "Facial care (cosmetics)" — for face-focused products
- "Health and wellness (health & medical)" — for wellness brands
- "Organic food (food & drink)" — for organic/natural food
- "Running (fitness & wellness)" — for sports brands
- "Entrepreneurship (business)" — for B2B/business tools

YOUR TASK:
Generate 20 search terms that will find the most relevant existing Meta interests for this business.

CRITICAL RULES — read carefully:
1. Write terms in ENGLISH exactly as they appear in Meta Ads Manager
2. Be SPECIFIC to this business — do NOT generate generic terms like "health" or "beauty" alone
3. NEVER use ambiguous terms that could match a brand name (e.g. never "acne" alone — it matches "Acne Studios" clothing brand)
4. Focus on: the product category, the benefit/result, the lifestyle of the customer, related activities
5. Include the category hint in parentheses when possible, e.g. "Skin care (cosmetics)" not just "skin care"
6. Avoid: food/drink interests for non-food brands, unrelated lifestyle interests, psychology terms for physical products
7. Think: what would a real Meta Ads expert target for this exact business?
8. Generate EXACTLY 20 terms

Return ONLY valid JSON: {"interests": ["term1", "term2", ...]}`

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 15_000)
    let res: Response
    try {
        res = await fetch(`${OPENAI_BASE}/chat/completions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
            body: JSON.stringify({
                model,
                messages: [{ role: 'user', content: prompt }],
                temperature: 0.2,
                max_tokens: 700,
                response_format: { type: 'json_object' }
            }),
            signal: controller.signal,
        })
    } catch (e: any) {
        if (e?.name === 'AbortError') throw new Error('OpenAI tardó demasiado (>15s) al generar intereses de audiencia. Inténtalo de nuevo.')
        throw new Error(`Error de red al contactar OpenAI: ${e?.message || e}`)
    } finally {
        clearTimeout(timeout)
    }
    if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        const msg = err?.error?.message || `OpenAI respondió con error ${res.status}`
        throw new Error(`OpenAI: ${msg}`)
    }
    const data = await res.json()
    const content = data.choices?.[0]?.message?.content
    if (!content) throw new Error('OpenAI no devolvió contenido al generar intereses de audiencia')
    const parsed = JSON.parse(content)
    const arr = Array.isArray(parsed)
        ? parsed
        : (parsed.interests ?? Object.values(parsed).find((v: any) => Array.isArray(v)) ?? [])
    const keywords = (arr as unknown[]).filter((s): s is string => typeof s === 'string').slice(0, 20)
    if (keywords.length === 0) throw new Error('OpenAI no generó ningún interés de audiencia válido')
    return keywords
}

/**
 * Filters a list of Meta interest candidates (resolved from Meta's Targeting Search API)
 * down to only the ones genuinely relevant to the business.
 * This prevents irrelevant results like "Acne Studios (clothing)" appearing for a skincare brand.
 */
export async function filterAudienceInterests(
    brief: BusinessBriefData,
    candidates: Array<{ id: string; name: string }>,
    apiKey: string,
    model = 'gpt-4o-mini'
): Promise<Array<{ id: string; name: string }>> {
    if (candidates.length === 0) return []

    const candidateList = candidates.map((c, i) => `${i + 1}. "${c.name}"`).join('\n')

    const prompt = `You are a Meta Ads targeting expert. A business wants to run ads and Meta's API returned these interest candidates.

BUSINESS:
- Name: ${brief.name}
- Industry: ${brief.industry}
- Description: ${brief.description}
- Value proposition: ${brief.valueProposition || ''}
- Target audience interests: ${(brief.interests || []).join(', ')}

INTEREST CANDIDATES FROM META:
${candidateList}

YOUR TASK:
Select ONLY the interests that are genuinely relevant to this business and its target customers.
REJECT interests that are:
- Clothing/fashion brands when selling non-fashion products (e.g. "Acne Studios" for skincare)
- Food/drink interests for non-food businesses
- Completely unrelated industries
- Generic psychology terms for physical products
- Any interest where the name suggests a completely different industry

Return the numbers of the RELEVANT interests only.
Return ONLY valid JSON: {"relevant": [1, 4, 7, ...]} (list of numbers)`

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 10_000)
    try {
        const res = await fetch(`${OPENAI_BASE}/chat/completions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
            body: JSON.stringify({
                model,
                messages: [{ role: 'user', content: prompt }],
                temperature: 0.1,
                max_tokens: 200,
                response_format: { type: 'json_object' }
            }),
            signal: controller.signal,
        })
        if (!res.ok) return candidates // fallback: return all if filtering fails
        const data = await res.json()
        const content = data.choices?.[0]?.message?.content
        if (!content) return candidates
        const parsed = JSON.parse(content)
        const relevantIndices: number[] = parsed.relevant ?? []
        const filtered = relevantIndices
            .map(i => candidates[i - 1])
            .filter(Boolean)
        return filtered.length > 0 ? filtered : candidates
    } catch {
        return candidates // fallback: return all if filtering fails
    } finally {
        clearTimeout(timeout)
    }
}

/**
 * Generates 3 creative suggestions for a specific ad field (headline, primaryText, description)
 * based on the business brief and current slot content.
 */
export async function generateFieldSuggestions(params: {
    brief: BusinessBriefData
    field: 'primaryText' | 'headline' | 'description'
    slotIndex: number
    platform: string
    destination: string
    currentContent?: string
    apiKey: string
    model?: string
}): Promise<string[]> {
    const { brief, field, slotIndex, platform, destination, currentContent, apiKey, model = 'gpt-4o' } = params

    const limits: Record<string, number> = {
        primaryText: platform === 'GOOGLE_ADS' ? 90 : platform === 'TIKTOK' ? 300 : 500,
        headline: platform === 'GOOGLE_ADS' ? 30 : platform === 'TIKTOK' ? 50 : 40,
        description: platform === 'GOOGLE_ADS' ? 90 : 30,
    }

    const fieldDescriptions: Record<string, string> = {
        primaryText: `Texto principal del anuncio (el cuerpo del copy, con emojis y párrafos cortos). Máx ${limits.primaryText} caracteres.`,
        headline: `Titular llamativo y directo (aparece bajo la imagen). Máx ${limits.headline} caracteres. Sin emojis.`,
        description: `Descripción breve complementaria al titular. Máx ${limits.description} caracteres.`,
    }

    const destMap: Record<string, string> = {
        whatsapp: 'WhatsApp Business', website: 'sitio web', instagram: 'Instagram', messenger: 'Messenger'
    }

    const prompt = `Eres el mejor copywriter de publicidad digital en español. Genera 3 variaciones DISTINTAS de "${field}" para un anuncio de ${platform}.

NEGOCIO: ${brief.name} (${brief.industry})
PROPUESTA DE VALOR: ${brief.valueProposition}
PUNTOS DE DOLOR: ${brief.painPoints.slice(0, 3).join(', ')}
VOZ DE MARCA: ${brief.brandVoice}
CTA: ${brief.mainCTA}
DESTINO: ${destMap[destination] || destination}
ANUNCIO #${slotIndex + 1}
${currentContent ? `VERSIÓN ACTUAL: "${currentContent}"` : ''}

CAMPO A GENERAR: ${fieldDescriptions[field]}

REGLAS:
1. Cada variación debe ser completamente diferente en ángulo (emocional, racional, urgencia)
2. Todas deben ser irresistibles y específicas al negocio
3. Habla directamente al cliente ("tú/tu")
${field === 'primaryText' ? '4. Usa emojis estratégicamente (✅ ⚡ 🔥 👇 etc.)\n5. Párrafos cortos de máx 2-3 líneas' : '4. Sin emojis en titular/descripción'}

Devuelve ÚNICAMENTE este JSON:
{"suggestions": ["opción 1", "opción 2", "opción 3"]}`

    const res = await fetch(`${OPENAI_BASE}/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
            model,
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.9,
            max_tokens: 1200,
            response_format: { type: 'json_object' }
        })
    })

    if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err?.error?.message || `OpenAI error ${res.status}`)
    }

    const data = await res.json()
    const content = data.choices?.[0]?.message?.content
    if (!content) throw new Error('OpenAI no devolvió contenido')
    const parsed = JSON.parse(content)
    const suggestions = Array.isArray(parsed) ? parsed : (parsed.suggestions ?? Object.values(parsed).find((v: any) => Array.isArray(v)) ?? [])
    return (suggestions as string[]).slice(0, 3)
}

export type ImageQuality = 'fast' | 'standard' | 'premium'
export type ImageSize = '1024x1024' | '1024x1792' | '1792x1024'

/** Generates an ad image using DALL-E 3 based on brief */
export async function generateAdImage(params: {
    brief: BusinessBriefData
    mediaType: string
    slotIndex: number
    apiKey: string
    customPrompt?: string
    quality?: ImageQuality
    size?: ImageSize
}): Promise<string> {
    const { brief, mediaType, slotIndex, apiKey, customPrompt, quality = 'standard', size = '1024x1024' } = params

    const colorStr = (brief.brandColors || []).slice(0, 2).join(' and ') || 'neutral tones'
    const styleStr = (brief.visualStyle || []).slice(0, 3).join(', ') || 'modern, professional'
    const valueProposition = brief.valueProposition?.substring(0, 100) || ''
    const keyMessages = brief.keyMessages || []
    const keyMessage = (keyMessages[slotIndex] || keyMessages[0] || '').substring(0, 100)

    let prompt: string
    if (customPrompt) {
        prompt = customPrompt
    } else {
        // Use AI to generate industry-specific creative direction (same system as reference image path)
        let creativeScene = ''
        try {
            creativeScene = await generateCreativeDirection({
                brief,
                productDescription: '',
                slotIndex,
                apiKey,
            })
        } catch { /* fallback below */ }

        if (!creativeScene) {
            const fallbacks = [
                'aspirational lifestyle scene with people genuinely enjoying the product',
                'dynamic transformation scene showing the result the brand delivers',
                'dramatic product hero shot in an atmospheric branded environment',
                'emotional storytelling scene capturing the feeling after using the product'
            ]
            creativeScene = fallbacks[slotIndex % fallbacks.length]
        }

        const dalleQualityNote = quality === 'premium'
            ? 'Award-winning, breathtaking, high-end editorial photography + ad agency direction.'
            : quality === 'fast'
                ? 'Clean, compelling, professional.'
                : 'Magazine-quality, cinematic lighting, emotionally engaging.'

        // AI generates specific text overlay for this slot and business type
        let textOverlay = ''
        try {
            textOverlay = await generateTextOverlay({
                brief,
                slotIndex,
                objective: brief.primaryObjective || 'conversions',
                destination: 'website',
                apiKey,
            })
        } catch { /* non-fatal */ }
        if (!textOverlay) {
            textOverlay = `Add exactly ONE bold, short 3D text title: "${(keyMessage || valueProposition).substring(0, 20)}". Do NOT add any other text.`
        }
        const posterStyle = "Hyper-realistic Digital Graphic Design Poster. Cinematic, high-contrast. Dramatic background with intense VFX (fire, glowing energy, sparks, or neon depending on brand). Bold 3D typography."
        prompt = `${posterStyle} Brand: ${brief.name} (${brief.industry}). Scene: ${creativeScene} Colors: ${colorStr}. ${textOverlay} ${dalleQualityNote} Masterpiece quality, advertising agency professional composition. No watermarks.`
    }

    const dalleQuality = quality === 'premium' ? 'hd' : 'standard'
    const dalleStyle = quality === 'fast' ? 'natural' : 'vivid'

    const res = await fetch(`${OPENAI_BASE}/images/generations`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`
        },
        body: JSON.stringify({
            model: 'dall-e-3',
            prompt,
            n: 1,
            size,
            quality: dalleQuality,
            style: dalleStyle,
        })
    })

    if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err?.error?.message || `DALL-E error ${res.status}`)
    }

    const data = await res.json()
    const url = data.data?.[0]?.url
    if (!url) throw new Error('DALL-E no devolvió una imagen')
    return url
}

/**
 * Edits/improves an existing image using gpt-image-1.
 * Returns a Buffer (PNG) so the caller can upload to storage.
 */
export async function editAdImageWithReference(params: {
    imageUrl: string
    prompt: string
    apiKey: string
    size?: '1024x1024' | '1024x1536' | '1536x1024'
}): Promise<Buffer> {
    const { imageUrl, prompt, apiKey, size = '1024x1024' } = params

    // Download the reference image
    const imgRes = await fetch(imageUrl)
    if (!imgRes.ok) throw new Error('No se pudo descargar la imagen de referencia')
    const imgBuffer = Buffer.from(await imgRes.arrayBuffer())
    const contentType = imgRes.headers.get('content-type') || 'image/png'

    // Build multipart form data
    const form = new FormData()
    const blob = new Blob([imgBuffer], { type: contentType })
    form.append('image', blob, 'reference.png')
    form.append('prompt', prompt)
    form.append('model', 'gpt-image-1')
    form.append('size', size)
    form.append('n', '1')

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 90_000) // gpt-image-1 can take up to 60-70s

    let res: Response
    try {
        res = await fetch(`${OPENAI_BASE}/images/edits`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${apiKey}` },
            body: form,
            signal: controller.signal,
        })
    } catch (e: any) {
        if (e?.name === 'AbortError') throw new Error('La generación de imagen tardó demasiado. Intenta de nuevo.')
        throw e
    } finally {
        clearTimeout(timeout)
    }

    if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err?.error?.message || `gpt-image-1 error ${res.status}`)
    }

    const data = await res.json()
    const b64 = data.data?.[0]?.b64_json
    if (!b64) throw new Error('gpt-image-1 no devolvió imagen')
    return Buffer.from(b64, 'base64')
}

/**
 * Uses GPT-4o Vision to describe a product image in detail.
 * The description is used to build a product-preserving edit prompt for gpt-image-1.
 */
export async function analyzeProductImageForAd(params: {
    imageUrl: string
    apiKey: string
}): Promise<string> {
    const { imageUrl, apiKey } = params

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 20_000)

    let res: Response
    try {
        res = await fetch(`${OPENAI_BASE}/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: 'gpt-4o',
                max_tokens: 400,
                messages: [
                    {
                        role: 'user',
                        content: [
                            {
                                type: 'image_url',
                                image_url: { url: imageUrl, detail: 'high' }
                            },
                            {
                                type: 'text',
                                text: `Describe this product in precise detail for use in an AI image generation prompt. I need to faithfully reproduce this exact product in a new advertising image.

Describe:
1. Product type and category (bottle, bag, box, tube, etc.)
2. Exact shape and proportions
3. All colors present (background, text areas, accents)
4. Any visible brand name, product name, or logo text on the packaging
5. Key visual design elements (patterns, icons, graphics on packaging)
6. Materials and finish (glossy, matte, transparent, metallic, etc.)
7. Size impression (small pocket-sized, medium bottle, large bag, etc.)

Be very specific. This description will be used to recreate the product visually. 4-5 sentences.`
                            }
                        ]
                    }
                ]
            }),
            signal: controller.signal,
        })
    } catch (e: any) {
        if (e?.name === 'AbortError') throw new Error('Vision analysis timed out')
        throw e
    } finally {
        clearTimeout(timeout)
    }

    if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err?.error?.message || `Vision analysis error ${res.status}`)
    }

    const visionData = await res.json()
    return visionData.choices?.[0]?.message?.content?.trim() || ''
}

/**
 * Uses GPT to generate a specific ad creative direction for ANY type of business.
 * Returns a scene description tailored to the exact product/industry.
 * slotIndex 0-3 produces 4 different creative concepts for variety.
 */
export async function generateCreativeDirection(params: {
    brief: BusinessBriefData
    productDescription: string
    slotIndex: number
    apiKey: string
}): Promise<string> {
    const { brief, productDescription, slotIndex, apiKey } = params

    const conceptTypes = [
        'product hero shot with ingredients/components around it',
        'lifestyle scene showing a person using or benefiting from the product',
        'dramatic product reveal with atmospheric background',
        'aspirational result/transformation scene'
    ]
    const concept = conceptTypes[slotIndex % conceptTypes.length]

    const prompt = `You are a world-class advertising creative director. Generate a specific, vivid image prompt for a Meta ad creative.

BUSINESS:
- Brand: ${brief.name}
- Industry: ${brief.industry}
- Description: ${brief.description}
- Value proposition: ${brief.valueProposition || ''}
- Key message: ${brief.keyMessages?.[slotIndex] || brief.keyMessages?.[0] || ''}
- Brand colors: ${brief.brandColors?.join(', ') || 'not specified'}
- Visual style: ${brief.visualStyle?.join(', ') || 'modern'}
- Target audience: ${(brief.interests || []).join(', ')}
- Pain points solved: ${(brief.painPoints || []).slice(0, 2).join(', ')}

PRODUCT IN THE IMAGE:
${productDescription || 'The product from the reference photo'}

CREATIVE CONCEPT TO EXECUTE:
${concept}

YOUR TASK:
Write a concise image generation scene description (MAX 3 sentences, MAX 300 characters) that:
1. Describes the exact scene, background and atmosphere for THIS specific industry
2. Specifies lighting, mood and props
3. Is tailored 100% to this business — not generic

Industry references:
- Cars → showroom dramatic spotlights, polished floor reflections, dark luxury background
- Hair → woman with stunning flowing hair, botanical ingredients floating, salon lighting
- Supplements/energy → athletic person, neon energy particles, gym or outdoor power scene
- Skincare → glowing flawless skin close-up, botanical ingredients, spa luxury setting
- Food/drink → steam rising, fresh ingredients, warm inviting kitchen light
- Jewelry → close-up on skin, dark elegant background, light refraction sparkles
- Fashion/clothing → editorial model, urban or studio, fashion magazine aesthetic
- Tech/gadgets → clean minimalist desk, product glow, blue-white light
- Real estate → luxury exterior golden hour, aspirational architecture
- Fitness → gym energy, determination, motion blur, powerful lighting
- MLM/business → success lifestyle, luxury elements, golden particles, confidence
- Pets → happy animal, warm home, loving atmosphere
- Kids products → bright colors, playful safe environment, joy and happiness

IMPORTANT: Describe a high-impact advertising poster scene with heavy visual effects (VFX) like fire, glowing auras, particles, or cinematic lighting. DO NOT mention any specific text here (text is handled separately).
Return ONLY the scene description, nothing else. No quotes, no labels.`

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 15_000)
    try {
        const res = await fetch(`${OPENAI_BASE}/chat/completions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
            body: JSON.stringify({
                model: 'gpt-4o-mini',
                messages: [{ role: 'user', content: prompt }],
                temperature: 0.7,
                max_tokens: 400,
            }),
            signal: controller.signal,
        })
        if (!res.ok) return ''
        const data = await res.json()
        return data.choices?.[0]?.message?.content?.trim() || ''
    } catch {
        return ''
    } finally {
        clearTimeout(timeout)
    }
}

/**
 * Generates a specific, attractive text overlay description for an ad image.
 * Adapts to any industry/product based on the brief and strategy.
 * Each slot gets a different angle (testimonial, price, CTA, before/after, etc.)
 */
export async function generateTextOverlay(params: {
    brief: BusinessBriefData
    slotIndex: number
    objective: string
    destination: string
    apiKey: string
}): Promise<string> {
    const { brief, slotIndex, objective, destination, apiKey } = params

    const keyMsg = (brief.keyMessages || [])[slotIndex] || (brief.keyMessages || [])[0] || brief.valueProposition || ''
    const cta = brief.mainCTA || 'Contáctanos'

    const conceptTypes = [
        'key message headline + CTA button',
        'before/after or result/testimonial badge',
        'price offer or promotional badge + urgency',
        'trust elements: star rating, guarantee badge, or social proof number',
    ]
    const concept = conceptTypes[slotIndex % conceptTypes.length]

    const prompt = `You are a world-class ad creative director specializing in visual text overlays for social media ads.

BUSINESS:
- Brand: ${brief.name}
- Industry: ${brief.industry}
- Value proposition: ${brief.valueProposition || ''}
- Key message for this ad: ${keyMsg}
- CTA: ${cta}
- Brand colors: ${(brief.brandColors || []).join(', ') || 'not specified'}
- Pain points solved: ${(brief.painPoints || []).slice(0, 2).join(', ')}
- Ad objective: ${objective}
- Destination: ${destination}

TEXT OVERLAY CONCEPT FOR THIS SLOT: "${concept}"

YOUR TASK:
Write a precise image generation instruction describing the text overlay/sticker to include in this ad image.
The overlay MUST be:
1. Specific to THIS business and industry — use actual brand name, real key messages, real CTA
2. Visually described: specify font style (bold, script, sans-serif), color (use brand colors), position (top-left, center, bottom), shape (rounded badge, banner, speech bubble, pill shape, etc.)
3. Industry-appropriate:
   - Skincare/beauty → "Antes | Después" split badge, glow results, "Piel perfecta en X días"
   - Supplements → results badge "Pierde X kg", energy burst graphic, "Resultados garantizados"
   - MLM/business → income claim "Gana hasta $XXX/mes", success badge, "Únete hoy"
   - Clothing/fashion → "Nueva colección", size/color availability, style badge
   - Food → freshness badge, "Hecho con ingredientes naturales", delivery badge
   - Services → satisfaction guarantee, "Más de X clientes satisfechos", star rating
   - Real estate → price badge, location pin, "Disponible ahora"
   - Fitness → transformation badge, "En X semanas", personal record graphic
4. Attractive and detailed: describe colors, shadows, gradients, emojis to include
5. Keep the text EXTREMELY SHORT (max 3-5 words). DO NOT write long sentences. Use bold, 3D typography.

Return ONLY the overlay instruction (2-3 sentences), no quotes, no labels. This text will be appended to an image generation prompt.`

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 12_000)
    try {
        const res = await fetch(`${OPENAI_BASE}/chat/completions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
            body: JSON.stringify({
                model: 'gpt-4o-mini',
                messages: [{ role: 'user', content: prompt }],
                temperature: 0.8,
                max_tokens: 250,
            }),
            signal: controller.signal,
        })
        if (!res.ok) return ''
        const data = await res.json()
        return data.choices?.[0]?.message?.content?.trim() || ''
    } catch {
        return ''
    } finally {
        clearTimeout(timeout)
    }
}
