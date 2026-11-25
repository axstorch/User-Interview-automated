import { notFound } from "next/navigation";
import { findInterview, interviews } from "@/lib/data";
import { InterviewDetail } from "@/components/InterviewDetail";

export function generateStaticParams() {
  return interviews.map((i) => ({ id: i.id }));
}

export function generateMetadata({ params }: { params: { id: string } }) {
  const i = findInterview(decodeURIComponent(params.id));
  return { title: i ? `${i.interviewee.name} · Interview Insights` : "Interview Insights" };
}

export default function Page({ params }: { params: { id: string } }) {
  const interview = findInterview(decodeURIComponent(params.id));
  if (!interview) notFound();
  return <InterviewDetail id={interview.id} />;
}
