import { supabase } from './supabase'

const DAY = 86_400_000

function daysFromNow(days: number) {
  return new Date(Date.now() + days * DAY).toISOString()
}

const DOG_ITEMS: Array<{
  kind: 'vaccine' | 'medicine'
  name: string
  description: string
  dose: string
  repeat_interval_days: number
}> = [
  { kind: 'vaccine', name: 'DHPP', description: 'Core combo vaccine: distemper, hepatitis, parvo, parainfluenza.', dose: '1 injection', repeat_interval_days: 365 },
  { kind: 'vaccine', name: 'Rabies', description: 'Legally required rabies vaccination.', dose: '1 injection', repeat_interval_days: 1095 },
  { kind: 'vaccine', name: 'Leptospirosis', description: 'Protects against bacterial infection from contaminated water/soil.', dose: '1 injection', repeat_interval_days: 365 },
  { kind: 'vaccine', name: 'Bordetella (kennel cough)', description: 'Protects against kennel cough, recommended for social dogs.', dose: '1 injection', repeat_interval_days: 180 },
  { kind: 'vaccine', name: 'Canine Influenza (H3N2/H3N8)', description: 'Protects against canine flu strains.', dose: '1 injection', repeat_interval_days: 365 },
  { kind: 'vaccine', name: 'Lyme/Borrelia', description: 'Protects against tick-borne Lyme disease.', dose: '1 injection', repeat_interval_days: 365 },
  { kind: 'vaccine', name: 'Parvovirus booster', description: 'Booster shot for parvovirus immunity.', dose: '1 injection', repeat_interval_days: 365 },
  { kind: 'vaccine', name: 'Coronavirus', description: 'Protects against canine coronavirus (enteric).', dose: '1 injection', repeat_interval_days: 365 },
  { kind: 'medicine', name: 'Deworming (broad-spectrum)', description: 'Broad-spectrum dewormer for intestinal parasites.', dose: '1 tablet', repeat_interval_days: 90 },
  { kind: 'medicine', name: 'Heartworm prevention', description: 'Monthly preventative against heartworm.', dose: '1 chewable', repeat_interval_days: 30 },
  { kind: 'medicine', name: 'Flea & tick (Bravecto/Nexgard)', description: 'Flea and tick protection, quarterly chewable.', dose: '1 chewable', repeat_interval_days: 90 },
  { kind: 'medicine', name: 'Giardia', description: 'Treatment/prevention for giardia parasite.', dose: '1 tablet', repeat_interval_days: 180 },
  { kind: 'medicine', name: 'Multivitamin', description: 'General daily multivitamin supplement.', dose: '1 chewable', repeat_interval_days: 30 },
  { kind: 'medicine', name: 'Joint/hip supplement (glucosamine)', description: 'Glucosamine supplement for hip and joint health — Berners are prone to hip issues.', dose: '1 chewable', repeat_interval_days: 30 },
  { kind: 'medicine', name: 'Omega-3 skin/coat', description: 'Omega-3 supplement for skin and coat health.', dose: '1 capsule', repeat_interval_days: 30 },
  { kind: 'medicine', name: 'Probiotic', description: 'Digestive health probiotic supplement.', dose: '1 sachet', repeat_interval_days: 30 },
  { kind: 'medicine', name: 'Ear-cleaning solution', description: 'Routine ear cleaning to prevent infections.', dose: 'A few drops per ear', repeat_interval_days: 30 },
  { kind: 'vaccine', name: 'Tick-borne booster', description: 'Booster for tick-borne disease protection.', dose: '1 injection', repeat_interval_days: 365 },
  { kind: 'medicine', name: 'Anti-tick collar', description: 'Long-lasting tick and flea collar (e.g. Seresto).', dose: '1 collar', repeat_interval_days: 180 },
  { kind: 'medicine', name: 'Annual health check reminder', description: 'Yearly wellness exam with the vet.', dose: 'N/A', repeat_interval_days: 365 },
]

const CAR_SERVICES: Array<{
  part: 'oil' | 'oil_filter' | 'air_filter' | 'brake_pads' | 'tires' | 'coolant' | 'battery'
  label: string
  last_service_km: number
  interval_km: number
  interval_days: number | null
  note: string
}> = [
  { part: 'oil', label: 'Engine Oil', last_service_km: 30000, interval_km: 10000, interval_days: 365, note: 'Full synthetic 5W-30' },
  { part: 'oil_filter', label: 'Oil Filter', last_service_km: 30000, interval_km: 10000, interval_days: 365, note: 'Changed together with engine oil' },
  { part: 'air_filter', label: 'Air Filter', last_service_km: 25000, interval_km: 15000, interval_days: null, note: '' },
  { part: 'brake_pads', label: 'Brake Pads', last_service_km: 15000, interval_km: 25000, interval_days: null, note: 'Front pads' },
  { part: 'tires', label: 'Tires', last_service_km: 10000, interval_km: 40000, interval_days: null, note: '' },
  { part: 'coolant', label: 'Coolant', last_service_km: 20000, interval_km: 60000, interval_days: 730, note: '' },
  { part: 'battery', label: 'Battery', last_service_km: 5000, interval_km: 0, interval_days: 1460, note: '' },
]

const MEDS: Array<{
  name: string
  dosage: string
  times_of_day: string[]
}> = [
  { name: 'Vitamin D', dosage: '1000 IU', times_of_day: ['08:00'] },
  { name: 'Omega-3', dosage: '1000mg', times_of_day: ['08:00'] },
  { name: 'Magnesium', dosage: '200mg', times_of_day: ['21:00'] },
  { name: 'Multivitamin', dosage: '1 tablet', times_of_day: ['08:00'] },
  { name: 'Vitamin C', dosage: '500mg', times_of_day: ['08:00'] },
  { name: 'Zinc', dosage: '15mg', times_of_day: ['08:00'] },
  { name: 'B-Complex', dosage: '1 capsule', times_of_day: ['08:00'] },
  { name: 'Probiotic', dosage: '1 capsule', times_of_day: ['08:00'] },
  { name: 'Antihistamine', dosage: '10mg', times_of_day: ['21:00'] },
  { name: 'Omeprazole', dosage: '20mg', times_of_day: ['07:00'] },
  { name: 'Metformin', dosage: '500mg', times_of_day: ['08:00', '20:00'] },
  { name: 'Atorvastatin', dosage: '20mg', times_of_day: ['21:00'] },
  { name: 'Amlodipine', dosage: '5mg', times_of_day: ['08:00'] },
  { name: 'Aspirin 81mg', dosage: '81mg', times_of_day: ['08:00'] },
  { name: 'Levothyroxine', dosage: '50mcg', times_of_day: ['06:30'] },
  { name: 'Melatonin', dosage: '3mg', times_of_day: ['22:00'] },
  { name: 'Ibuprofen PRN', dosage: '200mg', times_of_day: [] },
  { name: 'Paracetamol PRN', dosage: '500mg', times_of_day: [] },
  { name: 'Iron', dosage: '65mg', times_of_day: ['08:00'] },
  { name: 'CoQ10', dosage: '100mg', times_of_day: ['08:00'] },
]

export async function seedDefaults(userId: string) {
  // Atomically claim the right to seed: only proceeds if this call is the
  // one that flips seeded false -> true. Prevents duplicate inserts from
  // concurrent invocations (e.g. React StrictMode's double-effect in dev).
  const { data: claimed, error: claimError } = await supabase
    .from('profiles')
    .update({ seeded: true })
    .eq('id', userId)
    .eq('seeded', false)
    .select('id')
  if (claimError) throw claimError
  if (!claimed || claimed.length === 0) return

  try {
    await seedRows(userId)
  } catch (err) {
    // Release the claim so a later login can retry.
    await supabase.from('profiles').update({ seeded: false }).eq('id', userId)
    throw err
  }
}

async function seedRows(userId: string) {
  const { data: dog, error: dogError } = await supabase
    .from('dogs')
    .insert({ user_id: userId, name: 'Bernese', breed: 'Bernese Mountain Dog' })
    .select('id')
    .single()
  if (dogError) throw dogError

  const { error: dogItemsError } = await supabase.from('dog_items').insert(
    DOG_ITEMS.map((item) => ({
      user_id: userId,
      dog_id: dog.id,
      kind: item.kind,
      name: item.name,
      description: item.description,
      dose: item.dose,
      schedule_type: 'recurring' as const,
      due_at: daysFromNow(item.repeat_interval_days),
      repeat_interval_days: item.repeat_interval_days,
    })),
  )
  if (dogItemsError) throw dogItemsError

  const { data: car, error: carError } = await supabase
    .from('cars')
    .insert({ user_id: userId, name: 'Ateca', make: 'Seat', model: 'Ateca', year: 2017, current_odometer_km: 31300 })
    .select('id')
    .single()
  if (carError) throw carError

  const { error: carServicesError } = await supabase.from('car_services').insert(
    CAR_SERVICES.map((s) => ({
      user_id: userId,
      car_id: car.id,
      part: s.part,
      label: s.label,
      last_service_km: s.last_service_km,
      last_service_date: new Date(Date.now() - (31300 - s.last_service_km) * 500).toISOString().slice(0, 10),
      interval_km: s.interval_km || null,
      interval_days: s.interval_days,
      note: s.note || null,
    })),
  )
  if (carServicesError) throw carServicesError

  const { error: medsError } = await supabase.from('meds').insert(
    MEDS.map((m) => ({
      user_id: userId,
      name: m.name,
      dosage: m.dosage,
      times_of_day: m.times_of_day,
    })),
  )
  if (medsError) throw medsError
}
