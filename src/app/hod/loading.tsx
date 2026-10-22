export default function Loading() {
  return (
    <div className="flex h-screen w-screen items-center justify-center bg-gray-50">
      <div className="flex flex-col items-center space-y-4">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-800 border-t-transparent"></div>
        <p className="text-sm font-medium text-gray-500">Loading your workspace...</p>
      </div>
    </div>
  );
}
