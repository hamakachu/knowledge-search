import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { LoginForm } from '../components/LoginForm';
import type { LoginCredentials } from '../types/auth';

export function LoginPage() {
  const { login } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (credentials: LoginCredentials) => {
    setError(null);
    setIsLoading(true);

    try {
      await login(credentials);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('ログインに失敗しました');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Groovy Knowledge Search
          </h1>
          <p className="text-lg text-gray-600">ログイン</p>
        </div>

        <div className="bg-white rounded-lg shadow-md p-8">
          <LoginForm onSubmit={handleSubmit} isLoading={isLoading} error={error} />
        </div>
      </div>
    </div>
  );
}
