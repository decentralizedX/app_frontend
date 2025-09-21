import { PostCard } from "@/components/PostCard";
import { EmptyState } from "@/components/EmptyState";
import { useSearch } from "@/context/SearchContext";
import { usePosts } from "@/hooks/usePosts";

const HomePage = () => {
  const { searchTerm } = useSearch();
  const { allPosts, isAllPostLoading } = usePosts();

  // Filter posts that haven't expired yet
  const activePosts = allPosts.filter(post => {
    const currentTimestamp = Math.floor(Date.now() / 1000); // Convert to seconds
    return !post.archived && currentTimestamp < parseInt(post.endTime);
  });

  // Get the posts to display based on title search only
  const getPostsToDisplay = () => {
    let filteredPosts = activePosts;

    // Apply title search filter
    if (searchTerm.trim()) {
      filteredPosts = filteredPosts.filter(post => 
        post.postTitle.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    return filteredPosts;
  };

  const filteredPosts = getPostsToDisplay();

  // Sort posts by creation time (newest first)
  const sortedAndFilteredPosts = filteredPosts.sort((a, b) => {
    const idA = parseInt(a.postId);
    const idB = parseInt(b.postId);
    return idB - idA; // Newest first
  });



  return (
    <div className="w-full">
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-4xl mx-auto">
          {/* Results */}
          {isAllPostLoading ? (
            <div className="flex justify-center items-center py-2 md:py-4">
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
          ) : sortedAndFilteredPosts.length > 0 ? (
            sortedAndFilteredPosts.map((post) => (
              <PostCard key={post.postId} post={post} />
            ))
          ) : (
            <EmptyState 
              type={searchTerm ? "no-search-results" : "no-posts"} 
              searchTerm={searchTerm}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default HomePage;
