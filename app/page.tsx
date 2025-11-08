import { redirect } from "next/navigation";

// simplest version: always send to /join
export default function Root() {
  redirect("/join");
}