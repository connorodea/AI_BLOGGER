import { Card } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from "recharts";

export default function Dashboard() {
  const { data: stats, isLoading: isStatsLoading } = useQuery({
    queryKey: ["/api/dashboard/stats"],
  });

  const { data: recentPosts, isLoading: isPostsLoading } = useQuery({
    queryKey: ["/api/posts/recent"],
  });

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">Overview of your blog automation</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 lg:p-6 hover:shadow-lg transition-all duration-200 hover:-translate-y-1">
          <h3 className="text-sm font-semibold text-muted-foreground">Total Posts</h3>
          {isStatsLoading ? (
            <div className="h-9 lg:h-10 bg-muted animate-pulse rounded mt-2" />
          ) : (
            <p className="text-2xl lg:text-3xl font-bold mt-2 bg-gradient-to-br from-primary/90 to-primary bg-clip-text text-transparent">
              {formatNumber(stats?.totalPosts || 0)}
            </p>
          )}
        </Card>
        <Card className="p-4 lg:p-6 hover:shadow-lg transition-all duration-200 hover:-translate-y-1">
          <h3 className="text-sm font-semibold text-muted-foreground">Published</h3>
          {isStatsLoading ? (
            <div className="h-9 lg:h-10 bg-muted animate-pulse rounded mt-2" />
          ) : (
            <p className="text-2xl lg:text-3xl font-bold mt-2 bg-gradient-to-br from-primary/90 to-primary bg-clip-text text-transparent">
              {formatNumber(stats?.publishedPosts || 0)}
            </p>
          )}
        </Card>
        <Card className="p-4 lg:p-6 hover:shadow-lg transition-all duration-200 hover:-translate-y-1">
          <h3 className="text-sm font-semibold text-muted-foreground">Total Views</h3>
          {isStatsLoading ? (
            <div className="h-9 lg:h-10 bg-muted animate-pulse rounded mt-2" />
          ) : (
            <p className="text-2xl lg:text-3xl font-bold mt-2 bg-gradient-to-br from-primary/90 to-primary bg-clip-text text-transparent">
              {formatNumber(stats?.totalViews || 0)}
            </p>
          )}
        </Card>
        <Card className="p-4 lg:p-6 hover:shadow-lg transition-all duration-200 hover:-translate-y-1">
          <h3 className="text-sm font-semibold text-muted-foreground">Revenue</h3>
          {isStatsLoading ? (
            <div className="h-9 lg:h-10 bg-muted animate-pulse rounded mt-2" />
          ) : (
            <p className="text-2xl lg:text-3xl font-bold mt-2 bg-gradient-to-br from-primary/90 to-primary bg-clip-text text-transparent">
              ${formatNumber(stats?.totalRevenue || 0)}
            </p>
          )}
        </Card>
      </div>

      <Card className="p-4 lg:p-6 hover:shadow-lg transition-all duration-200">
        <h2 className="text-lg lg:text-xl font-semibold mb-4 bg-gradient-to-r from-primary/90 to-primary bg-clip-text text-transparent">
          Performance Overview
        </h2>
        <div className="h-[250px] lg:h-[300px]">
          {isStatsLoading ? (
            <div className="w-full h-full flex items-center justify-center">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={stats?.performanceData || []} className="animate-in fade-in duration-700">
                <CartesianGrid strokeDasharray="3 3" className="opacity-50" />
                <XAxis 
                  dataKey="date"
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) => new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'rgba(0,0,0,0.8)', 
                    border: 'none',
                    borderRadius: '8px',
                    padding: '12px'
                  }}
                />
                <Line 
                  type="monotone" 
                  dataKey="views" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={2}
                  dot={{ strokeWidth: 2 }}
                  activeDot={{ r: 6, strokeWidth: 2 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="engagement" 
                  stroke="#82ca9d" 
                  strokeWidth={2}
                  dot={{ strokeWidth: 2 }}
                  activeDot={{ r: 6, strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </Card>

      <div>
        <h2 className="text-lg lg:text-xl font-semibold mb-4 bg-gradient-to-r from-primary/90 to-primary bg-clip-text text-transparent">
          Recent Posts
        </h2>
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {isPostsLoading ? (
            Array(3).fill(0).map((_, i) => (
              <Card key={i} className="p-4 space-y-3">
                <div className="h-6 bg-muted rounded animate-pulse" />
                <div className="h-4 bg-muted rounded w-24 animate-pulse" />
              </Card>
            ))
          ) : (
            recentPosts?.map((post: any) => (
              <Card 
                key={post.id} 
                className="p-4 hover:shadow-lg transition-all duration-200 hover:-translate-y-1 cursor-pointer group"
              >
                <h3 className="font-semibold line-clamp-2 group-hover:text-primary transition-colors">
                  {post.title}
                </h3>
                <p className="text-sm text-muted-foreground mt-2">
                  {new Date(post.createdAt).toLocaleDateString(undefined, { 
                    year: 'numeric', 
                    month: 'short', 
                    day: 'numeric' 
                  })}
                </p>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
