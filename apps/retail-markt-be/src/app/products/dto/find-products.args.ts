import { ArgsType, Field } from '@nestjs/graphql';
import { IsBoolean, IsOptional, IsString, Length } from 'class-validator';
import { PaginationArgs } from '../../orders/dto/paginated-orders.input';

@ArgsType()
export class FindProductsArgs extends PaginationArgs {
  @Field(() => Boolean, { nullable: true })
  @IsOptional()
  @IsBoolean()
  featured?: boolean;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  @Length(1, 100)
  category?: string;
}

@ArgsType()
export class SearchProductsArgs extends PaginationArgs {
  @Field(() => String)
  @IsString()
  @Length(1, 200)
  term!: string;
}
