import React from 'react';

export function LoadingSkeleton() {
  return (
    <div className="page-gradient">
      <div className="header-sticky">
        <div className="container mx-auto px-6 py-8">
          <div className="space-y-1">
            <div className="h-8 w-48 loading-skeleton"></div>
            <div className="h-5 w-64 loading-skeleton"></div>
          </div>
        </div>
      </div>
      <div className="container mx-auto px-6 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="bg-card border border-border rounded-xl p-6 animate-pulse">
              <div className="space-y-4">
                <div className="flex justify-between items-start">
                  <div className="space-y-2 flex-1">
                    <div className="h-6 loading-skeleton w-3/4"></div>
                    <div className="h-4 loading-skeleton w-full"></div>
                    <div className="h-4 loading-skeleton w-2/3"></div>
                  </div>
                  <div className="h-6 w-16 loading-skeleton rounded-full ml-3"></div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="h-4 w-20 loading-skeleton"></div>
                  <div className="h-4 w-24 loading-skeleton"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
