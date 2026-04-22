import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { Repository } from 'typeorm';

import { CityEntity } from '../../database/entities/city.entity';

@Injectable()
export class GeoService {
  constructor(
    @InjectRepository(CityEntity)
    private readonly cityRepo: Repository<CityEntity>,
  ) {}

  async detectCity(lat: number, lng: number): Promise<CityEntity | null> {
    // Find the nearest active city whose center is within 80km of the user
    const result = await this.cityRepo
      .createQueryBuilder('c')
      .addSelect(
        `ST_Distance(c.center::geography, ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography)`,
        'distanceMeters',
      )
      .where('c.isActive = true')
      .setParameter('lat', lat)
      .setParameter('lng', lng)
      .orderBy('distanceMeters', 'ASC')
      .limit(1)
      .getRawAndEntities();

    const city = result.entities[0];
    const distanceMeters = parseFloat(result.raw[0]?.distanceMeters ?? '99999999');

    // If the nearest city is more than 80km away, the user is outside any service area
    if (!city || distanceMeters > 80000) return null;

    return city;
  }

  async getAllActive(): Promise<CityEntity[]> {
    return this.cityRepo.find({ where: { isActive: true }, order: { name: 'ASC' } });
  }

  async getCityBySlug(slug: string): Promise<CityEntity | null> {
    return this.cityRepo.findOne({ where: { slug, isActive: true } });
  }
}
