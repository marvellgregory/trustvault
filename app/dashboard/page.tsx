import { redirect } from "next/navigation";

export default function DashboardPage() {
  redirect("/coming-soon?feature=Dashboard");
}
