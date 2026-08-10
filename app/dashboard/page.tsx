import AdminDashboard from '@/components/AdminDashboard';

export default function DashboardPage() {
  return (
    <main>
      <header className="mb-6">
        <h1 className="text-xl font-bold text-neutral-900">Tableau de Bord</h1>
        <p className="text-sm text-neutral-500">Analyse Hebdomadaire & Mensuelle</p>
      </header>
      <AdminDashboard />
    </main>
  );
}
