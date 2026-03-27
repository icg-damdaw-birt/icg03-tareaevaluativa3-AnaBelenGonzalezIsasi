// __tests__/favorite.test.js

// 1. Definir el mock de Prisma
const mockPrisma = {
  movie: {
    findUnique: jest.fn(),
  },
  favorite: {
    findUnique: jest.fn(),
    create: jest.fn(),
    delete: jest.fn(),
  },
};

// 2. Mockear los módulos ANTES de cualquier import de la app
jest.mock('../lib/prisma', () => mockPrisma);
jest.mock('../middleware/authMiddleware', () => (req, res, next) => {
  req.user = { userId: 'user-123' };
  next();
});

// 3. Ahora importar el resto de módulos
const request = require('supertest');
const app = require('../server'); // Asegúrate de exportar tu app en server.js

describe('POST /api/movies/:id/favorite', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('debería añadir una película a favoritos si no lo es', async () => {
    const movieId = 'movie-456';
    mockPrisma.movie.findUnique.mockResolvedValue({ id: movieId }); // La película existe
    mockPrisma.favorite.findUnique.mockResolvedValue(null); // No es favorita aún
    mockPrisma.favorite.create.mockResolvedValue({}); // Simula la creación

    const response = await request(app).post(`/api/movies/${movieId}/favorite`);

    expect(response.status).toBe(201);
    expect(response.body.message).toBe('Película añadida a favoritos');
    expect(mockPrisma.favorite.create).toHaveBeenCalledWith({
      data: { userId: 'user-123', movieId },
    });
  });

  it('debería eliminar una película de favoritos si ya lo es', async () => {
    const movieId = 'movie-456';
    mockPrisma.movie.findUnique.mockResolvedValue({ id: movieId });
    mockPrisma.favorite.findUnique.mockResolvedValue({ id: 'fav-789', userId: 'user-123', movieId }); // Ya es favorita
    mockPrisma.favorite.delete.mockResolvedValue({});

    const response = await request(app).post(`/api/movies/${movieId}/favorite`);

    expect(response.status).toBe(200);
    expect(response.body.message).toBe('Película eliminada de favoritos');
    expect(mockPrisma.favorite.delete).toHaveBeenCalledWith({
      where: { id: 'fav-789' },
    });
  });

  it('debería devolver 404 si la película no existe', async () => {
    const movieId = 'non-existent-movie';
    mockPrisma.movie.findUnique.mockResolvedValue(null); // La película no existe

    const response = await request(app).post(`/api/movies/${movieId}/favorite`);

    expect(response.status).toBe(404);
    expect(response.body.message).toBe('Película no encontrada');
  });
});
