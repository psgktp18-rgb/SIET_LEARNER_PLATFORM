'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function LoginPage() {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Silently pre-warm the database
    fetch('/api/health').catch(() => {});
  }, []);

  useEffect(() => {
    if (identifier.length > 2) {
      router.prefetch('/student');
      router.prefetch('/teacher');
      router.prefetch('/hod');
      router.prefetch('/admin');
    }
  }, [identifier, router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    let loginFailed = false;
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, password }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Login failed, server returned an error.');
        loginFailed = true;
        return;
      }

      if (data.redirectTo) {
        window.location.assign(data.redirectTo);
      } else {
        router.replace('/student');
      }
    } catch (err: any) {
      loginFailed = true;
      if (err.name === 'AbortError') {
        setError('Server is taking too long to respond (timeout). Please try again.');
      } else {
        setError('A network error occurred. Please try again.');
      }
    } finally {
      // Only reset loading if login failed — leave it true while navigating to avoid flicker
      if (loginFailed) setLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center overflow-hidden">
      {/* Realistic / Premium SIET Background (Soft Green & Gold Mesh Gradient) */}
      <div className="absolute inset-0 z-0 bg-[#f4f7f6]">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-[#0f4c3a] rounded-full mix-blend-multiply filter blur-[150px] opacity-70 animate-pulse"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-[#fdb813] rounded-full mix-blend-multiply filter blur-[150px] opacity-60"></div>
        <div className="absolute top-[20%] right-[20%] w-[30%] h-[30%] bg-[#1a7356] rounded-full mix-blend-multiply filter blur-[120px] opacity-50"></div>
      </div>

      {/* Centered Login Card */}
      <div className="relative z-10 w-full max-w-md mx-4">
        <div className="bg-white/80 backdrop-blur-xl shadow-2xl rounded-3xl overflow-hidden border border-white/40">
          
          <div className="px-8 pt-10 pb-6 text-center">
            <div className="mx-auto w-20 h-20 bg-white rounded-2xl flex items-center justify-center shadow-sm mb-6 p-2 border border-slate-100">
              <img 
                src="/logo.png" 
                alt="SIET Logo" 
                className="w-full h-full object-contain" 
                onError={(e) => { e.currentTarget.src = 'https://via.placeholder.com/150?text=SIET'; }} 
              />
            </div>
            <h1 className="text-3xl font-bold text-slate-800 tracking-tight mb-2">Lecture Lens</h1>
            <p className="text-slate-500 font-medium">Sri Shakthi Institute of Engineering & Technology</p>
          </div>

          <div className="px-8 pb-10">
            <form onSubmit={handleLogin} className="space-y-6">
              
              <div className="space-y-2">
                <Label htmlFor="identifier" className="text-slate-700 font-semibold text-sm">
                  Register Number / Staff ID / Username
                </Label>
                <Input
                  id="identifier"
                  name="identifier"
                  type="text"
                  placeholder="e.g. 714024243219, T101 or admin"
                  autoComplete="username"
                  autoFocus
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  required
                  className="bg-white border-slate-200 text-slate-800 h-12 rounded-xl focus:ring-[#0f4c3a] focus-visible:ring-[#0f4c3a]"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-slate-700 font-semibold text-sm">Password</Label>
                  <a href="/forgot-password" className="text-xs font-semibold text-[#1a7356] hover:text-[#0f4c3a] hover:underline">
                    Forgot password?
                  </a>
                </div>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="bg-white border-slate-200 text-slate-800 h-12 rounded-xl focus:ring-[#0f4c3a] focus-visible:ring-[#0f4c3a]"
                />
              </div>

              {error && (
                <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {error}
                </div>
              )}

              <Button 
                type="submit" 
                className="w-full bg-gradient-to-r from-[#0f4c3a] to-[#1a7356] hover:from-[#0a3629] hover:to-[#135841] text-white font-semibold h-12 text-base rounded-xl transition-all shadow-lg hover:shadow-xl mt-2 disabled:opacity-70 disabled:cursor-not-allowed"
                disabled={loading}
              >
                {loading ? 'Signing in...' : 'Sign In'}
              </Button>
            </form>
          </div>
          
        </div>
        
        <p className="text-center text-sm text-slate-500 font-medium mt-8 mb-4">
          Need help? <a href="#" className="text-[#1a7356] hover:underline">Contact IT Support</a>
        </p>
      </div>
    </div>
  );
}
