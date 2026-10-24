# @constroad/planilla

El cálculo canónico de planilla de ConstRoad: Pulso, Portal e Inframaq pagan
con este código, sin copias. Es puro, sin dependencias, y todo va en céntimos
enteros. Las reglas y las decisiones de José están en [SPEC.md](SPEC.md).

## Usarlo en una app

```json
"@constroad/planilla": "git+ssh://git@github.com/constroad/planilla.git#v0.1.0"
```

```ts
import { payDays, closeFixedPeriod, PLANILLA_VERSION } from '@constroad/planilla';
```

Cada app arma sus `PayDay` desde su asistencia (su adaptador), corre los
casos dorados de `casos.json` en sus tests y muestra `PLANILLA_VERSION` como
`planillaVersion` en su `/health`.

## Cambiar el cálculo

1. Test primero en `src/*.test.ts`. Si cambia un número, cambia también
   `casos.json`.
2. `npm test && npm run typecheck`.
3. `scripts/publish.sh X.Y.Z` desde tu máquina: publica el tag con `dist/` y
   lleva la versión a cada app de `scripts/apps.conf`, con sus gates. Llegan
   todas o ninguna.
4. Si una app sale roja, el script deja todas como estaban y el tag ya
   publicado. Arreglas esa app y corres `scripts/publish.sh X.Y.Z --apps-only`.
