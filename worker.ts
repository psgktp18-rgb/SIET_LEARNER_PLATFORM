import { prisma } from "./src/lib/prisma";
import { jobRegistry } from "./src/lib/jobs/registry";

async function main() {
  console.log("Worker started...");
  while (true) {
    const job = await prisma.job.findFirst({
      where: {
        status: { in: ["PENDING", "FAILED"] },
        runAt: { lte: new Date() },
        attempts: { lt: 3 }
      },
      orderBy: { createdAt: "asc" }
    });

    if (job) {
      console.log(`Processing job ${job.id} of type ${job.type}`);
      
      await prisma.job.update({
        where: { id: job.id },
        data: { status: "PROCESSING", attempts: job.attempts + 1 }
      });

      try {
        const handler = jobRegistry[job.type];
        if (!handler) throw new Error(`No handler found for job type: ${job.type}`);
        
        await handler(JSON.parse(job.payload));
        
        await prisma.job.update({
          where: { id: job.id },
          data: { status: "COMPLETED", error: null }
        });
        console.log(`Job ${job.id} completed successfully.`);
      } catch (err: any) {
        console.error(`Job ${job.id} failed:`, err);
        const nextStatus = job.attempts + 1 >= 3 ? "FAILED" : "PENDING";
        const backoffMs = Math.pow(2, job.attempts) * 60000; // Exponential backoff
        await prisma.job.update({
          where: { id: job.id },
          data: { 
            status: nextStatus, 
            error: err.message,
            runAt: new Date(Date.now() + backoffMs)
          }
        });
      }
    } else {
      // Sleep if no jobs
      await new Promise(r => setTimeout(r, 3000));
    }
  }
}

main();
