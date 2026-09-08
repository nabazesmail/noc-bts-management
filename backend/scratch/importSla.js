const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const dataString = require('./data');

const mapRow = (rowStr) => {
  const parts = rowStr.split('\t');
  return {
    month: parts[0]?.trim(),
    day: parts[1]?.trim(),
    shift: parts[2]?.trim(),
    noc_staff: parts[3]?.trim(),
    region: parts[4]?.trim(),
    city: parts[5]?.trim(),
    service_type: parts[6]?.trim(),
    site_code_dc: parts[7]?.trim(),
    noc_mtta: parts[8]?.trim(),
    noc_sla: parts[9]?.trim(),
    noc_sla_status: parts[10]?.trim(),
    site_mttr: parts[11]?.trim(),
    site_sla: parts[12]?.trim(),
    site_sla_status: parts[13]?.trim(),
    band_type: parts[14]?.trim(),
    band: parts[15]?.trim(),
    start_date: parts[16]?.trim(),
    start_time: parts[17]?.trim(),
    end_date: parts[18]?.trim(),
    end_time: parts[19]?.trim(),
    duration_time: parts[20]?.trim(),
    duration_hours: parts[21]?.trim(),
    duration_minutes: parts[22]?.trim(),
    responsible_department: parts[23]?.trim(),
    issue_technical_area: parts[24]?.trim(),
    reason: parts[25]?.trim(),
    comment: parts[26]?.trim(),
    status: parts[27]?.trim(),
    peak_none_peak: parts[28]?.trim(),
  };
};

async function main() {
  const rows = dataString.split('\n').filter(r => r.trim());
  const dataToInsert = rows.map(mapRow);
  
  console.log(`Inserting ${dataToInsert.length} rows...`);
  
  try {
    const result = await prisma.slaTracking.createMany({
      data: dataToInsert
    });
    console.log(`Successfully inserted ${result.count} records into SlaTracking.`);
  } catch (err) {
    console.error('Error inserting records:', err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
