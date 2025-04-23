import { redirect } from "next/navigation";

export default async function LegacyPeopleChannelPage(
  props: {
    params: Promise<{ channelId: string }>;
    searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
  }
) {
  const searchParams = await props.searchParams;
  const params = await props.params;
  const channelId = params.channelId;
  
  // Handle search params safely for date range
  const range = searchParams && searchParams.range
    ? Array.isArray(searchParams.range)
      ? searchParams.range[0]
      : searchParams.range
    : "last-12-months";

  // Redirect to the new path structure
  redirect(`/people/channel/${channelId}?range=${range}`);
}
