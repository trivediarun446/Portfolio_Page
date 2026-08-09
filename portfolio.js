let menuIcon = document.querySelector("#menu-icon"); 
let navbar = document.querySelector('.navbar'); 

menuIcon.onclick = () => {  /* Yahan -> ki jagah => aayega */
    menuIcon.classList.toggle('fa-xmark'); 
    navbar.classList.toggle('active'); 
};

// Pehle sections aur navLinks ko select zaroor kar lena (agar upar nahi kiya hai toh)
let sections = document.querySelectorAll('section');
let navLinks = document.querySelectorAll('header nav a');

window.onscroll = () => {
    sections.forEach(sec => {
        let top = window.scrollY;
        let offset = sec.offsetTop - 150;
        let height = sec.offsetHeight;
        let id = sec.getAttribute('id');

        if(top >= offset && top < offset + height) {
            // 1. Sabhi links se 'active' class hatane ke liye loop
            navLinks.forEach(links => {
                links.classList.remove('active');
            });
            
            // 2. Jis section par hain, uske link par 'active' class lagana (Sahi syntax ke sath)
            document.querySelector('header nav a[href*=' + id + ']').classList.add('active');
        }
    });
let header = document.querySelector('header') ; 
header.classList.toggle('sticky',window,scrollY > 100) ; 

menuIcon.classList.remove('fa-xmark') ; 
navbar.classList.remove('active') ; 
};


ScrollReveal({
    distance: '80px',
    duration: 2000,
    delay: 200
}); 

// Top se aane wale elements
ScrollReveal().reveal('.home-content, .heading', { origin: 'top' });

// Bottom se aane wale elements (Yahan maine portfolio-box ko project-box kar diya hai)
ScrollReveal().reveal('.home-img, .services-container, .project-box, .contact form', { origin: 'bottom' });

// Left se aane wale elements (about.img ko about-img kiya hai)
ScrollReveal().reveal('.home-content h1, .about-img', { origin: 'left' });

// Right se aane wale elements
ScrollReveal().reveal('.home-content p, .about-content', { origin: 'right' });


// const typed = new Typed(Engineer']
// }




