document.addEventListener("DOMContentLoaded", function() {
    console.log("Documentation Website Loaded!");
});
document.addEventListener("DOMContentLoaded", function () {
    // Load navbar dynamically
    let navbarPath = (window.location.pathname.includes("/technical/") || window.location.pathname.includes("/structure/"))
    ? "../navbar.html"
    : "navbar.html"; 

    if (window.location.pathname.includes("/index.html")) {
        navbarPath = "/pages/navbar.html";
    }

    // Load navbar dynamically
    fetch(navbarPath)
        .then(response => response.text())
        .then(html => {
            document.getElementById("navbar-container").innerHTML = html;
            setupNavbar(); // Enable toggle function after loading
        })
        .catch(error => console.error("Error loading navbar:", error));

    function setupNavbar() {
        const menuButton = document.getElementById("menuButton");
        const closeMenu = document.getElementById("closeMenu");
        const dropdownMenu = document.getElementById("dropdownMenu");

        // Initially hide the menu
        dropdownMenu.style.display = "none";

        // Toggle menu when clicking the button
        menuButton.addEventListener("click", function () {
            dropdownMenu.style.display = "block";
            menuButton.style.visibility = "hidden"; // Hide ☰ when menu is open
        });

        // Close menu when clicking the close button
        closeMenu.addEventListener("click", function () {
            dropdownMenu.style.display = "none";
            menuButton.style.visibility = "visible"; // Show ☰ again
        });

        // Close menu if clicking outside
        document.addEventListener("click", function (event) {
            if (!menuButton.contains(event.target) && !dropdownMenu.contains(event.target)) {
                dropdownMenu.style.display = "none";
                menuButton.style.visibility = "visible"; // Show ☰ again
            }
        });

        // Handle submenu hover
        document.querySelectorAll(".dropdown-submenu").forEach(submenu => {
            submenu.addEventListener("mouseenter", function () {
                this.querySelector(".submenu-content").style.display = "block";
            });

            submenu.addEventListener("mouseleave", function () {
                this.querySelector(".submenu-content").style.display = "none";
            });
        });
    }
});