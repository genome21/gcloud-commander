import GCloudCommander from '@/components/gcloud-commander';

export default function Home() {
  return (
    <main className="flex min-h-screen w-full flex-col items-center justify-center bg-background p-4 sm:p-8">
      <GCloudCommander />
    </main>
  );
}
