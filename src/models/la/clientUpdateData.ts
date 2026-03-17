/**
 * Modelo de datos para actualización de cliente desde LA Sistemas
 * Mapea los campos del sistema LA Sistemas con los campos del modelo User
 */

export interface ClientUpdateData {
  // Campos obligatorios
  Apellido: string; // Apellidos -> lastname
  Nombre: string; // Nombres -> name
  Rif: string; // Número de Documento de Identidad -> document
  NuevoEjecutivo?: string; // Número de Documento de Identidad del Ejecutivo
  Ciejecutivo: string; // Número de Documento de Identidad del Ejecutivo
  Edocivil: string; // Estado Civil: Soltero / Casado / Divorciado -> maritalStatus
  Oficina: string; // Código de la Oficina
  Tppersona: string; // Tipo de Persona

  // Información personal básica (compatible con User.ts)
  Sexo?: string; // F = Femenino / M = Masculino -> gender
  Nacimiento?: string; // Fecha de Nacimiento (formato: DD/MM/YYYY) -> birthDate
  Nacionalidad?: string; // Nacionalidad
  Pasaporte?: string; // Número de Pasaporte
  Vencpasaporte?: string; // Fecha de Vencimiento del Pasaporte (formato: DD/MM/YYYY)
  Vencid?: string; // Fecha de Vencimiento del Documento de Identidad (formato: DD/MM/YYYY)

  // Información de contacto (compatible con User.ts)
  Tlf1?: string; // Número de Teléfono Principal -> phone
  Tlf2?: string; // Número de Teléfono Secundario
  Verificaciontlf1?: string; // Indicador si el Cliente Posee Verificación Activa en el Teléfono Principal
  Fax?: string; // Número de Fax
  Email?: string; // Primera Dirección de Email -> email
  Demail?: string; // Detalle de Primer Email
  Verificacionemail?: string; // Indica si el Primer Email tiene Verificación
  Email1?: string; // Segunda Dirección de Email
  Email2?: string; // Tercera Dirección de Email
  Email3?: string; // Cuarta Dirección de Email

  // Información de dirección (compatible con User.ts)
  Dirhabitacion1?: string; // Primera Línea de la Dirección de Residencia -> address
  Dirhabitacion2?: string; // Segunda Línea de la Dirección de Residencia
  Dirhabitacion3?: string; // Tercera Línea de la Dirección de Residencia
  Ciudad?: string; // Ciudad de Residencia
  Estado?: string; // Estado de Residencia
  Postal?: string; // Código Postal
  Paisresid?: string; // País de Residencia
  Paisnac?: string; // País de Nacimiento
  Paisotro?: string; // País de Otro
  Correspondencia?: string; // Muestra Donde Desea Recibir la Correspondencia el Cliente
  Enviocorrespondencia?: string; // Lugar Donde Desea Recibir la Correspondencia el Cliente

  // Información laboral y económica (compatible con User.ts)
  Empresa?: string; // Nombre de la Empresa -> enterprise.name
  Dirempre1?: string; // Primera Línea de la Dirección de la Empresa -> enterprise.address
  Dirempre2?: string; // Segunda Línea de la Dirección de la Empresa
  Cargoempresa?: string; // Cargo que Posee en la Empresa -> enterprise.position
  Rifempresa?: string; // Número de Identificación de la Empresa
  Paisempresa?: string; // País de la Empresa
  Feingresoempresa?: string; // Fecha de Ingreso en la Empresa (formato: DD/MM/YYYY)
  Antiguedadempresa?: string; // Años de Antiguedad en la Empresa -> seniority
  Situacionlab?: string; // Código de la Situación Laboral
  Situacionlablegal?: string; // Código de la Situación Legal
  Ocupacion?: string; // Código de la Ocupación Realizada -> occupation
  Ocupacionco?: string; // Código de la Ocupación (comercial)
  Actividad?: string; // Actividad Económica Desempeñada
  Actividadco?: string; // Actividad Económica (comercial)
  Actividadempre?: string; // Actividad Económica de la Empresa
  Profesion?: string; // Código de la Profesión del Cliente
  Profesionco?: string; // Código de la Profesión (comercial)
  Sectorecon?: string; // Sector Económico en el que se Desempeña el Cliente
  Sector?: string; // Sector Económico de la Actividad Realizada

  // Información académica (compatible con User.ts)
  Nivelacad?: string; // Nivel Académico -> education

  // Información financiera (compatible con User.ts)
  Ingreso1?: string; // Monto del Ingreso Principal -> income
  Ingreso2?: string; // Monto de Ingresos Secundario -> otherIncome
  Ingresosanuales?: string; // Monto de Ingresos Anuales
  Ingresoa?: string; // Ingreso Anual
  Ingresosmes?: string; // Monto de Ingresos Mensuales
  Egresosmes?: string; // Monto de Egresos Mensuales
  Pasivosmes?: string; // Monto de Pasivos Mensuales
  Otrosingresos?: string; // Monto de Otros Ingresos
  Frecuenciaing?: string; // Frecuencia de Ingreso
  Procedenciaotros?: string; // Procedencia de Otros Ingresos
  Fuentesing?: string; // Fuentes de Ingreso
  Patrimonio?: string; // Monto de Patrimonio
  Actliquidos?: string; // Monto de Activos Liquidos
  Patrimonioa?: string; // Monto de Patrimonio Anual
  Actliquidosa?: string; // Monto de Activos Liquidos Anual
  Totalactivo?: string; // Total de Activos
  Totalpasivo?: string; // Monto Total de Pasivos
  Totpasant?: string; // Monto Total Pasivo Anterior
  Suscrito?: string; // Monto de Suscripción
  Msuscrito?: string; // Monto Suscrito

  // Información de cuenta bancaria
  Cuenta?: string; // Número de la Cuenta Principal del Cliente
  Banco?: string; // Nombre del Banco de la Cuenta Principal
  Tpcuenta?: string; // Tipo de la Cuenta Principal
  Titularcuenta?: string; // Nombre del Titular de la Cuenta Principal
  Moncuenta?: string; // Moneda de la Cuenta Principal
  Cuental?: string; // Número de Cuenta Secundaria
  Bancol?: string; // Nombre del Banco de la Cuenta Secundaria
  Tpcuental?: string; // Tipo de la Cuenta Secundaria
  Moncuental?: string; // Moneda de la Cuenta Secundaria
  Cuentas?: string; // Cuentas Adicionales

  // Información de ejecutivo
  Ejecutivo?: string; // Nombre del Ejecutivo Asignado
  Nuejecutivo?: string; // Número de Identificación del Ejecutivo Asignado
  Tlfejecutivo?: string; // Número de Teléfono del Ejecutivo Asignado
  Emailejecutivo?: string; // Dirección de Correo del Ejecutivo Asignado
  Certifejecutivo?: string; // Número de Certificado del Ejecutivo Asignado
  Fotoejecutivo?: string; // Ruta Donde se Encuentra la Foto del Ejecutivo Asignado
  Extejecutivo?: string; // Extensión del Ejecutivo
  Ejecutivo1?: string; // Nombre del Ejecutivo Alternativo Asignado
  Ciejecutivo1?: string; // Número de Documento de Identidad del Ejecutivo Alternativo
  Tlfejecutivo1?: string; // Teléfono del Ejecutivo Alternativo Asignado

  // Información de contrato
  Fecontrato?: string; // Fecha del Contrato (formato: DD/MM/YYYY)
  Numcontrato?: string; // Número de Contrato
  Tpcontrato?: string; // Tipo de Contrato
  Usacodigocontrato?: string; // Indicador si Utiliza Código de Contrato - S = Si, N = No
  Feregistro?: string; // Fecha de Registro (formato: DD/MM/YYYY)
  Fecaperct?: string; // Fecha de Apertura de Cuentas (formato: DD/MM/YYYY)
  Feultmodif?: string; // Fecha de la Última Modificación Realizada al Cliente (formato: DD/MM/YYYY)

  // Información de identificación y códigos
  Id?: string; // Código de Identificación de LA Sistemas
  Codigocli?: string; // Código de Identificación de Cliente de LA Sistemas
  Nufinal?: string; // Número Único de Identificación del Cliente en los Sistemas
  Ctacevaldom?: string; // Número de Cuenta CEVALDOM
  Depositaria?: string; // Nombre de la Depositaria
  Banca?: string; // Código de Banca
  Usuario?: string; // Código de Identificación de LA Sistemas del Usuario Responsable del Registro del Cliente

  // Información de PEP (compatible con User.ts)
  Vinculadopep?: string; // Indicador que Muestra si el Cliente está Vinculado a una Persona Políticamente Expuesta - SI, NO -> pep
  Documpolitexp?: string; // Indicador si se Entregó un Documento que Demuestra que el Cliente Es Políticamente Expuesto
  Fechaexp1?: string; // Fecha Políticamente Expuesto
  Fechaexp2?: string; // Fecha Políticamente Expuesto 2

  // Información de vinculación
  Vinculacion?: string; // Canal de Vinculación
  Grpvinc?: string; // Grupo de Vinculación
  Empleado?: string; // Indicador si el Cliente es Empleado de la Empresa - S = Si, N = No
  Referidopor?: string; // Nombre de la Persona por la que Fue Referido el Cliente
  Atencion?: string; // Nombre de Atención

  // Información de calificación y riesgo
  Calificacion?: string; // Calificación de Riesgo Asignada
  Calificadora?: string; // Nombre de la Empresa Calificadora de Riesgo
  Categoriariesgo?: string; // Categoría de Riesgo
  Nivelr?: string; // Nivel de Riesgo

  // Información de perfil de inversor
  Perfil?: string; // Perfil de Inversor
  Stat?: string; // Estado del Cliente
  Tolerancia?: string; // Tipo de Tolerancia
  Mttolerancia?: string; // Monto de Tolerancia
  Objetivo?: string; // Monto Objetivo
  Promedio?: string; // Monto Promedio
  Usocuenta?: string; // Usa Cuenta
  Motivoapert?: string; // Motivo de Apertura
  Procedencia?: string; // Procedencia
  Experiencia?: string; // Experiencia
  Operacionesmercado?: string; // Operaciones de Mercado

  // Información de documentos
  Documci?: string; // Muestra si el Cliente Entregó una Copia de su Documento de Identidad - S = Si, N = No
  Documrif?: string; // Indicador si el Cliente Entregó una Copia de su Registro Fiscal - S = Si, N = No
  Documconstitutivo?: string; // Indica si se Entregó una Copia del Documento Constitutivo - S = Si, N = No
  Documjdirectiva?: string; // Muestra si se Entregó una Copia del Documento de la Junta Directiva - S = Si, N = No
  Documcompla?: string; // Indicador de la Entrega de Copia de Documento de Complacencia - S = Si, N = No
  Documcontrato?: string; // Indica si se Entegó una Copia del Contrato - S = Si, N = No
  Documdecingresos?: string; // Indica si se Entregó una Declaración de Ingresos - S = Si, N = No
  Documrnt?: string; // Indicador si se Entregó un Documento de Retención
  Documtarjtfirma?: string; // Indicador si se Entregó una Copia de la Tarjeta de Firma - S = Si, N = No
  Documconozca?: string; // Indicador si se Entregó un Documento de Conozca - S = Si, N = No
  Documperfil?: string; // Indicador si se Entregó un Documento de Perfil - S = Si, N = No
  Documlistaacc?: string; // Indicador si se Entregó una Lista de Accionistas - S = Si, N = No
  Documcertifreg?: string; // Indicador si se Entregó una Certificación de Ingresos - S = Si, N = No
  Documedosfinan?: string; // Indicador si se Entregó un Documento de Financiaciones - S = Si, N = No
  Documpasaporte?: string; // Indicador si se Entregó una Copia de Pasaporte - S = Si, N = No
  Documdocsocieta?: string; // Indicador si se Entregó una Copia de Documento de Sociedad - S = Si, N = No
  Documcontribespec?: string; // Indicador si se Entregó un Documento de Contribuyente Especial - S = Si, N = No
  Documautorrepre?: string; // Indicador si se Entregó un Documento de Auto Representación - S = Si, N = No
  Documautorfirma?: string; // Indicador si se Entregó un Documento de Firma de Autor - S = Si, N = No
  Documotro?: string; // Indicador si se Entregó Otro Tipo de Documento - S = Si, N = No

  // Información de representante legal
  Replegal?: string; // Representante Legal
  Cireplegal?: string; // Documento de Identidad o Número de Identificación del Representante Legal
  Venccireplegal?: string; // Fecha de Vencimiento del Documento de Identidad del Representante Legal (formato: DD/MM/YYYY)
  Paisnacreplegal?: string; // País de Nacimiento del Representante Legal
  Pasreplegal?: string; // Pasaporte del Representante Legal
  Nacreplegal?: string; // Fecha de Nacimiento del Representante Legal
  Sexoreplegal?: string; // Sexo o Género del Representante Legal
  Poderreplegal?: string; // Indicado si el Representante Legal Posee un Poder - S = Si, N = No
  Fecreplegal?: string; // Fecha de Creación del Representante Legal (formato: DD/MM/YYYY)
  Tlfreplegal?: string; // Teléfono del Representante Legal
  Faxreplegal?: string; // Número de Fax del Representante Legal

  // Información de apoderado
  Apoderado?: string; // Nombre del Apoderado
  Datospodera?: string; // Información del Apoderado
  Ciapoderado?: string; // Documento de Identidad del Apoderado
  Firmas?: string; // Indicador si el Cliente Posee Firmas Comerciales - S = Si, N = No

  // Información de registro
  Registro?: string; // Código de Registro
  Fevencregistro?: string; // Fecha de Vencimiento del Registro (formato: DD/MM/YYYY)
  Tomo?: string; // Tomo del Registro
  Nutomo?: string; // Número de Tomo
  Fregistro?: string; // Fecha de Registro (formato: DD/MM/YYYY)
  Dregistro?: string; // Descripción de Registro
  Aregistro?: string; // Datos de Registro
  Folio?: string; // Datos de Folio

  // Información de grupo y categoría
  Grupo?: string; // Grupo o Categoría del Cliente
  Tpclibursatil?: string; // Tipo de Cliente Bursátil
  Cmifondos?: string; // Tipo de Comisión de Fondos
  Cmicustodia?: string; // Tipo de Comisión de Custodia

  // Información de dividendos
  Dividinstruc?: string; // Instrucciones de Dividendo
  Dividtpcta?: string; // Tipo de Cuenta de Dividendo
  Dividcta?: string; // Número de Cuenta de Dividendo
  Dividbanco?: string; // Nombre del Banco de la Cuenta de Dividendo

  // Información de cuentas de divisas
  Monedad?: string; // Moneda de Cuenta de Divisas
  Cuentad?: string; // Cuenta de Divisas
  Bancod?: string; // Nombre del Banco de la Cuenta de Divisas
  Beneficiariod?: string; // Nombre del Beneficiario de la Cuenta de Divisas
  Idbanco?: string; // Identificador de Banco de la Cuenta de Divisas
  Tpcuentad?: string; // Tipo de la Cuenta de Divisas
  Monedad1?: string; // Moneda de la Cuenta de Divisas Adicional
  Cuentad1?: string; // Número de la Cuenta de Divisas Adicional
  Bancod1?: string; // Nombre del Banco de Cuenta de Divisas Adicional
  Idbanco1?: string; // Identificador del Banco de la Cuenta de Divisas Adicional
  Dirbanco1?: string; // Dirección del Banco de la Cuenta de Divisas Adicional
  Beneficiariod1?: string; // Nombre del Beneficiario de la Cuenta de Divisas Adicional
  Dirbeneficiariod1?: string; // Dirección del Beneficiario de la Cuenta de Divisas Adicional
  Furtherbco1?: string; // Banco de la Cuenta Intermediaria
  Furthercta1?: string; // Número de la Cuenta Intermediaria
  Furtherdir1?: string; // Dirección del Banco de la Cuenta Intermediaria
  Furtherid1?: string; // Identificador del Banco de la Cuenta Intermediaria
  Idfurther1?: string; // Identificador del Banco Intermediario

  // Información de impuestos
  Exoneraimp?: string; // Muestra si el Cliente está Exonerado de Impuestos - S = Si, N = No
  Vencexoneraimp?: string; // Fecha de Vencimiento de Exoneración de Impuestos
  Contribespecial?: string; // Muestra si el Cliente es un Contribuyente Especial - S = Si, N = No
  Riftraspaso?: string; // Número de Documento de Identidad o Número de Identificación para Traspasos

  // Información de FATCA
  Fatcaciu?: string; // Indicador si el Cliente es Ciudadano FATCA
  Fatcanac?: string; // FATCA Nacional
  Fatcatin?: string; // FATCA Número TIN
  Fatcagreenc?: string; // FATCA Número de Green Card
  Fatcadomicilio?: string; // FATCA Domicilio Fiscal EEUU
  Fatcassn?: string; // FATCA Número Seguro Social
  Fatcaperm?: string; // FATCA Residente Permanente
  Fatcaresid?: string; // FATCA Identificación Residente
  Fatcaimp?: string; // FATCA Impuestos
  Fatcapoder?: string; // FATCA Poder
  Fatcatinrefer?: string; // FATCA Referencia TIN
  Fatcagreencrefer?: string; // FATCA Referencia Green Card
  Fatcadomiciliorefer?: string; // FATCA Referencia Domicilio
  Fatcassnrefer?: string; // FATCA Referencia Número Seguro Social
  Fatcatlfrefer?: string; // FATCA Referencia Teléfonica
  Fatcaholdrefer?: string; // FATCA Referencia Holder
  Fatcasolicres?: string; // FATCA Referencia Solicitud de Residencia
  Fatcamotresfiscal?: string; // FATCA Motivo de Residencia Fiscal
  Fatcapaisfiscal?: string; // FATCA Pais Fiscal
  Fatcaw8?: string; // FATCA Firma Waiver 8
  Fatcaw9?: string; // FATCA Firma Waiver 9
  Fatcafecwaiver?: string; // FATCA Fecha de Firma de Waiver
  Fatcafecw8?: string; // FATCA Fecha de Waiver 8
  Fatcafecregistro?: string; // FATCA Fecha de Registro
  Fatcacotitular?: string; // FATCA Nombre de Cotitular
  Tlfausencia?: string; // FATCA Teléfono en Caso de Ausencia

  // Información adicional
  Incapacidad?: string; // Indicador si el Cliente Posee una Incapacidad - S = Si, N = No
  Imprfija?: string; // Indicador de Impresión Fija
  Transferint?: string; // Indicador de Permiso de Transferencias Internacionales - S = Si, N = No
  Paisdestino?: string; // País de Destino
  Swift?: string; // Código Identificador SWIFT
  Datospoder?: string; // Información de Poder
  Euroclear?: string; // Información de Euroclear
  Cuentaccbu?: string; // Número de Cuenta de Trabajo CCBU
  Institutopagot?: string; // Información de Pago Institucional
  Períodopagot?: string; // Período de Pago
  Escotitulares?: string; // Información de Cotitular
  Monbasecliente?: string; // Moneda Base del Cliente
  Lineatipo?: string; // Tipo de Línea
  Lineamonto?: string; // Monto de Línea
  Tpvivienda?: string; // Tipo de Vivienda
  Empleados?: string; // Número de Empleados
  Tpsociedad?: string; // Tipo de Sociedad
  Tpempresa?: string; // Tipo de Empresa
  Porceninvertir?: string; // Porcentaje de Invertir
  Comisiones?: string; // Comisiones
  Prestamo?: string; // Monto de Préstamo
  Cargo?: string; // Cargo del Cliente
  Resideu?: string; // Información de Residencia
  Coont?: string; // Información de Contrato
  Fefinlaboral?: string; // Fecha de Ingreso Laboral (formato: DD/MM/YYYY)
  Período?: string; // Período
  Patritotal?: string; // Total del Patrimonio
  Respuestas?: string; // Respuestas de la Encuesta
  Referencias?: {
    Referencia?: Array<{
      Tiporefer?: string;
      Institucion?: string;
      Cuentarelac?: string;
      Tlfprodu?: string;
      Direccionref?: string;
      Contactoref?: string;
      Ciudadref?: string;
      Postalref?: string;
    }>;
  };
  Balance?: {
    Ingsalario?: string;
    Ingbono?: string;
    Ingrenta?: string;
    Inginver?: string;
    Ingotros?: string;
    Egrprestamos?: string;
    Egrpagpend?: string;
    Egrpagreg?: string;
    Egrhipotecas?: string;
    Egrotros?: string;
    Ingpaisorigen?: string;
    Ingtpfrecuencia?: string;
    Ingprocedencia?: string;
    Ingrecepfing?: string;
    Ingrecepfotros?: string;
    Ingdetalle?: string;
  };
  Empresaref?: string; // Referencia Empresarial
  Empleadoref?: string; // Referencia Empleador
  Oficinaref?: string; // Referencia de Oficina
  Empresacoref?: string; // CoReferencia de Empresa
  Empleadocoref?: string; // Referencia de Empleado
  Oficinacoref?: string; // CoReferencia de Oficina
  Confirmaciones?: string; // Información de Confirmaciones
  Rnt?: string; // Número de RNT
  Directorio?: string; // Directorio de archivos
  Archivonom?: string; // Nombre de archivo
  Historia?: any[]; // Historial del cliente
  Cotitulares?: any[]; // Información de cotitulares
  Publicexp?: string; // Si es politicamete expuesto
  Cargopolitexp?: string; // Cargo de política expuesta
  Apepolitexp?: string; // Apellido de política expuesta
}
