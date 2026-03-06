const request = require('supertest');
const bcrypt = require('bcrypt');

// ─── Mock de la base de datos ANTES de importar la app ───────────────────────
jest.mock('../config/db', () => ({
    query: jest.fn()
}));

// ─── Variables de entorno para tests ────────────────────────────────────────
process.env.JWT_SECRET = 'test_secret';
process.env.JWT_REFRESH_SECRET = 'test_refresh_secret';
process.env.NODE_ENV = 'test';

const db = require('../config/db');
const app = require('../app'); // ← importamos la app completa (con helmet y errorHandler)

// ─── Helper: crear un hash de contraseña ────────────────────────────────────
const hashPassword = async (pass) => bcrypt.hash(pass, 10);

// ════════════════════════════════════════════════════════════════════════════
// POST /api/auth/login
// ════════════════════════════════════════════════════════════════════════════
describe('POST /api/auth/login', () => {

    beforeEach(() => jest.clearAllMocks());

    test('400 – faltan campos obligatorios', async () => {
        const res = await request(app).post('/api/auth/login').send({});
        expect(res.statusCode).toBe(400);
    });

    test('401 – usuario no encontrado', async () => {
        db.query.mockResolvedValueOnce({ rows: [] });

        const res = await request(app)
            .post('/api/auth/login')
            .send({ correo_usu: 'noexiste@test.com', password: '1234' });

        expect(res.statusCode).toBe(401);
        expect(res.body.error).toMatch(/credenciales incorrectas/i);
    });

    test('423 – cuenta bloqueada', async () => {
        const bloqueado_hasta = new Date(Date.now() + 10 * 60000);
        db.query.mockResolvedValueOnce({
            rows: [{ id_usu: 1, password_usu: 'hash', bloqueado_hasta, intentos_fallidos: 5 }]
        });

        const res = await request(app)
            .post('/api/auth/login')
            .send({ correo_usu: 'bloqueado@test.com', password: '1234' });

        expect(res.statusCode).toBe(423);
        expect(res.body.error).toMatch(/bloqueada/i);
    });

    test('401 – contraseña incorrecta (incrementa intentos)', async () => {
        const hash = await hashPassword('correcta');
        db.query
            .mockResolvedValueOnce({ rows: [{ id_usu: 1, password_usu: hash, bloqueado_hasta: null, intentos_fallidos: 0 }] })
            .mockResolvedValueOnce({ rows: [] });

        const res = await request(app)
            .post('/api/auth/login')
            .send({ correo_usu: 'user@test.com', password: 'incorrecta' });

        expect(res.statusCode).toBe(401);
        expect(res.body.error).toMatch(/intento 1 de 5/i);
    });

    test('423 – bloqueo al llegar a 5 intentos fallidos', async () => {
        const hash = await hashPassword('correcta');
        db.query
            .mockResolvedValueOnce({ rows: [{ id_usu: 1, password_usu: hash, bloqueado_hasta: null, intentos_fallidos: 4 }] })
            .mockResolvedValueOnce({ rows: [] });

        const res = await request(app)
            .post('/api/auth/login')
            .send({ correo_usu: 'user@test.com', password: 'incorrecta' });

        expect(res.statusCode).toBe(423);
        expect(res.body.error).toMatch(/bloqueada por demasiados intentos/i);
    });

    test('200 – login exitoso (móvil): devuelve token en body', async () => {
        const hash = await hashPassword('mipassword');
        db.query
            .mockResolvedValueOnce({ rows: [{ id_usu: 1, nom_usu: 'Ruben', correo_usu: 'r@test.com', rol_usu: 'cliente', password_usu: hash, bloqueado_hasta: null, intentos_fallidos: 0 }] })
            .mockResolvedValueOnce({ rows: [] });

        const res = await request(app)
            .post('/api/auth/login')
            .send({ correo_usu: 'r@test.com', password: 'mipassword' });

        expect(res.statusCode).toBe(200);
        expect(res.body).toHaveProperty('token');
        expect(res.body.usuario).toHaveProperty('id_usu', 1);
    });

    test('200 – login exitoso (web): devuelve cookie HttpOnly', async () => {
        const hash = await hashPassword('mipassword');
        db.query
            .mockResolvedValueOnce({ rows: [{ id_usu: 1, nom_usu: 'Ruben', correo_usu: 'r@test.com', rol_usu: 'cliente', password_usu: hash, bloqueado_hasta: null, intentos_fallidos: 0 }] })
            .mockResolvedValueOnce({ rows: [] });

        const res = await request(app)
            .post('/api/auth/login')
            .set('x-client-type', 'web')
            .send({ correo_usu: 'r@test.com', password: 'mipassword' });

        expect(res.statusCode).toBe(200);
        expect(res.body).not.toHaveProperty('token');
        expect(res.headers['set-cookie']).toBeDefined();
    });
});

// ════════════════════════════════════════════════════════════════════════════
// POST /api/auth/register
// ════════════════════════════════════════════════════════════════════════════
describe('POST /api/auth/register', () => {
    let adminToken;

    beforeAll(async () => {
        const jwt = require('jsonwebtoken');
        adminToken = jwt.sign(
            { id_usu: 99, correo_usu: 'admin@test.com', rol_usu: 'admin' },
            process.env.JWT_SECRET,
            { expiresIn: '10m' }
        );
    });

    beforeEach(() => jest.clearAllMocks());

    test('401 – sin token', async () => {
        const res = await request(app).post('/api/auth/register').send({ nom_usu: 'Test', correo_usu: 'a@a.com', password: '123456' });
        expect(res.statusCode).toBe(401);
    });

    test('400 – faltan campos obligatorios', async () => {
        const res = await request(app)
            .post('/api/auth/register')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ correo_usu: 'a@a.com' });

        expect(res.statusCode).toBe(400);
    });

    test('409 – correo ya registrado', async () => {
        db.query.mockResolvedValueOnce({ rows: [{ id_usu: 5 }] });

        const res = await request(app)
            .post('/api/auth/register')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ nom_usu: 'Test', correo_usu: 'existe@test.com', password: '123456' });

        expect(res.statusCode).toBe(409);
        expect(res.body.error).toMatch(/ya está registrado/i);
    });

    test('201 – registro exitoso', async () => {
        db.query
            .mockResolvedValueOnce({ rows: [] })
            .mockResolvedValueOnce({ rows: [{ id_usu: 10 }] });

        const res = await request(app)
            .post('/api/auth/register')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ nom_usu: 'Nuevo', correo_usu: 'nuevo@test.com', password: '123456' });

        expect(res.statusCode).toBe(201);
        expect(res.body).toHaveProperty('id_usu', 10);
    });
});

// ════════════════════════════════════════════════════════════════════════════
// POST /api/auth/logout
// ════════════════════════════════════════════════════════════════════════════
describe('POST /api/auth/logout', () => {

    test('401 – sin token', async () => {
        const res = await request(app).post('/api/auth/logout');
        expect(res.statusCode).toBe(401);
    });

    test('200 – logout exitoso', async () => {
        const jwt = require('jsonwebtoken');
        const token = jwt.sign({ id_usu: 1, correo_usu: 'r@test.com', rol_usu: 'cliente' }, process.env.JWT_SECRET, { expiresIn: '10m' });

        const res = await request(app)
            .post('/api/auth/logout')
            .set('Authorization', `Bearer ${token}`);

        expect(res.statusCode).toBe(200);
        expect(res.body.message).toMatch(/cerrada exitosamente/i);
    });
});

// ════════════════════════════════════════════════════════════════════════════
// GET /api/auth/users (solo admin)
// ════════════════════════════════════════════════════════════════════════════
describe('GET /api/auth/users', () => {

    beforeEach(() => jest.clearAllMocks());

    test('401 – sin token', async () => {
        const res = await request(app).get('/api/auth/users');
        expect(res.statusCode).toBe(401);
    });

    test('403 – token de cliente (no admin)', async () => {
        const jwt = require('jsonwebtoken');
        const clienteToken = jwt.sign({ id_usu: 2, rol_usu: 'cliente' }, process.env.JWT_SECRET, { expiresIn: '10m' });

        const res = await request(app)
            .get('/api/auth/users')
            .set('Authorization', `Bearer ${clienteToken}`);

        expect(res.statusCode).toBe(403);
    });

    test('200 – admin obtiene lista de usuarios', async () => {
        const jwt = require('jsonwebtoken');
        const adminToken = jwt.sign({ id_usu: 99, rol_usu: 'admin' }, process.env.JWT_SECRET, { expiresIn: '10m' });

        db.query
            .mockResolvedValueOnce({ rows: [{ id_usu: 1, nom_usu: 'Ruben', correo_usu: 'r@test.com' }] })
            .mockResolvedValueOnce({ rows: [{ count: '1' }] }); // countAll

        const res = await request(app)
            .get('/api/auth/users')
            .set('Authorization', `Bearer ${adminToken}`);

        expect(res.statusCode).toBe(200);
        expect(Array.isArray(res.body.data)).toBe(true);
        expect(res.body.pagination).toHaveProperty('total');
    });
});
