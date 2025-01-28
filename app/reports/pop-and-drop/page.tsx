import { getCompanyOrderMetrics } from "@/lib/reports"
import { PopAndDropContent } from "@/components/reports/pop-and-drop-content"

interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export default async function PopAndDropPage(props: PageProps) {
  const searchParams = await props.searchParams;
  const months = Number(searchParams.months) || 6
  const data = await getCompanyOrderMetrics(months)

  return <PopAndDropContent months={months} {...data} />
}
