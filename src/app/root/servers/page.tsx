import { Metadata } from "next";
import ClientPage from "./client-page";

export const metadata: Metadata = {
    title: "Root Servers, Neup.Cloud",
};

export default function Page() {
    return <ClientPage />;
}
