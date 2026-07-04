import { redirect } from "next/navigation";
import { getCurrentAdmin } from "@/server/auth/current-admin";

export default async function Home() {
  const admin = await getCurrentAdmin();
  redirect(admin ? "/drivers" : "/login");
}
