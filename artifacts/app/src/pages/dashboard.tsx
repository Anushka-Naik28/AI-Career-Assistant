import { useGetDashboardStats, getGetDashboardStatsQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { FileText, Briefcase, Map as MapIcon, Mic, Activity, TrendingUp } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { useGetAtsTrend, getGetAtsTrendQueryKey } from "@workspace/api-client-react";

export default function Dashboard() {
  const { data: stats, isLoading: statsLoading } = useGetDashboardStats({
    query: { enabled: true, queryKey: getGetDashboardStatsQueryKey() }
  });

  const { data: atsTrend, isLoading: trendLoading } = useGetAtsTrend({
    query: { enabled: true, queryKey: getGetAtsTrendQueryKey() }
  });

  if (statsLoading || !stats) {
    return (
      <div className="space-y-6">
        <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-32 w-full rounded-xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Welcome back</h2>
        <p className="text-muted-foreground mt-1">Here is an overview of your career intelligence.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Resumes Analyzed" value={stats.totalResumesAnalyzed} icon={FileText} sub={stats.avgAtsScore ? `Avg ATS: ${stats.avgAtsScore}` : undefined} />
        <StatCard title="Job Matches" value={stats.totalJobMatches} icon={Briefcase} sub={stats.avgMatchScore ? `Avg Match: ${stats.avgMatchScore}%` : undefined} />
        <StatCard title="Mock Interviews" value={stats.totalInterviews} icon={Mic} sub={stats.avgInterviewScore ? `Avg Score: ${stats.avgInterviewScore}` : undefined} />
        <StatCard title="Roadmaps Created" value={stats.totalRoadmaps} icon={MapIcon} sub={stats.careerReadinessScore ? `Readiness: ${stats.careerReadinessScore}/100` : undefined} />
      </div>

      <div className="grid gap-4 md:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>ATS Score Trend</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            {trendLoading ? (
              <Skeleton className="w-full h-full" />
            ) : atsTrend && atsTrend.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={atsTrend}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.1} vertical={false} />
                  <XAxis dataKey="date" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} domain={[0, 100]} />
                  <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' }} />
                  <Line type="monotone" dataKey="score" stroke="hsl(var(--primary))" strokeWidth={2} activeDot={{ r: 8 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-muted-foreground">
                <div className="flex flex-col items-center">
                  <TrendingUp className="h-10 w-10 mb-2 opacity-20" />
                  <p>No trend data available yet.</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats.recentActivity && stats.recentActivity.length > 0 ? (
                stats.recentActivity.map((activity, i) => (
                  <div key={i} className="flex items-center gap-4">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                      <Activity className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{activity.description}</p>
                      <p className="text-xs text-muted-foreground">{new Date(activity.createdAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-muted-foreground text-sm">No recent activity.</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon: Icon, sub }: { title: string, value: number, icon: any, sub?: string }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
      </CardContent>
    </Card>
  );
}
