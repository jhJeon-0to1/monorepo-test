import { api } from "@repo/core-next/server";

export default async function Home() {
  const data = await api.testFetch();

  return <div className={""}>{JSON.stringify(data)}</div>;
}
