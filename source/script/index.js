const video = document.getElementById('intro');
const loader = document.getElementById('loader');

document.documentElement.style.overflow = 'hidden';

function showSite() {
    document.documentElement.style.overflow = '';
    loader.style.opacity = '0';
    loader.style.pointerEvents = 'none';
    setTimeout(() => loader.remove(), 800);
}

video.addEventListener('ended', showSite);
video.addEventListener('error', showSite);
video.play().catch(showSite);

document.querySelectorAll(".copyright").forEach(el => {
    el.innerText = "2026";
});