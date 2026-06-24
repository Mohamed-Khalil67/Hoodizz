import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';

describe('AppController (/health)', () => {
  let controller: AppController;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
    }).compile();
    controller = module.get(AppController);
  });

  it('returns ok status with uptime', () => {
    const result = controller.health();
    expect(result.status).toBe('ok');
    expect(typeof result.uptime).toBe('number');
    expect(result.uptime).toBeGreaterThanOrEqual(0);
  });
});
