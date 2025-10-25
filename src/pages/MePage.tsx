import { useState, useEffect } from "react";
import { HomeCard } from "@/components/HomeCard";
import { HomeCardSkeleton } from "@/components/HomeCardSkeleton";
import { SavedPostCard } from "@/components/SavedPostCard";
import { SavedPostCardSkeleton } from "@/components/SavedPostCardSkeleton";
import { AuthGuard } from "@/components/AuthGuard";
import { Input } from "@/components/ui/input";
import { MessageSquare, ArrowRight, Sparkles, BookOpen, FileText, Search, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAssets } from "@/hooks/useAssets";
import { useUserAssets } from "@/hooks/useUserAssets";
import { useInfiniteScroll } from "@/hooks/useInfiniteScroll";
import { useAccount } from "wagmi";
import { useSearch } from "@/context/SearchContext";
import { fetchSavedPosts } from "@/services/dXService";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";

type TabType = "my-posts" | "library" | "drafts";

const TAB_OPTIONS: { id: TabType; label: string; icon: React.ElementType }[] = [
  { id: "my-posts", label: "My Posts", icon: Sparkles },
  { id: "library", label: "Library", icon: BookOpen },
  { id: "drafts", label: "Drafts", icon: FileText },
];

const POSTS_PER_PAGE = 9;

export const MePage = () => {
  const navigate = useNavigate();
  const { address } = useAccount();
  const { isAuthenticated } = useAuth();
  const { searchTerm, setSearchTerm } = useSearch();
  const { allAssets, isAllAssetLoading } = useAssets();
  const { allUserAssets, isAllUserAssetLoading } = useUserAssets();
  
  const [activeTab, setActiveTab] = useState<TabType>("my-posts");
  
  // View more state for my-posts and library tabs
  const [myPostsVisibleCount, setMyPostsVisibleCount] = useState(POSTS_PER_PAGE);
  const [libraryVisibleCount, setLibraryVisibleCount] = useState(POSTS_PER_PAGE);
  const [isLoadingMoreMyPosts, setIsLoadingMoreMyPosts] = useState(false);
  const [isLoadingMoreLibrary, setIsLoadingMoreLibrary] = useState(false);
  
  // Drafts state
  const [savedPosts, setSavedPosts] = useState<any[]>([]);
  const [isSavedPostsLoading, setIsSavedPostsLoading] = useState(false);
  const [savedPostsError, setSavedPostsError] = useState<string | null>(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Filter my assets from all assets (for My Posts)
  const filterMyAssets = () => {
    if (!address) return [];
    return allAssets.filter((asset) => {
      return asset.author.toLowerCase() === address?.toLowerCase();
    });
  };

  // Get filtered My Posts based on search term
  const getFilteredMyPosts = () => {
    const myAssets = filterMyAssets();
    let posts = myAssets;
    
    if (searchTerm.trim()) {
      posts = posts.filter(asset => 
        asset.assetTitle.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    // Reverse to show new posts first
    return [...posts].reverse();
  };

  // Get filtered Library posts based on search term
  const getFilteredLibraryPosts = () => {
    let posts = allUserAssets;
    
    if (searchTerm.trim()) {
      posts = posts.filter(asset => 
        asset.assetTitle.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    // Reverse to show new posts first
    return [...posts].reverse();
  };

  // Get filtered Drafts based on search term
  const getFilteredDrafts = () => {
    let posts = savedPosts;
    
    if (searchTerm.trim()) {
      posts = posts.filter(post => {
        // Extract title from content or fallback to name
        let postTitle = '';
        
        try {
          if (post.content) {
            const contentData = typeof post.content === 'string' ? JSON.parse(post.content) : post.content;
            postTitle = contentData.title?.trim() || post.name?.trim() || '';
          } else {
            postTitle = post.name?.trim() || '';
          }
        } catch (error) {
          postTitle = post.name?.trim() || '';
        }
        
        return postTitle.toLowerCase().includes(searchTerm.toLowerCase());
      });
    }
    
    // Reverse to show new posts first
    return [...posts].reverse();
  };

  const filteredMyPosts = getFilteredMyPosts();
  const filteredLibraryPosts = getFilteredLibraryPosts();
  const filteredDrafts = getFilteredDrafts();

  // Get visible posts for my posts
  const visibleMyPosts = filteredMyPosts.slice(0, myPostsVisibleCount);
  const myPostsHasMore = myPostsVisibleCount < filteredMyPosts.length;

  // Get visible posts for library
  const visibleLibraryPosts = filteredLibraryPosts.slice(0, libraryVisibleCount);
  const libraryHasMore = libraryVisibleCount < filteredLibraryPosts.length;

  // Reset visible count when search term changes
  useEffect(() => {
    setMyPostsVisibleCount(POSTS_PER_PAGE);
    setLibraryVisibleCount(POSTS_PER_PAGE);
  }, [searchTerm]);

  // Reset visible count when tab changes
  useEffect(() => {
    setMyPostsVisibleCount(POSTS_PER_PAGE);
    setLibraryVisibleCount(POSTS_PER_PAGE);
  }, [activeTab]);

  // Handle view more for my posts
  const handleMyPostsViewMore = () => {
    if (isLoadingMoreMyPosts) return; // Prevent multiple calls
    setIsLoadingMoreMyPosts(true);
    setTimeout(() => {
      setMyPostsVisibleCount(prev => prev + POSTS_PER_PAGE);
      setIsLoadingMoreMyPosts(false);
    }, 800);
  };

  // Handle view more for library
  const handleLibraryViewMore = () => {
    if (isLoadingMoreLibrary) return; // Prevent multiple calls
    setIsLoadingMoreLibrary(true);
    setTimeout(() => {
      setLibraryVisibleCount(prev => prev + POSTS_PER_PAGE);
      setIsLoadingMoreLibrary(false);
    }, 800);
  };

  // Infinite scroll for my posts tab
  useInfiniteScroll({
    hasMore: myPostsHasMore && activeTab === "my-posts",
    isLoading: isAllAssetLoading || isLoadingMoreMyPosts,
    onLoadMore: handleMyPostsViewMore,
    threshold: 300, // Trigger when 300px from bottom
  });

  // Infinite scroll for library tab
  useInfiniteScroll({
    hasMore: libraryHasMore && activeTab === "library",
    isLoading: isAllUserAssetLoading || isLoadingMoreLibrary,
    onLoadMore: handleLibraryViewMore,
    threshold: 300, // Trigger when 300px from bottom
  });

  // Fetch saved posts when component mounts or tab changes
  const handleFetchSavedPosts = async () => {
    if (!address) return;
    
    setIsSavedPostsLoading(true);
    setSavedPostsError(null);
    
    try {
      const result = await fetchSavedPosts(address);
      setSavedPosts(result.posts);
    } catch (error) {
      console.error('Failed to fetch saved posts:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch saved posts';
      
      if (errorMessage.includes('Access forbidden')) {
        setIsLoggingOut(true);
        setSavedPosts([]);
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

  // Fetch saved posts when drafts tab is active
  useEffect(() => {
    if (address && isAuthenticated && activeTab === "drafts") {
      handleFetchSavedPosts();
    }
  }, [address, isAuthenticated, activeTab]);

  // Get tab configuration
  const getTabConfig = () => {
    switch (activeTab) {
      case "my-posts":
        return {
          title: "My Posts",
          description: "Your published posts and assets",
          icon: Sparkles,
          gradient: "from-violet-500 to-purple-600"
        };
      case "library":
        return {
          title: "Library",
          description: "Your personal collection of assets and posts",
          icon: BookOpen,
          gradient: "from-emerald-500 to-teal-600"
        };
      case "drafts":
        return {
          title: "Drafts",
          description: "Your saved posts and drafts",
          icon: FileText,
          gradient: "from-amber-500 to-orange-600"
        };
    }
  };

  const tabConfig = getTabConfig();
  const TabIcon = tabConfig.icon;

  // Render content based on active tab
  const renderContent = () => {
    // My Posts Tab
    if (activeTab === "my-posts") {
      if (isAllAssetLoading) {
        return (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 justify-items-center">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => (
              <HomeCardSkeleton key={i} />
            ))}
          </div>
        );
      }

      if (filteredMyPosts.length > 0) {
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 justify-items-center">
              {visibleMyPosts.map((asset, index) => (
                <HomeCard 
                  key={asset.assetCid || index} 
                  asset={asset}
                />
              ))}
            </div>
            
            {/* Loading indicator for infinite scroll */}
            {myPostsHasMore && (
              <div className="flex justify-center pt-8 pb-4">
                {isLoadingMoreMyPosts ? (
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
        );
      }

      return (
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
      );
    }

    // Library Tab
    if (activeTab === "library") {
      if (isAllUserAssetLoading) {
        return (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 justify-items-center">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => (
              <HomeCardSkeleton key={i} />
            ))}
          </div>
        );
      }

      if (filteredLibraryPosts.length > 0) {
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 justify-items-center">
              {visibleLibraryPosts.map((asset, index) => (
                <HomeCard 
                  key={asset.assetCid || index} 
                  asset={asset}
                />
              ))}
            </div>
            
            {/* Loading indicator for infinite scroll */}
            {libraryHasMore && (
              <div className="flex justify-center pt-8 pb-4">
                {isLoadingMoreLibrary ? (
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
        );
      }

      return (
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
      );
    }

    // Drafts Tab
    if (activeTab === "drafts") {
      if (isSavedPostsLoading || isLoggingOut) {
        return (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 justify-items-center">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => (
              <SavedPostCardSkeleton key={i} />
            ))}
          </div>
        );
      }

      if (savedPostsError) {
        return (
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
        );
      }

      if (filteredDrafts.length > 0) {
        return (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 justify-items-center">
            {filteredDrafts.map((savedPost, index) => (
              <SavedPostCard 
                key={savedPost.cid || index} 
                savedPost={savedPost}
                onDelete={handleDeleteSavedPost}
              />
            ))}
          </div>
        );
      }

      return (
        <div className="flex flex-col items-center justify-center py-16 text-center animate-in fade-in-50 slide-in-from-bottom-4 duration-500">
          <div className="flex items-center gap-3 mb-2 animate-in fade-in-50 zoom-in-50 duration-700">
            <FileText className="h-8 w-8 animate-[float_3s_ease-in-out_infinite]" />
            <h2 className="text-2xl font-semibold">No Drafts</h2>
          </div>
          <p className="text-muted-foreground mb-6 max-w-md animate-in fade-in-50 slide-in-from-bottom-2 duration-1000">
            {searchTerm ? `No drafts found matching "${searchTerm}"` : "Your saved posts will appear here when you have any"}
          </p>
          {!searchTerm && (
            <div 
              onClick={() => navigate('/app/editor')}
              className="flex items-center gap-2 text-muted-foreground mb-6 max-w-md animate-in fade-in-50 slide-in-from-bottom-2 duration-1000 cursor-pointer hover:text-foreground transition-colors"
            >
              <p>Start writing your first post</p>
              <ArrowRight className="h-4 w-4" />
            </div>
          )}
        </div>
      );
    }
  };

  // Get hero content based on active tab
  const getHeroContent = () => {
    switch (activeTab) {
      case "my-posts":
        return {
          gradient: "from-violet-50 via-purple-50 to-fuchsia-50 dark:from-violet-900/20 dark:via-purple-900/20 dark:to-fuchsia-900/20",
          titleGradient: "from-violet-600 via-purple-600 to-fuchsia-600 dark:from-violet-300 dark:via-purple-300 dark:to-fuchsia-300",
          iconGradient: "from-violet-500 via-purple-600 to-fuchsia-600",
          subtitle: "Share your expertise, <span class='text-foreground font-semibold'>earn from every sale</span>",
          tagline: "Create once. Earn forever. Your content, your revenue."
        };
      case "library":
        return {
          gradient: "from-emerald-50 via-teal-50 to-cyan-50 dark:from-emerald-900/20 dark:via-teal-900/20 dark:to-cyan-900/20",
          titleGradient: "from-emerald-600 via-teal-600 to-cyan-600 dark:from-emerald-300 dark:via-teal-300 dark:to-cyan-300",
          iconGradient: "from-emerald-500 via-teal-600 to-cyan-600",
          subtitle: "Curate your knowledge, <span class='text-foreground font-semibold'>access anytime</span>",
          tagline: "Buy once. Own forever. No recurring fees."
        };
      case "drafts":
        return {
          gradient: "from-amber-50 via-orange-50 to-red-50 dark:from-amber-900/20 dark:via-orange-900/20 dark:to-red-900/20",
          titleGradient: "from-amber-600 via-orange-600 to-red-600 dark:from-amber-300 dark:via-orange-300 dark:to-red-300",
          iconGradient: "from-amber-500 via-orange-600 to-red-600",
          subtitle: "Work in progress, <span class='text-foreground font-semibold'>finish and publish</span>",
          tagline: "Save your ideas. Publish when ready. Never lose progress."
        };
    }
  };

  const heroContent = getHeroContent();

  return (
    <AuthGuard>
      <div className="px-4 sm:px-8 py-6 lg:px-12 xl:px-16 max-w-7xl mx-auto w-full">
        <div className="mb-10">
          {/* Hero Section */}
          <div className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${heroContent.gradient} p-4 sm:p-6 mb-6 border border-border/50 dark:border-border dark:shadow-lg dark:shadow-primary/5`}>
            {/* Background Pattern */}
            <div className="absolute inset-0 bg-grid-slate-100 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.5))] dark:bg-grid-slate-400/10" />
            
            <div className="relative z-10">
              <div className="flex items-start gap-2 sm:gap-4">
                <div className={`p-2 sm:p-3 rounded-xl bg-gradient-to-br ${heroContent.iconGradient} shadow-lg flex-shrink-0`}>
                  <TabIcon className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <h1 className={`text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight mb-1 sm:mb-1.5 bg-gradient-to-r ${heroContent.titleGradient} bg-clip-text text-transparent`}>
                    {tabConfig.title}
                  </h1>
                  <p className="text-sm sm:text-base lg:text-lg text-muted-foreground font-medium mb-1 sm:mb-1.5" dangerouslySetInnerHTML={{ __html: heroContent.subtitle }} />
                  <p className="text-xs sm:text-sm lg:text-base text-muted-foreground/80 font-medium">
                    {heroContent.tagline}
                  </p>
                </div>
              </div>
            </div>
          </div>
          
          {/* Tab Bar and Search Bar Container */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center sm:justify-between gap-3">
            {/* Horizontal Scrollable Tab Card */}
            <div className="-mx-4 sm:mx-0 w-[100vw] sm:w-fit bg-muted/50 border-y sm:border sm:border-border sm:rounded-xl h-10">
              <div className="overflow-x-auto scrollbar-hide px-0 h-full flex items-center">
                <div className="flex gap-3">
                  {TAB_OPTIONS.map((tab) => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`
                          flex items-center gap-2 px-4 py-2 font-medium rounded-lg
                          transition-all duration-200 whitespace-nowrap flex-shrink-0
                          ${isActive 
                            ? 'text-foreground bg-background shadow-md border border-border/50 scale-[1.02]' 
                            : 'text-muted-foreground hover:text-foreground/80 hover:bg-background/40'
                          }
                        `}
                      >
                        <Icon className="h-4 w-4" />
                        <span className="text-sm font-bold uppercase tracking-wider">
                          {tab.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Search Bar */}
            <div className="w-full sm:w-auto sm:max-w-md">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search posts by title..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 h-10 w-full rounded-xl border-2 border-black dark:border-white focus-visible:ring-0 focus-visible:ring-offset-0 bg-muted/50"
                />
              </div>
            </div>
          </div>
        </div>
        
        <div className="w-full">
          {renderContent()}
        </div>
      </div>
    </AuthGuard>
  );
};

