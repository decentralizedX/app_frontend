import { useState, useEffect } from "react";
import { SavedPostCard } from "@/components/SavedPostCard";
import { SavedPostCardSkeleton } from "@/components/SavedPostCardSkeleton";
import { AuthGuard } from "@/components/AuthGuard";
import { Button } from "@/components/ui/button";
import { MessageSquare, Bookmark, RefreshCw, ChevronLeft, ChevronRight, ArrowRight, FileText } from "lucide-react";
import { fetchSavedPosts, fetchSavedPostsByNextPageToken } from "@/services/dXService";
import { useAccount } from "wagmi";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

export const DraftsPage = () => {
  const { address } = useAccount();
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [savedPosts, setSavedPosts] = useState<any[]>([]);
  const [isSavedPostsLoading, setIsSavedPostsLoading] = useState(false);
  const [savedPostsError, setSavedPostsError] = useState<string | null>(null);
  const [nextPageToken, setNextPageToken] = useState<string | null>(null);
  const [pageHistory, setPageHistory] = useState<{token: string | null, page: number}[]>([]); // Track page history
  const [currentPage, setCurrentPage] = useState(0);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Fetch saved posts when component mounts
  const handleFetchSavedPosts = async () => {
    if (!address) return;
    
    
    setIsSavedPostsLoading(true);
    setSavedPostsError(null);
    
    try {
      const result = await fetchSavedPosts(address);
      
      setSavedPosts(result.posts);
      setNextPageToken(result.nextPageToken || null);
      setPageHistory([{token: null, page: 0}]); // Initialize with first page
      setCurrentPage(0);
    } catch (error) {
      console.error('Failed to fetch saved posts:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch saved posts';
      
      // If it's a 403 error, the user has been logged out automatically
      if (errorMessage.includes('Access forbidden')) {
        // Set logout state to prevent error display
        setIsLoggingOut(true);
        // Clear any existing data since user was logged out
        setSavedPosts([]);
        setNextPageToken(null);
        setPageHistory([]);
        setCurrentPage(0);
        setSavedPostsError(null); // Don't show error message
        // The AuthGuard will handle showing the sign-in page
      } else {
        setSavedPostsError(errorMessage);
      }
    } finally {
      setIsSavedPostsLoading(false);
    }
  };

  // Fetch next page of saved posts
  const handleFetchNextPage = async () => {
    if (!address || !nextPageToken) return;
    
    setIsSavedPostsLoading(true);
    setSavedPostsError(null);
    
    try {
      // Add current page to history before fetching next page
      setPageHistory(prev => {
        const newHistory = [...prev, {token: nextPageToken, page: currentPage + 1}];
        return newHistory;
      });
      
      const result = await fetchSavedPostsByNextPageToken(address, nextPageToken);
      
      setSavedPosts(result.posts);
      setNextPageToken(result.nextPageToken || null);
      setCurrentPage(prev => prev + 1);
    } catch (error) {
      console.error('Failed to fetch next page of saved posts:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch next page';
      
      // If it's a 403 error, the user has been logged out automatically
      if (errorMessage.includes('Access forbidden')) {
        setIsLoggingOut(true);
        setSavedPosts([]);
        setNextPageToken(null);
        setPageHistory([]);
        setCurrentPage(0);
        setSavedPostsError(null);
      } else {
        setSavedPostsError(errorMessage);
      }
    } finally {
      setIsSavedPostsLoading(false);
    }
  };

  // Fetch previous page of saved posts
  const handleFetchPreviousPage = async () => {
    if (!address || currentPage === 0) return;
    
    setIsSavedPostsLoading(true);
    setSavedPostsError(null);
    
    try {
      // Remove current page from history
      const newPageHistory = [...pageHistory];
      newPageHistory.pop(); // Remove current page
      setPageHistory(newPageHistory);
      
      // Get the previous page info
      const previousPageInfo = newPageHistory[newPageHistory.length - 1];
      
      if (previousPageInfo) {
        if (previousPageInfo.token === null) {
          // Go back to first page
          const result = await fetchSavedPosts(address);
          setSavedPosts(result.posts);
          setNextPageToken(result.nextPageToken || null);
          setCurrentPage(0);
        } else {
          // Go back to a specific page using its token
          const result = await fetchSavedPostsByNextPageToken(address, previousPageInfo.token);
          setSavedPosts(result.posts);
          setNextPageToken(result.nextPageToken || null);
          setCurrentPage(previousPageInfo.page);
        }
      }
    } catch (error) {
      console.error('Failed to fetch previous page of saved posts:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch previous page';
      
      // If it's a 403 error, the user has been logged out automatically
      if (errorMessage.includes('Access forbidden')) {
        setIsLoggingOut(true);
        setSavedPosts([]);
        setNextPageToken(null);
        setPageHistory([]);
        setCurrentPage(0);
        setSavedPostsError(null);
      } else {
        setSavedPostsError(errorMessage);
      }
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

  // Reset logout state when authentication state changes
  useEffect(() => {
    if (isAuthenticated) {
      setIsLoggingOut(false);
    }
  }, [isAuthenticated]);

  // Fetch saved posts when component mounts or when authentication state changes
  useEffect(() => {
    if (address && isAuthenticated) {
      handleFetchSavedPosts();
    }
  }, [address, isAuthenticated]);

  return (
    <AuthGuard>
      <div className="px-4 sm:px-6 py-6 lg:px-8 max-w-7xl mx-auto w-full">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600">
              <FileText className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Drafts</h1>
            </div>
          </div>
          <p className="text-muted-foreground ml-14">Your saved posts and drafts</p>
        </div>
        <div className="w-full">
          {isSavedPostsLoading || isLoggingOut ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 justify-items-center">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => (
                <SavedPostCardSkeleton key={i} />
              ))}
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
              
              {/* Pagination Controls */}
              <div className="flex items-center justify-center gap-4 mt-8">
                <Button
                  onClick={handleFetchPreviousPage}
                  disabled={isSavedPostsLoading || currentPage === 0}
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-2"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span>Page {currentPage + 1}</span>
                  {isSavedPostsLoading && (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  )}
                </div>
                
                <Button
                  onClick={handleFetchNextPage}
                  disabled={isSavedPostsLoading || !nextPageToken}
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-2"
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-center animate-in fade-in-50 slide-in-from-bottom-4 duration-500">
              <div className="flex items-center gap-3 mb-2 animate-in fade-in-50 zoom-in-50 duration-700">
                <Bookmark className="h-8 w-8 animate-[float_3s_ease-in-out_infinite]" />
                <h2 className="text-2xl font-semibold">No Drafts</h2>
              </div>
              <p className="text-muted-foreground mb-6 max-w-md animate-in fade-in-50 slide-in-from-bottom-2 duration-1000">
                Your saved posts will appear here when you have any
              </p>
              <div 
                onClick={() => navigate('/app/editor')}
                className="flex items-center gap-2 text-muted-foreground mb-6 max-w-md animate-in fade-in-50 slide-in-from-bottom-2 duration-1000 cursor-pointer hover:text-foreground transition-colors"
              >
                <p>Start writing your first post</p>
                <ArrowRight className="h-4 w-4" />
              </div>
            </div>
          )}
        </div>
      </div>
    </AuthGuard>
  );
};
