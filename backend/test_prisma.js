const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    await prisma.siteLocation.create({
      data: {
        name: 'TEST#00',
        region: 'Region 4',
        latitude: '35.00',
        longitude: '36.00'
      }
    });
    console.log('Success');
  } catch(e) {
    console.error(e.message);
  } finally {
    await prisma.$disconnect();
  }
}
main();
