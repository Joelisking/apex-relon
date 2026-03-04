import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  try {
    console.log('🔄 Starting Relon CRM Backend...');
    console.log(
      `📦 Node environment: ${process.env.NODE_ENV || 'development'}`
    );
    console.log(
      `🔌 Database URL configured: ${process.env.DATABASE_URL ? 'Yes' : 'No'}`
    );

    const app = await NestFactory.create(AppModule, {
      logger: ['error', 'warn', 'log', 'debug'],
    });

    // Enable CORS for the Next.js frontend
    // CORS_ORIGIN supports comma-separated values, e.g. "https://app.example.com,https://staging.example.com"
    const envOrigins = process.env.CORS_ORIGIN
      ? process.env.CORS_ORIGIN.split(',').map((o) =>
          o.trim().replace(/\/$/, '')
        )
      : [];

    const allowedOrigins = [
      'http://localhost:3000',
      
      ...envOrigins,
    ];

    console.log(
      `🌐 CORS enabled for origins: ${allowedOrigins.join(', ')}`
    );

    app.enableCors({
      origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps, curl, Postman)
        if (!origin) return callback(null, true);

        // Remove trailing slash from origin for comparison
        const normalizedOrigin = origin.replace(/\/$/, '');

        if (
          allowedOrigins.some(
            (allowed) => allowed === normalizedOrigin
          )
        ) {
          callback(null, true);
        } else {
          console.warn(`⚠️  CORS blocked origin: ${origin}`);
          callback(new Error('Not allowed by CORS'));
        }
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
    });

    // Global validation pipe
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      })
    );

    // API prefix
    app.setGlobalPrefix('api');

    // Graceful shutdown
    app.enableShutdownHooks();

    const port = process.env.PORT || 4000;
    const host = '0.0.0.0';

    console.log(`🎯 Attempting to bind to ${host}:${port}...`);
    await app.listen(port, host);

    console.log(`✅ Relon CRM Backend successfully started!`);
    console.log(`🚀 Server running on http://${host}:${port}`);
    console.log(`📚 API available at http://${host}:${port}/api`);
    console.log(
      `❤️  Health check available at http://${host}:${port}/api/health`
    );
  } catch (error) {
    console.error('❌ Failed to start application:');
    console.error(error);
    process.exit(1);
  }
}

bootstrap();
