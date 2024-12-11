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
        <h1 className="text-3xl font-bold bg-gradient-to-r from-primary/90 to-primary bg-clip-text text-transparent">
          Content Distribution
        </h1>
        <p className="text-muted-foreground">
          Distribute and manage your content across platforms
        </p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="space-y-6">
          {posts?.map((post) => (
            <Card 
              key={post.id} 
              className="p-6 hover:shadow-lg transition-all duration-200 border border-border/50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60"
            >
              <div className="flex flex-col lg:flex-row justify-between lg:items-center gap-4 mb-6">
                <div>
                  <h2 className="text-xl font-semibold bg-gradient-to-r from-primary/90 to-primary bg-clip-text text-transparent">
                    {post.title}
                  </h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Status: {post.status}
                  </p>
                </div>
                <Button
                  onClick={() => distributeMutation.mutate(post.id)}
                  disabled={distributeMutation.isPending}
                  className="gap-2 w-full lg:w-auto"
                  size="lg"
                >
                  {distributeMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Share2 className="h-4 w-4" />
                  )}
                  Distribute
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {platforms.map((platform) => {
                  const distribution = post.distributions?.find(
                    (d) => d.platform === platform.id
                  );
                  const isSuccess = distribution?.status === "success";
                  const isPending = distribution?.status === "pending";
                  
                  return (
                    <Card
                      key={platform.id}
                      className={`p-6 flex items-center justify-between transition-all duration-200 hover:shadow-md ${
                        isSuccess ? 'bg-green-500/5' : 
                        distribution ? 'bg-red-500/5' : 
                        'hover:border-primary/50'
                      }`}
                    >
                      <div className="space-y-2">
                        <h3 className="font-semibold text-lg">{platform.name}</h3>
                        {distribution?.url ? (
                          <a
                            href={distribution.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-primary hover:underline inline-flex items-center gap-1"
                          >
                            View Post
                            <Share2 className="h-3 w-3" />
                          </a>
                        ) : (
                          <p className="text-sm text-muted-foreground">
                            {isPending ? "Distribution in progress..." : "Not distributed"}
                          </p>
                        )}
                      </div>
                      {distribution ? (
                        isPending ? (
                          <Loader2 className="h-5 w-5 animate-spin text-primary" />
                        ) : isSuccess ? (
                          <CheckCircle className="h-6 w-6 text-green-500" />
                        ) : (
                          <XCircle className="h-6 w-6 text-red-500" />
                        )
                      ) : (
                        <div className="h-6 w-6 rounded-full border-2 border-muted-foreground/30" />
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
