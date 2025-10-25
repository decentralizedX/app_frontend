import { useState, useEffect } from "react";
import { HomeCard } from "@/components/HomeCard";
import { HomeCardSkeleton } from "@/components/HomeCardSkeleton";
import { AuthGuard } from "@/components/AuthGuard";
import { Button } from "@/components/ui/button";
import { MessageSquare, ArrowRight, RefreshCw, ChevronLeft, ChevronRight, Edit3, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAssets } from "@/hooks/useAssets";
import { useAccount } from "wagmi";
import { useSearch } from "@/context/SearchContext";

export const MyPostsPage = () => {
  const navigate = useNavigate();
  const { address } = useAccount();
  const { searchTerm } = useSearch();
  const { allAssets, isAllAssetLoading } = useAssets();

  // Filter my assets from all assets
  const filterMyAssets = () => {
    if (!address) return [];
    return allAssets.filter((asset) => {
      return asset.author.toLowerCase() === address?.toLowerCase();
    });
  };

  // Get filtered assets based on search term
  const getFilteredAssets = () => {
    const myAssets = filterMyAssets();
    if (!searchTerm.trim()) return myAssets;
    
    return myAssets.filter(asset => 
      asset.assetTitle.toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  const filteredAssets = getFilteredAssets();

  // Handle refresh
  const handleRefresh = () => {
    // Assets will be refreshed automatically when allAssets changes
  };

  return (
    <AuthGuard>
      <div className="px-4 sm:px-8 py-6 lg:px-12 xl:px-16 max-w-7xl mx-auto w-full">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600">
              <Sparkles className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">My Posts</h1>
            </div>
          </div>
          <p className="text-muted-foreground ml-14">Your published posts and assets</p>
        </div>
        <div className="w-full">
        {isAllAssetLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 justify-items-center">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => (
              <HomeCardSkeleton key={i} />
            ))}
          </div>
          ) : filteredAssets.length > 0 ? (
            <div className="space-y-6">
              {/* Posts Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 justify-items-center">
                {filteredAssets.map((asset, index) => (
                  <HomeCard 
                    key={asset.assetCid || index} 
                    asset={asset}
                  />
                ))}
              </div>
              
              {/* Pagination Controls - Placeholder for future implementation */}
              {filteredAssets.length > 12 && (
                <div className="flex items-center justify-center gap-4 mt-8">
                  <Button
                    disabled={true}
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-2"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </Button>
                  
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>Page 1</span>
                    {isAllAssetLoading && (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    )}
                  </div>
                  
                  <Button
                    disabled={true}
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-2"
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-center animate-in fade-in-50 slide-in-from-bottom-4 duration-500">
              <div className="flex items-center gap-3 mb-2 animate-in fade-in-50 zoom-in-50 duration-700">
                <MessageSquare className="h-8 w-8 animate-[float_3s_ease-in-out_infinite]" />
                <h2 className="text-2xl font-semibold">No Posts Yet</h2>
              </div>
              <p className="text-muted-foreground mb-6 max-w-md animate-in fade-in-50 slide-in-from-bottom-2 duration-1000">
                Your published posts will appear here when you have any
              </p>
              <div 
                onClick={() => navigate('/app/editor')}
                className="flex items-center gap-2 text-muted-foreground mb-6 max-w-md animate-in fade-in-50 slide-in-from-bottom-2 duration-1000 cursor-pointer hover:text-foreground transition-colors"
              >
                <p>Create your first post to get started</p>
                <ArrowRight className="h-4 w-4" />
              </div>
            </div>
          )}
        </div>
      </div>
    </AuthGuard>
  );
};
