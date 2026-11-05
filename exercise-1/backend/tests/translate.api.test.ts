import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { readJson, rumboExpected, rumboInput, rumboTemplateFile, signToken, startTestApp, type TestApp } from './helpers';

let app: TestApp;

beforeEach(async () => {
  app = await startTestApp();
});

afterEach(async () => {
  await app.dataSource.destroy();
});

describe('POST /api/v1/endorse/translate', () => {
  it('matches the PDF output exactly, including key and array order', async () => {
    const response = await app.post(rumboInput());
    expect(response.statusCode).toBe(200);
    // Comparing serialized text, because toEqual ignores key order.
    expect(JSON.stringify(response.result)).toBe(JSON.stringify(rumboExpected()));
  });

  it('reports which template version and request produced the output', async () => {
    const { headers } = await app.post(rumboInput());
    expect(headers['x-template-version']).toBe('1');
    expect(headers['x-request-id']).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('applies template defaults that the client never sends', async () => {
    const { result } = await app.post(rumboInput());
    const { dynamicData } = (result as { eventEntity: { dynamicData: { etiqueta: string; value: unknown }[] } })
      .eventEntity;
    const value = (label: string) => dynamicData.find((item) => item.etiqueta === label)?.value;
    expect(value('EndososSimplesSACRumbo')).toBe('TES008');
    expect(value('TipoVigenciaEndoso')).toBe('');
  });

  it('returns 400 listing every field the template requires', async () => {
    const { fechaEfectiva: _fecha, usuario: _usuario, ...input } = rumboInput();
    const response = await app.post(input);
    expect(response.statusCode).toBe(400);
    expect(response.result).toMatchObject({ missingFields: ['usuario', 'fechaEfectiva'], invalidFields: [] });
  });

  it('returns 400 when a value has the wrong type', async () => {
    const response = await app.post({ ...rumboInput(), idEnvio: '5984', fechaCliente: 'tomorrow' });
    expect(response.statusCode).toBe(400);
    expect(response.result).toMatchObject({
      invalidFields: [
        { field: 'idEnvio', expected: 'number' },
        { field: 'fechaCliente', expected: 'date' },
      ],
    });
  });

  it.each([
    ['no selector', { policyNumber: '1' }],
    ['nested input', { producto: 'Rumbo', tipoEndoso: 'CambioFrecuencia', nested: { a: 1 } }],
  ])('returns 400 for %s', async (_name, payload) => {
    expect((await app.post(payload)).statusCode).toBe(400);
  });

  it.each([
    ['product', { producto: 'Desconocido' }],
    ['endorsement type', { tipoEndoso: 'Desconocido' }],
  ])('returns 404 for an unknown %s', async (_name, change) => {
    expect((await app.post({ ...rumboInput(), ...change })).statusCode).toBe(404);
  });

  it('returns 404 when the template is inactive', async () => {
    await app.dataSource.query('UPDATE endorsement_templates SET is_active = 0');
    expect((await app.post(rumboInput())).statusCode).toBe(404);
  });

  it('returns 422 without leaking details when a stored template is broken', async () => {
    await app.dataSource.query(`UPDATE endorsement_templates SET output_skeleton = '{"a":"{{broken|x}}"}'`);
    const response = await app.post(rumboInput());
    expect(response.statusCode).toBe(422);
    expect(JSON.stringify(response.result)).not.toContain('broken');
  });
});

describe('extensibility', () => {
  it('serves a new product from database rows alone', async () => {
    expect((await app.post({ producto: 'Nuevo', tipoEndoso: 'Alta' })).statusCode).toBe(404);

    await app.dataSource.query(
      `INSERT INTO endorsement_templates (product_code, endorsement_type, version, output_skeleton)
       VALUES ('Nuevo', 'Alta', 1, '{"cliente":"{{cliente|string}}","data":"{{$dynamicData}}","events":"{{$events}}"}')`,
    );
    await app.dataSource.query(
      `INSERT INTO template_fields (template_id, label, source_field, default_value, field_order)
       SELECT id, 'Segundo', NULL, 'fijo', 2 FROM endorsement_templates WHERE product_code = 'Nuevo'
       UNION ALL
       SELECT id, 'Primero', 'canal', 'Web', 1 FROM endorsement_templates WHERE product_code = 'Nuevo'`,
    );
    await app.dataSource.query(
      `INSERT INTO template_events (template_id, event_name, event_order)
       SELECT id, 'Crear', 1 FROM endorsement_templates WHERE product_code = 'Nuevo'`,
    );

    const response = await app.post({ producto: 'Nuevo', tipoEndoso: 'Alta', cliente: 'Ana' });
    expect(response.statusCode).toBe(200);
    expect(JSON.stringify(response.result)).toBe(
      JSON.stringify({
        cliente: 'Ana',
        data: [
          { etiqueta: 'Primero', value: 'Web' },
          { etiqueta: 'Segundo', value: 'fijo' },
        ],
        events: [{ description: 'Crear', orderEvent: 1 }],
      }),
    );
  });

  it('serves the second seeded template through the import path', async () => {
    await app.importer.import(readJson('templates/demo-cambio-direccion.json'));
    const response = await app.post({
      producto: 'DemoVida',
      tipoEndoso: 'CambioDireccion',
      policyNumber: '1',
      direccion: 'Av. Demo 123',
      fechaSolicitud: '2025-08-27',
    });
    expect(response.statusCode).toBe(200);
    expect(response.result).toMatchObject({
      eventEntity: { dynamicData: [{ value: 'Av. Demo 123' }, { etiqueta: 'CanalAtencion', value: 'Web' }, {}] },
    });
  });

  it('activates a newly imported version and keeps the old one', async () => {
    await app.importer.import({ ...rumboTemplateFile(), version: 2 });
    const { headers } = await app.post(rumboInput());
    expect(headers['x-template-version']).toBe('2');
    const rows = await app.dataSource.query('SELECT version, is_active FROM endorsement_templates ORDER BY version');
    expect(rows).toEqual([
      { version: 1, is_active: 0 },
      { version: 2, is_active: 1 },
    ]);
  });

  it('imports idempotently and refuses an invalid file', async () => {
    await expect(app.importer.import(rumboTemplateFile())).resolves.toBe('already-exists');
    await expect(
      app.importer.import({ ...rumboTemplateFile(), version: 3, outputSkeleton: { a: '{{bad|x}}' } }),
    ).rejects.toThrow('malformed placeholder');
  });
});

describe('database constraints', () => {
  const insertField = (values: string) =>
    app.dataSource.query(
      `INSERT INTO template_fields (template_id, label, source_field, default_value, field_order)
       SELECT id, ${values} FROM endorsement_templates LIMIT 1`,
    );

  it('rejects a field with neither source nor default', async () => {
    await expect(insertField(`'X', NULL, NULL, 99`)).rejects.toThrow(/ck_field_has_value_source/);
  });

  it('rejects duplicate order and duplicate label within a template', async () => {
    await expect(insertField(`'X', NULL, 'v', 1`)).rejects.toThrow(/UNIQUE/);
    await expect(insertField(`'ProductosVida', NULL, 'v', 99`)).rejects.toThrow(/UNIQUE/);
  });

  it('allows only one active version per product and endorsement type', async () => {
    await expect(
      app.dataSource.query(
        `INSERT INTO endorsement_templates (product_code, endorsement_type, version, output_skeleton)
         VALUES ('Rumbo', 'CambioFrecuencia', 2, '{}')`,
      ),
    ).rejects.toThrow(/UNIQUE/);
  });

  it('deletes fields and events together with their template', async () => {
    await app.dataSource.query('DELETE FROM endorsement_templates');
    const [{ fields }] = await app.dataSource.query('SELECT COUNT(*) AS fields FROM template_fields');
    const [{ events }] = await app.dataSource.query('SELECT COUNT(*) AS events FROM template_events');
    expect({ fields, events }).toEqual({ fields: 0, events: 0 });
  });
});

describe('security', () => {
  it('returns 401 without a token', async () => {
    expect((await app.post(rumboInput(), null)).statusCode).toBe(401);
  });

  it.each([
    ['a garbage token', () => 'not.a.token'],
    ['a wrong signature', () => signToken({ secret: 'another-secret-that-is-long-enough-to-sign' })],
    ['a wrong audience', () => signToken({ audience: 'someone-else' })],
    ['an expired token', () => signToken({ ttlSec: -60 })],
  ])('returns 401 for %s', async (_name, makeToken) => {
    expect((await app.post(rumboInput(), makeToken())).statusCode).toBe(401);
  });
});

describe('versioning and health', () => {
  it('does not serve the endpoint outside the versioned path', async () => {
    const response = await app.server.inject({
      method: 'POST',
      url: '/endorse/translate',
      payload: rumboInput(),
      headers: { authorization: `Bearer ${signToken()}` },
    });
    expect(response.statusCode).toBe(404);
  });

  it('exposes health without authentication', async () => {
    const response = await app.server.inject({ method: 'GET', url: '/health' });
    expect(response.statusCode).toBe(200);
    expect(response.result).toEqual({ status: 'ok' });
  });
});
