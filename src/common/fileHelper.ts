import axios from "axios";
import fs from "fs";

/**
 * Mapea un tipo MIME a su correspondiente extensión de archivo.
 * Puedes ampliar este mapeo en función de tus necesidades.
 * @param {string} mimeType - El tipo MIME.
 * @returns {string} La extensión correspondiente (sin el punto) o una cadena vacía.
 */
function getExtensionFromMime(mimeType: string): string {
  const map = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/gif": "gif",
    "image/webp": "webp",
    "image/bmp": "bmp",
  } as any;

  return map[mimeType] || "";
}

/**
 * Descarga una imagen desde una URL y la guarda en el servidor.
 * @param {string} url - La URL de la imagen.
 * @param {string} filepath - La ruta donde se guardará la imagen.
 */
export async function downloadImage(
  url: string,
  path: string,
): Promise<string | undefined> {
  if (!url || typeof url !== "string") {
    throw new Error("Invalid URL provided");
  }

  try {
    const response = await axios({
      url,
      method: "GET",
      responseType: "stream",
    });

    const contentType = response.headers["content-type"];
    const ext = getExtensionFromMime(contentType);
    if (!ext) {
      throw new Error(`Tipo MIME no soportado o no reconocido: ${contentType}`);
    }

    // Construimos el nombre final del archivo con la extensión.
    const finalFilename = `${path}.${ext}`;

    // Se espera hasta que el archivo sea completamente escrito.
    await new Promise((resolve, reject) => {
      response.data
        .pipe(fs.createWriteStream(finalFilename))
        .on("finish", resolve)
        .on("error", reject);
    });

    // Retornamos el nombre del archivo completo
    if (finalFilename.includes("\\")) return finalFilename.split("\\").pop();
    else return finalFilename.split("/").pop();
  } catch (error) {
    console.error("Error al descargar la imagen:", error);
    throw error;
  }
}
