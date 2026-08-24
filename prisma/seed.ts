import { PrismaClient, ScrollType } from "@prisma/client";

const prisma = new PrismaClient();

const cards = [
  {
    name: "Bardo",
    description:
      "Elige a otro participante antes de que comience el combate y entrégale esta carta. Si acierta su apuesta, ambos obtienen +20 Paragonita adicionales. Si pierde, la carta no tiene efecto.",
  },
  {
    name: "Clérigo",
    description:
      "Si pierdes una apuesta, recuperas el 50% de la Paragonita apostada.",
  },
  {
    name: "Druida",
    description:
      "Puedes cambiar tu apuesta por el otro personaje o equipo antes de comenzar la última ronda.",
  },
  {
    name: "Mago",
    description:
      "Puedes apostar por ambos personajes o equipos. Tu apuesta está garantizada, pero recibes únicamente el 50% de la recompensa normal.",
  },
  {
    name: "Pícaro",
    description:
      "Al utilizar esta carta, entras inmediatamente en racha de 2 victorias.",
  },
  {
    name: "Explorador",
    description:
      "Si ganas una apuesta de 25 Paragonita o menos, añade +1.0 al multiplicador de esa apuesta.",
  },
  {
    name: "Bárbaro",
    description: "Si ganas tu apuesta, aumenta en 50% la recompensa obtenida.",
  },
  {
    name: "Paladín",
    description:
      "Si tienes una racha de 3 o más victorias, tu racha no se pierde al fallar una apuesta.",
  },
  {
    name: "Hechicero",
    description:
      "Lanza 1d20 para determinar el efecto de la carta. La lógica del d20 NO se implementa todavía. Solo registrar la carta.",
  },
  {
    name: "Guerrero",
    description: "Si ganas tu apuesta, duplica la recompensa obtenida.",
  },
  {
    name: "Monje",
    description:
      "Después de la primera ronda puedes elegir entre: ILUMINAR: duplica el multiplicador de tu apuesta. DESAPEGO: retira tu apuesta antes de la última ronda y recupera el 100% de lo apostado.",
  },
  {
    name: "Brujo",
    description:
      "Copia el efecto de otra Carta Comodín utilizada durante el combate. Si pierdes tu apuesta, no podrás utilizar Cartas Comodín durante el resto del evento.",
  },
  {
    name: "Joker",
    description: "Puede utilizarse como cualquier otra Carta Comodín.",
  },
] as const;

const scrolls = [
  {
    name: "Pergamino Shinobi",
    type: ScrollType.SHINOBI,
    description:
      "Pergamino de recompensas utilizado en Arena Shinobi. Al abrirlo se determina una recompensa mediante una tirada de 1d20.",
  },
  {
    name: "Pergamino de Paragonio",
    type: ScrollType.PARAGONIO,
    description:
      "Pergamino de recompensas destinado a organizadores. Al abrirlo se determina una recompensa mediante una tirada de 1d10.",
  },
] as const;

async function main(): Promise<void> {
  for (const card of cards) {
    await prisma.card.upsert({
      where: { name: card.name },
      update: { description: card.description },
      create: { name: card.name, description: card.description },
    });
  }

  for (const scroll of scrolls) {
    await prisma.scroll.upsert({
      where: {
        name_type: {
          name: scroll.name,
          type: scroll.type,
        },
      },
      update: {
        description: scroll.description,
      },
      create: {
        name: scroll.name,
        type: scroll.type,
        description: scroll.description,
      },
    });
  }

  console.log("🌱 Seed de Paragon Arena completado correctamente.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
