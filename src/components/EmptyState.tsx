import { Search, BookOpen } from "lucide-react";

interface EmptyStateProps {
  type: "no-posts" | "no-search-results";
  searchTerm?: string;
}

export const EmptyState = ({ type, searchTerm }: EmptyStateProps) => {

  const getEmptyStateContent = () => {
    if (type === "no-search-results") {
      return {
        icon: Search,
        title: searchTerm 
          ? `No active posts match '${searchTerm}'`
          : "No posts match your search criteria",
      };
    }

    return {
      icon: BookOpen,
      title: "Be the first to share your thoughts",
    };
  };

  const content = getEmptyStateContent();
  const IconComponent = content.icon;

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] px-4 text-center">
      <div className="relative mb-8">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-full blur-xl"></div>
        <div className="relative bg-gradient-to-br from-blue-500 to-purple-600 p-6 rounded-full shadow-lg">
          <IconComponent className="h-12 w-12 text-white" />
        </div>
      </div>

      <h2 className="text-2xl font-bold text-foreground">
        {content.title}
      </h2>
    </div>
  );
};
