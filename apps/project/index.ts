import { type AppError, initCore } from "@repo/core";
import { testFetch } from "@repo/core/api/test";

initCore("a");

(async () => {
  try {
    const data = await testFetch();

    document.body.innerText = JSON.stringify(data);
  } catch (error) {
    const appError = error as AppError;
    alert(appError.message);
  }
})();
