import { useState, useEffect } from "react";
import { HomeCard } from "@/components/HomeCard";
import { HomeCardSkeleton } from "@/components/HomeCardSkeleton";
import { Input } from "@/components/ui/input";
import { useSearch } from "@/context/SearchContext";
import { useAssets } from "@/hooks/useAssets";
import { useInfiniteScroll } from "@/hooks/useInfiniteScroll";
import { MessageSquare, ArrowRight, Globe, Clock, Search, Megaphone, Gift, Star, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { admin } from "@/contracts/dXmaster";

const POSTS_PER_PAGE = 9;

type FilterType = "just-created" | "top-reads" | "announcements" | "free";

const FILTER_OPTIONS: { id: FilterType; label: string; icon: React.ElementType }[] = [
  { id: "just-created", label: "Just Created", icon: Clock },
  { id: "top-reads", label: "Top Reads", icon: Star },
  { id: "announcements", label: "Announcements", icon: Megaphone },
  { id: "free", label: "Free Posts", icon: Gift },
];

const HomePage = () => {
  const { searchTerm, setSearchTerm } = useSearch();
  const { allAssets, isAllAssetLoading } = useAssets();
  const navigate = useNavigate();
  const [activeFilter, setActiveFilter] = useState<FilterType>("just-created");
  const [visibleCount, setVisibleCount] = useState(POSTS_PER_PAGE);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Get the posts to display based on title search and active filter
  const getPostsToDisplay = () => {
    let posts = allAssets;
    
    // Apply search filter
    if (searchTerm.trim()) {
      posts = posts.filter(asset => 
        asset.assetTitle.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    // Apply filter
    if (activeFilter === "free") {
      posts = posts.filter(asset => {
        const cost = asset.costInNative || "0";
        const costInEth = parseFloat(cost) / 1e18;
        return costInEth === 0;
      });
    } else if (activeFilter === "just-created") {
      // Show newest posts first (already reversed below)
      posts = [...posts];
    } else if (activeFilter === "top-reads") {
      // Could be based on number of purchases or revenue in the future
      posts = [...posts];
    } else if (activeFilter === "announcements") {
      posts = posts.filter(asset => {
        return asset.author.toLowerCase() === admin.toLowerCase();
      });
    }
    
    // Reverse to show new posts first
    return [...posts].reverse();
  };

  const filteredPosts = getPostsToDisplay();

  // Get visible posts
  const visiblePosts = filteredPosts.slice(0, visibleCount);
  const hasMore = visibleCount < filteredPosts.length;

  // Reset visible count when filters change
  useEffect(() => {
    setVisibleCount(POSTS_PER_PAGE);
  }, [searchTerm, activeFilter]);

  // Handle view more
  const handleViewMore = () => {
    if (isLoadingMore) return; // Prevent multiple calls
    setIsLoadingMore(true);
    // Simulate loading delay for better UX
    setTimeout(() => {
      setVisibleCount(prev => prev + POSTS_PER_PAGE);
      setIsLoadingMore(false);
    }, 800);
  };

  // Infinite scroll hook
  useInfiniteScroll({
    hasMore,
    isLoading: isAllAssetLoading || isLoadingMore,
    onLoadMore: handleViewMore,
    threshold: 300, // Trigger when 300px from bottom
  });

  // Get hero content based on active filter
  const getHeroContent = () => {
    switch (activeFilter) {
      case "just-created":
        return {
          title: "Just Created",
          gradient: "from-blue-50 via-purple-50 to-pink-50 dark:from-blue-900/20 dark:via-purple-900/20 dark:to-pink-900/20",
          titleGradient: "from-blue-600 via-purple-600 to-pink-600 dark:from-blue-300 dark:via-purple-300 dark:to-pink-300",
          iconGradient: "from-blue-500 via-purple-600 to-pink-600",
          icon: Clock,
          subtitle: "Fresh content from our community, <span class='text-foreground font-semibold'>hot off the press</span>",
          tagline: "New posts. Fresh insights. Latest knowledge."
        };
      case "top-reads":
        return {
          title: "Top Reads",
          gradient: "from-amber-50 via-yellow-50 to-orange-50 dark:from-amber-900/20 dark:via-yellow-900/20 dark:to-orange-900/20",
          titleGradient: "from-amber-600 via-yellow-600 to-orange-600 dark:from-amber-300 dark:via-yellow-300 dark:to-orange-300",
          iconGradient: "from-amber-500 via-yellow-600 to-orange-600",
          icon: Star,
          subtitle: "Most popular posts, <span class='text-foreground font-semibold'>loved by readers</span>",
          tagline: "Trending content. Quality reads. Community favorites."
        };
      case "announcements":
        return {
          title: "Announcements",
          gradient: "from-red-50 via-rose-50 to-pink-50 dark:from-red-900/20 dark:via-rose-900/20 dark:to-pink-900/20",
          titleGradient: "from-red-600 via-rose-600 to-pink-600 dark:from-red-300 dark:via-rose-300 dark:to-pink-300",
          iconGradient: "from-red-500 via-rose-600 to-pink-600",
          icon: Megaphone,
          subtitle: "Official updates and platform news, <span class='text-foreground font-semibold'>stay informed</span>",
          tagline: "Platform updates. Important notices. Community news."
        };
      case "free":
        return {
          title: "Free Posts",
          gradient: "from-emerald-50 via-teal-50 to-cyan-50 dark:from-emerald-900/20 dark:via-teal-900/20 dark:to-cyan-900/20",
          titleGradient: "from-emerald-600 via-teal-600 to-cyan-600 dark:from-emerald-300 dark:via-teal-300 dark:to-cyan-300",
          iconGradient: "from-emerald-500 via-teal-600 to-cyan-600",
          icon: Gift,
          subtitle: "Explore free content, <span class='text-foreground font-semibold'>no cost to access</span>",
          tagline: "Free access. Zero cost. Open knowledge."
        };
    }
  };

  const heroContent = getHeroContent();
  const HeroIcon = heroContent.icon;

  return (
    <div className="px-4 sm:px-8 py-6 lg:px-12 xl:px-16 max-w-7xl mx-auto w-full">
      <div className="mb-10">
        {/* Hero Section with Dynamic Content */}
        <div className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${heroContent.gradient} p-4 sm:p-6 mb-6 border border-border/50 dark:border-border dark:shadow-lg dark:shadow-primary/5`}>
          {/* Background Pattern */}
          <div className="absolute inset-0 bg-grid-slate-100 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.5))] dark:bg-grid-slate-400/10" />
          
          <div className="relative z-10">
            <div className="flex items-start gap-2 sm:gap-4">
              <div className={`p-2 sm:p-3 rounded-xl bg-gradient-to-br ${heroContent.iconGradient} shadow-lg flex-shrink-0`}>
                <HeroIcon className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h1 className={`text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight mb-1 sm:mb-1.5 bg-gradient-to-r ${heroContent.titleGradient} bg-clip-text text-transparent`}>
                  {heroContent.title}
                </h1>
                <p className="text-sm sm:text-base lg:text-lg text-muted-foreground font-medium mb-1 sm:mb-1.5" dangerouslySetInnerHTML={{ __html: heroContent.subtitle }} />
                <p className="text-xs sm:text-sm lg:text-base text-muted-foreground/80 font-medium">
                  {heroContent.tagline}
                </p>
              </div>
            </div>
          </div>
        </div>
        
        {/* Filter Bar and Search Bar Container */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center sm:justify-between gap-3 mb-4">
          {/* Horizontal Scrollable Filter Card */}
          <div className="-mx-4 sm:mx-0 w-[100vw] sm:w-fit bg-muted/50 border-y sm:border sm:border-border sm:rounded-xl h-10">
            <div className="overflow-x-auto scrollbar-hide px-0 h-full flex items-center">
              <div className="flex gap-3">
                {FILTER_OPTIONS.map((filter) => {
                  const Icon = filter.icon;
                  const isActive = activeFilter === filter.id;
                  return (
                    <button
                      key={filter.id}
                      onClick={() => setActiveFilter(filter.id)}
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
                        {filter.label}
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
        {isAllAssetLoading ? (
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
              <MessageSquare className="h-8 w-8 animate-[float_3s_ease-in-out_infinite]" />
              <h2 className="text-2xl font-semibold">No Posts Yet</h2>
            </div>
            <p className="text-muted-foreground mb-6 max-w-md animate-in fade-in-50 slide-in-from-bottom-2 duration-1000">
              {searchTerm && activeFilter === "free" 
                ? `No free posts found matching "${searchTerm}"` 
                : searchTerm 
                ? `No posts found matching "${searchTerm}"` 
                : activeFilter === "free"
                ? "No free posts available yet"
                : "No posts have been published yet"}
            </p>
            {!searchTerm && activeFilter === "just-created" && (
              <div 
                onClick={() => navigate('/app')}
                className="flex items-center gap-2 text-muted-foreground mb-6 max-w-md animate-in fade-in-50 slide-in-from-bottom-2 duration-1000 cursor-pointer hover:text-foreground transition-colors"
              >
                <p>Be the first to create a post</p>
                <ArrowRight className="h-4 w-4" />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default HomePage;
