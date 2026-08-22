    export function showToast(message) {
      const container = document.getElementById("toast-container");
      document.getElementById("toast-text").innerText = message;
      container.classList.remove("hidden");

      setTimeout(() => {
        container.classList.add("hidden");
      }, 2500);
    }
window.showToast=showToast;
