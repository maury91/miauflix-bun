import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { Season } from './season.entity';

@Entity()
export class Episode {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  tmdbId: number;

  @Column()
  seasonId: number;

  @Column()
  episodeNumber: number;

  @Column()
  name: string;

  @Column()
  overview: string;

  @Column({
    type: 'varchar',
    length: 50,
    nullable: true,
  })
  airDate: string | null;

  @Column()
  stillPath: string;

  @Column()
  imdbId: string;

  @ManyToOne(() => Season, season => season.episodes)
  season: typeof Season;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
