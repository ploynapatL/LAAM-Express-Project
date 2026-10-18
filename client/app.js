const api = "http://localhost:3001";
const health = document.querySelector("#health");
const list = document.querySelector("#items");
const error = document.querySelector("#error");
async function load() {
  try {
    const status = await fetch(`${api}/api/health`);
    if (!status.ok) throw new Error("Health check failed");
    health.textContent = `API: ${(await status.json()).status}`;
    const response = await fetch(`${api}/api/items`);
    if (!response.ok) throw new Error("Unable to load items");
    const items = await response.json();
    list.replaceChildren(
      ...items.map((item) => {
        const li = document.createElement("li");
        li.textContent = `${item.id}: ${item.name}`;
        return li;
      }),
    );
  } catch (e) {
    health.textContent = "API unavailable";
    error.textContent = e.message;
  }
}
document.querySelector("#form").addEventListener("submit", async (e) => {
  e.preventDefault();
  error.textContent = "";
  try {
    const response = await fetch(`${api}/api/items`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: document.querySelector("#name").value }),
    });
    if (!response.ok)
      throw new Error((await response.json()).error || "Create failed");
    e.target.reset();
    await load();
  } catch (err) {
    error.textContent = err.message;
  }
});
load();
