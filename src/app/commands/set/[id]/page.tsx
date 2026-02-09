import { Metadata } from "next";
import ClientPage from "./client-page";

export const metadata: Metadata = {
    title: "Command Set Details, Neup.Cloud",
};

export default function Page() {
    return <ClientPage />;
}
