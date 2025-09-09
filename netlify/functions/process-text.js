// Importa la librería 'node-fetch' que Netlify instalará automáticamente.
const fetch = require('node-fetch');

// Esta es la función principal que se ejecutará cuando sea llamada.
// Es asíncrona porque necesita esperar la respuesta de la API de Google.
exports.handler = async (event) => {
  // --- Verificación de Seguridad y Método ---
  // Solo permite solicitudes de tipo POST para evitar que se acceda a la función de forma indebida.
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405, // Method Not Allowed
      body: JSON.stringify({ error: 'Método no permitido. Solo se aceptan solicitudes POST.' }),
    };
  }

  // --- Validación del Cuerpo de la Solicitud ---
  // Extrae y valida los datos enviados desde la página principal (index.html).
  let body;
  try {
    if (!event.body) {
      // Si no hay cuerpo en la solicitud, es un error.
      throw new Error('El cuerpo de la solicitud está vacío.');
    }
    body = JSON.parse(event.body);
    // Verifica que el texto de la página y el número de página estén presentes.
    if (!body.text || typeof body.pageNumber === 'undefined') {
      throw new Error('Faltan los parámetros "text" o "pageNumber" en el cuerpo de la solicitud.');
    }
  } catch (error) {
    // Si el cuerpo no es un JSON válido o faltan datos, devuelve un error claro.
    console.error('Error al analizar el cuerpo de la solicitud:', error.message);
    return {
      statusCode: 400, // Bad Request
      body: JSON.stringify({ error: `Error en la solicitud: ${error.message}` }),
    };
  }

  // Si el texto está vacío después de limpiarlo, no es necesario llamar a la IA.
  // Esto maneja elegantemente las páginas en blanco.
  if (body.text.trim().length === 0) {
    return {
      statusCode: 200,
      body: JSON.stringify([]), // Devuelve un array vacío, que significa "cero transacciones".
    };
  }

  // --- Llamada a la API de Google AI ---
  // Guarda la clave API secreta de las variables de entorno de Netlify.
  const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
  const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${GOOGLE_API_KEY}`;

  // El "prompt" o las instrucciones detalladas para la inteligencia artificial.
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

  // Prepara la solicitud para enviarla a Google.
  const payload = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      responseMimeType: "application/json", // Pide explícitamente una respuesta JSON.
    }
  };

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    // Si la respuesta de Google no es exitosa, genera un error.
    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}));
      const detailedError = errorBody.error?.message || response.statusText;
      console.error(`Error de la API de Google (Página ${body.pageNumber}):`, detailedError);
      throw new Error(`Error de la API de Google: ${detailedError}`);
    }

    const result = await response.json();
    
    // Extrae el texto de la respuesta de la IA.
    const rawText = result.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawText) {
        // Si no hay texto, asume que no hay transacciones en esta página.
        return { statusCode: 200, body: JSON.stringify([]) };
    }
    
    // Devuelve una respuesta exitosa con los datos procesados.
    return {
      statusCode: 200,
      body: rawText, // El texto ya debería ser un string JSON limpio.
    };

  } catch (error) {
    // Si ocurre cualquier otro error durante el proceso, lo registra y devuelve un error.
    console.error(`Error al procesar la página ${body.pageNumber}:`, error);
    return {
      statusCode: 500, // Internal Server Error
      body: JSON.stringify({ error: `Error del servidor al procesar la página ${body.pageNumber}: ${error.message}` }),
    };
  }
};// Importa la librería 'node-fetch' que Netlify instalará automáticamente.
const fetch = require('node-fetch');

// Esta es la función principal que se ejecutará cuando sea llamada.
// Es asíncrona porque necesita esperar la respuesta de la API de Google.
exports.handler = async (event) => {
  // --- Verificación de Seguridad y Método ---
  // Solo permite solicitudes de tipo POST para evitar que se acceda a la función de forma indebida.
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405, // Method Not Allowed
      body: JSON.stringify({ error: 'Método no permitido. Solo se aceptan solicitudes POST.' }),
    };
  }

  // --- Validación del Cuerpo de la Solicitud ---
  // Extrae y valida los datos enviados desde la página principal (index.html).
  let body;
  try {
    if (!event.body) {
      // Si no hay cuerpo en la solicitud, es un error.
      throw new Error('El cuerpo de la solicitud está vacío.');
    }
    body = JSON.parse(event.body);
    // Verifica que el texto de la página y el número de página estén presentes.
    if (!body.text || typeof body.pageNumber === 'undefined') {
      throw new Error('Faltan los parámetros "text" o "pageNumber" en el cuerpo de la solicitud.');
    }
  } catch (error) {
    // Si el cuerpo no es un JSON válido o faltan datos, devuelve un error claro.
    console.error('Error al analizar el cuerpo de la solicitud:', error.message);
    return {
      statusCode: 400, // Bad Request
      body: JSON.stringify({ error: `Error en la solicitud: ${error.message}` }),
    };
  }

  // Si el texto está vacío después de limpiarlo, no es necesario llamar a la IA.
  // Esto maneja elegantemente las páginas en blanco.
  if (body.text.trim().length === 0) {
    return {
      statusCode: 200,
      body: JSON.stringify([]), // Devuelve un array vacío, que significa "cero transacciones".
    };
  }

  // --- Llamada a la API de Google AI ---
  // Guarda la clave API secreta de las variables de entorno de Netlify.
  const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
  const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${GOOGLE_API_KEY}`;

  // El "prompt" o las instrucciones detalladas para la inteligencia artificial.
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

  // Prepara la solicitud para enviarla a Google.
  const payload = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      responseMimeType: "application/json", // Pide explícitamente una respuesta JSON.
    }
  };

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    // Si la respuesta de Google no es exitosa, genera un error.
    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}));
      const detailedError = errorBody.error?.message || response.statusText;
      console.error(`Error de la API de Google (Página ${body.pageNumber}):`, detailedError);
      throw new Error(`Error de la API de Google: ${detailedError}`);
    }

    const result = await response.json();
    
    // Extrae el texto de la respuesta de la IA.
    const rawText = result.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawText) {
        // Si no hay texto, asume que no hay transacciones en esta página.
        return { statusCode: 200, body: JSON.stringify([]) };
    }
    
    // Devuelve una respuesta exitosa con los datos procesados.
    return {
      statusCode: 200,
      body: rawText, // El texto ya debería ser un string JSON limpio.
    };

  } catch (error) {
    // Si ocurre cualquier otro error durante el proceso, lo registra y devuelve un error.
    console.error(`Error al procesar la página ${body.pageNumber}:`, error);
    return {
      statusCode: 500, // Internal Server Error
      body: JSON.stringify({ error: `Error del servidor al procesar la página ${body.pageNumber}: ${error.message}` }),
    };
  }
};
