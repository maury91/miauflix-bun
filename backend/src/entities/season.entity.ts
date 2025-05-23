import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  type Relation,
  UpdateDateColumn,
} from 'typeorm';

import { Episode } from './episode.entity';
import { TVShow } from './tvshow.entity';

// ToDo: support translations ( priority low )
@Entity()
export class Season {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  tmdbId: number;

  @Column()
  tvShowId: number;

  @Column()
  seasonNumber: number;

  @Column()
  name: string;

  @Column()
  overview: string;

  @Column({
    nullable: true,
  })
  airDate?: string;

  @Column({
    nullable: true,
  })
  posterPath?: string;

  @Column({
    default: false,
  })
  synced: boolean = false;

  @OneToMany(() => Episode, episode => episode.season)
  episodes: Relation<Episode>[];

  @ManyToOne(() => TVShow, tvShow => tvShow.seasons)
  tvShow: Relation<TVShow>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
