import { Test, TestingModule } from '@nestjs/testing';

import { ProductsService } from './products.service';
import { PrismaService } from '../prisma/prisma.service';
import { ProductNotFoundException } from '../common/exceptions';
import { PAGINATION_DEFAULTS } from '../common/constants';
import { UpdateProductInput } from './dto/update-product.input';

const makePrisma = () => ({
  product: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
});

describe('ProductsService', () => {
  let service: ProductsService;
  let prisma: ReturnType<typeof makePrisma>;

  beforeEach(async () => {
    prisma = makePrisma();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get(ProductsService);
  });

  describe('findAll', () => {
    it('uses pagination defaults when not provided', async () => {
      prisma.product.findMany.mockResolvedValue([]);

      await service.findAll();

      expect(prisma.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: PAGINATION_DEFAULTS.TAKE,
          skip: PAGINATION_DEFAULTS.SKIP,
        }),
      );
    });

    it('filters by featured flag', async () => {
      prisma.product.findMany.mockResolvedValue([]);

      await service.findAll({ featured: true });

      expect(prisma.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { isFeatured: true } }),
      );
    });

    it('filters by category', async () => {
      prisma.product.findMany.mockResolvedValue([]);

      await service.findAll({ category: 'hoodies' });

      expect(prisma.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { category: 'hoodies' } }),
      );
    });

    it('clamps to provided take/skip', async () => {
      prisma.product.findMany.mockResolvedValue([]);

      await service.findAll({ take: 5, skip: 10 });

      expect(prisma.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 5, skip: 10 }),
      );
    });
  });

  describe('findOne', () => {
    it('throws when product does not exist', async () => {
      prisma.product.findUnique.mockResolvedValue(null);

      await expect(service.findOne('missing')).rejects.toBeInstanceOf(
        ProductNotFoundException,
      );
    });

    it('returns the product when found', async () => {
      const product = { id: 'p1' };
      prisma.product.findUnique.mockResolvedValue(product);

      await expect(service.findOne('p1')).resolves.toBe(product);
    });
  });

  describe('searchProducts', () => {
    it('returns empty array for blank term', async () => {
      await expect(service.searchProducts('   ')).resolves.toEqual([]);
      expect(prisma.product.findMany).not.toHaveBeenCalled();
    });

    it('searches name/description/category case-insensitively', async () => {
      prisma.product.findMany.mockResolvedValue([{ id: 'p1' }]);

      await service.searchProducts('  hoodie  ');

      const call = prisma.product.findMany.mock.calls[0][0];
      expect(call.where.OR).toHaveLength(3);
      expect(call.where.OR[0].name.contains).toBe('hoodie');
      expect(call.where.OR[0].name.mode).toBe('insensitive');
    });
  });

  describe('update', () => {
    it('throws when product does not exist', async () => {
      prisma.product.findUnique.mockResolvedValue(null);

      await expect(
        service.update('p1', { id: 'p1', name: 'New' } as UpdateProductInput),
      ).rejects.toBeInstanceOf(ProductNotFoundException);
    });

    it('strips id from update payload', async () => {
      prisma.product.findUnique.mockResolvedValue({ id: 'p1' });
      prisma.product.update.mockResolvedValue({ id: 'p1' });

      await service.update('p1', { id: 'p1', name: 'New' } as UpdateProductInput);

      expect(prisma.product.update).toHaveBeenCalledWith({
        where: { id: 'p1' },
        data: { name: 'New' },
      });
    });
  });
});
