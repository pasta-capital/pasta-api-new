/**
 * Modelo de datos para simular crédito desde LA Sistemas
 */

export interface SimulateCreditData {
  NuContrato: string; // Número de Contrato a simular
  SubPlan: string; // Código del subplan
  Valor: string; // Monto Valor
  Financiar: string; // Monto a Financiar
  Ini: string; // Fecha inicial de la simulación (formato: DD/MM/YYYY)
  Plazo: string; // Cantidad de Cuotas para la simulación
  Tasa: string; // Tasa para la simulación
  DiaMes: string; // Día inicial del mes para la simulación
}
