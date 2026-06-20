import { EventCommandCentre } from "../../../features/events/event-command-centre";

type EventPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function EventPage({ params }: EventPageProps) {
  const { id } = await params;

  return <EventCommandCentre eventId={id} />;
}
