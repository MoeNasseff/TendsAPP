-- Tables must be explicitly added to the supabase_realtime publication for
-- postgres_changes subscriptions to receive events (not on by default).
-- Without this, useRealtime()'s subscriptions never fire and the UI only
-- ever reflects the initial load.
alter publication supabase_realtime add table
  expenses, expense_categories,
  dogs, dog_items,
  cars, car_services, odometer_logs,
  meds, med_logs,
  reminders;
