import { testFetch } from "@repo/core-next/server";

export default async function Home() {
  const data = await testFetch();

  return <div className={""}>{JSON.stringify(data)}</div>;
}
