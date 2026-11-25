# @constroad/shared

El código de dominio que comparten las apps de ConstRoad, sin copias. Es puro y
sin dependencias. Hay un solo repo compartido: un tema nuevo es una entrada más,
no un repo nuevo.

| Entrada | Qué trae | Quién la usa |
| --- | --- | --- |
| `@constroad/shared/planilla` | Cálculo de planilla, en céntimos enteros. Reglas en [SPEC.md](SPEC.md) | Pulso, Portal e Inframaq |
| `@constroad/shared/consumos` | Motor de consumos, cálculo de tanques y fechas de Lima | Inframaq; Portal al adoptarla |
| `@constroad/shared/obra` | Mapa de obra: geometría de calles, avance por trabajo y por día, métricas de tramo, colores, franja por calles, lo que ve el cliente, descargas por unidad, KMZ sin dependencias el motor puro del editor de calles (cosido de tiles, toque, pegado OSRM y su confianza, capas del mapa) y el día de colocación de fotos y unidades (día de Lima, número de la unidad dentro de su día, un color por día) | Portal (admin y reporte del cliente) y Lilachat (web y APK) |
| `@constroad/shared/kardex` | Motor del kardex: saldo en orden de línea de tiempo, foto de existencias por material y sede, el ingreso que acepta una recepción, la reubicación entre sedes, el ajuste por conteo y la salida de un pedido; fechas de llegada en hora de Lima | Portal e Inframaq |
| `@constroad/shared/materiales` | Materiales: reporte de stock de agregados (estado, barra de llenado, reposición), etiquetas que distinguen dos opciones con el mismo nombre, el filtro de transportista y cantera, y las reglas puras de un movimiento de stock y de una recepción | Portal e Inframaq |
| `@constroad/shared/medicion` | Medir un área en el piso: la planta AR ajustada con la wincha (una escala para el drift; la wincha manda en el lado que discrepa), su área con el zapatero (sin contornos que se cruzan) y el espesor con n lecturas y su ± | Portal (el server recalcula) y el APK de Lilachat |
| `@constroad/shared/google-mail` | «Continuar con Google» para el correo de una empresa: `state` firmado que ata el regreso a una empresa, URL de autorización (solo `gmail.send` y la dirección), canje del código, refresco y revocación, el correo con su PDF enviado por la API de Gmail, y el texto y el logo del botón. Lado servidor, con `fetch` y Web Crypto. Cada app guarda su secreto de cliente y el refresh token sellado por empresa | Portal (Integraciones) y Dali |
| `@constroad/shared/drive-share` | Drive compartido sin descarga: la regla de quién descarga (`canDownload`, `canZip`, `zipExclusions`, `isLinkActive`, `effectiveDownload`; enlace nuevo = descarga bloqueada, enlace viejo sin el campo = permitida), el token firmado corto de página, descarga y lectura protegida (`signShareToken`/`verifyShareToken`, Web Crypto), el texto de la marca de agua y los topes del render (escala, páginas, concurrencia, caché). Contrato en la sección «Drive compartido» | Portal e Inframaq firman; lila e Inframaq verifican |
| `@constroad/shared/drive-viewer` | El visor del Drive en React: PDF (páginas con marca o el visor pdf.js de la app), imagen y video, con flechas, teclado, deslizar y zoom. Sin imports de app: React, `react-dom` (portal a `<body>`) y clases de Tailwind con los tokens de shadcn. Contrato en la sección «Visor del Drive» | Portal (enlace público e intranet) e Inframaq |

## Usarlo en una app

```json
"@constroad/shared": "git+https://github.com/constroad/shared.git#v0.2.1"
```

```ts
import { payDays, closeFixedPeriod, PLANILLA_VERSION } from '@constroad/shared/planilla';
import { computeTankCalculations } from '@constroad/shared/consumos';
```

Cada app arma sus `PayDay` desde su asistencia (su adaptador), corre los
casos dorados de `casos.json` en sus tests y muestra `PLANILLA_VERSION` como
`planillaVersion` en su `/health`.

`consumos` no conoce Mongoose ni zod: sus tipos son estructurales. Cada app
conserva su modelo, y `evidences` queda como `unknown[]`, porque cada una tiene
su propio tipo de archivo.

`PLANILLA_VERSION` nombra el cálculo de planilla, no el paquete: agentes lo compara
entre apps cada hora. Sube solo si cambia un número de planilla, junto con su test.

## Cambiar el cálculo

1. Test primero en `src/<tema>/*.test.ts`. Si cambia un número, cambia también
   `casos.json`.
2. `npm test && npm run typecheck`.
3. `scripts/publish.sh X.Y.Z` desde tu máquina: publica el tag con `dist/` y
   lleva la versión a cada app de `scripts/apps.conf`, con sus gates. Llegan
   todas o ninguna.
4. Si una app sale roja, el script deja todas como estaban y el tag ya
   publicado. Arreglas esa app y corres `scripts/publish.sh X.Y.Z --apps-only`.

## Drive compartido (`./drive-share`, v0.21.0)

Pedido de José del 25/11/2026: un enlace puede prohibir la descarga «de verdad».
El original nunca sale del servidor; viajan páginas rasterizadas con marca de agua.

- **Política** (`ShareLinkPolicy`): `download` (por defecto del enlace),
  `downloadOverrides` (`{ [mediaId]: boolean }`, gana sobre el defecto en los dos
  sentidos), `requireIdentity` (OTP antes de ver; la identidad va a la marca),
  `expiresAt`, `revoked`. `defaultPolicyForNewLink()` = descarga **bloqueada** e
  identificación apagada. Un enlace que ya existía, sin el campo, **descarga**
  (`normalizeSharePolicy`). Un vencimiento ilegible cuenta como vencido.
- **Token**: `base64url(JSON).base64url(HMAC-SHA256)`. La llave es
  `HMAC-SHA256(secreto, "constroad/drive-share/v1")`, no el secreto: así un token
  de Drive y un JWT con el mismo secreto (`LILA_APP_JWT_SECRET`) nunca se validan
  uno como otro. `iat`/`exp` en segundos. Scopes y vida por defecto / máxima:
  `drive-share-page` 300/600 s, `drive-share-download` 120/300 s,
  `drive-share-file` 900/3600 s. Tolerancia de reloj: 30 s.
  `verifyShareToken` no lanza: devuelve `{ ok: false, reason }`
  (`malformed`, `bad_signature`, `wrong_scope`, `expired`, `not_yet_valid`,
  `bad_claims`) y revalida las claims aunque la firma sea buena.
- **Claims**: `companyId` (`[A-Za-z0-9_-]{1,64}`), `path` relativo a la raíz de la
  empresa (sin `/` inicial, sin segmentos vacíos, `.`, `..` ni ocultos, sin `\`),
  `linkId?`, `mediaId?`; página: `page?` (1…300), `scale?` (0,5…2), `watermark`
  (≤120); descarga: `filename?`.
- **Topes del render** (lila e Inframaq usan los mismos): `MAX_PAGE_SCALE` 2,
  `MAX_PAGES_PER_DOCUMENT` 300, `MAX_CONCURRENT_RENDERS` 2, `MAX_QUEUED_RENDERS` 8,
  `RENDER_QUEUE_WAIT_MS` 4000 (después 429 con `Retry-After` 2), caché en disco sin
  marca con `PAGE_CACHE_TTL_MS` 7 días y `PAGE_CACHE_MAX_BYTES` 1 GiB,
  `IMAGE_PREVIEW_MAX_PX` 1600, `PAGE_URLS_PER_REQUEST` 20.
- **Marca de agua**: `watermarkText({ linkCode, viewer?, at })` →
  «Enlace AB12CD · cliente@correo.com · 25/11/2026 14:05» (hora de Lima).

## Visor del Drive (`./drive-viewer`, v0.22.0)

```tsx
import { DriveViewer, type DriveViewerItem } from '@constroad/shared/drive-viewer';

<DriveViewer items={items} currentId={openId} onNavigate={setOpenId} onClose={() => setOpenId(null)} />
```

**Dependencias:** `react` y `react-dom` ≥ 18 como peers opcionales (solo los pide quien
importa `./drive-viewer` o `./cubicar`).

**Tailwind:** el visor trae clases, no CSS. La app tiene que escanear el `dist` del paquete
o esas clases no se generan:

```js
// tailwind.config.js
content: [
  // …lo de la app
  './node_modules/@constroad/shared/dist/drive-viewer/**/*.js',
],
```

Usa los tokens de shadcn (`bg-background`, `bg-card`, `border-border`, `text-foreground`,
`text-muted-foreground`, `bg-muted`, `bg-primary`, `text-primary-foreground`, `ring-accent`):
la app los define. Como el visor se monta en `document.body`, `surfaceClassName` lleva la
clase que activa esos tokens y el modo (Portal: `"shadcn-surface dark"`).

**Props (`DriveViewerProps`):**

| Prop | Tipo | Qué hace |
| --- | --- | --- |
| `items` | `DriveViewerItem[]` | Los archivos de la carpeta, en orden |
| `currentId` | `string \| null` | El abierto; `null` cierra el visor |
| `onNavigate` | `(id) => void` | Flechas, teclado (← →) o deslizar al archivo vecino |
| `onClose` | `() => void` | «Volver a la carpeta» o Escape |
| `renderActions?` | `(item) => ReactNode` | Botones de la barra (descargar, imprimir…) |
| `renderPdf?` | `(item) => ReactNode` | PDF descargable en el visor pdf.js de la app; sin esto, un `iframe` |
| `renderBadge?` | `(item) => ReactNode` | Distintivo junto al nombre («Solo lectura») |
| `labels?` | `Partial<DriveViewerLabels>` | Textos; por defecto `DEFAULT_LABELS` (español neutro) |
| `surfaceClassName?` | `string` | Clase del contenedor en `<body>` (tokens y modo de la app) |

**`DriveViewerItem`:** `id`, `name`, `kind` (`'pdf' \| 'image' \| 'video' \| 'none'`),
`canDownload`, `src?` (el original o su URL firmada, si `canDownload`), `loadPages?`
(sin descarga, PDF o imagen: `(from, { thumbs }) => Promise<{ pages, from, urls, expiresAt }>`,
ventanas de `PAGE_URLS_PER_REQUEST` URLs firmadas que el visor renueva 30 s antes de vencer,
sin polling), `loadStream?` (sin descarga, video: `() => Promise<{ url, watermark }>`; se pide
de nuevo si el stream vence a mitad), `kicker?` (texto sobre el nombre, la carpeta).

Sin descarga, las páginas se piden en modo CORS (`crossOrigin="anonymous"`) y el video va sin
control de descarga ni picture-in-picture, bajo la marca en mosaico. Eso solo dificulta: lo que
protege es que el original nunca llega al navegador (`./drive-share`).

También exporta `DEFAULT_LABELS`, `ViewerButton` y `VIEWER_BUTTON` (la clase de los botones de
la barra, 44 px), para que las acciones de la app se vean iguales.
