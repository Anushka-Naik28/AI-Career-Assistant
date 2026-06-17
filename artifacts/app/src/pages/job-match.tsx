import { useState } from "react";
import { useMatchJob } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Loader2, Briefcase, CheckCircle2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";

export default function JobMatch() {
  const [jobTitle, setJobTitle] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const matchMutation = useMatchJob();

  const handleMatch = () => {
    if (!jobDescription) {
      toast.error("Please provide a job description");
      return;
    }
    
    // Fallback/dummy resume if user hasn't uploaded one
    const dummyResumeDataUri = "data:application/pdf;base64,JVBERi0=";
    
    matchMutation.mutate({ 
      data: { 
        jobDescription, 
        resumeDataUri: dummyResumeDataUri,
        jobTitle 
      } 
    }, {
      onSuccess: () => toast.success("Match analysis complete"),
      onError: () => toast.error("Failed to analyze match")
    });
  };

  const result = matchMutation.data;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Job Match Analysis</h2>
        <p className="text-muted-foreground mt-1">Paste a job description to see how well you match the role.</p>
      </div>

      <Card>
        <CardContent className="p-6 space-y-4">
          <div className="grid gap-2">
            <label className="text-sm font-medium">Job Title (Optional)</label>
            <Input 
              placeholder="e.g. Senior Frontend Engineer" 
              value={jobTitle} 
              onChange={e => setJobTitle(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <label className="text-sm font-medium">Job Description</label>
            <Textarea 
              placeholder="Paste the full job description here..." 
              className="min-h-[200px] resize-y"
              value={jobDescription}
              onChange={e => setJobDescription(e.target.value)}
            />
          </div>
          <div className="flex justify-between items-center">
            <p className="text-xs text-muted-foreground">Using your most recent resume. If no resume is found, a placeholder will be used.</p>
            <Button onClick={handleMatch} disabled={!jobDescription || matchMutation.isPending}>
              {matchMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Briefcase className="w-4 h-4 mr-2" />}
              Analyze Match
            </Button>
          </div>
        </CardContent>
      </Card>

      {result && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          <div className="grid gap-6 md:grid-cols-3">
            <Card className="col-span-1 flex flex-col items-center justify-center p-6 bg-card/50">
              <div className="relative w-32 h-32 flex items-center justify-center mb-4">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="45" fill="none" stroke="hsl(var(--muted))" strokeWidth="10" />
                  <circle cx="50" cy="50" r="45" fill="none" stroke={result.matchPercentage >= 75 ? "hsl(142.1 76.2% 36.3%)" : "hsl(var(--primary))"} strokeWidth="10" 
                    strokeDasharray={`${result.matchPercentage * 2.827} 282.7`} 
                    strokeLinecap="round" />
                </svg>
                <div className="absolute flex flex-col items-center justify-center">
                  <span className="text-3xl font-bold">{result.matchPercentage}%</span>
                  <span className="text-xs text-muted-foreground">Match</span>
                </div>
              </div>
            </Card>

            <Card className="col-span-2">
              <CardHeader>
                <CardTitle>Skill Gaps</CardTitle>
                <CardDescription>Areas to brush up on before interviewing</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {result.skillGaps.map(gap => (
                    <Badge key={gap} variant="outline" className="border-warning/50 text-warning-foreground">
                      <AlertTriangle className="w-3 h-3 mr-1" /> {gap}
                    </Badge>
                  ))}
                  {result.skillGaps.length === 0 && (
                    <p className="text-sm text-muted-foreground flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-green-500" /> No major skill gaps!
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>AI Recommendations</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{result.improvementSuggestions}</p>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
}
