import { useState, useEffect } from "react";
import { HomeCard } from "@/components/HomeCard";
import { HomeCardSkeleton } from "@/components/HomeCardSkeleton";
import { AuthGuard } from "@/components/AuthGuard";
import { useSearch } from "@/context/SearchContext";
import { useUserAssets } from "@/hooks/useUserAssets";
import { useInfiniteScroll } from "@/hooks/useInfiniteScroll";
import { ArrowRight, BookOpen, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";

const POSTS_PER_PAGE = 9;

export const LibraryPage = () => {
  const { searchTerm } = useSearch();
  const { allUserAssets, isAllUserAssetLoading } = useUserAssets();
  const navigate = useNavigate();
  const [visibleCount, setVisibleCount] = useState(POSTS_PER_PAGE);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Get the posts to display based on title search
  const getPostsToDisplay = () => {
    if (!searchTerm.trim()) return allUserAssets;
    
    return allUserAssets.filter(asset => 
      asset.assetTitle.toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  const filteredPosts = getPostsToDisplay();
  const visiblePosts = filteredPosts.slice(0, visibleCount);
  const hasMore = visibleCount < filteredPosts.length;

  // Reset visible count when search term changes
  useEffect(() => {
    setVisibleCount(POSTS_PER_PAGE);
  }, [searchTerm]);

  // Handle view more
  const handleViewMore = () => {
    if (isLoadingMore) return; // Prevent multiple calls
    setIsLoadingMore(true);
    setTimeout(() => {
      setVisibleCount(prev => prev + POSTS_PER_PAGE);
      setIsLoadingMore(false);
    }, 800);
  };

  // Infinite scroll hook
  useInfiniteScroll({
    hasMore,
    isLoading: isAllUserAssetLoading || isLoadingMore,
    onLoadMore: handleViewMore,
    threshold: 300, // Trigger when 300px from bottom
  });

  return (
    <AuthGuard>
      <div className="px-4 sm:px-8 py-6 lg:px-12 xl:px-16 max-w-7xl mx-auto w-full">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600">
              <BookOpen className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Library</h1>
            </div>
          </div>
          <p className="text-muted-foreground ml-14">Your personal collection of assets and posts</p>
        </div>
        <div className="w-full">
          {isAllUserAssetLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 justify-items-center">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => (
                <HomeCardSkeleton key={i} />
              ))}
            </div>
          ) : filteredPosts.length > 0 ? (
            <div className="space-y-6">
            {/* Posts Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 justify-items-center">
              {visiblePosts.map((asset, index) => (
                <HomeCard 
                  key={asset.assetCid || index} 
                  asset={asset}
                />
              ))}
            </div>
            
            {/* Loading indicator for infinite scroll */}
            {hasMore && (
              <div className="flex justify-center pt-8 pb-4">
                {isLoadingMore ? (
                  <div className="flex flex-col items-center gap-3 py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <span className="text-base font-medium text-muted-foreground">Loading more posts...</span>
                  </div>
                ) : (
                  <div className="h-20" /> // Spacer for scroll trigger
                )}
              </div>
            )}
          </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-center animate-in fade-in-50 slide-in-from-bottom-4 duration-500">
              <div className="flex items-center gap-3 mb-2 animate-in fade-in-50 zoom-in-50 duration-700">
                <BookOpen className="h-8 w-8 animate-[float_3s_ease-in-out_infinite]" />
                <h2 className="text-2xl font-semibold">No Assets in Library</h2>
              </div>
              <p className="text-muted-foreground mb-6 max-w-md animate-in fade-in-50 slide-in-from-bottom-2 duration-1000">
                {searchTerm ? `No assets found matching "${searchTerm}"` : "Your library is empty. Start by purchasing assets."}
              </p>
              {!searchTerm && (
                <div 
                  onClick={() => navigate('/app')}
                  className="flex items-center gap-2 text-muted-foreground mb-6 max-w-md animate-in fade-in-50 slide-in-from-bottom-2 duration-1000 cursor-pointer hover:text-foreground transition-colors"
                >
                  <p>Purchase your first asset</p>
                  <ArrowRight className="h-4 w-4" />
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </AuthGuard>
  );
};