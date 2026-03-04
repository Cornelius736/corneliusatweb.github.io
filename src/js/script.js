// Copyright Date

document.querySelectorAll(".copyright-date").forEach(el => el.textContent = "2026");

// Responsive Menu

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

// Service Status Report

const serviceStatusReport = "Available";

const serviceStatusColorClass = {
    Available: "green",
    Busy: "red",
    Unavailable: "gray",
}[serviceStatusReport];

document.querySelectorAll(".service-status-report").forEach(el => {
    el.textContent = serviceStatusReport;
    el.classList.remove("green", "red", "gray");
    if (serviceStatusColorClass) el.classList.add(serviceStatusColorClass);
});

// Support Status Report

const supportStatusReport = "Available";

const supportStatusColorClass = {
    Available: "green",
    Busy: "red",
    Unavailable: "gray",
}[supportStatusReport];

document.querySelectorAll(".support-status-report").forEach(el => {
    el.textContent = supportStatusReport;
    el.classList.remove("green", "red", "gray");
    if (supportStatusColorClass) el.classList.add(supportStatusColorClass);
});

// Copy

function copy(text) {
    navigator.clipboard.writeText(text);
}

// Tab Thingy

function openTab(evt, tabName) {
    var i, tab, tablinks;
    tab = document.getElementsByClassName("tab");
    for (i = 0; i < tab.length; i++) {
        tab[i].style.display = "none";
    }
    tablinks = document.getElementsByClassName("tab-link");
    for (i = 0; i < tablinks.length; i++) {
        tablinks[i].className = tablinks[i].className.replace(" active", "");
    }
    document.getElementById(tabName).style.display = "block";
    evt.currentTarget.className += " active";
}

document.getElementById("default-tab").click();