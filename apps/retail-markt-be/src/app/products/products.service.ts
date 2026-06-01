import { Injectable } from '@nestjs/common';
import { CreateProductInput } from './dto/create-product.input';
import { UpdateProductInput } from './dto/update-product.input';
import { PrismaService } from '../prisma/prisma.service';
import { Product } from '@prisma/client';

type FindConfig = {
  featured?: boolean;
  category?: string;
};

@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService) {}

  create(createProductInput: CreateProductInput) {
    return this.prisma.product.create({ data: createProductInput });
  }

  findAll(config: FindConfig = {}) {
    return this.prisma.product.findMany({
      where: {
        ...(config.featured !== undefined ? { isFeatured: true } : {}),
        ...(config.category ? { category: config.category } : {}),
      },
    });
  }

  findOne(id: string) {
    return this.prisma.product.findFirst({ where: { id } });
  }

  async getCategories(): Promise<string[]> {
    const rows = await this.prisma.product.findMany({
      select: { category: true },
      distinct: ['category'],
      orderBy: { category: 'asc' },
    });
    return rows.map((r) => r.category);
  }

  async searchProducts(term: string): Promise<Product[]> {
    const lowercaseTerm = term.toLowerCase();
    return this.prisma.product.findMany({
      where: {
        OR: [
          { name:        { contains: lowercaseTerm, mode: 'insensitive' } },
          { description: { contains: lowercaseTerm, mode: 'insensitive' } },
          { category:    { contains: lowercaseTerm, mode: 'insensitive' } },
        ],
      },
    });
  }

  update(id: string, updateProductInput: UpdateProductInput) {
    const { id: _id, ...data } = updateProductInput;
    return this.prisma.product.update({ where: { id }, data });
  }

  remove(id: string) {
    return this.prisma.product.delete({ where: { id } });
  }
}
