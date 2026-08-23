# Paragon Arena

Base del bot de Discord Paragon Arena, preparado para comenzar la Fase 1: diseño del schema de Prisma y conexión con Supabase PostgreSQL.

## Requisitos

- Node.js
- pnpm

## Configuración local

1. Copia `.env.example` como `.env`.
2. Completa las variables de entorno cuando estén disponibles.
3. Instala las dependencias:

```bash
pnpm install
```

## Comandos

```bash
pnpm dev
pnpm build
pnpm start
pnpm prisma:generate
pnpm prisma:migrate
pnpm prisma:studio
```

El proyecto todavía no incluye comandos de Discord, handlers, eventos ni modelos de negocio. Esas piezas se incorporarán en fases posteriores.