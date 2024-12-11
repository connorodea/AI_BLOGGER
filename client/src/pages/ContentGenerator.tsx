import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { TopicResearch } from "@/components/TopicResearch";
import { ContentEditor } from "@/components/ContentEditor";
import { SEOPanel } from "@/components/SEOPanel";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

export default function ContentGenerator() {
  const [step, setStep] = useState<'research' | 'write' | 'optimize'>('research');
  const [selectedTopic, setSelectedTopic] = useState<any>(null);
  const [content, setContent] = useState<string>("");
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const generateMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch("/api/posts/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      });
      if (!res.ok) throw new Error("Failed to generate content");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/posts"] });
      toast({
        title: "Content generated successfully",
        description: "Your post has been created and saved as draft"
      });
    }
  });

  const handleTopicSelect = (topic: any) => {
    setSelectedTopic(topic);
    setStep('write');
  };

  const handleContentUpdate = (newContent: string) => {
    setContent(newContent);
  };

  const handleGenerate = async () => {
    await generateMutation.mutateAsync({
      topic: selectedTopic,
      content,
    });
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold bg-gradient-to-r from-primary/90 to-primary bg-clip-text text-transparent">
          Content Generator
        </h1>
        <p className="text-muted-foreground">Create AI-powered content</p>
      </div>

      <div className="flex gap-6">
        <Button
          variant={step === 'research' ? 'default' : 'ghost'}
          onClick={() => setStep('research')}
          className={`flex-1 h-12 text-lg transition-all duration-300 ${
            step === 'research' ? 'shadow-lg' : ''
          }`}
          size="lg"
        >
          1. Research
        </Button>
        <Button
          variant={step === 'write' ? 'default' : 'ghost'}
          onClick={() => setStep('write')}
          disabled={!selectedTopic}
          className={`flex-1 h-12 text-lg transition-all duration-300 ${
            step === 'write' ? 'shadow-lg' : ''
          }`}
          size="lg"
        >
          2. Write
        </Button>
        <Button
          variant={step === 'optimize' ? 'default' : 'ghost'}
          onClick={() => setStep('optimize')}
          disabled={!content}
          className={`flex-1 h-12 text-lg transition-all duration-300 ${
            step === 'optimize' ? 'shadow-lg' : ''
          }`}
          size="lg"
        >
          3. Optimize
        </Button>
      </div>

      <Card className="p-6 hover:shadow-lg transition-all duration-200">
        {step === 'research' && (
          <TopicResearch onSelect={handleTopicSelect} />
        )}
        {step === 'write' && (
          <ContentEditor 
            topic={selectedTopic}
            content={content}
            onChange={handleContentUpdate}
          />
        )}
        {step === 'optimize' && (
          <SEOPanel content={content} onChange={handleContentUpdate} />
        )}
      </Card>

      <div className="flex justify-end">
        <Button 
          onClick={handleGenerate}
          disabled={!content || generateMutation.isPending}
          className="gap-2 min-w-[200px] h-12"
          size="lg"
        >
          {generateMutation.isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Generating...
            </>
          ) : (
            'Generate Post'
          )}
        </Button>
      </div>
    </div>
  );
}
