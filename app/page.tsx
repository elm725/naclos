'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();

  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (pin === '1234') {
      // 1. Set the session token so /entry allows access
      sessionStorage.setItem('naclos_authenticated', 'true');
      
      // 2. Redirect to the daily entry form
      router.push('/entry');
    } else {
      setError('Code PIN incorrect. Veuillez réessayer.');
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100 p-4">
      <div className="w-full max-w-sm bg-white p-6 rounded-xl shadow-md space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">Naclos Portal</h1>
          <p className="text-xs text-gray-500 mt-1">Saisissez votre code PIN pour accéder</p>
        </div>

        {error && (
          <div className="p-3 text-xs bg-red-50 text-red-700 border border-red-200 rounded-lg text-center font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handlePinSubmit} className="space-y-4">
          <div>
            <input
              type="password"
              maxLength={4}
              placeholder="Code PIN (1234)"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              className="w-full p-3 text-center text-2xl font-mono tracking-widest border rounded-lg outline-none focus:ring-2 focus:ring-black"
              autoFocus
            />
          </div>

          <button
            type="submit"
            className="w-full py-3 bg-black text-white font-bold rounded-lg hover:bg-gray-800 transition text-sm"
          >
            Se Connecter
          </button>
        </form>
      </div>
    </div>
  );
}