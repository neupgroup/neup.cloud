import { Metadata } from "next";

import { ApplicationsPage } from "@/components/applications/list-page";

export const metadata: Metadata = {
    title: "Applications, Neup.Cloud",
};

export default function Page() {
    return <ApplicationsPage />;
}
 
