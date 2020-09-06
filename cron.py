#!/usr/bin/env python3
import os
import requests
from datetime import date, timedelta

from db import Db


BASE_GEODES_URL = 'https://geodes.santepubliquefrance.fr/GC_indic.php'


def init_db():
    regions = []
    for region in regions:
        pass


def get_indicator(indic, dataset, filters={}):
    filters = ','.join([f'{k}={v}' for k, v in filters.items()])
    url = f'{BASE_GEODES_URL}?lang=fr&view=map1&indic={indic}' + \
          f'&dataset={dataset}&filters={filters}'
    r = requests.get(url)
    if r.status_code == 200:
        return r.json()
    return None


def main(d):
    db = Db()
    # This program is meant to run at night to retrieve data for previous day.
    yesterday = ((d or date.today()) + timedelta(-1)).strftime('%Y-%m-%d')

    def inner(indic, dataset, db_table):
        lines = []
        day = None
        # For all age groups available.
        for age_group in [9, 19, 29, 39, 49, 59, 69, 79, 89, 90]:
            print(f'Retrieve {indic}/{dataset}' +
                  f'for age_group {age_group} on {yesterday}...')
            # First, retrieve the data from API
            filters = dict(cl_age90=f'{age_group:02}', jour=yesterday)
            indicator = get_indicator(indic, dataset, filters)
            if indicator:
                # Some data management
                values = indicator['content']['distribution']['values']
                _day = indicator['content']['options']['axisFilters']['jour']
                if bool(day) and day != _day:
                    # Data discrepancy (we retrieved different days for
                    # at least 2 data groups).
                    return
                day = _day
                for reg_id, value in enumerate(values):
                    # We'll insert in db later.
                    lines.append([day, str(age_group), reg_id,
                                  value if value != -9999 else None])
        if not getattr(db, f'check_data_{db_table}')(day):
            print('-> No new data.')
            return
        # Let's actually put stuff in db.
        add_method = f'add_{db_table}_line'
        for line in lines:
            getattr(db, add_method)(*line)

    models = [
        ('hosp', 'covid_hospit_clage10', 'hosp_by_age_group'),
        ('p', 'sp_pos_quot', 'posit_by_age_group'),
        ('t', 'sp_pos_quot', 'test_by_age_group'),
    ]
    for model in models:
        inner(model[0], model[1], model[2])
    db.commit()


if __name__ == '__main__':
    main()
