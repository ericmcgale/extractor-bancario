// No se necesita importar 'node-fetch' porque la versión de Node.js 18+ en Netlify
// ya incluye la función 'fetch' de forma nativa.

// Esta es la función principal que se ejecutará cuando sea llamada.
exports.handler = async (event) => {
  // --- Verificación de Seguridad y Método ---
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405, // Method Not Allowed
      body: JSON.stringify({ error: 'Método no permitido. Solo se aceptan solicitudes POST.' }),
    };
  }

  // --- Validación del Cuerpo de la Solicitud ---
  let body;
  try {
    if (!event.body) {
      throw new Error('El cuerpo de la solicitud está vacío.');
    }
    body = JSON.parse(event.body);
    if (!body.text || typeof body.pageNumber === 'undefined') {
      throw new Error('Faltan los parámetros "text" o "pageNumber" en el cuerpo de la solicitud.');
    }
  } catch (error) {
    console.error('Error al analizar el cuerpo de la solicitud:', error.message);
    return {
      statusCode: 400, // Bad Request
      body: JSON.stringify({ error: `Error en la solicitud: ${error.message}` }),
    };
  }
  
  // Si el texto está vacío, no se llama a la IA.
  if (body.text.trim().length === 0) {
    return {
      statusCode: 200,
      body: JSON.stringify([]), // Devuelve un array vacío.
    };
  }

  // --- Llamada a la API de Google AI ---
  const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
  const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${GOOGLE_API_KEY}`;

  const prompt = `
    Analiza el siguiente texto extraído de UNA SOLA PÁGINA de un extracto bancario.
    Identifica todas las transacciones financieras.
    Devuelve los datos como un array JSON de objetos. Cada objeto debe tener estas claves exactas: "date", "description", "debit", "credit", "balance".
    - "date": Fecha en formato 'YYYY-MM-DD'.
    - "description": Descripción completa.
    - "debit": Monto del cargo como string (ej: "85.40") o "".
    - "credit": Monto del abono como string (ej: "2100.00") o "".
    - "balance": Saldo después de la transacción como string.

    IMPORTANTE: Tu respuesta debe ser ÚNICAMENTE el array JSON. No incluyas texto extra, explicaciones ni \`\`\`. Si no hay transacciones, devuelve un array vacío [].

    Texto (Página ${body.pageNumber}):
    ---
    ${body.text}
  `;

  const payload = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      responseMimeType: "application/json",
    }
  };

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}));
      const detailedError = errorBody.error?.message || response.statusText;
      console.error(`Error de la API de Google (Página ${body.pageNumber}):`, detailedError);
      throw new Error(`Error de la API de Google: ${detailedError}`);
    }

    const result = await response.json();
    
    const rawText = result.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawText) {
        return { statusCode: 200, body: JSON.stringify([]) };
    }
    
    return {
      statusCode: 200,
      body: rawText,
    };

  } catch (error) {
    console.error(`Error al procesar la página ${body.pageNumber}:`, error);
    return {
      statusCode: 500, // Internal Server Error
      body: JSON.stringify({ error: `Error del servidor al procesar la página ${body.pageNumber}: ${error.message}` }),
    };
  }
};

