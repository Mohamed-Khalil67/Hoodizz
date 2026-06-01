import { InputType, Field, Float, Int } from '@nestjs/graphql';

@InputType()
export class CreateProductInput {
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

  @Field(() => Int, { nullable: true })
  stock?: number;

  @Field(() => Boolean, { nullable: true })
  isFeatured?: boolean;
}
