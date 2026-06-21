/** @type {import('next').NextConfig} */
const nextConfig = {
    poweredByHeader: false,
    eslint: {
        ignoreDuringBuilds: true,
    },
    typescript: {
        ignoreBuildErrors: true,
    },
    // Todos los paquetes que Baileys usa con código nativo de Node.js
    experimental: {
        instrumentationHook: true,
        serverComponentsExternalPackages: [
            '@whiskeysockets/baileys',
            'pino',
            'pino-pretty',
            'ws',
            'bufferutil',
            'utf-8-validate',
            '@hapi/boom',
            'noise-handshake',
            'libsignal',
            'get-port',
        ],
    },

    async headers() {
        const securityHeaders = [
            { key: 'X-Frame-Options', value: 'DENY' },
            { key: 'X-Content-Type-Options', value: 'nosniff' },
            { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
            { key: 'Permissions-Policy', value: 'camera=(), microphone=(self), geolocation=(self), payment=()' },
            {
                key: 'Content-Security-Policy',
                value: [
                    "default-src 'self'",
                    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://challenges.cloudflare.com https://player.vimeo.com",
                    // style-src: incluir cdnjs (FA), fonts (Google), Reown/WalletConnect, y secure.walletconnect.org
                    "style-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com https://fonts.googleapis.com https://secure.walletconnect.org https://*.walletconnect.com https://*.walletconnect.org https://*.reown.com",
                    "img-src 'self' data: blob: https:",
                    "media-src 'self' https:",
                    // connect-src: 'self' + https: + wss: para WalletConnect WebSocket relay
                    "connect-src 'self' https: wss: data:",
                    // frame-src: iframes de Reown/WalletConnect (verify) + Cloudflare/YouTube/Vimeo existentes
                    "frame-src 'self' https://challenges.cloudflare.com https://www.youtube.com https://www.youtube-nocookie.com https://player.vimeo.com https://verify.walletconnect.org https://verify.walletconnect.com https://secure.walletconnect.org https://*.walletconnect.com https://*.walletconnect.org https://*.reown.com",
                    // font-src: data + cdnjs + fonts (Google) + Reown/WalletConnect
                    "font-src 'self' data: https://cdnjs.cloudflare.com https://fonts.gstatic.com https://*.walletconnect.com https://*.walletconnect.org https://*.reown.com",
                ].join('; '),
            },
        ]
        return [
            // Headers en todas las páginas (sin X-Robots-Tag para que la landing sea indexable)
            { source: '/:path*', headers: securityHeaders },
            // X-Robots-Tag solo en rutas privadas — bots no deben indexar dashboard/admin/api
            { source: '/dashboard/:path*', headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }] },
            { source: '/admin/:path*',     headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }] },
            { source: '/api/:path*',       headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }] },
        ]
    },

    webpack: (config, { isServer }) => {
        if (isServer) {
            // Forzar que estos módulos sean tratados como externos aunque webpack los vea
            const nativeModules = [
                'bufferutil',
                'utf-8-validate',
                'ws',
                '@whiskeysockets/baileys',
                'pino',
            ]
            config.externals = [
                ...(Array.isArray(config.externals) ? config.externals : [config.externals].filter(Boolean)),
                ...nativeModules,
            ]
        }
        // react-pdf / pdfjs-dist referencian el paquete Node opcional "canvas"
        // (solo usado para render en servidor). No lo usamos → lo aliasamos a false.
        config.resolve = config.resolve || {}
        config.resolve.alias = { ...(config.resolve.alias || {}), canvas: false }
        return config
    },
}

module.exports = nextConfig
