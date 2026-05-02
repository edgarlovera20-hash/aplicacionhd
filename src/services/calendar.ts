import jwt from 'jsonwebtoken';

export async function createCalendarEvent(expense: any) {
  const email = process.env.GOOGLE_CLIENT_EMAIL;
  const key = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (!email || !key) {
    console.log('[Calendar] Credenciales de Google no configuradas. Saltando integración.');
    return;
  }

  try {
    const token = jwt.sign(
      {
        iss: email,
        scope: 'https://www.googleapis.com/auth/calendar.events',
        aud: 'https://oauth2.googleapis.com/token',
        exp: Math.floor(Date.now() / 1000) + 3600,
        iat: Math.floor(Date.now() / 1000)
      },
      key,
      { algorithm: 'RS256' }
    );

    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion: token
      })
    });

    if (!tokenRes.ok) {
      console.error('[Calendar] Error obteniendo access_token:', await tokenRes.text());
      return;
    }

    const { access_token } = await tokenRes.json();

    const recurrence = expense.tipo === 'recurrente' && expense.diaPago
      ? [`RRULE:FREQ=MONTHLY;BYMONTHDAY=${expense.diaPago}`]
      : undefined;

    const event = {
      summary: `Pago: ${expense.concepto}`,
      description: `Monto: $${expense.monto}\nCategoría: ${expense.categoria}\nNotas: ${expense.notas || 'N/A'}`,
      start: {
        date: expense.fecha,
        timeZone: 'America/Mexico_City'
      },
      end: {
        date: expense.fecha,
        timeZone: 'America/Mexico_City'
      },
      recurrence,
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'email', minutes: 24 * 60 },
          { method: 'popup', minutes: 10 }
        ]
      }
    };

    const calendarId = process.env.GOOGLE_CALENDAR_ID || 'primary';
    const evRes = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${access_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(event)
    });

    if (!evRes.ok) {
      console.error('[Calendar] Error creando evento:', await evRes.text());
    } else {
      console.log(`[Calendar] Evento creado para gasto ${expense.id}`);
    }
  } catch (err: any) {
    console.error('[Calendar] Error general en createCalendarEvent:', err.message);
  }
}
