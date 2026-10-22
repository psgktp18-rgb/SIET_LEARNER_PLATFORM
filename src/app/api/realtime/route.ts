import { NextResponse } from 'next/server';
import { getUser } from '@/lib/auth';
import { subscribe } from '@/lib/realtime';

export async function GET(req: Request) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      const sendEvent = (event: string, data: any) => {
        try {
          controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
        } catch (e) {
           // stream might be closed
        }
      };

      // Initial heartbeat
      sendEvent('ping', { time: Date.now() });

      // Keepalive heartbeat every 25s
      const interval = setInterval(() => {
        sendEvent('ping', { time: Date.now() });
      }, 25000);

      // Subscriptions
      const unsubUser = subscribe(`user:${user.userId}`, (e) => sendEvent(e.type, e.payload));
      const unsubRole = subscribe(`role:${user.role}`, (e) => sendEvent(e.type, e.payload));
      
      // In a real app we'd also subscribe to `classroom:${id}` based on DB enrollments. 
      // For simplicity/speed in this mock, we assume the frontend dictates classroom subscriptions or we fetch it here.
      // But since DB queries in stream open are fast enough:
      // const enrollments = await prisma.enrollment.findMany(...)
      
      // We will store cleanup function
      (req as any)._cleanup = () => {
        clearInterval(interval);
        unsubUser();
        unsubRole();
      };
    },
    cancel() {
      if ((req as any)._cleanup) (req as any)._cleanup();
    }
  });

  return new NextResponse(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
    },
  });
}
