import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Activity, Mail, Lock, AlertCircle, ShieldCheck, Eye, EyeOff } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('http://localhost:4000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Failed to login');
      }
      
      if (data.token && data.user) {
        localStorage.setItem("jwt_token", data.token);
        localStorage.setItem("localUser", JSON.stringify(data.user));
        
        window.dispatchEvent(new Event("storage"));
        window.location.href = "/";
      } else {
        setError("Invalid response from server");
      }
    } catch (err: any) {
      setError(err.message || "Failed to login");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen w-full flex bg-white dark:bg-[#020817] transition-colors duration-300">
      
      {/* Left Side: Branding / Visual (Hidden on mobile/tablet) */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-slate-950 items-center justify-center">
        
        {/* Deep, glowing mesh gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-[#0a192f] to-slate-900" />
        
        {/* Abstract glowing orbs */}
        <div className="absolute inset-0 opacity-40 mix-blend-screen pointer-events-none">
          <div className="absolute -top-[10%] -left-[10%] w-[500px] h-[500px] bg-blue-600/30 rounded-full filter blur-[100px] animate-pulse" style={{ animationDuration: '4s' }} />
          <div className="absolute top-[40%] -right-[10%] w-[400px] h-[400px] bg-indigo-600/20 rounded-full filter blur-[80px] animate-pulse" style={{ animationDuration: '6s', animationDelay: '2s' }} />
        </div>
        
        {/* Branding Content */}
        <div className="relative z-10 p-12 max-w-xl text-white">
          <div className="mb-10 flex items-center justify-center w-20 h-20 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm shadow-2xl">
            <Activity className="w-10 h-10 text-blue-400" />
          </div>
          <h1 className="text-5xl font-extrabold mb-6 tracking-tight leading-tight">
            NOC MS <br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400 text-3xl">
              Management System
            </span>
          </h1>
          <p className="text-lg text-slate-300 leading-relaxed font-medium mb-12">
            Real-time monitoring, SLA tracking, and global network intelligence. Keep your infrastructure running flawlessly.
          </p>
          
          {/* Feature Badges */}
          <div className="flex gap-4 opacity-80">
            <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-4 py-2 backdrop-blur-sm text-sm font-medium">
              <ShieldCheck className="w-4 h-4 text-green-400" />
              Secure Access
            </div>
            <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-4 py-2 backdrop-blur-sm text-sm font-medium">
              <Activity className="w-4 h-4 text-blue-400" />
              Real-time Sync
            </div>
          </div>
        </div>
      </div>

      {/* Right Side: Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-[420px] space-y-10">
          
          {/* Mobile Header (Hidden on desktop) */}
          <div className="flex flex-col items-center justify-center lg:hidden mb-12">
            <div className="mb-4 flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/30">
              <Activity className="w-8 h-8 text-blue-600 dark:text-blue-500" />
            </div>
            <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight text-center">NOC MS</h2>
          </div>

          <div className="text-center lg:text-left space-y-2">
            <h2 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">Welcome back</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Please enter your credentials to access your dashboard.
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            
            {/* Error Message */}
            {error && (
              <div className="bg-red-50 dark:bg-red-900/10 text-red-600 dark:text-red-400 p-4 rounded-xl text-sm flex items-start gap-3 border border-red-200 dark:border-red-800/30 animate-in fade-in slide-in-from-top-2">
                <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <p className="font-medium">{error}</p>
              </div>
            )}

            {/* Email Field */}
            <div className="space-y-2.5">
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                Email Address
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none transition-colors group-focus-within:text-blue-500 text-slate-400 dark:text-slate-500">
                  <Mail className="h-5 w-5" />
                </div>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="pl-11 h-12 bg-white dark:bg-[#020817] border-slate-200 dark:border-slate-800 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 dark:text-slate-100 transition-all rounded-xl shadow-sm text-base"
                  placeholder="name@company.com"
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-2.5">
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                Password
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none transition-colors group-focus-within:text-blue-500 text-slate-400 dark:text-slate-500">
                  <Lock className="h-5 w-5" />
                </div>
                <Input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="pl-11 pr-11 h-12 bg-white dark:bg-[#020817] border-slate-200 dark:border-slate-800 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 dark:text-slate-100 transition-all rounded-xl shadow-sm text-base"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 transition-colors"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <Button 
              type="submit" 
              className="w-full h-12 mt-4 text-base font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-[0_4px_14px_0_rgba(37,99,235,0.39)] hover:shadow-[0_6px_20px_rgba(37,99,235,0.23)] hover:-translate-y-[1px] transition-all duration-200" 
              disabled={loading}
            >
              {loading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Authenticating...</span>
                </div>
              ) : (
                'Sign In'
              )}
            </Button>
          </form>

          {/* Footer */}
          <div className="pt-8 mt-8 border-t border-slate-200 dark:border-slate-800/60 text-center">
            <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
              Authorized personnel only. <br/> 
              Access is monitored and logged in compliance with security policies.
            </p>
          </div>

        </div>
      </div>

    </div>
  );
}