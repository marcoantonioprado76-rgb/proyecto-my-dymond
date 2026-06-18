// Recetas de "métodos" predeterminados para campañas Meta.
// Se aplican SOBRE el objetivo/destino que el usuario ya eligió en el wizard:
// el método solo aporta la ESTRUCTURA (tipo de audiencia, nº de creativos,
// presupuesto mínimo). Así el usuario no toca nada técnico.
//
// Método Andromeda: audiencia AMPLIA (sin intereses) + muchos creativos con
// Advantage+, dejando que el motor de Meta encuentre solo a los compradores.

export interface AdMethodRecipe {
    id: string
    name: string
    description: string
    advantageType: string
    imageCount: number
    videoCount: number
    minBudgetUSD: number
}

export const ANDROMEDA: AdMethodRecipe = {
    id: 'andromeda',
    name: 'Método Andromeda',
    description:
        'Audiencia amplia + muchos creativos con Advantage+. La IA crea los anuncios y Meta encuentra solo a tus compradores.',
    advantageType: 'advantage',
    imageCount: 20,
    videoCount: 15,
    minBudgetUSD: 8,
}

export const AD_METHODS: Record<string, AdMethodRecipe> = {
    andromeda: ANDROMEDA,
}
