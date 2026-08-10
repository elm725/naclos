import DailyEntryForm from '@/components/DailyEntryForm';


export default function EntryPage() {
  return (
    <main>
      <header className="mb-6">
        <h1 className="text-xl font-bold text-neutral-900">Clôture du Jour</h1>
        <p className="text-sm text-neutral-500">Naclos Operations & Audit Portal</p>
      </header>
      <DailyEntryForm />
    </main>
  );
}
