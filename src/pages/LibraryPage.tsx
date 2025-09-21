import { PostCard } from "@/components/PostCard";
import { EmptyState } from "@/components/EmptyState";
import { AuthGuard } from "@/components/AuthGuard";
import { useSearch } from "@/context/SearchContext";
import { usePosts } from "@/hooks/usePosts";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Archive, Clock, BookOpen } from "lucide-react";

export const LibraryPage = () => {
  const { searchTerm } = useSearch();
  const { allPosts, isAllPostLoading } = usePosts();
  const [filter, setFilter] = useState<'all' | 'active' | 'archived'>('all');

  // Filter posts based on the selected filter
  const getFilteredPosts = () => {
    let filteredPosts = allPosts;

    // Apply filter
    if (filter === 'active') {
      const currentTimestamp = Math.floor(Date.now() / 1000);
      filteredPosts = allPosts.filter(post => 
        !post.archived && currentTimestamp < parseInt(post.endTime)
      );
    } else if (filter === 'archived') {
      const currentTimestamp = Math.floor(Date.now() / 1000);
      filteredPosts = allPosts.filter(post => 
        post.archived || currentTimestamp >= parseInt(post.endTime)
      );
    }
    // 'all' shows all posts without additional filtering

    return filteredPosts;
  };

  // Get the posts to display based on title search and filter
  const getPostsToDisplay = () => {
    let filteredPosts = getFilteredPosts();

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

  const getEmptyStateType = () => {
    if (searchTerm) return "no-search-results";
    if (filter === 'archived') return "no-posts";
    if (filter === 'active') return "no-posts";
    return "no-posts";
  };

  const getEmptyStateSearchTerm = () => {
    if (searchTerm) return searchTerm;
    if (filter === 'archived') return 'archived posts';
    if (filter === 'active') return 'active posts';
    return undefined;
  };

  return (
    <AuthGuard>
      <div className="w-full">
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <div className="w-full max-w-4xl mx-auto">
            {/* Header */}
            <div className="mb-8">
              <div className="flex items-center gap-3 mb-4">
                <BookOpen className="h-8 w-8 text-blue-600" />
                <h1 className="text-3xl font-bold text-foreground">Library</h1>
              </div>
              <p className="text-muted-foreground text-lg">
                Browse all posts, including archived content
              </p>
            </div>

            {/* Filter Buttons */}
            <div className="flex flex-wrap gap-2 mb-6">
              <Button
                variant={filter === 'all' ? 'default' : 'outline'}
                onClick={() => setFilter('all')}
                className="flex items-center gap-2"
              >
                <BookOpen className="h-4 w-4" />
                All Posts ({allPosts.length})
              </Button>
              <Button
                variant={filter === 'active' ? 'default' : 'outline'}
                onClick={() => setFilter('active')}
                className="flex items-center gap-2"
              >
                <Clock className="h-4 w-4" />
                Active ({allPosts.filter(post => {
                  const currentTimestamp = Math.floor(Date.now() / 1000);
                  return !post.archived && currentTimestamp < parseInt(post.endTime);
                }).length})
              </Button>
              <Button
                variant={filter === 'archived' ? 'default' : 'outline'}
                onClick={() => setFilter('archived')}
                className="flex items-center gap-2"
              >
                <Archive className="h-4 w-4" />
                Archived ({allPosts.filter(post => {
                  const currentTimestamp = Math.floor(Date.now() / 1000);
                  return post.archived || currentTimestamp >= parseInt(post.endTime);
                }).length})
              </Button>
            </div>

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
              <div className="space-y-4">
                {sortedAndFilteredPosts.map((post) => (
                  <PostCard key={post.postId} post={post} />
                ))}
              </div>
            ) : (
              <EmptyState 
                type={getEmptyStateType()} 
                searchTerm={getEmptyStateSearchTerm()}
              />
            )}
          </div>
        </div>
      </div>
    </AuthGuard>
  );
};