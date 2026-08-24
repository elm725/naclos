'use client';

import React from 'react';
import { useRouter } from 'next/navigation';

export default function SalemHubPage() {
  const router = useRouter();

  const handleLogout = () => {
    sessionStorage.clear();
    router.push('/');
  };

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-2xl shadow-md space-y-8 text-gray-800 my-20">
      <div className="flex justify-between items-center border-b pb-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Espace Salem - Naclos</h1>
          <p className="text-xs text-gray-500">Sélectionnez l'opération à effectuer</p>
        </div>
        <button 
          onClick={handleLogout} 
          className="text-xs bg-gray-100 hover:bg-gray-200 px-3 py-2 rounded-lg text-gray-700 transition"
        >
          Quitter
        </button>
      </div>

      <div className="space-y-4">
        <button
          onClick={() => router.push('/supply')}
          className="w-full p-5 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-2xl text-left transition group"
        >
          <div className="text-base font-bold text-blue-900 group-hover:text-blue-700">📦 Saisir les Approvisionnements</div>
          <p className="text-xs text-gray-600 mt-1">Enregistrer les marchandises entrantes (Dinde, VH, Crispy...)</p>
        </button>

        <button
          onClick={() => router.push('/daily-consumption')}
          className="w-full p-5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-2xl text-left transition group"
        >
          <div className="text-base font-bold text-emerald-900 group-hover:text-emerald-700">📊 Calcul de Consommation</div>
          <p className="text-xs text-gray-600 mt-1">Saisir les ventes et calculer le stock théorique utilisé</p>
        </button>
      </div>
    </div>
  );
}