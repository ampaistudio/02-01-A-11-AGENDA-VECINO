const fetch = require('node-fetch');

async function testWebhook() {
  const url = 'http://localhost:3000/api/telegram/webhook';
  const secret = 'REPLACE_WITH_YOUR_WEBHOOK_SECRET'; // Needs to match TELEGRAM_WEBHOOK_SECRET
  
  const payload = {
    message: {
      message_id: 12345,
      chat: { id: 123456789 },
      from: { id: 123456789, username: 'testuser' },
      text: `#reunion
Fecha: 15 mayo
Hora: 10:30
Persona: Juan Perez
Tema: Alumbrado publico
Lugar: Plaza Central
Detalle: Algunos baches en la entrada`
    }
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-telegram-bot-api-secret-token': secret
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    console.log('Status:', response.status);
    console.log('Response:', data);
  } catch (error) {
    console.error('Error:', error.message);
  }
}

// testWebhook();
console.log('Este script requiere que el servidor esté corriendo en localhost:3000 y el secreto correcto.');
