import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export const instant = false;

export default function ForgotPasswordPage() {
  return (
    <div className="flex h-screen w-screen flex-col items-center justify-center bg-gray-50 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-green-50 via-gray-50 to-yellow-50">
      <Card className="w-full max-w-md shadow-lg border-t-4 border-t-primary">
        <CardHeader className="space-y-1">
          <div className="flex justify-center mb-4">
            <img src="/siet-logo.jpeg" alt="SIET Logo" className="h-16 w-16 rounded-full object-contain bg-white shadow-sm border p-1" />
          </div>
          <CardTitle className="text-2xl font-bold text-center text-primary">Reset Password</CardTitle>
          <CardDescription className="text-center text-gray-600">
            Please contact your Department HOD or the System Administrator to request a password reset.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 p-4 rounded-md text-sm">
            <p className="font-semibold mb-2">Why can't I reset it here?</p>
            <p>For security reasons, self-service password resets are disabled. Your HOD can instantly provide you with a temporary password through their portal.</p>
          </div>
        </CardContent>
        <CardFooter>
          <Link href="/login" className="w-full">
            <Button className="w-full" variant="outline">
              Return to Login
            </Button>
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}
