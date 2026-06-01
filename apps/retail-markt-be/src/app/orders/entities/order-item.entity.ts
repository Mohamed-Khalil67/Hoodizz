import { Field, Float, Int, ObjectType } from '@nestjs/graphql';
import { Product } from '../../products/entities/product.entity';

@ObjectType()
export class OrderItem {
  @Field(() => String)
  id!: string;

  @Field(() => Int)
  quantity!: number;

  @Field(() => Float)
  price!: number;

  @Field(() => String)
  size!: string;

  @Field(() => String)
  color!: string;

  @Field(() => Product)
  product!: Product;

  @Field(() => String)
  productId!: string;

  @Field(() => String)
  orderId!: string;
}
