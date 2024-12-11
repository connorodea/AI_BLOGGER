import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Check, X } from "lucide-react";

interface SEOPanelProps {
  content: string;
  onChange: (content: string) => void;
}

export function SEOPanel({ content, onChange }: SEOPanelProps) {
  const [score, setScore] = useState(0);
  const [suggestions, setSuggestions] = useState<string[]>([]);

  useEffect(() => {
    analyzeSEO();
  }, [content]);

  const analyzeSEO = async () => {
    try {
      const res = await fetch("/api/seo/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content })
      });
      
      if (!res.ok) throw new Error("Failed to analyze SEO");
      
      const data = await res.json();
      setScore(data.score);
      setSuggestions(data.suggestions);
    } catch (error) {
      console.error("Error analyzing SEO:", error);
    }
  };

  const handleOptimize = async () => {
    try {
      const res = await fetch("/api/seo/optimize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content })
      });
      
      if (!res.ok) throw new Error("Failed to optimize content");
      
      const data = await res.json();
      onChange(data.optimizedContent);
    } catch (error) {
      console.error("Error optimizing content:", error);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <div className="flex justify-between items-center mb-2">
          <h3 className="font-semibold">SEO Score</h3>
          <span className="text-2xl font-bold">{score}%</span>
        </div>
        <Progress value={score} />
      </div>

      <div className="space-y-4">
        <h3 className="font-semibold">Suggestions</h3>
        {suggestions.map((suggestion, index) => (
          <Card key={index} className="p-4 flex items-center gap-4">
            {score >= 80 ? (
              <Check className="h-5 w-5 text-green-500" />
            ) : (
              <X className="h-5 w-5 text-red-500" />
            )}
            <p>{suggestion}</p>
          </Card>
        ))}
      </div>

      <div className="flex justify-end">
        <Button onClick={handleOptimize}>
          Optimize Content
        </Button>
      </div>
    </div>
  );
}
