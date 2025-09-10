// Usamos la función 'fetch' nativa de Node.js 18+
exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Método no permitido.' }) };
  }

  let body;
  try {
    if (!event.body) throw new Error('El cuerpo de la solicitud está vacío.');
    body = JSON.parse(event.body);
    if (!body.text || typeof body.pageNumber === 'undefined') {
      throw new Error('Faltan los parámetros "text" o "pageNumber".');
    }
  } catch (error) {
    return { statusCode: 400, body: JSON.stringify({ error: `Error en la solicitud: ${error.message}` }) };
  }
  
  if (body.text.trim().length === 0) {
    return { statusCode: 200, body: JSON.stringify([]) }; // Devuelve un array vacío si no hay texto.
  }

  const { GOOGLE_API_KEY } = process.env;
  const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${GOOGLE_API_KEY}`;
  
  const prompt = `Analiza el texto de UNA PÁGINA de un extracto bancario. Extrae las transacciones como un array JSON de objetos con claves: "date", "description", "debit", "credit", "balance". Responde ÚNICAMENTE con el array JSON. Si no hay transacciones, devuelve []. Texto (Página ${body.pageNumber}):\n---\n${body.text}`;
  
  const payload = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { responseMimeType: "application/json" }
  };

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errBody = await response.json().catch(() => ({}));
      throw new Error(errBody.error?.message || `Error ${response.status}`);
    }

    const result = await response.json();
    const rawText = result.candidates?.[0]?.content?.parts?.[0]?.text;
    
    // Asegurarse de que siempre se devuelva un cuerpo válido.
    return { statusCode: 200, body: rawText || '[]' };

  } catch (error) {
    console.error(`Error al procesar la página ${body.pageNumber}:`, error);
    return { statusCode: 500, body: JSON.stringify({ error: `Error del servidor en página ${body.pageNumber}: ${error.message}` }) };
  }
};
