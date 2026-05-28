document.getElementById("copyright-year").innerText = "2026";


const btn = document.querySelector(".toggle-btn");
const target = document.querySelector(".toggle-target");

btn.addEventListener("click", (e) => {
    e.stopPropagation();
    target.classList.toggle("open");
});

document.addEventListener("click", (e) => {
    if (!target.contains(e.target)) {
        target.classList.remove("open");
    }
});


let slideIndex = 1;
showSlides(slideIndex);

function plusSlides(n) {
  showSlides(slideIndex += n);
}

function currentSlide(n) {
  showSlides(slideIndex = n);
}

function showSlides(n) {
    const slides = [...document.getElementsByClassName("slide")];
    const dots = [...document.getElementsByClassName("slide-icon")];
    const captionText = document.getElementById("slide-caption");

    if (n > slides.length) slideIndex = 1;
    if (n < 1) slideIndex = slides.length;

    slides.forEach(slide => slide.style.display = "none");
    dots.forEach(dot => dot.classList.remove("slide-active"));
    
    slides[slideIndex - 1].style.display = "block";
    dots[slideIndex - 1].classList.add("slide-active");
    captionText.innerHTML = dots[slideIndex - 1].alt;
}