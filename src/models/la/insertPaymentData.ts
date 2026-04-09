export interface InsertPaymentData {
  Rif: string;
  Val_gra: string;
  FlEmi: string;
  FlDisp: string;
  Cuenta: string;
  Concepto: string;
  TpPaso: string;
  Nunota: string;
  Refer: string;
  Nurefer: string;
  Nucorre: number | string;
  Fpago: number;
  Monto: string;
  Tpcambio: string;
  Copaso: string;
  Nupaso: number;
  Statusabono: number;
  Statusliq: string;
  Statusoper: string;
  Codcontrap?: string;
}
