import RecommendationClient from "@/components/dashboard/recommendation-client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Lightbulb } from "lucide-react";

export default function RecommendationsPage() {
  return (
    <div className="grid gap-8">
       <div>
        <h1 className="text-3xl font-bold font-headline tracking-tight flex items-center gap-2">
          <Lightbulb className="w-8 h-8 text-primary" />
          Infrastructure Recommendations
        </h1>
        <p className="text-muted-foreground">Let our AI assistant help you choose the best infrastructure for your app.</p>
      </div>
      <RecommendationClient />
    </div>
  );
}
