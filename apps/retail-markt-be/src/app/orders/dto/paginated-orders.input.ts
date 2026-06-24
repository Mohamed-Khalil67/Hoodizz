import { ArgsType, Field, Int } from '@nestjs/graphql';
import { IsInt, IsOptional, Max, Min } from 'class-validator';
import { PAGINATION_DEFAULTS } from '../../common/constants';

@ArgsType()
export class PaginationArgs {
  @Field(() => Int, { nullable: true, defaultValue: PAGINATION_DEFAULTS.TAKE })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(PAGINATION_DEFAULTS.MAX_TAKE)
  take: number = PAGINATION_DEFAULTS.TAKE;

  @Field(() => Int, { nullable: true, defaultValue: PAGINATION_DEFAULTS.SKIP })
  @IsOptional()
  @IsInt()
  @Min(0)
  skip: number = PAGINATION_DEFAULTS.SKIP;
}
