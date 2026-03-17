/**
 * Modelo de datos para consultar deuda MM Crédito desde LA Sistemas
 */

export interface ConsultDebtData {
  Rif: string; // Rif / Cédula del cliente
  Fecha?: string; // Fecha de la consulta (Opcional, si se envía en blanco se consulta a la fecha de cierre del sistema) (formato: DD/MM/YYYY)
}
