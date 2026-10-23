# @constroad/planilla — la planilla canónica de ConstRoad

> Pedido de José (23/10/2026), por la sesión de agentes: un solo cálculo de
> planilla para Pulso, Portal e Inframaq. Nació en `pulso/motor` (commit
> 8e71e59) y vive aquí desde la versión 0.1.0. Todo cambio al cálculo se hace
> en este repo; ninguna app tiene una copia.

## 1. Qué es y qué no es

- **Es**: cuánto se le debe a una persona por un rango de días, en **céntimos
  enteros**, desde sus días ya calculados (`PayDay`) y su historial de sueldo.
- **No es**: el cálculo de horas. Cada app arma sus `PayDay` como sepa. Pulso
  los saca de `dayHours` con `payDayOf`, y Portal o Inframaq desde su asistencia.
- Puro, sin I/O ni dependencias.

## 2. Lo que ya estaba bien en Pulso y no cambia

- Extra presunta salvo rechazo. El rechazo llega como 0 minutos pagados.
- Extra al +25 % las dos primeras horas del día y al +35 % el resto
  (`splitOvertime`).
- La jornada sale del horario: turno partido, nocturno, atípico. El refrigerio
  es de 45 min si el turno pasa de 6 h.
- Historial de sueldo por fecha. Cada día se paga con el sueldo vigente ESE día
  (P1).
- Una salida olvidada cuenta hasta la última marca.
- Céntimos enteros. Cada línea suma fracciones exactas y se redondea una vez
  por denominador (medio céntimo sube). El resultado de Pulso es idéntico al de
  antes: `weekPay` ahora es un adaptador de `payDays`, y sus tests no cambiaron.

## 3. Tipos de sueldo (decisión de José)

| Tipo | `kind` | Jornal | Base del pago |
| --- | --- | --- | --- |
| Jornal diario | `daily` | el monto | días laborables trabajados |
| Por hora | `hourly` | monto × 8 | minutos dentro de la jornada × monto ÷ 60 |
| Semanal | `weekly` | monto ÷ 7 | sueldo fijo (§4) |
| Quincenal | `biweekly` | monto ÷ 15 | sueldo fijo (§4) |
| Mensual | `monthly` | monto ÷ 30 | sueldo fijo (§4) |

Los valores de `kind` son los mismos que usa Portal (`SalaryPeriod`). El monto
va en soles; la salida, en céntimos.

**Valor hora (base de las extras y del descanso trabajado):**
- Sueldo fijo: jornal ÷ 8 (decisión de José). Un mensual de S/ 3 000 tiene un
  jornal de S/ 100 y un valor hora de S/ 12,50: la extra vale S/ 15,625 al
  +25 % y S/ 16,875 al +35 %.
- Por hora: el monto.
- Jornal diario: jornal ÷ la jornada del día, 8 h si el día no tiene jornada.
  Es lo que Pulso ya hacía, y con una jornada de 8 h da lo mismo que ÷ 8.
  **Pendiente de José (§8.1).**

## 4. Sueldo fijo: adelanto semanal y cierre del periodo (decisión de José)

A los mensuales se les paga **cada semana**. Un periodo completo paga
**exactamente** el sueldo, tenga el mes 28, 29, 30 o 31 días.

Antes, en Portal, cada semana valía 7 jornales. Febrero pagaba S/ 2 800 sobre
S/ 3 000, un mes de 31 días ~S/ 3 100, y el año 364 jornales contra 360.

**Elegido (con el porqué):**

1. **Cada día calendario vale sueldo ÷ los días de SU periodo.** El periodo del
   mensual es el mes, el del quincenal su quincena (del 1 al 15 y del 16 a fin
   de mes) y el del semanal su semana de lunes a domingo. La suma de los días
   de un periodo completo es el sueldo exacto: el numerador es entero y el
   denominador es el mismo para todo el periodo, así que no hay residuo.
2. **Una semana que cruza de periodo suma cada día con el valor de SU periodo.**
   La línea `sueldo` sale partida por periodo (`period`), para que el cierre
   sepa qué se adelantó de cada mes.
3. **Las faltas se descuentan al treintavo**: sueldo ÷ 30 (÷ 15 la quincena, ÷ 7
   la semana). Un mensual con una falta en febrero cobra S/ 2 900. Es la regla
   de José, y no depende de cuántos días tenga el mes.
4. **El cierre liquida la diferencia**: lo que corresponde − faltas − lo ya
   adelantado. Cada adelanto redondea al céntimo, y el cierre absorbe ese
   redondeo: el total del periodo es exacto.
5. **Una quincena de 16 días paga exactamente la mitad del mes** (la de 13 o 14
   días de febrero, igual).
6. **Alta o cese a mitad de periodo**: se pagan los días con empleo, cada uno
   con el valor de su periodo. Es coherente con el adelanto. **Por confirmar
   con José (§8.3).**

Por qué no «7 jornales por semana + ajuste»: el ajuste sería grande y
cambiaría de signo según el mes. Con el valor por día calendario, el adelanto
ya es casi exacto y el cierre solo corrige céntimos o faltas.

## 5. Descanso semanal (decisión de José: lo decide cada empresa)

`policy.weeklyRest`, una opción por empresa:

| Opción | Qué paga | Uso |
| --- | --- | --- |
| `semana_completa` | 1 jornal si trabajó TODOS los días laborables de la semana | **por omisión**: lo de hoy en Portal |
| `proporcional` | jornal × días trabajados ÷ días laborables (1/6 por día con L–S) | |
| `ninguno` | nada | |

- Aplica a `daily` y `hourly`. El sueldo fijo ya incluye el domingo: el
  treintavo lo paga.
- Se gana con la **semana cerrada**: solo cuando se pasan los 7 días. Una
  semana en curso no lo muestra.
- Los días laborables salen del horario. Un día de permiso pagado o un feriado
  (`excused`) cuenta como trabajado para el descanso, y no es falta.
- El jornal del descanso es el vigente el último día de la semana.

## 6. Domingo o feriado trabajado (decisión de José: «rarísimo»)

Se queda la línea `descanso_trabajado`: valor hora × horas ×
`policy.restDayWorkedPercent` ÷ 100. Por omisión es 100 (sin recargo, lo de hoy
en Pulso), con la nota «recargo por verificar». Cada empresa puede fijar otro
porcentaje.

## 7. Contrato

```ts
import { payDays, closeFixedPeriod, settlementPeriodOf, PLANILLA_VERSION } from '@constroad/planilla'

interface Salary { kind: 'daily' | 'hourly' | 'weekly' | 'biweekly' | 'monthly'; amount: number /* soles */; from: string /* YYYY-MM-DD */ }

interface PayDay {
  date: string;          // YYYY-MM-DD
  scheduled: boolean;    // laborable según el horario
  worked: boolean;       // trabajó ese día
  excused: boolean;      // permiso pagado o feriado: no es falta y cuenta para el descanso
  regularMin: number;    // minutos dentro de la jornada (pago por hora)
  jornadaMin: number;    // jornada del día; 0 = no laborable
  overtime25Min: number; // extra PAGADA (la rechazada va en 0)
  overtime35Min: number;
  restDayMin: number;    // trabajado en su día de descanso
}

interface PayPolicy { weeklyRest: 'semana_completa' | 'proporcional' | 'ninguno'; restDayWorkedPercent: number }

payDays({ days: PayDay[], salaries: Salary[], policy?: Partial<PayPolicy> }) → {
  mode: 'salary' | 'no_salary',
  lines: { concept, quantity, minutes, centimos, period, note }[],
  totalCentimos: number | null, // null sin sueldo vigente
  absences: string[],           // laborables sin trabajo ni permiso
  estimated: true,
}

closeFixedPeriod({ salaries, date, absences, advancedCentimos, employedFrom?, employedTo? }) → {
  period: { key, start, end, days }, dueCentimos, settlementCentimos,
}
```

Conceptos: `dias`, `horas`, `sueldo` (con `period`), `faltas` (negativo, con
`period`), `descanso_semanal`, `extra_25`, `extra_35`, `descanso_trabajado`.

**Cómo se paga a un mensual:** cada semana, `payDays` con los 7 días. Al cerrar
el mes, `advancedCentimos` es la suma de `sueldo` + `faltas` de ese `period` en
las semanas ya pagadas, y `closeFixedPeriod` devuelve el saldo
(`settlementCentimos`).

## 7-bis. Cómo se publica y cómo lo consume cada app

- **Dependencia por tag**: `"@constroad/planilla":
  "git+ssh://git@github.com/constroad/planilla.git#vX.Y.Z"`. La mini clona los
  repos de constroad por SSH; no hay registry ni token.
- **El tag trae `dist/`** (JS CommonJS + `.d.ts`) y `casos.json`. `main` no
  lleva `dist/`: solo el commit de release, fuera de `main`. Nada compila al
  instalar.
- **`scripts/publish.sh X.Y.Z`**, en la máquina de quien publica (nunca en la
  mini): tests → versión en `main` → commit de release con `dist/` → tag →
  para cada app de `scripts/apps.conf`, la dependencia al tag nuevo y sus
  constroad-gates (sus tests, casos dorados incluidos). Todas verdes → push de
  cada una, y el vigía de Torre despliega. Una roja → ninguna se pushea y cada
  una vuelve a su commit anterior.
- **Casos dorados** (`casos.json`): entrada → céntimos esperados. Cada app los
  corre por SU adaptador (su asistencia → `PayDay`).
- **`planillaVersion`** en el `/health` de cada app, desde `PLANILLA_VERSION`.
  Agentes lo compara cada hora y avisa si una se atrasa.
- **La app de Pulso calcula sin señal con el paquete dentro del APK.** Un tag
  que cambia céntimos sube la versión mínima en LilaStore con el APK
  siguiente; con señal manda el servidor.
- Los adaptadores son de cada app: en Pulso, `payDayOf` (de `DayHours`) y
  `salariesFromJornales`.

## 8. Preguntas abiertas para José

1. **El jornalero en un día de jornada corta (el sábado de 5 h), PENDIENTE**:
   hoy el paquete hace lo de Pulso. El día trabajado paga el jornal completo, y
   la hora (base de la extra) vale jornal ÷ la jornada del día. Portal e
   Inframaq pagan ese día por horas (jornal ÷ 8 × horas). José decide cuál
   queda. Hasta entonces, **los casos dorados no fijan esto**: todos sus días
   laborables tienen 8 h, así que dan lo mismo con cualquiera de las dos
   reglas. El caso de la jornada corta entra a `casos.json` con la decisión.
2. **Pulso no paga hoy el descanso semanal**: su pago estimado equivale a
   `ninguno`. Cuando Configuración tenga la opción, cada empresa nueva arranca
   con `semana_completa`. ¿Las que ya usan Pulso también? Su estimado subiría
   un jornal por semana completa.
3. **Alta o cese a mitad de mes** (§4.6): ¿por día calendario o al treintavo?
4. **Permiso pagado de un jornalero**: el estimado de Pulso no lo paga (P6). El
   motor ya lo recibe como `excused` para el descanso; pagarlo es una línea más.

## 9. Tests

`src/salary.test.ts`, `payDays.test.ts`, `fixedClose.test.ts` y `casos.test.ts` (los 16 casos dorados):

- Mensual de S/ 3 000 con mes completo en enero (31), febrero (28), febrero
  bisiesto (2028, 29) y abril (30): cada mes cierra en S/ 3 000,00. Adelantos
  semanales + saldo = S/ 3 000,00, también con semanas que cruzan de mes.
- La semana del 26/01 al 01/02/2026: 6 días de enero a S/ 3 000 ÷ 31 y 1 de
  febrero a S/ 3 000 ÷ 28, en dos líneas `sueldo`.
- Mensual con una falta en febrero: S/ 2 900.
- Quincena de 16 días (del 16 al 31): exactamente la quincena.
- Jornalero: los días trabajados más el descanso según las tres opciones, con
  semana completa y con una falta.
- Extras de un mensual: jornal ÷ 8 × 1,25 y × 1,35.
