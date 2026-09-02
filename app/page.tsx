'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function WelcomePage() {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [authRole, setAuthRole] = useState<'tayeb' | 'admin' | null>(null);
  const router = useRouter();

  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (pin === '1234') {
      sessionStorage.setItem('naclos_authenticated', 'true');
      sessionStorage.setItem('naclos_role', 'tayeb');
      router.push('/entry');
    } else if (pin === '1111') {
      sessionStorage.setItem('naclos_authenticated', 'true');
      sessionStorage.setItem('naclos_role', 'salem');
      router.push('/salem-hub');
    } else if (pin === '1952') {
      // Noureddine's PIN
      sessionStorage.setItem('naclos_authenticated', 'true');
      sessionStorage.setItem('naclos_role', 'noureddine');
      router.push('/daily-report');
    } else if (pin === '2005') {
      sessionStorage.setItem('naclos_authenticated', 'true');
      sessionStorage.setItem('naclos_role', 'admin');
      setAuthRole('admin');
    } else {
      setError('Code PIN incorrect.');
    }
  };

  if (authRole === 'admin') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
        <div className="w-full max-w-md bg-white p-8 rounded-2xl shadow-md space-y-6 text-center border">
          <div className="flex justify-center"><img src="/logo.png" alt="Naclo's Logo" className="w-28 h-28 object-contain" /></div>
          <div><h1 className="text-2xl font-bold text-gray-900">Espace Administration</h1><p className="text-xs text-gray-500 mt-1">Sélectionnez le module à consulter</p></div>
          <div className="space-y-3">
            <button onClick={() => router.push('/entry')} className="w-full py-4 bg-black text-white font-bold rounded-xl hover:bg-gray-800 transition text-sm shadow-sm">📝 Saisie du Jour (Clôture)</button>
            <button onClick={() => router.push('/dashboard')} className="w-full py-4 bg-gray-100 text-gray-900 font-bold rounded-xl hover:bg-gray-200 transition text-sm border">📊 Tableau de Bord (Admin)</button>
          </div>
          <button onClick={() => { sessionStorage.clear(); setAuthRole(null); setPin(''); }} className="text-xs text-red-600 hover:underline mt-4 block mx-auto font-medium">Se déconnecter</button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100 p-4">
      <div className="w-full max-w-sm bg-white p-6 rounded-2xl shadow-md space-y-6">
        <div className="text-center space-y-2">
          <div className="flex justify-center"><img src="/logo.png" alt="Naclo's Logo" className="w-32 h-32 object-contain" /></div>
          <h1 className="text-2xl font-bold text-gray-900">Naclos Portal</h1>
          <p className="text-xs text-gray-500">Veuillez saisir votre code PIN</p>
        </div>
        {error && <div className="p-3 text-xs bg-red-50 text-red-700 border border-red-200 rounded-lg text-center font-medium">{error}</div>}
        <form onSubmit={handlePinSubmit} className="space-y-4">
          <div>
            <input type="password" maxLength={6} placeholder="PIN" value={pin} onChange={(e) => setPin(e.target.value)} className="w-full p-3 text-center text-2xl font-mono tracking-widest border rounded-xl outline-none focus:ring-2 focus:ring-black" autoFocus />
          </div>
          <button type="submit" className="w-full py-3.5 bg-black text-white font-bold rounded-xl hover:bg-gray-800 transition text-sm shadow-sm">Se Connecter</button>
        </form>
      </div>
    </div>
  );
}