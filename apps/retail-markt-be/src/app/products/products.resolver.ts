import { Args, Query, Resolver } from '@nestjs/graphql';
import { Throttle } from '@nestjs/throttler';

import { ProductsService } from './products.service';
import { Product } from './entities/product.entity';
import { FindProductsArgs, SearchProductsArgs } from './dto/find-products.args';
import { RATE_LIMIT } from '../common/constants';

/**
 * Catalog reads only. Product create/update/delete are admin operations and
 * intentionally not exposed via GraphQL yet — once the admin module exists,
 * they should be re-introduced behind a `@Roles('admin')` guard. Until then,
 * use `npx prisma db seed` or direct DB writes for catalog management.
 */
@Resolver(() => Product)
export class ProductsResolver {
  constructor(private readonly productsService: ProductsService) {}

  @Query(() => [Product], { name: 'products' })
  findAll(@Args() args: FindProductsArgs) {
    return this.productsService.findAll(args);
  }

  @Query(() => Product, { name: 'product' })
  findOne(@Args('id', { type: () => String }) id: string) {
    return this.productsService.findOne(id);
  }

  @Query(() => [String], { name: 'categories' })
  getCategories() {
    return this.productsService.getCategories();
  }

  @Throttle({
    default: {
      ttl: RATE_LIMIT.SEARCH_TTL_MS,
      limit: RATE_LIMIT.SEARCH_LIMIT,
    },
  })
  @Query(() => [Product], { name: 'searchProducts' })
  searchProducts(@Args() args: SearchProductsArgs) {
    return this.productsService.searchProducts(args.term, {
      take: args.take,
      skip: args.skip,
    });
  }
}
