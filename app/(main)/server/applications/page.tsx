import { Metadata } from "next";

import { ApplicationsPage } from "@/services/applications/list-page";

export const metadata: Metadata = {
    title: "Applications, Neup.Cloud",
};

export default function Page() {
    return <ApplicationsPage />;
}
 
