'use client'

import { useEffect, useState } from 'react'

/**
 * "IA pensando" — animación de TEXTO (pro, liviana): frases que rotan con
 * degradado + shimmer + transición suave, puntos animados y barra indeterminada.
 * variant="full" para overlays; variant="compact" para slots (imágenes).
 */
const GRADIENTS = [
    'linear-gradient(90deg,#B735B8,#4C97D8,#B735B8)',
    'linear-gradient(90deg,#4C97D8,#4C97D8,#4C97D8)',
    'linear-gradient(90deg,#FB923C,#FF2D95,#FB923C)',
    'linear-gradient(90deg,#22C55E,#4C97D8,#22C55E)',
    'linear-gradient(90deg,#B735B8,#B735B8,#B735B8)',
]

export function AiThinking({ messages, className = '', variant = 'full' }:
    { messages: string[]; className?: string; variant?: 'full' | 'compact' }) {
    const compact = variant === 'compact'
    const [idx, setIdx] = useState(0)
    const [show, setShow] = useState(true)

    useEffect(() => {
        if (messages.length <= 1) return
        const iv = setInterval(() => {
            setShow(false)
            setTimeout(() => { setIdx(i => (i + 1) % messages.length); setShow(true) }, 280)
        }, 2300)
        return () => clearInterval(iv)
    }, [messages.length])

    const grad = GRADIENTS[idx % GRADIENTS.length]
    const textStyle = { backgroundImage: grad, opacity: show ? 1 : 0, transform: show ? 'translateY(0)' : 'translateY(5px)' }

    if (compact) {
        return (
            <div className={`absolute inset-0 flex flex-col items-center justify-center gap-2.5 bg-[#050B14]/85 px-3 ${className}`}>
                <div className="ai-dots"><span /><span /><span /></div>
                <div className="ai-grad-text text-[10px] font-bold text-center transition-all duration-300" style={textStyle}>{messages[idx]}</div>
            </div>
        )
    }
    return (
        <div className={`flex flex-col items-center justify-center gap-4 py-10 ${className}`}>
            <div className="ai-dots ai-dots-lg"><span /><span /><span /></div>
            <div className="ai-grad-text text-base sm:text-lg font-extrabold text-center px-4 transition-all duration-300 min-h-[1.6em]" style={textStyle}>{messages[idx]}</div>
            <div className="ai-loader-track"><div className="ai-loader-bar" /></div>
        </div>
    )
}
