import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export const ProfileSkeleton = () => {
  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6 space-y-4 sm:space-y-6 animate-pulse">
      {/* Header con Avatar y Nombre */}
      <Card className="p-3 sm:p-4 lg:p-6">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-3 sm:gap-6">
          <Skeleton className="h-16 w-16 sm:h-20 sm:w-20 lg:h-24 lg:w-24 rounded-full flex-shrink-0" />
          <div className="space-y-2 text-center sm:text-left w-full">
            <Skeleton className="h-6 sm:h-8 w-40 sm:w-48 mx-auto sm:mx-0" />
            <Skeleton className="h-4 w-32 mx-auto sm:mx-0" />
            <div className="flex flex-wrap gap-2 justify-center sm:justify-start mt-2">
              <Skeleton className="h-6 w-20" />
              <Skeleton className="h-6 w-24" />
            </div>
          </div>
        </div>
      </Card>

      {/* Tabs Skeleton */}
      <div className="space-y-4">
        <div className="flex gap-1 sm:gap-2 overflow-x-auto">
          <Skeleton className="h-8 sm:h-10 w-20 sm:w-24 flex-shrink-0" />
          <Skeleton className="h-8 sm:h-10 w-24 sm:w-32 flex-shrink-0" />
          <Skeleton className="h-8 sm:h-10 w-20 sm:w-28 flex-shrink-0" />
          <Skeleton className="h-8 sm:h-10 w-20 sm:w-24 flex-shrink-0" />
        </div>

        {/* Content Cards Skeleton */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="p-3 sm:p-4 lg:p-6">
              <Skeleton className="h-6 sm:h-7 w-48" />
            </CardHeader>
            <CardContent className="p-3 sm:p-4 lg:p-6 pt-0 space-y-3">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="p-3 sm:p-4 lg:p-6">
              <Skeleton className="h-6 sm:h-7 w-40" />
            </CardHeader>
            <CardContent className="p-3 sm:p-4 lg:p-6 pt-0 space-y-3">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
