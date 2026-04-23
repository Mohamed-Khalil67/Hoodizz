import { Controller, Post, Body, HttpException, Headers } from '@nestjs/common';
import { CheckoutService } from './checkout.service';
import { CreateCheckoutDto } from './dto/create-checkout.dto';
import { first } from 'rxjs';

@Controller('checkout')
export class CheckoutController {
  constructor(private readonly checkoutService: CheckoutService) {}

  @Post()
  async create(
    @Body() createCheckoutDto: CreateCheckoutDto,
    @Headers('authorization') authHeader: string,
  ) {
    const token = authHeader ? authHeader.substring(7) : '';
    console.log({ token });
    const session = await this.checkoutService.create(createCheckoutDto, token);
    if (!session.url) {
      throw new HttpException('Failed to create checkout session', 400);
    }
    return {
      url: session.url,
    };
  }
}
