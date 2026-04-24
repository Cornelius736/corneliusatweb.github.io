document.getElementById("copyright-year").innerText = "2026";

const menuBtn = document.querySelector(".menu-btn");
const menu = document.querySelector(".menu");

menuBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    menu.classList.toggle("open");
});

menu.addEventListener("click", (e) => {
    e.stopPropagation();
});

document.addEventListener("click", () => {
    menu.classList.remove("open");
});