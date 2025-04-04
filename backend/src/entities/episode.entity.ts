import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
} from "typeorm";
import { Season } from "./season.entity";

@Entity()
export class Episode {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  tmdbId: number;

  @Column()
  episodeNumber: number;

  @Column()
  name: string;

  @Column()
  overview: string;

  @Column()
  airDate: string;

  @Column()
  stillPath: string;

  @Column()
  imdbId: string;

  @ManyToOne(() => Season, (season) => season.episodes)
  season: typeof Season;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
