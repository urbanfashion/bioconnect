import { createFileRoute } from "@tanstack/react-router";
import { VenueApp } from "@/components/venue/venue-app";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  return <VenueApp />;
}
