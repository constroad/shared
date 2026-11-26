"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.splitTanksByOwnership = exports.isTankConsumableBy = exports.tankOwnerCompanyId = void 0;
/**
 * Consumos sobre tanques COMPARTIDOS (caso INFRAMAQ↔CONSTROAD↔GLOBOFAST).
 *
 * Regla vigente (2026-08-01): el tanque físico tiene un DUEÑO
 * (`sharedOwnerCompanyId`), pero **cualquier empresa con la que esté compartido
 * puede registrar medidas Y generar consumos**. Compartir un tanque es
 * compartir su operación, no solo su lectura.
 *
 * Reemplaza la regla owner-only (2026-07-27) que dejaba el flujo TRABADO: los
 * tanques INFRA y GRUPO son de INFRAMAQ, pero quien mide es constroad (119 en
 * GRUPO WILSON, 81 en GRUPO PENTA, 51 en HIGHWAY contra 0 del dueño). El único
 * habilitado a consumir era justamente el que no medía.
 *
 * Lo que evita el doble consumo NO es el dueño: es `consumedByConsumeId`, que
 * marca cada medida como usada y es global al tanque físico. Esa protección
 * sigue intacta y es la que impide que dos empresas consuman la misma medida.
 */
const tankOwnerCompanyId = (tank) => tank.sharedOwnerCompanyId || tank.companyId || '';
exports.tankOwnerCompanyId = tankOwnerCompanyId;
/**
 * ¿La empresa activa puede generar consumos con este tanque?
 *
 * Sí para todo tanque que le llegue: la lista solo trae los ACCESIBLES (propios
 * + compartidos con ella), y sobre un compartido ahora también se consume. El
 * guard duro sigue siendo el server, que valida la accesibilidad real del
 * movimiento y que no esté ya consumido.
 */
const isTankConsumableBy = (_tank, _activeCompanyId) => true;
exports.isTankConsumableBy = isTankConsumableBy;
/**
 * Parte los tanques accesibles en consumibles y de dueño ajeno. Con la regla
 * vigente `foreignOwned` queda SIEMPRE vacío; se conserva la forma para no
 * romper a los consumidores (la UI ya no tiene que declarar nada de solo
 * lectura) y para poder reintroducir una restricción por empresa si algún día
 * un tanque se comparte solo para lectura.
 */
const splitTanksByOwnership = (tanks, activeCompanyId) => {
    const consumable = [];
    const foreignOwned = [];
    tanks.forEach((tank) => {
        if ((0, exports.isTankConsumableBy)(tank, activeCompanyId))
            consumable.push(tank);
        else
            foreignOwned.push(tank);
    });
    return { consumable, foreignOwned };
};
exports.splitTanksByOwnership = splitTanksByOwnership;
