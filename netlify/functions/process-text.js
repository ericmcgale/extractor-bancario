const fetch = require('node-fetch');

exports.handler = async function(event) {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    try {
        if (!event.body) {
            throw new Error('El cuerpo de la solicitud llegó vacío.');
        }

        const { text, page } = JSON.parse(event.body);
        const pageNumForLog = page ? ` (página ${page})` : '';
        const apiKey = process.env.GOOGLE_API_KEY;

        if (!apiKey) {
            throw new Error('La clave API de Google no está configurada en las variables de entorno de Netlify.');
        }
        if (!text) {
            throw new Error(`No se proporcionó texto para procesar${pageNumForLog}.`);
        }

        const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`;

        const prompt = `
            Analiza el siguiente texto extraído de UNA SOLA PÁGINA de un extracto bancario. El texto puede contener errores de OCR.
            Identifica todas las transacciones financieras en esta página.
            Devuelve los datos como un array JSON de objetos. Cada objeto debe tener estas claves exactas: "date", "description", "debit", "credit", "balance".
            - "date": La fecha de la transacción en formato 'YYYY-MM-DD'.
            - "description": La descripción completa de la transacción.
            - "debit": El monto del retiro o cargo como un string numérico (ej: "85.40"), o un string vacío "".
            - "credit": El monto del depósito o abono como un string numérico (ej: "2100.00"), o un string vacío "".
            - "balance": El saldo después de la transacción como un string numérico.

            IMPORTANTE: Tu respuesta debe ser ÚNICAMENTE el array JSON válido. No incluyas texto introductorio, explicaciones, la palabra "json" o comillas de bloque de código \`\`\`. Si no hay transacciones en este texto, devuelve un array vacío [].

            Texto de la página:
            ---
            ${text}
        `;

        const payload = {
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
                "responseMimeType": "application/json"
            }
        };
        
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errorBody = await response.json().catch(() => ({}));
            const detailedError = errorBody.error?.message || response.statusText;
            throw new Error(`La llamada a la API falló con estado ${response.status}${pageNumForLog}: ${detailedError}`);
        }

        const result = await response.json();
        
        if (!result.candidates || result.candidates.length === 0) {
            const blockReason = result.promptFeedback?.blockReason || 'desconocida';
            throw new Error(`La solicitud fue bloqueada por la API de Google${pageNumForLog}. Razón: ${blockReason}.`);
        }

        const candidate = result.candidates[0];
        const rawText = candidate?.content?.parts?.[0]?.text;

        if (!rawText) {
            return {
                statusCode: 200,
                body: JSON.stringify([]), 
            };
        }
        
        return {
            statusCode: 200,
            body: rawText, 
        };

    } catch (error) {
        console.error('Error en la función serverless:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: error.message }),
        };
    }
};

