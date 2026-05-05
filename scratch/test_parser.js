const MONTHS = {
  enero: 1, febrero: 2, marzo: 3, abril: 4, mayo: 5, junio: 6,
  julio: 7, agosto: 8, septiembre: 9, setiembre: 9, octubre: 10,
  noviembre: 11, diciembre: 12
};

function parseArgentineDate(day, monthText, hour, minute) {
  const month = MONTHS[monthText.toLowerCase()];
  if (!month) return null;
  const now = new Date();
  let year = now.getFullYear();
  const startDate = new Date(year, month - 1, day, hour, minute);
  
  if (startDate.getTime() < now.getTime() - 24 * 60 * 60 * 1000) {
    startDate.setFullYear(year + 1);
  }
  
  const endDate = new Date(startDate);
  endDate.setMinutes(endDate.getMinutes() + 30);
  return { startsAt: startDate.toISOString(), endsAt: endDate.toISOString() };
}

function parseMultiLineTelegramAgenda(input) {
  const lines = input.split('\n').map(l => l.trim()).filter(Boolean);
  if (lines.length === 0 || !lines[0].startsWith('#')) return null;

  const tag = lines[0].substring(1).toLowerCase();
  const eventType = (tag === 'llamado') ? 'llamado' : 'reunion';
  
  const data = {};
  lines.slice(1).forEach(line => {
    const [key, ...valueParts] = line.split(':');
    if (key && valueParts.length > 0) {
      data[key.trim().toLowerCase()] = valueParts.join(':').trim();
    }
  });

  if (!data.fecha || !data.hora || !data.persona) return null;

  // Parse Fecha: "15 mayo"
  const fechaMatch = data.fecha.match(/(\d{1,2})\s+([A-Za-záéíóúñ]+)/i);
  if (!fechaMatch) return null;
  const day = parseInt(fechaMatch[1]);
  const monthText = fechaMatch[2];

  // Parse Hora: "10:30"
  const horaMatch = data.hora.match(/(\d{1,2})(?::(\d{2}))?/);
  if (!horaMatch) return null;
  const hour = parseInt(horaMatch[1]);
  const minute = horaMatch[2] ? parseInt(horaMatch[2]) : 0;

  const parsedDate = parseArgentineDate(day, monthText, hour, minute);
  if (!parsedDate) return null;

  return {
    eventType,
    startsAt: parsedDate.startsAt,
    endsAt: parsedDate.endsAt,
    citizenName: data.persona,
    locality: data.lugar || null,
    location: data.lugar || (eventType === 'llamado' ? 'Llamada Telefónica' : null),
    reason: data.tema || input,
    detail: data.detalle || null,
    originalText: input
  };
}

// Tests
const testInput = `
#reunion
Fecha: 15 mayo
Hora: 10:30
Persona: Juan Perez
Tema: Alumbrado publico
Lugar: Plaza Central
Detalle: Algunos baches en la entrada
`;

console.log(JSON.stringify(parseMultiLineTelegramAgenda(testInput), null, 2));

const testLlamado = `
#llamado
Fecha: 20 mayo
Hora: 15:00
Persona: Maria Garcia
Tema: Consulta de tramite
`;

console.log(JSON.stringify(parseMultiLineTelegramAgenda(testLlamado), null, 2));
