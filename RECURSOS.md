# Sección "Recursos" — Editor de plantillas editables

Sección **aislada** dentro del dashboard para crear y editar plantillas tipo "editables"
(inspirado en a3vte / Fancy Product Designer), usando **Fabric.js** en el navegador.

- **Admin:** sube el flyer (PNG con la zona de la foto **transparente**), marca el hueco de la foto
  y las cajas de texto.
- **Usuario:** elige una plantilla, sube su foto (que va **al fondo**, detrás del diseño, y se ve por la
  zona transparente del flyer — movible/escalable), edita los textos y **descarga en JPG/PNG** al
  tamaño nativo de cada flyer. **La foto del usuario se procesa en el navegador, nunca se sube al servidor.**

## Qué reutiliza (no agrega nada nuevo de base)
- **Auth:** la sesión por cookies existente (`getAuthUser`). Las páginas viven bajo `/dashboard/recursos`,
  así que el **middleware actual** ya las protege. No se tocó el middleware, el layout raíz ni el WalletProvider.
- **Admin:** el flag `users.is_admin` que ya existía + el helper `src/lib/admin-auth.ts` (`getAdminUser`).
- **Storage:** Supabase Storage, **bucket `uploads`** (el mismo de toda la app), en la subcarpeta `recursos/`.
- **DB:** Prisma + PostgreSQL (Supabase). Solo se agregó **1 tabla nueva** (`templates`).
- **Estilo:** Tailwind + tokens de la app (dark morado/azul neón, gradientes, fuente Archivo).

## Archivos nuevos
```
prisma/schema.prisma                                  (modelo Template — aditivo)
prisma/migrations/20260621000001_add_recursos_templates/migration.sql
src/app/api/recursos/templates/route.ts               GET (lista) · POST (crear, admin)
src/app/api/recursos/templates/[id]/route.ts          GET · PATCH · DELETE (admin)
src/app/api/recursos/upload/route.ts                  POST subir imagen base (admin)
src/app/dashboard/recursos/page.tsx                   Galería (USUARIO: solo elegir/editar/descargar)
src/app/dashboard/recursos/[id]/page.tsx + UserEditor.tsx     Editor del usuario (Fabric)
src/app/admin/recursos/page.tsx                       Gestión (ADMIN): lista + activar/ocultar/borrar
src/app/admin/recursos/nuevo/page.tsx + AdminEditor.tsx       Editor admin (Fabric): subir + marcar zonas
```
La **gestión de plantillas vive en el Panel de Admin** (`/admin` → pestaña "Recursos"). Los usuarios solo
ven la galería en el dashboard para **editar y descargar**.
Archivos existentes modificados (aditivo): `src/components/Navbar.tsx` (item "Recursos" en el dashboard)
y `src/app/admin/layout.tsx` (pestaña "Recursos" en el panel admin).

## Variables / permisos necesarios
**Ya existen en el proyecto, no hay que crear nada nuevo:**
- `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (en `.env` / Render).
- Bucket de Storage **`uploads`** debe ser **público de lectura** (ya lo es; se usa en toda la app).
  Para que el editor pueda **exportar** la imagen, el bucket debe servir con CORS (`Access-Control-Allow-Origin: *`),
  que es el comportamiento por defecto de los buckets públicos de Supabase.
- Dependencia nueva: **`fabric` 5.3.0** (+ `@types/fabric`). Ya quedó en `package.json`.
- **`RECURSOS_ADMIN_EMAILS`** (opcional, lista de correos separada por comas) — restringe quién puede
  **gestionar** plantillas. Si NO se define → cualquier `is_admin` puede gestionar. Si se define →
  solo esos correos (que además sean `is_admin`). Ej. para que solo la cuenta dedicada gestione y otras
  cuentas admin queden como usuarios normales:
  ```
  RECURSOS_ADMIN_EMAILS=admin@marcoproyectos.com
  ```
  > ⚠️ Esta variable hay que setearla también en **Render** (producción). Sin ella, todos los `is_admin`
  > ven el panel de gestión.

## Base de datos
La tabla `templates` se crea con la migración `20260621000001_add_recursos_templates`.
SQL (solo crea la tabla, no toca nada existente):
```sql
CREATE TABLE "templates" (
  "id" UUID NOT NULL,
  "nombre" TEXT NOT NULL,
  "categoria" TEXT NOT NULL,
  "ancho" INTEGER NOT NULL,
  "alto" INTEGER NOT NULL,
  "fondo_url" TEXT NOT NULL,
  "thumb_url" TEXT,
  "zonas" JSONB NOT NULL,
  "activo" BOOLEAN NOT NULL DEFAULT true,
  "creado_por" UUID NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "templates_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "templates_activo_categoria_idx" ON "templates"("activo","categoria");
```
> Nota: el deploy (Render) NO corre migraciones automáticamente (`build = prisma generate && next build`),
> por eso esta tabla se aplicó directo a la base. Para entornos nuevos, correr este SQL o `prisma migrate deploy`.

## Cómo marcar a un usuario como ADMIN
El rol usa el campo `is_admin` de la tabla `users` (ya existente):
```sql
UPDATE users SET is_admin = true WHERE email = 'tu-correo@ejemplo.com';
```
Solo los admin pueden **subir plantillas** y entrar al panel `/dashboard/recursos/admin`.

## Estructura de `templates.zonas` (JSONB)
```json
{
  "photo": { "x": 120, "y": 300, "w": 840, "h": 600 },
  "texts": [
    { "id": "abc123", "x": 100, "y": 80, "w": 880, "text": "Tu título",
      "fontSize": 64, "fontFamily": "Archivo", "fill": "#ffffff",
      "align": "center", "fontWeight": "800" }
  ]
}
```
- `photo`: hueco donde el usuario coloca su foto (recortada con `clipPath`). Puede ser `null`.
- `texts`: cajas de texto editables (Fabric `Textbox`).

## Aislamiento / seguridad
- Todo lo nuevo está bajo `/dashboard/recursos` y `/api/recursos` → protegido por el auth existente.
- Escritura (crear/editar/borrar plantillas, subir imágenes) requiere `is_admin`.
- Fabric.js se carga **solo** en las rutas de Recursos vía `next/dynamic` con `ssr:false`.
- No se tocó Web3/wallet/pagos, ni el sistema de login, ni otra base de datos.
