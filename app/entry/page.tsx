'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import DailyEntryForm from '@/components/DailyEntryForm';

export default function EntryPage() {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    // Check if authenticated via PIN from login screen
    const isAuth = sessionStorage.getItem('naclos_authenticated');
    if (!isAuth) {
      router.replace('/'); // Redirect unauthorized users back to welcome/login screen
    } else {
      setAuthorized(true);
    }
  }, [router]);

  if (!authorized) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 text-sm font-medium text-gray-500">
        Vérification de l'accès...
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 py-8 px-4">
      <DailyEntryForm />
    </main>
  );
}