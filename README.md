# @constroad/shared

El código de dominio que comparten las apps de ConstRoad, sin copias. Es puro y
sin dependencias. Hay un solo repo compartido: un tema nuevo es una entrada más,
no un repo nuevo.

| Entrada | Qué trae | Quién la usa |
| --- | --- | --- |
| `@constroad/shared/planilla` | Cálculo de planilla, en céntimos enteros. Reglas en [SPEC.md](SPEC.md) | Pulso, Portal e Inframaq |
| `@constroad/shared/consumos` | Motor de consumos, cálculo de tanques y fechas de Lima | Inframaq; Portal al adoptarla |
| `@constroad/shared/obra` | Mapa de obra: geometría de calles, avance por trabajo y por día, métricas de tramo, colores, franja por calles, lo que ve el cliente, descargas por unidad, KMZ sin dependencias y el motor puro del editor de calles (cosido de tiles, toque, pegado OSRM y su confianza, capas del mapa) | Portal (admin y reporte del cliente) y Lilachat (web y APK) |
| `@constroad/shared/kardex` | Motor del kardex: saldo en orden de línea de tiempo, foto de existencias por material y sede, el ingreso que acepta una recepción, la reubicación entre sedes, el ajuste por conteo y la salida de un pedido; fechas de llegada en hora de Lima | Portal e Inframaq |
| `@constroad/shared/materiales` | Materiales: reporte de stock de agregados (estado, barra de llenado, reposición), etiquetas que distinguen dos opciones con el mismo nombre, el filtro de transportista y cantera, y las reglas puras de un movimiento de stock y de una recepción | Portal e Inframaq |

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
