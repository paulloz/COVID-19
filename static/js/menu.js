window.addEventListener('load', () => {
    const $navbarBurgers = Array.prototype.slice.call(document.querySelectorAll('.navbar-burger'), 0);
  
    if ($navbarBurgers.length > 0) {
        $navbarBurgers.forEach( el => {
            el.addEventListener('click', () => {
                const target = el.dataset.target;
                const $target = document.getElementById(target);

                el.classList.toggle('is-active');
                $target.classList.toggle('is-active');
            });
        });
    }

    document.querySelectorAll('.navbar-item').forEach(el => {
        el.addEventListener('click', (e) => {
            const href = e.target.getAttribute('href');
            document.querySelectorAll('.navbar-item.is-active').forEach(el => el.classList.remove('is-active'));
            e.target.classList.add('is-active');

            document.querySelectorAll('.main-content > div').forEach(el => el.classList.add('is-hidden'));
            const p = document.querySelector(`.main-content > div.${_.trimStart(href, '#')}`);
            if (p != null)
                p.classList.remove('is-hidden');
            document.chart(href);
        });
    });

    if (location.hash === '') {
        document.querySelector('a.navbar-item').click();
    } else {
        document.querySelector(`a.navbar-item[href="${location.hash}"]`).click();
    }
});