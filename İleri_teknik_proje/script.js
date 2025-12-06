document.getElementById("add-btn").addEventListener("click", () => {
    const list = document.getElementById("feature-list");

    const item = document.createElement("li");
    item.textContent = "Yeni özellik eklendi (" + new Date().toLocaleTimeString() + ")";

    list.appendChild(item);
});
