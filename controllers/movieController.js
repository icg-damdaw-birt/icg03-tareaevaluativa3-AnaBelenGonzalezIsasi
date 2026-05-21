const prisma = require('../lib/prisma');

// CRUD para películas: cada operación está protegida por autenticación
// Solo se pueden ver/modificar las películas del usuario logueado

// GET /api/movies - Lista todas las películas del usuario actual
exports.getAllMovies = async (req, res) => {
  try {
    // req.user.userId viene del middleware de autenticación
    const movies = await prisma.movie.findMany({
      where: { ownerId: req.user.userId },  // Solo las del usuario actual
      orderBy: { createdAt: 'desc' },       // Más recientes primero
    });

    res.json(movies);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener las películas' });
  }
};

// GET /api/movies/:id - Obtiene una película específica
exports.getMovieById = async (req, res) => {
  const { id } = req.params;

  try {
    // Seguridad: solo puede ver sus propias películas
    const movie = await prisma.movie.findFirst({
      where: { id, ownerId: req.user.userId },
    });

    if (!movie) {
      return res.status(404).json({ error: 'Película no encontrada' });
    }

    res.json(movie);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener la película' });
  }
};

// POST /api/movies - Crea una nueva película
exports.createMovie = async (req, res) => {
  const { title, director, year, posterUrl } = req.body;
  const ownerId = req.user.userId;

  try {
    // Validación y parseo del año para asegurar que es un número o null
    const yearAsNumber = year ? parseInt(year, 10) : null;
    if (year && isNaN(yearAsNumber)) {
      return res.status(400).json({ error: 'El año debe ser un número válido.' });
    }

    // Crea la película y la asocia automáticamente al usuario logueado
    const movie = await prisma.movie.create({
      data: {
        title,
        director,
        year: yearAsNumber,
        posterUrl,
        ownerId, // Viene del token JWT
      },
    });

    res.status(201).json(movie);
  } catch (error) {
    res.status(500).json({ error: 'Error al crear la película' });
  }
};

// PUT /api/movies/:id - Actualiza una película existente
exports.updateMovie = async (req, res) => {
  const { id } = req.params;
  const { title, director, year, posterUrl } = req.body;

  try {
    // updateMany con where: solo actualiza si la película pertenece al usuario
    const movie = await prisma.movie.updateMany({
      where: { id, ownerId: req.user.userId },
      data: { title, director, year, posterUrl },
    });

    if (movie.count === 0) {
      return res.status(404).json({ error: 'Película no encontrada' });
    }

    const updatedMovie = await prisma.movie.findUnique({ where: { id } });

    res.json(updatedMovie);
  } catch (error) {
    res.status(400).json({ error: 'No se pudo actualizar la película' });
  }
};

// DELETE /api/movies/:id - Elimina una película
exports.deleteMovie = async (req, res) => {
  const { id } = req.params;

  try {
    // deleteMany con where: solo elimina si la película pertenece al usuario
    const movie = await prisma.movie.deleteMany({
      where: { id, ownerId: req.user.userId },
    });

    if (movie.count === 0) {
      return res.status(404).json({ error: 'Película no encontrada' });
    }

    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'No se pudo eliminar la película' });
  }
};

// --- AÑADIR ESTA NUEVA FUNCIÓN ---
exports.toggleFavorite = async (req, res) => {
  const { id } = req.params; // ID de la película
  const { userId } = req.user; // ID del usuario (del middleware de autenticación)

  try {
    // 1. Verificar si la película existe
    const movie = await prisma.movie.findUnique({ where: { id } });
    if (!movie) {
      return res.status(404).json({ message: 'Película no encontrada' });
    }

    // 2. Verificar si ya es un favorito
    const existingFavorite = await prisma.favorite.findUnique({
      where: {
        userId_movieId: {
          userId,
          movieId: id,
        },
      },
    });

    if (existingFavorite) {
      // Si ya existe, la eliminamos (desmarcar como favorita)
      await prisma.favorite.delete({
        where: {
          id: existingFavorite.id,
        },
      });
      res.status(200).json({ message: 'Película eliminada de favoritos' });
    } else {
      // Si no existe, la creamos (marcar como favorita)
      await prisma.favorite.create({
        data: {
          userId,
          movieId: id,
        },
      });
      res.status(201).json({ message: 'Película añadida a favoritos' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Error en el servidor', error: error.message });
  }
};

// PATCH /api/movies/:id/rating - Actualiza la puntuación de una película
exports.updateRating = async (req, res) => {
  const { id } = req.params;
  const { rating } = req.body;

  // 1. Validar el input
  if (typeof rating !== 'number' || rating < 0 || rating > 5) {
    return res.status(400).json({
      error: 'El rating debe ser un número entre 0 y 5.',
    });
  }

  try {
    // 2. Verificar que la película existe y pertenece al usuario
    const movie = await prisma.movie.findFirst({
      where: {
        id,
        ownerId: req.user.userId,
      },
    });

    if (!movie) {
      return res.status(404).json({ error: 'Película no encontrada' });
    }

    // 3. Actualizar la puntuación
    const updatedMovie = await prisma.movie.update({
      where: {
        id: movie.id, // Usar el id verificado
      },
      data: {
        rating,
      },
    });

    res.json(updatedMovie);
  } catch (error) {
    res.status(500).json({ error: 'Error al actualizar la puntuación' });
  }
};
