import {
  formatWorldTick,
  getTimelinePosition,
  getWorldTickFromPosition,
  temporalCalendar,
  type TimelinePosition,
} from '@shared/temporal';
import styles from './TemporalInput.module.css';

type TemporalInputProps = {
  label?: string;
  value: number;
  onChange: (value: number) => void;
};

type TemporalFieldKey = keyof TimelinePosition;

const temporalFieldConfig: Array<{
  key: TemporalFieldKey;
  label: string;
  max?: number;
  min: number;
}> = [
  {
    key: 'year',
    label: 'Year',
    min: 1,
  },
  {
    key: 'month',
    label: 'Month',
    min: 1,
    max: temporalCalendar.monthsPerYear,
  },
  {
    key: 'week',
    label: 'Week',
    min: 1,
    max: temporalCalendar.weeksPerMonth,
  },
  {
    key: 'day',
    label: 'Day',
    min: 1,
    max: temporalCalendar.daysPerWeek,
  },
  {
    key: 'hour',
    label: 'Hour',
    min: 0,
    max: temporalCalendar.hoursPerDay - 1,
  },
  {
    key: 'minute',
    label: 'Minute',
    min: 0,
    max: temporalCalendar.minutesPerHour - 1,
  },
];

function clampValue(value: number, min: number, max?: number): number {
  if (max === undefined) {
    return Math.max(min, value);
  }

  return Math.min(max, Math.max(min, value));
}

export function TemporalInput({
  label = 'Effective Time',
  value,
  onChange,
}: TemporalInputProps) {
  const position = getTimelinePosition(value);

  const updateField = (field: (typeof temporalFieldConfig)[number], rawValue: string) => {
    const parsed = Number.parseInt(rawValue, 10);
    const nextFieldValue = clampValue(
      Number.isNaN(parsed) ? field.min : parsed,
      field.min,
      field.max,
    );

    onChange(
      getWorldTickFromPosition({
        ...position,
        [field.key]: nextFieldValue,
      }),
    );
  };

  return (
    <div className={styles['temporal-input']}>
      <span>{label}</span>

      <div className={styles['temporal-grid']}>
        {temporalFieldConfig.map((field) => (
          <label className={styles['temporal-field']} key={field.key}>
            <span>{field.label}</span>
            <input
              max={field.max}
              min={field.min}
              onChange={(event) => {
                updateField(field, event.target.value);
              }}
              step={1}
              type="number"
              value={String(position[field.key])}
            />
          </label>
        ))}
      </div>

      <p className={`muted helper-text ${styles['temporal-helper']}`}>
        {formatWorldTick(value)}. Each month is 4 weeks and each year is 12 months.
      </p>
    </div>
  );
}
