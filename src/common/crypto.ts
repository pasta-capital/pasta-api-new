import CryptoJS from "crypto-js";
import * as env from "../config/env.config";

const salt = CryptoJS.lib.WordArray.create([
  0x0, 0x1, 0x2, 0x1c, 0x1d, 0x1e, 0x3, 0x4, 0x5, 0xf, 0x20, 0x21, 0xad, 0xaf,
  0xa4,
]); // Salt como WordArray

function encryptBytes(
  clearData: CryptoJS.lib.WordArray,
  key: CryptoJS.lib.WordArray,
  iv: CryptoJS.lib.WordArray,
): CryptoJS.lib.WordArray {
  const encrypted = CryptoJS.AES.encrypt(clearData, key, {
    iv: iv,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7,
  });
  return CryptoJS.enc.Base64.parse(encrypted.toString()); // Retorna los bytes en formato WordArray
}

export function encrypt(data: string): string {
  const clearBytes = CryptoJS.enc.Utf16LE.parse(data); // Usa UTF16LE para coincidir con Encoding.Unicode de C#
  const key = CryptoJS.PBKDF2(env.ENCRYPTION_KEY, salt, {
    keySize: 256 / 32,
    iterations: 1000,
  }); // PBKDF2 para derivar la clave (ajusta las iteraciones si es necesario)
  const iv = CryptoJS.PBKDF2(env.ENCRYPTION_KEY, salt, {
    keySize: 128 / 32,
    iterations: 1000,
  }); // PBKDF2 para derivar el IV
  const encryptedData = encryptBytes(clearBytes, key, iv);
  return CryptoJS.enc.Base64.stringify(encryptedData);
}

export function decrypt(encryptedData: string): string {
  const key = CryptoJS.PBKDF2(env.ENCRYPTION_KEY, salt, {
    keySize: 256 / 32,
    iterations: 1000,
  });
  const iv = CryptoJS.PBKDF2(env.ENCRYPTION_KEY, salt, {
    keySize: 128 / 32,
    iterations: 1000,
  });
  const decrypted = CryptoJS.AES.decrypt(encryptedData, key, {
    iv: iv,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7,
  });
  return CryptoJS.enc.Utf16LE.stringify(decrypted);
}
