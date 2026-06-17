import { useState } from "react";
import { useAnalyzeResume, useGetResumeHistory, getGetResumeHistoryQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { FileText, UploadCloud, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";

export default function Resume() {
  const [file, setFile] = useState<File | null>(null);
  const analyzeMutation = useAnalyzeResume();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleAnalyze = () => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUri = e.target?.result as string;
      analyzeMutation.mutate({ data: { resumeDataUri: dataUri, filename: file.name } }, {
        onSuccess: () => {
          toast.success("Resume analyzed successfully");
        },
        onError: () => {
          toast.error("Failed to analyze resume");
        }
      });
    };
    reader.readAsDataURL(file);
  };

  const result = analyzeMutation.data;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Resume Intelligence</h2>
        <p className="text-muted-foreground mt-1">Upload your resume to get an instant ATS score and actionable feedback.</p>
      </div>

      {!result ? (
        <Card className="border-dashed border-2 bg-muted/20">
          <CardContent className="flex flex-col items-center justify-center p-12 text-center h-[400px]">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-4">
              <UploadCloud className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Upload your resume</h3>
            <p className="text-sm text-muted-foreground mb-6 max-w-sm">
              We accept PDF files. Our AI will analyze your experience, skills, and formatting against standard ATS systems.
            </p>
            <div className="flex items-center gap-4">
              <Input type="file" accept=".pdf" className="max-w-[250px]" onChange={handleFileChange} />
              <Button onClick={handleAnalyze} disabled={!file || analyzeMutation.isPending}>
                {analyzeMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <FileText className="w-4 h-4 mr-2" />}
                Analyze
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          <div className="grid gap-6 md:grid-cols-3">
            <Card className="col-span-1 flex flex-col items-center justify-center p-6 bg-card/50">
              <div className="relative w-32 h-32 flex items-center justify-center mb-4">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="45" fill="none" stroke="hsl(var(--muted))" strokeWidth="10" />
                  <circle cx="50" cy="50" r="45" fill="none" stroke="hsl(var(--primary))" strokeWidth="10" 
                    strokeDasharray={`${result.atsScore * 2.827} 282.7`} 
                    strokeLinecap="round" />
                </svg>
                <div className="absolute flex flex-col items-center justify-center">
                  <span className="text-3xl font-bold">{result.atsScore}</span>
                  <span className="text-xs text-muted-foreground">ATS Score</span>
                </div>
              </div>
              <Button variant="outline" onClick={() => analyzeMutation.reset()} className="w-full">
                Upload New Resume
              </Button>
            </Card>

            <Card className="col-span-2">
              <CardHeader>
                <CardTitle>Keyword Gaps</CardTitle>
                <CardDescription>Missing keywords that might hold you back</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {result.keywordGaps.map(gap => (
                    <Badge key={gap} variant="secondary" className="bg-destructive/10 text-destructive border-destructive/20">
                      {gap}
                    </Badge>
                  ))}
                  {result.keywordGaps.length === 0 && (
                    <p className="text-sm text-muted-foreground flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-green-500" /> No major keyword gaps found!
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Improvement Suggestions</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {result.improvementSuggestions.map((sug, i) => (
                  <li key={i} className="flex gap-3 text-sm">
                    <AlertCircle className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                    <span>{sug}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Extracted Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-semibold mb-2">Skills</h4>
                  <div className="flex flex-wrap gap-2">
                    {result.extractedInfo.skills.map(skill => (
                      <Badge key={skill} variant="outline">{skill}</Badge>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
}
