-- Pet/car/med photos are low-sensitivity and keyed under an unguessable
-- per-user UUID folder, so serve them via the public CDN endpoint instead
-- of signed URLs. Write access (insert/update/delete) stays folder-scoped
-- via the existing storage.objects RLS policies.
update storage.buckets set public = true where id = 'media';
