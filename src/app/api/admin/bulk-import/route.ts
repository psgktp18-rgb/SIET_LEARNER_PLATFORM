import { defineRoute } from '@/lib/action-wrapper';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcrypt';
// In a real app we might use 'csv-parse' but for demo we can do a naive split
// since the prompt says "build the flows below end to end"

export const POST = defineRoute(
  z.any(), 
  async (input, session, req) => {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const role = formData.get('role') as string || 'STUDENT';
    
    const isPreview = formData.get('preview') === 'true';
    
    if (!file) throw new Error("No CSV file uploaded");

    const text = await file.text();
    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    if (lines.length < 2) throw new Error("Empty CSV");

    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    
    // Check required headers
    if (!headers.includes('name') || !headers.includes('email') || !headers.includes('regno')) {
      throw new Error("CSV must include 'name', 'email', and 'regno' headers.");
    }

    const nameIdx = headers.indexOf('name');
    const emailIdx = headers.indexOf('email');
    const regnoIdx = headers.indexOf('regno');
    
    let createdCount = 0;
    let updatedCount = 0;
    let errors: string[] = [];
    let validRows = [];

    for (let i = 1; i < lines.length; i++) {
       const row = lines[i].split(',').map(c => c.trim());
       if (row.length < headers.length) continue;

       const name = row[nameIdx];
       const email = row[emailIdx];
       const loginId = row[regnoIdx];
       
       if (!name || !email || !loginId) continue;

       // Check for Excel corrupted exponential numbers
       if (loginId.includes('E+') || loginId.includes('e+')) {
         errors.push(`Row ${i + 1}: Corrupted ID detected (${loginId}). Format cell as Text in Excel.`);
         continue;
       }

       validRows.push({ name, email, loginId });
    }

    if (isPreview) {
      // In preview, we also check DB for duplicates
      const ids = validRows.map(r => r.loginId);
      const existing = await prisma.user.findMany({
        where: { loginId: { in: ids } },
        select: { loginId: true }
      });
      const existingIds = new Set(existing.map(e => e.loginId));
      
      let duplicateCount = 0;
      validRows.forEach(row => {
        if (existingIds.has(row.loginId)) duplicateCount++;
      });
      
      return { 
        success: true, 
        totalRows: validRows.length, 
        duplicateCount, 
        errors,
        message: errors.length > 0 ? "Fix errors before importing." : "Ready to import."
      };
    }

    // Actual Import
    for (const row of validRows) {
       const existing = await prisma.user.findFirst({
         where: { OR: [{ email: row.email }, { loginId: row.loginId }] }
       });

       if (existing) {
         await prisma.user.update({
           where: { id: existing.id },
           data: { name: row.name, role }
         });
         updatedCount++;
       } else {
         const defaultPassword = await bcrypt.hash(row.loginId, 10);
         await prisma.user.create({
           data: {
             name: row.name,
             email: row.email,
             loginId: row.loginId,
             role,
             passwordHash: defaultPassword,
             mustChangePassword: true
           }
         });
         createdCount++;
       }
    }

    return { success: true, createdCount, updatedCount, errors };
  },
  { roles: ['ADMIN'], auditAction: 'BULK_IMPORT_USERS' }
);
