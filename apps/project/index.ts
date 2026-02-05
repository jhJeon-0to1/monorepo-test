import { initCore, testFetch } from "@repo/core";

initCore("a");

(async () => {
  try {
    const data = await testFetch();

    document.body.innerText = JSON.stringify(data);
  } catch (error) {
    alert(error.message);
  }
})();
