import { prisma } from '@/lib/prisma';
import { SessionPayload } from '@/lib/auth';

export type ClassroomRole = 'ADMIN' | 'MAIN_TEACHER' | 'CO_TEACHER' | 'SUBSTITUTE' | 'CLASS_REP' | 'STUDENT' | 'HOD' | 'NONE';

export interface ClassroomAccess {
  role: ClassroomRole;
  isMainTeacher: boolean;
  isCoTeacher: boolean;
  isSubstitute: boolean;
  isClassRep: boolean;
  isEnrolledStudent: boolean;
  isHod: boolean;
  isAdmin: boolean;
  canPostStream: boolean;
  canGrade: boolean;
  canUploadNotes: boolean;
  canTakeAttendance: boolean;
  canManageRoster: boolean;
  canManageStaff: boolean;
  canArchive: boolean;
  canDelete: boolean;
  substituteEndDate?: Date | null;
  isSubstituteExpired?: boolean;
}

export async function getClassroomAccess(userId: string, classroomId: string): Promise<ClassroomAccess> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true, isHod: true, departmentId: true }
  });

  if (!user) {
    return {
      role: 'NONE',
      isMainTeacher: false,
      isCoTeacher: false,
      isSubstitute: false,
      isClassRep: false,
      isEnrolledStudent: false,
      isHod: false,
      isAdmin: false,
      canPostStream: false,
      canGrade: false,
      canUploadNotes: false,
      canTakeAttendance: false,
      canManageRoster: false,
      canManageStaff: false,
      canArchive: false,
      canDelete: false,
    };
  }

  if (user.role === 'ADMIN') {
    return {
      role: 'ADMIN',
      isMainTeacher: true,
      isCoTeacher: false,
      isSubstitute: false,
      isClassRep: false,
      isEnrolledStudent: false,
      isHod: false,
      isAdmin: true,
      canPostStream: true,
      canGrade: true,
      canUploadNotes: true,
      canTakeAttendance: true,
      canManageRoster: true,
      canManageStaff: true,
      canArchive: true,
      canDelete: true,
    };
  }

  const classroom = await prisma.classroom.findUnique({
    where: { id: classroomId },
    include: {
      teachers: true,
      enrollments: { where: { userId } }
    }
  });

  if (!classroom) {
    return {
      role: 'NONE',
      isMainTeacher: false,
      isCoTeacher: false,
      isSubstitute: false,
      isClassRep: false,
      isEnrolledStudent: false,
      isHod: false,
      isAdmin: false,
      canPostStream: false,
      canGrade: false,
      canUploadNotes: false,
      canTakeAttendance: false,
      canManageRoster: false,
      canManageStaff: false,
      canArchive: false,
      canDelete: false,
    };
  }

  const isHod = user.isHod && user.departmentId === classroom.departmentId;
  const isMainTeacher = classroom.teacherId === userId;
  const isClassRep = classroom.classRepId === userId;
  const isEnrolledStudent = classroom.enrollments.length > 0;

  const coTeacherRecord = classroom.teachers.find(t => t.teacherId === userId && t.role === 'CO_TEACHER');
  const isCoTeacher = !!coTeacherRecord;

  const subTeacherRecord = classroom.teachers.find(t => t.teacherId === userId && t.role === 'SUBSTITUTE');
  const now = new Date();
  const isSubstitute = !!subTeacherRecord;
  const isSubstituteExpired = isSubstitute && subTeacherRecord.endDate ? new Date(subTeacherRecord.endDate) < now : false;
  const isSubstituteActive = isSubstitute && !isSubstituteExpired;

  let role: ClassroomRole = 'NONE';
  if (isMainTeacher) role = 'MAIN_TEACHER';
  else if (isCoTeacher) role = 'CO_TEACHER';
  else if (isSubstituteActive) role = 'SUBSTITUTE';
  else if (isClassRep) role = 'CLASS_REP';
  else if (isEnrolledStudent) role = 'STUDENT';
  else if (isHod) role = 'HOD';

  const canEditContent = isMainTeacher || isCoTeacher || isSubstituteActive;

  return {
    role,
    isMainTeacher,
    isCoTeacher,
    isSubstitute,
    substituteEndDate: subTeacherRecord?.endDate,
    isSubstituteExpired,
    isClassRep,
    isEnrolledStudent,
    isHod,
    isAdmin: false,
    canPostStream: canEditContent || isClassRep,
    canGrade: canEditContent,
    canUploadNotes: canEditContent,
    canTakeAttendance: canEditContent,
    canManageRoster: isMainTeacher && classroom.type === 'EXTRA', // Teachers can invite/approve in their extra classes
    canManageStaff: isHod, // HODs can assign co-teacher / substitute for dept classes
    canArchive: isMainTeacher && classroom.type === 'EXTRA',
    canDelete: false, // Only admin can delete
  };
}

export async function canUserCreateClassroom(user: SessionPayload, isOfficial: boolean): Promise<{ allowed: boolean; reason?: string }> {
  if (user.role === 'ADMIN') return { allowed: true };

  const settings = await prisma.systemSetting.findFirst();
  const rule = settings?.classroomCreationRule || 'ADMIN_HOD_TEACHER';

  if (isOfficial) {
    return { allowed: false, reason: 'Only Administrators can create Official classrooms.' };
  }

  // Extra class creation:
  if (rule === 'ADMIN_ONLY') {
    return { allowed: false, reason: 'Classroom creation is currently restricted to Administrators.' };
  }

  if (user.role === 'HOD' || user.isHod) {
    return { allowed: true };
  }

  if (user.role === 'TEACHER') {
    if (rule === 'ADMIN_HOD_TEACHER') {
      return { allowed: true };
    }
    return { allowed: false, reason: 'Teacher extra class creation is disabled by system settings.' };
  }

  return { allowed: false, reason: 'Students cannot create classrooms.' };
}
