import sqlite3


class Db():
    def __init__(self):
        self.conn = sqlite3.connect('local.db')
        self.cur = self.conn.cursor()

        self.cur.execute('SELECT COUNT(p_id) FROM regions')
        if self.cur.fetchone()[0] < 19:
            self.init_regions()

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_value, exc_traceback):
        pass

    def init_regions(self):
        regions = ['Guadeloupe', 'Martinique', 'Guyanne', 'La Réunion',
                   'Mayotte', 'île-de-France', 'Centre-Val de Loire',
                   'Bourgogne-Franche-Comté', 'Normandie', 'Hauts-de-France',
                   'Grand Est', 'Pays de la Loire', 'Bretagne',
                   'Nouvelle-Aquitaine', 'Occitanie', 'Auvergne-Rhône-Alpes',
                   'Provence-Alpes-Côte d\'Azur', 'Corse',
                   'Collectivités d\'outre-mer']
        cur_read = self.conn.cursor()
        for i, region in enumerate(regions):
            cur_read.execute('SELECT p_id FROM regions WHERE id=?', (i,))
            if not cur_read.fetchone():
                self.cur.execute(
                    'INSERT INTO regions (id, name) VALUES(?, ?)',
                    (i, region)
                )
        self.conn.commit()
        cur_read.close()

    def add_hosp_by_age_group_line(self, date, age_group, region, value):
        self.cur.execute(
            '''INSERT INTO hosp_by_age_group
                (region_id, age_group, date, value)
                VALUES ((SELECT p_id FROM regions WHERE id=?), ?, ?, ?)''',
            (region, age_group, date, value)
        )

    def add_posit_by_age_group_line(self, date, age_group, region, value):
        self.cur.execute(
            '''INSERT INTO posit_by_age_group
                (region_id, age_group, date, value)
                VALUES ((SELECT p_id FROM regions WHERE id=?), ?, ?, ?)''',
            (region, age_group, date, value)
        )

    def add_test_by_age_group_line(self, date, age_group, region, value):
        self.cur.execute(
            '''INSERT INTO test_by_age_group
                (region_id, age_group, date, value)
                VALUES ((SELECT p_id FROM regions WHERE id=?), ?, ?, ?)''',
            (region, age_group, date, value)
        )

    def add_morts_line(self, date, age_group, region, value):
        # age_group is not used here.
        self.cur.execute(
            '''INSERT INTO morts
                (region_id, date, value)
                VALUES((SELECT p_id FROM regions WHERE id=?), ?, ?)''',
            (region, date, value)
        )

    def get_n_lines_for_date(self, table, date):
        cur = self.conn.cursor()
        cur.execute(f'SELECT COUNT(p_id) FROM {table} WHERE date=?', (date,))
        n = cur.fetchone()[0]
        cur.close()
        return n

    def check_n_lines_or_delete(self, table, date, n=190):
        m = self.get_n_lines_for_date(table, date)
        if m > 0:
            if m < n:
                self.cur.execute(f'DELETE FROM {table} WHERE date=?', (date,))
            else:
                return False
        return True

    def check_data_hosp_by_age_group(self, date):
        return self.check_n_lines_or_delete('hosp_by_age_group', date)

    def check_data_posit_by_age_group(self, date):
        return self.check_n_lines_or_delete('posit_by_age_group', date)

    def check_data_test_by_age_group(self, date):
        return self.check_n_lines_or_delete('test_by_age_group', date)

    def check_data_morts(self, date):
        return self.check_n_lines_or_delete('morts', date, 19)

    def get_by_age_group(self):
        self.cur.execute(
            '''SELECT date, age_group, SUM(value)
               FROM hosp_by_age_group
               GROUP BY date, age_group
               ORDER BY date
            ''')
        return [dict(date=v[0], age_group=v[1], value=v[2])
                for v in self.cur.fetchall()]

    def get_posit(self):
        self.cur.execute(
            '''SELECT date, SUM(value)
               FROM posit_by_age_group
               GROUP BY date
               ORDER BY date
            ''')
        return [dict(date=v[0], value=v[1])
                for v in self.cur.fetchall()]

    def get_test(self):
        self.cur.execute(
            '''SELECT date, SUM(value)
               FROM test_by_age_group
               GROUP BY date
               ORDER BY date
            ''')
        return [dict(date=v[0], value=v[1])
                for v in self.cur.fetchall()]

    def get_morts(self):
        self.cur.execute(
            '''SELECT date, SUM(value)
               FROM morts
               GROUP BY date
               ORDER BY date
            ''')
        return [dict(date=v[0], value=v[1])
                for v in self.cur.fetchall()]

    def commit(self):
        self.conn.commit()

    def __del__(self):
        self.cur.close()
        self.conn.close()
