import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Search, Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

interface TopicResearchProps {
  onSelect: (topic: any) => void;
}

export function TopicResearch({ onSelect }: TopicResearchProps) {
  const [niche, setNiche] = useState("");

  const { data: topics, isLoading, refetch } = useQuery({
    queryKey: ["/api/topics", niche],
    enabled: false
  });

  const handleSearch = () => {
    if (niche) {
      refetch();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex gap-2">
        <Input
          value={niche}
          onChange={(e) => setNiche(e.target.value)}
          placeholder="Enter your niche (e.g., technology, health, business)"
        />
        <Button onClick={handleSearch} disabled={isLoading} className="gap-2">
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Search className="h-4 w-4" />
          )}
          Research Topics
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {topics?.map((topic: any) => (
          <Card
            key={topic.id}
            className="p-4 cursor-pointer hover:border-primary transition-colors"
            onClick={() => onSelect(topic)}
          >
            <h3 className="font-semibold">{topic.title}</h3>
            <p className="text-sm text-muted-foreground">
              Score: {topic.score}
            </p>
            <div className="mt-2 flex flex-wrap gap-1">
              {topic.keywords.map((keyword: string) => (
                <span
                  key={keyword}
                  className="bg-secondary px-2 py-1 rounded-full text-xs"
                >
                  {keyword}
                </span>
              ))}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
