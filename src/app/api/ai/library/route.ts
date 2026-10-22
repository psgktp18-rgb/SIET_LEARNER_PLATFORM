import { NextResponse, NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUser } from '@/lib/auth';
import { z } from 'zod';

export async function GET(req: NextRequest) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const tool = req.nextUrl.searchParams.get('tool');
    const where: any = { userId: user.userId };
    if (tool) where.tool = tool;

    const items = await prisma.aiGeneration.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    return NextResponse.json({ items });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch library' }, { status: 500 });
  }
}

const saveSchema = z.object({
  tool: z.string(),
  title: z.string().min(1, 'Title is required'),
  content: z.string().min(1, 'Content is required'),
  metadata: z.any().optional(),
  tags: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const data = saveSchema.parse(body);

    const generation = await prisma.aiGeneration.create({
      data: {
        userId: user.userId,
        tool: data.tool,
        title: data.title,
        content: data.content,
        metadata: data.metadata ? JSON.stringify(data.metadata) : null,
        tags: data.tags,
      },
    });

    return NextResponse.json({ item: generation }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to save generation' }, { status: 400 });
  }
}

const patchSchema = z.object({
  id: z.string(),
  rating: z.enum(['THUMBS_UP', 'THUMBS_DOWN']).optional().nullable(),
  title: z.string().optional(),
  content: z.string().optional(),
});

export async function PATCH(req: NextRequest) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const data = patchSchema.parse(body);

    const existing = await prisma.aiGeneration.findUnique({
      where: { id: data.id },
    });

    if (!existing || existing.userId !== user.userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const updated = await prisma.aiGeneration.update({
      where: { id: data.id },
      data: {
        ...(data.rating !== undefined ? { rating: data.rating } : {}),
        ...(data.title ? { title: data.title } : {}),
        ...(data.content ? { content: data.content } : {}),
      },
    });

    return NextResponse.json({ item: updated });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to update item' }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const id = req.nextUrl.searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

    const existing = await prisma.aiGeneration.findUnique({ where: { id } });
    if (!existing || existing.userId !== user.userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await prisma.aiGeneration.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to delete item' }, { status: 500 });
  }
}
