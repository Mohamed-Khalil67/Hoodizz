import { InputType, Int, Field, Float } from '@nestjs/graphql';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsInt,
  IsNumber,
  IsString,
  IsUUID,
  Length,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

@InputType()
export class OrderItemInput {
  @Field(() => String)
  @IsUUID('4')
  productId!: string;

  @Field(() => Int)
  @IsInt()
  @Min(1)
  @Max(1000)
  quantity!: number;

  @Field(() => Float)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  price!: number;

  @Field(() => String)
  @IsString()
  @Length(1, 20)
  size!: string;

  @Field(() => String)
  @IsString()
  @Length(1, 50)
  color!: string;
}

@InputType()
export class CreateOrderInput {
  @Field(() => [OrderItemInput])
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => OrderItemInput)
  items!: OrderItemInput[];

  @Field(() => Float)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  totalAmount!: number;
}

export interface CreateOrderServiceDto {
  items: OrderItemInput[];
  totalAmount: number;
  userId?: string;
}
