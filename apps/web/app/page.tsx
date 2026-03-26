import { testFetch } from "@repo/core/api/test";

export default async function Home() {
  const data = await testFetch();

  return <div className={""}>{JSON.stringify(data)}</div>;
}
