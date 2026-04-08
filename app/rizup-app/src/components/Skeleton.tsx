export function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm animate-pulse">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 rounded-full bg-gray-200" />
        <div className="flex-1">
          <div className="h-3 bg-gray-200 rounded-full w-24 mb-1.5" />
          <div className="h-2 bg-gray-100 rounded-full w-16" />
        </div>
      </div>
      <div className="h-3 bg-gray-200 rounded-full w-full mb-2" />
      <div className="h-3 bg-gray-200 rounded-full w-3/4 mb-2" />
      <div className="h-3 bg-gray-100 rounded-full w-1/2" />
    </div>
  );
}

export function SkeletonTimeline() {
  return (
    <div className="flex flex-col gap-3">
      <SkeletonCard />
      <SkeletonCard />
      <SkeletonCard />
    </div>
  );
}
