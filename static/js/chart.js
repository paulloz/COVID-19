window.addEventListener('load', () => {
    const ageGroupLabels = {9: '0-9 ans', 19: '10-19 ans', 29: '20-29 ans', 39: '30-39 ans',
                            49: '40-49 ans', 59: '50-59 ans', 69: '60-69 ans',
                            79: '70-79 ans', 89: '80-89 ans', 90: '90 ans et plus'};

    let dataFunctions = {
        '#hospits': function(cb) {
            d3.json('/api/hosp_by_age').then(json => {
                cb({
                    series: _.map(
                        _.toPairs(_.mapValues(_.groupBy(json, 'age_group'), d => _.map(d, 'value'))),
                        (d, i) => ({name: ageGroupLabels[d[0]], values: d[1], id: 'h' + i})
                    ),
                    dates: _.uniq(json.map(d => Date.parse(d.date))),
                    can_aggregate: true,
                    can_mean_over: false,
                });
            });
        },
        '#tests': function(cb) {
            d3.json('/api/test').then(jsonTest => {
                d3.json('/api/posit').then(jsonPosit => {
                    if (jsonTest.length !== jsonPosit.length) { return; }
                    cb({
                        series: [
                            {values: _.map(jsonPosit, 'value'), color: 'purple', id: 't1'},
                            {values: _.map(jsonTest, (d, i) => roundf(jsonPosit[i].value * 100 / d.value)), type: '%',
                             color: 'red', id: 't2'},
                        ],
                        dates: _.uniq(jsonPosit.map(d => Date.parse(d.date))),
                        can_aggregate: false, can_mean_over: true,
                    });
                });
            });
        },
        '#reas': function(cb) {
            d3.json('/api/reas').then(json => {
                cb({
                    series: _.map(
                        _.toPairs(_.mapValues(_.groupBy(json, 'age_group'), d => _.map(d, 'value'))),
                        (d, i) => ({name: ageGroupLabels[d[0]], values: d[1], color: 'midnightblue', id: 'r' + i})
                    ),
                    dates: _.uniq(json.map(d => Date.parse(d.date))),
                    can_aggregate: true,
                    can_mean_over: false,
                })
            });
        },
        '#morts': function(cb) {
            d3.json('/api/morts').then(json => {
                cb({
                    series: [
                        {values: _.map(json, 'value'), color: 'darkred', id: 'm1'}
                    ],
                    dates: _.uniq(json.map(d => Date.parse(d.date))),
                    can_aggregate: false, can_mean_over: true,
                });
            });
        }
    }
    
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
    const defaultColor = '#555';

    const svg = chart.append('svg').attr('viewBox', [0, 0, width, height]).style('overflow', 'hidden');

    const x = d3.scaleUtc().range([margin.left, width - margin.right]);
    const xAxis = d3.axisBottom(x).ticks(10).tickSizeOuter(0).tickFormat(formatDate);
    svg.append('g').attr('transform', `translate(0, ${height - margin.bottom})`).attr('class', 'xaxis');

    const y = d3.scaleLinear().range([height - margin.bottom, margin.top]);
    const yAxis = d3.axisLeft(y);
    svg.append('g').attr('transform', `translate(${margin.left}, 0)`).attr('class', 'yaxis');

    const y2 = d3.scaleLinear().range([height - margin.bottom, margin.top]);
    const y2Axis = d3.axisRight(y2);
    svg.append('g').attr('transform', `translate(${width - margin.right}, 0)`).attr('class', 'y2axis')
       .attr('opacity', '0');

    let init = false;
    let aggregate = false;
    let useMeanByNData = false;
    let href = false;

    const cache_data = {};
    const cache_data_mean_over = {};

    function update() {
        const duration = init ? 1000 : 0;
        init = true;

        let prev_data = d3.local();
        
        let data = cache_data[href];
        if (data == null) { return; }

        if (cache_data[href].can_mean_over) {
            show('.mean-by-n');
            if (useMeanByNData) {
                data = cache_data_mean_over[data.href];
            }
        } else {
            hide('.mean-by-n');
        }

        if (data.can_aggregate) {
            show('.aggregate');
            data.series = _.filter(data.series, d => d.name !== 'Total');
            if (aggregate) {
                data.series.push({
                    name: 'Total', color: data.series[0].color,
                    values: _.reduce(data.series, (acc, d) => _.map(d.values, (v, i) => (acc[i] || 0) + v, []))
                });
            }
        } else {
            hide('.aggregate');
        }

        const line = d3.line()
                       .x((d, i) => x(data.dates[i]))
                       .y(d => y(d));

        const linePercent = d3.line()
                              .x((d, i) => x(data.dates[i]))
                              .y(d => y2(d));

        x.domain(d3.extent(data.dates));
        svg.selectAll('.xaxis').transition().duration(duration).call(xAxis);
        y.domain([0, d3.max(data.series, d => d3.max(d.values))]).nice();
        svg.selectAll('.yaxis').transition().duration(duration).call(yAxis);
        y2.domain([0, d3.max(_.filter(data.series, d => d.type === '%'), d => d3.max(d.values))]).nice();
        svg.selectAll('.y2axis').transition().duration(duration)
           .attr('opacity', _.filter(data.series, d => d.type === '%').length ? '1' : '0')
           .call(y2Axis);

        let path = svg.selectAll('.line').data(data.series, d => d.id);

        path.enter().append('path').attr('class', 'line').attr('opacity', '0')
            .merge(path)
            // .datum(data.filter(line.defined()))
            .transition().duration(duration)
            .attr('fill', 'none')
            .attr('stroke', d => d.color || defaultColor)
            .attr('stroke-width', 1.5)
            .attr('stroke-linejoin', 'round')
            .attr('stroke-linecap', 'round')
            .attr('opacity', '1')
            .attr('d', (d) => (d.type !== '%' ? line : linePercent)(d.values))
            .style('clip-path', () => {
                if (useMeanByNData) {
                    const xClip = x(data.dates[meanOverN - 1]) - margin.left + 1;
                    return `polygon(${xClip}px 0, 100% 0, 100% 100%, ${xClip}px 100%)`
                }
            });
        path.exit().transition().duration(duration).attr('opacity', '0').remove();

        d3.selectAll('.start-date').text(formatDateFull(data.dates[0]));
        d3.selectAll('.end-date').text(formatDateFull(data.dates[data.dates.length - 1]));

        hover(path);
    }

    const meanOverN = 7;
    document.chart = (_href) => {
        href = _href;

        if (cache_data[href] != null) {
            return update();
        }

        if (href in dataFunctions) {
            dataFunctions[href]((newData) => {
                newData.href = href;
                cache_data[href] = newData;

                if (cache_data[href].can_mean_over) {
                    cache_data_mean_over[href] = _.cloneDeep(cache_data[href]);
                    cache_data_mean_over[href].can_mean_over = false;
                    cache_data_mean_over[href].series = _.map(cache_data_mean_over[href].series, serie => {
                        serie.values = _.map(serie.values, (v, i) => 
                            i < meanOverN - 1
                                ? serie.values[meanOverN - 1]
                                : roundf(_.sum(serie.values.slice(i - meanOverN + 1, i + 1)) / meanOverN, serie.type === '%')
                        );
                        return serie;
                    })
                }

                update();
            });
        }
    };

    const yesAggButton = document.querySelector('.aggregate .yes');
    const noAggButton = document.querySelector('.aggregate .no');
    yesAggButton.addEventListener('click', (e) => {
        if (!e.target.classList.contains('is-selected')) {
            noAggButton.classList.remove('is-selected', 'is-danger');
            yesAggButton.classList.add('is-selected', 'is-success');
            aggregate = true;
            update();
        }
    });
    noAggButton.addEventListener('click', (e) => {
        if (!e.target.classList.contains('is-selected')) {
            yesAggButton.classList.remove('is-selected', 'is-success');
            noAggButton.classList.add('is-selected', 'is-danger');
            aggregate = false;
            update();
        }
    });

    const yesMeanByNButton = document.querySelector('.mean-by-n .yes');
    const noMeanByNButton = document.querySelector('.mean-by-n .no');
    yesMeanByNButton.addEventListener('click', (e) => {
        if (!e.target.classList.contains('is-selected')) {
            noMeanByNButton.classList.remove('is-selected', 'is-danger');
            yesMeanByNButton.classList.add('is-selected', 'is-success');
            useMeanByNData = true;
            update();
        }
    });
    noMeanByNButton.addEventListener('click', (e) => {
        if (!e.target.classList.contains('is-selected')) {
            yesMeanByNButton.classList.remove('is-selected', 'is-success');
            noMeanByNButton.classList.add('is-selected', 'is-danger');
            useMeanByNData = false;
            update();
        }
    });

    const dot = svg.append('g').attr('display', 'none');
    dot.append('circle').attr('r', 3.5);
    const ruler = svg.append('g').append('line')
                     .attr('display', 'none')
                     .attr('stroke', defaultColor)
                     .attr('opacity', '0.2')
                     .attr('stroke-width', 1);
    const tt = d3.select('body').append('div')
                 .attr('class', 'tooltip')
                 .style('opacity', 0);
    function hover(path) {
        svg.on('mousemove', moved)
           .on('mouseleave', left);

        function moved(event) {
            event.preventDefault();
            let data = useMeanByNData && cache_data_mean_over[href] ? cache_data_mean_over[href] : cache_data[href];

            const pointer = d3.pointer(event, this);
            const i = d3.bisectCenter(data.dates, x.invert(pointer[0]));
            if (useMeanByNData && i < meanOverN - 1) { return left(event); }

            dot.attr('display', null);
            ruler.attr('display', null);
            const s = d3.least(data.series, d => Math.abs((d.type !== '%' ? y(d.values[i]) : y2(d.values[i])) - pointer[1]));
            const px = x(data.dates[i]);
            const py = s.type !== '%' ? y(s.values[i]) : y2(s.values[i]);
            dot.attr('transform', `translate(${px}, ${py})`)
               .attr('fill', s.color || defaultColor);
            ruler.attr('stroke', s.color || defaultColor);
            ruler.attr('x1', px).attr('y1', py);
            ruler.attr('x2', s.type !== '%' ? margin.left : width - margin.right).attr('y2', py);
            const name = s.name != null ? ` (${s.name})` : '';
            const ttPos = [x(data.dates[i]),
                           s.type !== '%' ? y(s.values[i]) : y2(s.values[i])];
            tt.html(`${formatDateFull(data.dates[i])} : ${s.values[i]}${name}`)
              .style('opacity', 1)
              .style('color', s.color || defaultColor)
              .style('left', `${ttPos[0] + svg.node().getBoundingClientRect().x}px`)
              .style('top', `${ttPos[1] + svg.node().getBoundingClientRect().y}px`);
        }

        function left(event) {
            dot.attr('display', 'none');
            ruler.attr('display', 'none');
            tt.style('opacity', 0);
        }
    }
});