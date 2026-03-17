import { v1 as uuid } from "uuid";

/**
 * Convert string to boolean.
 *
 * @export
 * @param {string} input
 * @returns {boolean}
 */
export const StringToBoolean = (input: string): boolean => {
  try {
    return Boolean(JSON.parse(input.toLowerCase()));
  } catch {
    return false;
  }
};

/**
 * Removes a start line terminator character from a string.
 *
 * @export
 * @param {string} str
 * @param {string} char
 * @returns {string}
 */
export const trimStart = (str: string, char: string): string => {
  let res = str;
  while (res.charAt(0) === char) {
    res = res.substring(1, res.length);
  }
  return res;
};

/**
 * Removes a leading and trailing line terminator character from a string.
 *
 * @export
 * @param {string} str
 * @param {string} char
 * @returns {string}
 */
export const trimEnd = (str: string, char: string): string => {
  let res = str;
  while (res.charAt(res.length - 1) === char) {
    res = res.substring(0, res.length - 1);
  }
  return res;
};

/**
 * Removes a stating, leading and trailing line terminator character from a string.
 *
 * @export
 * @param {string} str
 * @param {string} char
 * @returns {string}
 */
export const trim = (str: string, char: string): string => {
  let res = trimStart(str, char);
  res = trimEnd(res, char);
  return res;
};

/**
 * Clone an object or an array.
 *
 * @param {*} obj
 * @returns {*}
 */
export const clone = (obj: any) =>
  Array.isArray(obj) ? Array.from(obj) : { ...obj };

/**
 * Generate user token.
 *
 * @returns {string}
 */
export const generateToken = () => `${uuid()}-${Date.now()}`;

/**
 * Generate code
 *
 * @returns {string}
 */
export const generateCode = (digits: number) => {
  if (digits <= 0) {
    throw new Error("El número de dígitos debe ser mayor que 0");
  }

  // Calcular el rango mínimo y máximo para el número de n dígitos
  const min = 0;
  const max = Math.pow(10, digits) - 1;

  // Generar un número aleatorio dentro del rango [min, max]
  const numeroAleatorio = Math.floor(Math.random() * (max - min + 1)) + min;

  // Convertir el número a string y rellenar con ceros a la izquierda si es necesario
  const numeroString = numeroAleatorio.toString().padStart(digits, "0");

  return numeroString;
};

export const filterObj = (obj: any, ...allowedFields: string[]) => {
  const newObj = {} as any;
  Object.keys(obj).forEach((key) => {
    if (allowedFields.includes(key)) newObj[key] = obj[key];
  });
  return newObj;
};

// Types for the result object with discriminated union
type Success<T> = {
  data: T;
  error: null;
};

type Failure<E> = {
  data: null;
  error: E;
};

type Result<T, E = Error> = Success<T> | Failure<E>;

// Main wrapper function
export async function tryCatch<T, E = Error>(
  promise: Promise<T>,
): Promise<Result<T, E>> {
  try {
    const data = await promise;
    return { data, error: null };
  } catch (error) {
    return { data: null, error: error as E };
  }
}

export const isToday = (date: Date): boolean => {
  const today = new Date();

  // Comparamos año, mes y día
  return (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  );
};

export const startOfToday = () => {
  const now = new Date();
  now.setHours(0, 0, 0, 0); // Establece la hora al inicio del día
  return now;
};

// Función para obtener la fecha de mañana a las 00:00:00.000
export const startOfTomorrow = () => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1); // Avanza un día
  tomorrow.setHours(0, 0, 0, 0); // Establece la hora al inicio del día
  return tomorrow;
};

export const getOperationStatusName = (status: string) => {
  switch (status) {
    case "void":
      return "Pendiente";
    case "pending":
      return "Pendiente";
    case "approved":
      return "Aprobado";
    case "completed":
      return "Completado";
    case "rejected":
      return "Rechazado";
    default:
      return "Desconocido";
  }
};

export const getOperationPaymentStatusName = (status: string) => {
  switch (status) {
    case "void":
      return "Pendiente";
    case "pending-approval":
      return "Pendiente de aprobación";
    case "pending":
      return "Pendiente";
    case "paid":
      return "Pagado";
    case "overdue":
      return "Vencido";
    case "inArrears":
      return "En mora";
    case "rejected":
      return "Rechazado";
    default:
      return "Desconocido";
  }
};

export const getPaymentStatusName = (status: string) => {
  switch (status) {
    case "void":
      return "Pendiente";
    case "pending":
      return "Pendiente";
    case "confirmed":
      return "Confirmado";
    case "error":
      return "Error";
    default:
      return "Desconocido";
  }
};

export const getUserStatusName = (status: string) => {
  switch (status) {
    case "active":
      return "Activo";
    case "inactive":
      return "Inactivo";
    case "pending":
      return "Pendiente";
    case "deleted":
      return "Desafiliado";
    case "rejected":
      return "Rechazado";
    default:
      return "Desconocido";
  }
};

export const generarNumeroAleatorio14Digitos = (): number => {
  const numeroAleatorio = Math.random();

  const numeroGrande = numeroAleatorio * Math.pow(10, 14);

  const numeroEntero = Math.floor(numeroGrande);

  const numeroFinal =
    numeroEntero >= Math.pow(10, 13)
      ? numeroEntero
      : numeroEntero + Math.pow(10, 13);

  return numeroFinal;
};

export const getDaysDifference = (date1: Date, date2: Date): number => {
  // Asegurarse de que las fechas sean objetos Date válidos
  if (!(date1 instanceof Date) || isNaN(date1.getTime())) {
    throw new Error(
      "El primer argumento debe ser una instancia válida de Date.",
    );
  }
  if (!(date2 instanceof Date) || isNaN(date2.getTime())) {
    throw new Error(
      "El segundo argumento debe ser una instancia válida de Date.",
    );
  }

  date1.setHours(0, 0, 0, 0);
  date2.setHours(0, 0, 0, 0);

  // Calcular la diferencia en milisegundos.
  // Usamos Math.abs para asegurar un resultado positivo,
  // independientemente del orden de las fechas.
  const diffTime = Math.abs(date2.getTime() - date1.getTime());

  // Definir la cantidad de milisegundos en un día
  const millisecondsInOneDay = 1000 * 60 * 60 * 24;

  // Calcular la diferencia en días y redondear al entero más cercano
  // (o Math.floor si solo quieres días completos)
  const diffDays = Math.round(diffTime / millisecondsInOneDay);

  return diffDays;
};

export const padField = (
  value: any,
  length: number,
  type: string,
  align = "left",
) => {
  if (type === "N") {
    return Math.floor(value * 100)
      .toString()
      .padStart(length, "0");
  } else {
    return align === "left"
      ? value.toString().padEnd(length, " ")
      : value.toString().padStart(length, " ");
  }
};

export const padNumber = (value: number, length: number) => {
  return value.toString().padStart(length, "0");
};

export const formatCustomeDate = (date: Date) => {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const day = date.getDate().toString().padStart(2, "0");
  const hours = date.getHours().toString().padStart(2, "0");
  const minutes = date.getMinutes().toString().padStart(2, "0");
  const seconds = date.getSeconds().toString().padStart(2, "0");

  return `${year}${month}${day}${hours}${minutes}${seconds}`;
};

export const cleanText = (text: string) => {
  const normalizedText = text.normalize("NFD");
  return normalizedText
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9\s]/g, "");
};

export const getDatesInWeek = (startDate: Date) => {
  const dates: string[] = [];
  let currentDate = new Date(startDate);
  for (let i = 0; i < 7; i++) {
    dates.push(currentDate.toISOString().split("T")[0]);
    currentDate.setDate(currentDate.getDate() + 1);
  }
  return dates;
};
