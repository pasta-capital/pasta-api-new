/**
 * Modelo de datos para insertar operación MM Crédito desde LA Sistemas
 */

export interface InsertOperationData {
  Rif: string; // Rif / Cédula del cliente
  Contrap?: string; // Contraparte
  Validagraba: string; // Parámetro que indica la acción (V= Validar / G= Grabar / A= Anular)
  Producto: string; // Código del Producto
  Moneda: string; // Número de Moneda
  Inicio: string; // Fecha de Inicio (formato: DD/MM/YYYY)
  Venc: string; // Fecha de Vencimiento (formato: DD/MM/YYYY)
  Monto: string; // Monto
  Cuotas: string; // Número de Cuotas
  Tpcambio: string; // Tipo de Cambio
  Monefec: string; // Fecha de Emisión de la moneda
  Tasa: string; // Tasa de Interés
  Comi: string; // Comisión
  Fpago: string; // Forma de pago
  Refer: string; // Referencia de la Transacción
  Tpint: string; // Tipo de Pago de los intereses
  Numesa?: string; // Número de mesa
  Nuveh?: string; // Número de vehiculo
  Nucorre?: string; // Número de Corresponsal asociado al pago
  Tipomm?: string; // Tipo de Operación MM (0= Activa / 1= Pasiva)
  Copaso?: string; // Código único de la operación registrada (sólo en caso de anulación)
}
