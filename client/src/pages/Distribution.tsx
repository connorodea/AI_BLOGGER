import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Share2, CheckCircle, XCircle, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Post {
  id: number;
  title: string;
  status: string;
  distributions: {
    platform: string;
    status: string;
    url: string;
  }[];
}

export default function Distribution() {
  const { toast } = useToast();
  const { data: posts, isLoading } = useQuery<Post[]>({
    queryKey: ["/api/posts/distributable"],
  });

  const distributeMutation = useMutation({
    mutationFn: async (postId: number) => {
      const res = await fetch(`/api/posts/${postId}/distribute`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Failed to distribute content");
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Distribution started",
        description: "Your content is being distributed to selected platforms",
      });
    },
  });

  const platforms = [
    { id: "twitter", name: "Twitter" },
    { id: "linkedin", name: "LinkedIn" },
    { id: "facebook", name: "Facebook" },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Content Distribution</h1>
        <p className="text-muted-foreground">
          Distribute and manage your content across platforms
        </p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : (
        <div className="space-y-4">
          {posts?.map((post) => (
            <Card key={post.id} className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h2 className="text-xl font-semibold">{post.title}</h2>
                  <p className="text-sm text-muted-foreground">
                    Status: {post.status}
                  </p>
                </div>
                <Button
                  onClick={() => distributeMutation.mutate(post.id)}
                  disabled={distributeMutation.isPending}
                  className="gap-2"
                >
                  <Share2 className="h-4 w-4" />
                  Distribute
                </Button>
              </div>

              <div className="grid grid-cols-3 gap-4">
                {platforms.map((platform) => {
                  const distribution = post.distributions?.find(
                    (d) => d.platform === platform.id
                  );
                  return (
                    <Card
                      key={platform.id}
                      className="p-4 flex items-center justify-between"
                    >
                      <div>
                        <h3 className="font-semibold">{platform.name}</h3>
                        {distribution?.url && (
                          <a
                            href={distribution.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-blue-500 hover:underline"
                          >
                            View Post
                          </a>
                        )}
                      </div>
                      {distribution ? (
                        distribution.status === "success" ? (
                          <CheckCircle className="h-5 w-5 text-green-500" />
                        ) : (
                          <XCircle className="h-5 w-5 text-red-500" />
                        )
                      ) : (
                        <div className="text-sm text-muted-foreground">
                          Not distributed
                        </div>
                      )}
                    </Card>
                  );
                })}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
