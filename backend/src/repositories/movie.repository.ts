import type { DataSource, Repository } from 'typeorm';
import { IsNull, Not } from 'typeorm';

import type { Genre } from '@entities/genre.entity';
import { Movie, MovieTranslation } from '@entities/movie.entity';
import { objectKeys } from '@utils/object.util';

export class MovieRepository {
  private readonly movieRepository: Repository<Movie>;
  private readonly movieTranslationRepository: Repository<MovieTranslation>;

  constructor(datasource: DataSource) {
    this.movieRepository = datasource.getRepository(Movie);
    this.movieTranslationRepository = datasource.getRepository(MovieTranslation);
  }

  async findByTMDBId(tmdbId: number): Promise<Movie | null> {
    return this.movieRepository.findOne({ where: { tmdbId } });
  }

  async create(movie: Partial<Movie>): Promise<Movie> {
    const newMovie = this.movieRepository.create(movie);
    const result = await this.movieRepository.upsert(newMovie, ['imdbId']);
    if (!result.identifiers.length) {
      throw new Error('Failed to create movie');
    }
    const id = result.identifiers[0].id;
    const updatedMovie = await this.movieRepository.findOneBy(
      movie.imdbId ? { imdbId: movie.imdbId } : movie.tmdbId ? { tmdbId: movie.tmdbId } : { id }
    );
    if (!updatedMovie) {
      console.log(
        {
          result,
          movie,
          where: movie.imdbId
            ? { imdbId: movie.imdbId }
            : movie.tmdbId
              ? { tmdbId: movie.tmdbId }
              : { id },
        },
        result
      );
      throw new Error('Failed to retrieve created movie');
    }
    return updatedMovie;
  }

  async addTranslation(movie: Movie, translation: Partial<MovieTranslation>) {
    if (!movie.id) {
      throw new Error('Movie ID is required to add a translation');
    }
    const newTranslation = this.movieTranslationRepository.create({
      ...translation,
      movie,
    });
    await this.movieTranslationRepository.upsert(newTranslation, ['movieId', 'language']);
  }

  async checkForChangesAndUpdate(
    movie: Movie,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    { genres: _, ...updatedMovie }: Partial<Movie>
  ): Promise<void> {
    const hasChanges = objectKeys(updatedMovie).some(key => {
      return movie[key] !== updatedMovie[key];
    });
    if (hasChanges) {
      await this.movieRepository.update(movie.id, updatedMovie);
    }
  }

  async updateGenres(movie: Movie, genres: Genre[]): Promise<void> {
    const updatedMovie = await this.movieRepository.findOneBy({
      id: movie.id,
    });
    if (!updatedMovie) {
      throw new Error('Movie not found');
    }
    updatedMovie.genres = genres;
    await this.movieRepository.save(updatedMovie);
  }

  /**
   * Find movies that haven't been searched for sources yet
   */
  async findMoviesWithoutSources(limit: number = 10): Promise<Movie[]> {
    return this.movieRepository.find({
      where: {
        sourceSearched: false,
        imdbId: Not(IsNull()), // Only search movies with IMDb ID
      },
      order: {
        popularity: 'DESC',
      },
      take: limit,
    });
  }

  /**
   * Mark a movie as having been searched for sources
   */
  async markSourceSearched(movieId: number): Promise<void> {
    await this.movieRepository.update(movieId, {
      sourceSearched: true,
    });
  }

  async saveMovie(movie: Movie): Promise<Movie> {
    return this.movieRepository.save(movie);
  }
}
