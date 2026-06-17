import { useState } from "react";
import { useGenerateRoadmap } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, MapIcon, Compass, BookOpen, Award } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";

const ROLES = [
  "Frontend Developer",
  "Full Stack Developer",
  "AI Engineer",
  "Data Analyst",
  "Blockchain Developer"
];

export default function Roadmap() {
  const [targetRole, setTargetRole] = useState("");
  const generateMutation = useGenerateRoadmap();

  const handleGenerate = (): void => {
    if (!targetRole) { toast.error("Please select a role"); return; }
    generateMutation.mutate({ data: { targetRole } }, {
      onSuccess: () => toast.success("Roadmap generated"),
      onError: () => toast.error("Failed to generate roadmap")
    });
  };

  const result = generateMutation.data;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Career Roadmap</h2>
          <p className="text-muted-foreground mt-1">Select a target role to generate a custom learning and growth path.</p>
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
          <Select value={targetRole} onValueChange={setTargetRole}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Select target role" />
            </SelectTrigger>
            <SelectContent>
              {ROLES.map(role => (
                <SelectItem key={role} value={role}>{role}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={handleGenerate} disabled={!targetRole || generateMutation.isPending}>
            {generateMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <MapIcon className="w-4 h-4 mr-2" />}
            Generate
          </Button>
        </div>
      </div>

      {!result && !generateMutation.isPending && (
        <Card className="border-dashed bg-muted/10 h-[300px] flex items-center justify-center">
          <div className="text-center flex flex-col items-center">
            <Compass className="w-12 h-12 text-muted-foreground mb-4 opacity-50" />
            <h3 className="text-lg font-medium text-muted-foreground">Select a role to plot your course</h3>
          </div>
        </Card>
      )}

      {generateMutation.isPending && (
        <div className="flex flex-col items-center justify-center h-[300px] space-y-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground animate-pulse">Calculating optimal career trajectory...</p>
        </div>
      )}

      {result && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
          <Card>
            <CardHeader>
              <CardTitle>{result.targetRole}</CardTitle>
              <CardDescription>{result.timelineSummary}</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm">{result.overview}</p>
              <div className="mt-6 flex flex-wrap gap-2">
                {result.skills.map(skill => (
                  <Badge key={skill} variant="secondary">{skill}</Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-6">
              <h3 className="text-xl font-bold flex items-center gap-2"><BookOpen className="w-5 h-5 text-primary" /> Milestones</h3>
              <div className="space-y-4 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-border before:to-transparent">
                {result.milestones.map((ms, i) => (
                  <div key={i} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full border border-primary bg-background text-primary shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10 shadow-sm">
                      <span className="text-sm font-bold">{i+1}</span>
                    </div>
                    <Card className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4">
                      <h4 className="font-semibold text-sm mb-1">{ms.name}</h4>
                      <p className="text-xs text-muted-foreground mb-2">{ms.durationWeeks} weeks</p>
                      <p className="text-xs">{ms.description}</p>
                    </Card>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-6">
              <h3 className="text-xl font-bold flex items-center gap-2"><Award className="w-5 h-5 text-primary" /> Certifications & Projects</h3>
              <div className="space-y-4">
                {result.certifications.map((cert, i) => (
                  <Card key={`cert-${i}`}>
                    <CardContent className="p-4">
                      <h4 className="font-semibold text-sm">{cert.name}</h4>
                      <p className="text-xs text-muted-foreground mb-2">{cert.provider}</p>
                      <p className="text-xs">{cert.description}</p>
                    </CardContent>
                  </Card>
                ))}
                {result.projects.map((proj, i) => (
                  <Card key={`proj-${i}`} className="border-primary/20 bg-primary/5">
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start mb-1">
                        <h4 className="font-semibold text-sm">{proj.name}</h4>
                        <Badge variant="outline" className="text-[10px]">{proj.difficulty}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mb-3">{proj.description}</p>
                      <div className="flex flex-wrap gap-1">
                        {proj.techStack.map(tech => <Badge key={tech} variant="secondary" className="text-[10px]">{tech}</Badge>)}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
