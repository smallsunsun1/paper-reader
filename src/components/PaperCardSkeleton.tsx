export function PaperCardSkeleton() {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="p-5 animate-pulse">
        {/* Title and category */}
        <div className="flex items-start justify-between gap-3">
          <div className="h-6 bg-gray-200 rounded flex-1" />
          <div className="h-5 w-16 bg-gray-200 rounded-full shrink-0" />
        </div>

        {/* Authors */}
        <div className="mt-2 flex items-center">
          <div className="w-4 h-4 bg-gray-200 rounded-full mr-1.5" />
          <div className="h-4 bg-gray-200 rounded w-48" />
        </div>

        {/* Date */}
        <div className="mt-2 flex items-center gap-4">
          <div className="h-3 bg-gray-200 rounded w-24" />
        </div>

        {/* Categories */}
        <div className="mt-3 flex gap-1">
          <div className="h-5 w-16 bg-gray-200 rounded" />
          <div className="h-5 w-20 bg-gray-200 rounded" />
          <div className="h-5 w-14 bg-gray-200 rounded" />
        </div>

        {/* Abstract */}
        <div className="mt-4 space-y-2">
          <div className="h-4 bg-gray-200 rounded w-full" />
          <div className="h-4 bg-gray-200 rounded w-full" />
          <div className="h-4 bg-gray-200 rounded w-3/4" />
        </div>

        {/* Actions */}
        <div className="mt-4 flex items-center gap-2">
          <div className="flex-1 h-9 bg-gray-200 rounded-lg" />
          <div className="h-9 w-20 bg-gray-200 rounded-lg" />
          <div className="h-9 w-20 bg-gray-200 rounded-lg" />
        </div>
      </div>
    </div>
  );
}

export function PaperListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="grid gap-4">
      {Array.from({ length: count }).map((_, index) => (
        <PaperCardSkeleton key={index} />
      ))}
    </div>
  );
}
