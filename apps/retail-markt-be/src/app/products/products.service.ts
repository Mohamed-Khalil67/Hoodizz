import { Injectable } from '@nestjs/common';
import { Product } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductInput } from './dto/create-product.input';
import { UpdateProductInput } from './dto/update-product.input';
import { ProductNotFoundException } from '../common/exceptions';
import { PAGINATION_DEFAULTS } from '../common/constants';

export interface FindProductsArgs {
  featured?: boolean;
  category?: string;
  take?: number;
  skip?: number;
}

@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService) {}

  create(input: CreateProductInput) {
    return this.prisma.product.create({ data: input });
  }

  findAll(args: FindProductsArgs = {}) {
    return this.prisma.product.findMany({
      where: {
        ...(args.featured !== undefined ? { isFeatured: args.featured } : {}),
        ...(args.category ? { category: args.category } : {}),
      },
      take: args.take ?? PAGINATION_DEFAULTS.TAKE,
      skip: args.skip ?? PAGINATION_DEFAULTS.SKIP,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const product = await this.prisma.product.findUnique({ where: { id } });
    if (!product) throw new ProductNotFoundException(id);
    return product;
  }

  async getCategories(): Promise<string[]> {
    const rows = await this.prisma.product.findMany({
      select: { category: true },
      distinct: ['category'],
      orderBy: { category: 'asc' },
    });
    return rows.map((r) => r.category);
  }

  async searchProducts(
    term: string,
    args?: { take?: number; skip?: number },
  ): Promise<Product[]> {
    const trimmed = term.trim();
    if (!trimmed) return [];

    return this.prisma.product.findMany({
      where: {
        OR: [
          { name: { contains: trimmed, mode: 'insensitive' } },
          { description: { contains: trimmed, mode: 'insensitive' } },
          { category: { contains: trimmed, mode: 'insensitive' } },
        ],
      },
      take: args?.take ?? PAGINATION_DEFAULTS.TAKE,
      skip: args?.skip ?? PAGINATION_DEFAULTS.SKIP,
      orderBy: { createdAt: 'desc' },
    });
  }

  async update(id: string, input: UpdateProductInput) {
    await this.findOne(id);
    const { id: _ignored, ...data } = input;
    return this.prisma.product.update({ where: { id }, data });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.product.delete({ where: { id } });
  }
}
