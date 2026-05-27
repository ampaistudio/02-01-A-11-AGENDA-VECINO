create table if not exists public.meeting_diffusion_contact (
  id uuid primary key default gen_random_uuid(),
  request_id uuid references public.citizen_request(id) on delete set null,
  meeting_id uuid references public.meeting(id) on delete set null,
  citizen_name text not null,
  citizen_phone text not null,
  topic text,
  locality text,
  neighborhood text,
  starts_at timestamptz,
  ends_at timestamptz,
  location text,
  source text not null default 'dashboard',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists meeting_diffusion_contact_meeting_unique
  on public.meeting_diffusion_contact(meeting_id)
  where meeting_id is not null;

create index if not exists meeting_diffusion_contact_phone_idx
  on public.meeting_diffusion_contact(citizen_phone);

