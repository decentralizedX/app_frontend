import { useState, useEffect } from "react";
import { SavedPostCard } from "@/components/SavedPostCard";
import { AuthGuard } from "@/components/AuthGuard";
import { Button } from "@/components/ui/button";
import { MessageSquare, Bookmark, RefreshCw } from "lucide-react";
import { fetchSavedPosts } from "@/services/dXService";
import { useAccount } from "wagmi";

export const DraftsPage = () => {
  const { address } = useAccount();
  const [savedPosts, setSavedPosts] = useState<any[]>([]);
  const [isSavedPostsLoading, setIsSavedPostsLoading] = useState(false);
  const [savedPostsError, setSavedPostsError] = useState<string | null>(null);

  // Fetch saved posts when component mounts
  const handleFetchSavedPosts = async () => {
    if (!address) return;
    
    setIsSavedPostsLoading(true);
    setSavedPostsError(null);
    
    try {
      const savedPostsData = await fetchSavedPosts(address);
      setSavedPosts(savedPostsData);
    } catch (error) {
      console.error('Failed to fetch saved posts:', error);
      setSavedPostsError(error instanceof Error ? error.message : 'Failed to fetch saved posts');
    } finally {
      setIsSavedPostsLoading(false);
    }
  };

  // Handle deletion of a saved post
  const handleDeleteSavedPost = (deletedCid: string) => {
    setSavedPosts(prevPosts => 
      prevPosts.filter(post => post.cid !== deletedCid)
    );
  };

  // Fetch saved posts when component mounts
  useEffect(() => {
    if (address) {
      handleFetchSavedPosts();
    }
  }, [address]);

  return (
    <AuthGuard>
      <div className="px-4 sm:px-6 py-6 lg:px-8 max-w-7xl mx-auto w-full">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Drafts</h1>
          <p className="text-muted-foreground">Your saved posts and drafts</p>
        </div>
        <div className="w-full">
          {isSavedPostsLoading ? (
            <div className="flex justify-center items-center py-4 md:py-8">
              <div className="w-full space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="animate-pulse">
                    <div className="h-24 bg-muted/50 rounded-lg border border-border">
                      <div className="p-4 space-y-3">
                        <div className="h-4 bg-muted rounded w-3/4" />
                        <div className="h-3 bg-muted rounded w-1/2" />
                        <div className="flex justify-between items-center">
                          <div className="h-3 bg-muted rounded w-1/4" />
                          <div className="h-3 bg-muted rounded w-1/4" />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : savedPostsError ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="text-red-500 mb-4">
                <MessageSquare className="h-8 w-8 mx-auto mb-2" />
                <h2 className="text-xl font-semibold">Error Loading Drafts</h2>
              </div>
              <p className="text-muted-foreground mb-4 max-w-md">
                {savedPostsError}
              </p>
              <Button onClick={handleFetchSavedPosts} variant="outline">
                Try Again
              </Button>
            </div>
          ) : savedPosts.length > 0 ? (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 justify-items-center">
                {savedPosts.map((savedPost, index) => (
                  <SavedPostCard 
                    key={savedPost.cid || index} 
                    savedPost={savedPost}
                    onDelete={handleDeleteSavedPost}
                  />
                ))}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-center animate-in fade-in-50 slide-in-from-bottom-4 duration-500">
              <div className="flex items-center gap-3 mb-2 animate-in fade-in-50 zoom-in-50 duration-700">
                <Bookmark className="h-8 w-8 animate-[float_3s_ease-in-out_infinite]" />
                <h2 className="text-2xl font-semibold">No Drafts</h2>
              </div>
              <p className="text-muted-foreground mb-6 max-w-md animate-in fade-in-50 slide-in-from-bottom-2 duration-1000">
                Your saved posts and drafts will appear here when you have any
              </p>
              <Button onClick={handleFetchSavedPosts} variant="outline">
                Refresh
              </Button>
            </div>
          )}
        </div>
      </div>
    </AuthGuard>
  );
};
