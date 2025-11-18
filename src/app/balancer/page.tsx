import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function BalancerPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-headline">Load Balancer</CardTitle>
        <CardDescription>
          Manage and configure your load balancers.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p>Load balancer configuration will be available here.</p>
      </CardContent>
    </Card>
  );
}