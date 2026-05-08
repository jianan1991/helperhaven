-- Support a second rest day when restDaysPerWeek = 2.
ALTER TABLE placements
    ADD COLUMN rest_day_of_week_2 integer;
