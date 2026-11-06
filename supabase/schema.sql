-- Esquema de Supabase para la web de la pareja.
-- Se ejecuta UNA vez en el editor SQL del panel de Supabase (proyecto nuevo).
-- Idea general: nadie entra si no es una de las dos cuentas creadas a mano, y aun así cada tabla
-- tiene sus propias reglas (RLS). El contenido privado y el código del cofre nunca viajan al navegador
-- antes de tiempo.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Tablas
-- ---------------------------------------------------------------------------

-- Las dos personas. Se rellena con supabase/sembrar.mjs.
create table if not exists public.perfiles (
  id     uuid primary key references auth.users(id) on delete cascade,
  nombre text not null,
  color  text not null check (color in ('azul', 'amarillo', 'verde', 'marino'))
);

-- Textos y datos personales que antes estaban escritos en el código (recuerdos, pies de foto...).
create table if not exists public.contenido (
  clave text primary key,
  valor jsonb not null
);

-- Secretos que solo se entregan al abrir el cofre (la carta). Sin ninguna política: solo las funciones los leen.
create table if not exists public.secretos (
  clave text primary key,
  valor jsonb not null
);

-- Códigos válidos del cofre. Sin ninguna política: solo la función abrir_cofre los lee.
create table if not exists public.cofre_codigos (
  codigo text primary key check (codigo ~ '^[0-9]{4}$')
);

-- Estado de la partida compartida (una sola fila).
create table if not exists public.partida (
  id          int primary key default 1 check (id = 1),
  nivel       int not null default 0,
  estado      jsonb not null default '{}'::jsonb,
  actualizado timestamptz not null default now()
);
insert into public.partida (id) values (1) on conflict do nothing;

-- Intentos del cofre, para limitar la fuerza bruta.
create table if not exists public.intentos_cofre (
  usuario uuid not null,
  momento timestamptz not null default now()
);
create index if not exists intentos_cofre_idx on public.intentos_cofre (usuario, momento desc);

-- ---------------------------------------------------------------------------
-- Función de guardia: ¿quien llama es una de las dos personas?
-- ---------------------------------------------------------------------------
create or replace function public.es_pareja()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (select 1 from public.perfiles where id = auth.uid());
$$;

-- ---------------------------------------------------------------------------
-- RLS: activada en todo, y por defecto nadie puede nada
-- ---------------------------------------------------------------------------
alter table public.perfiles       enable row level security;
alter table public.contenido      enable row level security;
alter table public.secretos       enable row level security;
alter table public.cofre_codigos  enable row level security;
alter table public.partida        enable row level security;
alter table public.intentos_cofre enable row level security;

revoke all on public.perfiles, public.contenido, public.secretos, public.cofre_codigos,
              public.partida, public.intentos_cofre from anon, authenticated;

-- Lectura de perfiles, contenido y partida; escritura solo en partida.
grant select on public.perfiles, public.contenido to authenticated;
grant select on public.partida to authenticated;

drop policy if exists perfiles_leer on public.perfiles;
create policy perfiles_leer on public.perfiles for select to authenticated using (public.es_pareja());

drop policy if exists contenido_leer on public.contenido;
create policy contenido_leer on public.contenido for select to authenticated using (public.es_pareja());

drop policy if exists partida_leer on public.partida;
create policy partida_leer on public.partida for select to authenticated using (public.es_pareja());

-- Nadie escribe en `partida` desde el navegador: solo la función abrir_cofre (SECURITY DEFINER) la modifica.
drop policy if exists partida_escribir on public.partida;
revoke update on public.partida from authenticated;

-- ---------------------------------------------------------------------------
-- Cofre: el código se comprueba aquí, no en el navegador
-- ---------------------------------------------------------------------------

-- Devuelve la carta si el código es correcto (y deja el cofre marcado como abierto para la otra persona).
-- Devuelve null si es incorrecto. Máximo 5 intentos por minuto y persona.
create or replace function public.abrir_cofre(p_codigo text)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  recientes int;
  carta jsonb;
begin
  if not public.es_pareja() then
    raise exception 'no autorizado' using errcode = '42501';
  end if;

  -- Bloqueo por persona: dos llamadas simultáneas no pueden saltarse el límite de intentos.
  perform pg_advisory_xact_lock(hashtext(auth.uid()::text));

  select count(*) into recientes from public.intentos_cofre
   where usuario = auth.uid() and momento > now() - interval '1 minute';
  if recientes >= 5 then
    raise exception 'demasiados intentos' using errcode = 'P0001';
  end if;
  insert into public.intentos_cofre (usuario) values (auth.uid());

  if p_codigo !~ '^[0-9]{4}$' or not exists (select 1 from public.cofre_codigos where codigo = p_codigo) then
    return null;
  end if;

  update public.partida
     set estado = jsonb_set(estado, '{cofre_abierto}', 'true'::jsonb), actualizado = now()
   where id = 1;
  select valor into carta from public.secretos where clave = 'carta';
  return coalesce(carta, '{}'::jsonb);
end;
$$;

-- La otra persona pide la carta cuando el cofre ya se abrió.
create or replace function public.leer_carta()
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  abierto boolean;
  carta jsonb;
begin
  if not public.es_pareja() then
    raise exception 'no autorizado' using errcode = '42501';
  end if;
  select coalesce((estado ->> 'cofre_abierto')::boolean, false) into abierto from public.partida where id = 1;
  if not abierto then
    return null;
  end if;
  select valor into carta from public.secretos where clave = 'carta';
  return coalesce(carta, '{}'::jsonb);
end;
$$;

revoke all on function public.abrir_cofre(text), public.leer_carta() from public, anon;
grant execute on function public.abrir_cofre(text), public.leer_carta() to authenticated;

-- ---------------------------------------------------------------------------
-- Almacenamiento privado (fotos y audio). Se suben con sembrar.mjs usando la clave de servicio.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit)
values ('privado', 'privado', false, 10485760)
on conflict (id) do update set public = false;

drop policy if exists privado_leer on storage.objects;
create policy privado_leer on storage.objects for select to authenticated
  using (bucket_id = 'privado' and public.es_pareja());

-- ---------------------------------------------------------------------------
-- Tiempo real: canal privado "sala" (presencia, cursores y movimientos) solo para las dos cuentas
-- ---------------------------------------------------------------------------
drop policy if exists sala_leer on realtime.messages;
create policy sala_leer on realtime.messages for select to authenticated
  using (public.es_pareja() and realtime.topic() = 'sala');

drop policy if exists sala_escribir on realtime.messages;
create policy sala_escribir on realtime.messages for insert to authenticated
  with check (public.es_pareja() and realtime.topic() = 'sala');

-- Si el esquema ya se había ejecutado con los dos colores antiguos, esto amplía la lista (se puede repetir sin problema).
alter table public.perfiles drop constraint if exists perfiles_color_check;
alter table public.perfiles add constraint perfiles_color_check check (color in ('azul', 'amarillo', 'verde', 'marino'));
