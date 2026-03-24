/**Preload**/
$(window).load(function () {
    $('#page-loader').delay(500).fadeOut(400, function () {
        $('body').fadeIn();
    });
});
$(document).ready(function ($) {
    /**Menu Mobile**/
    $('.menu-icon').click(function () {
        $('body').toggleClass("open-menu");
    });
    $('.open-submenu').click(function () {
        var submenu = $(this).parents("li").find("ul");
        if ($(submenu).is(":visible")) {
            $(submenu).slideUp();
            $(this).removeClass("open-submenu-active");
        }
        else {
            $(submenu).slideDown();
            $(this).addClass("open-submenu-active");
        }
    });
    /**Search Box**/
    $('body').click(function () {
        if ($('.search-icon').hasClass("show-search")) {
            $('.search-icon').toggleClass("show-search");
        }
    });
    $('.search-icon-inner').click(function (e) {
        e.stopPropagation()
        $('.search-icon').toggleClass("show-search");
    });
    $('.search-box').click(function (e) {
        e.stopPropagation();
    });
    /**Sportlight slider**/
    $('.owl-spotlight').owlCarousel({
        loop: true,
        nav: true,
        items: 1,
        mouseDrag: false,
        navText: ["<i class='fa fa-angle-left'></i>", "<i class='fa fa-angle-right'></i>"]
    });
    /**Review slider**/
    $('.owl-review').owlCarousel({
        loop: true,
        nav: true,
        items: 1,
        mouseDrag: false,
        navText: ["<i class='fa fa-angle-left'></i>", "<i class='fa fa-angle-right'></i>"]
    });
    /**Review slider**/
    $('.owl-special').owlCarousel({
        loop: true,
        nav: false,
        dots: false,
        autoplay: true,
        items: 1,
        mouseDrag: false,
    });
    if ($('.reviews-item').length) {
        $('.reviews-item').matchHeight();
    }
});
