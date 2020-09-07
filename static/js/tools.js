function hide(selector) {
    document.querySelector(selector).classList.add('is-hidden');
}

function show(selector) {
    document.querySelector(selector).classList.remove('is-hidden');
}

function roundf(n, f) {
    if (f === false) {
        return Math.round(n);
    } else {
        return Math.round(n * 100) / 100;
    }
}