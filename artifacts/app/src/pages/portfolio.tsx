import { useState } from "react";
import { useGeneratePortfolio } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, FileCode2, Copy } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";

export default function Portfolio() {
  const [targetRole, setTargetRole] = useState("");
  const [userProfile, setUserProfile] = useState("");
  const generateMutation = useGeneratePortfolio();

  const handleGenerate = () => {
    if (!targetRole || !userProfile) {
      toast.error("Please fill all fields");
      return;
    }
    const dummyResumeDataUri = "data:application/pdf;base64,JVBERi0=";
    generateMutation.mutate({
      data: { resumeDataUri: dummyResumeDataUri, userProfile, targetRole }
    }, {
      onSuccess: () => toast.success("Portfolio content generated!"),
      onError: () => toast.error("Failed to generate content")
    });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  const result = generateMutation.data;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Portfolio Generator</h2>
        <p className="text-muted-foreground mt-1">Generate professional copy for your LinkedIn and portfolio site.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="col-span-1 h-fit">
          <CardHeader>
            <CardTitle>Input Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Target Role</label>
              <Input placeholder="e.g. Senior Frontend Engineer" value={targetRole} onChange={e => setTargetRole(e.target.value)} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Brief Profile / Key Achievements</label>
              <Textarea 
                placeholder="I have 5 years experience in React..." 
                className="min-h-[150px] resize-y"
                value={userProfile}
                onChange={e => setUserProfile(e.target.value)}
              />
            </div>
            <Button className="w-full" onClick={handleGenerate} disabled={generateMutation.isPending || !targetRole}>
              {generateMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <FileCode2 className="w-4 h-4 mr-2" />}
              Generate Copy
            </Button>
          </CardContent>
        </Card>

        <div className="col-span-2">
          {!result ? (
            <Card className="h-full border-dashed bg-muted/10 flex flex-col items-center justify-center min-h-[400px] text-center p-8">
              <FileCode2 className="w-12 h-12 text-muted-foreground opacity-20 mb-4" />
              <h3 className="text-lg font-medium text-muted-foreground">No content generated yet</h3>
              <p className="text-sm text-muted-foreground/60 max-w-sm mt-2">Fill in your details and click generate to get highly optimized LinkedIn and portfolio copy.</p>
            </Card>
          ) : (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <Tabs defaultValue="linkedin">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="linkedin">LinkedIn</TabsTrigger>
                  <TabsTrigger value="bio">Professional Bio</TabsTrigger>
                  <TabsTrigger value="projects">Projects</TabsTrigger>
                </TabsList>
                
                <TabsContent value="linkedin" className="space-y-4 mt-4">
                  <Card>
                    <CardHeader className="pb-3">
                      <div className="flex justify-between items-start">
                        <CardTitle className="text-base">Headline</CardTitle>
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => copyToClipboard(result.linkedInHeadline)}><Copy className="h-3 w-3" /></Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm">{result.linkedInHeadline}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-3">
                      <div className="flex justify-between items-start">
                        <CardTitle className="text-base">About Summary</CardTitle>
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => copyToClipboard(result.linkedInSummary)}><Copy className="h-3 w-3" /></Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm whitespace-pre-wrap">{result.linkedInSummary}</p>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="bio" className="mt-4">
                  <Card>
                    <CardHeader className="pb-3">
                      <div className="flex justify-between items-start">
                        <CardTitle className="text-base">Website Bio</CardTitle>
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => copyToClipboard(result.professionalBio)}><Copy className="h-3 w-3" /></Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm whitespace-pre-wrap">{result.professionalBio}</p>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="projects" className="space-y-4 mt-4">
                  {result.projectDescriptions.map((desc, i) => (
                    <Card key={i}>
                      <CardHeader className="pb-3">
                        <div className="flex justify-between items-start">
                          <CardTitle className="text-base">Project Idea {i+1}</CardTitle>
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => copyToClipboard(desc)}><Copy className="h-3 w-3" /></Button>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm whitespace-pre-wrap">{desc}</p>
                      </CardContent>
                    </Card>
                  ))}
                </TabsContent>
              </Tabs>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
