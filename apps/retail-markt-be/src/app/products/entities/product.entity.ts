import { ObjectType, Field, Float, Int } from '@nestjs/graphql';

@ObjectType()
export class Product {
  @Field(() => String)
  id!: string;

  @Field()
  name!: string;

  @Field()
  description!: string;

  @Field(() => Float)
  price!: number;

  @Field(() => [String])
  images!: string[];

  @Field()
  category!: string;

  @Field(() => [String])
  sizes!: string[];

  @Field(() => [String])
  colors!: string[];

  @Field(() => Int)
  stock!: number;

  @Field(() => Boolean)
  isFeatured!: boolean;

  @Field()
  createdAt!: Date;

  @Field()
  updatedAt!: Date;
}
