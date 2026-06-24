import { InputType, Field, Float, Int } from '@nestjs/graphql';
import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  Length,
  Max,
  Min,
} from 'class-validator';

@InputType()
export class CreateProductInput {
  @Field()
  @IsString()
  @Length(2, 200)
  name!: string;

  @Field()
  @IsString()
  @Length(2, 2000)
  description!: string;

  @Field(() => Float)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @Max(1_000_000)
  price!: number;

  @Field(() => [String])
  @IsArray()
  @ArrayNotEmpty()
  @ArrayMaxSize(20)
  @IsUrl({}, { each: true })
  images!: string[];

  @Field()
  @IsString()
  @Length(2, 100)
  category!: string;

  @Field(() => [String])
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(30)
  @IsString({ each: true })
  sizes!: string[];

  @Field(() => [String])
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(30)
  @IsString({ each: true })
  colors!: string[];

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1_000_000)
  stock?: number;

  @Field(() => Boolean, { nullable: true })
  @IsOptional()
  @IsBoolean()
  isFeatured?: boolean;
}
