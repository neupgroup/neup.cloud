import { Metadata } from "next";
import ClientPage from "./client-page";

export const metadata: Metadata = {
    title: "Connect Domain, Neup.Cloud",
};

export default function Page() {
    return <ClientPage />;
}
