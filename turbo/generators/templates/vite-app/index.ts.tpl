import { initCore, normalizeAppError } from "@repo/core";
import { testFetch } from "@repo/core/api/test";

initCore("a");

const app = document.querySelector("#app");

(async () => {
  try {
    const data = await testFetch();

    if (app) {
      app.textContent = JSON.stringify(data);
    }
  } catch (error) {
    const appError = normalizeAppError(error);

    if (app) {
      app.textContent = appError.message;
    }
  }
})();
