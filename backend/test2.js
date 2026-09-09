const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const site = await prisma.site.findFirst();
    console.log('Found valid site code:', site.site_code);
    
    await prisma.siteLocation.create({
      data: {
        name: site.site_code,
        region: 'Region 4',
        latitude: '35.00',
        longitude: '36.00'
      }
    });
    console.log('Successfully created SiteLocation for', site.site_code);
  } catch(e) {
    console.error('Failed:', e.message);
  } finally {
    await prisma.$disconnect();
  }
}
main();
