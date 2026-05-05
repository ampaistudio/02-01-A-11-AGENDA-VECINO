import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseTelegramAgendaMessage } from './telegram-parser';

test('telegram parser handles multi-line format correctly', () => {
  const input = `#reunion
Fecha: 15 mayo
Hora: 10:30
Persona: Juan Perez
Tema: Alumbrado publico
Lugar: Plaza Central
Detalle: Algunos baches en la entrada`;

  const result = parseTelegramAgendaMessage(input);
  assert.ok(result);
  assert.equal(result.eventType, 'reunion');
  assert.equal(result.citizenName, 'Juan Perez');
  assert.equal(result.reason, 'Alumbrado publico');
  assert.equal(result.detail, 'Algunos baches en la entrada');
  assert.equal(result.location, 'Plaza Central');
});

test('telegram parser handles legacy single-line format', () => {
  const input = '#reunion 15 mayo 10:30 Juan Perez Lugar Plaza Central';
  const result = parseTelegramAgendaMessage(input);
  assert.ok(result);
  assert.equal(result.eventType, 'reunion');
  assert.equal(result.citizenName, 'Juan Perez');
  assert.equal(result.location, 'Plaza Central');
});

test('telegram parser handles llamado format correctly', () => {
  const input = `#llamado
Fecha: 20 mayo
Hora: 15:00
Persona: Maria Garcia
Tema: Consulta de tramite`;

  const result = parseTelegramAgendaMessage(input);
  assert.ok(result);
  assert.equal(result.eventType, 'llamado');
  assert.equal(result.citizenName, 'Maria Garcia');
  assert.equal(result.location, 'Llamado telefónico');
});
