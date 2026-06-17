import { useState, useRef, useEffect } from "react";
import { useStartInterview, useSubmitAnswer } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Mic, Send, MessageSquare, PlayCircle } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

type Message = { role: 'ai' | 'user', content: string, score?: number, feedback?: string };

export default function Interview() {
  const [role, setRole] = useState("Software Engineer");
  const [level, setLevel] = useState("Mid-level");
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [questionCount, setQuestionCount] = useState(1);
  const [isComplete, setIsComplete] = useState(false);
  const [finalScore, setFinalScore] = useState<number | null>(null);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const startMutation = useStartInterview();
  const submitMutation = useSubmitAnswer();

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleStart = () => {
    startMutation.mutate({ data: { role, experienceLevel: level } }, {
      onSuccess: (data) => {
        setSessionId(data.id);
        setMessages([{ role: 'ai', content: data.firstQuestion }]);
        setQuestionCount(1);
        setIsComplete(false);
        toast.success("Interview started!");
      }
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || !sessionId || isComplete || submitMutation.isPending) return;

    const userMsg = inputValue;
    setInputValue("");
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);

    const previousQuestion = messages[messages.length - 1].content;

    submitMutation.mutate({
      sessionId,
      data: { answer: userMsg, questionNumber: questionCount, previousQuestion }
    }, {
      onSuccess: (data) => {
        setMessages(prev => {
          const newMsgs = [...prev];
          // update user message with score and feedback
          newMsgs[newMsgs.length - 1] = {
            ...newMsgs[newMsgs.length - 1],
            score: data.score ?? undefined,
            feedback: data.feedback ?? undefined
          };
          // add AI's next question or conclusion
          if (data.nextQuestion) {
            newMsgs.push({ role: 'ai', content: data.nextQuestion });
          } else if (data.concludingRemarks) {
            newMsgs.push({ role: 'ai', content: data.concludingRemarks });
          }
          return newMsgs;
        });

        if (data.isComplete) {
          setIsComplete(true);
          setFinalScore(data.overallScore ?? null);
          toast.success("Interview complete!");
        } else {
          setQuestionCount(prev => prev + 1);
        }
      }
    });
  };

  if (!sessionId) {
    return (
      <div className="max-w-2xl mx-auto flex flex-col items-center justify-center min-h-[60vh] space-y-6">
        <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center text-primary mb-2">
          <Mic className="w-8 h-8" />
        </div>
        <h2 className="text-3xl font-bold tracking-tight text-center">Mock Interview</h2>
        <p className="text-muted-foreground text-center max-w-md">
          Practice interviewing with our AI recruiter. Get real-time feedback on your answers and an overall score.
        </p>
        
        <Card className="w-full">
          <CardContent className="p-6 space-y-4">
            <div className="grid gap-2">
              <label className="text-sm font-medium">Target Role</label>
              <Input value={role} onChange={e => setRole(e.target.value)} placeholder="e.g. Product Manager" />
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium">Experience Level</label>
              <Input value={level} onChange={e => setLevel(e.target.value)} placeholder="e.g. Junior, Mid-level, Senior" />
            </div>
            <Button className="w-full mt-4" onClick={handleStart} disabled={!role || !level || startMutation.isPending}>
              {startMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <PlayCircle className="w-4 h-4 mr-2" />}
              Start Interview
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto h-[calc(100vh-10rem)] flex flex-col">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h2 className="text-xl font-bold">Interviewing for {role}</h2>
          <p className="text-sm text-muted-foreground">{level} Level • Question {questionCount}</p>
        </div>
        {isComplete && finalScore !== null && (
          <Badge className="text-lg py-1 px-3 bg-primary text-primary-foreground">Final Score: {finalScore}/100</Badge>
        )}
      </div>

      <Card className="flex-1 flex flex-col overflow-hidden border-border/50">
        <ScrollArea className="flex-1 p-4" ref={scrollRef}>
          <div className="space-y-6">
            <AnimatePresence initial={false}>
              {messages.map((msg, i) => (
                <motion.div 
                  key={i} 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${msg.role === 'ai' ? 'justify-start' : 'justify-end'}`}
                >
                  <div className={`max-w-[80%] rounded-xl p-4 ${msg.role === 'ai' ? 'bg-muted/50 border border-border/50' : 'bg-primary text-primary-foreground'}`}>
                    <div className="flex items-start gap-3">
                      {msg.role === 'ai' && <MessageSquare className="w-5 h-5 shrink-0 mt-0.5 opacity-70" />}
                      <div className="space-y-2 w-full">
                        <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                        
                        {msg.score !== undefined && (
                          <div className="mt-3 p-3 rounded-lg bg-background/20 border border-background/10 space-y-1">
                            <div className="flex justify-between items-center">
                              <span className="text-xs font-medium opacity-80">Feedback</span>
                              <Badge variant="secondary" className="text-xs bg-background/30">{msg.score}/10</Badge>
                            </div>
                            <p className="text-xs opacity-90">{msg.feedback}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
              {submitMutation.isPending && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
                  <div className="bg-muted/50 border border-border/50 rounded-xl p-4 flex gap-2 items-center">
                    <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Evaluating...</span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </ScrollArea>
        
        {!isComplete && (
          <CardFooter className="p-4 border-t border-border bg-card">
            <form onSubmit={handleSubmit} className="flex w-full gap-2">
              <Input 
                value={inputValue} 
                onChange={e => setInputValue(e.target.value)} 
                placeholder="Type your answer..." 
                className="flex-1 bg-background"
                disabled={submitMutation.isPending}
              />
              <Button type="submit" disabled={!inputValue.trim() || submitMutation.isPending}>
                <Send className="w-4 h-4" />
              </Button>
            </form>
          </CardFooter>
        )}
      </Card>
    </div>
  );
}
