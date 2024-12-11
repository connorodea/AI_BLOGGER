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

      <div className="grid grid-cols-4 gap-4">
        <Card className="p-6">
          <h3 className="font-semibold text-muted-foreground">Total Posts</h3>
          <p className="text-3xl font-bold">{stats?.totalPosts || 0}</p>
        </Card>
        <Card className="p-6">
          <h3 className="font-semibold text-muted-foreground">Published</h3>
          <p className="text-3xl font-bold">{stats?.publishedPosts || 0}</p>
        </Card>
        <Card className="p-6">
          <h3 className="font-semibold text-muted-foreground">Total Views</h3>
          <p className="text-3xl font-bold">{stats?.totalViews || 0}</p>
        </Card>
        <Card className="p-6">
          <h3 className="font-semibold text-muted-foreground">Revenue</h3>
          <p className="text-3xl font-bold">${stats?.totalRevenue || 0}</p>
        </Card>
      </div>

      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Performance Overview</h2>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={stats?.performanceData || []}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="views" stroke="#8884d8" />
              <Line type="monotone" dataKey="engagement" stroke="#82ca9d" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <div>
        <h2 className="text-xl font-semibold mb-4">Recent Posts</h2>
        <div className="space-y-4">
          {recentPosts?.map((post: any) => (
            <Card key={post.id} className="p-4">
              <h3 className="font-semibold">{post.title}</h3>
              <p className="text-sm text-muted-foreground">
                {new Date(post.createdAt).toLocaleDateString()}
              </p>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
