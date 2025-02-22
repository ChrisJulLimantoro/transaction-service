import { PrismaService } from '../prisma/prisma.service';
import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

@Injectable()
export class BaseRepository<T> {
  constructor(
    protected prisma: PrismaService,
    private modelName: string,
    protected relations: Record<string, any>,
    protected isSoftDelete = false,
  ) {}

  // Create a new record with possible relations
  async create(data: any): Promise<T> {
    return this.prisma[this.modelName].create({
      data,
      include: this.relations,
    });
  }

  // Get all records with possible relations and filter criteria
  async findAll(filter?: Record<string, any>): Promise<T[]> {
    const whereConditions: Record<string, any> = {
      ...(this.isSoftDelete ? { deleted_at: null } : {}),
      ...filter, // Add the provided filter conditions
    };

    return this.prisma[this.modelName].findMany({
      where: whereConditions, // Apply dynamic filter along with soft delete condition
      include: this.relations,
    });
  }

  // Find a record by ID with possible relations and filter criteria
  async findOne(id: string, filter?: Record<string, any>): Promise<T | null> {
    const whereConditions: Record<string, any> = {
      ...(this.isSoftDelete ? { id, deleted_at: null } : { id }),
      ...filter, // Add the provided filter conditions
    };

    return this.prisma[this.modelName].findUnique({
      where: whereConditions, // Apply dynamic filter along with soft delete condition
      include: this.relations,
    });
  }

  // Update a record with possible relations
  async update(id: string, data: any): Promise<T> {
    data.updated_at = new Date();
    return this.prisma[this.modelName].update({
      where: this.isSoftDelete ? { id, deleted_at: null } : { id },
      data,
      include: this.relations,
    });
  }

  // Delete a record by ID
  async delete(id: string): Promise<T> {
    if (this.isSoftDelete) {
      return this.prisma[this.modelName].update({
        where: { id },
        data: { deleted_at: new Date(), updated_at: new Date() },
      });
    }
    return this.prisma[this.modelName].delete({
      where: { id },
    });
  }

  // Restore a soft deleted record
  async restore(id: string): Promise<T> {
    return this.prisma[this.modelName].update({
      where: { id },
      data: { deleted_at: null, updated_at: new Date() },
    });
  }

  // function for count
  async count(filter?: Record<string, any>): Promise<number> {
    console.log(this.modelName, filter);
    return this.prisma[this.modelName].count({
      where: filter,
    });
  }
}
