import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import os from 'os';



export async function GET() {
  const cpus = os.cpus();
  const loadAvg = os.loadavg();
  const totalMem = os.totalmem();
  const freeMem = os.freemem();

  try {
    // Basic DB health check
    const userCount = await prisma.user.count();
    const activeTestCount = await prisma.test.count({ where: { startTime: { lte: new Date() }, endTime: { gte: new Date() } } });

    return NextResponse.json({
      status: 'healthy',
      system: {
        platform: os.platform(),
        cpus: cpus.length,
        loadAvg,
        memoryUsagePercent: ((totalMem - freeMem) / totalMem) * 100,
      },
      db: {
        userCount,
        activeTestCount,
      }
    });
  } catch (error: any) {
    return NextResponse.json({
      status: 'unhealthy',
      error: error.message
    }, { status: 500 });
  }
}
