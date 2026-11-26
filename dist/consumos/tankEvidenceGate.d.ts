/**
 * Compuerta de evidencia de las medidas de tanque.
 *
 * La medida EXIGE foto (control anti-fraude): sin evidencia el POST/PUT responde
 * 400. La única excepción es que el cliente declare `evidenceDeferred` porque el
 * Drive (lila) estaba caído y la foto quedó en la cola del navegador; entonces la
 * medida se registra marcada `evidencePending` y la foto sube al reconectar.
 *
 * Regresión 2026-07-25: al invertir el orden (POST antes de subir la foto, sin
 * declarar el diferido) TODA medida daba 400. Este helper centraliza la decisión
 * para POST y PUT y la vuelve testeable.
 */
export type TankEvidenceGateInput = {
    /** Cuántas evidencias YA existen para la medida (media con su resourceId). */
    evidenceCount: number;
    /** El cliente declaró que difirió la foto (Drive caído → cola). */
    evidenceDeferred: boolean;
};
export type TankEvidenceGateResult = {
    /** true = rechazar con 400 (sin evidencia ni declaración de diferido). */
    blocked: boolean;
    /** Persistir en la medida: la foto está pendiente de subir. */
    evidencePending: boolean;
};
export declare const resolveTankEvidenceGate: ({ evidenceCount, evidenceDeferred, }: TankEvidenceGateInput) => TankEvidenceGateResult;
