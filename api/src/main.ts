import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.use(cookieParser());

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // bo cac truong khong khai bao trong DTO
      forbidNonWhitelisted: true, // gui thua truong -> bao loi 400
      transform: true,
    }),
  );

  // Frontend chay o cong khac -> phai cho phep, va bat credentials
  // thi trinh duyet moi gui kem cookie refresh token.
  app.enableCors({
    origin: (process.env.CORS_ORIGINS ?? 'http://localhost:5173').split(','),
    credentials: true,
  });

  const port = Number(process.env.PORT ?? 3000);
  await app.listen(port);
  console.log(`API dang chay tai http://localhost:${port}`);
}

void bootstrap();
