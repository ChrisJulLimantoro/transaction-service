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
  async create(
    data: any,
    tx?: Prisma.TransactionClient,
    user_id?: string,
  ): Promise<T> {
    const prismaClient = tx ?? this.prisma;
    const created = await prismaClient[this.modelName].create({
      data,
      include: this.relations,
    });
    await this.actionLog(
      this.modelName,
      created.id,
      'CREATE',
      null,
      user_id,
      tx,
    );
    return created;
  }

  // Get all records with possible relations and filter criteria
  async findAll(
    filter?: Record<string, any>,
    page?: number,
    limit?: number,
    sort?: Record<string, 'asc' | 'desc'>,
    search?: string,
    tx?: Prisma.TransactionClient,
  ): Promise<{
    data: any[];
    total?: number;
    page?: number;
    totalPages?: number;
  }> {
    const prismaClient = tx ?? this.prisma;
    const fields = (await this.getModelFields()).filter(
      (field) =>
        !field.name.includes('id') &&
        !field.name.includes('_by') &&
        !field.name.includes('_link'),
    );
    const stringFields = fields.filter(
      (field) => field.type.toLowerCase() === 'string',
    );

    const searchConditions = search
      ? {
          OR: stringFields.map((field) => ({
            [field.name]: {
              contains: search,
              mode: 'insensitive',
            },
          })),
        }
      : {};

    // Prepare dynamic date filter (assumes the column is named 'date')
    let dateFilter = {};
    if (filter?.date?.start || filter?.date?.end) {
      const dateField = filter.date.field || 'date';
      const startDate = filter.date.start
        ? new Date(filter.date.start)
        : new Date(0);
      const endDate = filter.date.end ? new Date(filter.date.end) : new Date();

      dateFilter = {
        [dateField]: {
          gte: startDate,
          lte: endDate,
        },
      };
      // Remove the `date` key from filter so it doesn't get included again below
    }
    delete filter.date;

    const whereConditions = {
      AND: {
        ...(this.isSoftDelete
          ? { deleted_at: null }
          : { NOT: { deleted_at: null } }),
        ...searchConditions,
        ...filter,
        ...dateFilter,
      },
    };

    const orderBy = sort
      ? Object.entries(sort).map(([key, value]) => ({
          [key]: value,
        }))
      : undefined;

    if (!page || !limit || page === 0 || limit === 0) {
      const data = await prismaClient[this.modelName].findMany({
        where: whereConditions,
        include: this.relations,
      });
      return { data };
    }

    const total = await prismaClient[this.modelName].count({
      where: whereConditions,
    });

    const data = await prismaClient[this.modelName].findMany({
      where: whereConditions,
      include: this.relations,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: orderBy,
    });

    return {
      data,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  // Find a record by ID with possible relations and filter criteria
  async findOne(
    id: string,
    filter?: Record<string, any>,
    tx?: Prisma.TransactionClient,
  ): Promise<T | null> {
    const prismaClient = tx ?? this.prisma;
    const whereConditions: Record<string, any> = {
      ...(this.isSoftDelete ? { id, deleted_at: null } : { id }),
      ...filter,
    };

    return prismaClient[this.modelName].findUnique({
      where: whereConditions,
      include: this.relations,
    });
  }

  // Update a record with possible relations
  async update(
    id: string,
    data: any,
    tx?: Prisma.TransactionClient,
    user_id?: string,
  ): Promise<T> {
    const prismaClient = tx ?? this.prisma;
    const before = await prismaClient[this.modelName].findFirst({
      where: this.isSoftDelete ? { id, deleted_at: null } : { id },
    });
    data.updated_at = new Date();
    const updated = await prismaClient[this.modelName].update({
      where: this.isSoftDelete ? { id, deleted_at: null } : { id },
      data,
      include: this.relations,
    });
    const diff = this.getDiff(before, updated);
    await this.actionLog(this.modelName, id, 'UPDATE', diff, user_id, tx);
    return updated;
  }

  // Delete a record by ID
  async delete(
    id: string,
    tx?: Prisma.TransactionClient,
    user_id?: string,
  ): Promise<T> {
    const prismaClient = tx ?? this.prisma;
    await this.actionLog(this.modelName, id, 'DELETE', null, user_id, tx);
    if (this.isSoftDelete) {
      return prismaClient[this.modelName].update({
        where: { id },
        data: { deleted_at: new Date(), updated_at: new Date() },
        include: this.relations,
      });
    }
    return prismaClient[this.modelName].delete({
      where: { id },
      include: this.relations,
    });
  }

  // Restore a soft deleted record
  async restore(
    id: string,
    tx?: Prisma.TransactionClient,
    user_id?: string,
  ): Promise<T> {
    const prismaClient = tx ?? this.prisma;
    await this.actionLog(this.modelName, id, 'RESTORE', null, user_id, tx);
    return prismaClient[this.modelName].update({
      where: { id },
      data: { deleted_at: null, updated_at: new Date() },
    });
  }

  // Function for count
  async count(
    filter?: Record<string, any>,
    tx?: Prisma.TransactionClient,
  ): Promise<number> {
    const prismaClient = tx ?? this.prisma;
    return prismaClient[this.modelName].count({
      where: filter,
    });
  }

  async sync(data: any[], tx?: Prisma.TransactionClient) {
    const prismaClient = tx ?? this.prisma;
    return await Promise.all(
      data.map((d) =>
        prismaClient[this.modelName].upsert({
          where: { id: d.id },
          update: d,
          create: d,
        }),
      ),
    );
  }

  async getModelFields(): Promise<Record<string, string>[]> {
    const model = Prisma.dmmf.datamodel.models.find(
      (m) => m.name.toLowerCase() === this.modelName.toLowerCase(),
    );
    if (!model) throw new Error(`Model ${this.modelName} not found`);

    return model.fields.map((field) => ({
      name: field.name,
      type: field.isList ? `${field.type}[]` : field.type,
    }));
  }

  normalize(val: any): any {
    if (typeof val === 'string' && !isNaN(val as any)) {
      return Number(val);
    }
    return val;
  }

  // Add logging
  getDiff(
    before: Record<string, any>,
    after: Record<string, any>,
    excludeKeys: string[] = ['id', 'updated_at', 'created_at'],
  ) {
    const diff: Record<string, { from: any; to: any }> = {};
    for (const key in after) {
      if (excludeKeys.includes(key)) continue;

      const beforeValue = this.normalize(before[key]);
      const afterValue = this.normalize(after[key]);

      if (beforeValue != afterValue) {
        diff[key] = { from: beforeValue, to: afterValue };
      }
    }
    return diff;
  }

  async actionLog(
    resource: string,
    resource_id: string,
    event: string,
    diff: any,
    user_id: string,
    tx?: Prisma.TransactionClient,
  ) {
    const log = {
      resource,
      resource_id,
      event,
      diff: diff,
      user_id,
    };
    const prismaClient = tx ?? this.prisma;
    return prismaClient.actionLog.create({
      data: log,
    });
  }
}
