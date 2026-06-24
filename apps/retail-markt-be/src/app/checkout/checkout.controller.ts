import {
  Body,
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Post,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';

import { CheckoutService } from './checkout.service';
import { CreateCheckoutDto } from './dto/create-checkout.dto';
import { FirebaseService } from '../firebase/firebase.service';
import { AUTH, RATE_LIMIT } from '../common/constants';

@Controller('checkout')
export class CheckoutController {
  constructor(
    private readonly checkoutService: CheckoutService,
    private readonly firebase: FirebaseService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Throttle({
    default: {
      ttl: RATE_LIMIT.CHECKOUT_TTL_MS,
      limit: RATE_LIMIT.CHECKOUT_LIMIT,
    },
  })
  async create(
    @Body() dto: CreateCheckoutDto,
    @Headers('authorization') authHeader?: string,
  ) {
    const token =
      authHeader && authHeader.startsWith(AUTH.BEARER_PREFIX)
        ? authHeader.slice(AUTH.BEARER_PREFIX.length).trim()
        : '';

    const userId = token
      ? await this.firebase.verifyToken(token)
      : undefined;

    const session = await this.checkoutService.create(dto, userId);

    return {
      url: session.url,
      sessionId: session.sessionId,
      orderId: session.orderId,
    };
  }
}
