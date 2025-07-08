import Head from 'next/head';

export default function Home() {
  return (
    <div className="p-8">
      <Head>
        <title>EcoPawst – A World Built for Tails</title>
        <meta name="description" content="Create pet profiles, share Zoomies, honor lost companions, and support rescue missions – all in one loving platform." />
      </Head>
      <h1 className="text-2xl font-bold">EcoPawst</h1>
      <p>Starter Next.js app</p>
    </div>
  );
}
