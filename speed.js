(function () {
    //speed up the connection to the servers this site depends on,
    //so the actual requests that follow start faster.
    var hosts = [
        "https://fonts.googleapis.com",
        "https://fonts.gstatic.com",
        "https://www.gstatic.com",
        "https://firestore.googleapis.com",
        "https://identitytoolkit.googleapis.com",
    ];
    hosts.forEach(function (href) {
        var link = document.createElement("link");
        link.rel = "preconnect";
        link.href = href;
        document.head.appendChild(link);
    });

    // A thin top progress bar so clicking a link feels instant,
    //even while the next page is still loading.
    var bar = document.createElement("div");
    bar.id = "page-load-bar";
    bar.style.cssText = "position:fixed;top:0;left:0;height:30px;width:0%;z-index:9999;" + 
    "background:linear-gradient(90deg, #C9A24C, #F0D488);" +
    "transition:width 0.25s ease, opacity 0.3s ease;opacity:1;";
    document.documentElement.appendChild(bar);

    function setwidth(pct) {bar.style.width = pct + "%";}

    setwidth(25);
    setTimeout(function () {setwidth(55);}, 120);

    window.addEventListener("load", function () {
        setwidth(100);
        setTimeout(function () { setwidth(0); bar.style.opacity = "1";}, 300);
});

//show the bar the instant someone taps an internal link,
//before the browser even starts unloading the current page,
document.addEventListener("click", function (e) {
    var link = e.target.closest("a[href]");
    if (!link) return;
    var href = link.getAttribute("href");
    if (!href || href.charAt(0) === "#") return;
    if (link.target === "blank") return;
    if (/^https?:)?\/\//i.test(href) && href.indexOf(window.location.host) === -1) return;
    if (href.indexOf("mailto:") === 0 || href.indexOf("tel:") === 0 || href.indexOf("wa.me") !== -1) return;
    setwidth(70);
});
})();
