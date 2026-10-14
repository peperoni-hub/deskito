const navItems = document.querySelectorAll(".nav-item");
const views = document.querySelectorAll(".view");

function showView(name) {
  for (const item of navItems) {
    item.classList.toggle("active", item.dataset.view === name);
  }
  for (const view of views) {
    view.hidden = view.dataset.view !== name;
  }
}

for (const item of navItems) {
  item.addEventListener("click", (event) => {
    event.preventDefault();
    showView(item.dataset.view);
  });
}
