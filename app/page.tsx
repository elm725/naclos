'use client';

import { useState } from 'react';

export default function WelcomePage() {
  const [passcode, setPasscode] = useState('');
  const [error, setError] = useState('');

  const handleAccess = (target: 'entry' | 'dashboard') => {
    const cleanPin = passcode.trim();

    if (target === 'dashboard') {
      if (cleanPin === '999' || cleanPin === '9999') {
        window.location.assign('/dashboard');
      } else {
        setError("Accès refusé : Code incorrect pour le Dashboard.");
      }
    } else if (target === 'entry') {
      if (cleanPin === '1234' || cleanPin === '999' || cleanPin === '9999') {
        window.location.assign('/entry');
      } else {
        setError("Code d'accès incorrect pour la Saisie.");
      }
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col justify-center items-center p-6 text-neutral-800">
      <div className="max-w-md w-full space-y-6 text-center bg-white p-8 rounded-xl border border-neutral-200 shadow-sm">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-neutral-900">Naclos</h1>
          <p className="text-sm text-neutral-500 mt-1">Operations & Audit Portal</p>
        </div>

        <div className="space-y-2 text-left">
          <label className="text-xs font-semibold text-neutral-600">Code d'accès (PIN)</label>
          <input
            type="password"
            placeholder="Entrez votre PIN"
            value={passcode}
            onChange={(e) => {
              setPasscode(e.target.value);
              setError('');
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleAccess('dashboard');
            }}
            className="w-full p-3 border border-neutral-300 rounded-lg text-center tracking-widest text-lg font-mono text-black"
          />
          {error && <p className="text-xs text-red-500 font-medium mt-1">{error}</p>}
        </div>

        <div className="grid grid-cols-2 gap-4 pt-2">
          <button
            type="button"
            onClick={() => handleAccess('entry')}
            className="p-4 bg-neutral-900 text-white rounded-lg font-medium hover:bg-neutral-800 transition-all text-sm"
          >
            Saisie du Jour
          </button>
          <button
            type="button"
            onClick={() => handleAccess('dashboard')}
            className="p-4 bg-neutral-100 text-neutral-900 border border-neutral-200 rounded-lg font-medium hover:bg-neutral-200 transition-all text-sm"
          >
            Tableau de Bord
          </button>
        </div>
      </div>
    </div>
  );
}