'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function DailyConsumptionPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  const [businessDate, setBusinessDate] = useState(() => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  });

useEffect(() => {
  const authRole = sessionStorage.getItem('naclos_role');
  const isAuth = sessionStorage.getItem('naclos_authenticated');
  if (isAuth !== 'true' || (authRole !== 'salem' && authRole !== 'admin')) {
    router.push('/');
  }
}, [router]);
  const [sales, setSales] = useState({
    // Pizzas S
    pizzaS_vh: 0,
    pizzaS_margarita: 0,
    pizzaS_poulet: 0,
    pizzaS_thon: 0,
    pizzaS_naclos: 0,
    pizzaS_fruit_de_mer: 0,
    // Pizzas M
    pizzaM_poulet: 0,
    pizzaM_naclos: 0,
    pizzaM_vh: 0,
    pizzaM_margarita: 0,
    pizzaM_thon: 0,
    pizzaM_fruit_de_mer: 0,
    // Tacos
    tacos_dinde: 0,
    tacos_fried_chicken: 0,
    tacos_kefta: 0,
    tacos_mixte: 0,
    // Italien
    italien_dinde: 0,
    italien_fried_chicken: 0,
    italien_kefta: 0,
    italien_mixte: 0,
    // Gratins
    gratin_poulet: 0,
    gratin_jambon: 0,
    gratin_vh: 0,
    gratin_mixte: 0,
    // Burgers
    burger_vh_hamburger: 0,
    burger_vh_cheese: 0,
    burger_vh_double: 0,
    burger_chicken_single: 0,
    burger_chicken_cheese: 0,
    burger_chicken_double: 0,
    // Suppléments
    sup_poulet: 0,
  });

  const handleChange = (field: string, value: string) => {
    const num = parseInt(value, 10);
    setSales((prev) => ({
      ...prev,
      [field]: isNaN(num) ? 0 : Math.max(0, num),
    }));
  };

  // --- Calculations ---
  const totalPizzaS =
    sales.pizzaS_vh +
    sales.pizzaS_margarita +
    sales.pizzaS_poulet +
    sales.pizzaS_thon +
    sales.pizzaS_naclos +
    sales.pizzaS_fruit_de_mer;
    
  const totalPizzaM = 
    sales.pizzaM_poulet + 
    sales.pizzaM_naclos + 
    sales.pizzaM_vh + 
    sales.pizzaM_margarita + 
    sales.pizzaM_thon + 
    sales.pizzaM_fruit_de_mer;

  const totalGratins =
    sales.gratin_poulet + sales.gratin_jambon + sales.gratin_vh + sales.gratin_mixte;

  const totalChickenBurgers = sales.burger_chicken_single + sales.burger_chicken_cheese + sales.burger_chicken_double;
  const singleBeefBurgers = sales.burger_vh_hamburger + sales.burger_vh_cheese;
  const doubleBeefBurgers = sales.burger_vh_double;
  const totalBeefBurgers = singleBeefBurgers + doubleBeefBurgers;

  // Dinde (kg)
  const dindeKg =
    (100 * (sales.pizzaM_poulet + sales.italien_dinde + sales.gratin_poulet + sales.sup_poulet) +
      50 *
        (sales.pizzaS_poulet +
          sales.pizzaM_naclos +
          sales.tacos_mixte +
          sales.italien_mixte +
          sales.gratin_mixte) +
      120 * sales.tacos_dinde +
      25 * sales.pizzaS_naclos) /
    1000;

  // VH (kg)
  const vhKg =
    (50 *
      (sales.pizzaS_vh +
        sales.gratin_mixte +
        sales.pizzaM_naclos +
        sales.tacos_mixte +
        sales.italien_mixte) +
      100 *
        (sales.pizzaM_vh +
          sales.italien_kefta +
          sales.tacos_kefta +
          singleBeefBurgers +
          sales.gratin_vh) +
      200 * doubleBeefBurgers +
      25 * sales.pizzaS_naclos) /
    1000;

  // Mozzarella (kg)
  const mozzKg = 0.12 * (totalPizzaM + totalGratins) + 0.06 * totalPizzaS;

  // Crispy (Pieces)
  const crispyKg =
    1.5 * (sales.tacos_fried_chicken + sales.italien_fried_chicken) +
    0.5 * (sales.tacos_mixte + sales.italien_mixte) +
    1.0 * (sales.burger_chicken_single + sales.burger_chicken_cheese) +
    2.0 * sales.burger_chicken_double;

  // Units
  const totalTortillas =
    sales.tacos_dinde + sales.tacos_fried_chicken + sales.tacos_kefta + sales.tacos_mixte;
  const totalBurgers = totalBeefBurgers + totalChickenBurgers;

  // --- Submission Flow ---
  const handleInitialSubmit = () => {
    setErrorMessage(null);
    setShowConfirmModal(true);
  };

  const executeSubmit = async () => {
    setShowConfirmModal(false);
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      const res = await fetch('/api/consumption', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessDate,
          dindeKg,
          vhKg,
          mozzKg,
          crispyKg,
          totalTortillas,
          totalBurgers,
        }),
      });

      if (!res.ok) throw new Error('Erreur lors de la sauvegarde');

      // Trigger the success screen!
      setIsSuccess(true);
    } catch (error) {
      console.error(error);
      setErrorMessage("Erreur de connexion. Impossible d'enregistrer la consommation.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const InputRow = ({ label, field }: { label: string; field: string }) => (
    <div className="flex justify-between items-center py-1">
      <span className="text-sm text-gray-700">{label}</span>
      <input
        type="number"
        min="0"
        value={sales[field as keyof typeof sales] || ''}
        onChange={(e) => handleChange(field, e.target.value)}
        placeholder="0"
        className="w-16 bg-gray-50 border border-gray-300 rounded-lg p-1 text-center text-gray-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
      />
    </div>
  );

  // --- FULL SCREEN SUCCESS UI ---
  if (isSuccess) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 text-center font-sans">
        <div className="w-full max-w-sm bg-white p-8 rounded-2xl shadow-xl border border-gray-100 flex flex-col items-center">
          <h2 className="text-2xl font-black text-gray-900 tracking-tight mb-2">MERCI SALEM</h2>
          
          <div className="my-6 w-24 h-24 rounded-full border-4 border-emerald-500 flex items-center justify-center bg-emerald-50 animate-bounce">
            <svg className="w-12 h-12 text-emerald-600 stroke-[3]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>

          <h3 className="text-lg font-bold text-emerald-600 uppercase tracking-widest mb-2"> Soumission Réussie</h3>
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-8">
            Consommation enregistrée pour le {businessDate}
          </p>

          <button
            onClick={() => router.push('/salem-hub')}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3.5 px-6 rounded-full shadow-lg transition transform active:scale-95 text-base tracking-wide"
          >
            Continuer 
          </button>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 p-4 pb-20 relative">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header with Date Selection */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Consommation Théorique</h1>
            <p className="text-xs text-gray-500">Saisissez les ventes journalières pour calculer la consommation</p>
            <div className="flex items-center gap-2 mt-3">
              <label className="text-xs font-bold text-gray-700 uppercase tracking-wide">
                Date de vente :
              </label>
              <input
                type="date"
                value={businessDate}
                onChange={(e) => setBusinessDate(e.target.value)}
                className="border border-gray-300 px-2 py-1 rounded-lg text-sm font-bold text-gray-900 bg-gray-50 outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>
          <button
            onClick={() => router.push('/salem-hub')}
            className="self-start sm:self-center text-xs bg-gray-100 hover:bg-gray-200 px-3 py-2 rounded-lg text-gray-700 transition"
          >
            ← Retour Hub
          </button>
        </div>

        {/* Error Banner */}
        {errorMessage && (
          <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-xl text-sm font-bold shadow-sm">
            ⚠ {errorMessage}
          </div>
        )}

        {/* Live Summary Cards */}
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
          {[
            { label: 'DINDE', val: dindeKg.toFixed(2), unit: 'kg', color: 'text-blue-600' },
            { label: 'VH', val: vhKg.toFixed(2), unit: 'kg', color: 'text-red-600' },
            { label: 'MOZZARELLA', val: mozzKg.toFixed(2), unit: 'kg', color: 'text-amber-500' },
            { label: 'CRISPY', val: crispyKg.toFixed(1), unit: 'pcs', color: 'text-orange-600' },
            { label: 'TORTILLAS', val: totalTortillas, unit: 'pcs', color: 'text-emerald-600' },
            { label: 'BUNS', val: totalBurgers, unit: 'pcs', color: 'text-emerald-600' },
          ].map((stat, idx) => (
            <div key={idx} className="bg-white border border-gray-200 p-3 rounded-xl text-center shadow-sm">
              <p className="text-[10px] text-gray-500 font-bold tracking-wider">{stat.label}</p>
              <p className={`text-lg font-black ${stat.color} mt-1`}>
                {stat.val} <span className="text-[10px] text-gray-400 font-normal">{stat.unit}</span>
              </p>
            </div>
          ))}
        </div>

        {/* Inputs Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm">
            <h2 className="font-bold text-gray-800 border-b pb-2 mb-3">🌮 Tacos & Italien</h2>
            <InputRow label="Tacos Dinde" field="tacos_dinde" />
            <InputRow label="Tacos Poulet Frit" field="tacos_fried_chicken" />
            <InputRow label="Tacos Kefta" field="tacos_kefta" />
            <InputRow label="Tacos Mixte" field="tacos_mixte" />
            <div className="my-2 border-t border-gray-100"></div>
            <InputRow label="Italien Dinde" field="italien_dinde" />
            <InputRow label="Italien Poulet Frit" field="italien_fried_chicken" />
            <InputRow label="Italien Kefta" field="italien_kefta" />
            <InputRow label="Italien Mixte" field="italien_mixte" />
          </div>

          <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm">
            <h2 className="font-bold text-gray-800 border-b pb-2 mb-3">🍕 Pizzas</h2>
            <InputRow label="Pizza S - Viande Hachée" field="pizzaS_vh" />
            <InputRow label="Pizza S - Poulet" field="pizzaS_poulet" />
            <InputRow label="Pizza S - Margarita" field="pizzaS_margarita" />
            <InputRow label="Pizza S - Thon" field="pizzaS_thon" />
            <InputRow label="Pizza S - Naclos" field="pizzaS_naclos" />
            <InputRow label="Pizza S - Fruit de Mer" field="pizzaS_fruit_de_mer" />
            <div className="my-2 border-t border-gray-100"></div>
            <InputRow label="Pizza M - Viande Hachée" field="pizzaM_vh" />
            <InputRow label="Pizza M - Poulet" field="pizzaM_poulet" />
            <InputRow label="Pizza M - Margarita" field="pizzaM_margarita" />
            <InputRow label="Pizza M - Thon" field="pizzaM_thon" />
            <InputRow label="Pizza M - Naclos" field="pizzaM_naclos" />
            <InputRow label="Pizza M - Fruit de Mer" field="pizzaM_fruit_de_mer" />
          </div>

          <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm space-y-6">
            <div>
              <h2 className="font-bold text-gray-800 border-b pb-2 mb-3">🍔 Burgers</h2>
              <InputRow label="Hamburger (VH)" field="burger_vh_hamburger" />
              <InputRow label="Cheese Burger (VH)" field="burger_vh_cheese" />
              <InputRow label="Double Cheese (VH)" field="burger_vh_double" />
              <div className="my-2 border-t border-gray-100"></div>
              <InputRow label="Chicken Burger" field="burger_chicken_single" />
              <InputRow label="Cheese Burger (Crispy)" field="burger_chicken_cheese" />
              <InputRow label="Double Chicken Burger" field="burger_chicken_double" />
            </div>

            <div>
              <h2 className="font-bold text-gray-800 border-b pb-2 mb-3">🍟 Suppléments</h2>
              <InputRow label="Supplément Poulet" field="sup_poulet" />
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm">
            <h2 className="font-bold text-gray-800 border-b pb-2 mb-3">🥘 Gratins</h2>
            <InputRow label="Gratin Poulet" field="gratin_poulet" />
            <InputRow label="Gratin Viande Hachée" field="gratin_vh" />
            <InputRow label="Gratin Jambon" field="gratin_jambon" />
            <InputRow label="Gratin Mixte" field="gratin_mixte" />
          </div>
        </div>

        {/* Submit Button */}
        <div className="pt-6">
          <button
            onClick={handleInitialSubmit}
            disabled={isSubmitting}
            className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-lg rounded-2xl transition disabled:opacity-50 shadow-md"
          >
            {isSubmitting ? 'Enregistrement...' : `Enregistrer la Consommation (${businessDate})`}
          </button>
        </div>
      </div>

      {/* Modern Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden transform transition-all">
            <div className="p-6 text-center space-y-4">
              <div className="w-16 h-16 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-2">
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900">Confirmation</h3>
              <p className="text-sm text-gray-500 leading-relaxed">
                Voulez-vous vraiment enregistrer la consommation théorique pour la journée du <span className="font-bold text-gray-900">{businessDate}</span> ?
              </p>
            </div>
            <div className="flex border-t border-gray-100">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="flex-1 px-4 py-4 text-gray-500 font-bold hover:bg-gray-50 transition"
              >
                Annuler
              </button>
              <button
                onClick={executeSubmit}
                className="flex-1 px-4 py-4 text-emerald-600 font-bold hover:bg-emerald-50 border-l border-gray-100 transition"
              >
                Confirmer
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}