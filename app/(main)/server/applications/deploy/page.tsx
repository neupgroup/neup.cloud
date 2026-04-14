import { Metadata } from "next";

import { DeployApplicationPage } from "@/services/applications/deploy-page";

export const metadata: Metadata = {
    title: "Deploy Application, Neup.Cloud",
};

export default function Page() {
    return <DeployApplicationPage />;
}
