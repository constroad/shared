import type { ConfigurableTankSerpentine, TankContentType, TankMovementType, TankShape } from './tankModel';

export type ConsumeSource = 'legacy' | 'tank-movements';

export type ConsumeMovementRole = 'selected';
export type ConsumeMovementIntervalType = 'consumption' | 'refill' | 'flat';

export interface ConsumeMovementReference {
  movementId: string;
  tankId: string;
  tankName: string;
  eventType: TankMovementType;
  initialLevelCentimeter?: number;
  initialEffectiveGallons?: number;
  initialAvailableGallons?: number;
  initialValveDeadGallons?: number;
  levelCentimeter: number;
  effectiveGallons: number;
  deltaGallons?: number;
  consumedGallons?: number;
  refillGallons?: number;
  intervalType?: ConsumeMovementIntervalType;
  date: string;
  role: ConsumeMovementRole;
}

export interface ConsumeMovementOrder {
  orderId: string;
  orderName: string;
  orderClient: string;
  tipoMAC: string;
  /** Solo cuando el pedido es de OTRA empresa (proveedor de planta). */
  sourceCompanyId?: string;
}

export interface ConsumeMovementMeasure {
  tank: string;
  tankId?: string;
  initialMeasure: number;
  finalMeasure: number;
  quantityConsumed?: number;
  movementIds?: string[];
}

export interface ConsumeMovementTank {
  _id: string;
  name: string;
  tableReference: string;
  contentType: TankContentType;
  tankShape: TankShape;
  geometry: Record<string, number>;
  cubicCmPerUsGallon: number;
  serpentines: ConfigurableTankSerpentine[];
  valveHeightFromBottomCm?: number;
  valveDeadVolumeGallons?: number;
  showInProductionConsumeModule?: boolean;
  includeInFluidsReport?: boolean;
  sharedTankId?: string;
  sharedOwnerCompanyId?: string;
  /** Empresa dueña del DOC (el dueño físico = sharedOwnerCompanyId || companyId). */
  companyId?: string;
}

export interface ConsumeMovementRecord {
  _id: string;
  tankId: string;
  tankName: string;
  eventType: TankMovementType;
  initialLevelCentimeter?: number;
  initialEffectiveGallons?: number;
  initialAvailableGallons?: number;
  initialValveDeadGallons?: number;
  levelCentimeter: number;
  effectiveGallons: number;
  availableGallons?: number;
  valveDeadGallons?: number;
  date: string;
  createdAt?: string;
  note?: string;
  tags?: string[];
  /** Autoría persistida (F2); lecturas pre-F2 no la tienen. */
  deviceName?: string;
  isConsumed?: boolean;
  consumedByConsumeId?: string;
  /** Fotos de la lectura (F2, con `includeEvidences=true` en el GET). */
  evidences?: unknown[];
}

export interface ConsumeMovementInterval {
  startMovement: ConsumeMovementRecord;
  endMovement: ConsumeMovementRecord;
  startLevelCentimeter: number;
  endLevelCentimeter: number;
  startEffectiveGallons: number;
  endEffectiveGallons: number;
  deltaGallons: number;
  consumedGallons: number;
  refillGallons: number;
  intervalType: ConsumeMovementIntervalType;
}

export interface ConsumeMovementDispatch {
  _id?: string;
  orderId?: string;
  quantity: number;
  state?: string;
}

export interface ConsumeMovementOrderListItem {
  _id?: string;
  cliente?: string;
  obra?: string;
  tipoMAC?: string;
  design?: string;
  fechaProgramacion?: string;
  cantidadCubos?: number;
  m3dispatched?: number;
  status?: string;
}

export interface ConsumeMovementOrderResponse {
  orders: ConsumeMovementOrderListItem[];
}

/**
 * Pedido PROYECTADO de un cliente en el tenant del PROVEEDOR de planta
 * (`GET /api/consume/provider-orders`): sale de `production_bookings`, no de
 * `orders`. El pedido sigue viviendo solo en el tenant cliente; aquí solo se
 * lee la proyección que el proveedor ya mantiene para su programador.
 */
export interface ProjectedConsumeOrder extends ConsumeMovementOrderListItem {
  /** Despachos del pedido fuente (del `dispatchSummary` del booking). */
  dispatchCount: number;
  sourceCompanyId: string;
  sourceCompanyName: string;
  isProjected: true;
}

export interface ProviderConsumeOrdersResponse {
  /** `true` solo si la company es proveedora de planta (`isPlantScheduleProvider`). */
  isProvider: boolean;
  orders: ProjectedConsumeOrder[];
}

/** Pedido ya atribuido a un consumo (`GET /api/consume/used-orders`, F2). */
export interface ConsumeUsedOrderAttribution {
  consumeId: string;
  /** Fecha representativa del consumo (fin del periodo; fallback guardado). */
  consumeDate: string;
}

export interface ConsumeUsedOrdersResponse {
  success: boolean;
  data: Record<string, ConsumeUsedOrderAttribution>;
}

/** Promedios mensuales por combustible (`GET /api/consume/average`, F3: keyed). */
export interface ConsumeMonthlyAverages {
  pen: number[];
  gasohol: number[];
  petroleo: number[];
  gas: number[];
}

/** Baseline del KPI gal/m³ (`GET /api/consume/rate-baseline`, F3). */
export interface ConsumeRateBaselineResponse {
  success: boolean;
  data: {
    averageRatePerM3: number | null;
    sampleSize: number;
  };
}

export interface ConsumeMovementDispatchResponse {
  dispatchs: ConsumeMovementDispatch[];
}

export interface ConsumeMovementTankCalculation {
  tankId: string;
  tankName: string;
  tankReference: string;
  contentType: TankContentType;
  selectedMovements: ConsumeMovementRecord[];
  intervals: ConsumeMovementInterval[];
  consumedGallons: number;
  initialMeasure: number;
  finalMeasure: number;
  isComplete: boolean;
}

export interface ConsumeMovementCalculationPayload {
  orders: ConsumeMovementOrder[];
  tanks: ConsumeMovementTankCalculation[];
  dispatchIds: string[];
  computedM3: number;
  manualM3?: number;
  totalCubes: number;
  quantityPen: number;
  quantityGasohol: number;
  quantityPetroleo: number;
  calculationNotes?: string;
}

export interface ConsumeMovementAuditConsume {
  _id?: string;
  createdAt?: string;
  date: string;
  source?: ConsumeSource;
  orders: ConsumeMovementOrder[];
  measures: ConsumeMovementMeasure[];
  movementRefs?: ConsumeMovementReference[];
  manualM3?: number;
  calculationNotes?: string;
  totalCubes: number;
  /** Periodo REAL medido (F1); consumos legacy sin backfill no lo tienen. */
  periodStart?: string;
  periodEnd?: string;
}
