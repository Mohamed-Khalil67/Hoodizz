import { CreateProductInput } from './create-product.input';
import { InputType, Field, PartialType } from '@nestjs/graphql';
import { IsUUID } from 'class-validator';

@InputType()
export class UpdateProductInput extends PartialType(CreateProductInput) {
  @Field(() => String)
  @IsUUID('4')
  id!: string;
}
