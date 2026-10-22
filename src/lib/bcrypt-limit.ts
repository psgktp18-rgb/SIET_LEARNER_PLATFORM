import bcrypt from 'bcrypt';

class Semaphore {
  private queue: (() => void)[] = [];
  private active = 0;
  constructor(private max: number) {}
  
  async acquire() {
    if (this.active < this.max) {
      this.active++;
      return;
    }
    await new Promise<void>(resolve => this.queue.push(resolve));
  }
  
  release() {
    if (this.queue.length > 0) {
      const next = this.queue.shift();
      if (next) next();
    } else {
      this.active--;
    }
  }
}

const sem = new Semaphore(8);

export async function hash(data: string | Buffer, saltOrRounds: string | number): Promise<string> {
  await sem.acquire();
  try {
    return await bcrypt.hash(data, saltOrRounds);
  } finally {
    sem.release();
  }
}

export async function compare(data: string | Buffer, encrypted: string): Promise<boolean> {
  await sem.acquire();
  try {
    return await bcrypt.compare(data, encrypted);
  } finally {
    sem.release();
  }
}
