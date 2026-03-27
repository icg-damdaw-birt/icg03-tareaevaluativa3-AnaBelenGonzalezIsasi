// __tests__/rating.test.js

const mockPrisma = {
  movie: {
    findFirst: jest.fn(),
    update: jest.fn(),
  },
};

jest.mock('../lib/prisma', () => mockPrisma);
jest.mock('../middleware/authMiddleware', () => (req, res, next) => {
  req.user = { userId: 'user-123' };
  next();
});

const request = require('supertest');
const app = require('../server');

describe('PATCH /api/movies/:id/rating', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('debería actualizar el rating y devolver la película actualizada', async () => {
    const movieId = 'movie-456';
    const movieData = { id: movieId, ownerId: 'user-123', rating: 0 };
    const updatedMovieData = { ...movieData, rating: 4 };

    mockPrisma.movie.findFirst.mockResolvedValue(movieData);
    mockPrisma.movie.update.mockResolvedValue(updatedMovieData);

    const response = await request(app)
      .patch(`/api/movies/${movieId}/rating`)
      .send({ rating: 4 });

    expect(response.status).toBe(200);
    expect(response.body).toEqual(updatedMovieData);
    expect(mockPrisma.movie.findFirst).toHaveBeenCalledWith({
      where: { id: movieId, ownerId: 'user-123' },
    });
    expect(mockPrisma.movie.update).toHaveBeenCalledWith({
      where: { id: movieId },
      data: { rating: 4 },
    });
  });

  it('debería devolver 404 si la película no se encuentra', async () => {
    const movieId = 'non-existent-movie';
    mockPrisma.movie.findFirst.mockResolvedValue(null);

    const response = await request(app)
      .patch(`/api/movies/${movieId}/rating`)
      .send({ rating: 5 });

    expect(response.status).toBe(404);
    expect(response.body.error).toBe('Película no encontrada');
  });

  it('debería devolver 400 si el rating es inválido (mayor que 5)', async () => {
    const movieId = 'movie-456';
    const response = await request(app)
      .patch(`/api/movies/${movieId}/rating`)
      .send({ rating: 6 });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('El rating debe ser un número entre 0 y 5.');
  });

  it('debería devolver 400 si el rating es inválido (negativo)', async () => {
    const movieId = 'movie-456';
    const response = await request(app)
      .patch(`/api/movies/${movieId}/rating`)
      .send({ rating: -1 });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('El rating debe ser un número entre 0 y 5.');
  });

  it('debería devolver 400 si el rating no es un número', async () => {
    const movieId = 'movie-456';
    const response = await request(app)
      .patch(`/api/movies/${movieId}/rating`)
      .send({ rating: 'un-string' });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('El rating debe ser un número entre 0 y 5.');
  });

  it('debería devolver 400 si no se envía el rating', async () => {
    const movieId = 'movie-456';
    const response = await request(app)
      .patch(`/api/movies/${movieId}/rating`)
      .send({});

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('El rating debe ser un número entre 0 y 5.');
  });
});
