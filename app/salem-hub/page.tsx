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
          <h1 className="text-xl font-bold text-gray-900">Espace Salem — Naclos</h1>
          <p className="text-xs text-gray-500">Sélectionnez l'opération à effectuer</p>
        </div>
        <button onClick={handleLogout} className="text-xs bg-gray-100 hover:bg-gray-200 px-3 py-2 rounded-xl font-bold">Déconnexion</button>
      </div>

      <div className="space-y-4">
        <button
          onClick={() => router.push('/supply-entry')} // Link to his existing supply entry page
          className="w-full p-5 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-2xl text-left transition space-y-1 group"
        >
          <div className="text-base font-bold text-blue-900 group-hover:text-blue-600">📦 Saisir les Achats (Supplies)</div>
          <p className="text-xs text-gray-500">Enregistrer les marchandises entrantes (Dinde, VH, Crispy, etc.)</p>
        </button>

        <button
          onClick={() => router.push('/salem-sales')} // Link to the new manual sales entry page we built
          className="w-full p-5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-2xl text-left transition space-y-1 group"
        >
          <div className="text-base font-bold text-emerald-900 group-hover:text-emerald-600">📊 Saisir les Ventes Journalières</div>
          <p className="text-xs text-gray-500">Enregistrer les quantités vendues par article pour le calcul du stock</p>
        </button>
      </div>
    </div>
  );
}