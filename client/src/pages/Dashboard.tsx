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
  const { data: stats } = useQuery({
    queryKey: ["/api/dashboard/stats"],
  });

  const { data: recentPosts } = useQuery({
    queryKey: ["/api/posts/recent"],
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">Overview of your blog automation</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 lg:p-6">
          <h3 className="text-sm font-semibold text-muted-foreground">Total Posts</h3>
          <p className="text-2xl lg:text-3xl font-bold mt-2">{stats?.totalPosts || 0}</p>
        </Card>
        <Card className="p-4 lg:p-6">
          <h3 className="text-sm font-semibold text-muted-foreground">Published</h3>
          <p className="text-2xl lg:text-3xl font-bold mt-2">{stats?.publishedPosts || 0}</p>
        </Card>
        <Card className="p-4 lg:p-6">
          <h3 className="text-sm font-semibold text-muted-foreground">Total Views</h3>
          <p className="text-2xl lg:text-3xl font-bold mt-2">{stats?.totalViews || 0}</p>
        </Card>
        <Card className="p-4 lg:p-6">
          <h3 className="text-sm font-semibold text-muted-foreground">Revenue</h3>
          <p className="text-2xl lg:text-3xl font-bold mt-2">${stats?.totalRevenue || 0}</p>
        </Card>
      </div>

      <Card className="p-4 lg:p-6">
        <h2 className="text-lg lg:text-xl font-semibold mb-4">Performance Overview</h2>
        <div className="h-[250px] lg:h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={stats?.performanceData || []}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="date"
                tick={{ fontSize: 12 }}
                tickFormatter={(value) => new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
              />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Line type="monotone" dataKey="views" stroke="#8884d8" strokeWidth={2} />
              <Line type="monotone" dataKey="engagement" stroke="#82ca9d" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <div>
        <h2 className="text-lg lg:text-xl font-semibold mb-4">Recent Posts</h2>
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {recentPosts?.map((post: any) => (
            <Card key={post.id} className="p-4 hover:border-primary/50 transition-colors">
              <h3 className="font-semibold line-clamp-2">{post.title}</h3>
              <p className="text-sm text-muted-foreground mt-2">
                {new Date(post.createdAt).toLocaleDateString(undefined, { 
                  year: 'numeric', 
                  month: 'short', 
                  day: 'numeric' 
                })}
              </p>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
