import { useState } from 'react';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Activity } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { data, error } = await api.get("/profiles");
      if (error) throw error;
      
      const user = (data || []).find((u: any) => u.email === email);
      
      if (user) {
        // For local development, we skip checking the password 
        // since we are mocking auth and password isn't stored securely yet.
        localStorage.setItem("localUser", JSON.stringify(user));
        
        // Trigger storage event for same-tab updates (some browsers don't do it)
        window.dispatchEvent(new Event("storage"));
        
        // Navigate
        window.location.href = "/";
      } else {
        setError("Invalid login credentials (user not found in local db)");
      }
    } catch (err: any) {
      setError(err.message || "Failed to login");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 p-4 transition-colors">
      <Card className="w-full max-w-md dark:bg-gray-900 dark:border-gray-800">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <Activity className="h-12 w-12 text-blue-600 dark:text-blue-500" />
          </div>
          <CardTitle className="text-2xl text-gray-900 dark:text-gray-100">NOC Operations Portal</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            {error && <div className="text-red-500 dark:text-red-400 text-sm font-medium">{error}</div>}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Email</label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="dark:bg-gray-950 dark:border-gray-800 dark:text-gray-100"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Password</label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="dark:bg-gray-950 dark:border-gray-800 dark:text-gray-100"
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Logging in...' : 'Login'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}