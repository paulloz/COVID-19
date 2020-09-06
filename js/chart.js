window.addEventListener('load', () => {
    d3.formatDefaultLocale({
        "thousands": " "
    });
    d3.timeFormatDefaultLocale({
        "dateTime": "%A %e %B %Y à %X",
        "date": "%d/%m/%Y",
        "time": "%H:%M:%S",
        "periods": ["AM", "PM"],
        "days": ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"],
        "shortDays": ["Dim.", "Lun.", "Mar.", "Mer.", "Jeu.", "Ven.", "Sam."],
        "months": ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"],
        "shortMonths": ["Janv.", "Févr.", "Mars", "Avr.", "Mai", "Juin", "Juil.", "Août", "Sept.", "Oct.", "Nov.", "Déc."]
    });
    const formatDate = d3.timeFormat("%d %b");
    const formatDateFull = d3.timeFormat("%d %B");

    const chart = d3.select('.chart');
    const width = chart.node().clientWidth;
    const height = 600;
    const margin = {top: 20, right: 30, bottom: 30, left: 50};
    const defaultColor = '#bababa';

    const svg = chart.append('svg').attr('viewBox', [0, 0, width, height]).style('overflow', 'hidden');

    const x = d3.scaleUtc().range([margin.left, width - margin.right]);
    const xAxis = d3.axisBottom(x).ticks(10).tickSizeOuter(0).tickFormat(formatDate);
    svg.append('g').attr('transform', `translate(0, ${height - margin.bottom})`).attr('class', 'xaxis');

    const y = d3.scaleLinear().range([height - margin.bottom, margin.top]);
    const yAxis = d3.axisLeft(y);
    svg.append('g').attr('transform', `translate(${margin.left}, 0)`).attr('class', 'yaxis');

    const y2 = d3.scaleLinear().domain([0, 100]).range([height - margin.bottom, margin.top]);
    const y2Axis = d3.axisRight(y2);
    svg.append('g').attr('transform', `translate(${width - margin.right}, 0)`).attr('class', 'y2axis')
       .attr('opacity', '0').call(y2Axis);

    let init = false;
    let aggregate = false;
    let data = null;

    function update() {
        const duration = init ? 1000 : 0;
        init = true;

        if (data.can_aggregate) {
            data.series = _.filter(data.series, d => d.name !== 'Total');
            if (aggregate) {
                data.series.push({
                    name: 'Total',
                    values: _.reduce(data.series, (acc, d) => _.map(d.values, (v, i) => (acc[i] || 0) + v, []))
                });
            }
        }

        const line = d3.line()
                       .defined(d => !isNaN(d))
                       .x((d, i) => x(data.dates[i]))
                       .y(d => y(d));

        const linePercent = d3.line()
                              .defined(d => !isNaN(d))
                              .x((d, i) => x(data.dates[i]))
                              .y(d => y2(d));

        x.domain(d3.extent(data.dates));
        svg.selectAll('.xaxis').transition().duration(duration).call(xAxis);
        y.domain([0, d3.max(data.series, d => d3.max(d.values))]).nice();
        svg.selectAll('.yaxis').transition().duration(duration).call(yAxis);

        
        svg.selectAll('.y2axis').transition().duration(duration)
           .attr('opacity', _.filter(data.series, d => d.type === '%').length ? '1' : '0');

        let path = svg.selectAll('.line').data(data.series, d => d.name);

        path.enter().append('path').attr('class', 'line').attr('opacity', '0')
            .merge(path).transition().duration(duration).attr('fill', 'none')
                                                        .attr('stroke', d => d.color || defaultColor)
                                                        .attr('stroke-width', 1.5)
                                                        .attr('stroke-linejoin', 'round')
                                                        .attr('stroke-linecap', 'round')
                                                        .attr('opacity', '1')
                                                        .attr('d', d => d.type !== '%' ? line(d.values) : linePercent(d.values));
        path.exit().transition().duration(duration).attr('opacity', '0').remove();

        d3.selectAll('.start-date').text(formatDateFull(data.dates[0]));
        d3.selectAll('.end-date').text(formatDateFull(data.dates[data.dates.length - 1]));

        hover(path);
    }

    const cache_data = {};
    document.chart = (href) => {
        if (cache_data[href] != null) {
            data = cache_data[href];
            update();
            return;
        }

        if (href === '#hospits') {
            d3.json('/api/hosp_by_age').then(json => {
                let newData = {
                    series: _.map(
                        _.toPairs(_.mapValues(_.groupBy(json, 'age_group'), d => _.map(d, 'value'))),
                        d => ({name: d[0], values: d[1]})
                    ),
                    dates: _.uniq(json.map(d => Date.parse(d.date))),
                    can_aggregate: true,
                };

                data = newData;
                update();
                cache_data[href] = newData;
            });
        } else if (href === '#tests') {
            d3.json('/api/test').then(jsonTest => {
                d3.json('/api/posit').then(jsonPosit => {
                    if (jsonTest.length !== jsonPosit.length) { return; }
                    let newData = {
                        series: [
                            {values: _.map(jsonPosit, 'value'), color: 'purple'},
                            {values: _.map(jsonTest, (d, i) => (jsonPosit[i].value * 100 / d.value).toFixed(2)), type: '%', color: 'red'}
                        ],
                        dates: _.uniq(jsonPosit.map(d => Date.parse(d.date))),
                        can_aggregate: false,
                    }
                    data = newData;
                    update();
                    cache_data[href] = newData;
                });
            });
        }
    };

    const yesButton = document.querySelector('.yes');
    const noButton = document.querySelector('.no');

    yesButton.addEventListener('click', (e) => {
        if (!e.target.classList.contains('is-selected')) {
            noButton.classList.remove('is-selected', 'is-danger');
            yesButton.classList.add('is-selected', 'is-success');
            aggregate = true;
            update();
        }
    });

    noButton.addEventListener('click', (e) => {
        if (!e.target.classList.contains('is-selected')) {
            yesButton.classList.remove('is-selected', 'is-success');
            noButton.classList.add('is-selected', 'is-danger');
            aggregate = false;
            update();
        }
    });

    const dot = svg.append('g').attr('display', 'none');
    dot.append('circle').attr('r', 3.5);
    dot.append('text').attr('font-family', 'sans-serif')
                      .attr('font-size', 12)
                      .attr('text-anchor', 'middle')
                      .attr('fill', 'black')
                      .attr('y', -8);
    
    function hover(path) {
        svg.on('mousemove', moved)
           .on('mouseleave', left);

        function moved(event) {
            event.preventDefault();
            dot.attr('display', null);
            const pointer = d3.pointer(event, this);
            const xm = x.invert(pointer[0]);
            const ym = y.invert(pointer[1]);
            const i = d3.bisectCenter(data.dates, xm);
            const s = d3.least(data.series, d => Math.abs(d.values[i] - ym));
            dot.attr('transform', `translate(${x(data.dates[i])}, ${s.type !== '%' ? y(s.values[i]) : y2(s.values[i])})`)
               .attr('fill', s.color || defaultColor);
            const name = s.name != null ? ` (${s.name})` : '';
            dot.select('text').text(`${formatDateFull(data.dates[i])} : ${s.values[i]}${name}`);
        }

        function left(event) {
            dot.attr('display', 'none');
        }
    }
});