import { useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Wand2 } from "lucide-react";

interface ContentEditorProps {
  topic: any;
  content: string;
  onChange: (content: string) => void;
}

export function ContentEditor({ topic, content, onChange }: ContentEditorProps) {
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const res = await fetch("/api/generate/content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic })
      });
      
      if (!res.ok) throw new Error("Failed to generate content");
      
      const data = await res.json();
      onChange(data.content);
    } catch (error) {
      console.error("Error generating content:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold">{topic.title}</h2>
          <p className="text-sm text-muted-foreground">
            Keywords: {topic.keywords.join(", ")}
          </p>
        </div>
        <Button 
          onClick={handleGenerate}
          disabled={isGenerating}
          className="gap-2"
        >
          <Wand2 className="h-4 w-4" />
          Generate Content
        </Button>
      </div>

      <Textarea
        value={content}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Start writing your content here..."
        className="min-h-[500px] font-mono"
      />
    </div>
  );
}
