import Link from 'next/link';

export default function AdminNotFound() {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center py-20 text-center">
      <h2 className="text-3xl font-black text-secondary mb-2">404</h2>
      <h3 className="text-xl font-bold text-primary mb-4">Admin Page Not Found</h3>
      <p className="text-muted-foreground mb-6">
        Could not find this section of the admin dashboard.
      </p>
      <Link
        href="/admin"
        className="inline-block px-6 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors"
      >
        Return to Dashboard
      </Link>
    </div>
  );
}
