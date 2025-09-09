// --- Este es nuestro intermediario seguro (Función Serverless) ---
// NOTA: Se ha eliminado la dependencia 'node-fetch' ya que no es necesaria en el entorno de Netlify.

// Esta es la función principal que Netlify ejecutará
exports.handler = async function(event) {
  
  // 1. OBTENER LA CLAVE API SECRETA
  // La clave se guarda en las variables de entorno de Netlify, no en el código.
  const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;

  if (!GOOGLE_API_KEY) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'La clave API de Google no está configurada en el servidor.' })
    };
  }
  
  // 2. OBTENER EL TEXTO DEL PDF QUE ENVIÓ EL USUARIO
  let pageText;
  try {
    const body = JSON.parse(event.body);
    pageText = body.pageText;
    if (!pageText) throw new Error("No se recibió texto de la página.");
  } catch (error) {
    return {
      statusCode: 400, // Bad Request
      body: JSON.stringify({ error: 'Cuerpo de la solicitud inválido o ausente.' })
    };
  }

  // 3. CONSTRUIR EL PROMPT PARA LA IA (igual que antes)
  const prompt = `
      Analiza el siguiente texto extraído de UNA SOLA PÁGINA de un extracto bancario. El texto puede contener errores de OCR.
      Identifica todas las transacciones financieras en esta página.
      Devuelve los datos como un array JSON de objetos. Cada objeto debe tener estas claves exactas: "date", "description", "debit", "credit", "balance".
      - "date": La fecha de la transacción en formato 'YYYY-MM-DD'.
      - "description": La descripción completa de la transacción.
      - "debit": El monto del retiro o cargo como un string numérico (ej: "85.40"), o un string vacío "".
      - "credit": El monto del depósito o abono como un string numérico (ej: "2100.00"), o un string vacío "".
      - "balance": El saldo después de la transacción como un string numérico.

      IMPORTANTE: Tu respuesta debe ser ÚNICAMENTE el array JSON. No incluyas texto introductorio, explicaciones, la palabra "json" o comillas de bloque de código \`\`\`. Si no hay transacciones en este texto, devuelve un array vacío [].

      Texto de la página:
      ---
      ${pageText}
  `;

  const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${GOOGLE_API_KEY}`;
  const payload = {
      contents: [{ parts: [{ text: prompt }] }],
  };

  // 4. LLAMAR A LA IA DE GOOGLE DE FORMA SEGURA
  try {
    const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });

    const result = await response.json();

    if (!response.ok) {
        console.error("Error from Google API:", result);
        // Devolvemos el mismo código de estado que nos dio Google (ej. 429 para cuota)
        return {
            statusCode: response.status,
            body: JSON.stringify({ error: result.error?.message || 'Error al comunicarse con la API de Google.' })
        };
    }

    const candidate = result.candidates?.[0];
    let rawText = candidate?.content?.parts?.[0]?.text || '[]';

    // Limpiamos la respuesta de la IA para asegurar que sea un JSON válido
    let jsonString = rawText.trim();
    if (jsonString.startsWith("```json")) { jsonString = jsonString.slice(7, -3).trim(); }
    else if (jsonString.startsWith("```")) { jsonString = jsonString.slice(3, -3).trim(); }

    // 5. DEVOLVER EL RESULTADO AL USUARIO (al archivo index.html)
    return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: jsonString // Devolvemos el JSON limpio directamente
    };

  } catch (error) {
    console.error('Error en la función serverless:', error);
    return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Ocurrió un error interno en el servidor.' })
    };
  }
};
